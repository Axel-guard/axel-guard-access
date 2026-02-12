import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { PaymentHistoryUploadDialog } from "./PaymentHistoryUploadDialog";

interface PaymentWithSale {
  id: string;
  order_id: string;
  payment_date: string;
  amount: number;
  account_received: string;
  payment_reference: string | null;
  customer_code?: string;
  customer_name?: string;
  company_name?: string;
}

export const PaymentHistoryTable = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: payments, isLoading } = useQuery({
    queryKey: ["payment-history-with-sales"],
    queryFn: async () => {
      // First get all payment history
      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_history")
        .select("*")
        .order("payment_date", { ascending: true });

      if (paymentError) throw paymentError;

      // Get related sales data
      const orderIds = [...new Set(paymentData?.map((p) => p.order_id) || [])];
      
      if (orderIds.length === 0) return [];

      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("order_id, customer_code, customer_name, company_name")
        .in("order_id", orderIds);

      if (salesError) throw salesError;

      // Merge payment data with sales data
      const salesMap = new Map(salesData?.map((s) => [s.order_id, s]) || []);
      
      return (paymentData || []).map((payment) => {
        const sale = salesMap.get(payment.order_id);
        return {
          ...payment,
          customer_code: sale?.customer_code,
          customer_name: sale?.customer_name,
          company_name: sale?.company_name,
        };
      }) as PaymentWithSale[];
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const filteredPayments = payments?.filter((payment) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      payment.order_id.toLowerCase().includes(q) ||
      (payment.customer_code && payment.customer_code.toLowerCase().includes(q)) ||
      (payment.customer_name && payment.customer_name.toLowerCase().includes(q)) ||
      (payment.company_name && payment.company_name.toLowerCase().includes(q)) ||
      (payment.account_received && payment.account_received.toLowerCase().includes(q)) ||
      (payment.payment_reference && payment.payment_reference.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID, Customer, Company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <PaymentHistoryUploadDialog />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">ORDER ID</TableHead>
              <TableHead className="font-semibold">CUST CODE</TableHead>
              <TableHead className="font-semibold">CUSTOMER NAME</TableHead>
              <TableHead className="font-semibold">COMPANY NAME</TableHead>
              <TableHead className="font-semibold">PAYMENT DATE</TableHead>
              <TableHead className="font-semibold text-right">AMOUNT</TableHead>
              <TableHead className="font-semibold">ACCOUNT</TableHead>
              <TableHead className="font-semibold">PAYMENT REFERENCE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments?.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-semibold">{payment.order_id}</TableCell>
                <TableCell className="text-primary font-medium">
                  {payment.customer_code || "-"}
                </TableCell>
                <TableCell>{payment.customer_name || "-"}</TableCell>
                <TableCell>{payment.company_name || "-"}</TableCell>
                <TableCell>
                  {format(new Date(payment.payment_date), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="text-right text-success font-semibold">
                  ₹{Number(payment.amount).toLocaleString()}
                </TableCell>
                <TableCell>{payment.account_received}</TableCell>
                <TableCell>{payment.payment_reference || "-"}</TableCell>
              </TableRow>
            ))}
            {(!filteredPayments || filteredPayments.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery.trim() ? "No matching payments found" : "No balance payments recorded this month"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
