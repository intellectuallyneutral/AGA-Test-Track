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
// IMPORTANT: We must NOT use 'var supabase' because that would overwrite
// window.supabase (which the CDN sets to the library object) with undefined
// due to var hoisting. Instead, we use an IIFE to capture the library
// reference and then replace window.supabase with the client instance.
(function initSupabaseClient() {
  var lib = window.supabase;
  if (lib && typeof lib.createClient === 'function') {
    window.supabase = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    // CDN not ready yet, retry every 100ms (up to 5 seconds)
    setTimeout(initSupabaseClient, 100);
  }
})();

// Convenience alias for other scripts
// After init, 'supabase' in global scope resolves to window.supabase (the client)
