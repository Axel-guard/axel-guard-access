-- ── CRM Feature Additions ─────────────────────────────────────────────────────

-- 1. Add CRM columns to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'Suspect',
  ADD COLUMN IF NOT EXISTS assigned_to     TEXT,
  ADD COLUMN IF NOT EXISTS source          TEXT DEFAULT 'manual';

-- 2. Lead stage change history
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage  TEXT,
  to_stage    TEXT NOT NULL,
  changed_by  TEXT,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Call logs
CREATE TABLE IF NOT EXISTS public.call_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_code TEXT,
  user_id       UUID REFERENCES auth.users(id),
  user_name     TEXT,
  call_status   TEXT NOT NULL,   -- Connected | Not Connected | Switched Off | Busy
  call_type     TEXT DEFAULT 'Outgoing',  -- Incoming | Outgoing
  call_duration INTEGER DEFAULT 0,        -- seconds
  disposition   TEXT,            -- Interested | Not Interested | Call Back Later | Wrong Number | Converted
  notes         TEXT,
  stage_at_call TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 4. Follow-ups
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_code   TEXT,
  call_log_id     UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME,
  assigned_to     TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'Pending',   -- Pending | Completed | Missed
  completed_at    TIMESTAMPTZ,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id     ON public.call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_code ON public.call_logs(customer_code);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at  ON public.call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id    ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled  ON public.follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned   ON public.follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_stage_history_lead_id ON public.lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage  ON public.leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to     ON public.leads(assigned_to);

-- 6. RLS
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_stage_history" ON public.lead_stage_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_call_logs" ON public.call_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_follow_ups" ON public.follow_ups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
