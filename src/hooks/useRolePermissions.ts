import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AppPermission =
  // Dashboard & Reports
  | "dashboard_view" | "reports_view"
  // Sales
  | "sale_view" | "sale_edit" | "sale_delete"
  // Quotations
  | "quotation_view" | "quotation_approve"
  // Inventory
  | "inventory_view" | "inventory_add" | "inventory_edit" | "inventory_delete"
  // Leads / Customers
  | "lead_view" | "lead_edit" | "lead_delete"
  // Tickets
  | "tickets_view" | "ticket_create" | "ticket_close";

export const ALL_PERMISSIONS: { key: AppPermission; label: string; description: string; group: string }[] = [
  // ── Dashboard & Reports ──────────────────────────────────────────────────
  { key: "dashboard_view",    label: "View Dashboard",       description: "Access the main dashboard",                     group: "Dashboard & Reports" },
  { key: "reports_view",      label: "View Reports",         description: "Access reports & analytics module",             group: "Dashboard & Reports" },
  // ── Sales ────────────────────────────────────────────────────────────────
  { key: "sale_view",         label: "View Sales",           description: "Access the sales module",                       group: "Sales" },
  { key: "sale_edit",         label: "Edit Sales",           description: "Edit existing sales records",                   group: "Sales" },
  { key: "sale_delete",       label: "Delete Sales",         description: "Delete sales records",                          group: "Sales" },
  // ── Quotations ───────────────────────────────────────────────────────────
  { key: "quotation_view",    label: "View Quotations",      description: "Access the quotations module",                  group: "Quotations" },
  { key: "quotation_approve", label: "Approve Quotations",   description: "Approve pending quotations",                    group: "Quotations" },
  // ── Inventory ────────────────────────────────────────────────────────────
  { key: "inventory_view",    label: "View Inventory",       description: "Access the inventory module",                   group: "Inventory" },
  { key: "inventory_add",     label: "Add Inventory",        description: "Add new inventory items",                       group: "Inventory" },
  { key: "inventory_edit",    label: "Edit Inventory",       description: "Edit existing inventory items",                 group: "Inventory" },
  { key: "inventory_delete",  label: "Delete Inventory",     description: "Delete inventory items",                        group: "Inventory" },
  // ── Leads / Customers ────────────────────────────────────────────────────
  { key: "lead_view",         label: "View Leads",           description: "Access leads & customers database",             group: "Leads / Customers" },
  { key: "lead_edit",         label: "Edit Leads",           description: "Edit lead / customer records",                  group: "Leads / Customers" },
  { key: "lead_delete",       label: "Delete Leads",         description: "Delete lead records",                           group: "Leads / Customers" },
  // ── Tickets ──────────────────────────────────────────────────────────────
  { key: "tickets_view",      label: "View Tickets",         description: "Access the tickets / tasks module",             group: "Tickets" },
  { key: "ticket_create",     label: "Create Tickets",       description: "Create new tickets and assign to team members", group: "Tickets" },
  { key: "ticket_close",      label: "Close Tickets",        description: "Close / resolve tickets",                       group: "Tickets" },
];

export type PermissionRole = "user" | "manager" | "admin";
export const PERMISSION_ROLES: { key: PermissionRole; label: string }[] = [
  { key: "user",    label: "User" },
  { key: "manager", label: "Manager" },
  { key: "admin",   label: "Admin" },
];

export interface RolePermission {
  id: string;
  role: string;
  permission: string;
  granted: boolean;
}

