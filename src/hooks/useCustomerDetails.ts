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

// Fetch customer by code or mobile
export const useCustomerSearch = (searchValue: string) => {
  return useQuery({
    queryKey: ["customer-search", searchValue],
    queryFn: async () => {
      if (!searchValue.trim()) return null;

      // Try to find by customer code first
      let { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .or(`customer_code.eq.${searchValue},mobile_number.eq.${searchValue}`)
        .maybeSingle();

      if (error) throw error;

      if (!lead) {
        // Try partial matching
        const { data: partialMatch, error: partialError } = await supabase
          .from("leads")
          .select("*")
          .or(`customer_code.ilike.%${searchValue}%,mobile_number.ilike.%${searchValue}%,customer_name.ilike.%${searchValue}%`)
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

// Fetch customer orders
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

      // Fetch sale items for each order
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

// Fetch payment history
export const useCustomerPayments = (customerCode: string) => {
  return useQuery({
    queryKey: ["customer-payments", customerCode],
    queryFn: async () => {
      if (!customerCode) return [];

      // Get order IDs for this customer
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

// Fetch customer tickets
export const useCustomerTickets = (customerCode: string) => {
  return useQuery({
    queryKey: ["customer-tickets", customerCode],
    queryFn: async () => {
      if (!customerCode) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("customer_code", customerCode)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomerTicket[];
    },
    enabled: !!customerCode,
  });
};

// Build customer timeline
export const useCustomerTimeline = (customerCode: string) => {
  return useQuery({
    queryKey: ["customer-timeline", customerCode],
    queryFn: async () => {
      if (!customerCode) return [];

      const events: TimelineEvent[] = [];

      // Fetch lead info
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
          title: "Lead Created",
          status: lead.status,
        });
      }

      // Fetch quotations
      const { data: quotations } = await supabase
        .from("quotations")
        .select("id, quotation_no, created_at, status, grand_total, approved_at")
        .eq("customer_code", customerCode);

      quotations?.forEach((q) => {
        events.push({
          id: `quotation-${q.id}`,
          type: "quotation",
          date: q.created_at,
          title: `Quotation ${q.quotation_no} Created`,
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

      // Fetch sales
      const { data: sales } = await supabase
        .from("sales")
        .select("order_id, sale_date, total_amount")
        .eq("customer_code", customerCode);

      sales?.forEach((s) => {
        events.push({
          id: `sale-${s.order_id}`,
          type: "sale",
          date: s.sale_date,
          title: `Order #${s.order_id} Created`,
          amount: s.total_amount,
          status: "Completed",
        });
      });

      // Fetch payments
      const orderIds = sales?.map((s) => s.order_id) || [];
      if (orderIds.length > 0) {
        const { data: payments } = await supabase
          .from("payment_history")
          .select("*")
          .in("order_id", orderIds);

        payments?.forEach((p) => {
          events.push({
            id: `payment-${p.id}`,
            type: "payment",
            date: p.payment_date,
            title: `Payment Received for #${p.order_id}`,
            amount: p.amount,
            description: `Via ${p.account_received}`,
          });
        });
      }

      // Fetch tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("customer_code", customerCode);

      tickets?.forEach((t) => {
        events.push({
          id: `ticket-${t.id}`,
          type: "ticket",
          date: t.created_at,
          title: `Ticket ${t.ticket_no} Raised`,
          description: t.issue_type,
          status: t.status,
        });
      });

      // Fetch dispatches (from inventory)
      const { data: dispatches } = await supabase
        .from("inventory")
        .select("id, dispatch_date, order_id, product_name")
        .eq("customer_code", customerCode)
        .not("dispatch_date", "is", null);

      dispatches?.forEach((d) => {
        events.push({
          id: `dispatch-${d.id}`,
          type: "dispatch",
          date: d.dispatch_date!,
          title: `${d.product_name} Dispatched`,
          description: `Order #${d.order_id}`,
        });
      });

      // Sort by date (newest first)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return events;
    },
    enabled: !!customerCode,
  });
};

// Calculate account ledger
export const useCustomerLedger = (customerCode: string) => {
  return useQuery({
    queryKey: ["customer-ledger", customerCode],
    queryFn: async () => {
      if (!customerCode) return { entries: [], summary: { total: 0, received: 0, outstanding: 0 } };

      // Fetch all sales
      const { data: sales } = await supabase
        .from("sales")
        .select("order_id, sale_date, total_amount")
        .eq("customer_code", customerCode)
        .order("sale_date", { ascending: true });

      const orderIds = sales?.map((s) => s.order_id) || [];

      // Fetch all payments
      let payments: any[] = [];
      if (orderIds.length > 0) {
        const { data: paymentData } = await supabase
          .from("payment_history")
          .select("*")
          .in("order_id", orderIds)
          .order("payment_date", { ascending: true });
        payments = paymentData || [];
      }

      // Combine into ledger entries
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

      // Sort by date
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      allEntries.forEach((entry) => {
        runningBalance += entry.debit - entry.credit;
        entry.balance = runningBalance;
      });

      // Calculate summary
      const totalBusiness = allEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalReceived = allEntries.reduce((sum, e) => sum + e.credit, 0);

      return {
        entries: allEntries.reverse(), // Newest first for display
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

// Update customer info
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-search"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Customer updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
};

// Create ticket
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
      // Generate ticket number
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

// Update ticket
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
