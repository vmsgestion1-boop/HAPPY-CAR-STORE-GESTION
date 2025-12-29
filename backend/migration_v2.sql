-- Migration V2: Add Vehicle Details and Pricing Columns

-- Add columns to receptions_livraisons
ALTER TABLE receptions_livraisons
ADD COLUMN IF NOT EXISTS marque TEXT,
ADD COLUMN IF NOT EXISTS modele TEXT,
ADD COLUMN IF NOT EXISTS numero_chassis TEXT,
ADD COLUMN IF NOT EXISTS prix_achat DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS prix_vente DECIMAL(12,2) DEFAULT 0;

-- Comment on columns for clarity
COMMENT ON COLUMN receptions_livraisons.marque IS 'Vehicle Make (e.g., Toyota)';
COMMENT ON COLUMN receptions_livraisons.modele IS 'Vehicle Model (e.g., Corolla)';
COMMENT ON COLUMN receptions_livraisons.numero_chassis IS 'Vehicle VIN / Chassis Number';
COMMENT ON COLUMN receptions_livraisons.prix_achat IS 'Purchase Price (Cost)';
COMMENT ON COLUMN receptions_livraisons.prix_vente IS 'Selling Price';

-- Add columns to charges if needed (optional, for explicit linking)
ALTER TABLE charges
ADD COLUMN IF NOT EXISTS reception_id UUID REFERENCES receptions_livraisons(id);
