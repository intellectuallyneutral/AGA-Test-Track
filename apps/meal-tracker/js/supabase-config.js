// ============================================
// Supabase Configuration
// Replace these values after creating your Supabase project
// ============================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // e.g. https://abcdefg.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Found in Project Settings > API

// Dashboard access password (change this to something secure)
const DASHBOARD_PASSWORD = 'isabelle2026';

// Patient info for PDF reports
const PATIENT_NAME = 'Isabelle';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
