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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Search, ArrowUpDown } from "lucide-react";
import { SalesUploadDialog } from "@/components/sales/SalesUploadDialog";
import { SaleDetailsDialog } from "@/components/sales/SaleDetailsDialog";

// Fetch all sales without date filter for full database view
const useAllSales = () => {
  return useQuery({
    queryKey: ["all-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

const SalesPage = () => {
  const { data: sales, isLoading } = useAllSales();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"sale_date" | "order_id">("sale_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  const getStatusBadge = (sale: any) => {
    const balance = Number(sale.balance_amount) || 0;
    const received = Number(sale.amount_received) || 0;
    
    if (balance === 0 && received > 0) {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          Paid
        </Badge>
      );
    }
    if (received > 0) {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          Partial
        </Badge>
      );
    }
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
        Pending
      </Badge>
    );
  };

  // Filter and sort sales
  const filteredSales = sales
    ?.filter((sale) => {
      const query = searchQuery.toLowerCase();
      return (
        sale.order_id?.toLowerCase().includes(query) ||
        sale.customer_code?.toLowerCase().includes(query) ||
        sale.customer_name?.toLowerCase().includes(query) ||
        sale.customer_contact?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aVal = sortField === "sale_date" ? new Date(a.sale_date).getTime() : a.order_id;
      const bVal = sortField === "sale_date" ? new Date(b.sale_date).getTime() : b.order_id;
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
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
          <h1 className="text-2xl font-bold text-foreground">Sales Database</h1>
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
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Order ID, Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select
                value={sortField}
                onValueChange={(val) => setSortField(val as "sale_date" | "order_id")}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale_date">Sale Date</SelectItem>
                  <SelectItem value="order_id">Order ID</SelectItem>
                </SelectContent>
              </Select>
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
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 -ml-3"
                      onClick={() => toggleSort("sale_date")}
                    >
                      Sale Date
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Customer Code</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales?.map((sale) => {
                  // Extract location from remarks
                  const location = sale.remarks?.startsWith("Location: ")
                    ? sale.remarks.replace("Location: ", "")
                    : "-";

                  return (
                    <TableRow
                      key={sale.order_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <TableCell className="font-semibold text-primary">
                        {sale.order_id}
                      </TableCell>
                      <TableCell>
                        {sale.sale_date
                          ? format(new Date(sale.sale_date), "dd/MM/yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.customer_code}
                      </TableCell>
                      <TableCell>{sale.customer_name || "-"}</TableCell>
                      <TableCell>{sale.customer_contact || "-"}</TableCell>
                      <TableCell>{location}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{Number(sale.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        ₹{Number(sale.balance_amount || 0).toLocaleString()}
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
    </div>
  );
};

export default SalesPage;
