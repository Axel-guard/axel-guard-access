import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/hooks/useNotifications";
export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  product_code: string;
  product_name: string;
  hsn_sac?: string; // Legacy field - kept for backward compatibility
  description: string;
  unit: string;
  quantity: number | string;
  unit_price: number | string;
  amount: number;
}

export interface Quotation {
  id?: string;
  quotation_no: string;
  quotation_date: string;
  customer_code?: string;
  customer_id?: string;
  customer_name: string;
  company_name: string;
  address: string;
  mobile: string;
  gst_number: string;
  subtotal: number;
  apply_gst: boolean;
  gst_amount: number;
  courier_type: string;
  courier_charge: number;
  apply_courier_gst: boolean;
  courier_gst_amount: number;
  grand_total: number;
  status: string;
  converted_order_id?: string;
  items?: QuotationItem[];
}

export const useQuotations = () => {
  return useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useQuotationWithItems = (quotationId: string | null) => {
  return useQuery({
    queryKey: ["quotation", quotationId],
    queryFn: async () => {
      if (!quotationId) return null;

      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", quotationId)
        .single();

      if (quotationError) throw quotationError;

      const { data: items, error: itemsError } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotationId);

      if (itemsError) throw itemsError;

      return { ...quotation, items };
    },
    enabled: !!quotationId,
  });
};

export const useGenerateQuotationNo = () => {
  return useQuery({
    queryKey: ["next-quotation-no"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("generate_quotation_no");
      if (error) throw error;
      return data as string;
    },
  });
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      quotation,
      items,
    }: {
      quotation: Omit<Quotation, "id" | "items">;
      items: Omit<QuotationItem, "id" | "quotation_id">[];
    }) => {
      // Insert quotation
      const { data: newQuotation, error: quotationError } = await supabase
        .from("quotations")
        .insert(quotation)
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Insert items - ensure numeric values for database
      const itemsWithQuotationId = items.map((item) => ({
        ...item,
        quantity: typeof item.quantity === "string" ? parseFloat(item.quantity) || 1 : item.quantity,
        unit_price: typeof item.unit_price === "string" ? parseFloat(item.unit_price) || 0 : item.unit_price,
        quotation_id: newQuotation.id,
      }));

      const { error: itemsError } = await supabase
        .from("quotation_items")
        .insert(itemsWithQuotationId);

      if (itemsError) throw itemsError;

      return newQuotation;
    },
    onSuccess: (newQuotation) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["next-quotation-no"] });
      
      // Send notification to admins - quotation needs approval
      createNotification(
        "New Quotation Awaiting Approval",
        `Quotation #${newQuotation.quotation_no} created for ${newQuotation.customer_name}. Total: ₹${newQuotation.grand_total.toLocaleString()}. Requires Master Admin approval.`,
        "quotation",
        {
          quotation_id: newQuotation.id,
          quotation_no: newQuotation.quotation_no,
          customer_name: newQuotation.customer_name,
          total_amount: newQuotation.grand_total,
          event: "quotation_pending_approval",
        }
      );
      
      toast({
        title: "Quotation Created",
        description: "Quotation saved and submitted for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create quotation",
        variant: "destructive",
      });
    },
  });
};

