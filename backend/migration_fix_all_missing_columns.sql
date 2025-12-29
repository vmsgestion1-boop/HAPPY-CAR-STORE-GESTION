-- FIX: Ensure ALL required columns exist in receptions_livraisons
-- Run this script to fix the "400 Bad Request" errors

-- 1. Vehicle Details (from v2)
ALTER TABLE receptions_livraisons ADD COLUMN IF NOT EXISTS marque TEXT;
ALTER TABLE receptions_livraisons ADD COLUMN IF NOT EXISTS modele TEXT;
ALTER TABLE receptions_livraisons ADD COLUMN IF NOT EXISTS numero_chassis TEXT;
ALTER TABLE receptions_livraisons ADD COLUMN IF NOT EXISTS prix_achat DECIMAL(12,2) DEFAULT 0;
ALTER TABLE receptions_livraisons ADD COLUMN IF NOT EXISTS prix_vente DECIMAL(12,2) DEFAULT 0;

-- 2. Finance Details (from v4)
ALTER TABLE receptions_livraisons ADD COLUMN IF NOT EXISTS commission DECIMAL(12,2) DEFAULT 0;

-- 3. Vehicle References Table (from v5)
CREATE TABLE IF NOT EXISTS vehicules_ref (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  reference TEXT,
  prix_achat_defaut DECIMAL(12,2) DEFAULT 0
);

-- 4. Enable RLS for new table just in case
ALTER TABLE vehicules_ref ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for vehicules_ref" ON vehicules_ref;
CREATE POLICY "Enable all access for vehicules_ref" ON vehicules_ref FOR ALL USING (true);
