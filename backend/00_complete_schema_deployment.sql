-- ==============================================================================
-- VMS GESTION - COMPLETE SCHEMA & DEPLOYMENT
-- Description: Full Supabase PostgreSQL setup (Tables, RLS, Views, RPC, Triggers, Audit)
-- Order: Extensions -> Types -> Tables -> RLS -> Views -> RPC -> Triggers -> Audit
-- ==============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS & INITIAL SETUP
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 2: TABLES (Core Schema)
-- ============================================================================

-- TABLE: accounts
-- Represents clients, suppliers, or internal accounts.
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_compte TEXT NOT NULL,
    nom_compte TEXT NOT NULL,
    type_compte VARCHAR(50) NOT NULL CHECK (type_compte IN ('client', 'fournisseur', 'interne')),
    solde_initial NUMERIC(15,2) NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT accounts_code_compte_key UNIQUE (code_compte)
);
COMMENT ON TABLE public.accounts IS 'Main accounts table (Clients/Suppliers/Internal).';
CREATE INDEX IF NOT EXISTS idx_accounts_code ON public.accounts(code_compte);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type_compte);
CREATE INDEX IF NOT EXISTS idx_accounts_actif ON public.accounts(actif);

-- TABLE: receptions_livraisons
-- Handles physical stock movements (Buying/Selling).
CREATE TABLE IF NOT EXISTS public.receptions_livraisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    date_operation TIMESTAMPTZ NOT NULL,
    type_operation TEXT NOT NULL CHECK (type_operation IN ('reception', 'livraison')),
    quantite NUMERIC(15,2) NOT NULL CHECK (quantite > 0),
    prix_unitaire NUMERIC(15,2) NOT NULL CHECK (prix_unitaire >= 0),
    montant NUMERIC(15,2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.receptions_livraisons IS 'Physical stock operations with calculated amounts.';
CREATE INDEX IF NOT EXISTS idx_receptions_livraisons_account_id ON public.receptions_livraisons(account_id);
CREATE INDEX IF NOT EXISTS idx_receptions_livraisons_date ON public.receptions_livraisons(date_operation);
CREATE INDEX IF NOT EXISTS idx_receptions_livraisons_type ON public.receptions_livraisons(type_operation);

-- TABLE: charges
-- Handles other financial movements.
CREATE TABLE IF NOT EXISTS public.charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    date_charge TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    montant NUMERIC(15,2) NOT NULL CHECK (montant > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.charges IS 'Financial charges and other expenses.';
CREATE INDEX IF NOT EXISTS idx_charges_account_id ON public.charges(account_id);
CREATE INDEX IF NOT EXISTS idx_charges_date ON public.charges(date_charge);

-- TABLE: transactions
-- Unified journal for all operations (populated via triggers).
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    date_operation TIMESTAMPTZ NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('charge', 'reception', 'livraison')),
    reference_id UUID NOT NULL,
    montant NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.transactions IS 'Unified transaction journal for easy balance calculation.';
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date_operation);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- TABLE: audit_logs
-- Centralized audit trail for all changes.
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

-- ============================================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receptions_livraisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'viewer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES: accounts

-- READ: Everyone authenticated can view accounts
DROP POLICY IF EXISTS "accounts_read_authenticated" ON public.accounts;
CREATE POLICY "accounts_read_authenticated" ON public.accounts
    FOR SELECT
    TO authenticated
    USING (true);

-- WRITE: Admin and Manager only
DROP POLICY IF EXISTS "accounts_write_admin_manager" ON public.accounts;
CREATE POLICY "accounts_write_admin_manager" ON public.accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "accounts_update_admin_manager" ON public.accounts;
CREATE POLICY "accounts_update_admin_manager" ON public.accounts
    FOR UPDATE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'manager'))
    WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "accounts_delete_admin_only" ON public.accounts;
CREATE POLICY "accounts_delete_admin_only" ON public.accounts
    FOR DELETE
    TO authenticated
    USING (public.get_user_role() = 'admin');

-- RLS POLICIES: receptions_livraisons

DROP POLICY IF EXISTS "rl_read_authenticated" ON public.receptions_livraisons;
CREATE POLICY "rl_read_authenticated" ON public.receptions_livraisons
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "rl_write_admin_manager" ON public.receptions_livraisons;
CREATE POLICY "rl_write_admin_manager" ON public.receptions_livraisons
    FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "rl_update_admin_manager" ON public.receptions_livraisons;
CREATE POLICY "rl_update_admin_manager" ON public.receptions_livraisons
    FOR UPDATE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'manager'))
    WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "rl_delete_admin_only" ON public.receptions_livraisons;
CREATE POLICY "rl_delete_admin_only" ON public.receptions_livraisons
    FOR DELETE
    TO authenticated
    USING (public.get_user_role() = 'admin');

