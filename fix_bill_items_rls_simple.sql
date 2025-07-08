-- Comprehensive fix for bill_items RLS issues
-- Run this in your Supabase SQL Editor

-- Step 1: Check current policies and auth context
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
WHERE tablename = 'bill_items'
ORDER BY policyname;

-- Check current auth context
SELECT auth.uid(), auth.role();

-- Step 2: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow all authenticated operations on bill_items" ON bill_items;
DROP POLICY IF EXISTS "Authenticated users can read bill items" ON bill_items;
DROP POLICY IF EXISTS "Authenticated users can insert bill items" ON bill_items;
DROP POLICY IF EXISTS "Authenticated users can update bill items" ON bill_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON bill_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON bill_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON bill_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON bill_items;

-- Step 3: Temporarily disable RLS to test if that's the issue
ALTER TABLE bill_items DISABLE ROW LEVEL SECURITY;

-- Step 4: If you want to re-enable RLS later with working policies, uncomment below:
/*
-- Re-enable RLS
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies for testing
CREATE POLICY "Allow all operations for testing" ON bill_items
    FOR ALL USING (true)
    WITH CHECK (true);
*/

-- Step 5: Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'bill_items' AND schemaname = 'public';
