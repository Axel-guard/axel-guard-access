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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Search, Filter, Box, CheckCircle, Truck } from "lucide-react";
import { useInventory, useInventorySummary } from "@/hooks/useInventory";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { StatCard } from "@/components/dashboard/StatCard";

const InventoryPage = () => {
  const { data: inventory, isLoading } = useInventory();
  const { data: summary } = useInventorySummary();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInventory = inventory?.filter(
    (item) =>
      item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customer_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "In Stock": "bg-success/10 text-success border-success/20",
      "Dispatched": "bg-info/10 text-info border-info/20",
      "QC Pending": "bg-warning/10 text-warning border-warning/20",
    };
    return (
      <Badge variant="outline" className={styles[status] || ""}>
        {status}
      </Badge>
    );
  };

  const getQCBadge = (result: string) => {
    const styles: Record<string, string> = {
      Pass: "bg-success/10 text-success border-success/20",
      Fail: "bg-destructive/10 text-destructive border-destructive/20",
      Pending: "bg-warning/10 text-warning border-warning/20",
    };
    return (
      <Badge variant="outline" className={styles[result] || ""}>
        {result}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="text-muted-foreground">
          Serial number tracking for all devices
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Items"
          value={String(summary?.totalItems || 0)}
          icon={Box}
          variant="primary"
        />
        <StatCard
          title="In Stock"
          value={String(summary?.inStock || 0)}
          icon={Package}
          variant="success"
        />
        <StatCard
          title="Dispatched"
          value={String(summary?.dispatched || 0)}
          icon={Truck}
          variant="info"
        />
      </div>

      {/* Search and Filter */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">
              Inventory Items ({filteredInventory?.length || 0})
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search serial, product, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs font-semibold uppercase">
                    Serial Number
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    Product
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    QC Result
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    In Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    Customer
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    Dispatch Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory?.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-mono font-semibold text-primary">
                      {item.serial_number}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.product_name}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{getQCBadge(item.qc_result)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.in_date
                        ? format(new Date(item.in_date), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.customer_name ? (
                        <div>
                          <p className="font-medium">{item.customer_name}</p>
                          {item.customer_city && (
                            <p className="text-xs text-muted-foreground">
                              {item.customer_city}
                            </p>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.dispatch_date
                        ? format(new Date(item.dispatch_date), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredInventory || filteredInventory.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No inventory items found
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

export default InventoryPage;