-- RLS POLICIES: charges

DROP POLICY IF EXISTS "charges_read_authenticated" ON public.charges;
CREATE POLICY "charges_read_authenticated" ON public.charges
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "charges_write_admin_manager" ON public.charges;
CREATE POLICY "charges_write_admin_manager" ON public.charges
    FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "charges_update_admin_manager" ON public.charges;
CREATE POLICY "charges_update_admin_manager" ON public.charges
    FOR UPDATE
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'manager'))
    WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "charges_delete_admin_only" ON public.charges;
CREATE POLICY "charges_delete_admin_only" ON public.charges
    FOR DELETE
    TO authenticated
    USING (public.get_user_role() = 'admin');

-- RLS POLICIES: transactions (Mostly read-only, populated by system)

DROP POLICY IF EXISTS "transactions_read_authenticated" ON public.transactions;
CREATE POLICY "transactions_read_authenticated" ON public.transactions
    FOR SELECT
    TO authenticated
    USING (true);

-- Only system triggers/admin can insert directly
DROP POLICY IF EXISTS "transactions_write_admin_only" ON public.transactions;
CREATE POLICY "transactions_write_admin_only" ON public.transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role() = 'admin');

-- RLS POLICIES: audit_logs (Read-only for authenticated)

DROP POLICY IF EXISTS "audit_logs_read_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_read_authenticated" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admin can view audit logs
DROP POLICY IF EXISTS "audit_logs_read_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_read_admin_only" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.get_user_role() = 'admin');

-- ============================================================================
-- SECTION 4: VIEWS & BUSINESS LOGIC
-- ============================================================================

-- VIEW: account_balances
-- Calculates the current balance for every account.
-- Formula: solde_initial + total_receptions - total_livraisons - total_charges
DROP VIEW IF EXISTS public.account_balances CASCADE;
CREATE OR REPLACE VIEW public.account_balances AS
SELECT 
    a.id as account_id,
    a.code_compte,
    a.nom_compte,
    a.type_compte,
    a.solde_initial,
    COALESCE(SUM(t.montant), 0) as total_mouvements,
    (a.solde_initial + COALESCE(SUM(t.montant), 0)) as solde_actuel,
    MAX(t.date_operation) as derniere_operation,
    a.actif,
    a.created_at
FROM 
    public.accounts a
LEFT JOIN 
    public.transactions t ON a.id = t.account_id
GROUP BY 
    a.id, a.code_compte, a.nom_compte, a.type_compte, a.solde_initial, a.actif, a.created_at;

COMMENT ON VIEW public.account_balances IS 'Dynamic view of account balances based on transactions.';

-- ============================================================================
-- SECTION 5: RPC FUNCTIONS (Business Logic)
-- ============================================================================

-- RPC: calculate_account_balance
-- Returns the specific balance for one account.
CREATE OR REPLACE FUNCTION public.calculate_account_balance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT solde_actuel INTO v_balance
    FROM public.account_balances
    WHERE account_id = p_account_id;
    
    RETURN COALESCE(v_balance, 0);
END;
$$;

COMMENT ON FUNCTION public.calculate_account_balance(UUID) IS 'Returns current balance for a specific account.';

