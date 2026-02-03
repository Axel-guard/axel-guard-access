import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Search, ArrowUpDown, Wallet } from "lucide-react";
import { SalesUploadDialog } from "@/components/sales/SalesUploadDialog";
import { SaleDetailsDialog } from "@/components/sales/SaleDetailsDialog";
import { BalanceDetailsDialog } from "@/components/sales/BalanceDetailsDialog";

// Fetch all sales without date filter (sorted by Order ID descending)
const useAllSales = () => {
  return useQuery({
    queryKey: ["all-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("order_id", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

const SalesPage = () => {
  const { data: sales, isLoading } = useAllSales();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"sale_date" | "order_id">("order_id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [balanceSale, setBalanceSale] = useState<any | null>(null);

  // Fixed payment status logic: based on amount_received vs total_amount
  const getStatusBadge = (sale: any) => {
    const totalAmount = Number(sale.total_amount) || 0;
    const amountReceived = Number(sale.amount_received) || 0;

    // Paid: Amount Received >= Final Amount
    if (amountReceived >= totalAmount && totalAmount > 0) {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          Paid
        </Badge>
      );
    }
    // Pending: Amount Received = 0
    if (amountReceived === 0) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          Pending
        </Badge>
      );
    }
    // Partial: Amount Received < Final Amount
    return (
      <Badge className="bg-warning/10 text-warning border-warning/20">
        Partial
      </Badge>
    );
  };

  // Calculate balance (never negative)
  const getBalance = (sale: any) => {
    const totalAmount = Number(sale.total_amount) || 0;
    const amountReceived = Number(sale.amount_received) || 0;
    return Math.max(0, totalAmount - amountReceived);
  };

  // Filter and sort sales
  const filteredSales = sales
    ?.filter((sale) => {
      const query = searchQuery.toLowerCase();
      return (
        sale.order_id?.toLowerCase().includes(query) ||
        sale.customer_code?.toLowerCase().includes(query) ||
        sale.customer_name?.toLowerCase().includes(query) ||
        sale.employee_name?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortField === "sale_date") {
        const aVal = new Date(a.sale_date).getTime();
        const bVal = new Date(b.sale_date).getTime();
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      } else {
        const aVal = parseInt(a.order_id) || 0;
        const bVal = parseInt(b.order_id) || 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

  const toggleSort = (field: "sale_date" | "order_id") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sale Database</h1>
          <p className="text-muted-foreground">
            {filteredSales?.length || 0} sales records
          </p>
        </div>
        <SalesUploadDialog />
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Sales Records</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID, Customer, Employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 -ml-3"
                      onClick={() => toggleSort("order_id")}
                    >
                      Order ID
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Cust Code</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 -ml-3"
                      onClick={() => toggleSort("sale_date")}
                    >
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Sale Type</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales?.map((sale) => (
                  <TableRow
                    key={`${sale.order_id}-${sale.id}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedSale(sale)}
                  >
                    <TableCell className="font-semibold text-primary">
                      {sale.order_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sale.customer_code}
                    </TableCell>
                    <TableCell>
                      {sale.sale_date
                        ? format(new Date(sale.sale_date), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{sale.customer_name || "-"}</TableCell>
                    <TableCell>{sale.employee_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sale.sale_type || "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(sale.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      ₹{getBalance(sale).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(sale)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedSale(sale)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setBalanceSale(sale);
                            }}
                          >
                            <Wallet className="mr-2 h-4 w-4" />
                            View Balance
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredSales || filteredSales.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No sales found. Upload an Excel file to import sales data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SaleDetailsDialog
        sale={selectedSale}
        open={!!selectedSale}
        onOpenChange={(open) => !open && setSelectedSale(null)}
      />

      <BalanceDetailsDialog
        sale={balanceSale}
        open={!!balanceSale}
        onOpenChange={(open) => !open && setBalanceSale(null)}
      />
    </div>
  );
};

export default SalesPage;
