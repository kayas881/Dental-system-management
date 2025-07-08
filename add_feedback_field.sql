-- Add feedback/reason field to work_orders table
-- Run this in your Supabase SQL Editor

ALTER TABLE work_orders 
ADD COLUMN feedback TEXT;

-- Add comment to the column
COMMENT ON COLUMN work_orders.feedback IS 'Feedback, notes, or reasons related to the work order';

-- Create index for better search performance
CREATE INDEX idx_work_orders_feedback ON work_orders USING gin(to_tsvector('english', feedback));

-- Update the trigger for updated_at (if needed)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
CREATE TRIGGER update_work_orders_updated_at 
    BEFORE UPDATE ON work_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
