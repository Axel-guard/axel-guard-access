import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, TrendingUp, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/useSales";

const ReportsPage = () => {
  const { data: summary } = useDashboardSummary();

  const reports = [
    {
      title: "Sales Report",
      description: "Complete sales data with GST breakdown",
      icon: TrendingUp,
    },
    {
      title: "Employee Performance",
      description: "Employee-wise sales and targets",
      icon: Users,
    },
    {
      title: "Balance Report",
      description: "Pending payments and dues",
      icon: DollarSign,
    },
    {
      title: "Monthly Summary",
      description: "Month-wise sales summary",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Generate and download reports</p>
      </div>

      {/* Quick Stats */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-[image:var(--gradient-primary)] text-primary-foreground">
            <CardContent className="pt-6">
              <p className="text-sm opacity-80">Total Sales</p>
              <p className="text-2xl font-bold">{summary.totalSales}</p>
            </CardContent>
          </Card>
          <Card className="bg-[image:var(--gradient-info)] text-primary-foreground">
            <CardContent className="pt-6">
              <p className="text-sm opacity-80">Revenue</p>
              <p className="text-2xl font-bold">₹{summary.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-[image:var(--gradient-success)] text-primary-foreground">
            <CardContent className="pt-6">
              <p className="text-sm opacity-80">Received</p>
              <p className="text-2xl font-bold">₹{summary.totalReceived.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-[image:var(--gradient-warning)] text-primary-foreground">
            <CardContent className="pt-6">
              <p className="text-sm opacity-80">Balance</p>
              <p className="text-2xl font-bold">₹{summary.totalBalance.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.title} className="shadow-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <report.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
