import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeCard } from "@/components/dashboard/EmployeeCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { PaymentChart } from "@/components/dashboard/PaymentChart";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { ShoppingCart, DollarSign, CheckCircle, Wallet } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useSales";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: summary, isLoading } = useDashboardSummary();

  const employeeColors: Record<string, "blue" | "emerald" | "amber"> = {
    "Akash Parashar": "blue",
    "Smruti Ranjan Nayak": "emerald",
    "Mandeep Samal": "amber",
  };

  const formatCurrency = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground">Current Month Sales Summary</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={String(summary?.totalSales || 0)}
          icon={ShoppingCart}
          variant="primary"
          trend={{ value: "12%", positive: true }}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0)}
          icon={DollarSign}
          variant="info"
          trend={{ value: "8%", positive: true }}
        />
        <StatCard
          title="Received"
          value={formatCurrency(summary?.totalReceived || 0)}
          icon={CheckCircle}
          variant="success"
          trend={{ value: "15%", positive: true }}
        />
        <StatCard
          title="Balance"
          value={formatCurrency(summary?.totalBalance || 0)}
          icon={Wallet}
          variant="warning"
          trend={{ value: "3%", positive: false }}
        />
      </div>

      {/* Employee Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {summary?.employeeStats &&
          Object.entries(summary.employeeStats).map(([name, stats]) => (
            <EmployeeCard
              key={name}
              name={name}
              initials={name
                .split(" ")
                .map((n) => n[0])
                .join("")}
              revenue={formatCurrency(stats.revenue)}
              sales={stats.sales}
              balance={formatCurrency(stats.balance)}
              color={employeeColors[name] || "blue"}
            />
          ))}
        {(!summary?.employeeStats || Object.keys(summary.employeeStats).length === 0) && (
          <>
            <EmployeeCard
              name="Akash Parashar"
              initials="AP"
              revenue="₹0"
              sales={0}
              balance="₹0"
              color="blue"
            />
            <EmployeeCard
              name="Smruti Ranjan Nayak"
              initials="SN"
              revenue="₹0"
              sales={0}
              balance="₹0"
              color="emerald"
            />
            <EmployeeCard
              name="Mandeep Samal"
              initials="MS"
              revenue="₹0"
              sales={0}
              balance="₹0"
              color="amber"
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart />
        <PaymentChart />
      </div>

      {/* Sales Table */}
      <SalesTable />
    </div>
  );
};

export default Index;
