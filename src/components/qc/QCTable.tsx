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

interface QCTableProps {
  data: InventoryItem[];
}

const getQCBadgeVariant = (result: string | null) => {
  if (!result) return "secondary";
  const lower = result.toLowerCase();
  if (lower.includes("pass")) return "success";
  if (lower.includes("fail")) return "destructive";
  return "secondary";
};

const getTestBadge = (value: string | null) => {
  if (!value) return <span className="text-muted-foreground">-</span>;
  const lower = value.toLowerCase();
  if (lower === "ok" || lower === "pass" || lower === "yes" || lower === "good") {
    return <Badge variant="outline" className="bg-success/10 text-success border-success/20">OK</Badge>;
  }
  if (lower === "fail" || lower === "no" || lower === "bad") {
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Fail</Badge>;
  }
  return <span className="text-sm">{value}</span>;
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch {
    return date;
  }
};

export const QCTable = ({ data }: QCTableProps) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No QC records found
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[1400px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">Serial Number</TableHead>
              <TableHead className="font-semibold">Device Type</TableHead>
              <TableHead className="font-semibold">QC Date</TableHead>
              <TableHead className="font-semibold">Final Status</TableHead>
              <TableHead className="font-semibold">SD Connect</TableHead>
              <TableHead className="font-semibold">All Channels</TableHead>
              <TableHead className="font-semibold">Network</TableHead>
              <TableHead className="font-semibold">GPS</TableHead>
              <TableHead className="font-semibold">SIM Slot</TableHead>
              <TableHead className="font-semibold">Online</TableHead>
              <TableHead className="font-semibold">Camera</TableHead>
              <TableHead className="font-semibold">Monitor</TableHead>
              <TableHead className="font-semibold">IP Address</TableHead>
              <TableHead className="font-semibold">Checked By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-primary">
                  {item.serial_number}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={item.product_name}>
                  {item.product_name}
                </TableCell>
                <TableCell>{formatDate(item.qc_date)}</TableCell>
                <TableCell>
                  <Badge variant={getQCBadgeVariant(item.qc_result) as any}>
                    {item.qc_result || "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>{getTestBadge(item.sd_connect)}</TableCell>
                <TableCell>{getTestBadge(item.all_channels)}</TableCell>
                <TableCell>{getTestBadge(item.network_test)}</TableCell>
                <TableCell>{getTestBadge(item.gps_test)}</TableCell>
                <TableCell>{getTestBadge(item.sim_slot)}</TableCell>
                <TableCell>{getTestBadge(item.online_test)}</TableCell>
                <TableCell>{getTestBadge(item.camera_quality)}</TableCell>
                <TableCell>{getTestBadge(item.monitor_test)}</TableCell>
                <TableCell className="text-sm">
                  {item.ip_address || "-"}
                </TableCell>
                <TableCell>{item.checked_by || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
