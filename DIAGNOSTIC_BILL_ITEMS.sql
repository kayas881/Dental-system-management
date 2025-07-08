-- Diagnostic queries for bill_items table
-- Run these in Supabase SQL Editor to check the table structure and permissions

-- 1. Check if bill_items table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'bill_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT 
    tablename,
    rowsecurity,
    hasindices,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'bill_items';

-- 3. Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'bill_items';

-- 4. Test basic operations (replace with actual IDs from your database)
-- Check if you can read bill_items
SELECT COUNT(*) as total_bill_items FROM bill_items;

-- 5. Check sample data structure
SELECT 
    id,
    bill_id,
    work_order_id,
    unit_price,
    total_price,
    item_description
FROM bill_items 
LIMIT 5;

-- 6. Test if we can manually update a bill_item price
-- Replace the ID with one from your data above (like '7919cb8a-eda7-40bb-bd84-044722a6c5a5')
UPDATE bill_items 
SET unit_price = 99.99, total_price = 99.99 
WHERE id = '7919cb8a-eda7-40bb-bd84-044722a6c5a5';

-- 7. Check if the update worked
SELECT id, unit_price, total_price, item_description 
FROM bill_items 
WHERE id = '7919cb8a-eda7-40bb-bd84-044722a6c5a5';

-- 8. Test with a different record
UPDATE bill_items 
SET unit_price = 12.50, total_price = 12.50 
WHERE id = 'a14f6e36-c835-48f9-8c59-8913c7652854';

-- 9. Check that update too
SELECT id, unit_price, total_price, item_description 
FROM bill_items 
WHERE id = 'a14f6e36-c835-48f9-8c59-8913c7652854';
