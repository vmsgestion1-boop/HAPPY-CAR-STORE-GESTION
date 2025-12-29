-- Migration to add Algerian legal fields to accounts table

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS nif TEXT,
ADD COLUMN IF NOT EXISTS nis TEXT,
ADD COLUMN IF NOT EXISTS rc TEXT,
ADD COLUMN IF NOT EXISTS ai TEXT;

-- Comment on columns for clarity
COMMENT ON COLUMN accounts.nif IS 'Numéro d''Identification Fiscale';
COMMENT ON COLUMN accounts.nis IS 'Numéro d''Identification Statistique';
COMMENT ON COLUMN accounts.rc IS 'Registre de Commerce';
COMMENT ON COLUMN accounts.ai IS 'Article d''Imposition';