-- RPC: get_account_statement
-- Generates the statement (relevé) with running balance.
CREATE OR REPLACE FUNCTION public.get_account_statement(
    p_account_id UUID,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    transaction_id UUID,
    date_operation TIMESTAMPTZ,
    type_operation VARCHAR,
    reference_id UUID,
    montant NUMERIC,
    solde_cumule NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_solde_initial_periode NUMERIC := 0;
BEGIN
    -- 1. Calculate balance BEFORE the period start date
    IF p_date_from IS NOT NULL THEN
        SELECT 
            (a.solde_initial + COALESCE(SUM(t.montant), 0))
        INTO v_solde_initial_periode
        FROM public.accounts a
        LEFT JOIN public.transactions t ON a.id = t.account_id AND t.date_operation < p_date_from
        WHERE a.id = p_account_id
        GROUP BY a.id;
    ELSE
        SELECT solde_initial INTO v_solde_initial_periode FROM public.accounts WHERE id = p_account_id;
    END IF;

    v_solde_initial_periode := COALESCE(v_solde_initial_periode, 0);

    -- 2. Return rows with running sum
    RETURN QUERY
    WITH trans_data AS (
        SELECT 
            t.id,
            t.date_operation,
            t.type,
            t.reference_id,
            t.montant
        FROM public.transactions t
        WHERE t.account_id = p_account_id
            AND (p_date_from IS NULL OR t.date_operation >= p_date_from)
            AND (p_date_to IS NULL OR t.date_operation <= p_date_to)
        ORDER BY t.date_operation ASC, t.created_at ASC
    )
    SELECT 
        td.id,
        td.date_operation,
        td.type,
        td.reference_id,
        td.montant,
        v_solde_initial_periode + SUM(td.montant) OVER (ORDER BY td.date_operation, td.id) as solde_cumule
    FROM trans_data td;
END;
$$;

COMMENT ON FUNCTION public.get_account_statement(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Generates account statement with running balance.';

-- RPC: get_dashboard_summary
-- Returns global summary (total accounts, total balance, recent operations).
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS TABLE (
    total_accounts INT,
    total_balance NUMERIC,
    total_receptions NUMERIC,
    total_livraisons NUMERIC,
    total_charges NUMERIC,
    active_accounts INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT a.id)::INT as total_accounts,
        COALESCE(SUM(ab.solde_actuel), 0) as total_balance,
        COALESCE(SUM(CASE WHEN t.type = 'reception' THEN t.montant ELSE 0 END), 0) as total_receptions,
        COALESCE(SUM(CASE WHEN t.type = 'livraison' THEN ABS(t.montant) ELSE 0 END), 0) as total_livraisons,
        COALESCE(SUM(CASE WHEN t.type = 'charge' THEN ABS(t.montant) ELSE 0 END), 0) as total_charges,
        COUNT(DISTINCT CASE WHEN a.actif = true THEN a.id END)::INT as active_accounts
    FROM public.accounts a
    LEFT JOIN public.account_balances ab ON a.id = ab.account_id
    LEFT JOIN public.transactions t ON a.id = t.account_id;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_summary() IS 'Returns global financial summary.';

-- ============================================================================
-- SECTION 6: TRIGGERS & AUTOMATION
-- ============================================================================

-- Trigger Function: sync_receptions_livraisons
-- Automatically populates transactions table.
CREATE OR REPLACE FUNCTION public.sync_receptions_livraisons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sign NUMERIC;
BEGIN
    IF NEW.type_operation = 'reception' THEN
        v_sign := 1;
    ELSE
        v_sign := -1;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.transactions (account_id, date_operation, type, reference_id, montant)
        VALUES (NEW.account_id, NEW.date_operation, NEW.type_operation, NEW.id, NEW.montant * v_sign);
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.transactions
        SET 
            account_id = NEW.account_id,
            date_operation = NEW.date_operation,
            montant = NEW.montant * v_sign
        WHERE reference_id = NEW.id AND type IN ('reception', 'livraison');
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.transactions
        WHERE reference_id = OLD.id AND type IN ('reception', 'livraison');
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Trigger Function: sync_charges
-- Automatically populates transactions table for charges.
CREATE OR REPLACE FUNCTION public.sync_charges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.transactions (account_id, date_operation, type, reference_id, montant)
        VALUES (NEW.account_id, NEW.date_charge, 'charge', NEW.id, -NEW.montant);
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.transactions
        SET 
            account_id = NEW.account_id,
            date_operation = NEW.date_charge,
            montant = -NEW.montant
        WHERE reference_id = NEW.id AND type = 'charge';
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.transactions
        WHERE reference_id = OLD.id AND type = 'charge';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Apply Triggers
DROP TRIGGER IF EXISTS trg_sync_rl ON public.receptions_livraisons;
CREATE TRIGGER trg_sync_rl
AFTER INSERT OR UPDATE OR DELETE ON public.receptions_livraisons
FOR EACH ROW EXECUTE FUNCTION public.sync_receptions_livraisons();

DROP TRIGGER IF EXISTS trg_sync_charges ON public.charges;
CREATE TRIGGER trg_sync_charges
AFTER INSERT OR UPDATE OR DELETE ON public.charges
FOR EACH ROW EXECUTE FUNCTION public.sync_charges();

-- ============================================================================
-- SECTION 7: AUDIT LOGGING
-- ============================================================================

-- Trigger Function: audit_trigger
-- Logs all changes to audit_logs table.
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, operation, record_id, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), NULL, auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, operation, record_id, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, operation, record_id, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, NULL, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit Triggers
DROP TRIGGER IF EXISTS audit_accounts ON public.accounts;
CREATE TRIGGER audit_accounts
AFTER INSERT OR UPDATE OR DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_rl ON public.receptions_livraisons;
CREATE TRIGGER audit_rl
AFTER INSERT OR UPDATE OR DELETE ON public.receptions_livraisons
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_charges ON public.charges;
CREATE TRIGGER audit_charges
AFTER INSERT OR UPDATE OR DELETE ON public.charges
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============================================================================
-- SECTION 8: FINAL CONFIRMATION
-- ============================================================================

-- Schema deployment completed successfully.
-- Next steps:
--   1. Deploy this SQL to Supabase
--   2. Test RLS policies
--   3. Run import script (import_vms.ts)
--   4. Deploy Next.js frontend
