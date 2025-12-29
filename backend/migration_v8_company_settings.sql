-- Migration v8: Remove Audit Logs and Add Company Settings

-- 1. Drop Audit Logs Table
DROP TABLE IF EXISTS audit_logs;

-- 2. Create Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    website TEXT,
    capital TEXT,
    -- Legal IDs
    rc TEXT,
    nif TEXT,
    nis TEXT,
    ai TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert Default Data (Initialize with current hardcoded values)
INSERT INTO company_settings (name, address, city, country, phone, email, capital, rc, nif, nis, ai)
VALUES (
    'VMS AUTOMOBILES', 
    '123 Route Nationale', 
    'Alger', 
    'Algérie', 
    '+213 555 00 00 00', 
    'contact@vms-autos.dz', 
    '10 000 000.00 DA',
    '16/00-1234567B16',
    '001616123456789',
    '001216012345678',
    '16012345678'
);

-- 4. RLS - Allow read for all auth, update for all auth (simplification for single user app)
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON company_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for all users" ON company_settings
    FOR UPDATE USING (auth.role() = 'authenticated');
    
-- Ensure only one row exists (Singleton pattern via trigger or just convention)
-- For now, we rely on the app to just fetch the first row.
