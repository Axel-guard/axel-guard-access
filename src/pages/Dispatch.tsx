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
import { Truck, Search, Filter, Package, DollarSign } from "lucide-react";
import { useShipments, useShipmentsSummary } from "@/hooks/useShipments";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { StatCard } from "@/components/dashboard/StatCard";

const DispatchPage = () => {
  const { data: shipments, isLoading } = useShipments();
  const { data: summary } = useShipmentsSummary();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredShipments = shipments?.filter(
    (item) =>
      (item.order_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (item.tracking_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (item.courier_partner?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const getModeBadge = (mode: string | null) => {
    const styles: Record<string, string> = {
      Air: "bg-info/10 text-info border-info/20",
      Surface: "bg-warning/10 text-warning border-warning/20",
    };
    return (
      <Badge variant="outline" className={styles[mode || ""] || ""}>
        {mode || "Unknown"}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Sale: "bg-success/10 text-success border-success/20",
      Replacement: "bg-primary/10 text-primary border-primary/20",
    };
    return (
      <Badge variant="outline" className={styles[type] || ""}>
        {type}
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
        <h1 className="text-2xl font-bold text-foreground">Dispatch & Tracking</h1>
        <p className="text-muted-foreground">
          Manage shipments and track deliveries
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Shipments"
          value={String(summary?.totalShipments || 0)}
          icon={Truck}
          variant="primary"
        />
        <StatCard
          title="Total Weight"
          value={`${(summary?.totalWeight || 0).toFixed(1)} Kg`}
          icon={Package}
          variant="info"
        />
        <StatCard
          title="Shipping Cost"
          value={`₹${(summary?.totalShippingCost || 0).toLocaleString()}`}
          icon={DollarSign}
          variant="warning"
        />
      </div>

      {/* Shipments Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">
              Shipment Records ({filteredShipments?.length || 0})
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search order, tracking ID, courier..."
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
                    Order ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    Courier
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    Mode
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase">
                    Tracking ID
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase">
                    Weight
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase">
                    Cost
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments?.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-semibold text-primary">
                      #{item.order_id || "N/A"}
                    </TableCell>
                    <TableCell>{getTypeBadge(item.shipment_type)}</TableCell>
                    <TableCell className="font-medium">
                      {item.courier_partner || "-"}
                    </TableCell>
                    <TableCell>{getModeBadge(item.shipping_mode)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.tracking_id || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.weight_kg ? `${item.weight_kg} Kg` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.shipping_cost
                        ? `₹${Number(item.shipping_cost).toLocaleString()}`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredShipments || filteredShipments.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No shipments found
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

export default DispatchPage;
