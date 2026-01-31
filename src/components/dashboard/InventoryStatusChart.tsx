import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventorySummary } from "@/hooks/useInventory";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--muted))"];

export const InventoryStatusChart = () => {
  const { data: summary, isLoading } = useInventorySummary();

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

  const data = [
    { name: "In Stock", value: summary?.inStock || 0 },
    { name: "Dispatched", value: summary?.dispatched || 0 },
  ];

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Inventory Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value, "Items"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{summary?.totalItems || 0}</p>
            <p className="text-muted-foreground">Total Items</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{summary?.qcPass || 0}</p>
            <p className="text-muted-foreground">QC Pass</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
