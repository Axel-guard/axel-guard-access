import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SaleItem {
  id?: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface Sale {
  id?: string;
  order_id: string;
  customer_code: string;
  customer_name?: string;
  company_name?: string;
  customer_contact?: string;
  sale_date: string;
  employee_name: string;
  sale_type: "With" | "Without";
  courier_cost: number;
  amount_received: number;
  account_received?: string;
  payment_reference?: string;
  remarks?: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  balance_amount: number;
  created_at?: string;
  updated_at?: string;
  items?: SaleItem[];
}

export interface PaymentHistory {
  id?: string;
  order_id: string;
  payment_date: string;
  amount: number;
  account_received: string;
  payment_reference?: string;
}

// Fetch all sales for current month (descending order - newest first by Order ID)
export const useSales = () => {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .gte("sale_date", startOfMonth.toISOString())
        .order("order_id", { ascending: false });

      if (error) throw error;
      return data as Sale[];
    },
  });
};

// Fetch all sales with items (descending order - newest first by Order ID)
export const useSalesWithItems = () => {
  return useQuery({
    queryKey: ["sales-with-items"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("*")
        .gte("sale_date", startOfMonth.toISOString())
        .order("order_id", { ascending: false });

      if (salesError) throw salesError;

      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select("*");

      if (itemsError) throw itemsError;

      return (sales as Sale[]).map((sale) => ({
        ...sale,
        items: (items as SaleItem[]).filter((item) => item.order_id === sale.order_id),
      }));
    },
  });
};

// Fetch dashboard summary
export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .gte("sale_date", startOfMonth.toISOString());

      if (error) throw error;

      const sales = data as Sale[];

      // Calculate totals
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalReceived = sales.reduce((sum, s) => sum + Number(s.amount_received), 0);
      const totalBalance = sales.reduce((sum, s) => sum + Number(s.balance_amount), 0);

      // Group by employee
      const employeeStats = sales.reduce((acc, sale) => {
        const emp = sale.employee_name;
        if (!acc[emp]) {
          acc[emp] = { revenue: 0, sales: 0, balance: 0 };
        }
        acc[emp].revenue += Number(sale.total_amount);
        acc[emp].sales += 1;
        acc[emp].balance += Number(sale.balance_amount);
        return acc;
      }, {} as Record<string, { revenue: number; sales: number; balance: number }>);

      // Payment status
      const paid = sales.filter((s) => Number(s.balance_amount) === 0).length;
      const partial = sales.filter(
        (s) => Number(s.balance_amount) > 0 && Number(s.amount_received) > 0
      ).length;
      const pending = sales.filter((s) => Number(s.amount_received) === 0).length;

      return {
        totalSales,
        totalRevenue,
        totalReceived,
        totalBalance,
        employeeStats,
        paymentStatus: { paid, partial, pending },
      };
    },
  });
};

// Generate next order ID
export const useGenerateOrderId = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_order_id");
      if (error) throw error;
      return data as string;
    },
  });
};

// Create new sale
export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sale, items }: { sale: Omit<Sale, "id">; items: Omit<SaleItem, "id">[] }) => {
      // Insert sale
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert(sale)
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items
      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("sale_items").insert(items);
        if (itemsError) throw itemsError;
      }

      // If payment received, add to payment history
      if (sale.amount_received > 0) {
        const { error: paymentError } = await supabase.from("payment_history").insert({
          order_id: sale.order_id,
          payment_date: sale.sale_date,
          amount: sale.amount_received,
          account_received: sale.account_received || "Cash",
          payment_reference: sale.payment_reference,
        });
        if (paymentError) throw paymentError;
      }

      return saleData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Sale created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create sale: ${error.message}`);
    },
  });
};

// Update balance payment
export const useUpdateBalancePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: PaymentHistory) => {
      // Add payment to history
      const { error: paymentError } = await supabase.from("payment_history").insert(payment);
      if (paymentError) throw paymentError;

      // Update sale amounts
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("*")
        .eq("order_id", payment.order_id)
        .single();

      if (saleError) throw saleError;

      const newReceived = Number(sale.amount_received) + payment.amount;
      const newBalance = Number(sale.total_amount) - newReceived;

      const { error: updateError } = await supabase
        .from("sales")
        .update({
          amount_received: newReceived,
          balance_amount: newBalance,
        })
        .eq("order_id", payment.order_id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Payment updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update payment: ${error.message}`);
    },
  });
};

// Delete sale
export const useDeleteSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("sales").delete().eq("order_id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Sale deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete sale: ${error.message}`);
    },
  });
};

// Update sale
export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: Partial<Sale> }) => {
      const { error } = await supabase.from("sales").update(updates).eq("order_id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Sale updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update sale: ${error.message}`);
    },
  });
};
