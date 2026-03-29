import { useState } from "react";
import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard";
import { EmployeePerformanceCard } from "@/components/dashboard/EmployeePerformanceCard";
import { DateFilterDropdown } from "@/components/dashboard/DateFilterDropdown";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { PaymentChart } from "@/components/dashboard/PaymentChart";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { CourierChart } from "@/components/dashboard/CourierChart";
import { ProductCategoryChart } from "@/components/dashboard/ProductCategoryChart";
import { ShoppingCart, IndianRupee, CheckCircle, Wallet } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useSales";
import { useEmployees } from "@/hooks/useEmployees";
import { Skeleton } from "@/components/ui/skeleton";

const SalesDashboard = () => {
  const [dateFilter, setDateFilter] = useState("this-month");
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: activeEmployees = [] } = useEmployees();

  const colorPool: ("blue" | "emerald" | "amber")[] = ["blue", "emerald", "amber"];
  const employeeColors: Record<string, "blue" | "emerald" | "amber"> = {};
  activeEmployees.forEach((emp, i) => {
    employeeColors[emp.name] = colorPool[i % colorPool.length];
  });

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString()}`;
  };

  const currentMonthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const sortedEmployees = summary?.employeeStats
    ? Object.entries(summary.employeeStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-[14px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sales Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{currentMonthName} Summary</p>
        </div>
        <DateFilterDropdown value={dateFilter} onValueChange={setDateFilter} />
      </div>

      {/* Revenue KPIs */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          title="Total Sales"
          value={String(summary?.totalSales || 0)}
          icon={ShoppingCart}
          variant="primary"
          trend={{ value: 12, positive: true }}
        />
        <PremiumStatCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0)}
          icon={IndianRupee}
          variant="info"
          trend={{ value: 8, positive: true }}
        />
        <PremiumStatCard
          title="Received"
          value={formatCurrency(summary?.totalReceived || 0)}
          icon={CheckCircle}
          variant="success"
          trend={{ value: 15, positive: true }}
        />
        <PremiumStatCard
          title="Balance"
          value={formatCurrency(summary?.totalBalance || 0)}
          icon={Wallet}
          variant="warning"
          trend={{ value: 5, positive: false }}
        />
      </div>

      {/* Employee Performance */}
      <div>
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-foreground">Employee Performance</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sortedEmployees.length > 0 ? (
            sortedEmployees.map((emp, index) => (
              <EmployeePerformanceCard
                key={emp.name}
                name={emp.name}
                initials={emp.name.split(" ").map((n) => n[0]).join("")}
                revenue={formatCurrency(emp.revenue)}
                revenueNum={emp.revenue}
                sales={emp.sales}
                balance={formatCurrency(emp.balance)}
                target={550000}
                color={employeeColors[emp.name] || "blue"}
                isTopPerformer={index === 0 && emp.revenue > 0}
                rank={index + 1}
              />
            ))
          ) : (
            activeEmployees.map((emp, index) => (
              <EmployeePerformanceCard
                key={emp.id}
                name={emp.name}
                initials={emp.name.split(" ").map((n) => n[0]).join("")}
                revenue="₹0"
                revenueNum={0}
                sales={0}
                balance="₹0"
                target={550000}
                color={colorPool[index % colorPool.length]}
              />
            ))
          )}
        </div>
      </div>

      {/* Analytics Charts */}
      <div>
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-foreground">Analytics</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
          <SalesChart />
          <PaymentChart />
        </div>
      </div>

      {/* Second Row Charts */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        <CourierChart />
        <ProductCategoryChart />
      </div>

      {/* Sales Table */}
      <SalesTable />
    </div>
  );
};

export default SalesDashboard;
