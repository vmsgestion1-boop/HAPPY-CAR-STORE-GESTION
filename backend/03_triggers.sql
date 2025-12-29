-- ==============================================================================
-- VMS GESTION - STEP 5: TRIGGERS & AUTOMATION
-- Description: Automates the population of the 'transactions' table.
-- Logic:
--   - Receptions (+): Adds to balance
--   - Livraisons (-): Subtracts from balance
--   - Charges (-): Subtracts from balance
-- ==============================================================================

-- 1. Trigger Function for Receptions / Livraisons
CREATE OR REPLACE FUNCTION public.sync_receptions_livraisons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sign NUMERIC;
BEGIN
    -- Determine Sign based on type and Prompt Formula
    -- Formula: Solde = Initial + Receptions - Livraisons - Charges
    -- Receptions -> Positive (+)
    -- Livraisons -> Negative (-)
    
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.type_operation = 'reception' THEN
            v_sign := 1;
        ELSE
            v_sign := -1;
        END IF;
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
            type = NEW.type_operation,
            montant = NEW.montant * v_sign,
            created_at = now() -- Update timestamp to show modification
        WHERE reference_id = OLD.id AND type IN ('reception', 'livraison');
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.transactions
        WHERE reference_id = OLD.id AND type IN ('reception', 'livraison');
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 2. Trigger Function for Charges
CREATE OR REPLACE FUNCTION public.sync_charges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Charges are always Negative (-) in the formula.
    
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.transactions (account_id, date_operation, type, reference_id, montant)
        VALUES (NEW.account_id, NEW.date_charge, 'charge', NEW.id, -ABS(NEW.montant)); 
        -- Ensure negative, assuming montant is stored positive. Using ABS to be safe.
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.transactions
        SET 
            account_id = NEW.account_id,
            date_operation = NEW.date_charge,
            montant = -ABS(NEW.montant)
        WHERE reference_id = OLD.id AND type = 'charge';
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.transactions
        WHERE reference_id = OLD.id AND type = 'charge';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 3. Apply Triggers

-- Receptions / Livraisons
DROP TRIGGER IF EXISTS trg_sync_rl ON public.receptions_livraisons;
CREATE TRIGGER trg_sync_rl
AFTER INSERT OR UPDATE OR DELETE ON public.receptions_livraisons
FOR EACH ROW EXECUTE FUNCTION public.sync_receptions_livraisons();

-- Charges
DROP TRIGGER IF EXISTS trg_sync_charges ON public.charges;
CREATE TRIGGER trg_sync_charges
AFTER INSERT OR UPDATE OR DELETE ON public.charges
FOR EACH ROW EXECUTE FUNCTION public.sync_charges();

COMMENT ON FUNCTION public.sync_receptions_livraisons IS 'Syncs Receptions (+) and Livraisons (-) to transactions.';
COMMENT ON FUNCTION public.sync_charges IS 'Syncs Charges (-) to transactions.';
