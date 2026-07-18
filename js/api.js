/**
 * api.js
 * Bibliothèque Lycée Maroc — Data Access Layer
 *
 * All Supabase queries are centralized here.
 * Each function returns clean, typed data with proper error handling.
 */

import { supabase } from './supabase-config.js';

// ─── Cache ────────────────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generic Supabase query wrapper with error handling.
 * @template T
 * @param {() => Promise<{data: T, error: any}>} queryFn
 * @param {string} cacheKey - Optional cache key
 * @returns {Promise<T>}
 */
async function query(queryFn, cacheKey = null) {
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached !== null) return cached;
  }

  const { data, error } = await queryFn();

  if (error) {
    console.error('[Supabase Error]', error.message, error);
    throw new Error(error.message || 'Une erreur est survenue lors de la connexion à la base de données.');
  }

  if (cacheKey) setCache(cacheKey, data);
  return data;
}

/**
 * Format file size from bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return 'N/A';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

// ─── Levels ───────────────────────────────────────────────────────────────────

/**
 * Fetch all levels with their branch count.
 * @returns {Promise<Array<{id: number, name: string, display_name: string, branch_count?: number}>>}
 */
export async function fetchLevels() {
  return query(
    () => supabase
      .from('levels')
      .select('id, name, display_name')
      .order('id', { ascending: true }),
    'levels:all'
  );
}

// ─── Branches ─────────────────────────────────────────────────────────────────

/**
 * Fetch branches for a given level.
 * @param {number} levelId
 * @returns {Promise<Array<{id: number, level_id: number, name: string, display_name: string}>>}
 */
export async function fetchBranches(levelId) {
  return query(
    () => supabase
      .from('branches')
      .select('id, level_id, name, display_name')
      .eq('level_id', levelId)
      .order('id', { ascending: true }),
    `branches:level_${levelId}`
  );
}

/**
 * Fetch all branches (for statistics).
 */
export async function fetchAllBranches() {
  return query(
    () => supabase
      .from('branches')
      .select('id, level_id, name, display_name')
      .order('level_id', { ascending: true }),
    'branches:all'
  );
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

/**
 * Fetch subjects for a given branch, including PDF count.
 * @param {number} branchId
 * @returns {Promise<Array<{id: number, branch_id: number, name: string, display_name: string, pdf_count?: number}>>}
 */
export async function fetchSubjects(branchId) {
  const data = await query(
    () => supabase
      .from('subjects')
      .select('id, branch_id, name, display_name, pdfs(count)')
      .eq('branch_id', branchId)
      .order('id', { ascending: true }),
    `subjects:branch_${branchId}`
  );

  // Flatten the nested count
  return data.map(s => ({
    ...s,
    pdf_count: s.pdfs?.[0]?.count ?? 0
  }));
}

// ─── PDFs ─────────────────────────────────────────────────────────────────────

/**
 * Fetch PDFs for a given subject.
 * @param {number} subjectId
 * @returns {Promise<Array<{id: number, subject_id: number, name: string, file_path: string, url: string, size_bytes: number}>>}
 */
export async function fetchPdfs(subjectId) {
  return query(
    () => supabase
      .from('pdfs')
      .select('id, subject_id, name, file_path, url, size_bytes, created_at')
      .eq('subject_id', subjectId)
      .order('name', { ascending: true }),
    `pdfs:subject_${subjectId}`
  );
}

/**
 * Search PDFs by name within a subject.
 * @param {string} searchTerm
 * @param {number|null} subjectId - If null, search across all PDFs
 * @returns {Promise<Array>}
 */
export async function searchPdfs(searchTerm, subjectId = null) {
  if (!searchTerm || searchTerm.trim().length < 2) return [];

  let queryBuilder = supabase
    .from('pdfs')
    .select('id, subject_id, name, file_path, url, size_bytes')
    .ilike('name', `%${searchTerm.trim()}%`)
    .order('name', { ascending: true })
    .limit(50);

  if (subjectId) {
    queryBuilder = queryBuilder.eq('subject_id', subjectId);
  }

  return query(() => queryBuilder);
}

/**
 * Fetch global statistics for the platform.
 * @returns {Promise<{levels: number, branches: number, subjects: number, pdfs: number}>}
 */
export async function fetchStats() {
  const cacheKey = 'stats:global';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [
    { count: levels },
    { count: branches },
    { count: subjects },
    { count: pdfs }
  ] = await Promise.all([
    supabase.from('levels').select('*',   { count: 'exact', head: true }),
    supabase.from('branches').select('*', { count: 'exact', head: true }),
    supabase.from('subjects').select('*', { count: 'exact', head: true }),
    supabase.from('pdfs').select('*',     { count: 'exact', head: true })
  ]);

  const stats = { levels, branches, subjects, pdfs };
  setCache(cacheKey, stats);
  return stats;
}

/**
 * Clear the entire cache (useful after auth state changes).
 */
export function clearCache() {
  cache.clear();
}