export const useConvertToSale = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quotationId, employeeName }: { quotationId: string; employeeName: string }) => {
      // Get quotation with items
      const { data: quotation, error: qError } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", quotationId)
        .single();

      if (qError) throw qError;

      const { data: items, error: iError } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotationId);

      if (iError) throw iError;

      // Generate new order ID
      const { data: newOrderId, error: orderIdError } = await supabase.rpc(
        "generate_order_id"
      );

      if (orderIdError) throw orderIdError;

      const isLikelyMobileNumber = (value: string) => {
        const cleaned = (value ?? "").toString().replace(/\D/g, "");
        return cleaned.length === 10 && /^[6-9]/.test(cleaned);
      };

      // Resolve customer_code + customer_id from Lead Database.
      // Quotation conversions must NEVER default to WALK-IN.
      let resolvedCustomerCode = (quotation as any).customer_code
        ? String((quotation as any).customer_code).trim()
        : "";
      let resolvedCustomerId = ((quotation as any).customer_id as string | null) || null;

      // If we have ID but not code, look up code by lead ID
      if (!resolvedCustomerCode && resolvedCustomerId) {
        const { data: leadById, error: leadByIdError } = await supabase
          .from("leads")
          .select("id, customer_code")
          .eq("id", resolvedCustomerId)
          .maybeSingle();

        if (leadByIdError) throw leadByIdError;
        if (leadById?.customer_code) {
          resolvedCustomerCode = String(leadById.customer_code).trim();
        }
      }

      // If we still don't have code, try looking up by mobile_number
      if (!resolvedCustomerCode && quotation.mobile) {
        const { data: leadByMobile, error: leadByMobileError } = await supabase
          .from("leads")
          .select("id, customer_code")
          .eq("mobile_number", quotation.mobile)
          .maybeSingle();

        if (leadByMobileError) throw leadByMobileError;
        if (leadByMobile?.customer_code) {
          resolvedCustomerCode = String(leadByMobile.customer_code).trim();
          resolvedCustomerId = leadByMobile.id;
        }
      }

      if (!resolvedCustomerCode) {
        throw new Error("Customer Code missing in quotation");
      }

      // Validation: customer code must be a numeric code, not a phone number
      if (!/^\d+$/.test(resolvedCustomerCode) || isLikelyMobileNumber(resolvedCustomerCode)) {
        throw new Error("Invalid Customer Code in quotation");
      }

      // Ensure we have lead id
      if (!resolvedCustomerId) {
        const { data: leadByCode, error: leadByCodeError } = await supabase
          .from("leads")
          .select("id")
          .eq("customer_code", resolvedCustomerCode)
          .maybeSingle();

        if (leadByCodeError) throw leadByCodeError;
        if (!leadByCode?.id) throw new Error("Customer Code missing in quotation");
        resolvedCustomerId = leadByCode.id;
      }

      // Best-effort: persist resolved fields back to quotation for future conversions
      try {
        const patch: any = {};
        if (!(quotation as any).customer_code) patch.customer_code = resolvedCustomerCode;
        if (!(quotation as any).customer_id) patch.customer_id = resolvedCustomerId;
        if (Object.keys(patch).length > 0) {
          await supabase.from("quotations").update(patch).eq("id", quotationId);
        }
      } catch {
        // non-blocking
      }

      // Create sale
      const saleData = {
        order_id: newOrderId,
        sale_date: new Date().toISOString(),
        customer_id: resolvedCustomerId,
        customer_code: resolvedCustomerCode,
        customer_name: quotation.customer_name,
        company_name: quotation.company_name,
        customer_contact: quotation.mobile || null,
        employee_name: employeeName,
        // Must match backend CHECK constraint: 'With' | 'Without'
        sale_type: quotation.apply_gst ? "With" : "Without",
        subtotal: quotation.subtotal,
        gst_amount: quotation.gst_amount,
        courier_cost: quotation.courier_charge + quotation.courier_gst_amount,
        total_amount: quotation.grand_total,
        amount_received: 0,
        balance_amount: quotation.grand_total,
      };

      const { error: saleError } = await supabase.from("sales").insert(saleData);

      if (saleError) throw saleError;

      // Create sale items
      if (items && items.length > 0) {
        const saleItems = items.map((item: any) => ({
          order_id: newOrderId,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const { error: saleItemsError } = await supabase
          .from("sale_items")
          .insert(saleItems);

        if (saleItemsError) throw saleItemsError;
      }

      // Update quotation status
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          status: "Converted",
          converted_order_id: newOrderId,
        })
        .eq("id", quotationId);

      if (updateError) throw updateError;

      // Return data needed for notification
      return {
        orderId: newOrderId,
        quotationNo: quotation.quotation_no,
        customerName: quotation.customer_name,
        totalAmount: quotation.grand_total,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales"] });
      
      // Send notification to admins
      createNotification(
        "Quotation Converted to Sale",
        `Quotation #${data.quotationNo} converted to Sale #${data.orderId} for ${data.customerName}. Total: ₹${data.totalAmount.toLocaleString()}`,
        "sale",
        {
          order_id: data.orderId,
          quotation_no: data.quotationNo,
          customer_name: data.customerName,
          total_amount: data.totalAmount,
          event: "quotation_converted",
        }
      );
      
      toast({
        title: "Converted to Sale",
        description: `Quotation converted to Sale with Order ID: ${data.orderId}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert quotation to sale",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteQuotation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quotationId: string) => {
      const { error } = await supabase
        .from("quotations")
        .delete()
        .eq("id", quotationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({
        title: "Quotation Deleted",
        description: "Quotation has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quotation",
        variant: "destructive",
      });
    },
  });
};
