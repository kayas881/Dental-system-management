-- Add automatic serial number generation for work orders
-- Run this in your Supabase SQL Editor

-- Create a sequence for serial numbers
CREATE SEQUENCE IF NOT EXISTS work_order_serial_seq START 1;

-- Create a function to generate automatic serial numbers
CREATE OR REPLACE FUNCTION generate_serial_number()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
    serial_num TEXT;
BEGIN
    -- Get the next value from the sequence
    next_id := nextval('work_order_serial_seq');
    
    -- Format as WO-YYYY-NNNN (e.g., WO-2025-0001)
    serial_num := 'WO-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_id::TEXT, 4, '0');
    
    -- Check if this serial number already exists (just in case)
    WHILE EXISTS (SELECT 1 FROM work_orders WHERE serial_number = serial_num) LOOP
        next_id := nextval('work_order_serial_seq');
        serial_num := 'WO-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_id::TEXT, 4, '0');
    END LOOP;
    
    RETURN serial_num;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to auto-generate serial numbers
CREATE OR REPLACE FUNCTION set_work_order_serial()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set serial number if it's not provided or empty
    IF NEW.serial_number IS NULL OR NEW.serial_number = '' THEN
        NEW.serial_number := generate_serial_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS auto_serial_number_trigger ON work_orders;
CREATE TRIGGER auto_serial_number_trigger
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_work_order_serial();

-- Update the work_orders table to make serial_number have a default
ALTER TABLE work_orders 
ALTER COLUMN serial_number SET DEFAULT generate_serial_number();

-- Optional: Update existing records that might have empty or invalid serial numbers
-- (Run this only if you have existing data that needs serial numbers)
-- UPDATE work_orders 
-- SET serial_number = generate_serial_number() 
-- WHERE serial_number IS NULL OR serial_number = '';

-- Set the sequence to start after any existing serial numbers
-- (Run this only if you have existing data)
-- SELECT setval('work_order_serial_seq', 
--     COALESCE((SELECT MAX(CAST(SPLIT_PART(serial_number, '-', 3) AS INTEGER)) 
--               FROM work_orders 
--               WHERE serial_number ~ '^WO-[0-9]{4}-[0-9]{4}$'), 0)
-- );

COMMENT ON FUNCTION generate_serial_number() IS 'Generates automatic serial numbers in format WO-YYYY-NNNN';
COMMENT ON FUNCTION set_work_order_serial() IS 'Trigger function to auto-set serial numbers for work orders';
