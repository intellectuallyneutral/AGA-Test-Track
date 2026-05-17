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

// Initialize Supabase client (deferred to handle CDN load timing)
let supabase;
function initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  }
  return false;
}
// Try immediately, retry if CDN still loading
if (!initSupabase()) {
  let attempts = 0;
  const retryInit = setInterval(() => {
    if (initSupabase() || ++attempts > 20) clearInterval(retryInit);
  }, 200);
}
