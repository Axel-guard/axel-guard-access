import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useLeadsEnriched, EnrichedLead } from "@/hooks/useLeadsEnriched";
import { useUpdateLead, useBulkUpdateLeads } from "@/hooks/useLeads";
import { useEmployees } from "@/hooks/useEmployees";
import { LeadsUploadDialog } from "@/components/leads/LeadsUploadDialog";
import { LeadDetailsDialog } from "@/components/leads/LeadDetailsDialog";
import { EditLeadDialog } from "@/components/leads/EditLeadDialog";
import { DeleteLeadDialog } from "@/components/leads/DeleteLeadDialog";
import { CallHistoryDialog } from "@/components/leads/CallHistoryDialog";
import { LogCallDialog } from "@/components/crm/LogCallDialog";
import { format } from "date-fns";
import {
  Phone, MoreVertical, Eye, Edit, Trash2, Search,
  ArrowUp, ArrowDown, Filter, History, ShoppingCart,
  UserCheck, AlertCircle, Clock, Calendar, X,
  SlidersHorizontal, Users, ChevronDown, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Constants ─────────────────────────────────────────────── */
const PIPELINE_STAGES = ["All", "Suspect", "Prospect", "Approach", "Negotiate", "Order Done", "Order Lost"];
const FOLLOWUP_FILTERS = ["All", "Today", "Upcoming", "Missed", "None"] as const;
const DISPOSITIONS = ["All", "Interested", "Not Interested", "Call Back Later", "Wrong Number", "Converted"];

/* ─── Helpers ────────────────────────────────────────────────── */
const today = format(new Date(), "yyyy-MM-dd");

const stageColor = (stage: string) => {
  switch (stage) {
    case "Suspect":    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
    case "Prospect":   return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
    case "Approach":   return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Negotiate":  return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400";
    case "Order Done": return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "Order Lost": return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400";
    default:           return "bg-muted text-muted-foreground";
  }
};

const callStatusColor = (s: string) => {
  switch (s) {
    case "Connected":     return "bg-emerald-100 text-emerald-700";
    case "Not Connected": return "bg-red-100 text-red-700";
    case "Busy":          return "bg-amber-100 text-amber-700";
    case "Switched Off":  return "bg-slate-100 text-slate-500";
    default:              return "bg-muted text-muted-foreground";
  }
};

const formatCurrency = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString()}`;
};

/* ─── Next TBRO cell ─────────────────────────────────────────── */
const NextTbro = ({ followup }: { followup: EnrichedLead["next_followup"] }) => {
  if (!followup) return <span className="text-xs text-muted-foreground">—</span>;
  const { date, time } = followup;
  const isOverdue = date < today;
  const isToday   = date === today;
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium",
      isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-foreground"
    )}>
      {isOverdue ? <AlertCircle className="h-3 w-3 shrink-0" />
        : isToday ? <Clock className="h-3 w-3 shrink-0" />
        : <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />}
      <span>
        {isOverdue ? "Overdue · " : isToday ? "Today · " : ""}
        {format(new Date(date), "dd MMM")}
        {time && <span className="text-muted-foreground ml-1">{time.slice(0, 5)}</span>}
      </span>
    </div>
  );
};

/* ─── Inline Stage Select ────────────────────────────────────── */
const InlineStageSelect = ({
  leadId, stage, onUpdate,
}: {
  leadId: string; stage: string; onUpdate: (id: string, stage: string) => void;
}) => (
  <Select value={stage} onValueChange={(v) => onUpdate(leadId, v)}>
    <SelectTrigger className={cn("h-7 w-28 border text-xs font-medium rounded-lg px-2", stageColor(stage))}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {PIPELINE_STAGES.slice(1).map((s) => (
        <SelectItem key={s} value={s} className="text-xs">
          <span className={cn("rounded px-2 py-0.5", stageColor(s))}>{s}</span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/* ─── Single-lead Reassign Dialog ───────────────────────────── */
interface ReassignDialogProps {
  lead: EnrichedLead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: { id: string; name: string }[];
  onSave: (id: string, name: string) => Promise<void>;
  isPending: boolean;
}
const ReassignDialog = ({ lead, open, onOpenChange, employees, onSave, isPending }: ReassignDialogProps) => {
  const [selected, setSelected] = useState(lead?.assigned_to || "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Reassign Lead</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <Label className="text-xs text-muted-foreground">Assign to Employee</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select employee…" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" disabled={!selected || isPending}
              onClick={() => { if (lead?.id && selected) onSave(lead.id, selected); }}>
              {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              Reassign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Set Follow-up Dialog (bulk or single) ─────────────────── */
interface SetFollowupDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  onSave: (date: string, time: string) => Promise<void>;
  isPending: boolean;
}
const SetFollowupDialog = ({ open, onOpenChange, label, onSave, isPending }: SetFollowupDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm p-0 overflow-hidden">
      <DialogHeader className="px-4 pt-4 pb-0">
        <DialogTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-primary" />
          Set Follow-up — {label}
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-primary" />}
        </DialogTitle>
      </DialogHeader>
      <DateTimePicker
        disablePast
        onCancel={() => onOpenChange(false)}
        onSet={(date, time) => onSave(date, time)}
      />
    </DialogContent>
  </Dialog>
);

/* ─── Floating Bulk Action Bar ───────────────────────────────── */
interface BulkBarProps {
  count: number;
  employees: { id: string; name: string }[];
  onAssign: (name: string) => void;
  onStage: (stage: string) => void;
  onFollowup: () => void;
  onClear: () => void;
  isPending: boolean;
}
const BulkActionBar = ({ count, employees, onAssign, onStage, onFollowup, onClear, isPending }: BulkBarProps) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-border bg-card shadow-2xl px-4 py-2.5 animate-in slide-in-from-bottom-4">
    <Badge className="bg-primary text-primary-foreground text-xs px-2.5">
      {count} selected
    </Badge>

    {/* Assign To */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={isPending}>
          <Users className="h-3.5 w-3.5" />
          Assign To
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="text-xs text-muted-foreground">Select Employee</DropdownMenuLabel>
        {employees.map((e) => (
          <DropdownMenuItem key={e.id} className="text-xs" onClick={() => onAssign(e.name)}>
            {e.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Change Stage */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={isPending}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Stage
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="text-xs text-muted-foreground">Move to Stage</DropdownMenuLabel>
        {PIPELINE_STAGES.slice(1).map((s) => (
          <DropdownMenuItem key={s} className="text-xs" onClick={() => onStage(s)}>
            <span className={cn("rounded px-2 py-0.5 mr-1", stageColor(s))}>{s}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Set Follow-up */}
    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={isPending}
      onClick={onFollowup}>
      <Calendar className="h-3.5 w-3.5" />
      Follow-up
    </Button>

    {isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}

    {/* Clear */}
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
      <X className="h-4 w-4" />
    </Button>
  </div>
);

/* ─── Main Page ──────────────────────────────────────────────── */
const LeadsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sortDescending, setSortDescending] = useState(false);
  const { data: leads = [], isLoading } = useLeadsEnriched(sortDescending);
  const { data: employees = [] } = useEmployees();
  const updateLead = useUpdateLead();
  const bulkUpdate = useBulkUpdateLeads();

  // Filters
  const [search, setSearch]                 = useState("");
  const [stageFilter, setStageFilter]       = useState("All");
  const [followupFilter, setFollowupFilter] = useState<typeof FOLLOWUP_FILTERS[number]>("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [dispositionFilter, setDispositionFilter] = useState("All");

  // Row selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Per-row dialog state
  const [activeLead, setActiveLead] = useState<EnrichedLead | null>(null);
  const [detailsOpen,     setDetailsOpen]     = useState(false);
  const [editOpen,        setEditOpen]        = useState(false);
  const [deleteOpen,      setDeleteOpen]      = useState(false);
  const [logCallOpen,     setLogCallOpen]     = useState(false);
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);
  const [reassignOpen,    setReassignOpen]    = useState(false);
  const [followupOpen,    setFollowupOpen]    = useState(false); // single-row
  // Bulk dialog
  const [bulkFollowupOpen, setBulkFollowupOpen] = useState(false);

  /* ── Filtered leads ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (q) {
        const isNumeric = /^\d{1,4}$/.test(q);
        const match = isNumeric
          ? lead.customer_code.includes(q)
          : lead.customer_name.toLowerCase().includes(q) ||
            lead.mobile_number.includes(q) ||
            lead.customer_code.includes(q) ||
            (lead.company_name?.toLowerCase() || "").includes(q) ||
            (lead.location?.toLowerCase() || "").includes(q);
        if (!match) return false;
      }
      if (stageFilter !== "All" && (lead.pipeline_stage || "Suspect") !== stageFilter) return false;
      if (followupFilter !== "All") {
        const fu = lead.next_followup?.date;
        if (followupFilter === "None"     && fu) return false;
        if (followupFilter === "Today"    && fu !== today) return false;
        if (followupFilter === "Upcoming" && (!fu || fu <= today)) return false;
        if (followupFilter === "Missed"   && (!fu || fu >= today)) return false;
      }
      if (employeeFilter !== "All" && (lead.assigned_to || "") !== employeeFilter) return false;
      if (dispositionFilter !== "All" && (lead.last_call_disposition || "") !== dispositionFilter) return false;
      return true;
    });
  }, [leads, search, stageFilter, followupFilter, employeeFilter, dispositionFilter]);

  const filteredIds = useMemo(() => filtered.map((l) => l.id!).filter(Boolean), [filtered]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  /* ── Selection helpers ── */
  const toggleRow = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelectedIds(allFilteredSelected ? new Set() : new Set(filteredIds));

  const clearSelection = () => setSelectedIds(new Set());

  /* ── Per-row actions ── */
  const openDialog = useCallback((lead: EnrichedLead, dialog: "details" | "edit" | "delete" | "logCall" | "callHistory" | "reassign" | "followup") => {
    setActiveLead(lead);
    if (dialog === "details")     setDetailsOpen(true);
    if (dialog === "edit")        setEditOpen(true);
    if (dialog === "delete")      setDeleteOpen(true);
    if (dialog === "logCall")     setLogCallOpen(true);
    if (dialog === "callHistory") setCallHistoryOpen(true);
    if (dialog === "reassign")    setReassignOpen(true);
    if (dialog === "followup")    setFollowupOpen(true);
  }, []);

  const handleStageUpdate = useCallback(async (id: string, stage: string) => {
    const lead = leads.find((l) => l.id === id);
    try {
      await updateLead.mutateAsync({
        id,
        updates: { pipeline_stage: stage },
        changedBy: user?.email?.split("@")[0] || "Unknown",
        fromStage: lead?.pipeline_stage,
      });
    } catch { /* onError in mutation handles toast */ }
  }, [updateLead, leads, user]);

  const handleReassign = useCallback(async (id: string, name: string) => {
    try {
      await updateLead.mutateAsync({ id, updates: { assigned_to: name } });
      setReassignOpen(false);
    } catch { /* handled */ }
  }, [updateLead]);

  /* Single-lead follow-up: create via follow_ups table is done via LogCallDialog;
     this sets next_followup via a "direct" follow_up insert */
  const handleSingleFollowup = useCallback(async (date: string, time: string) => {
    if (!activeLead?.id) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.from("follow_ups").insert({
      lead_id: activeLead.id,
      customer_code: activeLead.customer_code,
      scheduled_date: date,
      scheduled_time: time || null,
      status: "Pending",
    });
    if (error) { toast.error("Failed to schedule follow-up"); return; }
    toast.success("Follow-up scheduled!");
    setFollowupOpen(false);
  }, [activeLead]);

  /* ── Bulk actions ── */
  const selectedLeadIds = Array.from(selectedIds);

  const handleBulkAssign = useCallback(async (name: string) => {
    try {
      await bulkUpdate.mutateAsync({ ids: selectedLeadIds, updates: { assigned_to: name } });
      clearSelection();
    } catch { /* handled */ }
  }, [bulkUpdate, selectedLeadIds]);

  const handleBulkStage = useCallback(async (stage: string) => {
    try {
      await bulkUpdate.mutateAsync({ ids: selectedLeadIds, updates: { pipeline_stage: stage } });
      clearSelection();
    } catch { /* handled */ }
  }, [bulkUpdate, selectedLeadIds]);

  const handleBulkFollowup = useCallback(async (date: string, time: string) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const rows = selectedLeadIds.map((lid) => {
      const lead = leads.find((l) => l.id === lid);
      return {
        lead_id: lid,
        customer_code: lead?.customer_code || null,
        scheduled_date: date,
        scheduled_time: time || null,
        status: "Pending",
      };
    });
    const { error } = await supabase.from("follow_ups").insert(rows);
    if (error) { toast.error("Failed to schedule follow-ups"); return; }
    toast.success(`Follow-up scheduled for ${rows.length} leads`);
    setBulkFollowupOpen(false);
    clearSelection();
  }, [selectedLeadIds, leads]);

  /* ── "More Options" bulk actions on ALL filtered leads ── */
  const handleBulkFilteredAssign = useCallback(async (name: string) => {
    if (filteredIds.length === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: filteredIds, updates: { assigned_to: name } });
    } catch { /* handled */ }
  }, [bulkUpdate, filteredIds]);

  const handleBulkFilteredStage = useCallback(async (stage: string) => {
    if (filteredIds.length === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: filteredIds, updates: { pipeline_stage: stage } });
    } catch { /* handled */ }
  }, [bulkUpdate, filteredIds]);

  /* ── Indicators ── */
  const todayCount  = leads.filter((l) => l.next_followup?.date === today).length;
  const missedCount = leads.filter((l) => l.next_followup?.date && l.next_followup.date < today).length;

  const assigneeOptions = useMemo(() => {
    const names = new Set(leads.map((l) => l.assigned_to).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }, [leads]);

  const isBulkPending = bulkUpdate.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} leads
            {todayCount > 0 && <> · <span className="text-amber-600 font-medium">{todayCount} follow-ups today</span></>}
            {missedCount > 0 && <> · <span className="text-red-600 font-medium">{missedCount} overdue</span></>}
          </p>
        </div>
        <LeadsUploadDialog />
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Name, mobile, code…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>

        {/* Stage */}
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s === "All" ? "All Stages" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Follow-up */}
        <Select value={followupFilter} onValueChange={(v) => setFollowupFilter(v as any)}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All" className="text-xs">All Follow-ups</SelectItem>
            <SelectItem value="Today" className="text-xs">
              <span className="text-amber-600">Today{todayCount > 0 ? ` (${todayCount})` : ""}</span>
            </SelectItem>
            <SelectItem value="Upcoming" className="text-xs">Upcoming</SelectItem>
            <SelectItem value="Missed" className="text-xs">
              <span className="text-red-600">Missed{missedCount > 0 ? ` (${missedCount})` : ""}</span>
            </SelectItem>
            <SelectItem value="None" className="text-xs">No Follow-up</SelectItem>
          </SelectContent>
        </Select>

        {/* Employee */}
        {(assigneeOptions.length > 0 || employees.length > 0) && (
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-xs">All Employees</SelectItem>
              {(assigneeOptions.length > 0 ? assigneeOptions : employees.map((e) => e.name)).map((name) => (
                <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Disposition */}
        <Select value={dispositionFilter} onValueChange={setDispositionFilter}>
          <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DISPOSITIONS.map((d) => (
              <SelectItem key={d} value={d} className="text-xs">
                {d === "All" ? "All Dispositions" : d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ── More Options (acts on ALL filtered leads) ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs ml-auto"
              disabled={filteredIds.length === 0 || isBulkPending}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              More Options
              <ChevronDown className="h-3 w-3 opacity-60" />
              {isBulkPending && <Loader2 className="h-3 w-3 animate-spin" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Apply to {filtered.length} visible lead{filtered.length !== 1 ? "s" : ""}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Assign All Visible */}
            {employees.map((e) => null) && null /* placeholder for nested menu — using sub-dropdown via next item */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs cursor-pointer">
                  <Users className="mr-2 h-3.5 w-3.5" />
                  Assign All Visible…
                  <ChevronDown className="ml-auto h-3 w-3 opacity-50" />
                </DropdownMenuItem>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Assign to</DropdownMenuLabel>
                {employees.map((e) => (
                  <DropdownMenuItem key={e.id} className="text-xs"
                    onClick={() => handleBulkFilteredAssign(e.name)}>
                    {e.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Change Stage for All Visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs cursor-pointer">
                  <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                  Change Stage All…
                  <ChevronDown className="ml-auto h-3 w-3 opacity-50" />
                </DropdownMenuItem>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Move to stage</DropdownMenuLabel>
                {PIPELINE_STAGES.slice(1).map((s) => (
                  <DropdownMenuItem key={s} className="text-xs"
                    onClick={() => handleBulkFilteredStage(s)}>
                    <span className={cn("rounded px-2 py-0.5 mr-1", stageColor(s))}>{s}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Row actions (use checkboxes)</DropdownMenuLabel>
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Select rows below for individual actions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Table ── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">
            Lead Records <span className="font-normal text-muted-foreground ml-1">({filtered.length})</span>
          </CardTitle>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">
                {selectedIds.size} selected
              </Badge>
              <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border">
                <tr>
                  {/* Select all checkbox */}
                  <th className="w-9 px-2 py-2.5 text-center">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      className="border-muted-foreground"
                    />
                  </th>
                  {/* Call icon col */}
                  <th className="w-10 px-2 py-2.5" />
                  <th className="px-3 py-2.5 text-left">
                    <button
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
                      onClick={() => setSortDescending(!sortDescending)}
                    >
                      Customer
                      {sortDescending ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mobile</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Location</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Assigned To</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stage</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Next TBRO</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">FY Revenue</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((lead) => {
                  const isChecked = !!(lead.id && selectedIds.has(lead.id));
                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        "hover:bg-muted/40 transition-colors group",
                        isChecked && "bg-primary/5"
                      )}
                    >
                      {/* Row checkbox */}
                      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {lead.id && (
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleRow(lead.id!)}
                            className="border-muted-foreground"
                          />
                        )}
                      </td>

                      {/* Call Button */}
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => openDialog(lead, "logCall")}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border transition-all",
                            lead.last_call_status
                              ? cn(callStatusColor(lead.last_call_status), "border-current")
                              : "border-border bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                          )}
                          title={lead.last_call_status ? `Last: ${lead.last_call_status}` : "Log Call"}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="px-3 py-2.5 min-w-[140px]">
                        <p className="font-semibold text-foreground leading-tight text-sm">{lead.customer_name}</p>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {lead.company_name || <span className="font-mono">{lead.customer_code}</span>}
                        </p>
                        {lead.company_name && (
                          <p className="text-[10px] text-muted-foreground/70 font-mono">{lead.customer_code}</p>
                        )}
                      </td>

                      {/* Mobile */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-sm font-mono">{lead.mobile_number}</span>
                        {lead.last_call_disposition && (
                          <p className="text-[10px] mt-0.5 text-muted-foreground">{lead.last_call_disposition}</p>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{lead.location || "—"}</span>
                      </td>

                      {/* Assigned To */}
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        {lead.assigned_to ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                            <UserCheck className="h-3 w-3 shrink-0" />
                            {lead.assigned_to}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">Unassigned</span>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="px-3 py-2.5">
                        {lead.id ? (
                          <InlineStageSelect leadId={lead.id} stage={lead.pipeline_stage || "Suspect"} onUpdate={handleStageUpdate} />
                        ) : (
                          <Badge variant="outline" className={cn("text-xs", stageColor(lead.pipeline_stage || "Suspect"))}>
                            {lead.pipeline_stage || "Suspect"}
                          </Badge>
                        )}
                      </td>

                      {/* Next TBRO */}
                      <td className="px-3 py-2.5 hidden sm:table-cell min-w-[110px]">
                        <NextTbro followup={lead.next_followup} />
                      </td>

                      {/* FY Revenue */}
                      <td className="px-3 py-2.5 text-right hidden lg:table-cell">
                        {lead.fy_revenue > 0 ? (
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(lead.fy_revenue)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* 3-dot Row Menu */}
                      <td className="px-2 py-2.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openDialog(lead, "details")}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog(lead, "callHistory")}>
                              <History className="mr-2 h-4 w-4 text-primary" /> Call History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog(lead, "logCall")}>
                              <Phone className="mr-2 h-4 w-4 text-primary" /> Log Call
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDialog(lead, "edit")}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog(lead, "reassign")}>
                              <UserCheck className="mr-2 h-4 w-4" /> Reassign Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog(lead, "followup")}>
                              <Calendar className="mr-2 h-4 w-4 text-amber-600" /> Set Follow-up
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate("/quotations")}>
                              <ShoppingCart className="mr-2 h-4 w-4 text-emerald-600" /> Convert to Sale
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive"
                              onClick={() => openDialog(lead, "delete")}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No leads match the current filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Floating Bulk Action Bar (shown when rows selected) ── */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          employees={employees}
          onAssign={handleBulkAssign}
          onStage={handleBulkStage}
          onFollowup={() => setBulkFollowupOpen(true)}
          onClear={clearSelection}
          isPending={isBulkPending}
        />
      )}

      {/* ── Per-row dialogs ── */}
      <LeadDetailsDialog lead={activeLead} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <EditLeadDialog lead={activeLead} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteLeadDialog lead={activeLead} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <LogCallDialog
        open={logCallOpen} onOpenChange={setLogCallOpen}
        leadId={activeLead?.id || null}
        customerCode={activeLead?.customer_code || null}
        leadName={activeLead?.customer_name}
        currentStage={activeLead?.pipeline_stage}
      />
      <CallHistoryDialog
        leadId={activeLead?.id || null}
        customerCode={activeLead?.customer_code || null}
        leadName={activeLead?.customer_name}
        open={callHistoryOpen} onOpenChange={setCallHistoryOpen}
      />
      <ReassignDialog
        lead={activeLead} open={reassignOpen} onOpenChange={setReassignOpen}
        employees={employees} onSave={handleReassign}
        isPending={updateLead.isPending}
      />
      <SetFollowupDialog
        open={followupOpen} onOpenChange={setFollowupOpen}
        label={activeLead?.customer_name || "Lead"}
        onSave={handleSingleFollowup}
        isPending={false}
      />

      {/* ── Bulk follow-up dialog ── */}
      <SetFollowupDialog
        open={bulkFollowupOpen} onOpenChange={setBulkFollowupOpen}
        label={`${selectedIds.size} leads`}
        onSave={handleBulkFollowup}
        isPending={isBulkPending}
      />
    </div>
  );
};

export default LeadsPage;
