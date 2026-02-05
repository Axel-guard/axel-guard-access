import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCustomerTickets,
  useCreateTicket,
  useUpdateTicket,
} from "@/hooks/useCustomerDetails";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Ticket, Plus, AlertCircle, Clock, CheckCircle } from "lucide-react";

interface CustomerTicketsTabProps {
  customerCode: string;
}

const ISSUE_TYPES = [
  "Hardware Issue",
  "Software Issue",
  "Billing Query",
  "Delivery Issue",
  "Return Request",
  "Warranty Claim",
  "General Inquiry",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const getStatusBadge = (status: string) => {
  if (status === "Open") {
    return <Badge className="bg-blue-100 text-blue-700 border-0 gap-1"><Clock className="h-3 w-3" /> Open</Badge>;
  }
  if (status === "In Progress") {
    return <Badge className="bg-yellow-100 text-yellow-700 border-0 gap-1"><AlertCircle className="h-3 w-3" /> In Progress</Badge>;
  }
  return <Badge className="bg-green-100 text-green-700 border-0 gap-1"><CheckCircle className="h-3 w-3" /> Closed</Badge>;
};

const getPriorityBadge = (priority: string) => {
  const colors: Record<string, string> = {
    Low: "bg-gray-100 text-gray-700",
    Medium: "bg-blue-100 text-blue-700",
    High: "bg-orange-100 text-orange-700",
    Urgent: "bg-red-100 text-red-700",
  };
  return <Badge className={`${colors[priority] || colors.Medium} border-0`}>{priority}</Badge>;
};

export const CustomerTicketsTab = ({ customerCode }: CustomerTicketsTabProps) => {
  const { isAdmin } = useAuth();
  const { data: tickets, isLoading } = useCustomerTickets(customerCode);
  const { data: employees } = useEmployees();
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    issue_type: "",
    description: "",
    priority: "Medium",
    assigned_to: "",
  });

  const handleCreate = async () => {
    if (!newTicket.issue_type) return;

    await createTicket.mutateAsync({
      customer_code: customerCode,
      ...newTicket,
    });

    setCreateOpen(false);
    setNewTicket({ issue_type: "", description: "", priority: "Medium", assigned_to: "" });
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateTicket.mutateAsync({ id, updates: { status } });
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Support Tickets</CardTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
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
                  onValueChange={(v) => setNewTicket((prev) => ({ ...prev, issue_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the issue..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(v) => setNewTicket((prev) => ({ ...prev, priority: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={newTicket.assigned_to}
                    onValueChange={(v) => setNewTicket((prev) => ({ ...prev, assigned_to: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.name}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTicket.issue_type || createTicket.isPending}
              >
                Create Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {(!tickets || tickets.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Tickets</h3>
            <p className="text-muted-foreground mb-4">
              No support tickets found for this customer.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Ticket
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticket_no}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(ticket.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{ticket.issue_type}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {ticket.description || "-"}
                    </TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{ticket.assigned_to || "-"}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Select
                          value={ticket.status}
                          onValueChange={(v) => handleStatusChange(ticket.id, v)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
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
  );
};
