import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomerProfile {
  customer_code: string;
  customer_name: string;
  mobile_number: string;
  alternate_mobile?: string;
  company_name?: string;
  location?: string;
  email?: string;
  gst_number?: string;
  complete_address?: string;
  status?: string;
  created_at?: string;
}

export interface CustomerSuggestion {
  customer_code: string;
  customer_name: string;
  mobile_number: string;
  company_name?: string | null;
}

export interface CustomerOrder {
  order_id: string;
  sale_date: string;
  total_amount: number;
  amount_received: number;
  balance_amount: number;
  employee_name: string;
  sale_type: string;
  products?: string[];
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  payment_date: string;
  amount: number;
  account_received: string;
  payment_reference?: string;
}

export interface CustomerTicket {
  id: string;
  ticket_no: string;
  issue_type: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  created_at: string;
  closed_at?: string;
}

// Unified ticket type that merges tickets + tasks tables
export interface UnifiedTicket {
  id: string;
  source: "ticket" | "task";
  ref_no: string;          // ticket_no or task id prefix
  title: string;           // issue_type (ticket) or title (task)
  description?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  created_at: string;
  updated_at?: string;
  closed_at?: string;
}

export interface TimelineEvent {
  id: string;
  type: "lead" | "quotation" | "sale" | "dispatch" | "payment" | "ticket";
  date: string;
  title: string;
  description?: string;
  amount?: number;
  status?: string;
}

export interface LedgerEntry {
  date: string;
  order_id: string;
  debit: number;
  credit: number;
  balance: number;
  payment_mode?: string;
  reference?: string;
  type: "sale" | "payment";
}

