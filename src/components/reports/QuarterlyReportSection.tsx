import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanyQuarterlyReport } from "@/hooks/useEmployeePerformance";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Flame,
  IndianRupee,
  Trophy,
  ArrowUp,
  ArrowDown,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const QuarterlyReportSection = () => {
  const { data, isLoading } = useCompanyQuarterlyReport();

  const handleExportCompany = () => {
    if (!data) return;

    const companyData = data.companyQuarterlyData.map((q) => ({
      Quarter: q.quarter,
      Year: q.year,
      "Revenue (₹)": q.revenue,
      Orders: q.orders,
      "Avg Order Value (₹)": q.avgOrderValue,
      "Growth (%)": q.growthPercent?.toFixed(1) || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(companyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Company Quarterly");

    const fileName = `Company_Quarterly_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportEmployee = () => {
    if (!data) return;

    const employeeData = data.employeeQuarterlyData.flatMap((emp) =>
      emp.quarterlyData.map((q) => ({
        Employee: emp.employeeName,
        Quarter: q.quarter,
        Year: q.year,
        "Revenue (₹)": q.revenue,
        Orders: q.orders,
        "Avg Order Value (₹)": q.avgOrderValue,
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(employeeData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Quarterly");

    const fileName = `Employee_Quarterly_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLakhs = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return formatCurrency(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-border/50 bg-card/80 p-8 text-center">
        <p className="text-muted-foreground">No quarterly data available</p>
      </Card>
    );
  }

  const { companyQuarterlyData, employeeQuarterlyData, highlights, currentYear } = data;

  // Chart data
  const chartData = companyQuarterlyData.map((q) => ({
    name: q.quarter,
    revenue: q.revenue,
    orders: q.orders,
    avgOrderValue: q.avgOrderValue,
  }));

  return (
    <div className="space-y-6">
      {/* Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Performer This Quarter */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <Trophy className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/90">
                🏆 Top Performer ({highlights.currentQuarter})
              </span>
            </div>
            <p className="text-lg font-bold truncate">
              {highlights.topPerformerThisQuarter?.name || "N/A"}
            </p>
            <p className="text-2xl font-bold mt-1">
              {highlights.topPerformerThisQuarter
                ? formatCurrency(highlights.topPerformerThisQuarter.revenue)
                : "₹0"}
            </p>
          </CardContent>
        </Card>

        {/* Highest Growth Employee */}
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
              {highlights.highestGrowthEmployee?.name || "N/A"}
            </p>
            <p className="text-2xl font-bold mt-1">
              {highlights.highestGrowthEmployee
                ? `+${highlights.highestGrowthEmployee.growthPercent.toFixed(1)}%`
                : "N/A"}
            </p>
          </CardContent>
        </Card>

        {/* Quarter Revenue Total */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <IndianRupee className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/90">
                💰 {highlights.currentQuarter} Revenue
              </span>
            </div>
            <p className="text-lg font-bold truncate">Quarter Total</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(highlights.quarterRevenueTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Company vs Employee */}
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50">
          <TabsTrigger value="company" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
            Company Level
          </TabsTrigger>
          <TabsTrigger value="employee" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Flame className="h-4 w-4" />
            Employee Level
          </TabsTrigger>
        </TabsList>

        {/* Company Level Tab */}
        <TabsContent value="company" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Company Quarterly Performance ({currentYear})</h3>
            <Button onClick={handleExportCompany} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Quarterly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis tickFormatter={(val) => formatLakhs(val)} className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Line Chart */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis yAxisId="left" tickFormatter={(val) => formatLakhs(val)} className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "revenue" ? formatCurrency(value) : value,
                        name === "revenue" ? "Revenue" : "Orders"
                      ]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      yAxisId="left"
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      name="Orders"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--success))", strokeWidth: 2 }}
                      yAxisId="right"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Company Quarterly Table */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Quarterly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quarter</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-right">Avg Order Value</TableHead>
                    <TableHead className="text-center">Growth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyQuarterlyData.map((q) => (
                    <TableRow key={q.quarter}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{q.quarter} {q.year}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(q.revenue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="rounded bg-violet-100 px-2.5 py-1 font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                          {q.orders}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(q.avgOrderValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        {q.growthPercent !== null ? (
                          <div className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold",
                            q.growthPercent >= 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {q.growthPercent >= 0 ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )}
                            {Math.abs(q.growthPercent).toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Level Tab */}
        <TabsContent value="employee" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Employee Quarterly Performance ({currentYear})</h3>
            <Button onClick={handleExportEmployee} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Employee Quarterly Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeQuarterlyData.slice(0, 6).map((emp, index) => (
              <Card key={emp.employeeName} className="border-border/50 bg-card/80 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                      <CardTitle className="text-base">{emp.employeeName}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Best: {emp.bestQuarter}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {emp.quarterlyData.map((q) => (
                      <div key={q.quarter} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{q.quarter}</p>
                        <p className="text-sm font-semibold">{formatLakhs(q.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{q.orders} orders</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                      <p className="font-bold">{formatCurrency(emp.totalRevenue)}</p>
                    </div>
                    <div className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold",
                      emp.quarterGrowth >= 0
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {emp.quarterGrowth >= 0 ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )}
                      {Math.abs(emp.quarterGrowth).toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full Employee Table */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">All Employees - Quarterly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Q1</TableHead>
                      <TableHead className="text-right">Q2</TableHead>
                      <TableHead className="text-right">Q3</TableHead>
                      <TableHead className="text-right">Q4</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead>Best Quarter</TableHead>
                      <TableHead className="text-center">Q Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeQuarterlyData.map((emp, index) => (
                      <TableRow key={emp.employeeName} className={cn(
                        index === 0 && "bg-amber-50/50 dark:bg-amber-950/20"
                      )}>
                        <TableCell>
                          {index === 0 ? (
                            <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0">
                              🏆 1
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">{index + 1}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Flame className="h-4 w-4 text-orange-500" />}
                            {emp.employeeName}
                          </div>
                        </TableCell>
                        {emp.quarterlyData.map((q) => (
                          <TableCell key={q.quarter} className="text-right text-muted-foreground">
                            {formatLakhs(q.revenue)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold">
                          {formatCurrency(emp.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="rounded bg-violet-100 px-2.5 py-1 font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                            {emp.totalOrders}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{emp.bestQuarter}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold",
                            emp.quarterGrowth >= 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {emp.quarterGrowth >= 0 ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )}
                            {Math.abs(emp.quarterGrowth).toFixed(1)}%
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
