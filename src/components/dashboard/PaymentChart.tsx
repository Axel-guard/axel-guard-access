import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSummary } from "@/hooks/useSales";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";

export const PaymentChart = () => {
  const { data: summary, isLoading } = useDashboardSummary();

  const total =
    (summary?.paymentStatus?.paid || 0) +
    (summary?.paymentStatus?.partial || 0) +
    (summary?.paymentStatus?.pending || 0);

  const data = [
    {
      name: "Paid",
      value: summary?.paymentStatus?.paid || 0,
      percentage: total > 0 ? Math.round(((summary?.paymentStatus?.paid || 0) / total) * 100) : 33,
      color: "hsl(var(--success))",
    },
    {
      name: "Partial",
      value: summary?.paymentStatus?.partial || 0,
      percentage: total > 0 ? Math.round(((summary?.paymentStatus?.partial || 0) / total) * 100) : 33,
      color: "hsl(var(--warning))",
    },
    {
      name: "Pending",
      value: summary?.paymentStatus?.pending || 0,
      percentage: total > 0 ? Math.round(((summary?.paymentStatus?.pending || 0) / total) * 100) : 34,
      color: "hsl(var(--destructive))",
    },
  ];

  if (isLoading) {
    return (
      <Card className="rounded-[14px] border-border/50 bg-card shadow-card">
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
    <Card className="group rounded-[14px] border-border/50 bg-card shadow-card transition-all hover:shadow-md hover:border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
            <Wallet className="h-4 w-4 text-info" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Payment Status
            </CardTitle>
            <p className="text-xs text-muted-foreground">Current month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-72 items-center">
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
                  </filter>
                </defs>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="percentage"
                  strokeWidth={0}
                  filter="url(#shadow)"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: { payload: { value: number } }) => [
                    `${props.payload.value} orders (${value}%)`, ""
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "var(--shadow-lg)",
                    backdropFilter: "blur(20px)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex w-1/2 flex-col gap-4">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div 
                  className="h-4 w-4 rounded-full shadow-md" 
                  style={{ backgroundColor: item.color }} 
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                    <span className="text-sm font-bold text-foreground">{item.percentage}%</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.value} orders</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};