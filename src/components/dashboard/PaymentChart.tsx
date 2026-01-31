import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSummary } from "@/hooks/useSales";
import { Skeleton } from "@/components/ui/skeleton";

export const PaymentChart = () => {
  const { data: summary, isLoading } = useDashboardSummary();

  const total =
    (summary?.paymentStatus?.paid || 0) +
    (summary?.paymentStatus?.partial || 0) +
    (summary?.paymentStatus?.pending || 0);

  const data = [
    {
      name: "Paid",
      value: total > 0 ? Math.round(((summary?.paymentStatus?.paid || 0) / total) * 100) : 33,
      color: "hsl(var(--success))",
    },
    {
      name: "Partial",
      value: total > 0 ? Math.round(((summary?.paymentStatus?.partial || 0) / total) * 100) : 33,
      color: "hsl(var(--warning))",
    },
    {
      name: "Pending",
      value: total > 0 ? Math.round(((summary?.paymentStatus?.pending || 0) / total) * 100) : 34,
      color: "hsl(var(--destructive))",
    },
  ];

  if (isLoading) {
    return (
      <Card className="shadow-card">
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
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value}%`, ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "var(--shadow-md)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
