import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductsByCategory } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag } from "lucide-react";

export const ProductCategoryChart = () => {
  const { data: grouped, isLoading } = useProductsByCategory();

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

  const data = Object.entries(grouped || {}).map(([category, products]) => ({
    category: category.length > 12 ? category.slice(0, 12) + '...' : category,
    count: products.length,
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <Card className="group rounded-[14px] border-border/50 bg-card shadow-card transition-all hover:shadow-md hover:border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
            <ShoppingBag className="h-4 w-4 text-info" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Top Products
            </CardTitle>
            <p className="text-xs text-muted-foreground">By category</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <defs>
              <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--info))" />
                <stop offset="100%" stopColor="hsl(225 85% 60%)" />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false}
              opacity={0.5}
            />
            <XAxis 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              fontWeight={500}
              angle={-35}
              textAnchor="end"
              height={50}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                backdropFilter: "blur(20px)",
              }}
              formatter={(value: number) => [value, 'Products']}
            />
            <Bar 
              dataKey="count" 
              fill="url(#categoryGradient)" 
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};