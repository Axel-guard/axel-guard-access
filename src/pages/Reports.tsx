import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, TrendingUp, Users, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/useSales";

const ReportsPage = () => {
  const { data: summary } = useDashboardSummary();

  const reports = [
    {
      title: "Sales Report",
      description: "Complete sales data with GST breakdown",
      icon: TrendingUp,
      gradient: "bg-[image:var(--gradient-primary)]",
    },
    {
      title: "Employee Performance",
      description: "Employee-wise sales and targets",
      icon: Users,
      gradient: "bg-[image:var(--gradient-info)]",
    },
    {
      title: "Balance Report",
      description: "Pending payments and dues",
      icon: DollarSign,
      gradient: "bg-[image:var(--gradient-warning)]",
    },
    {
      title: "Monthly Summary",
      description: "Month-wise sales summary",
      icon: FileText,
      gradient: "bg-[image:var(--gradient-success)]",
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
          <Card className="group overflow-hidden border-white/20 bg-[image:var(--gradient-primary)] shadow-glass transition-all hover:scale-[1.02]">
            <CardContent className="relative pt-6">
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
              <p className="text-sm text-white/80">Total Sales</p>
              <p className="text-3xl font-bold text-white">{summary.totalSales}</p>
            </CardContent>
          </Card>
          <Card className="group overflow-hidden border-white/20 bg-[image:var(--gradient-info)] shadow-glass transition-all hover:scale-[1.02]">
            <CardContent className="relative pt-6">
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
              <p className="text-sm text-white/80">Revenue</p>
              <p className="text-3xl font-bold text-white">₹{summary.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="group overflow-hidden border-white/20 bg-[image:var(--gradient-success)] shadow-glass transition-all hover:scale-[1.02]">
            <CardContent className="relative pt-6">
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
              <p className="text-sm text-white/80">Received</p>
              <p className="text-3xl font-bold text-white">₹{summary.totalReceived.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="group overflow-hidden border-white/20 bg-[image:var(--gradient-warning)] shadow-glass transition-all hover:scale-[1.02]">
            <CardContent className="relative pt-6">
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
              <p className="text-sm text-white/80">Balance</p>
              <p className="text-3xl font-bold text-white">₹{summary.totalBalance.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.title} className="group border-white/20 bg-card/80 backdrop-blur-xl shadow-glass transition-all hover:shadow-lg">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${report.gradient} text-white shadow-lg transition-transform group-hover:scale-110`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 rounded-xl border-primary/30 hover:bg-primary hover:text-primary-foreground"
              >
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