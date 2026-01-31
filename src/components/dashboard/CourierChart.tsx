import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useShipmentsSummary } from "@/hooks/useShipments";
import { Skeleton } from "@/components/ui/skeleton";

export const CourierChart = () => {
  const { data: summary, isLoading } = useShipmentsSummary();

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

  const data = Object.entries(summary?.byCourier || {}).map(([name, stats]) => ({
    name,
    shipments: stats.count,
    cost: stats.cost,
  }));

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Shipments by Courier
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12} 
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [
                name === 'cost' ? `₹${value.toLocaleString()}` : value,
                name === 'cost' ? 'Cost' : 'Shipments'
              ]}
            />
            <Bar dataKey="shipments" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{summary?.totalShipments || 0}</p>
            <p className="text-muted-foreground">Total Shipments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              ₹{(summary?.totalShippingCost || 0).toLocaleString()}
            </p>
            <p className="text-muted-foreground">Shipping Cost</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
