-- Fix bills table schema - Add missing columns
-- Run this in your Supabase SQL Editor

-- Add missing patient_name column to bills table
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS patient_name TEXT;

-- Add missing notes column to bills table  
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update column comments
COMMENT ON COLUMN bills.patient_name IS 'Patient name for the bill (copied from work order)';
COMMENT ON COLUMN bills.notes IS 'Additional notes about the bill or work completed';

-- Make completion_date nullable (in case we need to create bills without completion date)
ALTER TABLE bills 
ALTER COLUMN completion_date DROP NOT NULL;

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_patient_name ON bills(patient_name);
CREATE INDEX IF NOT EXISTS idx_bills_work_order_id ON bills(work_order_id);
CREATE INDEX IF NOT EXISTS idx_bills_doctor_name ON bills(doctor_name);
CREATE INDEX IF NOT EXISTS idx_bills_serial_number ON bills(serial_number);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date);

-- Ensure the updated_at trigger exists for bills table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for bills table
DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at 
    BEFORE UPDATE ON bills 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Check if all columns exist (optional verification query)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'bills' 
-- ORDER BY ordinal_position;
