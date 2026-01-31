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

const salesData = [
  {
    id: "2019947",
    date: "1/1/2026",
    customer: "Sachin",
    company: "Nplus 1 Technologies Pvt. Ltd.",
    employee: "Mandeep Samal",
    products: "4ch 1080p HDD, 4G, GPS MDVR (x5)",
    total: "₹69,384",
    received: "₹69,384",
    status: "paid",
  },
  {
    id: "2019948",
    date: "1/3/2026",
    customer: "Rahul Kumar",
    company: "TechSecure Solutions",
    employee: "Akash Parashar",
    products: "8ch 1080p MDVR System (x3)",
    total: "₹1,45,500",
    received: "₹72,750",
    status: "partial",
  },
  {
    id: "2019949",
    date: "1/5/2026",
    customer: "Priya Singh",
    company: "SafeTrack Industries",
    employee: "Smruti Ranjan Nayak",
    products: "GPS Tracker Pro (x10)",
    total: "₹85,000",
    received: "₹0",
    status: "pending",
  },
  {
    id: "2019950",
    date: "1/8/2026",
    customer: "Amit Sharma",
    company: "FleetGuard Corp",
    employee: "Akash Parashar",
    products: "Dash Cam HD (x8)",
    total: "₹52,800",
    received: "₹52,800",
    status: "paid",
  },
  {
    id: "2019951",
    date: "1/12/2026",
    customer: "Vikram Patel",
    company: "SecureFleet Ltd",
    employee: "Mandeep Samal",
    products: "4G MDVR Complete Kit (x2)",
    total: "₹98,400",
    received: "₹49,200",
    status: "partial",
  },
];

const statusStyles = {
  paid: "bg-success/10 text-success border-success/20 hover:bg-success/20",
  partial: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
  pending: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
};

export const SalesTable = () => {
  return (
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
              {salesData.map((sale) => (
                <TableRow key={sale.id} className="border-border">
                  <TableCell className="font-semibold text-primary">#{sale.id}</TableCell>
                  <TableCell className="text-muted-foreground">{sale.date}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{sale.customer}</p>
                      <p className="text-xs text-muted-foreground">{sale.company}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{sale.employee}</TableCell>
                  <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                    {sale.products}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">{sale.total}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">{sale.received}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusStyles[sale.status as keyof typeof statusStyles]}
                    >
                      {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
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
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
