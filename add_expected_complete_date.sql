-- Add expected_complete_date column to work_orders table
-- Run this in your Supabase SQL Editor

ALTER TABLE work_orders 
ADD COLUMN expected_complete_date DATE;

-- Add comment to the column
COMMENT ON COLUMN work_orders.expected_complete_date IS 'Expected completion date set when creating the work order';

-- Create index for better performance when filtering by expected complete date
CREATE INDEX idx_work_orders_expected_complete ON work_orders(expected_complete_date);

-- Update the existing updated_at trigger to include the new column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to work_orders table (if not already exists)
DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
CREATE TRIGGER update_work_orders_updated_at 
    BEFORE UPDATE ON work_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
