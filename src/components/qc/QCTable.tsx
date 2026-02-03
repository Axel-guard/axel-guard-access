import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { InventoryItem } from "@/hooks/useInventory";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface QCTableProps {
  data: InventoryItem[];
  onRowClick?: (item: InventoryItem) => void;
}

const getQCBadgeClasses = (result: string | null) => {
  if (!result) return "bg-warning/10 text-warning border-warning/20";
  const lower = result.toLowerCase();
  if (lower.includes("pass")) return "bg-success/10 text-success border-success/20";
  if (lower.includes("fail")) return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-warning/10 text-warning border-warning/20";
};

const getTestBadge = (value: string | null) => {
  if (!value) return <span className="text-muted-foreground">-</span>;
  const lower = value.toLowerCase();
  if (lower === "ok" || lower === "pass" || lower === "yes" || lower === "good" || lower === "qc pass") {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
        <span className="mr-1">✓</span>QC Pass
      </Badge>
    );
  }
  if (lower === "fail" || lower === "no" || lower === "bad" || lower === "qc fail") {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
        <span className="mr-1">✗</span>Fail
      </Badge>
    );
  }
  return <span className="text-sm">{value}</span>;
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd-MMM-yy");
  } catch {
    return date;
  }
};

export const QCTable = ({ data, onRowClick }: QCTableProps) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No QC records found
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[1600px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="font-semibold w-12">#</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Serial Number</TableHead>
              <TableHead className="font-semibold">Product Name</TableHead>
              <TableHead className="font-semibold">SD Connect</TableHead>
              <TableHead className="font-semibold">All Ch</TableHead>
              <TableHead className="font-semibold">Network</TableHead>
              <TableHead className="font-semibold">GPS</TableHead>
              <TableHead className="font-semibold">SIM Slot</TableHead>
              <TableHead className="font-semibold">Online</TableHead>
              <TableHead className="font-semibold">Camera</TableHead>
              <TableHead className="font-semibold">Monitor</TableHead>
              <TableHead className="font-semibold">Final Status</TableHead>
              <TableHead className="font-semibold">IP Address</TableHead>
              <TableHead className="font-semibold">Inspector</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={item.id}
                className={cn(
                  "hover:bg-muted/50 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(item)}
              >
                <TableCell className="text-muted-foreground text-sm">
                  {index + 1}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(item.qc_date)}
                </TableCell>
                <TableCell className="font-medium text-primary">
                  {item.serial_number}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={item.product_name}>
                  {item.product_name}
                </TableCell>
                <TableCell>{getTestBadge(item.sd_connect)}</TableCell>
                <TableCell>{getTestBadge(item.all_channels)}</TableCell>
                <TableCell>{getTestBadge(item.network_test)}</TableCell>
                <TableCell>{getTestBadge(item.gps_test)}</TableCell>
                <TableCell>{getTestBadge(item.sim_slot)}</TableCell>
                <TableCell>{getTestBadge(item.online_test)}</TableCell>
                <TableCell>{getTestBadge(item.camera_quality)}</TableCell>
                <TableCell>{getTestBadge(item.monitor_test)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("font-medium", getQCBadgeClasses(item.qc_result))}
                  >
                    {item.qc_result || "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.ip_address || "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {item.checked_by || "-"}
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
