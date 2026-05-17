// ============================================
// Supabase Configuration
// ============================================

var SUPABASE_URL = 'https://exztnkqtsbelwbcyznei.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enRua3F0c2JlbHdiY3l6bmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDYzMTgsImV4cCI6MjA5NDYyMjMxOH0.ukWUtk41Yw2xeu5KLPN4Lf9t_baTWTZHm0RtR30GY9A';

// Dashboard access password
var DASHBOARD_PASSWORD = 'isabelle2026';

// Patient info for PDF reports
var PATIENT_NAME = 'Isabelle';

// ============================================
// Supabase Client Initialization
// ============================================
// The CDN <script> sets window.supabase to the library object.
// We capture that reference, create a client, and expose it as window.db.
// All app code should use getSupabase() which returns a Promise
// that resolves only when the client is ready.

var _supabaseReady = false;
var _supabaseReadyCallbacks = [];

// getSupabase() — guaranteed to return a working client
function getSupabase() {
  if (_supabaseReady) {
    return Promise.resolve(window.db);
  }
  return new Promise(function(resolve) {
    _supabaseReadyCallbacks.push(resolve);
  });
}

(function initSupabaseClient() {
  var lib = window.supabase;
  if (lib && typeof lib.createClient === 'function') {
    window.db = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    _supabaseReady = true;
    // Resolve any pending getSupabase() calls
    _supabaseReadyCallbacks.forEach(function(cb) { cb(window.db); });
    _supabaseReadyCallbacks = [];
  } else {
    setTimeout(initSupabaseClient, 50);
  }
})();
