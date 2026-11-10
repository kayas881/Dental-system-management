-- =====================================================
-- TOOTH NUMBERING SYSTEM MIGRATION FOR SUPABASE
-- =====================================================
-- Run this in your Supabase SQL Editor to add tooth support

-- 1. ADD TOOTH_NUMBERS COLUMN TO WORK_ORDERS TABLE
-- =====================================================
ALTER TABLE work_orders 
ADD COLUMN tooth_numbers JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN work_orders.tooth_numbers IS 'Array of tooth numbers using FDI notation (e.g., [11, 12, 21, 46])';

-- 2. ADD TOOTH_NUMBERS COLUMN TO BILLS TABLE  
-- =====================================================
ALTER TABLE bills 
ADD COLUMN tooth_numbers JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN bills.tooth_numbers IS 'Array of tooth numbers using FDI notation (e.g., [11, 12, 21, 46])';

-- 3. ADD PATIENT_NAME TO BILLS TABLE (if not already exists)
-- =====================================================
-- Check if the column exists first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bills' AND column_name='patient_name') THEN
        ALTER TABLE bills ADD COLUMN patient_name TEXT;
        COMMENT ON COLUMN bills.patient_name IS 'Patient name copied from work order';
    END IF;
END $$;

-- 4. ADD NOTES COLUMN TO BILLS TABLE (if not already exists)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bills' AND column_name='notes') THEN
        ALTER TABLE bills ADD COLUMN notes TEXT;
        COMMENT ON COLUMN bills.notes IS 'Additional notes about the work completed';
    END IF;
END $$;

-- 5. ADD FEEDBACK COLUMN TO WORK_ORDERS TABLE (if not already exists)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='work_orders' AND column_name='feedback') THEN
        ALTER TABLE work_orders ADD COLUMN feedback TEXT;
        COMMENT ON COLUMN work_orders.feedback IS 'Feedback notes for trials and adjustments';
    END IF;
END $$;

-- 6. ADD EXPECTED_COMPLETE_DATE TO WORK_ORDERS (if not already exists)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='work_orders' AND column_name='expected_complete_date') THEN
        ALTER TABLE work_orders ADD COLUMN expected_complete_date DATE;
        COMMENT ON COLUMN work_orders.expected_complete_date IS 'Expected completion date for the work order';
    END IF;
END $$;

-- 7. CREATE INDEXES FOR TOOTH_NUMBERS COLUMNS
-- =====================================================
-- Indexes for efficient querying of tooth numbers
CREATE INDEX IF NOT EXISTS idx_work_orders_tooth_numbers 
ON work_orders USING GIN (tooth_numbers);

CREATE INDEX IF NOT EXISTS idx_bills_tooth_numbers 
ON bills USING GIN (tooth_numbers);

-- 8. CREATE HELPER FUNCTIONS FOR TOOTH OPERATIONS
-- =====================================================

