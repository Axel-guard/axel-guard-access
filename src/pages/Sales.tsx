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
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesWithItems } from "@/hooks/useSales";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Edit, Trash2 } from "lucide-react";

const SalesPage = () => {
  const { data: sales, isLoading } = useSalesWithItems();

  const getStatusBadge = (sale: any) => {
    if (Number(sale.balance_amount) === 0) {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          Paid
        </Badge>
      );
    }
    if (Number(sale.amount_received) > 0) {
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales</h1>
        <p className="text-muted-foreground">All sales for current month</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Sales Records</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales?.map((sale) => (
                  <TableRow key={sale.order_id}>
                    <TableCell className="font-semibold text-primary">
                      #{sale.order_id}
                    </TableCell>
                    <TableCell>
                      {format(new Date(sale.sale_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.customer_name || sale.customer_code}</p>
                        {sale.company_name && (
                          <p className="text-xs text-muted-foreground">{sale.company_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{sale.employee_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {sale.items?.map((i) => `${i.product_name} (x${i.quantity})`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(sale.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(sale.balance_amount).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(sale)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Sale
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Sale
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!sales || sales.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No sales found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesPage;
