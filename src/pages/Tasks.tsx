import { useState, useMemo, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";

const statusColors: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/30",
  "In Progress": "bg-info/10 text-info border-info/30",
  "Waiting for Customer": "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400",
  Completed: "bg-success/10 text-success border-success/30",
  Closed: "bg-muted text-muted-foreground border-muted",
};

const priorityColors: Record<string, string> = {
  Low: "text-emerald-600",
  Normal: "text-blue-600",
  High: "text-orange-600",
  Urgent: "text-red-600",
};

function getTaskAgeDays(createdAt: string): number {
  return differenceInDays(new Date(), new Date(createdAt));
}

function getAgeBarColor(days: number): string {
  if (days <= 2) return "bg-emerald-500";
  if (days <= 5) return "bg-orange-500";
  return "bg-red-500";
}

const Tasks = () => {
  const { user, isAdmin } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState("my-tasks");
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  // Fetch user emails and names for display
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: allowedEmails } = await supabase
        .from("allowed_emails")
        .select("email, role");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const { data: employees } = await supabase
        .from("employees")
        .select("name, email");

      if (!allowedEmails || !roles) return;

      const emailMap: Record<string, string> = {};
      const nameMap: Record<string, string> = {};

      for (const r of roles) {
        const match = allowedEmails.find((d) => d.role === r.role);
        if (match) {
          emailMap[r.user_id] = match.email;
          // Find employee name by email
          const emp = employees?.find(
            (e) => e.email?.toLowerCase() === match.email.toLowerCase()
          );
          nameMap[r.user_id] = emp?.name || match.email.split("@")[0];
        }
      }
      setUserEmails(emailMap);
      setUserNames(nameMap);
    };
    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    let result = tasks;

    if (tab === "my-tasks") {
      result = result.filter((t) => t.assigned_to === user?.id);
    } else if (tab === "assigned-by-me") {
      result = result.filter((t) => t.created_by === user?.id);
    } else if (tab === "overdue") {
      // Tasks older than 5 days that are not completed/closed
      result = result.filter(
        (t) => !["Completed", "Closed"].includes(t.status) && getTaskAgeDays(t.created_at) > 5
      );
    } else if (tab === "completed") {
      result = result.filter((t) => t.status === "Completed" || t.status === "Closed");
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.customer_code?.toLowerCase().includes(q) ||
          t.customer_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, tab, statusFilter, search, user]);

  const counts = useMemo(() => {
    const myTasks = tasks.filter((t) => t.assigned_to === user?.id);
    const assignedByMe = tasks.filter((t) => t.created_by === user?.id);
    const overdue = tasks.filter(
      (t) => !["Completed", "Closed"].includes(t.status) && getTaskAgeDays(t.created_at) > 5
    );
    const completed = tasks.filter((t) => t.status === "Completed" || t.status === "Closed");
    return {
      myTasks: myTasks.length,
      assignedByMe: assignedByMe.length,
      overdue: overdue.length,
      completed: completed.length,
      all: tasks.length,
    };
  }, [tasks, user]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Task Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage and track team tasks
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("my-tasks")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.myTasks}</p>
              <p className="text-xs text-muted-foreground">My Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("overdue")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue (5+ Days)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("assigned-by-me")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.assignedByMe}</p>
              <p className="text-xs text-muted-foreground">Assigned by Me</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("completed")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="assigned-by-me">Assigned by Me</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            {isAdmin && <TabsTrigger value="all">All Tasks</TabsTrigger>}
          </TabsList>

          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Waiting for Customer">Waiting</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {["my-tasks", "assigned-by-me", "overdue", "completed", "all"].map(
          (tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-4">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No tasks found</p>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((task) => {
                    const taskAge = getTaskAgeDays(task.created_at);
                    const ageBarColor = getAgeBarColor(taskAge);
                    return (
                      <Card
                        key={task.id}
                        className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 overflow-hidden"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex">
                          {/* Age color bar */}
                          <div className={`w-1.5 ${ageBarColor} shrink-0`} />
                          <CardContent className="p-4 space-y-3 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-sm line-clamp-2">
                                {task.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`shrink-0 text-xs ${statusColors[task.status] || ""}`}
                              >
                                {task.status}
                              </Badge>
                            </div>

                            {/* Priority & Age */}
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${priorityColors[task.priority] || ""}`}>
                                <Flag className="h-3 w-3 inline mr-0.5" />
                                {task.priority}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {taskAge === 0 ? "Today" : `${taskAge}d old`}
                              </span>
                              {task.task_type === "Customer" && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">👤 Customer</span>
                                </>
                              )}
                            </div>

                            {task.customer_code && (
                              <p className="text-xs text-muted-foreground">
                                {task.customer_code}
                                {task.customer_name ? ` – ${task.customer_name}` : ""}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-[140px]">
                                  {userNames[task.assigned_to] || userEmails[task.assigned_to] || "Unknown"}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
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
      />
    </div>
  );
};

export default Tasks;
