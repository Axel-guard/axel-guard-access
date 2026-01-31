import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSummary } from "@/hooks/useSales";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

export const SalesChart = () => {
  const { data: summary, isLoading } = useDashboardSummary();

  const chartData = summary?.employeeStats
    ? Object.entries(summary.employeeStats).map(([name, stats]) => ({
        name: name.split(" ")[0],
        sales: stats.revenue,
      }))
    : [
        { name: "Akash", sales: 0 },
        { name: "Smruti", sales: 0 },
        { name: "Mandeep", sales: 0 },
      ];

  if (isLoading) {
    return (
      <Card className="border-white/20 bg-card/80 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group border-white/20 bg-card/80 backdrop-blur-xl shadow-glass transition-all hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">
            Employee Sales
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="50%" stopColor="hsl(var(--accent))" />
                  <stop offset="100%" stopColor="hsl(320 80% 60%)" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                type="number"
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                stroke="hsl(var(--muted-foreground))"
                fontSize={13}
                fontWeight={500}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "var(--shadow-lg)",
                  backdropFilter: "blur(20px)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
              />
              <Bar
                dataKey="sales"
                fill="url(#salesGradient)"
                radius={[0, 8, 8, 0]}
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};