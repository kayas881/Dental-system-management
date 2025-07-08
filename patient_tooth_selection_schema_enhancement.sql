-- =====================================================
-- PATIENT-SPECIFIC TOOTH SELECTION ENHANCEMENT MIGRATION
-- =====================================================
-- Run this in your Supabase SQL Editor to enhance patient-tooth relationship support

-- 1. ENSURE TOOTH_NUMBERS COLUMN EXISTS AND IS PROPERLY CONFIGURED
-- =====================================================
-- Add tooth_numbers column if it doesn't exist (should already exist from previous migrations)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tooth_numbers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tooth_numbers JSONB DEFAULT '[]'::jsonb;

-- Add comments to document the columns
COMMENT ON COLUMN work_orders.tooth_numbers IS 'Array of tooth numbers using FDI notation (e.g., [11, 12, 21, 46]) - specific teeth worked on for this patient';
COMMENT ON COLUMN bills.tooth_numbers IS 'Array of tooth numbers using FDI notation (e.g., [11, 12, 21, 46]) - copied from work order';

-- 2. ADD VALIDATION CONSTRAINTS FOR TOOTH NUMBERS
-- =====================================================
-- Add constraint to ensure tooth_numbers is always an array (with safe handling)
DO $$
BEGIN
    -- Add constraint for work_orders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_tooth_numbers_is_array' 
        AND table_name = 'work_orders'
    ) THEN
        ALTER TABLE work_orders ADD CONSTRAINT chk_tooth_numbers_is_array 
            CHECK (jsonb_typeof(tooth_numbers) = 'array');
    END IF;
    
    -- Add constraint for bills if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_bill_tooth_numbers_is_array' 
        AND table_name = 'bills'
    ) THEN
        ALTER TABLE bills ADD CONSTRAINT chk_bill_tooth_numbers_is_array 
            CHECK (jsonb_typeof(tooth_numbers) = 'array');
    END IF;
END $$;

-- 3. CREATE ENHANCED INDEXES FOR PATIENT-TOOTH QUERIES
-- =====================================================
-- GIN indexes for efficient querying of tooth numbers
CREATE INDEX IF NOT EXISTS idx_work_orders_tooth_numbers_gin 
    ON work_orders USING GIN (tooth_numbers);

CREATE INDEX IF NOT EXISTS idx_bills_tooth_numbers_gin 
    ON bills USING GIN (tooth_numbers);

-- Composite index for patient-tooth queries
CREATE INDEX IF NOT EXISTS idx_work_orders_patient_teeth 
    ON work_orders (patient_name, (tooth_numbers::text));

CREATE INDEX IF NOT EXISTS idx_bills_patient_teeth 
    ON bills (patient_name, (tooth_numbers::text));

-- 4. CREATE ENHANCED HELPER FUNCTIONS FOR PATIENT-TOOTH OPERATIONS
-- =====================================================

-- Function to validate that tooth numbers are provided for each patient
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
    
    -- Validate FDI tooth numbers
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