// ─── Hardcoded defaults (used when DB table doesn't exist yet) ─────────────────
const DEFAULT_PERMISSIONS: RolePermission[] = [
  // ── user ──────────────────────────────────────────────────────────────────
  { id: "d1",  role: "user",    permission: "dashboard_view",   granted: true  },
  { id: "d2",  role: "user",    permission: "reports_view",     granted: true  },
  { id: "d3",  role: "user",    permission: "sale_view",        granted: true  },
  { id: "d4",  role: "user",    permission: "sale_edit",        granted: false },
  { id: "d5",  role: "user",    permission: "sale_delete",      granted: false },
  { id: "d6",  role: "user",    permission: "quotation_view",   granted: true  },
  { id: "d7",  role: "user",    permission: "quotation_approve",granted: false },
  { id: "d8",  role: "user",    permission: "inventory_view",   granted: true  },
  { id: "d9",  role: "user",    permission: "inventory_add",    granted: false },
  { id: "d10", role: "user",    permission: "inventory_edit",   granted: false },
  { id: "d11", role: "user",    permission: "inventory_delete", granted: false },
  { id: "d12", role: "user",    permission: "lead_view",        granted: true  },
  { id: "d13", role: "user",    permission: "lead_edit",        granted: false },
  { id: "d14", role: "user",    permission: "lead_delete",      granted: false },
  { id: "d15", role: "user",    permission: "tickets_view",     granted: true  },
  { id: "d16", role: "user",    permission: "ticket_create",    granted: false },
  { id: "d17", role: "user",    permission: "ticket_close",     granted: false },
  // ── manager ───────────────────────────────────────────────────────────────
  { id: "d18", role: "manager", permission: "dashboard_view",   granted: true  },
  { id: "d19", role: "manager", permission: "reports_view",     granted: true  },
  { id: "d20", role: "manager", permission: "sale_view",        granted: true  },
  { id: "d21", role: "manager", permission: "sale_edit",        granted: true  },
  { id: "d22", role: "manager", permission: "sale_delete",      granted: false },
  { id: "d23", role: "manager", permission: "quotation_view",   granted: true  },
  { id: "d24", role: "manager", permission: "quotation_approve",granted: false },
  { id: "d25", role: "manager", permission: "inventory_view",   granted: true  },
  { id: "d26", role: "manager", permission: "inventory_add",    granted: true  },
  { id: "d27", role: "manager", permission: "inventory_edit",   granted: false },
  { id: "d28", role: "manager", permission: "inventory_delete", granted: false },
  { id: "d29", role: "manager", permission: "lead_view",        granted: true  },
  { id: "d30", role: "manager", permission: "lead_edit",        granted: true  },
  { id: "d31", role: "manager", permission: "lead_delete",      granted: false },
  { id: "d32", role: "manager", permission: "tickets_view",     granted: true  },
  { id: "d33", role: "manager", permission: "ticket_create",    granted: true  },
  { id: "d34", role: "manager", permission: "ticket_close",     granted: false },
  // ── admin ─────────────────────────────────────────────────────────────────
  { id: "d35", role: "admin",   permission: "dashboard_view",   granted: true  },
  { id: "d36", role: "admin",   permission: "reports_view",     granted: true  },
  { id: "d37", role: "admin",   permission: "sale_view",        granted: true  },
  { id: "d38", role: "admin",   permission: "sale_edit",        granted: true  },
  { id: "d39", role: "admin",   permission: "sale_delete",      granted: true  },
  { id: "d40", role: "admin",   permission: "quotation_view",   granted: true  },
  { id: "d41", role: "admin",   permission: "quotation_approve",granted: true  },
  { id: "d42", role: "admin",   permission: "inventory_view",   granted: true  },
  { id: "d43", role: "admin",   permission: "inventory_add",    granted: true  },
  { id: "d44", role: "admin",   permission: "inventory_edit",   granted: true  },
  { id: "d45", role: "admin",   permission: "inventory_delete", granted: true  },
  { id: "d46", role: "admin",   permission: "lead_view",        granted: true  },
  { id: "d47", role: "admin",   permission: "lead_edit",        granted: true  },
  { id: "d48", role: "admin",   permission: "lead_delete",      granted: true  },
  { id: "d49", role: "admin",   permission: "tickets_view",     granted: true  },
  { id: "d50", role: "admin",   permission: "ticket_create",    granted: true  },
  { id: "d51", role: "admin",   permission: "ticket_close",     granted: true  },
];

const LS_KEY = "axelguard_role_permissions";

function loadLocalPermissions(): RolePermission[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as RolePermission[];
  } catch { /* ignore */ }
  return DEFAULT_PERMISSIONS;
}

function saveLocalPermissions(perms: RolePermission[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(perms)); } catch { /* ignore */ }
}

// ─── Detect if a Supabase error means the table doesn't exist ────────────────
function isTableMissing(error: unknown): boolean {
  if (!error) return false;
  const msg = (error as { message?: string }).message || String(error);
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("relation") ||
    msg.includes("42P01") // PostgreSQL "undefined_table" code
  );
}

