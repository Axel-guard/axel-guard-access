import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportSummaryCard } from "./ReportSummaryCard";
import { useInventoryReport, ModelInventoryReport } from "@/hooks/useReportsData";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle, AlertTriangle, Truck, ChevronDown, ChevronRight, Download, Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const InventoryReportSection = () => {
  const { data, isLoading } = useInventoryReport();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (modelName: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(modelName)) {
        next.delete(modelName);
      } else {
        next.add(modelName);
      }
      return next;
    });
  };

  const handleExport = () => {
    if (!data) return;

    const exportData = data.modelReports.map((item, index) => ({
      "S.NO": index + 1,
      "Model Name": item.modelName,
      "In Stock": item.inStock,
      "Dispatched": item.dispatched,
      "QC Pass": item.qcPass,
      "QC Fail": item.qcFail,
      "QC Pending": item.qcPending,
      "Total": item.total,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");

    const fileName = `Inventory_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, modelReports } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Inventory Reports & Statistics</h2>
          <p className="text-sm text-muted-foreground">Real-time inventory data overview</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Download Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ReportSummaryCard
          title="Total Devices"
          value={summary.totalDevices}
          icon={Package}
          variant="primary"
        />
        <ReportSummaryCard
          title="In Stock"
          value={summary.inStock}
          icon={Box}
          variant="success"
        />
        <ReportSummaryCard
          title="Dispatched"
          value={summary.dispatched}
          icon={Truck}
          variant="info"
        />
        <ReportSummaryCard
          title="QC Pass"
          value={summary.qcPass}
          icon={CheckCircle}
          variant="success"
        />
        <ReportSummaryCard
          title="QC Fail"
          value={summary.qcFail}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Model-wise Inventory Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Model-Wise Inventory Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs font-semibold uppercase text-muted-foreground">S.NO</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Model Name</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">In Stock</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Dispatched</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">QC Pass</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">QC Fail</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">QC Pending</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelReports.map((item, index) => {
                  const isLowStock = item.inStock < 5;
                  const isExpanded = expandedRows.has(item.modelName);
                  
                  return (
                    <TableRow
                      key={item.modelName}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isLowStock && "bg-rose-50/50 dark:bg-rose-950/20"
                      )}
                      onClick={() => toggleRow(item.modelName)}
                    >
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-medium">{item.modelName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={cn(
                          "inline-flex items-center gap-1 rounded px-3 py-1",
                          isLowStock ? "bg-rose-100 dark:bg-rose-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
                        )}>
                          <span className={cn(
                            "font-semibold",
                            isLowStock ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {item.inStock}
                          </span>
                          {isLowStock && (
                            <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                              LOW
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="rounded bg-blue-100 px-3 py-1 font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          {item.dispatched}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="rounded bg-emerald-100 px-3 py-1 font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {item.qcPass}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "rounded px-3 py-1 font-semibold",
                          item.qcFail > 0 
                            ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" 
                            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        )}>
                          {item.qcFail}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="rounded bg-amber-100 px-3 py-1 font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                          {item.qcPending}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-bold">{item.total}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
