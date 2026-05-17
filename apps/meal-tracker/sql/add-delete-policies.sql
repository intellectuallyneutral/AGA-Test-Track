-- ============================================
-- Migration: Add DELETE policies for dashboard management
-- Run this in your Supabase SQL Editor
-- ============================================

-- Allow public deletes on entries table
CREATE POLICY allow_public_delete ON public.entries
  FOR DELETE USING (true);

-- Allow public deletes on symptoms table
CREATE POLICY allow_public_delete ON public.symptoms
  FOR DELETE USING (true);
