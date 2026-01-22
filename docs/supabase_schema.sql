-- Enable UUID extension (not strictly needed for gen_random_uuid() in newer Postgres, but good practice)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ตารางลูกค้า (Customer Profile)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to Supabase Auth for the Portal
    company_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ตารางการขนส่ง (Shipments) - ออกแบบมาเพื่อรวมข้อมูลทุกสายเรือ
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    booking_no TEXT UNIQUE NOT NULL, -- เช่น BKKM23324000 
    carrier_scac TEXT, -- HDMU, EGLV, หรือ MSC
    main_vessel_name TEXT, -- เช่น HMM HOPE 
    voyage_no TEXT, -- เช่น 059E 
    mmsi TEXT DEFAULT '440176000', -- ค่าเริ่มต้นสำหรับ HMM HOPE
    pod_name TEXT, -- Tacoma , Vancouver, หรือ Abidjan 
    eta_at_pod DATE, -- 13-Feb-2026 
    current_status_step TEXT DEFAULT 'Booking',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ตารางบันทึกตำแหน่งเรือ (Tracking Logs)
CREATE TABLE IF NOT EXISTS public.tracking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    status_text TEXT,
    last_sync TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own customer record
CREATE POLICY "Users can view own customer record" 
ON public.customers FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can only view shipments belonging to their customer record
CREATE POLICY "Users can view own shipments" 
ON public.shipments FOR SELECT 
TO authenticated 
USING (
    customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
);

-- Users can only view tracking logs for their own shipments
CREATE POLICY "Users can view own shipment tracking logs" 
ON public.tracking_logs FOR SELECT 
TO authenticated 
USING (
    shipment_id IN (
        SELECT id FROM public.shipments 
        WHERE customer_id IN (
            SELECT id FROM public.customers WHERE user_id = auth.uid()
        )
    )
);
