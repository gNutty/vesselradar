-- ============================================
-- Add ETD, Carrier, POL, POR Columns to Shipments
-- ============================================
-- Run this SQL in Supabase SQL Editor to add the new columns.

-- Add ETD (Estimated Time of Departure)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS etd_at_pol DATE;

-- Add Carrier name
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS carrier_name TEXT;

-- Add Port of Loading (POL)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS port_of_loading TEXT;

-- Add Place of Receipt (POR)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS place_of_receipt TEXT;

-- Add Origin (alternative to POR/POL)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin TEXT;

-- Add Final Destination
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS final_destination TEXT;

-- Add comments for clarity
COMMENT ON COLUMN shipments.etd_at_pol IS 'Estimated departure date from Port of Loading';
COMMENT ON COLUMN shipments.carrier_name IS 'Carrier company name (e.g., HMM CO., LTD.)';
COMMENT ON COLUMN shipments.port_of_loading IS 'Port of Loading (e.g., LAEM CHABANG)';
COMMENT ON COLUMN shipments.place_of_receipt IS 'Place of Receipt (e.g., BANGKOK,THAILAND)';
COMMENT ON COLUMN shipments.origin IS 'Origin location from PDF';
COMMENT ON COLUMN shipments.final_destination IS 'Final destination from PDF';
