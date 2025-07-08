-- Dental Lab Management System Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Initial Work Orders (when doctor places order)
CREATE TABLE work_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_name TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    product_quality TEXT NOT NULL,
    product_shade TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    requires_trial BOOLEAN DEFAULT FALSE,
    trial_date_1 DATE,
    trial_date_2 DATE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_date DATE,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bills (generated after work completion)
CREATE TABLE bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    work_description TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    completion_date DATE NOT NULL,
    amount DECIMAL(10,2), -- Only admin can set this (sensitive)
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'priced', 'printed', 'sent')),
    created_by UUID REFERENCES auth.users(id),
    priced_by UUID REFERENCES auth.users(id), -- Admin who set the price
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_orders
CREATE POLICY "Authenticated users can read work orders" ON work_orders
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert work orders" ON work_orders
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update work orders" ON work_orders
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for bills (with amount protection)
CREATE POLICY "Staff can read bills without amount" ON bills
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'USER'
        )
    );

CREATE POLICY "Admin can read all bills" ON bills
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'ADMIN'
        )
    );

CREATE POLICY "Authenticated users can insert bills" ON bills
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can update bills" ON bills
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_work_orders_serial ON work_orders(serial_number);
CREATE INDEX idx_work_orders_doctor ON work_orders(doctor_name);
CREATE INDEX idx_work_orders_date ON work_orders(order_date);
CREATE INDEX idx_work_orders_completion ON work_orders(completion_date);
CREATE INDEX idx_bills_date ON bills(bill_date);
CREATE INDEX idx_bills_doctor ON bills(doctor_name);
CREATE INDEX idx_bills_status ON bills(status);
