import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  User, Bell, Shield, Palette, Loader2, Users, Plus, Pencil,
  Search, UserCheck, UserX, Mail, ShieldCheck, Trash2, AlertCircle,
  CheckCircle, Lock, Eye, EyeOff, Database, FileText, ShoppingCart,
  Package, Ticket, BarChart3, Settings2, LayoutDashboard, ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { deleteAllowedEmail } from "@/lib/allowedEmailsApi";
import {
  useRolePermissions, useUpdateRolePermission, usePermissionsTableExists,
  ALL_PERMISSIONS, PERMISSION_ROLES, PermissionRole,
} from "@/hooks/useRolePermissions";

// ─── Types ───────────────────────────────────────────────────────────────────

type AppRole = "master_admin" | "admin" | "manager" | "user";

interface Employee {
  id: string;
  name: string;
  mobile_number: string | null;
  email: string | null;
  employee_role: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface AllowedEmail {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
}

const EMPLOYEE_ROLES = ["Sales", "Admin", "Support", "Manager"];
const emailSchema = z.string().email("Please enter a valid email address");

const ROLE_CONFIG: Record<AppRole, { label: string; icon: typeof ShieldCheck; color: string }> = {
  master_admin: { label: "Master Admin", icon: ShieldCheck, color: "text-purple-600 dark:text-purple-400" },
  admin:        { label: "Admin",        icon: Shield,      color: "text-primary" },
  manager:      { label: "Manager",      icon: Shield,      color: "text-blue-600 dark:text-blue-400" },
  user:         { label: "User",         icon: User,        color: "text-muted-foreground" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { user, isMasterAdmin, isAdmin } = useAuth();
  const { settings, isLoading: settingsLoading, isSaving, updateSetting, updateProfile, updatePassword } = useUserSettings();

  // ── Profile state ──
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    await updateProfile(fullName, email);
    setProfileSaving(false);
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword) return;
    setPasswordSaving(true);
    const success = await updatePassword(currentPassword, newPassword);
    if (success) { setCurrentPassword(""); setNewPassword(""); }
    setPasswordSaving(false);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Settings</h1>
        <p className="text-muted-foreground">Manage your account, employees, and system access</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="employees">Employees</TabsTrigger>}
          {isMasterAdmin && <TabsTrigger value="user-access">User Access</TabsTrigger>}
          {isMasterAdmin && <TabsTrigger value="permissions">Permissions</TabsTrigger>}
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
                </div>
                <Button className="bg-[image:var(--gradient-primary)]" onClick={handleProfileSave} disabled={profileSaving || isSaving}>
                  {profileSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                  <Bell className="h-5 w-5 text-info" />
                </div>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Email Notifications</p><p className="text-sm text-muted-foreground">Receive email updates</p></div>
                  <Switch checked={settings.email_notifications} onCheckedChange={(c) => updateSetting("email_notifications", c)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Payment Alerts</p><p className="text-sm text-muted-foreground">Get notified on payments</p></div>
                  <Switch checked={settings.payment_alerts} onCheckedChange={(c) => updateSetting("payment_alerts", c)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">New Lead Alerts</p><p className="text-sm text-muted-foreground">Notify on new leads</p></div>
                  <Switch checked={settings.lead_alerts} onCheckedChange={(c) => updateSetting("lead_alerts", c)} />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <Shield className="h-5 w-5 text-warning" />
                </div>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" />
                </div>
                <Button variant="outline" onClick={handlePasswordUpdate} disabled={passwordSaving || !currentPassword || !newPassword}>
                  {passwordSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Palette className="h-5 w-5 text-success" />
                </div>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Dark Mode</p><p className="text-sm text-muted-foreground">Toggle dark theme</p></div>
                  <Switch checked={settings.dark_mode} onCheckedChange={(c) => updateSetting("dark_mode", c)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Compact View</p><p className="text-sm text-muted-foreground">Reduce spacing</p></div>
                  <Switch checked={settings.compact_view} onCheckedChange={(c) => updateSetting("compact_view", c)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Employees Tab ── */}
        {isAdmin && (
          <TabsContent value="employees" className="mt-6">
            <EmployeesSection isMasterAdmin={isMasterAdmin} />
          </TabsContent>
        )}

        {/* ── User Access Tab ── */}
        {isMasterAdmin && (
          <TabsContent value="user-access" className="mt-6">
            <UserAccessSection />
          </TabsContent>
        )}

        {/* ── Permissions Tab ── */}
        {isMasterAdmin && (
          <TabsContent value="permissions" className="mt-6">
            <PermissionsSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// ─── Employees Section ────────────────────────────────────────────────────────

const EmployeesSection = ({ isMasterAdmin }: { isMasterAdmin: boolean }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ name: "", mobile_number: "", email: "", employee_role: "Sales" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("name");
      if (error) throw error;
      const unique = (data as Employee[]).reduce((acc, emp) => {
        if (!acc.find((e) => e.name.toLowerCase() === emp.name.toLowerCase())) acc.push(emp);
        return acc;
      }, [] as Employee[]);
      return unique;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("employees").insert({
        name: data.name.trim(), mobile_number: data.mobile_number.trim() || null,
        email: data.email.trim() || null, employee_role: data.employee_role, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-employees"] }); queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee added successfully"); closeDialog(); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const { error } = await supabase.from("employees").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-employees"] }); queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee updated"); closeDialog(); },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("employees").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["all-employees"] }); queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success(vars.is_active ? "Employee reactivated" : "Employee deactivated"); },
    onError: (err: any) => toast.error(err.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingEmployee(null); setFormData({ name: "", mobile_number: "", email: "", employee_role: "Sales" }); setFormErrors({}); };

  const openAdd = () => { setEditingEmployee(null); setFormData({ name: "", mobile_number: "", email: "", employee_role: "Sales" }); setDialogOpen(true); };
  const openEdit = (emp: Employee) => { setEditingEmployee(emp); setFormData({ name: emp.name, mobile_number: emp.mobile_number || "", email: emp.email || "", employee_role: emp.employee_role || "Sales" }); setDialogOpen(true); };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email format";
    if (formData.mobile_number && !/^\d{10}$/.test(formData.mobile_number.replace(/\s/g, ""))) errors.mobile_number = "Enter valid 10-digit mobile number";
    if (employees.some((e) => e.name.toLowerCase() === formData.name.trim().toLowerCase() && e.id !== editingEmployee?.id)) errors.name = "Employee with this name already exists";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: { name: formData.name.trim(), mobile_number: formData.mobile_number.trim() || null, email: formData.email.trim() || null, employee_role: formData.employee_role } });
    } else {
      addMutation.mutate(formData);
    }
  };

