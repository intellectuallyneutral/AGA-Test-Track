// ============================================
// Supabase Configuration
// ============================================

var SUPABASE_URL = 'https://exztnkqtsbelwbcyznei.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enRua3F0c2JlbHdiY3l6bmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDYzMTgsImV4cCI6MjA5NDYyMjMxOH0.ukWUtk41Yw2xeu5KLPN4Lf9t_baTWTZHm0RtR30GY9A';

// Admin key — used ONLY in the password-protected dashboard for delete operations.
// This bypasses RLS. The dashboard is gated behind DASHBOARD_PASSWORD.
var SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enRua3F0c2JlbHdiY3l6bmVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA0NjMxOCwiZXhwIjoyMDk0NjIyMzE4fQ.lQnDyCShkGqMTm-WP1S7SxQtRAPi9UZUID9zCcr72WI';

// Dashboard access password
var DASHBOARD_PASSWORD = 'isabelle2026';

// Patient info for PDF reports
var PATIENT_NAME = 'Isabelle';

// ============================================
// Supabase Client Initialization
// ============================================
// The CDN <script> sets window.supabase to the library object.
// We create TWO clients:
//   window.db      — anon key (public reads/writes, respects RLS)
//   window.dbAdmin — service role key (dashboard deletes, bypasses RLS)
// All app code should use getSupabase() for reads/writes.
// Dashboard delete operations use getAdminSupabase().

var _supabaseReady = false;
var _supabaseReadyCallbacks = [];

// getSupabase() — returns the anon-key client (for reads/writes)
function getSupabase() {
  if (_supabaseReady) {
    return Promise.resolve(window.db);
  }
  return new Promise(function(resolve) {
    _supabaseReadyCallbacks.push(resolve);
  });
}

// getAdminSupabase() — returns the service-role client (for deletes)
function getAdminSupabase() {
  if (_supabaseReady) {
    return Promise.resolve(window.dbAdmin);
  }
  return new Promise(function(resolve) {
    _supabaseReadyCallbacks.push(function() { resolve(window.dbAdmin); });
  });
}

(function initSupabaseClient() {
  var lib = window.supabase;
  if (lib && typeof lib.createClient === 'function') {
    window.db = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.dbAdmin = lib.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    _supabaseReady = true;
    // Resolve any pending getSupabase() / getAdminSupabase() calls
    _supabaseReadyCallbacks.forEach(function(cb) { cb(window.db); });
    _supabaseReadyCallbacks = [];
  } else {
    setTimeout(initSupabaseClient, 50);
  }
})();
