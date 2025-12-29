-- Migration V5: Vehicle Definitions Table

CREATE TABLE IF NOT EXISTS vehicules_ref (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  reference TEXT,
  prix_achat_defaut DECIMAL(12,2) DEFAULT 0
);

-- RLS Policies (Enable all access for now as per previous pattern)
-- RLS Policies
ALTER TABLE vehicules_ref ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON vehicules_ref;
CREATE POLICY "Enable read access for all users" ON vehicules_ref FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON vehicules_ref;
CREATE POLICY "Enable insert access for all users" ON vehicules_ref FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON vehicules_ref;
CREATE POLICY "Enable update access for all users" ON vehicules_ref FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON vehicules_ref;
CREATE POLICY "Enable delete access for all users" ON vehicules_ref FOR DELETE USING (true);