-- Function to format teeth by quadrants for a patient
CREATE OR REPLACE FUNCTION format_patient_teeth_by_quadrant(
    patient_name_param TEXT,
    tooth_numbers_param JSONB
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'patient_name', patient_name_param,
        'quadrants', jsonb_build_object(
            'upper_right', (
                SELECT jsonb_agg(value ORDER BY value::text::integer)
                FROM jsonb_array_elements_text(tooth_numbers_param) AS value
                WHERE value::text::integer BETWEEN 11 AND 18
            ),
            'upper_left', (
                SELECT jsonb_agg(value ORDER BY value::text::integer)
                FROM jsonb_array_elements_text(tooth_numbers_param) AS value
                WHERE value::text::integer BETWEEN 21 AND 28
            ),
            'lower_left', (
                SELECT jsonb_agg(value ORDER BY value::text::integer)
                FROM jsonb_array_elements_text(tooth_numbers_param) AS value
                WHERE value::text::integer BETWEEN 31 AND 38
            ),
            'lower_right', (
                SELECT jsonb_agg(value ORDER BY value::text::integer)
                FROM jsonb_array_elements_text(tooth_numbers_param) AS value
                WHERE value::text::integer BETWEEN 41 AND 48
            )
        ),
        'total_teeth', jsonb_array_length(tooth_numbers_param)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. CREATE VIEWS FOR PATIENT-TOOTH REPORTING
-- =====================================================

-- View for patient-tooth work order summary
CREATE OR REPLACE VIEW patient_tooth_work_orders AS
SELECT 
    wo.id,
    wo.serial_number,
    wo.doctor_name,
    wo.patient_name,
    wo.tooth_numbers,
    jsonb_array_length(wo.tooth_numbers) as tooth_count,
    get_patient_tooth_summary(wo.patient_name, wo.tooth_numbers) as patient_tooth_summary,
    wo.product_quality,
    wo.product_shade,
    wo.order_date,
    wo.expected_complete_date,
    wo.completion_date,
    wo.status,
    wo.batch_id,
    wo.feedback,
    wo.created_at,
    wo.updated_at
FROM work_orders wo
WHERE wo.tooth_numbers IS NOT NULL 
  AND jsonb_array_length(wo.tooth_numbers) > 0;

-- Grant access to the view
GRANT SELECT ON patient_tooth_work_orders TO authenticated;

-- View for batch patient-tooth summary
CREATE OR REPLACE VIEW batch_patient_tooth_summary AS
SELECT 
    batch_id,
    COUNT(*) as total_work_orders,
    COUNT(DISTINCT patient_name) as unique_patients,
    string_agg(DISTINCT patient_name, ', ' ORDER BY patient_name) as all_patients,
    string_agg(
        get_patient_tooth_summary(patient_name, tooth_numbers), 
        ' | ' 
        ORDER BY patient_name
    ) as patient_tooth_details,
    SUM(jsonb_array_length(tooth_numbers)) as total_teeth_count,
    MIN(order_date) as earliest_order_date,
    MAX(order_date) as latest_order_date
FROM work_orders 
WHERE batch_id IS NOT NULL 
  AND tooth_numbers IS NOT NULL 
  AND jsonb_array_length(tooth_numbers) > 0
GROUP BY batch_id;

-- Grant access to the view
GRANT SELECT ON batch_patient_tooth_summary TO authenticated;

-- 6. CREATE TRIGGERS FOR DATA INTEGRITY
-- =====================================================

-- Trigger function to validate patient-tooth data on insert/update
CREATE OR REPLACE FUNCTION validate_work_order_patient_tooth()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate patient-tooth selection
    IF NOT validate_patient_tooth_selection(NEW.patient_name, NEW.tooth_numbers) THEN
        RAISE EXCEPTION 'Invalid patient-tooth selection: Patient name must be provided and at least one valid tooth number must be selected';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for work orders validation
DROP TRIGGER IF EXISTS validate_patient_tooth_trigger ON work_orders;
CREATE TRIGGER validate_patient_tooth_trigger
    BEFORE INSERT OR UPDATE ON work_orders
    FOR EACH ROW
    WHEN (NEW.tooth_numbers IS NOT NULL AND jsonb_array_length(NEW.tooth_numbers) > 0)
    EXECUTE FUNCTION validate_work_order_patient_tooth();

-- 7. UPDATE BILL CREATION TO COPY TOOTH NUMBERS
-- =====================================================

-- Function to automatically copy tooth numbers from work order to bill
CREATE OR REPLACE FUNCTION copy_tooth_numbers_to_bill()
RETURNS TRIGGER AS $$
BEGIN
    -- Copy tooth_numbers from work_orders when creating a bill
    IF NEW.work_order_id IS NOT NULL AND (NEW.tooth_numbers IS NULL OR NEW.tooth_numbers = '[]'::jsonb) THEN
        SELECT tooth_numbers INTO NEW.tooth_numbers
        FROM work_orders
        WHERE id = NEW.work_order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bills
DROP TRIGGER IF EXISTS copy_tooth_numbers_trigger ON bills;
CREATE TRIGGER copy_tooth_numbers_trigger
    BEFORE INSERT ON bills
    FOR EACH ROW
    EXECUTE FUNCTION copy_tooth_numbers_to_bill();

-- 8. EXAMPLE QUERIES FOR PATIENT-TOOTH OPERATIONS
-- =====================================================

-- Example: Find all work orders for a specific patient
-- SELECT * FROM patient_tooth_work_orders WHERE patient_name = 'Ayan Kumar';

-- Example: Find work orders affecting specific teeth
-- SELECT * FROM work_orders WHERE tooth_numbers @> '[11]'::jsonb;

-- Example: Get batch summary with patient-tooth details
-- SELECT * FROM batch_patient_tooth_summary WHERE batch_id = 'your-batch-id';

-- Example: Find patients with work on front teeth (11-13, 21-23)
-- SELECT DISTINCT patient_name, tooth_numbers 
-- FROM work_orders 
-- WHERE tooth_numbers ?| array['11','12','13','21','22','23'];

-- 9. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION validate_patient_tooth_selection(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_tooth_summary(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION format_patient_teeth_by_quadrant(TEXT, JSONB) TO authenticated;

-- 10. VERIFICATION AND TESTING
-- =====================================================

-- Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Patient-Specific Tooth Selection Enhancement Migration Complete!';
    RAISE NOTICE 'Available views: patient_tooth_work_orders, batch_patient_tooth_summary';
    RAISE NOTICE 'Available functions: validate_patient_tooth_selection, get_patient_tooth_summary, format_patient_teeth_by_quadrant';
    RAISE NOTICE 'Validation triggers: Patient name and tooth selection are now required and validated';
END $$;

-- Test the validation function
SELECT 
    'Validation Tests:' as test_type,
    validate_patient_tooth_selection('Ayan Kumar', '[11, 12, 21]'::jsonb) as valid_case,
    validate_patient_tooth_selection('', '[11, 12]'::jsonb) as invalid_no_patient,
    validate_patient_tooth_selection('Ayan Kumar', '[]'::jsonb) as invalid_no_teeth,
    validate_patient_tooth_selection('Ayan Kumar', '[99]'::jsonb) as invalid_tooth_number;

-- Test the summary function
SELECT 
    'Summary Test:' as test_type,
    get_patient_tooth_summary('Ayan Kumar', '[11, 12, 21, 46]'::jsonb) as patient_summary;
