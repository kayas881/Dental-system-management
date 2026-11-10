-- Updated RLS Policies for Dental Lab System
-- Run this in your Supabase SQL Editor to fix RLS issues

-- First, let's drop and recreate the work_orders policies with better error handling

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read work orders" ON work_orders;
DROP POLICY IF EXISTS "Authenticated users can insert work orders" ON work_orders;
DROP POLICY IF EXISTS "Authenticated users can update work orders" ON work_orders;

-- Create more permissive policies for work_orders
CREATE POLICY "Allow authenticated users to read work orders" ON work_orders
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert work orders" ON work_orders
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = created_by
    );

CREATE POLICY "Allow authenticated users to update work orders" ON work_orders
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Also ensure user_profiles table exists and has proper policies
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate user_profiles policies
DROP POLICY IF EXISTS "Users can read own profile by user_id" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON user_profiles;

-- Simple, permissive policies for user_profiles
CREATE POLICY "Allow authenticated read of profiles" ON user_profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert of profiles" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update of profiles" ON user_profiles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated delete of profiles" ON user_profiles
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Also fix bills policies
DROP POLICY IF EXISTS "Staff can read bills without amount" ON bills;
DROP POLICY IF EXISTS "Admin can read all bills" ON bills;
DROP POLICY IF EXISTS "Authenticated users can insert bills" ON bills;
DROP POLICY IF EXISTS "Admin can update bills" ON bills;

-- Simpler bills policies
CREATE POLICY "Allow authenticated users to read bills" ON bills
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert bills" ON bills
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = created_by
    );

CREATE POLICY "Allow authenticated users to update bills" ON bills
    FOR UPDATE USING (auth.uid() IS NOT NULL);