// ─── Attempt to create the table via SQL if possible ─────────────────────────
async function tryCreateTable(): Promise<boolean> {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS public.role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        role text NOT NULL,
        permission text NOT NULL,
        granted boolean NOT NULL DEFAULT false,
        updated_at timestamptz DEFAULT now(),
        UNIQUE(role, permission)
      );
      ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'anyone_read_role_permissions') THEN
          EXECUTE 'CREATE POLICY anyone_read_role_permissions ON public.role_permissions FOR SELECT USING (true)';
        END IF;
      END $$;
      INSERT INTO public.role_permissions (role, permission, granted) VALUES
        ('user','quotation_approve',false),('user','sale_edit',false),('user','sale_delete',false),('user','lead_delete',false),
        ('manager','quotation_approve',false),('manager','sale_edit',true),('manager','sale_delete',false),('manager','lead_delete',false),
        ('admin','quotation_approve',true),('admin','sale_edit',true),('admin','sale_delete',true),('admin','lead_delete',true)
      ON CONFLICT (role, permission) DO NOTHING;
    `;
    // Try via RPC if the function exists
    const { error } = await supabase.rpc("exec_sql" as any, { sql });
    return !error;
  } catch {
    return false;
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useRolePermissions = () => {
  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: async (): Promise<RolePermission[]> => {
      const { data, error } = await supabase
        .from("role_permissions" as any)
        .select("*");

      if (error) {
        if (isTableMissing(error)) {
          // Table not yet created — try to create it, then return local defaults
          await tryCreateTable();
          return loadLocalPermissions();
        }
        throw error;
      }

      const rows = (data ?? []) as RolePermission[];
      if (rows.length === 0) {
        // Table exists but empty — return local cache or defaults
        return loadLocalPermissions();
      }

      // Sync to localStorage so offline/fallback works
      saveLocalPermissions(rows);
      return rows;
    },
    // Don't retry on table-missing — just use defaults
    retry: (failureCount, error) => {
      if (isTableMissing(error)) return false;
      return failureCount < 2;
    },
  });
};

export const useUpdateRolePermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role, permission, granted }: { role: string; permission: string; granted: boolean }) => {
      // Always update local cache first so UI is instant
      const current = loadLocalPermissions();
      const idx = current.findIndex((p) => p.role === role && p.permission === permission);
      const updated: RolePermission[] = idx >= 0
        ? current.map((p, i) => (i === idx ? { ...p, granted } : p))
        : [...current, { id: `local-${Date.now()}`, role, permission, granted }];
      saveLocalPermissions(updated);

      // Optimistically update the query cache
      queryClient.setQueryData<RolePermission[]>(["role-permissions"], updated);

      // Try to persist to DB (non-blocking)
      const { error } = await supabase
        .from("role_permissions" as any)
        .upsert({ role, permission, granted, updated_at: new Date().toISOString() }, { onConflict: "role,permission" });

      if (error && !isTableMissing(error)) {
        // DB error that's NOT a missing table — still saved locally, warn user
        console.warn("Could not sync permission to DB:", error.message);
        toast.warning("Permission saved locally. DB sync pending — run the migration to persist across devices.");
      }
    },
    onError: (err: Error) => {
      if (!isTableMissing(err)) toast.error(err.message || "Failed to update permission");
    },
  });
};

/** Returns true if the current user has the given permission */
export const useHasPermission = (permission: AppPermission): boolean => {
  const { role, isMasterAdmin } = useAuth();
  const { data: permissions = [] } = useRolePermissions();

  if (isMasterAdmin) return true;
  if (!role) return false;

  // Use live data first, fall back to localStorage
  const source = permissions.length > 0 ? permissions : loadLocalPermissions();
  const perm = source.find((p) => p.role === role && p.permission === permission);
  return perm?.granted ?? false;
};

/** True if the DB table exists (detected from the last successful fetch) */
export const usePermissionsTableExists = (): boolean => {
  const { data, isError, error } = useRolePermissions();
  if (isError && isTableMissing(error)) return false;
  return Array.isArray(data);
};
