/**
 * supabase-config.js
 * Bibliothèque Lycée Maroc — Supabase Client Configuration
 *
 * Initializes the Supabase client using the public anon key.
 * Authentication via Google OAuth is optional (read-only access
 * works without authentication for all public tables).
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── Project Configuration ───────────────────────────────────────────────────
const SUPABASE_URL  = 'https://lnxebxmcbkwpdgmauvtb.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxueGVieG1jYmt3cGRnbWF1dnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODg2NTQsImV4cCI6MjA5OTE2NDY1NH0.4m-0rXdqrZp9Z5lk2H_3UQmTqOTPJfncp0mTinvAWCM';

// ─── Initialize Client ────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:    true,        // Remember login across page refreshes
    autoRefreshToken:  true,        // Auto-refresh JWT token before expiry
    detectSessionInUrl: true,       // Handle OAuth redirect URLs automatically
    storage:           localStorage // Store session in localStorage
  },
  global: {
    headers: {
      'X-Client-Info': 'lycee-maroc-web/1.0.0'
    }
  },
  db: {
    schema: 'public'
  }
});

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/**
 * Sign in with Google OAuth.
 * Redirects the user to Google, then back to the dashboard.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/lycee_maroc_web/dashboard.html',
      queryParams: {
        access_type: 'offline',
        prompt:      'consent'
      }
    }
  });
  if (error) throw error;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the currently authenticated user (or null if not logged in).
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Subscribe to auth state changes.
 * @param {Function} callback - (event, session) => void
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
