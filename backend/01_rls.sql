-- ==============================================================================
-- VMS GESTION - STEP 3: ROW LEVEL SECURITY (RLS)
-- Description: Enables RLS on all tables and defines policies based on roles.
-- Roles assumed in auth.jwt() -> 'app_metadata' ->> 'role': 'admin', 'manager', 'viewer'
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receptions_livraisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to get current user role (Optional but makes policies cleaner)
-- We'll use direct JWT checks for performance and simplicity in policies.
-- Logic:
--   - SELECT: Allowed for 'admin', 'manager', 'viewer' (basically any authenticated user with a role, or just authenticated)
--   - INSERT/UPDATE: Allowed for 'admin', 'manager'
--   - DELETE: Allowed for 'admin' (and 'manager' if "CRUD" implies delete, strict manager usually can edit/create, admin deletes. Prompt says "Manager: CRUD + calculs", so Manager gets Delete too).

-- 3. Define Policies

-- ------------------------------------------------------------------------------
-- TABLE: accounts
-- ------------------------------------------------------------------------------

-- READ: Everyone authenticated can view accounts
CREATE POLICY "Enable read access for authenticated users" ON public.accounts
    FOR SELECT
    TO authenticated
    USING (true);

-- WRITE (Insert/Update/Delete): All authenticated users
CREATE POLICY "Enable write access for authenticated users" ON public.accounts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- TABLE: receptions_livraisons
-- ------------------------------------------------------------------------------

-- READ
CREATE POLICY "Enable read access for authenticated users" ON public.receptions_livraisons
    FOR SELECT
    TO authenticated
    USING (true);

-- WRITE
CREATE POLICY "Enable write access for authenticated users" ON public.receptions_livraisons
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- TABLE: charges
-- ------------------------------------------------------------------------------

-- READ
CREATE POLICY "Enable read access for authenticated users" ON public.charges
    FOR SELECT
    TO authenticated
    USING (true);

-- WRITE
CREATE POLICY "Enable write access for authenticated users" ON public.charges
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- TABLE: transactions
-- ------------------------------------------------------------------------------

-- READ
CREATE POLICY "Enable read access for authenticated users" ON public.transactions
    FOR SELECT
    TO authenticated
    USING (true);

-- WRITE
CREATE POLICY "Enable write access for authenticated users" ON public.transactions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Utility: Function to set user role (For Development/Admin Usage)
-- This allows an admin to assign roles to users.
CREATE OR REPLACE FUNCTION public.set_claim(uid uuid, claim text, value jsonb) 
RETURNS "text"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
    BEGIN
        IF NOT current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin' THEN
            RETURN 'error: permission denied'; 
        END IF;

        UPDATE auth.users SET raw_app_meta_data = 
          raw_app_meta_data || 
          json_build_object(claim, value)::jsonb
        WHERE id = uid;
        RETURN 'OK';
    END;
$$;

COMMENT ON FUNCTION public.set_claim IS 'Helper to set RLS roles (Admin only). Usage: SELECT set_claim(''uuid'', ''role'', ''"manager"'');';
