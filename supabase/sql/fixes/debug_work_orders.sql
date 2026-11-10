-- Database schema verification and fix script
-- Run this in your Supabase SQL Editor to ensure all required columns exist

-- Check current work_orders table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
ORDER BY ordinal_position;

-- Ensure all required columns exist
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS expected_complete_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Ensure product_shade is nullable (it should be optional)
ALTER TABLE work_orders ALTER COLUMN product_shade DROP NOT NULL;

-- Check if the auto-serial trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'work_orders'::regclass 
AND tgname = 'auto_serial_number_trigger';

-- Recreate the serial number function and trigger if needed
CREATE SEQUENCE IF NOT EXISTS work_order_serial_seq START 1;

CREATE OR REPLACE FUNCTION generate_serial_number()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
    serial_num TEXT;
BEGIN
    next_id := nextval('work_order_serial_seq');
    serial_num := 'WO-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_id::TEXT, 4, '0');
    
    WHILE EXISTS (SELECT 1 FROM work_orders WHERE serial_number = serial_num) LOOP
        next_id := nextval('work_order_serial_seq');
        serial_num := 'WO-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_id::TEXT, 4, '0');
    END LOOP;
    
    RETURN serial_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_work_order_serial()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.serial_number IS NULL OR NEW.serial_number = '' THEN
        NEW.serial_number := generate_serial_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_serial_number_trigger ON work_orders;
CREATE TRIGGER auto_serial_number_trigger
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_work_order_serial();

-- Make serial_number have a default value
ALTER TABLE work_orders ALTER COLUMN serial_number SET DEFAULT generate_serial_number();

-- Test insert to verify everything works
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID (admin user)
    SELECT id INTO test_user_id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try a test insert
        INSERT INTO work_orders (
            doctor_name, 
            patient_name, 
            product_quality, 
            product_shade, 
            order_date,
            created_by
        ) VALUES (
            'Test Doctor',
            'Test Patient', 
            'Test Quality',
            'A1',
            CURRENT_DATE,
            test_user_id
        );
        
        RAISE NOTICE 'Test insert successful!';
        
        -- Clean up test data
        DELETE FROM work_orders WHERE doctor_name = 'Test Doctor' AND patient_name = 'Test Patient';
    ELSE
        RAISE NOTICE 'No admin user found for testing';
    END IF;
END $$;
