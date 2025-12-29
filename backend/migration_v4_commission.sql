-- Migration V4: Add Commission Column

ALTER TABLE receptions_livraisons 
ADD COLUMN IF NOT EXISTS commission DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN receptions_livraisons.commission IS 'Commission value added to the base price';
