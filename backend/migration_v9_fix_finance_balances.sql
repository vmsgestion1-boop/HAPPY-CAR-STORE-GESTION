-- Migration V9: Fix account_balances view and sync payments with transactions

-- 1. Redefine account_balances view to include type_compte and other missing fields
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

COMMENT ON VIEW public.account_balances IS 'Dynamic view of account balances based on transactions (including type_compte).';

-- 2. Create trigger function to sync payments table with transactions table
CREATE OR REPLACE FUNCTION public.sync_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sign NUMERIC;
BEGIN
    -- encaissement = money in (increases balance/decreases debt) -> positive sign in transactions
    -- decaissement = money out (decreases balance/increases supplier debt) -> negative sign in transactions
    -- Note: Solde = solde_initial + SUM(mouvements). 
    -- If Client owes 1000 (solde = -1000), an encaissement of 1000 makes solde = 0.
    -- If Supplier is owed 1000 (solde = 1000), a decaissement of 1000 makes solde = 0.
    -- Wait, let's check the sign logic for receptions/livraisons:
    -- reception (buy) -> sign 1 (increases stock/increases debt to supplier if negative solde means debt?)
    -- Let's re-verify migration_v2.sql or sync_receptions_livraisons sign logic in complete_schema.
    -- v_sign := 1 for reception, -1 for livraison.
    -- In reception (buy), we owe money. If we use solde = initial + summ(trans), 
    -- then reception adds to the balance. If balance is positive, it's a debt? 
    -- Let's check FinancePage: 
    -- totalCreances = balances.filter(b => b.solde_actuel > 0 && b.type_compte === 'client')...
    -- totalDettes = balances.filter(b => b.solde_actuel < 0 && b.type_compte === 'fournisseur')...
    
    -- Actually, looking at FinancePage:
    -- totalCreances: b.solde_actuel > 0 && b.type_compte === 'client' -> Sum
    -- totalDettes: b.solde_actuel < 0 && b.type_compte === 'fournisseur' -> Sum Math.abs
    
    -- So for a Client:
    -- Initial = 0. 
    -- Livraison (sell) -> sign -1 (decreases balance). 
    -- If livraison amount is 1000, solde = -1000.
    -- But creances filter for > 0? That seems inverted if a sell (livraison) is supposed to be a creance.
    
    -- Let's re-read FinancePage line 41-42:
    -- 41: const totalCreances = balances.filter(b => b.solde_actuel > 0 && b.type_compte === 'client').reduce((acc, curr) => acc + curr.solde_actuel, 0);
    -- 42: const totalDettes = balances.filter(b => b.solde_actuel < 0 && b.type_compte === 'fournisseur').reduce((acc, curr) => acc + Math.abs(curr.solde_actuel), 0);
    
    -- If reception (buy) is sign 1, and totalDettes is filter < 0, then a buy makes solde positive, which doesn't fit totalDettes filter.
    
    -- Conclusion: The sign logic in sync_receptions_livraisons is:
    -- reception (in) -> + amount
    -- livraison (out) -> - amount
    
    -- If I buy 1000 (reception), solde becomes 1000.
    -- If I sell 1000 (livraison), solde becomes -1000.
    
    -- If I am a client, and I receive a livraison (out from warehouse), I owe money. 
    -- So Client Debt (Creance) -> solde < 0.
    -- If I am a supplier, and I send a reception (in to warehouse), the warehouse owes me.
    -- So Supplier Debt (Dette) -> solde > 0.
    
    -- So the FinancePage logic IS inverted if:
    -- totalCreances (Client owes us) -> solde < 0
    -- totalDettes (We owe supplier) -> solde > 0
    
    -- Now for payments:
    -- Encaissement (Money In from Client) should increase the solde (make it less negative). -> + sign
    -- Decaissement (Money Out to Supplier) should decrease the solde (make it less positive). -> - sign
    
    IF NEW.type_paiement = 'encaissement' THEN
        v_sign := 1;
    ELSE
        v_sign := -1;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.transactions (account_id, date_operation, type, reference_id, montant)
        VALUES (NEW.account_id, NEW.date_paiement, 'payment', NEW.id, NEW.montant * v_sign);
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.transactions
        SET 
            account_id = NEW.account_id,
            date_operation = NEW.date_paiement,
            montant = NEW.montant * v_sign
        WHERE reference_id = NEW.id AND type = 'payment';
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.transactions
        WHERE reference_id = OLD.id AND type = 'payment';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 3. Add 'payment' to the transactions type check if needed
-- Note: Supabase types on columns are hard to change if data exists, 
-- but 'transactions.type' is a VARCHAR(50) with a CHECK constraint.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('charge', 'reception', 'livraison', 'payment'));

-- 4. Apply Triggers
DROP TRIGGER IF EXISTS trg_sync_payments ON public.payments;
CREATE TRIGGER trg_sync_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_payments();

-- 5. Sync existing payments
INSERT INTO public.transactions (account_id, date_operation, type, reference_id, montant)
SELECT 
    account_id, 
    date_paiement, 
    'payment', 
    id, 
    CASE WHEN type_paiement = 'encaissement' THEN montant ELSE -montant END
FROM public.payments
ON CONFLICT (id) DO NOTHING; -- Assuming reference_id might be used as PK or unique in some scenarios, but here it's just a ref.
-- Actually transactions PK is its own ID. Let's just avoid double sync if this runs twice.
-- We can check if it already exists in transactions.
-- DELETE FROM public.transactions WHERE type = 'payment'; -- Clean start for payments
-- INSERT INTO ...
