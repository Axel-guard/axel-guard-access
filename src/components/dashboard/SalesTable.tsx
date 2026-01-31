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
import { MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
import { useSalesWithItems, Sale } from "@/hooks/useSales";
import { format } from "date-fns";
import { SaleDetailsDialog } from "@/components/forms/SaleDetailsDialog";
import { DeleteSaleDialog } from "@/components/forms/DeleteSaleDialog";
import { Skeleton } from "@/components/ui/skeleton";

const statusStyles = {
  paid: "bg-success/10 text-success border-success/20 hover:bg-success/20",
  partial: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
  pending: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
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
      <Card className="shadow-card">
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
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Complete Sale Details - Current Month
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
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
                    <TableRow key={sale.order_id} className="border-border">
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
                      <TableCell className="text-right font-medium text-foreground">
                        ₹{Number(sale.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(sale)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleView(sale)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Sale
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
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
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No sales found for this month. Click "Add New" to create your first sale.
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
