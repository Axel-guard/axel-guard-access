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
import { Edit, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InventoryItem } from "@/hooks/useInventory";

interface InventoryTableProps {
  data: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
}

type SortField = "serial_number" | "product_name" | "status" | "qc_result" | "in_date" | "dispatch_date" | "customer_code" | "customer_name" | "customer_city" | "order_id";
type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [50, 100, 200];

export const InventoryTable = ({ data, onEdit }: InventoryTableProps) => {
  const [sortField, setSortField] = useState<SortField | "">("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Reset to page 1 when data changes (i.e. filters change)
  const dataLength = data.length;
  const [prevDataLength, setPrevDataLength] = useState(dataLength);
  if (dataLength !== prevDataLength) {
    setPrevDataLength(dataLength);
    if (currentPage !== 1) setCurrentPage(1);
  }

  const sortedData = useMemo(() => {
    if (!sortField) return data; // preserve backend order (newest first)
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "In Stock": "bg-success/10 text-success border-success/20",
      Dispatched: "bg-info/10 text-info border-info/20",
      "Quality Check": "bg-warning/10 text-warning border-warning/20",
      Returned: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  const getQCBadge = (result: string) => {
    const styles: Record<string, string> = {
      Pass: "bg-success/10 text-success border-success/20",
      "QC Pass": "bg-success/10 text-success border-success/20",
      Fail: "bg-destructive/10 text-destructive border-destructive/20",
      Pending: "bg-warning/10 text-warning border-warning/20",
    };
    return <Badge variant="outline" className={styles[result] || ""}>{result}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try { return format(new Date(dateStr), "dd/MM/yyyy"); } catch { return "-"; }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              {([
                ["serial_number", "Serial Number"],
                ["product_name", "Model Name"],
                ["status", "Status"],
                ["qc_result", "QC Result"],
                ["in_date", "In Date"],
                ["dispatch_date", "Dispatch Date"],
                ["customer_code", "Customer Code"],
                ["customer_name", "Customer Name"],
                ["customer_city", "Customer City"],
                ["order_id", "Order ID"],
              ] as [SortField, string][]).map(([field, label]) => (
                <TableHead
                  key={field}
                  className="text-xs font-semibold uppercase cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort(field)}
                >
                  <div className="flex items-center">
                    {label}
                    <SortIcon field={field} />
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-xs font-semibold uppercase w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item) => (
              <TableRow key={item.id} className="border-border">
                <TableCell className="font-mono font-semibold text-primary">{item.serial_number}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={item.product_name}>{item.product_name}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>{getQCBadge(item.qc_result || "Pending")}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.in_date)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.dispatch_date)}</TableCell>
                <TableCell className="text-muted-foreground">{item.customer_code || "-"}</TableCell>
                <TableCell>{item.customer_name || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{item.customer_city || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{item.order_id || "-"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  No inventory items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}/page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
