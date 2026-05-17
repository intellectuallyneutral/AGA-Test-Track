-- ============================================
-- Isabelle's Meal Tracker — Database Schema
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Food & Drink entries
CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  entry_time TIMESTAMPTZ NOT NULL,
  submitter_name TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('food', 'drink')),
  item_name TEXT NOT NULL,
  portion_size TEXT,
  notes TEXT
);

-- Symptom reports
CREATE TABLE symptoms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  symptom_time TIMESTAMPTZ NOT NULL,
  submitter_name TEXT NOT NULL,
  symptom_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes TEXT
);

-- Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone with the link can submit)
CREATE POLICY "public_insert_entries" ON entries FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_symptoms" ON symptoms FOR INSERT WITH CHECK (true);

-- Public read (dashboard uses app-level password gate)
CREATE POLICY "public_read_entries" ON entries FOR SELECT USING (true);
CREATE POLICY "public_read_symptoms" ON symptoms FOR SELECT USING (true);

-- Indexes for fast time-range queries
CREATE INDEX idx_entries_time ON entries (entry_time DESC);
CREATE INDEX idx_symptoms_time ON symptoms (symptom_time DESC);
CREATE INDEX idx_entries_submitter ON entries (submitter_name);
CREATE INDEX idx_symptoms_submitter ON symptoms (submitter_name);