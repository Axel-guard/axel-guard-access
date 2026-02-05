import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSalesReport, ClientSalesReport } from "@/hooks/useSalesReport";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  TrendingUp,
  RefreshCw,
  Download,
  Search,
  Phone,
  Mail,
  MessageCircle,
  Users,
  IndianRupee,
  ShoppingCart,
  Calendar,
  Crown,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

type DateFilter = "this-month" | "last-3-months" | "this-year" | "all";

export const SalesReportSection = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useSalesReport({
    dateFilter,
    searchQuery,
  });

  const handleExport = () => {
    if (!data) return;

    const exportData = data.clientReports.map((client) => ({
      Rank: client.rank,
      "Customer Name": client.customerName,
      "Company Name": client.companyName || "-",
      "Customer Code": client.customerCode,
      "Total Orders": client.totalOrders,
      "Total Purchase (₹)": client.totalPurchaseValue,
      "Last Order Date": client.lastOrderDate
        ? format(new Date(client.lastOrderDate), "dd MMM yyyy")
        : "-",
      "Contact Number": client.contactNumber || "-",
      Email: client.email || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

    const fileName = `Sales_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, clientReports, highlights } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Sales Report & Client Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Top clients by purchase value and order frequency
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Download Excel
        </Button>
      </div>

      {/* Top Client Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Client Card */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <Crown className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/90">
                🥇 Top Client
              </span>
            </div>
            <p className="text-lg font-bold truncate">
              {highlights.topClient?.name || "N/A"}
            </p>
            <p className="text-2xl font-bold mt-1">
              {highlights.topClient
                ? formatCurrency(highlights.topClient.value)
                : "₹0"}
            </p>
          </CardContent>
        </Card>

        {/* Highest Revenue Client */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <TrendingUp className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <IndianRupee className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/90">
                💰 Highest Revenue
              </span>
            </div>
            <p className="text-lg font-bold truncate">
              {highlights.highestRevenue?.name || "N/A"}
            </p>
            <p className="text-2xl font-bold mt-1">
              {highlights.highestRevenue
                ? formatCurrency(highlights.highestRevenue.value)
                : "₹0"}
            </p>
          </CardContent>
        </Card>

        {/* Most Repeat Orders */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600 text-white shadow-lg">
          <div className="absolute top-2 right-2">
            <Award className="h-8 w-8 text-white/30" />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <RefreshCw className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/90">
                🔁 Most Repeat Orders
              </span>
            </div>
            <p className="text-lg font-bold truncate">
              {highlights.mostRepeatOrders?.name || "N/A"}
            </p>
            <p className="text-2xl font-bold mt-1">
              {highlights.mostRepeatOrders?.orderCount || 0} Orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Clients</p>
                <p className="text-xl font-bold">{summary.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <ShoppingCart className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold">{summary.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
                <p className="text-xl font-bold">
                  {formatCurrency(summary.averageOrderValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={dateFilter}
          onValueChange={(val) => setDateFilter(val as DateFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-3-months">Last 3 Months</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Client Sales Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-xs font-semibold uppercase text-muted-foreground">
                    Rank
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Customer Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Company
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Code
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">
                    Orders
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                    Total Value
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Last Order
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">
                    Contact
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        No clients found for the selected filters
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  clientReports.map((client) => (
                    <ClientTableRow
                      key={client.customerCode}
                      client={client}
                      formatCurrency={formatCurrency}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Client Table Row Component
interface ClientTableRowProps {
  client: ClientSalesReport;
  formatCurrency: (amount: number) => string;
}

const ClientTableRow = ({ client, formatCurrency }: ClientTableRowProps) => {
  const isTopThree = client.rank <= 3;

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow">
          🥇 1
        </Badge>
      );
    }
    if (rank === 2) {
      return (
        <Badge className="bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 border-0 shadow">
          🥈 2
        </Badge>
      );
    }
    if (rank === 3) {
      return (
        <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white border-0 shadow">
          🥉 3
        </Badge>
      );
    }
    return <span className="text-muted-foreground font-medium">{rank}</span>;
  };

  const handleWhatsApp = () => {
    if (client.contactNumber) {
      const phone = client.contactNumber.replace(/\D/g, "");
      window.open(`https://wa.me/91${phone}`, "_blank");
    }
  };

  const handleCall = () => {
    if (client.contactNumber) {
      window.open(`tel:${client.contactNumber}`, "_blank");
    }
  };

  const handleEmail = () => {
    if (client.email) {
      window.open(`mailto:${client.email}`, "_blank");
    }
  };

  return (
    <TableRow
      className={cn(
        "transition-colors hover:bg-muted/50",
        isTopThree && "bg-emerald-50/50 dark:bg-emerald-950/20"
      )}
    >
      <TableCell className="font-medium">{getRankBadge(client.rank)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {client.rank === 1 && <Crown className="h-4 w-4 text-amber-500" />}
          <span className="font-medium">{client.customerName}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client.companyName || "-"}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {client.customerCode}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className="rounded bg-violet-100 px-2.5 py-1 font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
          {client.totalOrders}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span
          className={cn(
            "font-bold",
            isTopThree ? "text-emerald-600 dark:text-emerald-400" : ""
          )}
        >
          {formatCurrency(client.totalPurchaseValue)}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client.lastOrderDate
          ? format(new Date(client.lastOrderDate), "dd MMM yyyy")
          : "-"}
      </TableCell>
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!client.contactNumber && !client.email}
            >
              <Phone className="h-3.5 w-3.5" />
              Contact
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="end">
            <div className="space-y-2">
              <p className="text-sm font-medium">{client.customerName}</p>
              <div className="space-y-1.5">
                {client.contactNumber && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{client.contactNumber}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                {client.contactNumber && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={handleCall}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1 bg-green-500 hover:bg-green-600"
                      onClick={handleWhatsApp}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                  </>
                )}
                {client.email && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 gap-1"
                    onClick={handleEmail}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
    </TableRow>
  );
};
