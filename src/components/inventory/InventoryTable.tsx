import { useState, useMemo } from "react";
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
import { Edit, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import type { InventoryItem } from "@/hooks/useInventory";

interface InventoryTableProps {
  data: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
}

type SortField = "serial_number" | "product_name" | "status" | "qc_result" | "in_date" | "dispatch_date" | "customer_code" | "customer_name" | "customer_city" | "order_id";
type SortDirection = "asc" | "desc";

export const InventoryTable = ({ data, onEdit }: InventoryTableProps) => {
  const [sortField, setSortField] = useState<SortField>("serial_number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      // Convert to strings for comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortDirection === "asc") {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "In Stock": "bg-success/10 text-success border-success/20",
      Dispatched: "bg-info/10 text-info border-info/20",
      "QC Pending": "bg-warning/10 text-warning border-warning/20",
      Defective: "bg-destructive/10 text-destructive border-destructive/20",
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("serial_number")}
            >
              <div className="flex items-center">
                Serial Number
                <SortIcon field="serial_number" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("product_name")}
            >
              <div className="flex items-center">
                Model Name
                <SortIcon field="product_name" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("status")}
            >
              <div className="flex items-center">
                Status
                <SortIcon field="status" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("qc_result")}
            >
              <div className="flex items-center">
                QC Result
                <SortIcon field="qc_result" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("in_date")}
            >
              <div className="flex items-center">
                In Date
                <SortIcon field="in_date" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("dispatch_date")}
            >
              <div className="flex items-center">
                Dispatch Date
                <SortIcon field="dispatch_date" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("customer_code")}
            >
              <div className="flex items-center">
                Customer Code
                <SortIcon field="customer_code" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("customer_name")}
            >
              <div className="flex items-center">
                Customer Name
                <SortIcon field="customer_name" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("customer_city")}
            >
              <div className="flex items-center">
                Customer City
                <SortIcon field="customer_city" />
              </div>
            </TableHead>
            <TableHead
              className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("order_id")}
            >
              <div className="flex items-center">
                Order ID
                <SortIcon field="order_id" />
              </div>
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase w-16">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((item) => (
            <TableRow key={item.id} className="border-border">
              <TableCell className="font-mono font-semibold text-primary">
                {item.serial_number}
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={item.product_name}>
                {item.product_name}
              </TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell>{getQCBadge(item.qc_result)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(item.in_date)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(item.dispatch_date)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.customer_code || "-"}
              </TableCell>
              <TableCell>
                {item.customer_name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.customer_city || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.order_id || "-"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(item)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {sortedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                No inventory items found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
