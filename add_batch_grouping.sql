-- Add batch grouping functionality to work orders
-- This allows batch-created work orders to be grouped for billing
-- Run this in your Supabase SQL Editor

-- Add batch_id to work_orders table
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Create index for better performance on batch queries
CREATE INDEX IF NOT EXISTS idx_work_orders_batch_id ON work_orders(batch_id);

-- Function to generate a new batch ID (UUID)
CREATE OR REPLACE FUNCTION generate_batch_id()
RETURNS UUID AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for batch queries
-- (Work orders with batch_id can still be read by authenticated users)

-- View to get work orders grouped by batch
CREATE OR REPLACE VIEW work_orders_with_batch_info AS
SELECT 
    wo.*,
    CASE 
        WHEN wo.batch_id IS NOT NULL THEN (
            SELECT COUNT(*) 
            FROM work_orders wo2 
            WHERE wo2.batch_id = wo.batch_id
        )
        ELSE 1
    END as batch_size,
    CASE 
        WHEN wo.batch_id IS NOT NULL THEN (
            SELECT string_agg(DISTINCT wo2.patient_name, ', ' ORDER BY wo2.patient_name)
            FROM work_orders wo2 
            WHERE wo2.batch_id = wo.batch_id
        )
        ELSE wo.patient_name
    END as batch_patients
FROM work_orders wo;

-- Grant access to the view
GRANT SELECT ON work_orders_with_batch_info TO authenticated;

-- Function to get all work orders in a batch
CREATE OR REPLACE FUNCTION get_batch_work_orders(batch_id_param UUID)
RETURNS SETOF work_orders AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM work_orders
    WHERE batch_id = batch_id_param
    ORDER BY created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a batch can be billed together
-- (all orders must be completed and not already have bills)
CREATE OR REPLACE FUNCTION can_batch_be_billed(batch_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_orders INTEGER;
    completed_orders INTEGER;
    billed_orders INTEGER;
BEGIN
    -- Count total orders in batch
    SELECT COUNT(*) INTO total_orders
    FROM work_orders
    WHERE batch_id = batch_id_param;
    
    -- Count completed orders in batch
    SELECT COUNT(*) INTO completed_orders
    FROM work_orders
    WHERE batch_id = batch_id_param AND status = 'completed';
    
    -- Count orders that already have bills
    SELECT COUNT(*) INTO billed_orders
    FROM work_orders wo
    INNER JOIN bills b ON wo.id = b.work_order_id
    WHERE wo.batch_id = batch_id_param;
    
    -- Can be billed if all orders are completed and none have bills yet
    RETURN (total_orders > 0 AND completed_orders = total_orders AND billed_orders = 0);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_batch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_work_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_batch_be_billed(UUID) TO authenticated;
