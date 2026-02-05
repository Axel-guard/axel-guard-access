import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventorySummary } from "@/hooks/useInventory";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

export const InventoryStatusChart = () => {
  const { data: summary, isLoading } = useInventorySummary();

  if (isLoading) {
    return (
      <Card className="border-white/20 bg-card/80 backdrop-blur-xl">
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
    { name: "In Stock", value: summary?.inStock || 0, color: "hsl(var(--success))" },
    { name: "Dispatched", value: summary?.dispatched || 0, color: "hsl(var(--primary))" },
  ];

  return (
    <Card className="group border-white/20 bg-card/80 backdrop-blur-xl shadow-glass transition-all hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-success)] text-white">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Inventory Status
            </CardTitle>
            <p className="text-xs text-muted-foreground">Live data (all time)</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <defs>
              <filter id="inventoryShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
              </filter>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
              filter="url(#inventoryShadow)"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value, "Items"]}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                backdropFilter: "blur(20px)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success shadow-sm" />
            <div>
              <p className="font-bold text-foreground">{summary?.inStock || 0}</p>
              <p className="text-xs text-muted-foreground">In Stock</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary shadow-sm" />
            <div>
              <p className="font-bold text-foreground">{summary?.dispatched || 0}</p>
              <p className="text-xs text-muted-foreground">Dispatched</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success/50 shadow-sm" />
            <div>
              <p className="font-bold text-success">{summary?.qcPass || 0}</p>
              <p className="text-xs text-muted-foreground">QC Pass</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};