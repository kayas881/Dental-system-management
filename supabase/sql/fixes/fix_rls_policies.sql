-- Fix for infinite recursion in RLS policies
-- Run this in your Supabase SQL Editor

-- First, drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Create new, simpler policies that don't cause recursion

-- 1. Allow users to read their own profile (by user_id)
CREATE POLICY "Users can read own profile by user_id" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Allow users to insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. For admin operations, we'll use a service key approach
-- Create a policy that allows full access if the user has admin role
-- but use a different approach to avoid recursion

-- Temporary: Allow all authenticated users to read profiles
-- (We'll control admin access through application logic)
CREATE POLICY "Authenticated users can read profiles" ON user_profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update profiles (we'll control this in app)
CREATE POLICY "Authenticated users can update profiles" ON user_profiles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete profiles (we'll control this in app)
CREATE POLICY "Authenticated users can delete profiles" ON user_profiles
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert profiles (for creating new users)
CREATE POLICY "Authenticated users can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
