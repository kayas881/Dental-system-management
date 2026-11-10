-- Comprehensive fix for bill_items RLS policy issues
-- Run this in your Supabase SQL Editor

-- Step 1: Check if user_profiles table exists and has the expected structure
-- This query will help debug RLS policy issues
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_name IN ('user_profiles', 'bill_items', 'bills')
ORDER BY t.table_name, c.ordinal_position;

-- Step 2: Check current RLS policies
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
WHERE tablename IN ('bill_items', 'bills')
ORDER BY tablename, policyname;

-- Step 3: Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can read bill items" ON bill_items;
DROP POLICY IF EXISTS "Authenticated users can insert bill items" ON bill_items;
DROP POLICY IF EXISTS "Authenticated users can update bill items" ON bill_items;

-- Step 4: Create working policies for bill_items
-- Option A: Simple authentication check (should work for basic cases)
CREATE POLICY "Enable read access for authenticated users" ON bill_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert access for authenticated users" ON bill_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update access for authenticated users" ON bill_items
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete access for authenticated users" ON bill_items
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 5: If the above doesn't work, try this more permissive approach
-- (uncomment if needed - this is for debugging only)
/*
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON bill_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON bill_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON bill_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON bill_items;

CREATE POLICY "Enable all access for authenticated users" ON bill_items
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
*/

-- Step 6: Verify the policies were created
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'bill_items'
ORDER BY policyname;
