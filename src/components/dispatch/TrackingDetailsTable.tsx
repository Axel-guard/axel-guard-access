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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Trash2, Package, Plane, Truck as TruckIcon } from "lucide-react";

interface Shipment {
  id: string;
  order_id: string | null;
  shipment_type: string;
  courier_partner: string | null;
  shipping_mode: string | null;
  tracking_id: string | null;
  weight_kg: number | null;
  shipping_cost: number | null;
  created_at: string | null;
}

interface TrackingDetailsTableProps {
  shipments: Shipment[];
}

export const TrackingDetailsTable = ({ shipments }: TrackingDetailsTableProps) => {
  const getTypeBadge = (type: string) => {
    if (type === "Replacement") {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">
          Replacement
        </Badge>
      );
    }
    return (
      <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">
        Sale
      </Badge>
    );
  };

  const getModeIcon = (mode: string | null) => {
    if (mode === "Air") {
      return <Plane className="h-4 w-4 text-info" />;
    }
    return <TruckIcon className="h-4 w-4 text-warning" />;
  };

  if (shipments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No tracking records found
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[1000px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  📋 TYPE
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  📦 ORDER ID
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  🚚 COURIER PARTNER
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  ✈️ MODE
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  🎫 TRACKING ID
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  ⚖️ WEIGHT
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  💰 PRICE
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground text-center">
                <span className="flex items-center gap-2 justify-center">
                  ⚡ ACTIONS
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((shipment) => (
              <TableRow key={shipment.id} className="hover:bg-muted/50">
                <TableCell>
                  {getTypeBadge(shipment.shipment_type)}
                </TableCell>
                <TableCell className="font-semibold">
                  {shipment.order_id?.replace("ORD", "") || "N/A"}
                </TableCell>
                <TableCell className="font-medium">
                  {shipment.courier_partner || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getModeIcon(shipment.shipping_mode)}
                    <span>{shipment.shipping_mode || "-"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-primary">
                  {shipment.tracking_id || "-"}
                </TableCell>
                <TableCell className="text-warning font-medium">
                  {shipment.weight_kg ? `${shipment.weight_kg.toFixed(2)} Kg` : "0.00 Kg"}
                </TableCell>
                <TableCell className="font-medium">
                  ₹{shipment.shipping_cost ? Number(shipment.shipping_cost).toLocaleString() : "0"}
                </TableCell>
                <TableCell className="text-center">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
