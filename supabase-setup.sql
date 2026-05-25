-- =============================================================
-- Mou's Creation - Supabase Setup
-- =============================================================
-- Run this SQL in your Supabase project's SQL Editor
-- (https://supabase.com -> SQL Editor -> New Query)

-- 1. Create products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  category TEXT DEFAULT 'uncategorized',
  description TEXT DEFAULT '',
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Allow anonymous access (auth is handled by Express)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- Steps to set up Supabase:
-- =============================================================
-- 1. Go to https://supabase.com and sign up (free)
-- 2. Create a new project (choose a strong database password)
-- 3. Wait ~2 minutes for the project to spin up
-- 4. Go to SQL Editor and paste + run this SQL
-- 5. Go to Storage -> Create bucket -> name: "product-images"
--    -> Make it public (tick "Public bucket")
-- 6. Go to Project Settings -> API -> copy your:
--    - Project URL (SUPABASE_URL)
--    - service_role key (SUPABASE_SERVICE_ROLE_KEY)
