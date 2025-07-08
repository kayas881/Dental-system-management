-- Enhanced bills schema for multiple work orders and itemized billing
-- Run this in your Supabase SQL Editor

-- First, let's modify the bills table to support multiple work orders
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_grouped BOOLEAN DEFAULT FALSE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS bill_number TEXT;

-- Create a new table for bill items (individual work orders within a bill)
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    product_quality TEXT NOT NULL,
    product_shade TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_work_order_id ON bill_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_bills_group_id ON bills(group_id);
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number);

-- Add RLS policies for bill_items
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bill items" ON bill_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert bill items" ON bill_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update bill items" ON bill_items
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Function to generate bill numbers
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
    bill_num TEXT;
BEGIN
    -- Get the next value from sequence (reuse work order sequence)
    next_id := nextval('work_order_serial_seq');
    
    -- Format as BILL-YYYY-NNNN
    bill_num := 'BILL-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_id::TEXT, 4, '0');
    
    -- Check if this bill number already exists
    WHILE EXISTS (SELECT 1 FROM bills WHERE bill_number = bill_num) LOOP
        next_id := nextval('work_order_serial_seq');
        bill_num := 'BILL-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_id::TEXT, 4, '0');
    END LOOP;
    
    RETURN bill_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate bill numbers
CREATE OR REPLACE FUNCTION set_bill_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.bill_number IS NULL OR NEW.bill_number = '' THEN
        NEW.bill_number := generate_bill_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_bill_number_trigger ON bills;
CREATE TRIGGER auto_bill_number_trigger
    BEFORE INSERT ON bills
    FOR EACH ROW
    EXECUTE FUNCTION set_bill_number();

-- Function to calculate total bill amount from items
CREATE OR REPLACE FUNCTION calculate_bill_total(bill_id_param UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_amount DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total_price), 0)
    INTO total_amount
    FROM bill_items
    WHERE bill_id = bill_id_param;
    
    RETURN total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to update bill total when items change
CREATE OR REPLACE FUNCTION update_bill_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the bills table with calculated total
    UPDATE bills 
    SET amount = calculate_bill_total(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.bill_id
            ELSE NEW.bill_id
        END
    ),
    updated_at = NOW()
    WHERE id = (
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.bill_id
            ELSE NEW.bill_id
        END
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update bill totals
DROP TRIGGER IF EXISTS update_bill_total_on_item_change ON bill_items;
CREATE TRIGGER update_bill_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON bill_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_total();

-- Add updated_at trigger for bill_items
DROP TRIGGER IF EXISTS update_bill_items_updated_at ON bill_items;
CREATE TRIGGER update_bill_items_updated_at 
    BEFORE UPDATE ON bill_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bill_items IS 'Individual items/work orders within a bill for itemized billing';
COMMENT ON COLUMN bills.is_grouped IS 'Whether this bill contains multiple work orders';
COMMENT ON COLUMN bills.group_id IS 'Groups related bills together';
COMMENT ON COLUMN bills.bill_number IS 'Auto-generated bill number (BILL-YYYY-NNNN)';
COMMENT ON FUNCTION calculate_bill_total(UUID) IS 'Calculates total amount for a bill from its items';
COMMENT ON FUNCTION update_bill_total() IS 'Trigger function to auto-update bill totals when items change';
