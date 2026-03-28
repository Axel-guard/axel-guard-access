-- Role permissions table: master admin configures what each role can do
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, permission)
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone can read permissions (needed for frontend enforcement)
CREATE POLICY "anyone_read_role_permissions"
  ON role_permissions FOR SELECT USING (true);

-- Only master admin can modify
CREATE POLICY "master_admin_write_role_permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND role = 'master_admin'
    )
  );

-- Seed default permissions
INSERT INTO role_permissions (role, permission, granted) VALUES
  -- ── user ──────────────────────────────────────────────────────────────────
  ('user', 'dashboard_view',    true),
  ('user', 'reports_view',      true),
  ('user', 'sale_view',         true),
  ('user', 'sale_edit',         false),
  ('user', 'sale_delete',       false),
  ('user', 'quotation_view',    true),
  ('user', 'quotation_approve', false),
  ('user', 'inventory_view',    true),
  ('user', 'inventory_add',     false),
  ('user', 'inventory_edit',    false),
  ('user', 'inventory_delete',  false),
  ('user', 'lead_view',         true),
  ('user', 'lead_edit',         false),
  ('user', 'lead_delete',       false),
  ('user', 'tickets_view',      true),
  ('user', 'ticket_create',     false),
  ('user', 'ticket_close',      false),
  -- ── manager ───────────────────────────────────────────────────────────────
  ('manager', 'dashboard_view',    true),
  ('manager', 'reports_view',      true),
  ('manager', 'sale_view',         true),
  ('manager', 'sale_edit',         true),
  ('manager', 'sale_delete',       false),
  ('manager', 'quotation_view',    true),
  ('manager', 'quotation_approve', false),
  ('manager', 'inventory_view',    true),
  ('manager', 'inventory_add',     true),
  ('manager', 'inventory_edit',    false),
  ('manager', 'inventory_delete',  false),
  ('manager', 'lead_view',         true),
  ('manager', 'lead_edit',         true),
  ('manager', 'lead_delete',       false),
  ('manager', 'tickets_view',      true),
  ('manager', 'ticket_create',     true),
  ('manager', 'ticket_close',      false),
  -- ── admin ─────────────────────────────────────────────────────────────────
  ('admin', 'dashboard_view',    true),
  ('admin', 'reports_view',      true),
  ('admin', 'sale_view',         true),
  ('admin', 'sale_edit',         true),
  ('admin', 'sale_delete',       true),
  ('admin', 'quotation_view',    true),
  ('admin', 'quotation_approve', true),
  ('admin', 'inventory_view',    true),
  ('admin', 'inventory_add',     true),
  ('admin', 'inventory_edit',    true),
  ('admin', 'inventory_delete',  true),
  ('admin', 'lead_view',         true),
  ('admin', 'lead_edit',         true),
  ('admin', 'lead_delete',       true),
  ('admin', 'tickets_view',      true),
  ('admin', 'ticket_create',     true),
  ('admin', 'ticket_close',      true)
ON CONFLICT (role, permission) DO NOTHING;
