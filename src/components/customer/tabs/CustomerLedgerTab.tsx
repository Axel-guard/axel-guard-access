import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomerLedger } from "@/hooks/useCustomerDetails";
import { format } from "date-fns";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface CustomerLedgerTabProps {
  customerCode: string;
}

export const CustomerLedgerTab = ({ customerCode }: CustomerLedgerTabProps) => {
  const { data, isLoading } = useCustomerLedger(customerCode);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { entries, summary } = data || { entries: [], summary: { total: 0, received: 0, outstanding: 0 } };

  if (entries.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Transactions</h3>
          <p className="text-muted-foreground">
            No financial transactions found for this customer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Account Ledger</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-blue-100">Total Business Value</p>
            </div>
            <p className="text-3xl font-bold">
              ₹{summary.total.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-green-100">Total Received</p>
            </div>
            <p className="text-3xl font-bold">
              ₹{summary.received.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-red-100">Outstanding Balance</p>
            </div>
            <p className="text-3xl font-bold">
              ₹{summary.outstanding.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead className="text-right">Debit (₹)</TableHead>
                <TableHead className="text-right">Credit (₹)</TableHead>
                <TableHead className="text-right">Balance (₹)</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, idx) => (
                <TableRow key={`${entry.order_id}-${entry.type}-${idx}`}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(entry.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">#{entry.order_id}</TableCell>
                  <TableCell className="text-right">
                    {entry.debit > 0 ? (
                      <span className="text-red-600 font-medium">
                        {entry.debit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.credit > 0 ? (
                      <span className="text-green-600 font-medium">
                        {entry.credit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={entry.balance > 0 ? "text-red-600" : "text-green-600"}>
                      {entry.balance.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entry.payment_mode ? (
                      <Badge variant="outline">{entry.payment_mode}</Badge>
                    ) : (
                      <Badge variant="secondary">Sale</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.reference || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
