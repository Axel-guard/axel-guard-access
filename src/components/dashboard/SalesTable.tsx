import { useState } from "react";
import { useEmail } from "@/hooks/useEmail";
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
import { Mail, Loader2 } from "lucide-react";
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
  const { sendEmail, isLoading: isSendingEmail } = useEmail();
  const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);

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

  const handleSendEmail = async (sale: Sale) => {
    setSendingOrderId(sale.order_id);
    await sendEmail("sale", sale.order_id);
    setSendingOrderId(null);
  };

  if (isLoading) {
    return (
      <Card className="rounded-[14px] border-border/50 bg-card shadow-card">
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
      <Card className="rounded-[14px] border-border/50 bg-card shadow-card">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                Recent Sales
              </CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Current month transactions</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {/* Scrollable table container */}
          <div className="overflow-x-auto -mx-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap pl-3 sm:pl-6">Order ID</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap">Customer</TableHead>
                  <TableHead className="hidden text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground lg:table-cell whitespace-nowrap">Employee</TableHead>
                  <TableHead className="hidden text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground md:table-cell whitespace-nowrap">Products</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap">Total</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap hidden sm:table-cell">Received</TableHead>
                  <TableHead className="text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap">Status</TableHead>
                  <TableHead className="w-8 sm:w-10 pr-3 sm:pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
              {sales?.map((sale) => {
                  const status = getStatus(sale);
                  return (
                    <TableRow key={sale.order_id} className="border-border/50 transition-colors hover:bg-muted/50">
                      <TableCell className="font-semibold text-primary text-xs sm:text-sm pl-3 sm:pl-6">{sale.order_id}</TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                        {format(new Date(sale.sale_date), "d/M/yy")}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[100px] sm:max-w-[150px]">
                          <p className="font-medium text-foreground text-xs sm:text-sm truncate">
                            {sale.customer_name || sale.customer_code}
                          </p>
                          {sale.company_name && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{sale.company_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground text-xs sm:text-sm lg:table-cell">
                        {sale.employee_name}
                      </TableCell>
                      <TableCell className="hidden max-w-[150px] sm:max-w-[200px] truncate text-muted-foreground text-xs sm:text-sm md:table-cell">
                        {sale.items?.map((i) => `${i.product_name} (x${i.quantity})`).join(", ") || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">
                        ₹{Number(sale.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">
                        ₹{Number(sale.amount_received).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 ${statusStyles[status]}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-3 sm:pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:bg-muted">
                              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-border/50 bg-card">
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
                            <DropdownMenuItem
                              className="rounded-lg"
                              onClick={() => handleSendEmail(sale)}
                              disabled={isSendingEmail && sendingOrderId === sale.order_id}
                            >
                              {isSendingEmail && sendingOrderId === sale.order_id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="mr-2 h-4 w-4" />
                              )}
                              Send Mail
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