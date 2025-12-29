-- ==============================================================================
-- VMS GESTION - STEP 4: BUSINESS LOGIC (VIEWS + RPC)
-- Description: Replaces Excel formulas with SQL Views and Functions.
-- ==============================================================================

-- 1. View: account_balance_view
-- Calculates the current balance for every account dynamically.
-- Formula: solde_initial + total_receptions - total_livraisons - total_charges
-- Note: 'transactions' table is the source of truth if populated.
-- If 'transactions' is NOT yet fully populated (before triggers step), we could join sub-tables.
-- PROMPT REQUIREMENT: "Basé sur transactions" -> "Recalcul automatique après chaque insertion"
-- However, we haven't built the populate triggers yet (Step 5).
-- To be safe and compliant with the "Transactions" approach, we will build the view on 'transactions'.
-- BUT, for the view to work NOW, we need data in 'transactions'. 
-- We will assume 'transactions' are the source.

CREATE OR REPLACE VIEW public.account_balances AS
SELECT 
    a.id as account_id,
    a.code_compte,
    a.nom_compte,
    a.solde_initial,
    COALESCE(SUM(t.montant), 0) as total_mouvements,
    (a.solde_initial + COALESCE(SUM(t.montant), 0)) as solde_actuel,
    MAX(t.date_operation) as derniere_operation
FROM 
    public.accounts a
LEFT JOIN 
    public.transactions t ON a.id = t.account_id
GROUP BY 
    a.id, a.code_compte, a.nom_compte, a.solde_initial;

COMMENT ON VIEW public.account_balances IS 'Dynamic view of account balances based on transactions.';

-- 2. RPC: calculate_account_balance(account_id)
-- Returns the specific balance for one account. Useful for UI fetching.
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

COMMENT ON FUNCTION public.calculate_account_balance IS 'Returns current balance for a specific account.';

-- 3. RPC: get_account_statement(account_id, date_from, date_to)
-- Generates the statement (relevé) with running balance.
-- This corresponds to "Relevé de compte ... Solde cumulatif ligne par ligne".

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
    description TEXT, -- Added for UI readability (we might need to join to get desc)
    montant NUMERIC,
    solde_cumule NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_solde_initial_periode NUMERIC := 0;
BEGIN
    -- 1. Calculate balance BEFORE the period start date (to set initial running balance)
    -- We assume solde_initial (from account) + all transactions strictly before p_date_from
    IF p_date_from IS NOT NULL THEN
        SELECT 
            (a.solde_initial + COALESCE(SUM(t.montant), 0))
        INTO v_solde_initial_periode
        FROM public.accounts a
        LEFT JOIN public.transactions t ON a.id = t.account_id AND t.date_operation < p_date_from
        WHERE a.id = p_account_id
        GROUP BY a.id;
    ELSE
        -- If no start date, start from account's initial balance
        SELECT solde_initial INTO v_solde_initial_periode FROM public.accounts WHERE id = p_account_id;
    END IF;

    -- Handle case where account has no transactions or doesn't exist found (null check)
    v_solde_initial_periode := COALESCE(v_solde_initial_periode, 0);

    -- 2. Return the rows with running sum
    RETURN QUERY
    WITH trans_data AS (
        SELECT 
            t.id,
            t.date_operation,
            t.type,
            t.reference_id,
            t.montant,
            -- Fetches description based on type. 
            -- Note: in a real big app, this join might be heavy, but fits requirements.
            CASE 
                WHEN t.type = 'charge' THEN (SELECT c.description FROM public.charges c WHERE c.id = t.reference_id LIMIT 1)
                WHEN t.type IN ('reception', 'livraison') THEN (SELECT 'Qté: ' || rl.quantite || ' @ ' || rl.prix_unitaire FROM public.receptions_livraisons rl WHERE rl.id = t.reference_id LIMIT 1)
                ELSE 'Operation'
            END as desc_text
        FROM 
            public.transactions t
        WHERE 
            t.account_id = p_account_id
            AND (p_date_from IS NULL OR t.date_operation >= p_date_from)
            AND (p_date_to IS NULL OR t.date_operation <= p_date_to)
    )
    SELECT 
        id,
        date_operation,
        type::VARCHAR,
        reference_id,
        COALESCE(desc_text, 'N/A'),
        montant,
        (v_solde_initial_periode + SUM(montant) OVER (ORDER BY date_operation ASC, id ASC))::NUMERIC as solde_cumule
    FROM trans_data
    ORDER BY date_operation ASC, id ASC;
END;
$$;

COMMENT ON FUNCTION public.get_account_statement IS 'Generates account statement with running balance (Solde cumulatif).';
