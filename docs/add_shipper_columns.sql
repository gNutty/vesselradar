-- ============================================
-- Add Shipper, Consignee, Agent Columns to Shipments
-- ============================================
-- Run this SQL in Supabase SQL Editor to add the 3 new columns.

-- Add shipper_name column
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipper_name TEXT;

-- Add consignee_name column (TO field from booking)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS consignee_name TEXT;

-- Add agent_company column (letterhead company from PDF)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS agent_company TEXT;

-- Add comments for clarity
COMMENT ON COLUMN shipments.shipper_name IS 'Shipper company name extracted from PDF';
COMMENT ON COLUMN shipments.consignee_name IS 'Consignee (TO field) company name from PDF';
COMMENT ON COLUMN shipments.agent_company IS 'Agent/Forwarder company from PDF letterhead';
