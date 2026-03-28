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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductReport, ProductDateFilter } from "@/hooks/useProductReport";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Package2,
  Download,
  Calendar as CalendarIcon,
  TrendingDown,
  ShoppingCart,
  IndianRupee,
  Layers,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const FY_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];

function getCurrentFinancialYear() {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
];

export const ProductReportSection = () => {
  const now = new Date();
  const currentFY = getCurrentFinancialYear();

  const [dateFilter, setDateFilter] = useState<ProductDateFilter>("this-month");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [fromMonth, setFromMonth] = useState(now.getMonth());
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentFY - i + 1);

  const customStartDate = dateFilter === "custom" ? startOfMonth(new Date(fromYear, fromMonth, 1)) : undefined;
  const customEndDate = dateFilter === "custom" ? endOfMonth(new Date(toYear, toMonth, 1)) : undefined;

  const { data, isLoading } = useProductReport({
    dateFilter,
    customStartDate,
    customEndDate,
    categoryFilter,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatLakhs = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return formatCurrency(amount);
  };

  const handleExport = () => {
    if (!data) return;

    const productSheet = data.products.map((p) => ({
      Rank: p.rank,
      "Product Name": p.productName,
      Category: p.category,
      "Total Revenue (₹)": p.totalRevenue,
      "Total Quantity": p.totalQuantity,
      "Total Orders": p.totalOrders,
      "Avg Unit Price (₹)": p.avgUnitPrice.toFixed(2),
      "Revenue Contribution (%)": p.revenueContributionPct.toFixed(2),
    }));

    const categorySheet = data.categories.map((c) => ({
      Category: c.category,
      "Revenue (₹)": c.revenue,
      "Quantity": c.quantity,
      "Products": c.productCount,
      "Contribution (%)": c.contributionPct.toFixed(2),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productSheet), "Products");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categorySheet), "Categories");
    XLSX.writeFile(wb, `Product_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow">
          🥇 1
        </Badge>
      );
    if (rank === 2)
      return (
        <Badge className="bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 border-0 shadow">
          🥈 2
        </Badge>
      );
    if (rank === 3)
      return (
        <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white border-0 shadow">
          🥉 3
        </Badge>
      );
    return <span className="text-muted-foreground text-sm">{rank}</span>;
  };

  const allCategories = data?.categories.map((c) => c.category) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { summary, products, categories } = data || {
    summary: { totalRevenue: 0, totalQuantitySold: 0, totalOrders: 0, totalProducts: 0, topProduct: null, topCategory: null },
    products: [],
    categories: [],
  };

  const lowMovers = [...products]
    .filter((p) => p.totalRevenue > 0)
    .sort((a, b) => a.totalRevenue - b.totalRevenue)
    .slice(0, 5);

  const chartData = categories.slice(0, 8).map((c) => ({
    name: c.category.length > 12 ? c.category.slice(0, 12) + "…" : c.category,
    fullName: c.category,
    revenue: c.revenue,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Product Report</h2>
          <p className="text-sm text-muted-foreground">
            Revenue breakdown by product and category
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={(val) => setDateFilter(val as ProductDateFilter)}>
            <SelectTrigger className="w-[170px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="this-year">This Financial Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">Custom Month Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <Layers className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {dateFilter === "custom" && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 w-fit">
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <IndianRupee className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <IndianRupee className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-white/90">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold">{formatLakhs(summary.totalRevenue)}</p>
            {summary.topProduct && (
              <p className="text-xs text-white/75 mt-1 truncate">Top: {summary.topProduct}</p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <Package2 className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Package2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-white/90">Units Sold</span>
            </div>
            <p className="text-2xl font-bold">
              {summary.totalQuantitySold.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-white/75 mt-1">{summary.totalProducts} products</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <ShoppingCart className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-white/90">Orders</span>
            </div>
            <p className="text-2xl font-bold">{summary.totalOrders}</p>
            <p className="text-xs text-white/75 mt-1">with product line items</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <Layers className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-white/90">Products</span>
            </div>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
            {summary.topCategory && (
              <p className="text-xs text-white/75 mt-1 truncate">Top cat: {summary.topCategory}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Chart + Table */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Category Revenue Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(val) => formatLakhs(val)} className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => [
                      formatCurrency(value),
                      props.payload?.fullName || "Revenue",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Table */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase font-semibold text-muted-foreground">
                        Category
                      </TableHead>
                      <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                        Revenue
                      </TableHead>
                      <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                        Qty
                      </TableHead>
                      <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                        Products
                      </TableHead>
                      <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                        Share
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat, i) => (
                      <TableRow key={cat.category} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            {cat.category}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatLakhs(cat.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {cat.quantity.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                            {cat.productCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-semibold",
                              cat.contributionPct >= 30
                                ? "border-emerald-400 text-emerald-600"
                                : cat.contributionPct >= 10
                                ? "border-amber-400 text-amber-600"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            {cat.contributionPct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Products Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package2 className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Top Products by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No product data for selected filters</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 text-xs uppercase font-semibold text-muted-foreground">
                      Rank
                    </TableHead>
                    <TableHead className="text-xs uppercase font-semibold text-muted-foreground">
                      Product
                    </TableHead>
                    <TableHead className="text-xs uppercase font-semibold text-muted-foreground">
                      Category
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                      Revenue
                    </TableHead>
                    <TableHead className="text-center text-xs uppercase font-semibold text-muted-foreground">
                      Qty
                    </TableHead>
                    <TableHead className="text-center text-xs uppercase font-semibold text-muted-foreground">
                      Orders
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                      Avg Price
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                      Share
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.productName}
                      className={cn(
                        "transition-colors hover:bg-muted/50",
                        product.rank === 1 && "bg-amber-50/50 dark:bg-amber-950/20"
                      )}
                    >
                      <TableCell className="font-medium">
                        {getRankBadge(product.rank)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{product.productName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {formatCurrency(product.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {product.totalQuantity.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="rounded bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                          {product.totalOrders}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(product.avgUnitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-semibold">
                            {product.revenueContributionPct.toFixed(1)}%
                          </span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(product.revenueContributionPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Movers Section */}
      {lowMovers.length > 0 && (
        <Card className="border-border/50 bg-card/80 shadow-lg">
          <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg">Low Movers</CardTitle>
              <p className="text-sm text-muted-foreground">Bottom 5 products by revenue</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase font-semibold text-muted-foreground">
                      Product
                    </TableHead>
                    <TableHead className="text-xs uppercase font-semibold text-muted-foreground">
                      Category
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                      Revenue
                    </TableHead>
                    <TableHead className="text-center text-xs uppercase font-semibold text-muted-foreground">
                      Qty
                    </TableHead>
                    <TableHead className="text-center text-xs uppercase font-semibold text-muted-foreground">
                      Orders
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase font-semibold text-muted-foreground">
                      Share
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowMovers.map((product) => (
                    <TableRow key={product.productName} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-muted-foreground">
                        {product.productName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatCurrency(product.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {product.totalQuantity.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="rounded bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          {product.totalOrders}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {product.revenueContributionPct.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
