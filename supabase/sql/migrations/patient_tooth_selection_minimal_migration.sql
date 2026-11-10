-- =====================================================
-- PATIENT-SPECIFIC TOOTH SELECTION - MINIMAL MIGRATION
-- =====================================================
-- Simpler version focusing on essential functionality only
-- Run this in your Supabase SQL Editor

-- 1. ENSURE BASIC TOOTH_NUMBERS SUPPORT
-- =====================================================
-- Add tooth_numbers column if it doesn't exist
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tooth_numbers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tooth_numbers JSONB DEFAULT '[]'::jsonb;

-- Add batch_id columns for grouped billing support
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Add helpful comments
COMMENT ON COLUMN work_orders.tooth_numbers IS 'Array of tooth numbers using FDI notation (e.g., [11, 12, 21, 46]) - specific teeth worked on for this patient';
COMMENT ON COLUMN bills.tooth_numbers IS 'Array of tooth numbers using FDI notation (e.g., [11, 12, 21, 46]) - copied from work order';
COMMENT ON COLUMN work_orders.batch_id IS 'Batch ID for work orders created together - used for grouped billing';
COMMENT ON COLUMN bills.batch_id IS 'Batch ID for grouped billing - links bills created from the same batch of work orders';

-- 2. CREATE BASIC INDEXES FOR PERFORMANCE
-- =====================================================
-- GIN indexes for efficient querying of tooth numbers
CREATE INDEX IF NOT EXISTS idx_work_orders_tooth_numbers_gin 
    ON work_orders USING GIN (tooth_numbers);

CREATE INDEX IF NOT EXISTS idx_bills_tooth_numbers_gin 
    ON bills USING GIN (tooth_numbers);

-- Indexes for batch_id columns for grouped billing
CREATE INDEX IF NOT EXISTS idx_work_orders_batch_id 
    ON work_orders (batch_id);
    
CREATE INDEX IF NOT EXISTS idx_bills_batch_id 
    ON bills (batch_id);

-- 3. CREATE ESSENTIAL HELPER FUNCTION
-- =====================================================
-- Simple validation function
CREATE OR REPLACE FUNCTION validate_patient_tooth_selection(
    patient_name_param TEXT, 
    tooth_numbers_param JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Ensure patient name is provided
    IF patient_name_param IS NULL OR trim(patient_name_param) = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Ensure tooth numbers array is provided and not empty
    IF tooth_numbers_param IS NULL OR 
       jsonb_typeof(tooth_numbers_param) != 'array' OR 
       jsonb_array_length(tooth_numbers_param) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Validate FDI tooth numbers (11-18, 21-28, 31-38, 41-48)
    RETURN (
        SELECT bool_and(
            (tooth_num::text)::integer BETWEEN 11 AND 48 AND
            (tooth_num::text)::integer NOT BETWEEN 19 AND 20 AND
            (tooth_num::text)::integer NOT BETWEEN 29 AND 30 AND
            (tooth_num::text)::integer NOT BETWEEN 39 AND 40
        )
        FROM jsonb_array_elements_text(tooth_numbers_param) AS tooth_num
        WHERE tooth_num ~ '^[0-9]+$'
    );
END;
$$ LANGUAGE plpgsql;

-- 4. CREATE SUMMARY FUNCTION
-- =====================================================
-- Function to get patient-tooth summary
CREATE OR REPLACE FUNCTION get_patient_tooth_summary(
    patient_name_param TEXT,
    tooth_numbers_param JSONB
)
RETURNS TEXT AS $$
DECLARE
    tooth_count INTEGER;
    tooth_list TEXT;
BEGIN
    -- Get count of teeth
    tooth_count := jsonb_array_length(tooth_numbers_param);
    
    -- Format tooth numbers as a comma-separated list
    SELECT string_agg(value::text, ', ' ORDER BY value::text::integer)
    INTO tooth_list
    FROM jsonb_array_elements_text(tooth_numbers_param) AS value;
    
    -- Return formatted summary
    RETURN patient_name_param || ' → ' || tooth_count || ' teeth: ' || COALESCE(tooth_list, 'none');
END;
$$ LANGUAGE plpgsql;

-- 5. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION validate_patient_tooth_selection(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_tooth_summary(TEXT, JSONB) TO authenticated;

-- 6. VERIFICATION
-- =====================================================
-- Test the functions
DO $$
BEGIN
    RAISE NOTICE 'Patient-Specific Tooth Selection - Minimal Migration Complete!';
    RAISE NOTICE 'Essential functions created: validate_patient_tooth_selection, get_patient_tooth_summary';
    RAISE NOTICE 'Your application is now ready to use patient-tooth relationships!';
END $$;

-- Quick test
SELECT 
    'Test Results:' as info,
    validate_patient_tooth_selection('Ayan Kumar', '[11, 12, 21]'::jsonb) as validation_works,
    get_patient_tooth_summary('Ayan Kumar', '[11, 12, 21]'::jsonb) as summary_works;
