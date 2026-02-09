import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useShipmentsSummary } from "@/hooks/useShipments";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck } from "lucide-react";

export const CourierChart = () => {
  const { data: summary, isLoading } = useShipmentsSummary();

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

  const data = Object.entries(summary?.byCourier || {}).map(([name, stats]) => ({
    name: name.length > 12 ? name.slice(0, 12) + '...' : name,
    shipments: stats.count,
    cost: stats.cost,
  }));

  return (
    <Card className="group rounded-[14px] border-border/50 bg-card shadow-card transition-all hover:shadow-md hover:border-border">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-warning/10">
            <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
              Shipments by Courier
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Current month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} layout="vertical">
            <defs>
              <linearGradient id="courierGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--warning))" />
                <stop offset="100%" stopColor="hsl(15 90% 55%)" />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              horizontal={true} 
              vertical={false}
              opacity={0.5}
            />
            <XAxis 
              type="number" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={9}
              fontWeight={500}
              width={55}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                backdropFilter: "blur(20px)",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                name === 'cost' ? `₹${value.toLocaleString()}` : value,
                name === 'cost' ? 'Cost' : 'Shipments'
              ]}
            />
            <Bar dataKey="shipments" fill="url(#courierGradient)" radius={[0, 6, 6, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 sm:mt-3 flex justify-center gap-4 sm:gap-8 border-t border-border/50 pt-2 sm:pt-3 text-sm">
          <div className="text-center">
            <p className="text-base sm:text-xl font-bold text-foreground">{summary?.totalShipments || 0}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Shipments</p>
          </div>
          <div className="text-center">
            <p className="text-base sm:text-xl font-bold text-warning">
              ₹{(summary?.totalShippingCost || 0).toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Shipping Cost</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};