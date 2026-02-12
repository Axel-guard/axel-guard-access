import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Pencil,
  Search,
  UserCheck,
  UserX,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  mobile_number: string | null;
  email: string | null;
  employee_role: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

const EMPLOYEE_ROLES = ["Sales", "Admin", "Support", "Manager"];

const EmployeeManagement = () => {
  const { isMasterAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    mobile_number: "",
    email: "",
    employee_role: "Sales",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");
      if (error) throw error;
      // Deduplicate by name
      const unique = (data as Employee[]).reduce((acc, emp) => {
        if (!acc.find((e) => e.name.toLowerCase() === emp.name.toLowerCase())) {
          acc.push(emp);
        }
        return acc;
      }, [] as Employee[]);
      return unique;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("employees").insert({
        name: data.name.trim(),
        mobile_number: data.mobile_number.trim() || null,
        email: data.email.trim() || null,
        employee_role: data.employee_role,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee added successfully");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Employee>;
    }) => {
      const { error } = await supabase
        .from("employees")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated successfully");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("employees")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["all-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(
        vars.is_active ? "Employee reactivated" : "Employee deactivated"
      );
    },
    onError: (err: any) => toast.error(err.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
    setFormData({ name: "", mobile_number: "", email: "", employee_role: "Sales" });
    setFormErrors({});
  };

  const openAddDialog = () => {
    setEditingEmployee(null);
    setFormData({ name: "", mobile_number: "", email: "", employee_role: "Sales" });
    setDialogOpen(true);
  };

  const openEditDialog = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      mobile_number: emp.mobile_number || "",
      email: emp.email || "",
      employee_role: emp.employee_role || "Sales",
    });
    setDialogOpen(true);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Invalid email format";
    if (
      formData.mobile_number &&
      !/^\d{10}$/.test(formData.mobile_number.replace(/\s/g, ""))
    )
      errors.mobile_number = "Enter valid 10-digit mobile number";
    // Check duplicate name (only for new employees or name change)
    const isDuplicate = employees.some(
      (e) =>
        e.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        e.id !== editingEmployee?.id
    );
    if (isDuplicate) errors.name = "Employee with this name already exists";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editingEmployee) {
      updateMutation.mutate({
        id: editingEmployee.id,
        data: {
          name: formData.name.trim(),
          mobile_number: formData.mobile_number.trim() || null,
          email: formData.email.trim() || null,
          employee_role: formData.employee_role,
        },
      });
    } else {
      addMutation.mutate(formData);
    }
  };

  const filtered = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.mobile_number?.includes(q) ||
      emp.employee_role?.toLowerCase().includes(q)
    );
  });

  const activeCount = employees.filter((e) => e.is_active !== false).length;
  const inactiveCount = employees.filter((e) => e.is_active === false).length;
  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Employee Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeCount} active · {inactiveCount} inactive
            </p>
          </div>
        </div>
        {isMasterAdmin && (
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="rounded-xl border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added On</TableHead>
                    {isMasterAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isMasterAdmin ? 7 : 6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery
                          ? "No employees match your search"
                          : "No employees found. Add your first employee."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className={
                          emp.is_active === false ? "opacity-60" : ""
                        }
                      >
                        <TableCell className="font-medium">
                          {emp.name}
                        </TableCell>
                        <TableCell>{emp.mobile_number || "-"}</TableCell>
                        <TableCell>{emp.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {emp.employee_role || "Sales"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              emp.is_active !== false
                                ? "default"
                                : "secondary"
                            }
                            className={
                              emp.is_active !== false
                                ? "bg-success/10 text-success border-success/30"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {emp.is_active !== false ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {emp.created_at
                            ? format(new Date(emp.created_at), "dd MMM yyyy")
                            : "-"}
                        </TableCell>
                        {isMasterAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(emp)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: emp.id,
                                    is_active: emp.is_active === false,
                                  })
                                }
                                title={
                                  emp.is_active !== false
                                    ? "Deactivate"
                                    : "Reactivate"
                                }
                              >
                                {emp.is_active !== false ? (
                                  <UserX className="h-4 w-4 text-destructive" />
                                ) : (
                                  <UserCheck className="h-4 w-4 text-success" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? "Update employee details below."
                : "Fill in the details to add a new employee."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter full name"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={formData.mobile_number}
                onChange={(e) =>
                  setFormData({ ...formData, mobile_number: e.target.value })
                }
                placeholder="10-digit mobile number"
                maxLength={10}
              />
              {formErrors.mobile_number && (
                <p className="text-sm text-destructive">
                  {formErrors.mobile_number}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="employee@example.com"
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.employee_role}
                onValueChange={(v) =>
                  setFormData({ ...formData, employee_role: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingEmployee ? "Updating..." : "Adding..."}
                </>
              ) : editingEmployee ? (
                "Update Employee"
              ) : (
                "Add Employee"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeManagement;