-- Function to validate FDI tooth numbers
CREATE OR REPLACE FUNCTION validate_fdi_tooth_numbers(tooth_array JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if all elements are valid FDI tooth numbers (11-18, 21-28, 31-38, 41-48)
    RETURN (
        SELECT bool_and(
            (tooth_num::text)::integer BETWEEN 11 AND 48 AND
            (tooth_num::text)::integer NOT BETWEEN 19 AND 20 AND
            (tooth_num::text)::integer NOT BETWEEN 29 AND 30 AND
            (tooth_num::text)::integer NOT BETWEEN 39 AND 40
        )
        FROM jsonb_array_elements_text(tooth_array) AS tooth_num
        WHERE tooth_num ~ '^[0-9]+$'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to format teeth by quadrants (for display)
CREATE OR REPLACE FUNCTION format_teeth_by_quadrant(tooth_array JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{"upperRight": [], "upperLeft": [], "lowerLeft": [], "lowerRight": []}'::jsonb;
BEGIN
    -- Group teeth by quadrants
    SELECT jsonb_build_object(
        'upperRight', COALESCE((
            SELECT jsonb_agg(tooth_num ORDER BY tooth_num)
            FROM jsonb_array_elements_text(tooth_array) AS tooth_num
            WHERE (tooth_num::text)::integer BETWEEN 11 AND 18
        ), '[]'::jsonb),
        'upperLeft', COALESCE((
            SELECT jsonb_agg(tooth_num ORDER BY tooth_num)
            FROM jsonb_array_elements_text(tooth_array) AS tooth_num
            WHERE (tooth_num::text)::integer BETWEEN 21 AND 28
        ), '[]'::jsonb),
        'lowerLeft', COALESCE((
            SELECT jsonb_agg(tooth_num ORDER BY tooth_num)
            FROM jsonb_array_elements_text(tooth_array) AS tooth_num
            WHERE (tooth_num::text)::integer BETWEEN 31 AND 38
        ), '[]'::jsonb),
        'lowerRight', COALESCE((
            SELECT jsonb_agg(tooth_num ORDER BY tooth_num)
            FROM jsonb_array_elements_text(tooth_array) AS tooth_num
            WHERE (tooth_num::text)::integer BETWEEN 41 AND 48
        ), '[]'::jsonb)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. ADD CONSTRAINTS TO VALIDATE TOOTH NUMBERS
-- =====================================================

-- Add check constraint to work_orders
ALTER TABLE work_orders 
ADD CONSTRAINT check_valid_tooth_numbers_work_orders 
CHECK (validate_fdi_tooth_numbers(tooth_numbers));

-- Add check constraint to bills
ALTER TABLE bills 
ADD CONSTRAINT check_valid_tooth_numbers_bills 
CHECK (validate_fdi_tooth_numbers(tooth_numbers));

-- 10. CREATE VIEWS FOR EASY REPORTING
-- =====================================================

-- View for work orders with formatted tooth data
CREATE OR REPLACE VIEW work_orders_with_teeth AS
SELECT 
    wo.*,
    format_teeth_by_quadrant(wo.tooth_numbers) AS teeth_by_quadrant,
    jsonb_array_length(wo.tooth_numbers) AS tooth_count
FROM work_orders wo;

-- View for bills with formatted tooth data
CREATE OR REPLACE VIEW bills_with_teeth AS
SELECT 
    b.*,
    format_teeth_by_quadrant(b.tooth_numbers) AS teeth_by_quadrant,
    jsonb_array_length(b.tooth_numbers) AS tooth_count
FROM bills b;

-- 11. SAMPLE DATA MIGRATION (OPTIONAL)
-- =====================================================
-- If you have existing data and want to add sample tooth numbers

-- Uncomment and run this if you want to add sample tooth data to existing records
/*
-- Update some existing work orders with sample tooth numbers
UPDATE work_orders 
SET tooth_numbers = '["16"]'::jsonb 
WHERE product_quality ILIKE '%crown%' AND tooth_numbers = '[]'::jsonb
LIMIT 5;

UPDATE work_orders 
SET tooth_numbers = '["14", "15", "16"]'::jsonb 
WHERE product_quality ILIKE '%bridge%' AND tooth_numbers = '[]'::jsonb
LIMIT 3;

UPDATE work_orders 
SET tooth_numbers = '["11", "12", "13", "14", "15", "16", "17", "18", "21", "22", "23", "24", "25", "26", "27", "28"]'::jsonb 
WHERE product_quality ILIKE '%denture%' AND product_quality ILIKE '%upper%' AND tooth_numbers = '[]'::jsonb
LIMIT 2;
*/

-- 12. GRANT PERMISSIONS (if needed)
-- =====================================================
-- These permissions should already be inherited, but just in case:

-- Grant usage on the helper functions
GRANT EXECUTE ON FUNCTION validate_fdi_tooth_numbers(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION format_teeth_by_quadrant(JSONB) TO authenticated;

-- Grant select on the views
GRANT SELECT ON work_orders_with_teeth TO authenticated;
GRANT SELECT ON bills_with_teeth TO authenticated;

-- 13. UPDATE RLS POLICIES (if needed)
-- =====================================================
-- The existing RLS policies should work fine with the new columns,
-- but if you need specific policies for tooth data, add them here.

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

-- Test the migration with a simple query:
SELECT 
    'Migration completed successfully!' as status,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='tooth_numbers') as work_orders_updated,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='tooth_numbers') as bills_updated;
