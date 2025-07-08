-- COMPLETE DATABASE FIX SCRIPT
-- Run this entire script in your Supabase SQL Editor to fix all issues

-- 1. Ensure all required columns exist
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS expected_complete_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS feedback TEXT;

-- 2. Make product_shade optional (nullable)
ALTER TABLE work_orders ALTER COLUMN product_shade DROP NOT NULL;

-- 3. Create sequence for auto-serial numbers if not exists
CREATE SEQUENCE IF NOT EXISTS work_order_serial_seq START 1;

-- 4. Create/recreate the serial number generation function
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

-- 5. Create/recreate the trigger function
CREATE OR REPLACE FUNCTION set_work_order_serial()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.serial_number IS NULL OR NEW.serial_number = '' THEN
        NEW.serial_number := generate_serial_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop and recreate the trigger
DROP TRIGGER IF EXISTS auto_serial_number_trigger ON work_orders;
CREATE TRIGGER auto_serial_number_trigger
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_work_order_serial();

-- 7. Set default value for serial_number
ALTER TABLE work_orders ALTER COLUMN serial_number SET DEFAULT generate_serial_number();

-- 8. Create/recreate updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
CREATE TRIGGER update_work_orders_updated_at 
    BEFORE UPDATE ON work_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Verify table structure
SELECT 'Current work_orders table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
ORDER BY ordinal_position;

-- 10. Test the setup with a sample insert (will be rolled back)
DO $$
DECLARE
    test_user_id UUID;
    test_record work_orders%ROWTYPE;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
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
        ) RETURNING * INTO test_record;
        
        RAISE NOTICE 'Test insert successful! Serial number: %', test_record.serial_number;
        
        -- Clean up test data
        DELETE FROM work_orders WHERE id = test_record.id;
        RAISE NOTICE 'Test data cleaned up successfully';
    ELSE
        RAISE NOTICE 'No users found for testing - please ensure you have at least one user in auth.users table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
        RAISE NOTICE 'Please check your table structure and RLS policies';
END $$;