// ─── Search (exact first, then partial across 4 fields) ───────────────────────
export const useCustomerSearch = (searchValue: string) => {
  return useQuery({
    queryKey: ["customer-search", searchValue],
    queryFn: async () => {
      if (!searchValue.trim()) return null;

      // Exact match on code or mobile
      let { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .or(`customer_code.eq.${searchValue},mobile_number.eq.${searchValue}`)
        .maybeSingle();

      if (error) throw error;

      if (!lead) {
        // Partial match across name, code, mobile, company
        const { data: partialMatch, error: partialError } = await supabase
          .from("leads")
          .select("*")
          .or(
            `customer_code.ilike.%${searchValue}%,` +
            `mobile_number.ilike.%${searchValue}%,` +
            `customer_name.ilike.%${searchValue}%,` +
            `company_name.ilike.%${searchValue}%`
          )
          .limit(1)
          .maybeSingle();

        if (partialError) throw partialError;
        lead = partialMatch;
      }

      return lead as CustomerProfile | null;
    },
    enabled: !!searchValue.trim(),
  });
};

// ─── Autocomplete suggestions (returns up to 8 matches) ───────────────────────
export const useCustomerSuggestions = (query: string) => {
  return useQuery({
    queryKey: ["customer-suggestions", query],
    queryFn: async () => {
      if (!query || query.trim().length < 2) return [];
      const q = query.trim();
      const { data, error } = await supabase
        .from("leads")
        .select("customer_code, customer_name, mobile_number, company_name")
        .or(
          `customer_code.ilike.%${q}%,` +
          `mobile_number.ilike.%${q}%,` +
          `customer_name.ilike.%${q}%,` +
          `company_name.ilike.%${q}%`
        )
        .order("customer_name", { ascending: true })
        .limit(8);
      if (error) throw error;
      return (data || []) as CustomerSuggestion[];
    },
    enabled: query.trim().length >= 2,
    staleTime: 5000,
  });
};

// ─── Customer orders ──────────────────────────────────────────────────────────
export const useCustomerOrders = (customerCode: string) => {
  return useQuery({
    queryKey: ["customer-orders", customerCode],
    queryFn: async () => {
      if (!customerCode) return [];

      const { data: sales, error } = await supabase
        .from("sales")
        .select("*")
        .eq("customer_code", customerCode)
        .order("sale_date", { ascending: false });

      if (error) throw error;

      const orderIds = sales?.map((s) => s.order_id) || [];

      let items: any[] = [];
      if (orderIds.length > 0) {
        const { data: saleItems, error: itemsError } = await supabase
          .from("sale_items")
          .select("*")
          .in("order_id", orderIds);

        if (itemsError) throw itemsError;
        items = saleItems || [];
      }

      return (sales || []).map((sale) => ({
        ...sale,
        products: items
          .filter((i) => i.order_id === sale.order_id)
          .map((i) => i.product_name),
      })) as CustomerOrder[];
    },
    enabled: !!customerCode,
  });
};

// ─── Payment history ──────────────────────────────────────────────────────────
export const useCustomerPayments = (customerCode: string) => {
  return useQuery({
    queryKey: ["customer-payments", customerCode],
    queryFn: async () => {
      if (!customerCode) return [];

      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("order_id")
        .eq("customer_code", customerCode);

      if (salesError) throw salesError;

      const orderIds = sales?.map((s) => s.order_id) || [];
      if (orderIds.length === 0) return [];

      const { data: payments, error } = await supabase
        .from("payment_history")
        .select("*")
        .in("order_id", orderIds)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return payments as PaymentRecord[];
    },
    enabled: !!customerCode,
  });
};

// ─── Tickets: merges tickets table + tasks table ───────────────────────────────
export const useCustomerTickets = (customerCode: string, mobileNumber?: string) => {
  return useQuery({
    queryKey: ["customer-tickets", customerCode, mobileNumber],
    queryFn: async () => {
      if (!customerCode) return [] as UnifiedTicket[];

      // 1. CRM tickets table
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select("id, ticket_no, issue_type, description, status, priority, assigned_to, created_at, closed_at, updated_at")
        .eq("customer_code", customerCode)
        .order("created_at", { ascending: false });

      // 2. Tasks module (actual ticket module) – match by customer_code or mobile
      let tasksFilter = `customer_code.eq.${customerCode}`;
      if (mobileNumber) {
        tasksFilter += `,customer_phone.eq.${mobileNumber}`;
      }

      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, description, status, priority, assigned_to, created_at, updated_at, completed_at, customer_code, customer_phone")
        .or(tasksFilter)
        .order("created_at", { ascending: false });

      // Normalise tickets → UnifiedTicket
      const fromTickets: UnifiedTicket[] = (ticketsData || []).map((t) => ({
        id: t.id,
        source: "ticket" as const,
        ref_no: t.ticket_no,
        title: t.issue_type,
        description: t.description ?? undefined,
        status: t.status,
        priority: t.priority,
        assigned_to: t.assigned_to ?? undefined,
        created_at: t.created_at,
        updated_at: (t as any).updated_at ?? undefined,
        closed_at: t.closed_at ?? undefined,
      }));

      // Normalise tasks → UnifiedTicket
      const fromTasks: UnifiedTicket[] = (tasksData || []).map((t) => ({
        id: t.id,
        source: "task" as const,
        ref_no: `TASK-${t.id.slice(0, 6).toUpperCase()}`,
        title: t.title,
        description: t.description ?? undefined,
        status: t.status,
        priority: t.priority,
        assigned_to: t.assigned_to ?? undefined,
        created_at: t.created_at,
        updated_at: t.updated_at ?? undefined,
        closed_at: t.completed_at ?? undefined,
      }));

      // Merge, deduplicate by id, sort newest first
      const all = [...fromTickets, ...fromTasks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return all;
    },
    enabled: !!customerCode,
    refetchInterval: 15000, // Real-time sync via polling
  });
};

// ─── Timeline (unified history) ───────────────────────────────────────────────
export const useCustomerTimeline = (customerCode: string, mobileNumber?: string) => {
  return useQuery({
    queryKey: ["customer-timeline", customerCode, mobileNumber],
    queryFn: async () => {
      if (!customerCode) return [];

      const events: TimelineEvent[] = [];

      // Lead created
      const { data: lead } = await supabase
        .from("leads")
        .select("created_at, status")
        .eq("customer_code", customerCode)
        .maybeSingle();

      if (lead) {
        events.push({
          id: `lead-${customerCode}`,
          type: "lead",
          date: lead.created_at!,
          title: "Customer Registered",
          status: lead.status ?? undefined,
        });
      }

      // Quotations + their items
      const { data: quotations } = await supabase
        .from("quotations")
        .select("id, quotation_no, created_at, status, grand_total, approved_at, quotation_date")
        .eq("customer_code", customerCode);

      if (quotations && quotations.length > 0) {
        const quotationIds = quotations.map((q) => q.id);
        const { data: qItems } = await supabase
          .from("quotation_items")
          .select("quotation_id, product_name, quantity, unit_price")
          .in("quotation_id", quotationIds);

        const qItemsMap: Record<string, typeof qItems> = {};
        (qItems || []).forEach((item) => {
          if (!qItemsMap[item.quotation_id]) qItemsMap[item.quotation_id] = [];
          qItemsMap[item.quotation_id]!.push(item);
        });

        quotations.forEach((q) => {
          const products = (qItemsMap[q.id] || [])
            .map((i) => `${i.product_name} ×${i.quantity}`)
            .join(", ");

          events.push({
            id: `quotation-${q.id}`,
            type: "quotation",
            date: q.quotation_date || q.created_at,
            title: `Quotation ${q.quotation_no} Created`,
            description: products || undefined,
            amount: q.grand_total,
            status: q.status,
          });

          if (q.approved_at && q.status === "Approved") {
            events.push({
              id: `quotation-approved-${q.id}`,
              type: "quotation",
              date: q.approved_at,
              title: `Quotation ${q.quotation_no} Approved`,
              amount: q.grand_total,
              status: "Approved",
            });
          }
        });
      }

      // Sales + their items + dispatch/shipment info
      const { data: sales } = await supabase
        .from("sales")
        .select("order_id, sale_date, total_amount")
        .eq("customer_code", customerCode);

      const orderIds = (sales || []).map((s) => s.order_id);

      let saleItemsMap: Record<string, string[]> = {};
      if (orderIds.length > 0) {
        const { data: saleItems } = await supabase
          .from("sale_items")
          .select("order_id, product_name, quantity")
          .in("order_id", orderIds);

        (saleItems || []).forEach((item) => {
          if (!saleItemsMap[item.order_id]) saleItemsMap[item.order_id] = [];
          saleItemsMap[item.order_id].push(`${item.product_name} ×${item.quantity}`);
        });
      }

      (sales || []).forEach((s) => {
        const products = (saleItemsMap[s.order_id] || []).join(", ");
        events.push({
          id: `sale-${s.order_id}`,
          type: "sale",
          date: s.sale_date,
          title: `Sale #${s.order_id}`,
          description: products || undefined,
          amount: s.total_amount,
          status: "Completed",
        });
      });

      // Payments
      if (orderIds.length > 0) {
        const { data: payments } = await supabase
          .from("payment_history")
          .select("id, order_id, payment_date, amount, account_received, payment_reference")
          .in("order_id", orderIds);

        (payments || []).forEach((p) => {
          events.push({
            id: `payment-${p.id}`,
            type: "payment",
            date: p.payment_date,
            title: `Payment Received for #${p.order_id}`,
            description: `Via ${p.account_received}${p.payment_reference ? ` · Ref: ${p.payment_reference}` : ""}`,
            amount: p.amount,
          });
        });

        // Shipments (dispatch events)
        const { data: shipments } = await supabase
          .from("shipments")
          .select("id, order_id, created_at, courier_partner, tracking_id, shipping_mode")
          .in("order_id", orderIds);

        (shipments || []).forEach((sh) => {
          const sale = (sales || []).find((s) => s.order_id === sh.order_id);
          events.push({
            id: `dispatch-${sh.id}`,
            type: "dispatch",
            date: sh.created_at!,
            title: `Order #${sh.order_id} Dispatched`,
            description: [
              sh.courier_partner ? `Courier: ${sh.courier_partner}` : null,
              sh.tracking_id ? `Tracking: ${sh.tracking_id}` : null,
              sh.shipping_mode ? `Mode: ${sh.shipping_mode}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined,
          });
        });
      }

      // Tickets (CRM tickets table)
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, ticket_no, created_at, issue_type, status, description")
        .eq("customer_code", customerCode);

      (tickets || []).forEach((t) => {
        events.push({
          id: `ticket-${t.id}`,
          type: "ticket",
          date: t.created_at,
          title: `Ticket ${t.ticket_no}: ${t.issue_type}`,
          description: t.description ?? undefined,
          status: t.status,
        });
      });

      // Tasks module tickets
      let tasksFilter = `customer_code.eq.${customerCode}`;
      if (mobileNumber) tasksFilter += `,customer_phone.eq.${mobileNumber}`;

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, created_at, status, description")
        .or(tasksFilter);

      (tasks || []).forEach((t) => {
        events.push({
          id: `task-${t.id}`,
          type: "ticket",
          date: t.created_at,
          title: `Task: ${t.title}`,
          description: t.description ?? undefined,
          status: t.status,
        });
      });

      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return events;
    },
    enabled: !!customerCode,
    refetchInterval: 15000,
  });
};

// ─── Account Ledger ───────────────────────────────────────────────────────────
export const useCustomerLedger = (customerCode: string) => {
  return useQuery({
    queryKey: ["customer-ledger", customerCode],
    queryFn: async () => {
      if (!customerCode) return { entries: [], summary: { total: 0, received: 0, outstanding: 0 } };

      const { data: sales } = await supabase
        .from("sales")
        .select("order_id, sale_date, total_amount")
        .eq("customer_code", customerCode)
        .order("sale_date", { ascending: true });

      const orderIds = sales?.map((s) => s.order_id) || [];

      let payments: any[] = [];
      if (orderIds.length > 0) {
        const { data: paymentData } = await supabase
          .from("payment_history")
          .select("*")
          .in("order_id", orderIds)
          .order("payment_date", { ascending: true });
        payments = paymentData || [];
      }

      const allEntries: LedgerEntry[] = [];

      sales?.forEach((s) => {
        allEntries.push({
          date: s.sale_date,
          order_id: s.order_id,
          debit: Number(s.total_amount),
          credit: 0,
          balance: 0,
          type: "sale",
        });
      });

      payments.forEach((p) => {
        allEntries.push({
          date: p.payment_date,
          order_id: p.order_id,
          debit: 0,
          credit: Number(p.amount),
          balance: 0,
          payment_mode: p.account_received,
          reference: p.payment_reference,
          type: "payment",
        });
      });

      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let runningBalance = 0;
      allEntries.forEach((entry) => {
        runningBalance += entry.debit - entry.credit;
        entry.balance = runningBalance;
      });

      const totalBusiness = allEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalReceived = allEntries.reduce((sum, e) => sum + e.credit, 0);

      return {
        entries: allEntries.reverse(),
        summary: {
          total: totalBusiness,
          received: totalReceived,
          outstanding: totalBusiness - totalReceived,
        },
      };
    },
    enabled: !!customerCode,
  });
};

// ─── Update customer ──────────────────────────────────────────────────────────
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerCode, updates }: { customerCode: string; updates: Partial<CustomerProfile> }) => {
      const { error } = await supabase
        .from("leads")
        .update(updates)
        .eq("customer_code", customerCode);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-search"] });
      queryClient.invalidateQueries({ queryKey: ["customer-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales-balance"] });
      queryClient.invalidateQueries({ queryKey: ["current-month-sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["payment-history-with-sales"] });
      toast.success("Customer updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
};

// ─── Create ticket (CRM tickets table) ───────────────────────────────────────
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: {
      customer_code: string;
      issue_type: string;
      description?: string;
      priority: string;
      assigned_to?: string;
    }) => {
      const { data: ticketNo, error: noError } = await supabase.rpc("generate_ticket_no");
      if (noError) throw noError;

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          ...ticket,
          ticket_no: ticketNo,
          status: "Open",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["customer-timeline"] });
      toast.success("Ticket created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });
};

// ─── Update ticket ────────────────────────────────────────────────────────────
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomerTicket> }) => {
      const updateData: any = { ...updates };

      if (updates.status === "Closed" && !updates.closed_at) {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });
      toast.success("Ticket updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    },
  });
};
