-- Migration V3: Create Payments Table

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  montant DECIMAL(12,2) NOT NULL,
  type_paiement TEXT CHECK (type_paiement IN ('encaissement', 'decaissement')), -- encaissement = money in, decaissement = money out
  mode_paiement TEXT, -- especes, cheque, virement
  reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (Simple: authenticated users can do everything)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON payments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Comment
COMMENT ON TABLE payments IS 'Table for tracking money in/out (encaissements/decaissements).';
