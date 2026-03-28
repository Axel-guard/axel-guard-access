import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useCustomerTickets, useCreateTicket, useUpdateTicket, UnifiedTicket,
} from "@/hooks/useCustomerDetails";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Ticket, Plus, AlertCircle, Clock, CheckCircle, Search,
  Activity, LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerTicketsTabProps {
  customerCode: string;
  mobileNumber?: string;
}

const ISSUE_TYPES = [
  "Hardware Issue", "Software Issue", "Billing Query", "Delivery Issue",
  "Return Request", "Warranty Claim", "General Inquiry", "Other",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const statusBadge = (status: string) => {
  if (status === "Open")
    return <Badge className="bg-blue-100 text-blue-700 border-0 gap-1 text-xs"><Clock className="h-3 w-3" />Open</Badge>;
  if (status === "In Progress")
    return <Badge className="bg-amber-100 text-amber-700 border-0 gap-1 text-xs"><AlertCircle className="h-3 w-3" />In Progress</Badge>;
  if (status === "Closed" || status === "Completed" || status === "Done")
    return <Badge className="bg-green-100 text-green-700 border-0 gap-1 text-xs"><CheckCircle className="h-3 w-3" />{status}</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
};

const priorityBadge = (priority: string) => {
  const map: Record<string, string> = {
    Low: "bg-gray-100 text-gray-700",
    Medium: "bg-blue-100 text-blue-700",
    High: "bg-orange-100 text-orange-700",
    Urgent: "bg-red-100 text-red-700",
  };
  return <Badge className={`${map[priority] ?? map.Medium} border-0 text-xs`}>{priority}</Badge>;
};

const sourceBadge = (source: UnifiedTicket["source"]) =>
  source === "task"
    ? <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px] px-1.5">Task Module</Badge>
    : <Badge className="bg-cyan-100 text-cyan-700 border-0 text-[10px] px-1.5">CRM Ticket</Badge>;

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
};

export const CustomerTicketsTab = ({ customerCode, mobileNumber }: CustomerTicketsTabProps) => {
  const { isAdmin } = useAuth();
  const { data: tickets, isLoading } = useCustomerTickets(customerCode, mobileNumber);
  const { data: employees } = useEmployees();
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newTicket, setNewTicket] = useState({
    issue_type: "", description: "", priority: "Medium", assigned_to: "",
  });

  // Summary counts
  const summary = useMemo(() => {
    if (!tickets) return { total: 0, open: 0, inProgress: 0, closed: 0 };
    return tickets.reduce(
      (acc, t) => {
        acc.total++;
        const s = t.status?.toLowerCase();
        if (s === "open") acc.open++;
        else if (s === "in progress") acc.inProgress++;
        else if (["closed", "completed", "done"].includes(s)) acc.closed++;
        return acc;
      },
      { total: 0, open: 0, inProgress: 0, closed: 0 }
    );
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!search) return tickets;
    const q = search.toLowerCase();
    return tickets.filter(
      (t) =>
        t.ref_no?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q) ||
        t.assigned_to?.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const handleCreate = async () => {
    if (!newTicket.issue_type) return;
    await createTicket.mutateAsync({ customer_code: customerCode, ...newTicket });
    setCreateOpen(false);
    setNewTicket({ issue_type: "", description: "", priority: "Medium", assigned_to: "" });
  };

  const handleStatusChange = async (t: UnifiedTicket, status: string) => {
    if (t.source === "ticket") {
      await updateTicket.mutateAsync({ id: t.id, updates: { status } });
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Tickets", value: summary.total, color: "text-foreground", bg: "bg-muted/50" },
          { label: "Open", value: summary.open, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "In Progress", value: summary.inProgress, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Closed", value: summary.closed, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl p-4 border border-border/50", s.bg)}>
            <p className={cn("text-2xl font-extrabold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ticket list card */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-muted-foreground" />
            Support Tickets &amp; Tasks
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search tickets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm rounded-lg"
              />
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> Create Ticket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Issue Type *</Label>
                    <Select
                      value={newTicket.issue_type}
                      onValueChange={(v) => setNewTicket((p) => ({ ...p, issue_type: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
                      <SelectContent>
                        {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the issue…"
                      value={newTicket.description}
                      onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={newTicket.priority}
                        onValueChange={(v) => setNewTicket((p) => ({ ...p, priority: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select
                        value={newTicket.assigned_to}
                        onValueChange={(v) => setNewTicket((p) => ({ ...p, assigned_to: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>
                          {employees?.map((emp) => (
                            <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newTicket.issue_type || createTicket.isPending}
                  >
                    Create Ticket
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Ticket className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-foreground mb-1">
                {search ? "No matching tickets" : "No Tickets Yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search
                  ? "Try a different search term."
                  : "No support tickets or tasks found for this customer."}
              </p>
              {!search && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create First Ticket
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Ref No.</TableHead>
                    <TableHead className="font-semibold">Issue / Title</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Description</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Priority</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Assigned To</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Created</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Last Updated</TableHead>
                    <TableHead className="font-semibold hidden xl:table-cell">Closed</TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                    {isAdmin && <TableHead className="font-semibold">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((t) => (
                    <TableRow key={`${t.source}-${t.id}`} className="group">
                      <TableCell className="font-mono font-semibold text-primary text-xs">{t.ref_no}</TableCell>
                      <TableCell className="font-medium max-w-[160px] truncate">{t.title}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                        {t.description || "—"}
                      </TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{priorityBadge(t.priority)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {t.assigned_to || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                        {fmtDate(t.created_at)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {fmtDate(t.updated_at)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground text-xs">
                        {fmtDate(t.closed_at)}
                      </TableCell>
                      <TableCell>{sourceBadge(t.source)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          {t.source === "ticket" ? (
                            <Select
                              value={t.status}
                              onValueChange={(v) => handleStatusChange(t, v)}
                            >
                              <SelectTrigger className="w-28 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">Via Tasks</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
