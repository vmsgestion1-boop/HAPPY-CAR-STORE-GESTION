-- ============================================================================
-- VMS GESTION - DONNÉES DE TEST
-- Description: Données d'exemple pour tests et démonstration
-- À exécuter APRÈS 00_complete_schema_deployment.sql
-- ============================================================================

-- 1. Insérer des comptes de test
INSERT INTO public.accounts (code_compte, nom_compte, type_compte, solde_initial, actif) VALUES
('C001', 'Client ABC SA', 'client', 5000.00, true),
('C002', 'Client XYZ SARL', 'client', 10000.00, true),
('F001', 'Fournisseur Alpha', 'fournisseur', 0.00, true),
('F002', 'Fournisseur Beta', 'fournisseur', 0.00, true),
('INT001', 'Caisse Principale', 'interne', 50000.00, true)
ON CONFLICT (code_compte) DO NOTHING;

-- 2. Insérer des réceptions de test
INSERT INTO public.receptions_livraisons (account_id, date_operation, type_operation, quantite, prix_unitaire) 
SELECT 
    a.id, 
    now() - interval '10 days',
    'reception',
    100,
    50.00
FROM public.accounts a WHERE a.code_compte = 'F001'
ON CONFLICT DO NOTHING;

INSERT INTO public.receptions_livraisons (account_id, date_operation, type_operation, quantite, prix_unitaire) 
SELECT 
    a.id,
    now() - interval '5 days',
    'reception',
    50,
    75.00
FROM public.accounts a WHERE a.code_compte = 'F002'
ON CONFLICT DO NOTHING;

-- 3. Insérer des livraisons de test
INSERT INTO public.receptions_livraisons (account_id, date_operation, type_operation, quantite, prix_unitaire) 
SELECT 
    a.id,
    now() - interval '7 days',
    'livraison',
    30,
    60.00
FROM public.accounts a WHERE a.code_compte = 'C001'
ON CONFLICT DO NOTHING;

INSERT INTO public.receptions_livraisons (account_id, date_operation, type_operation, quantite, prix_unitaire) 
SELECT 
    a.id,
    now() - interval '2 days',
    'livraison',
    20,
    70.00
FROM public.accounts a WHERE a.code_compte = 'C002'
ON CONFLICT DO NOTHING;

-- 4. Insérer des charges de test
INSERT INTO public.charges (account_id, date_charge, description, montant) 
SELECT 
    a.id,
    now() - interval '8 days',
    'Frais de livraison',
    250.00
FROM public.accounts a WHERE a.code_compte = 'INT001'
ON CONFLICT DO NOTHING;

INSERT INTO public.charges (account_id, date_charge, description, montant) 
SELECT 
    a.id,
    now() - interval '3 days',
    'Frais de service',
    100.00
FROM public.accounts a WHERE a.code_compte = 'INT001'
ON CONFLICT DO NOTHING;

INSERT INTO public.charges (account_id, date_charge, description, montant) 
SELECT 
    a.id,
    now() - interval '1 days',
    'Commission',
    500.00
FROM public.accounts a WHERE a.code_compte = 'C001'
ON CONFLICT DO NOTHING;

-- 5. Vérifier les données
SELECT '=== COMPTES ===' as section;
SELECT code_compte, nom_compte, type_compte, solde_initial FROM public.accounts ORDER BY code_compte;

SELECT '' as blank;
SELECT '=== OPÉRATIONS ===' as section;
SELECT 
    rl.id,
    a.code_compte,
    rl.type_operation,
    rl.quantite,
    rl.prix_unitaire,
    rl.montant,
    rl.date_operation
FROM public.receptions_livraisons rl
JOIN public.accounts a ON rl.account_id = a.id
ORDER BY rl.date_operation DESC;

SELECT '' as blank;
SELECT '=== CHARGES ===' as section;
SELECT 
    c.id,
    a.code_compte,
    c.description,
    c.montant,
    c.date_charge
FROM public.charges c
JOIN public.accounts a ON c.account_id = a.id
ORDER BY c.date_charge DESC;

SELECT '' as blank;
SELECT '=== TRANSACTIONS (Journal) ===' as section;
SELECT 
    a.code_compte,
    t.type,
    t.montant,
    t.date_operation
FROM public.transactions t
JOIN public.accounts a ON t.account_id = a.id
ORDER BY t.date_operation DESC;

SELECT '' as blank;
SELECT '=== SOLDES ACTUELS ===' as section;
SELECT 
    ab.code_compte,
    ab.nom_compte,
    ab.solde_initial,
    ab.total_mouvements,
    ab.solde_actuel
FROM public.account_balances ab
ORDER BY ab.nom_compte;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Ces données sont fictives et destinées aux tests.
-- 
-- Les triggers automatiques ont déjà peuplé la table 'transactions'
-- lors des INSERT sur 'receptions_livraisons' et 'charges'.
--
-- Les soldes devraient être :
-- - C001: 5000 + (100*50) - (30*60) - 500 = 5000 + 5000 - 1800 - 500 = 7700
-- - C002: 10000 + (50*75) - (20*70) = 10000 + 3750 - 1400 = 12350
-- - F001: 0 + (100*50) = 5000
-- - F002: 0 + (50*75) = 3750
-- - INT001: 50000 - 250 - 100 = 49650
--
-- Pour vérifier :
-- SELECT * FROM public.account_balances;
-- ou
-- SELECT public.calculate_account_balance(account_id);
--
