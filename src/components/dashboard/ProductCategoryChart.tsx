import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTopSellingProducts } from "@/hooks/useTopSellingProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

export const ProductCategoryChart = () => {
  const { data: products, isLoading } = useTopSellingProducts();

  if (isLoading) {
    return (
      <Card className="rounded-[14px] border-border/50 bg-card shadow-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const data = (products || []).map((p) => ({
    name: p.productName.length > 14 ? p.productName.slice(0, 14) + "…" : p.productName,
    fullName: p.productName,
    units: p.unitsSold,
    revenue: p.totalRevenue,
  }));

  const isEmpty = data.length === 0;

  return (
    <Card className="group rounded-[14px] border-border/50 bg-card shadow-card transition-all hover:shadow-md hover:border-border">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-info/10">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
              Top Selling Products
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground">This month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-1 sm:px-6">
        {isEmpty ? (
          <div className="flex h-[180px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No sales data for this month</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
              <defs>
                <linearGradient id="sellingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--info))" />
                  <stop offset="100%" stopColor="hsl(225 85% 60%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={8}
                fontWeight={500}
                angle={-35}
                textAnchor="end"
                height={40}
                axisLine={false}
                tickLine={false}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} width={25} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  backdropFilter: "blur(20px)",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "units") return [value, "Units Sold"];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey="units" fill="url(#sellingGradient)" radius={[6, 6, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
