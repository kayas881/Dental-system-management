-- Fix RLS policies for bill_items table
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read bill items" ON bill_items;
DROP POLICY IF EXISTS "Authenticated users can insert bill items" ON bill_items;
DROP POLICY IF EXISTS "Authenticated users can update bill items" ON bill_items;

-- Create more specific policies that match the bills table structure
CREATE POLICY "Staff can read bill items" ON bill_items
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('USER', 'ADMIN')
        )
    );

CREATE POLICY "Admin can read all bill items" ON bill_items
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

CREATE POLICY "Authenticated users can insert bill items" ON bill_items
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('USER', 'ADMIN')
        )
    );

CREATE POLICY "Admin can update bill items" ON bill_items
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

CREATE POLICY "Admin can delete bill items" ON bill_items
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'ADMIN'
        )
    );
