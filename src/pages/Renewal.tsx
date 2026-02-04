import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Search, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { useRenewals, useRenewalsSummary, useRenewSubscription, getDaysRemaining, getRenewalStatus } from "@/hooks/useRenewals";

const Renewal = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: renewals = [], isLoading } = useRenewals();
  const { data: summary } = useRenewalsSummary();
  const renewMutation = useRenewSubscription();

  const filteredRenewals = renewals.filter((renewal) => {
    const matchesSearch = 
      renewal.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renewal.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renewal.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renewal.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const daysRemaining = getDaysRemaining(renewal.renewal_end_date);
    const status = getRenewalStatus(daysRemaining);
    const matchesStatus = statusFilter === "all" || status.toLowerCase().replace(" ", "-") === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (endDate: string) => {
    const daysRemaining = getDaysRemaining(endDate);
    const status = getRenewalStatus(daysRemaining);
    
    if (status === "Expired") {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>;
    }
    if (status === "Expiring Soon") {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Expiring Soon</Badge>;
    }
    return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
  };

  const getDaysDisplay = (endDate: string) => {
    const days = getDaysRemaining(endDate);
    if (days <= 0) {
      return <span className="text-destructive font-medium">Expired</span>;
    }
    if (days <= 30) {
      return <span className="text-warning font-medium">{days} days</span>;
    }
    return <span className="text-success font-medium">{days} days</span>;
  };

  const handleRenew = (id: string) => {
    renewMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Renewal Management</h1>
          <p className="text-muted-foreground">Track and manage subscription renewals</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Renewals</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{summary?.active || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{summary?.expiringSoon || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary?.expired || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID, Customer, Company, Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className={statusFilter === "active" ? "" : "text-success border-success/50 hover:bg-success/10"}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "expiring-soon" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("expiring-soon")}
                className={statusFilter === "expiring-soon" ? "" : "text-warning border-warning/50 hover:bg-warning/10"}
              >
                Expiring Soon
              </Button>
              <Button
                variant={statusFilter === "expired" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("expired")}
                className={statusFilter === "expired" ? "" : "text-destructive border-destructive/50 hover:bg-destructive/10"}
              >
                Expired
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renewals Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Subscription Renewals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRenewals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p>No renewal records found</p>
              <p className="text-sm mt-1">Renewals will appear when orders with Server/Cloud/SIM charges are dispatched</p>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[1000px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="font-semibold text-foreground">S.NO</TableHead>
                      <TableHead className="font-semibold text-foreground">ORDER ID</TableHead>
                      <TableHead className="font-semibold text-foreground">CUSTOMER</TableHead>
                      <TableHead className="font-semibold text-foreground">COMPANY</TableHead>
                      <TableHead className="font-semibold text-foreground">PRODUCT</TableHead>
                      <TableHead className="font-semibold text-foreground">DISPATCH DATE</TableHead>
                      <TableHead className="font-semibold text-foreground">START DATE</TableHead>
                      <TableHead className="font-semibold text-foreground">END DATE</TableHead>
                      <TableHead className="font-semibold text-foreground text-center">DAYS LEFT</TableHead>
                      <TableHead className="font-semibold text-foreground text-center">STATUS</TableHead>
                      <TableHead className="font-semibold text-foreground text-center">ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRenewals.map((renewal, index) => (
                      <TableRow key={renewal.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-primary">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {renewal.order_id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {renewal.customer_name || "-"}
                        </TableCell>
                        <TableCell className="text-primary">
                          {renewal.company_name || "-"}
                        </TableCell>
                        <TableCell>
                          {renewal.product_name || renewal.product_type}
                        </TableCell>
                        <TableCell>
                          {format(new Date(renewal.dispatch_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(renewal.renewal_start_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(renewal.renewal_end_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-center">
                          {getDaysDisplay(renewal.renewal_end_date)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(renewal.renewal_end_date)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-primary border-primary hover:bg-primary hover:text-white"
                            onClick={() => handleRenew(renewal.id)}
                            disabled={renewMutation.isPending}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Renew
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Renewal;
