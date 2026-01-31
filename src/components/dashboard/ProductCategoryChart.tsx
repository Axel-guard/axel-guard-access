import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductsByCategory } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

export const ProductCategoryChart = () => {
  const { data: grouped, isLoading } = useProductsByCategory();

  if (isLoading) {
    return (
      <Card className="shadow-card">
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
    category: category.length > 15 ? category.slice(0, 15) + '...' : category,
    count: products.length,
  })).sort((a, b) => b.count - a.count);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Products by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [value, 'Products']}
            />
            <Bar dataKey="count" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