  const filtered = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return emp.name.toLowerCase().includes(q) || emp.email?.toLowerCase().includes(q) || emp.mobile_number?.includes(q) || emp.employee_role?.toLowerCase().includes(q);
  });

  const activeCount = employees.filter((e) => e.is_active !== false).length;
  const inactiveCount = employees.filter((e) => e.is_active === false).length;
  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Employee Management</h2>
            <p className="text-sm text-muted-foreground">{activeCount} active · {inactiveCount} inactive</p>
          </div>
        </div>
        {isMasterAdmin && (
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Employee</Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <Card className="rounded-xl border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
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
                      <TableCell colSpan={isMasterAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No employees match your search" : "No employees found."}
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((emp) => (
                    <TableRow key={emp.id} className={emp.is_active === false ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.mobile_number || "-"}</TableCell>
                      <TableCell>{emp.email || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{emp.employee_role || "Sales"}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={emp.is_active !== false ? "default" : "secondary"} className={emp.is_active !== false ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                          {emp.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{emp.created_at ? format(new Date(emp.created_at), "dd MMM yyyy") : "-"}</TableCell>
                      {isMasterAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate({ id: emp.id, is_active: emp.is_active === false })} title={emp.is_active !== false ? "Deactivate" : "Reactivate"}>
                              {emp.is_active !== false ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-success" />}
                            </Button>
                          </div>
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

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>{editingEmployee ? "Update employee details below." : "Fill in the details to add a new employee."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter full name" />
              {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input value={formData.mobile_number} onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })} placeholder="10-digit mobile number" maxLength={10} />
              {formErrors.mobile_number && <p className="text-sm text-destructive">{formErrors.mobile_number}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="employee@example.com" />
              {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.employee_role} onValueChange={(v) => setFormData({ ...formData, employee_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMPLOYEE_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{editingEmployee ? "Updating..." : "Adding..."}</> : editingEmployee ? "Update Employee" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── User Access Section ──────────────────────────────────────────────────────

const UserAccessSection = () => {
  const queryClient = useQueryClient();
  const { user: currentUser, isMasterAdmin } = useAuth();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<AllowedEmail | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const { data: allowedEmails = [], isLoading } = useQuery({
    queryKey: ["allowed-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("allowed_emails").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as AllowedEmail[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { error } = await supabase.from("allowed_emails").insert({ email: email.toLowerCase(), role, added_by: currentUser?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["allowed-emails"] }); setAddDialogOpen(false); setNewEmail(""); setNewRole("user"); toast.success("User added successfully"); },
    onError: (err: Error) => { if (err.message.includes("duplicate")) { toast.error("This email is already in the allowed list"); } else { toast.error("Failed to add user: " + err.message); } },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase.from("allowed_emails").update({ role, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["allowed-emails"] }); toast.success("Role updated"); },
    onError: (err: Error) => toast.error("Failed to update role: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteAllowedEmail(id);
      if (!res.success) throw new Error(res.error || "Delete failed");
    },
    onSuccess: (_, id) => { queryClient.setQueryData<AllowedEmail[]>(["allowed-emails"], (prev) => (prev ?? []).filter((e) => e.id !== id)); setDeleteDialogOpen(false); setSelectedEmail(null); toast.success("User removed"); queryClient.invalidateQueries({ queryKey: ["allowed-emails"] }); },
    onError: (err: Error) => toast.error(err.message.toLowerCase().includes("forbidden") ? "You do not have permission" : "Failed to delete user"),
  });

  const handleAddUser = () => {
    setEmailError(null);
    try { emailSchema.parse(newEmail); } catch (e) { if (e instanceof z.ZodError) { setEmailError(e.errors[0].message); return; } }
    addMutation.mutate({ email: newEmail, role: newRole });
  };

  const handleDeleteClick = async (item: AllowedEmail) => {
    if (item.email.toLowerCase() === "info@axel-guard.com") { toast.error("Master Admin cannot be deleted"); return; }
    if (!currentUser) { toast.error("Not authenticated"); return; }
    let canDelete = isMasterAdmin;
    if (!canDelete) {
      const { data, error } = await supabase.rpc("is_master_admin", { _user_id: currentUser.id });
      canDelete = !!data && !error;
    }
    if (!canDelete) { toast.error("You do not have permission"); return; }
    setSelectedEmail(item);
    setDeleteDialogOpen(true);
  };

  const filteredEmails = allowedEmails.filter((item) => item.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const counts = { master_admin: allowedEmails.filter((e) => e.role === "master_admin").length, admin: allowedEmails.filter((e) => e.role === "admin").length, manager: allowedEmails.filter((e) => e.role === "manager").length, user: allowedEmails.filter((e) => e.role === "user").length };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />User Access Management</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage who can access the system and their roles</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add User</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total Users", value: allowedEmails.length, color: "" },
          { label: "Master Admins", value: counts.master_admin, color: "text-purple-600 dark:text-purple-400" },
          { label: "Admins", value: counts.admin, color: "text-primary" },
          { label: "Managers", value: counts.manager, color: "text-blue-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className={`text-3xl ${s.color}`}>{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Allowed Email Addresses</CardTitle>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search emails..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{searchTerm ? "No emails found" : "No allowed emails yet"}</TableCell></TableRow>
                  ) : filteredEmails.map((item) => {
                    const cfg = ROLE_CONFIG[item.role] || ROLE_CONFIG.user;
                    const RoleIcon = cfg.icon;
                    const isPermanent = item.email.toLowerCase() === "info@axel-guard.com";
                    const isMasterAdminEmail = item.role === "master_admin";
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{item.email}</div>
                        </TableCell>
                        <TableCell>
                          {isPermanent ? (
                            <div className="flex items-center gap-2"><RoleIcon className={`h-4 w-4 ${cfg.color}`} /><span className={cfg.color}>{cfg.label}</span><span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">Protected</span></div>
                          ) : isMasterAdminEmail && !isMasterAdmin ? (
                            <div className="flex items-center gap-2"><RoleIcon className={`h-4 w-4 ${cfg.color}`} /><span className={cfg.color}>{cfg.label}</span></div>
                          ) : (
                            <Select value={item.role} onValueChange={(v: AppRole) => updateRoleMutation.mutate({ id: item.id, role: v })} disabled={isMasterAdminEmail && !isMasterAdmin}>
                              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {isMasterAdmin && <SelectItem value="master_admin"><div className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-purple-500" />Master Admin</div></SelectItem>}
                                <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-3 w-3 text-primary" />Admin</div></SelectItem>
                                <SelectItem value="manager"><div className="flex items-center gap-2"><Shield className="h-3 w-3 text-blue-500" />Manager</div></SelectItem>
                                <SelectItem value="user"><div className="flex items-center gap-2"><User className="h-3 w-3" />User</div></SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {isPermanent ? (
                            <Button variant="ghost" size="icon" disabled className="text-muted-foreground opacity-30"><Trash2 className="h-4 w-4" /></Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allowed User</DialogTitle>
            <DialogDescription>Add an email address to the allowed list. Only these emails can log in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" placeholder="user@company.com" value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setEmailError(null); }} />
              {emailError && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{emailError}</p>}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v: AppRole) => setNewRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isMasterAdmin && <SelectItem value="master_admin"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-purple-500" />Master Admin</div></SelectItem>}
                  <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Admin — Full system access</div></SelectItem>
                  <SelectItem value="manager"><div className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" />Manager — Elevated access</div></SelectItem>
                  <SelectItem value="user"><div className="flex items-center gap-2"><User className="h-4 w-4" />User — Limited access</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={addMutation.isPending} className="gap-2">
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user?
              {selectedEmail?.email && <span className="block mt-2 font-medium text-foreground">{selectedEmail.email}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={() => selectedEmail && deleteMutation.mutate(selectedEmail.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Role access reference data ───────────────────────────────────────────────

const ROLE_ACCESS_MATRIX = [
  {
    module: "Dashboard",
    icon: BarChart3,
    user:         { view: true,  actions: "View summary cards & charts" },
    manager:      { view: true,  actions: "View all dashboard data" },
    admin:        { view: true,  actions: "Full dashboard + today's work" },
    master_admin: { view: true,  actions: "Full access" },
  },
  {
    module: "Reports & Analytics",
    icon: FileText,
    user:         { view: true,  actions: "View reports (read-only)" },
    manager:      { view: true,  actions: "View & export reports" },
    admin:        { view: true,  actions: "View, export, today's work done" },
    master_admin: { view: true,  actions: "Full access" },
  },
  {
    module: "Sales",
    icon: ShoppingCart,
    user:         { view: true,  actions: "View sales, add new sale" },
    manager:      { view: true,  actions: "View, add, edit (if granted)" },
    admin:        { view: true,  actions: "Full: view, add, edit, delete" },
    master_admin: { view: true,  actions: "Full access" },
  },
  {
    module: "Quotations",
    icon: FileText,
    user:         { view: true,  actions: "Create quotations (needs approval)" },
    manager:      { view: true,  actions: "Create + approve (if granted)" },
    admin:        { view: true,  actions: "Create, approve, manage all" },
    master_admin: { view: true,  actions: "Create → auto approved, send email" },
  },
  {
    module: "Leads / Customers",
    icon: Users,
    user:         { view: true,  actions: "View & add leads, no delete" },
    manager:      { view: true,  actions: "View, add, edit leads" },
    admin:        { view: true,  actions: "Full: view, add, edit, delete" },
    master_admin: { view: true,  actions: "Full access" },
  },
  {
    module: "Inventory",
    icon: Package,
    user:         { view: true,  actions: "View inventory (read-only)" },
    manager:      { view: true,  actions: "View & add inventory" },
    admin:        { view: true,  actions: "Full inventory management" },
    master_admin: { view: true,  actions: "Full access" },
  },
  {
    module: "Tickets / Tasks",
    icon: Ticket,
    user:         { view: true,  actions: "View & update assigned tickets" },
    manager:      { view: true,  actions: "Create, assign, update tickets" },
    admin:        { view: true,  actions: "Full ticket management" },
    master_admin: { view: true,  actions: "Full access + close approval" },
  },
  {
    module: "Employee Management",
    icon: Users,
    user:         { view: false, actions: "No access" },
    manager:      { view: false, actions: "No access" },
    admin:        { view: true,  actions: "View employees" },
    master_admin: { view: true,  actions: "Add, edit, activate/deactivate" },
  },
  {
    module: "User Settings & Access",
    icon: Settings2,
    user:         { view: true,  actions: "Profile & notification settings only" },
    manager:      { view: true,  actions: "Profile & notification settings only" },
    admin:        { view: true,  actions: "Profile settings + view employees" },
    master_admin: { view: true,  actions: "Full: users, roles, permissions" },
  },
] as const;

// ─── Permission groups config ─────────────────────────────────────────────────

const PERMISSION_GROUPS: { group: string; icon: React.ElementType; color: string }[] = [
  { group: "Dashboard & Reports", icon: LayoutDashboard,  color: "text-blue-600 dark:text-blue-400" },
  { group: "Sales",               icon: ShoppingCart,     color: "text-green-600 dark:text-green-400" },
  { group: "Quotations",          icon: ClipboardList,    color: "text-orange-600 dark:text-orange-400" },
  { group: "Inventory",           icon: Package,          color: "text-purple-600 dark:text-purple-400" },
  { group: "Leads / Customers",   icon: Users,            color: "text-cyan-600 dark:text-cyan-400" },
  { group: "Tickets",             icon: Ticket,           color: "text-rose-600 dark:text-rose-400" },
];

// ─── Permissions Section ──────────────────────────────────────────────────────

const PermissionsSection = () => {
  const { data: permissions = [], isLoading } = useRolePermissions();
  const updatePermission = useUpdateRolePermission();
  const tableExists = usePermissionsTableExists();
  const [showReference, setShowReference] = useState(true);

  const getGranted = (role: string, permission: string): boolean => {
    const p = permissions.find((x) => x.role === role && x.permission === permission);
    return p?.granted ?? false;
  };

  const handleToggle = (role: PermissionRole, permission: string, current: boolean) => {
    updatePermission.mutate({ role, permission, granted: !current });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
          <Lock className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Role Permissions</h2>
          <p className="text-sm text-muted-foreground">Configure what each role is allowed to do. Master Admin always has full access.</p>
        </div>
      </div>

      {/* DB not set up banner */}
      {!tableExists && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-400">DB migration not yet applied</p>
            <p className="text-amber-600 dark:text-amber-500 mt-1">
              Permissions are saved <strong>locally in this browser</strong> until the migration is applied to Supabase.
              Run this in your Supabase SQL Editor to persist across all devices:
            </p>
            <pre className="mt-2 text-[11px] bg-amber-100 dark:bg-amber-900/40 rounded p-2 overflow-x-auto whitespace-pre-wrap text-amber-800 dark:text-amber-300 select-all">
{`CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, permission)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "master_admin_write" ON public.role_permissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM allowed_emails
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND role = 'master_admin'
  ));
INSERT INTO public.role_permissions (role, permission, granted) VALUES
  ('user','quotation_approve',false),('user','sale_edit',false),
  ('user','sale_delete',false),('user','lead_delete',false),
  ('manager','quotation_approve',false),('manager','sale_edit',true),
  ('manager','sale_delete',false),('manager','lead_delete',false),
  ('admin','quotation_approve',true),('admin','sale_edit',true),
  ('admin','sale_delete',true),('admin','lead_delete',true)
ON CONFLICT (role, permission) DO NOTHING;`}
            </pre>
          </div>
        </div>
      )}

      {/* Permission toggle matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-warning" />
            Feature Access Controls
          </CardTitle>
          <CardDescription>Toggle which roles can perform each action. Permissions are grouped by module.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-4 pr-6 text-sm font-semibold text-muted-foreground w-64">Permission</th>
                    {PERMISSION_ROLES.map((r) => (
                      <th key={r.key} className="text-center pb-4 px-4 text-sm font-semibold min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <Shield className="h-4 w-4 text-primary" />
                          <span>{r.label}</span>
                        </div>
                      </th>
                    ))}
                    <th className="text-center pb-4 px-4 text-sm font-semibold text-purple-600 dark:text-purple-400 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Master Admin</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_GROUPS.map(({ group, icon: GroupIcon, color }) => {
                    const groupPerms = ALL_PERMISSIONS.filter((p) => p.group === group);
                    return (
                      <>
                        {/* Group header row */}
                        <tr key={`group-${group}`} className="bg-muted/50">
                          <td colSpan={5} className="py-2 px-3">
                            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${color}`}>
                              <GroupIcon className="h-3.5 w-3.5" />
                              {group}
                            </div>
                          </td>
                        </tr>
                        {groupPerms.map((perm) => {
                          return (
                            <tr key={perm.key} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="py-3 pr-6 pl-3">
                                <p className="font-medium text-sm">{perm.label}</p>
                                <p className="text-xs text-muted-foreground">{perm.description}</p>
                              </td>
                              {PERMISSION_ROLES.map((role) => {
                                const granted = getGranted(role.key, perm.key);
                                return (
                                  <td key={role.key} className="py-3 px-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <Switch
                                        checked={granted}
                                        onCheckedChange={() => handleToggle(role.key, perm.key, granted)}
                                        disabled={updatePermission.isPending}
                                      />
                                      <span className={`text-[10px] font-medium ${granted ? "text-success" : "text-muted-foreground"}`}>
                                        {granted ? "Allowed" : "Denied"}
                                      </span>
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="py-3 px-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Switch checked={true} disabled className="opacity-50" />
                                  <span className="text-[10px] font-medium text-success">Always</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {tableExists
              ? "Changes take effect immediately. Users may need to refresh to see updated permissions."
              : "Changes are saved locally. Apply the migration above to sync across all users."}
          </p>
        </CardContent>
      </Card>

      {/* Role Reference Card */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowReference((v) => !v)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-info" />
                Role Access Reference
              </CardTitle>
              <CardDescription>What each role can see and do across the system</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              {showReference ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showReference ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showReference && (
          <CardContent className="pt-0">
            {/* Role legend chips */}
            <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-border">
              {[
                { label: "User",         color: "bg-muted text-muted-foreground border-border",                        icon: User },
                { label: "Manager",      color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400",       icon: Shield },
                { label: "Admin",        color: "bg-primary/10 text-primary border-primary/30",                        icon: Shield },
                { label: "Master Admin", color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400", icon: ShieldCheck },
              ].map(({ label, color, icon: Icon }) => (
                <div key={label} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Module</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-1"><User className="h-3.5 w-3.5" />User</div>
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      <div className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Manager</div>
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-primary">
                      <div className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Admin</div>
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      <div className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Master Admin</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROLE_ACCESS_MATRIX.map((row) => {
                    const Icon = row.icon;
                    return (
                      <tr key={row.module} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 font-medium">
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            {row.module}
                          </div>
                        </td>
                        {(["user", "manager", "admin", "master_admin"] as const).map((roleKey) => {
                          const access = row[roleKey];
                          return (
                            <td key={roleKey} className="px-3 py-3">
                              <div className="flex items-start gap-1.5">
                                {access.view ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                                )}
                                <span className={`text-xs leading-snug ${access.view ? "text-foreground" : "text-muted-foreground/50"}`}>
                                  {access.actions}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { role: "User", color: "border-border bg-muted/30", badge: "bg-muted text-muted-foreground", cannot: ["Approve quotations", "Edit/delete sales", "Delete leads", "Access employee management", "Access user settings/permissions"] },
                { role: "Manager", color: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", cannot: ["Approve quotations (unless granted)", "Delete sales (unless granted)", "Delete leads (unless granted)", "Access user management"] },
                { role: "Admin", color: "border-primary/20 bg-primary/5", badge: "bg-primary/10 text-primary", cannot: ["Add/remove system users", "Change user roles", "Manage role permissions"] },
                { role: "Master Admin", color: "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", cannot: [] },
              ].map(({ role, color, badge, cannot }) => (
                <div key={role} className={`rounded-lg border p-3 ${color}`}>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${badge}`}>{role}</span>
                  {cannot.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No restrictions — full system access.</p>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Cannot:</p>
                      <ul className="space-y-0.5">
                        {cannot.map((item) => (
                          <li key={item} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default SettingsPage;
