-- Migration to add addresses and ID card fields to accounts

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS n_carte_identite TEXT;

COMMENT ON COLUMN accounts.address IS 'Adresse complète';
COMMENT ON COLUMN accounts.n_carte_identite IS 'Numéro de Carte Nationale d''Identité';
