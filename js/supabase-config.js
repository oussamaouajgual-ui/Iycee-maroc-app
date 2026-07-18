/**
 * supabase-config.js
 * Bibliothèque Lycée Maroc — Supabase Client Configuration
 *
 * Initializes the Supabase client using the public anon key.
 * Provides authentication services for Google OAuth and Email/Password.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── Project Configuration ───────────────────────────────────────────────────
const SUPABASE_URL  = 'https://lnxebxmcbkwpdgmauvtb.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxueGVieG1jYmt3cGRnbWF1dnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODg2NTQsImV4cCI6MjA5OTE2NDY1NH0.4m-0rXdqrZp9Z5lk2H_3UQmTqOTPJfncp0mTinvAWCM';

// Helper to resolve dashboard URL dynamically to support local and production domains
function getRedirectUrl() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    // Local workspace URL path
    return window.location.origin + '/lycee_maroc_web/dashboard.html';
  }
  // Netlify production URL
  return window.location.origin + '/dashboard.html';
}

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
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
      queryParams: {
        access_type: 'offline',
        prompt:      'consent'
      }
    }
  });
  if (error) throw error;
}

/**
 * Sign up with Email & Password.
 */
export async function signUpWithEmail(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: getRedirectUrl()
    }
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in with Email & Password.
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

/**
 * Send a Password Reset Link.
 */
export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl()
  });
  if (error) throw error;
  return data;
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
