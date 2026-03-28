import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTasks, Task } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays } from "date-fns";
import {
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  CalendarClock,
  Flag,
  ShieldCheck,
  Building,
  Ticket,
} from "lucide-react";

const statusColors: Record<string, string> = {
  WIP: "bg-info/10 text-info border-info/30",
  "Pending Master Approval": "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400",
  Closed: "bg-success/10 text-success border-success/30",
};

const priorityColors: Record<string, string> = {
  Low: "text-emerald-600",
  Normal: "text-blue-600",
  High: "text-orange-600",
  Urgent: "text-red-600",
};

function getTicketAgeDays(createdAt: string): number {
  return differenceInDays(new Date(), new Date(createdAt));
}

function getAgeColor(days: number): string {
  if (days <= 2) return "text-emerald-600";
  if (days <= 5) return "text-orange-600";
  return "text-red-600";
}

function getAgeBarColor(days: number): string {
  if (days <= 2) return "bg-emerald-500";
  if (days <= 5) return "bg-orange-500";
  return "bg-red-500";
}

const Tasks = () => {
  const { user, isAdmin, isMasterAdmin } = useAuth();
  const location = useLocation();
  const { data: tasks = [], isLoading } = useTasks();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");

  // Auto-open task from pendency navigation
  useEffect(() => {
    const openTaskId = (location.state as any)?.openTaskId;
    if (openTaskId && tasks.length > 0 && !selectedTask) {
      const task = tasks.find(t => t.id === openTaskId);
      if (task) setSelectedTask(task);
    }
  }, [location.state, tasks]);
  const [tab, setTab] = useState("wip");
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [employeeRoles, setEmployeeRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: employees } = await supabase
        .from("employees")
        .select("name, email, user_id, employee_role")
        .eq("is_active", true);

      if (!employees) return;

      const emailMap: Record<string, string> = {};
      const nameMap: Record<string, string> = {};
      const roleMap: Record<string, string> = {};

      for (const emp of employees) {
        if (!emp.user_id) continue;
        emailMap[emp.user_id] = emp.email || "";
        nameMap[emp.user_id] = emp.name;
        roleMap[emp.user_id] = emp.employee_role || "User";
      }

      setUserEmails(emailMap);
      setUserNames(nameMap);
      setEmployeeRoles(roleMap);
    };
    fetchUsers();
  }, []);

  // Sort: urgent/high priority first, then by age (newest first for same priority)
  const sortTickets = (tickets: Task[]) => {
    const priorityOrder: Record<string, number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
    return [...tickets].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const filtered = useMemo(() => {
    let result = tasks;

    if (tab === "wip") {
      result = result.filter((t) => t.status === "WIP" || t.status === "Pending Master Approval");
    } else if (tab === "assigned-by-me") {
      result = result.filter((t) => t.created_by === user?.id && t.status !== "Closed");
    } else if (tab === "assigned-to-me") {
      result = result.filter((t) => t.assigned_to === user?.id && t.status !== "Closed");
    } else if (tab === "pending-approval") {
      result = result.filter((t) => t.status === "Pending Master Approval");
    } else if (tab === "closed") {
      result = result.filter((t) => t.status === "Closed");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.customer_code?.toLowerCase().includes(q) ||
          t.customer_name?.toLowerCase().includes(q) ||
          t.company_name?.toLowerCase().includes(q)
      );
    }

    return sortTickets(result);
  }, [tasks, tab, search, user]);

  const counts = useMemo(() => {
    const wip = tasks.filter((t) => t.status === "WIP" || t.status === "Pending Master Approval");
    const assignedByMe = tasks.filter((t) => t.created_by === user?.id && t.status !== "Closed");
    const assignedToMe = tasks.filter((t) => t.assigned_to === user?.id && t.status !== "Closed");
    const pendingApproval = tasks.filter((t) => t.status === "Pending Master Approval");
    const closed = tasks.filter((t) => t.status === "Closed");
    return {
      wip: wip.length,
      assignedByMe: assignedByMe.length,
      assignedToMe: assignedToMe.length,
      pendingApproval: pendingApproval.length,
      closed: closed.length,
      all: tasks.length,
    };
  }, [tasks, user]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const getDisplayName = (userId: string) => userNames[userId] || userEmails[userId] || "Unknown";
  const getDisplayRole = (userId: string) => employeeRoles[userId] || "";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Ticket Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage and track support tickets
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("wip")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.wip}</p>
              <p className="text-xs text-muted-foreground">WIP Tickets</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("assigned-to-me")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.assignedToMe}</p>
              <p className="text-xs text-muted-foreground">Assigned to Me</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("assigned-by-me")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.assignedByMe}</p>
              <p className="text-xs text-muted-foreground">Assigned by Me</p>
            </div>
          </CardContent>
        </Card>
        {isMasterAdmin && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-purple-200 dark:border-purple-800" onClick={() => setTab("pending-approval")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pendingApproval}</p>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("closed")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.closed}</p>
              <p className="text-xs text-muted-foreground">Closed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="wip">WIP</TabsTrigger>
            <TabsTrigger value="assigned-by-me">Assigned by Me</TabsTrigger>
            <TabsTrigger value="assigned-to-me">Assigned to Me</TabsTrigger>
            {isMasterAdmin && (
              <TabsTrigger value="pending-approval" className="gap-1">
                Pending Approval
                {counts.pendingApproval > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {counts.pendingApproval}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="closed">Closed</TabsTrigger>
            {isAdmin && <TabsTrigger value="all">All Tickets</TabsTrigger>}
          </TabsList>

          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {["wip", "assigned-by-me", "assigned-to-me", "pending-approval", "closed", "all"].map(
          (tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-4">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Ticket className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No tickets found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((ticket) => {
                    const age = getTicketAgeDays(ticket.created_at);
                    const ageBarColor = getAgeBarColor(age);
                    const heading = ticket.company_name || ticket.customer_name || "Internal Ticket";
                    const assigneeName = getDisplayName(ticket.assigned_to);
                    const assigneeRole = getDisplayRole(ticket.assigned_to);

                    return (
                      <div
                        key={ticket.id}
                        className="flex cursor-pointer rounded-lg border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all overflow-hidden"
                        onClick={() => setSelectedTask(ticket)}
                      >
                        {/* Age color bar */}
                        <div className={`w-1.5 ${ageBarColor} shrink-0`} />

                        <div className="flex-1 flex items-center gap-4 p-3 sm:p-4 min-w-0">
                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              {ticket.ticket_number && (
                                <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                  #{ticket.ticket_number}
                                </span>
                              )}
                              {ticket.company_name && (
                                <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                                {heading}
                              </h3>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {ticket.title}
                            </p>
                            {ticket.customer_code && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5">
                                {ticket.customer_code}
                                {ticket.customer_name && ticket.company_name ? ` – ${ticket.customer_name}` : ""}
                              </p>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="hidden sm:flex items-center gap-3 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusColors[ticket.status] || ""}`}
                            >
                              {ticket.status === "Pending Master Approval" ? "Pending Approval" : ticket.status}
                            </Badge>
                            <span className={`text-xs font-medium ${priorityColors[ticket.priority] || ""}`}>
                              <Flag className="h-3 w-3 inline mr-0.5" />
                              {ticket.priority}
                            </span>
                          </div>

                          {/* Assignee & Age */}
                          <div className="hidden md:flex flex-col items-end gap-1 shrink-0 text-right min-w-[120px]">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{assigneeName}</span>
                            </div>
                            <span className={`text-xs font-semibold ${getAgeColor(age)}`}>
                              {age === 0 ? "Today" : `${age}d old`}
                            </span>
                          </div>

                          {/* Mobile: compact badges */}
                          <div className="flex sm:hidden flex-col items-end gap-1 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${statusColors[ticket.status] || ""}`}
                            >
                              {ticket.status === "Pending Master Approval" ? "PA" : ticket.status}
                            </Badge>
                            <span className={`text-[10px] font-semibold ${getAgeColor(age)}`}>
                              {age === 0 ? "Today" : `${age}d`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )
        )}
      </Tabs>

      <AddTaskDialog open={addOpen} onOpenChange={setAddOpen} />
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        userEmails={userEmails}
        userNames={userNames}
        employeeRoles={employeeRoles}
      />
    </div>
  );
};

export default Tasks;
