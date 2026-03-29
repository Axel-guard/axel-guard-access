import { useState } from "react";
import { useFollowUps, useUpdateFollowUpStatus } from "@/hooks/useFollowUps";
import { LogCallDialog } from "@/components/crm/LogCallDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  PhoneCall,
  Building,
  User,
  Search,
} from "lucide-react";
import { format } from "date-fns";

const PIPELINE_STAGES = ["all", "Suspect", "Prospect", "Approach", "Negotiate", "Order Done"];

const stageColor = (stage: string) => {
  switch (stage) {
    case "Suspect":   return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
    case "Prospect":  return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400";
    case "Approach":  return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Negotiate": return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400";
    case "Order Done":return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:          return "bg-muted text-muted-foreground";
  }
};

const callStatusColor = (status: string) => {
  switch (status) {
    case "Connected":     return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "Not Connected": return "bg-red-100 text-red-700 border-red-300";
    case "Switched Off":  return "bg-slate-100 text-slate-600 border-slate-300";
    case "Busy":          return "bg-amber-100 text-amber-700 border-amber-300";
    default:              return "bg-muted text-muted-foreground";
  }
};

interface FollowUpRowProps {
  followup: any;
  onLogCall: (f: any) => void;
  onComplete: (id: string) => void;
}

const FollowUpRow = ({ followup: f, onLogCall, onComplete }: FollowUpRowProps) => (
  <TableRow className="hover:bg-muted/50">
    <TableCell>
      <div>
        <p className="font-medium text-sm">{f.customer_name || "—"}</p>
        {f.company_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building className="h-3 w-3" />{f.company_name}</p>}
      </div>
    </TableCell>
    <TableCell>
      {f.mobile_number ? (
        <span className="flex items-center gap-1 text-sm font-mono">{f.mobile_number}</span>
      ) : "—"}
    </TableCell>
    <TableCell>
      {f.pipeline_stage ? (
        <Badge variant="outline" className={`text-xs ${stageColor(f.pipeline_stage)}`}>
          {f.pipeline_stage}
        </Badge>
      ) : "—"}
    </TableCell>
    <TableCell>
      {f.last_call_status ? (
        <Badge variant="outline" className={`text-xs ${callStatusColor(f.last_call_status)}`}>
          {f.last_call_status}
        </Badge>
      ) : <span className="text-xs text-muted-foreground">—</span>}
    </TableCell>
    <TableCell>
      <div className="text-sm">
        <span className="font-medium">{format(new Date(f.scheduled_date), "dd MMM yyyy")}</span>
        {f.scheduled_time && (
          <span className="text-xs text-muted-foreground ml-1">
            {f.scheduled_time.slice(0, 5)}
          </span>
        )}
      </div>
    </TableCell>
    <TableCell>
      <span className="text-sm text-muted-foreground">{f.assigned_to || "—"}</span>
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="gap-1 h-7 text-xs"
          onClick={() => onLogCall(f)}
        >
          <PhoneCall className="h-3 w-3" />
          Call
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-emerald-600"
          onClick={() => onComplete(f.id)}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Done
        </Button>
      </div>
    </TableCell>
  </TableRow>
);

const FollowUpsPage = () => {
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [logCallTarget, setLogCallTarget] = useState<any>(null);

  const { data, isLoading, isError } = useFollowUps({ stage: stageFilter !== "all" ? stageFilter : undefined });
  const updateStatus = useUpdateFollowUpStatus();

  const filterBySearch = (items: any[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(f =>
      f.customer_name?.toLowerCase().includes(q) ||
      f.company_name?.toLowerCase().includes(q) ||
      f.mobile_number?.includes(q)
    );
  };

  const todayItems = filterBySearch(data?.todayFollowUps || []);
  const upcomingItems = filterBySearch(data?.upcomingFollowUps || []);
  const missedItems = filterBySearch(data?.missedFollowUps || []);

  // Treat error same as empty — table likely not set up yet
  const showLoading = isLoading && !isError;

  const handleComplete = (id: string) => updateStatus.mutate({ id, status: "Completed" });

  const tableHead = (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Lead / Customer</TableHead>
        <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Mobile</TableHead>
        <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Stage</TableHead>
        <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Last Call</TableHead>
        <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Follow-up</TableHead>
        <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Assigned To</TableHead>
        <TableHead className="w-28" />
      </TableRow>
    </TableHeader>
  );

  const emptyState = (icon: React.ReactNode, msg: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      {icon}
      <p className="mt-3 font-medium">{msg}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Follow-ups</h1>
          <p className="text-muted-foreground">Track and manage all scheduled follow-ups</p>
        </div>
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-400">
            <Calendar className="h-3.5 w-3.5" />
            Today: {showLoading ? "—" : todayItems.length}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Upcoming: {showLoading ? "—" : upcomingItems.length}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-sm font-medium text-red-700 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Missed: {showLoading ? "—" : missedItems.length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, company, mobile..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All Stages" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="today" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-4 w-4" />
            Today {!showLoading && todayItems.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs font-bold">{todayItems.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="h-4 w-4" />
            Upcoming {!showLoading && upcomingItems.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs font-bold">{upcomingItems.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="missed" className="gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
            <AlertTriangle className="h-4 w-4" />
            Missed {!showLoading && missedItems.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive/20 px-1.5 text-xs font-bold">{missedItems.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TODAY */}
        <TabsContent value="today" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Today's Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {showLoading ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : todayItems.length === 0 ? (
                emptyState(<Calendar className="h-10 w-10 opacity-20" />, "No follow-ups scheduled for today")
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    {tableHead}
                    <TableBody>
                      {todayItems.map(f => (
                        <FollowUpRow key={f.id} followup={f} onLogCall={setLogCallTarget} onComplete={handleComplete} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* UPCOMING */}
        <TabsContent value="upcoming" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Upcoming Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {showLoading ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : upcomingItems.length === 0 ? (
                emptyState(<Clock className="h-10 w-10 opacity-20" />, "No upcoming follow-ups")
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    {tableHead}
                    <TableBody>
                      {upcomingItems.map(f => (
                        <FollowUpRow key={f.id} followup={f} onLogCall={setLogCallTarget} onComplete={handleComplete} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MISSED */}
        <TabsContent value="missed" className="mt-4">
          <Card className="border-border/50 border-red-200 dark:border-red-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Missed Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {showLoading ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : missedItems.length === 0 ? (
                emptyState(<CheckCircle className="h-10 w-10 opacity-20 text-emerald-500" />, "No missed follow-ups — great job!")
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    {tableHead}
                    <TableBody>
                      {missedItems.map(f => (
                        <FollowUpRow key={f.id} followup={f} onLogCall={setLogCallTarget} onComplete={handleComplete} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log call dialog triggered from table */}
      {logCallTarget && (
        <LogCallDialog
          open={!!logCallTarget}
          onOpenChange={(o) => { if (!o) setLogCallTarget(null); }}
          leadId={logCallTarget.lead_id}
          customerCode={logCallTarget.customer_code}
          leadName={logCallTarget.customer_name}
          currentStage={logCallTarget.pipeline_stage}
        />
      )}
    </div>
  );
};

export default FollowUpsPage;
