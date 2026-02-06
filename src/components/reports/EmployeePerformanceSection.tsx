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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployeePerformance, UseEmployeePerformanceOptions } from "@/hooks/useEmployeePerformance";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

type DateFilter = "this-month" | "last-month" | "custom";

const MONTHLY_TARGET = 550000;

export const EmployeePerformanceSection = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>("this-month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const options: UseEmployeePerformanceOptions = {
    dateFilter,
    customStartDate,
    customEndDate,
  };

  const { data, isLoading } = useEmployeePerformance(options);

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
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {customStartDate && customEndDate
                    ? `${format(customStartDate, "dd MMM")} - ${format(customEndDate, "dd MMM")}`
                    : "Pick dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: customStartDate, to: customEndDate }}
                  onSelect={(range) => {
                    setCustomStartDate(range?.from);
                    setCustomEndDate(range?.to);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
                    Balance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((emp, index) => (
                  <TableRow 
                    key={emp.employeeName}
                    className={cn(
                      "transition-colors hover:bg-muted/50",
                      index === 0 && "bg-amber-50/50 dark:bg-amber-950/20"
                    )}
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
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(emp.currentMonthBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
