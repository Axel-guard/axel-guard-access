import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/hooks/useNotifications";
export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  product_code: string;
  product_name: string;
  hsn_sac: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Quotation {
  id?: string;
  quotation_no: string;
  quotation_date: string;
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

      // Insert items
      const itemsWithQuotationId = items.map((item) => ({
        ...item,
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
      
      // Send notification to admins
      createNotification(
        "New Quotation Created",
        `Quotation #${newQuotation.quotation_no} created for ${newQuotation.customer_name}. Total: ₹${newQuotation.grand_total.toLocaleString()}`,
        "quotation",
        {
          quotation_id: newQuotation.id,
          quotation_no: newQuotation.quotation_no,
          customer_name: newQuotation.customer_name,
          total_amount: newQuotation.grand_total,
        }
      );
      
      toast({
        title: "Quotation Created",
        description: "Quotation has been saved successfully.",
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
    mutationFn: async (quotationId: string) => {
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

      // Create sale
      const saleData = {
        order_id: newOrderId,
        sale_date: new Date().toISOString(),
        customer_code: quotation.mobile || "WALK-IN",
        customer_name: quotation.customer_name,
        company_name: quotation.company_name,
        customer_contact: quotation.mobile,
        employee_name: "System",
        sale_type: quotation.apply_gst ? "With GST (18%)" : "Without GST",
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

      return newOrderId;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales"] });
      toast({
        title: "Converted to Sale",
        description: `Quotation converted to Sale with Order ID: ${orderId}`,
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
