// ============================================
// Supabase Configuration
// Replace these values after creating your Supabase project
// ============================================

const SUPABASE_URL = 'https://exztnkqtsbelwbcyznei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enRua3F0c2JlbHdiY3l6bmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDYzMTgsImV4cCI6MjA5NDYyMjMxOH0.ukWUtk41Yw2xeu5KLPN4Lf9t_baTWTZHm0RtR30GY9A';

// Dashboard access password (change this to something secure)
const DASHBOARD_PASSWORD = 'isabelle2026';

// Patient info for PDF reports
const PATIENT_NAME = 'Isabelle';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
