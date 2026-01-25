-- ============================================
-- Vessel Master Table - MMSI Cache
-- ============================================
-- This table serves as a local cache to avoid redundant API calls
-- to VesselFinder1 for MMSI lookups.

-- 4. Vessel Master Table (Cache for MMSI lookups)
CREATE TABLE IF NOT EXISTS public.vessel_master (
    vessel_name TEXT PRIMARY KEY,           -- Unique vessel name (e.g., 'HMM HOPE', 'MSC OSCAR')
    mmsi TEXT NOT NULL,                     -- Maritime Mobile Service Identity (e.g., '440176000')
    imo TEXT,                               -- International Maritime Organization number
    ship_type TEXT,                         -- Ship type (e.g., 'Cargo', 'Container Ship')
    updated_at TIMESTAMPTZ DEFAULT now()    -- Last update timestamp
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vessel_master_mmsi ON public.vessel_master(mmsi);

-- Enable Row Level Security
ALTER TABLE public.vessel_master ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read vessel_master (for dashboard queries)
CREATE POLICY "Allow authenticated read access on vessel_master"
ON public.vessel_master FOR SELECT
TO authenticated
USING (true);

-- Allow service role to insert/update (for backend API calls)
-- Note: Service role key automatically bypasses RLS

-- ============================================
-- Pre-populate with known vessels
-- ============================================
INSERT INTO public.vessel_master (vessel_name, mmsi, imo, ship_type, updated_at)
VALUES 
    ('HMM HOPE', '440176000', NULL, 'Container Ship', now()),
    ('MSC OSCAR', '355906000', '9703291', 'Container Ship', now()),
    ('EVER WEB', '563237400', NULL, 'Container Ship', now())
ON CONFLICT (vessel_name) DO NOTHING;
