-- ==============================================================================
-- VMS GESTION - SUPABASE INITIAL SCHEMA
-- Description: Creates the core tables for the VMS Gestion application.
-- Order: ENUMs -> Tables -> Indexes
-- Note: RLS policies are NOT included here (Step 3).
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled (Supabase default usually has it)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define Custom Types (Enums)
-- We use CHECK constraints in tables for flexibility, but Enums can be useful for strict typing if preferred.
-- Here we will use TEXT with CHECK constraints as per Step 1 plan for maximum compatibility and simplicity.

-- 3. Create Tables

-- TABLE: accounts
-- Represents clients, suppliers, or internal accounts.
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_compte TEXT NOT NULL,
    nom_compte TEXT NOT NULL,
    type_compte VARCHAR(50) NOT NULL, -- e.g., 'client', 'fournisseur'
    solde_initial NUMERIC(15,2) NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT accounts_code_compte_key UNIQUE (code_compte)
);

COMMENT ON TABLE public.accounts IS 'Main accounts table (Clients/Suppliers/Internal).';

-- TABLE: receptions_livraisons
-- Handles physical stock movements (Buying/Selling)
CREATE TABLE public.receptions_livraisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    date_operation TIMESTAMPTZ NOT NULL,
    type_operation TEXT NOT NULL CHECK (type_operation IN ('reception', 'livraison')),
    quantite NUMERIC(15,2) NOT NULL CHECK (quantite > 0),
    prix_unitaire NUMERIC(15,2) NOT NULL CHECK (prix_unitaire >= 0),
    montant NUMERIC(15,2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.receptions_livraisons IS 'Physical stock operations with calculated amounts.';

-- TABLE: charges
-- Handles other financial movements
CREATE TABLE public.charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    date_charge TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    montant NUMERIC(15,2) NOT NULL, -- Can be restricted to positive if logic dictates, but keeping open for flexibility
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.charges IS 'Financial charges and other expenses.';

-- TABLE: transactions
-- Unified journal for all operations. 
-- Intended to be populated via Triggers (Step 5), but created now for structure.
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    date_operation TIMESTAMPTZ NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('charge', 'reception', 'livraison')),
    reference_id UUID NOT NULL, -- Polymorphic ID pointing to charges.id or receptions_livraisons.id
    montant NUMERIC(15,2) NOT NULL, -- Positive or negative depending on effect on balance
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Unified transaction journal for easy balance calculation.';

-- 4. Create Indexes for Performance
-- Index on foreign keys is crucial for join performance
CREATE INDEX idx_receptions_livraisons_account_id ON public.receptions_livraisons(account_id);
CREATE INDEX idx_charges_account_id ON public.charges(account_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);

-- Date indexes for reporting and filtering
CREATE INDEX idx_receptions_livraisons_date ON public.receptions_livraisons(date_operation);
CREATE INDEX idx_charges_date ON public.charges(date_charge);
CREATE INDEX idx_transactions_date ON public.transactions(date_operation);
CREATE INDEX idx_transactions_reference ON public.transactions(reference_id);

-- 5. Final Confirmation
-- Script ends here. RLS policies to be added in next step.
