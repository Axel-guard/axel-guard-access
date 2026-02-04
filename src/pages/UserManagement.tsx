import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Plus, 
  Trash2, 
  Shield, 
  ShieldCheck,
  User, 
  Mail, 
  Search,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

type AppRole = "master_admin" | "admin" | "user";

interface AllowedEmail {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
}

const emailSchema = z.string().email("Please enter a valid email address");

const ROLE_CONFIG: Record<AppRole, { label: string; description: string; icon: typeof ShieldCheck; color: string }> = {
  master_admin: {
    label: "Master Admin",
    description: "Full access + user management",
    icon: ShieldCheck,
    color: "text-purple-600 dark:text-purple-400",
  },
  admin: {
    label: "Admin",
    description: "Full system access",
    icon: Shield,
    color: "text-primary",
  },
  user: {
    label: "User",
    description: "Limited access",
    icon: User,
    color: "text-muted-foreground",
  },
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user: currentUser, isMasterAdmin } = useAuth();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<AllowedEmail | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Fetch allowed emails
  const { data: allowedEmails = [], isLoading } = useQuery({
    queryKey: ["allowed-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_emails")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AllowedEmail[];
    },
  });

  // Add email mutation
  const addEmailMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { error } = await supabase
        .from("allowed_emails")
        .insert({
          email: email.toLowerCase(),
          role,
          added_by: currentUser?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-emails"] });
      setAddDialogOpen(false);
      setNewEmail("");
      setNewRole("user");
      toast.success("Email added successfully");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This email is already in the allowed list");
      } else {
        toast.error("Failed to add email: " + error.message);
      }
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase
        .from("allowed_emails")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-emails"] });
      toast.success("Role updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  // Delete email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("allowed_emails")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-emails"] });
      setDeleteDialogOpen(false);
      setSelectedEmail(null);
      toast.success("Email removed from allowed list");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove email: " + error.message);
    },
  });

  const handleAddEmail = () => {
    setEmailError(null);
    
    try {
      emailSchema.parse(newEmail);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setEmailError(e.errors[0].message);
        return;
      }
    }

    addEmailMutation.mutate({ email: newEmail, role: newRole });
  };

  const handleDeleteClick = (email: AllowedEmail) => {
    // Prevent deleting master admin
    if (email.role === "master_admin") {
      toast.error("Cannot delete Master Admin");
      return;
    }
    setSelectedEmail(email);
    setDeleteDialogOpen(true);
  };

  const canChangeRole = (targetRole: AppRole) => {
    // Only master admin can assign/modify master_admin role
    if (targetRole === "master_admin" && !isMasterAdmin) {
      return false;
    }
    return true;
  };

  const filteredEmails = allowedEmails.filter((item) =>
    item.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const masterAdminCount = allowedEmails.filter((e) => e.role === "master_admin").length;
  const adminCount = allowedEmails.filter((e) => e.role === "admin").length;
  const userCount = allowedEmails.filter((e) => e.role === "user").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User Access Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage who can access the system and their roles
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{allowedEmails.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Master Admins
            </CardDescription>
            <CardTitle className="text-3xl text-purple-600 dark:text-purple-400">{masterAdminCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-primary" />
              Admins
            </CardDescription>
            <CardTitle className="text-3xl text-primary">{adminCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <User className="h-4 w-4 text-muted-foreground" />
              Regular Users
            </CardDescription>
            <CardTitle className="text-3xl">{userCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Allowed Email Addresses</CardTitle>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No emails found matching your search" : "No allowed emails yet"}
            </div>
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
                  {filteredEmails.map((item) => {
                    const roleConfig = ROLE_CONFIG[item.role] || ROLE_CONFIG.user;
                    const RoleIcon = roleConfig.icon;
                    const isMasterAdminEmail = item.role === "master_admin";
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {item.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isMasterAdminEmail && !isMasterAdmin ? (
                            <div className="flex items-center gap-2">
                              <RoleIcon className={`h-4 w-4 ${roleConfig.color}`} />
                              <span className={roleConfig.color}>{roleConfig.label}</span>
                            </div>
                          ) : (
                            <Select
                              value={item.role}
                              onValueChange={(value: AppRole) => {
                                if (canChangeRole(value)) {
                                  updateRoleMutation.mutate({ id: item.id, role: value });
                                } else {
                                  toast.error("Only Master Admin can assign this role");
                                }
                              }}
                              disabled={isMasterAdminEmail && !isMasterAdmin}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {isMasterAdmin && (
                                  <SelectItem value="master_admin">
                                    <div className="flex items-center gap-2">
                                      <ShieldCheck className="h-3 w-3 text-purple-500" />
                                      Master Admin
                                    </div>
                                  </SelectItem>
                                )}
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3 text-primary" />
                                    Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="user">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3" />
                                    User
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(item)}
                            disabled={isMasterAdminEmail}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Add Email Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allowed User</DialogTitle>
            <DialogDescription>
              Add an email address to the allowed list. Only these emails can log in.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailError(null);
                }}
              />
              {emailError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={(v: AppRole) => setNewRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isMasterAdmin && (
                    <SelectItem value="master_admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-purple-500" />
                        Master Admin - Full access + user management
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Admin - Full system access
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      User - Limited access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddEmail} 
              disabled={addEmailMutation.isPending}
              className="gap-2"
            >
              {addEmailMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedEmail?.email}</strong> from the allowed list? 
              They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEmail && deleteEmailMutation.mutate(selectedEmail.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmailMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
