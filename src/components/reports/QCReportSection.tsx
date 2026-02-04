import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportSummaryCard } from "./ReportSummaryCard";
import { useQCReport } from "@/hooks/useReportsData";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, CheckCircle, XCircle, Clock, Search, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const QCReportSection = () => {
  const { data, isLoading } = useQCReport();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredItems = useMemo(() => {
    if (!data) return [];

    let filtered = data.qcItems;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.serialNumber.toLowerCase().includes(query) ||
          item.productName.toLowerCase().includes(query) ||
          (item.inspector && item.inspector.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.finalQCStatus === statusFilter);
    }

    // Apply date filter
    const now = new Date();
    if (dateFilter === "today") {
      const today = format(now, "yyyy-MM-dd");
      filtered = filtered.filter(
        (item) => item.date && format(new Date(item.date), "yyyy-MM-dd") === today
      );
    } else if (dateFilter === "thisMonth") {
      const thisMonth = format(now, "yyyy-MM");
      filtered = filtered.filter(
        (item) => item.date && format(new Date(item.date), "yyyy-MM") === thisMonth
      );
    } else if (dateFilter === "lastMonth") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = format(lastMonth, "yyyy-MM");
      filtered = filtered.filter(
        (item) => item.date && format(new Date(item.date), "yyyy-MM") === lastMonthStr
      );
    }

    return filtered;
  }, [data, searchQuery, dateFilter, statusFilter]);

  const handleExport = () => {
    if (!filteredItems.length) return;

    const exportData = filteredItems.map((item) => ({
      "Date": item.date ? format(new Date(item.date), "dd/MM/yyyy") : "-",
      "Serial Number": item.serialNumber,
      "Product Name": item.productName,
      "SD Connectivity": item.sdConnectivity || "-",
      "Network QC": item.networkQC || "-",
      "GPS QC": item.gpsQC || "-",
      "Final Status": item.finalQCStatus,
      "Inspector": item.inspector || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "QC Report");

    const fileName = `QC_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pass":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Pass
          </Badge>
        );
      case "Fail":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Fail
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getTestResult = (result: string | null) => {
    if (!result) return <span className="text-muted-foreground">-</span>;
    
    const isPass = result.toLowerCase() === "ok" || result.toLowerCase() === "pass";
    const isFail = result.toLowerCase() === "fail" || result.toLowerCase() === "not ok";
    
    return (
      <span className={cn(
        "font-medium",
        isPass && "text-emerald-600 dark:text-emerald-400",
        isFail && "text-rose-600 dark:text-rose-400",
        !isPass && !isFail && "text-muted-foreground"
      )}>
        {result}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ClipboardCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">QC Report Summary</h2>
          <p className="text-sm text-muted-foreground">Quality check statistics and reports</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReportSummaryCard
          title="Total Checked"
          value={summary.totalChecked}
          icon={ClipboardCheck}
          variant="primary"
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
          icon={XCircle}
          variant="danger"
        />
        <ReportSummaryCard
          title="QC Pending"
          value={summary.qcPending}
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* QC Report Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-4 pb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">QC Reports</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search serial, product, inspector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pass">Pass</SelectItem>
                <SelectItem value="Fail">Fail</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Serial Number</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Product Name</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">SD Connectivity</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Network QC</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">GPS QC</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Final Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Inspector</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.slice(0, 50).map((item, index) => (
                  <TableRow key={`${item.serialNumber}-${index}`} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">
                      {item.date ? format(new Date(item.date), "d/M/yyyy") : "-"}
                    </TableCell>
                    <TableCell className="font-medium font-mono">{item.serialNumber}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">{getTestResult(item.sdConnectivity)}</TableCell>
                    <TableCell className="text-center">{getTestResult(item.networkQC)}</TableCell>
                    <TableCell className="text-center">{getTestResult(item.gpsQC)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.finalQCStatus)}</TableCell>
                    <TableCell className="text-muted-foreground">{item.inspector || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredItems.length > 50 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Showing 50 of {filteredItems.length} records. Export to see all.
              </p>
            )}
            {filteredItems.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                No QC records found matching your filters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
