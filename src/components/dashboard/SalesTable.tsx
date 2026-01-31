import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Edit, Trash2, Receipt } from "lucide-react";
import { useSalesWithItems, Sale } from "@/hooks/useSales";
import { format } from "date-fns";
import { SaleDetailsDialog } from "@/components/forms/SaleDetailsDialog";
import { DeleteSaleDialog } from "@/components/forms/DeleteSaleDialog";
import { Skeleton } from "@/components/ui/skeleton";

const statusStyles = {
  paid: "bg-success/20 text-success border-success/30",
  partial: "bg-warning/20 text-warning border-warning/30",
  pending: "bg-destructive/20 text-destructive border-destructive/30",
};

export const SalesTable = () => {
  const { data: sales, isLoading } = useSalesWithItems();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleteCustomerName, setDeleteCustomerName] = useState<string | undefined>();

  const getStatus = (sale: Sale): "paid" | "partial" | "pending" => {
    if (Number(sale.balance_amount) === 0) return "paid";
    if (Number(sale.amount_received) > 0) return "partial";
    return "pending";
  };

  const handleView = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsOpen(true);
  };

  const handleDelete = (sale: Sale) => {
    setDeleteOrderId(sale.order_id);
    setDeleteCustomerName(sale.customer_name || sale.customer_code);
    setDeleteOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="border-white/20 bg-card/80 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-white/20 bg-card/80 backdrop-blur-xl shadow-glass">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-white">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Complete Sale Details
              </CardTitle>
              <p className="text-sm text-muted-foreground">Current month transactions</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Order ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Customer</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase text-muted-foreground lg:table-cell">Employee</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase text-muted-foreground md:table-cell">Products</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">Total</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">Received</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales?.map((sale) => {
                  const status = getStatus(sale);
                  return (
                    <TableRow key={sale.order_id} className="border-white/10 transition-colors hover:bg-white/5">
                      <TableCell className="font-semibold text-primary">#{sale.order_id}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(sale.sale_date), "d/M/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {sale.customer_name || sale.customer_code}
                          </p>
                          {sale.company_name && (
                            <p className="text-xs text-muted-foreground">{sale.company_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {sale.employee_name}
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                        {sale.items?.map((i) => `${i.product_name} (x${i.quantity})`).join(", ") || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        ₹{Number(sale.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        ₹{Number(sale.amount_received).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[status]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-white/20 bg-card/95 backdrop-blur-xl">
                            <DropdownMenuItem onClick={() => handleView(sale)} className="rounded-lg">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleView(sale)} className="rounded-lg">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Sale
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-lg text-destructive"
                              onClick={() => handleDelete(sale)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Sale
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!sales || sales.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Receipt className="h-10 w-10 text-muted-foreground/50" />
                        <p>No sales found for this month</p>
                        <p className="text-xs">Click "Add New" to create your first sale</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SaleDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        sale={selectedSale}
      />
      <DeleteSaleDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        orderId={deleteOrderId}
        customerName={deleteCustomerName}
      />
    </>
  );
};