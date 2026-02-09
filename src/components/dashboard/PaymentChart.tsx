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
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-info/10">
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
              Payment Status
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Current month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* Responsive chart container - stacks on very small screens */}
        <div className="flex flex-col sm:flex-row h-auto sm:h-48 lg:h-56 items-center gap-4">
          <div className="w-full sm:w-1/2 h-40 sm:h-full">
            <ResponsiveContainer width="100%" height="100%">
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
                  innerRadius={35}
                  outerRadius={60}
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
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex w-full sm:w-1/2 flex-row sm:flex-col gap-3 sm:gap-4 justify-center">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2 sm:gap-3">
                <div 
                  className="h-3 w-3 sm:h-4 sm:w-4 rounded-full shadow-md shrink-0" 
                  style={{ backgroundColor: item.color }} 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-foreground">{item.name}</span>
                    <span className="text-xs sm:text-sm font-bold text-foreground">{item.percentage}%</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{item.value} orders</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};