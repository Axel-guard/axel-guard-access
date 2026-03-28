import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEmployeePerformance, UseEmployeePerformanceOptions } from "@/hooks/useEmployeePerformance";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar as CalendarIcon,
  Flame,
  Users,
  IndianRupee,
  ArrowUp,
  ArrowDown,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

type DateFilter = "this-month" | "last-month" | "custom";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const FY_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];

function getCurrentFinancialYear() {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

const MONTHLY_TARGET = 550000;

interface RecentSale {
  order_id: string;
  customer_name: string;
  total_amount: number;
  sale_date: string;
}

export const EmployeePerformanceSection = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>("this-month");

  const currentFY = getCurrentFinancialYear();
  const now = new Date();
  const [fromMonth, setFromMonth] = useState(now.getMonth());
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());

  // Drill-down state
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentFY - i + 1);

  const customStartDate = dateFilter === "custom" ? startOfMonth(new Date(fromYear, fromMonth, 1)) : undefined;
  const customEndDate = dateFilter === "custom" ? endOfMonth(new Date(toYear, toMonth, 1)) : undefined;

  const options: UseEmployeePerformanceOptions = {
    dateFilter,
    customStartDate,
    customEndDate,
  };

  const { data, isLoading } = useEmployeePerformance(options);

  const openEmployeeDrilldown = async (employeeName: string) => {
    setSelectedEmployee(employeeName);
    setSalesLoading(true);
    setRecentSales([]);
    try {
      const { data: sales } = await supabase
        .from("sales")
        .select("order_id, customer_name, total_amount, sale_date")
        .eq("employee_name", employeeName)
        .order("sale_date", { ascending: false })
        .limit(5);
      setRecentSales(sales || []);
    } catch {
      setRecentSales([]);
    } finally {
      setSalesLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const exportData = data.map((emp, index) => ({
      Rank: index + 1,
      "Employee Name": emp.employeeName,
      "Current Month Sales (₹)": emp.currentMonthSales,
      "Current Month Orders": emp.currentMonthOrders,
      "Target (₹)": MONTHLY_TARGET,
      "Target Progress (%)": emp.targetProgress.toFixed(1),
      "Remaining Target (₹)": emp.remainingTarget,
      "Last Month Sales (₹)": emp.lastMonthSales,
      "Growth (%)": emp.growthPercentage.toFixed(1),
      "Balance Collection (₹)": emp.currentMonthBalance,
      "Collection Efficiency (%)": (emp.collectionEfficiency ?? 0).toFixed(1),
      "Avg Deal Size (₹)": (emp.avgDealSize ?? 0).toFixed(0),
      "Team Contribution (%)": (emp.contributionPct ?? 0).toFixed(1),
      "Performance Score": (emp.performanceScore ?? 0).toFixed(1),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Performance");

    const fileName = `Employee_Performance_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-success";
    if (percent >= 71) return "bg-info";
    if (percent >= 41) return "bg-warning";
    return "bg-destructive";
  };

  const getProgressTextColor = (percent: number) => {
    if (percent >= 100) return "text-success";
    if (percent >= 71) return "text-info";
    if (percent >= 41) return "text-warning";
    return "text-destructive";
  };

  const getPerformanceScoreBadge = (score: number) => {
    if (score >= 70)
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold">
          {score.toFixed(0)}
        </Badge>
      );
    if (score >= 40)
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold">
          {score.toFixed(0)}
        </Badge>
      );
    return (
      <Badge className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold">
        {score.toFixed(0)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 p-8 text-center">
        <p className="text-muted-foreground">No employee performance data available</p>
      </Card>
    );
  }

  // Find top performer
  const topPerformer = data[0];

  // Find highest growth
  const highestGrowth = [...data]
    .filter(e => e.isGrowth && e.growthPercentage > 0)
    .sort((a, b) => b.growthPercentage - a.growthPercentage)[0];

  // Total team revenue
  const totalTeamRevenue = data.reduce((sum, e) => sum + e.currentMonthSales, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Employee Target Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            Monthly target: {formatCurrency(MONTHLY_TARGET)} per employee
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={(val) => setDateFilter(val as DateFilter)}>
            <SelectTrigger className="w-[160px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="custom">Custom Month Range</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">From</span>
                <div className="flex gap-1">
                  <Select value={String(fromMonth)} onValueChange={(v) => setFromMonth(Number(v))}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FY_MONTHS.map((m) => (
                        <SelectItem key={m} value={String(m)}>{MONTHS[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(fromYear)} onValueChange={(v) => setFromYear(Number(v))}>
                    <SelectTrigger className="w-[75px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <span className="text-muted-foreground text-sm pb-1">→</span>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">To</span>
                <div className="flex gap-1">
                  <Select value={String(toMonth)} onValueChange={(v) => setToMonth(Number(v))}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FY_MONTHS.map((m) => (
                        <SelectItem key={m} value={String(m)}>{MONTHS[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(toYear)} onValueChange={(v) => setToYear(Number(v))}>
                    <SelectTrigger className="w-[75px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Performer */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <Flame className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Flame className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/90">
                🔥 Top Performer
              </span>
            </div>
            <p className="text-lg font-bold truncate">{topPerformer.employeeName}</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(topPerformer.currentMonthSales)}
            </p>
            <p className="text-sm text-white/80 mt-1">
              {topPerformer.targetProgress.toFixed(0)}% Target Achieved
            </p>
          </CardContent>
        </Card>

        {/* Highest Growth */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <TrendingUp className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/90">
                📈 Highest Growth
              </span>
            </div>
            <p className="text-lg font-bold truncate">
              {highestGrowth?.employeeName || "N/A"}
            </p>
            <p className="text-2xl font-bold mt-1">
              {highestGrowth ? `+${highestGrowth.growthPercentage.toFixed(1)}%` : "N/A"}
            </p>
            <p className="text-sm text-white/80 mt-1">
              vs Last Month
            </p>
          </CardContent>
        </Card>

        {/* Team Revenue */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <IndianRupee className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/90">
                💰 Team Revenue
              </span>
            </div>
            <p className="text-lg font-bold truncate">Total Sales</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(totalTeamRevenue)}
            </p>
            <p className="text-sm text-white/80 mt-1">
              {data.length} Employees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Employee Target Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-xs font-semibold uppercase text-muted-foreground">
                    Rank
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Employee
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                    Current Sales
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">
                    Orders
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-48">
                    Target Progress
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                    Remaining
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                    Last Month
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">
                    Growth
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                    Collection
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                    Avg Deal
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">
                    Score
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">
                    % Team
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((emp, index) => (
                  <TableRow
                    key={emp.employeeName}
                    className={cn(
                      "transition-colors hover:bg-muted/50 cursor-pointer",
                      index === 0 && "bg-amber-50/50 dark:bg-amber-950/20"
                    )}
                    onClick={() => openEmployeeDrilldown(emp.employeeName)}
                  >
                    <TableCell className="font-medium">
                      {index === 0 ? (
                        <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow">
                          🏆 1
                        </Badge>
                      ) : index === 1 ? (
                        <Badge className="bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 border-0 shadow">
                          🥈 2
                        </Badge>
                      ) : index === 2 ? (
                        <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white border-0 shadow">
                          🥉 3
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 && <Flame className="h-4 w-4 text-orange-500" />}
                        <span className="font-medium">{emp.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {formatCurrency(emp.currentMonthSales)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="rounded bg-violet-100 px-2.5 py-1 font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                        {emp.currentMonthOrders}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {formatCurrency(emp.currentMonthSales)} / {formatCurrency(MONTHLY_TARGET)}
                          </span>
                          <span className={cn("font-semibold", getProgressTextColor(emp.targetProgress))}>
                            {emp.targetProgress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", getProgressColor(emp.targetProgress))}
                            style={{ width: `${emp.targetProgress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {emp.remainingTarget > 0 ? formatCurrency(emp.remainingTarget) : (
                        <Badge className="bg-success text-white">Achieved!</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(emp.lastMonthSales)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold",
                        emp.isGrowth
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {emp.isGrowth ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                        {Math.abs(emp.growthPercentage).toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm font-semibold text-foreground">
                          {(emp.collectionEfficiency ?? 0).toFixed(0)}%
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              (emp.collectionEfficiency ?? 0) >= 90
                                ? "bg-emerald-500"
                                : (emp.collectionEfficiency ?? 0) >= 70
                                ? "bg-amber-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(emp.collectionEfficiency ?? 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatCurrency(emp.avgDealSize ?? 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPerformanceScoreBadge(emp.performanceScore ?? 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {(emp.contributionPct ?? 0).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Drill-Down Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => { if (!open) setSelectedEmployee(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              {selectedEmployee} — Last 5 Sales
            </DialogTitle>
          </DialogHeader>
          {salesLoading ? (
            <div className="space-y-2 py-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sales found for this employee</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Order ID</TableHead>
                  <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.order_id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sale.order_id}
                    </TableCell>
                    <TableCell className="font-medium">{sale.customer_name || "—"}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(Number(sale.total_amount) || 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {sale.sale_date
                        ? format(new Date(sale.sale_date), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
