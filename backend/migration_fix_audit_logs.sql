-- FIX: Create missing audit_logs table
-- The absence of this table was causing update/insert triggers to fail.

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Audit trail for all data modifications.';
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON public.audit_logs(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(record_id);

-- Ensure RLS is enabled for safety
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_read_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_read_authenticated" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (true);
