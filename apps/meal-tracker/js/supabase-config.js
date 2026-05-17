// ============================================
// Supabase Configuration
// ============================================

var SUPABASE_URL = 'https://exztnkqtsbelwbcyznei.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enRua3F0c2JlbHdiY3l6bmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDYzMTgsImV4cCI6MjA5NDYyMjMxOH0.ukWUtk41Yw2xeu5KLPN4Lf9t_baTWTZHm0RtR30GY9A';

// Dashboard access password (change this to something secure)
var DASHBOARD_PASSWORD = 'isabelle2026';

// Patient info for PDF reports
var PATIENT_NAME = 'Isabelle';

// Initialize Supabase client
// Store the CDN library reference, then overwrite with client instance
var _supabaseLib = null;
var supabase = null;

function initSupabase() {
  _supabaseLib = _supabaseLib || window.supabase;
  if (_supabaseLib && _supabaseLib.createClient) {
    supabase = _supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabase = supabase; // ensure global access
    return true;
  }
  return false;
}

if (!initSupabase()) {
  var _initAttempts = 0;
  var _initTimer = setInterval(function() {
    if (initSupabase() || ++_initAttempts > 30) {
      clearInterval(_initTimer);
    }
  }, 200);
}
