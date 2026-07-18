/**
 * ui.js — Bibliothèque Lycée Maroc
 * Single-Page App controller: tabs, navigation, auth, PDF viewer, favorites.
 *
 * IMPORTANT: All DOM queries happen inside init() after DOMContentLoaded.
 * No top-level document.getElementById() calls.
 */

import {
  fetchLevels,
  fetchBranches,
  fetchSubjects,
  fetchPdfs,
  formatFileSize
} from './api.js';

import {
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  signOut,
  getCurrentUser,
  onAuthStateChange
} from './supabase-config.js';

// ─── App State ────────────────────────────────────────────────────────────────
const state = {
  currentTab: 'home',
  currentStep: 0,        // 0=levels 1=branches 2=subjects 3=pdfs
  selectedLevel: null,
  selectedBranch: null,
  selectedSubject: null,
  currentPdfs: [],
  filteredPdfs: [],
  searchQuery: '',
  theme: localStorage.getItem('theme') || 'dark',
  user: null,
  favorites: [],
  readHistory: [],
  lastRead: null,
  pdfZoom: 100,
  pdfInverted: false
};

// Safe JSON parse from localStorage
function loadStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

state.favorites   = loadStorage('lycee_favorites', []);
state.readHistory = loadStorage('lycee_history',   []);
state.lastRead    = loadStorage('lycee_last_read', null);

// ─── Static config ─────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  'tronc-commun': { icon: '🌱', label: 'Tronc Commun',   desc: '1ère année du lycée' },
  '1ere-bac':     { icon: '📘', label: '1ère Bac',        desc: '2ème année du lycée' },
  '2eme-bac':     { icon: '🎓', label: '2ème Bac',        desc: 'Examen National — Baccalauréat' }
};

const BRANCH_ICONS = {
  'sciences-biof':           '🔬',
  'sciences-experimentales': '⚡',
  'sciences-maths':          '📐',
  'sciences-physiques':      '⚗️',
  'sciences-svt':            '🧬',
  'default':                 '📚'
};

const SUBJECT_ICONS = {
  'mathematiques':        '📐',
  'physique-chimie':      '⚗️',
  'svt':                  '🧬',
  'francais':             '📖',
  'anglais':              '🌍',
  'arabe':                '📜',
  'philosophie':          '🧠',
  'histoire-geographie':  '🗺️',
  'informatique':         '💻',
  'education-islamique':  '☪️',
  'default':              '📚'
};

const QUOTES = [
  '« La persévérance est la clé de la réussite scolaire. » 💡',
  '« Chaque cours lu est un pas de plus vers votre réussite ! » 🚀',
  '« Le secret de la réussite est la constance dans l\'effort. » 📚',
  '« N\'abandonnez jamais, de grandes choses prennent du temps. » 🎓',
  '« L\'éducation est l\'arme la plus puissante pour changer le monde. » 🇲🇦'
];

// ─── DOM shorthand (lazy — called inside init after DOM is ready) ─────────────
let el = {};

function q(id) { return document.getElementById(id); }

function buildEls() {
  el = {
    // Tabs
    navHome:      q('nav-tab-home'),
    navExplore:   q('nav-tab-explore'),
    navFavorites: q('nav-tab-favorites'),
    navProfile:   q('nav-tab-profile'),

    // Views
    viewHome:      q('view-home'),
    viewExplore:   q('view-explore'),
    viewFavorites: q('view-favorites'),
    viewProfile:   q('view-profile'),

    // Explore header
    exploreHeaderMeta: q('explore-header-meta'),
    breadcrumb:        q('breadcrumb'),
    contentArea:       q('content-area'),
    sectionTitle:      q('section-title'),
    sectionSubtitle:   q('section-subtitle'),

    // Search
    searchContainer: q('search-container'),
    searchInput:     q('search-input'),
    searchClear:     q('search-clear'),
    resultsCount:    q('results-count'),

    // AppBar
    themeToggle:  q('theme-toggle'),
    authBtn:      q('auth-btn'),
    userArea:     q('user-area'),
    userAvatar:   q('user-avatar'),
    userInitial:  q('user-initial'),
    appBrandLink: q('app-bar-brand-link'),

    // PDF Modal
    pdfModal:        q('pdf-modal'),
    pdfIframe:       q('pdf-iframe'),
    pdfModalTitle:   q('pdf-modal-title'),
    modalClose:      q('modal-close'),
    pdfDownloadBtn:  q('pdf-download-btn'),
    pdfOpenBtn:      q('pdf-open-btn'),
    pdfLoadingState: q('pdf-loading-state'),
    pdfToolZoomIn:   q('pdf-tool-zoom-in'),
    pdfToolZoomOut:  q('pdf-tool-zoom-out'),
    pdfToolTheme:    q('pdf-tool-theme'),
    pdfToolBookmark: q('pdf-tool-bookmark'),
    pdfToolShare:    q('pdf-tool-share'),

    // Auth Modal
    authModal:      q('auth-modal'),
    authModalClose: q('auth-modal-close'),
    googleBtn:      q('google-signin-btn'),
    loginForm:      q('login-form'),
    signupForm:     q('signup-form'),
    forgotForm:     q('forgot-form'),
    authViewLogin:  q('auth-view-login'),
    authViewSignup: q('auth-view-signup'),
    authViewForgot: q('auth-view-forgot'),
    gotoSignup:     q('goto-signup'),
    gotoLogin:      q('goto-login'),
    gotoLogin2:     q('goto-login-2'),
    gotoForgot:     q('goto-forgot'),

    // Profile
    profileName:       q('profile-display-name'),
    profileEmail:      q('profile-display-email'),
    profileAvatarArea: q('profile-avatar-area'),
    profileSignout:    q('profile-signout-btn'),
    profileAbout:      q('profile-about-btn'),
    profileTerms:      q('profile-terms-btn'),
    profileContact:    q('profile-contact-btn'),
    statRead:          q('stat-read-count'),
    statFavs:          q('stat-favorites-count'),
    statProgress:      q('stat-progress-streak'),

    // Settings
    darkSwitch: q('setting-dark-mode-switch'),
    notifSwitch: q('setting-notification-switch'),

    // Sub-modals
    aboutModal:        q('about-modal'),
    aboutModalClose:   q('about-modal-close'),
    termsModal:        q('terms-modal'),
    termsModalClose:   q('terms-modal-close'),
    contactModal:      q('contact-modal'),
    contactModalClose: q('contact-modal-close'),

    // Home
    homeWelcome:       q('home-welcome'),
    motivationQuote:   q('motivation-quote'),
    continueLearning:  q('continue-learning-wrapper'),
    continuePdfTitle:  q('continue-pdf-title'),
    continuePdfMeta:   q('continue-pdf-meta'),
    continuePdfProgress: q('continue-pdf-progress'),
    continuePdfBtn:    q('continue-pdf-btn'),
    popularSubjects:   q('home-popular-subjects'),
    homeQuickFavs:     q('home-quick-favs'),

    // Toasts
    toastContainer: q('toast-container')
  };
}

// ─── Theme ──────────────────────────────────────────────────────────────────
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  state.theme = theme;
  if (el.themeToggle) el.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (el.darkSwitch)  el.darkSwitch.checked = (theme === 'dark');
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ─── Toasts ─────────────────────────────────────────────────────────────────
let _toastId = 0;
export function showToast(type, title, msg = '', dur = 4000) {
  if (!el.toastContainer) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>`;
  el.toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add('hiding');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, dur);
}

// ─── Tab switching ────────────────────────────────────────────────────────────
const TABS = ['home', 'explore', 'favorites', 'profile'];

function switchTab(tab) {
  if (!TABS.includes(tab)) return;
  state.currentTab = tab;

  // Update nav items
  TABS.forEach(t => {
    const nav  = q(`nav-tab-${t}`);
    const view = q(`view-${t}`);
    if (nav)  nav.classList.toggle('active', t === tab);
    if (view) view.classList.toggle('active', t === tab);
  });

  // Show breadcrumb only on explore
  if (el.exploreHeaderMeta) {
    el.exploreHeaderMeta.style.display = (tab === 'explore') ? 'block' : 'none';
  }

  // Load content
  if (tab === 'home')      renderHome();
  if (tab === 'explore')   { renderBreadcrumb(); if (state.currentStep === 0) showLevels(); }
  if (tab === 'favorites') renderFavorites();
  if (tab === 'profile')   renderProfile();
}

// ─── Skeleton builders ────────────────────────────────────────────────────────
function levelSkels(n = 3) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="skeleton" style="width:52px;height:52px;border-radius:12px;"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
        <div class="skeleton skeleton-line w-3-4" style="height:16px;"></div>
        <div class="skeleton skeleton-line w-1-2" style="height:10px;"></div>
      </div>
    </div>`).join('');
}

function branchSkels(n = 4) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card" style="flex-direction:row;align-items:center;gap:16px;">
      <div class="skeleton" style="width:48px;height:48px;border-radius:12px;flex-shrink:0;"></div>
      <div class="skeleton skeleton-line w-1-2" style="height:14px;flex:1;"></div>
    </div>`).join('');
}

function subjectSkels(n = 6) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card" style="align-items:center;gap:10px;">
      <div class="skeleton" style="width:44px;height:44px;border-radius:50%;"></div>
      <div class="skeleton skeleton-line w-3-4" style="height:12px;"></div>
      <div class="skeleton skeleton-line w-1-4" style="height:8px;"></div>
    </div>`).join('');
}

function pdfSkels(n = 5) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-pdf-card">
      <div class="skeleton skeleton-pdf-preview"></div>
      <div class="skeleton-pdf-body">
        <div class="skeleton skeleton-line" style="height:14px;width:70%;"></div>
        <div class="skeleton skeleton-line w-1-2" style="height:10px;margin-top:6px;"></div>
      </div>
    </div>`).join('');
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function renderBreadcrumb() {
  if (!el.breadcrumb) return;
  const items = [{ label: '🏠 Explorer', step: 0 }];
  if (state.selectedLevel)   items.push({ label: LEVEL_CONFIG[state.selectedLevel.name]?.label  || state.selectedLevel.display_name,  step: 1 });
  if (state.selectedBranch)  items.push({ label: state.selectedBranch.display_name,  step: 2 });
  if (state.selectedSubject) items.push({ label: state.selectedSubject.display_name, step: 3 });

  el.breadcrumb.innerHTML = items.map((item, i) => {
    const last = i === items.length - 1;
    return `<span class="breadcrumb-item${last ? ' active' : ''}" data-step="${item.step}">${item.label}</span>` +
           (last ? '' : '<span class="breadcrumb-sep">›</span>');
  }).join('');

  el.breadcrumb.querySelectorAll('.breadcrumb-item:not(.active)').forEach(span => {
    span.style.cursor = 'pointer';
    span.addEventListener('click', () => gotoStep(parseInt(span.dataset.step)));
  });
}

function gotoStep(step) {
  if (step === 0) { state.currentStep = 0; state.selectedLevel = null; state.selectedBranch = null; state.selectedSubject = null; showLevels(); }
  else if (step === 1 && state.selectedLevel)  { state.currentStep = 1; state.selectedBranch = null; state.selectedSubject = null; showBranches(state.selectedLevel.id); }
  else if (step === 2 && state.selectedBranch) { state.currentStep = 2; state.selectedSubject = null; showSubjects(state.selectedBranch.id); }
  else if (step === 3 && state.selectedSubject){ state.currentStep = 3; showPdfs(state.selectedSubject.id); }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function setContent(html) {
  if (el.contentArea) el.contentArea.innerHTML = html;
}

function setHeader(title, subtitle) {
  if (el.sectionTitle)    el.sectionTitle.textContent    = title;
  if (el.sectionSubtitle) el.sectionSubtitle.textContent = subtitle;
}

function showSearch(show) {
  if (el.searchContainer) el.searchContainer.style.display = show ? 'block' : 'none';
  const bar = q('results-bar');
  if (bar) bar.style.display = show ? 'flex' : 'none';
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── STEP 0: Levels ──────────────────────────────────────────────────────────
export async function showLevels() {
  state.currentStep = 0;
  setHeader('Parcourir par Niveau', 'Sélectionnez votre année scolaire.');
  showSearch(false);
  renderBreadcrumb();
  setContent(`<div class="levels-grid">${levelSkels(3)}</div>`);

  try {
    const levels = await fetchLevels();
    const html = levels.map(lv => {
      const cfg = LEVEL_CONFIG[lv.name] || { icon: '📚', label: lv.display_name, desc: '' };
      return `
        <div class="level-card" data-id="${lv.id}" data-name="${lv.name}" tabindex="0" role="button" aria-label="${cfg.label}">
          <div class="level-icon-wrapper">${cfg.icon}</div>
          <div class="level-details">
            <h3>${cfg.label}</h3>
            <p>${cfg.desc}</p>
          </div>
          <div class="level-arrow">›</div>
        </div>`;
    }).join('');
    setContent(`<div class="levels-grid">${html}</div>`);
    attachClickHandlers('.level-card', card => {
      state.selectedLevel = { id: parseInt(card.dataset.id), name: card.dataset.name, display_name: LEVEL_CONFIG[card.dataset.name]?.label || card.dataset.name };
      state.currentStep = 1;
      showBranches(state.selectedLevel.id);
    });
  } catch (err) {
    setContent(emptyState('⚠️', 'Erreur de connexion', err.message, true));
    showToast('error', 'Erreur', err.message);
  }
}

// ─── STEP 1: Branches ────────────────────────────────────────────────────────
export async function showBranches(levelId) {
  const label = LEVEL_CONFIG[state.selectedLevel?.name]?.label || 'Niveau';
  setHeader(label, 'Choisissez votre filière ou spécialité.');
  showSearch(false);
  renderBreadcrumb();
  setContent(`<div class="branches-grid">${branchSkels(4)}</div>`);

  try {
    const branches = await fetchBranches(levelId);
    if (!branches.length) { setContent(emptyState('📂', 'Aucune filière disponible', 'Ce niveau ne possède pas encore de filières.')); return; }
    const html = branches.map(b => {
      const icon = BRANCH_ICONS[b.name] || BRANCH_ICONS.default;
      return `
        <div class="branch-card" data-id="${b.id}" data-name="${b.name}" data-display="${esc(b.display_name)}" tabindex="0" role="button">
          <div class="branch-icon">${icon}</div>
          <h3>${esc(b.display_name)}</h3>
        </div>`;
    }).join('');
    setContent(`<div class="branches-grid">${html}</div>`);
    attachClickHandlers('.branch-card', card => {
      state.selectedBranch = { id: parseInt(card.dataset.id), name: card.dataset.name, display_name: card.dataset.display };
      state.currentStep = 2;
      showSubjects(state.selectedBranch.id);
    });
  } catch (err) {
    setContent(emptyState('⚠️', err.message));
    showToast('error', 'Erreur', err.message);
  }
}

// ─── STEP 2: Subjects ────────────────────────────────────────────────────────
export async function showSubjects(branchId) {
  setHeader(state.selectedBranch?.display_name || 'Matières', 'Choisissez une matière pour accéder aux documents.');
  showSearch(false);
  renderBreadcrumb();
  setContent(`<div class="subjects-grid">${subjectSkels(6)}</div>`);

  try {
    const subjects = await fetchSubjects(branchId);
    if (!subjects.length) { setContent(emptyState('📚', 'Aucune matière disponible')); return; }
    const html = subjects.map(s => {
      const icon = SUBJECT_ICONS[s.name] || SUBJECT_ICONS.default;
      return `
        <div class="subject-card" data-id="${s.id}" data-name="${s.name}" data-display="${esc(s.display_name)}" tabindex="0" role="button">
          <div class="subject-icon">${icon}</div>
          <h3>${esc(s.display_name)}</h3>
          <span class="subject-count">${s.pdf_count ?? 0} PDFs</span>
        </div>`;
    }).join('');
    setContent(`<div class="subjects-grid">${html}</div>`);
    attachClickHandlers('.subject-card', card => {
      state.selectedSubject = { id: parseInt(card.dataset.id), name: card.dataset.name, display_name: card.dataset.display };
      state.currentStep = 3;
      showPdfs(state.selectedSubject.id);
    });
  } catch (err) {
    setContent(emptyState('⚠️', err.message));
    showToast('error', 'Erreur', err.message);
  }
}

// ─── STEP 3: PDFs ───────────────────────────────────────────────────────────
export async function showPdfs(subjectId) {
  setHeader(state.selectedSubject?.display_name || 'Documents', 'Appuyez sur un fichier pour le lire.');
  showSearch(true);
  renderBreadcrumb();
  setContent(`<div class="pdfs-grid">${pdfSkels(5)}</div>`);

  try {
    state.currentPdfs  = await fetchPdfs(subjectId);
    state.filteredPdfs = [...state.currentPdfs];
    state.searchQuery  = '';
    if (el.searchInput) el.searchInput.value = '';
    updateResultsCount(state.filteredPdfs.length);
    renderPdfs(state.filteredPdfs, el.contentArea);
  } catch (err) {
    setContent(emptyState('⚠️', err.message));
    showToast('error', 'Erreur', err.message);
  }
}

// ─── Render PDF list ─────────────────────────────────────────────────────────
function renderPdfs(pdfs, container) {
  if (!container) return;
  if (!pdfs.length) {
    container.innerHTML = emptyState('🔍', 'Aucun document', 'Essayez un autre terme de recherche.');
    return;
  }
  const html = pdfs.map(pdf => {
    const size = formatFileSize(pdf.size_bytes);
    const name = esc(pdf.name.replace(/\.pdf$/i, '').replace(/_/g, ' '));
    const isFav = state.favorites.some(f => f.id === pdf.id);
    return `
      <div class="pdf-card" data-id="${pdf.id}" data-url="${esc(pdf.url)}" data-name="${esc(pdf.name)}" tabindex="0" role="button">
        <div class="pdf-card-preview">
          <span class="pdf-card-icon">📄</span>
          <span class="pdf-card-badge">PDF</span>
        </div>
        <div class="pdf-card-info">
          <div class="pdf-card-title" title="${esc(pdf.name)}">${name}</div>
          <div class="pdf-card-meta"><span>💾 ${size}</span></div>
        </div>
        <div class="pdf-card-favorite-btn${isFav ? ' active' : ''}" data-id="${pdf.id}" title="Favori">❤️</div>
      </div>`;
  }).join('');
  container.innerHTML = `<div class="pdfs-grid">${html}</div>`;
  container.querySelectorAll('.pdf-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('pdf-card-favorite-btn')) {
        e.stopPropagation();
        toggleFavorite(parseInt(card.dataset.id), pdfs);
      } else {
        openPdf(card.dataset.url, card.dataset.name, parseInt(card.dataset.id), pdfs);
      }
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') openPdf(card.dataset.url, card.dataset.name, parseInt(card.dataset.id), pdfs);
    });
  });
}

// ─── Utility: attach click + keyboard to dynamically rendered cards ───────────
function attachClickHandlers(selector, handler) {
  el.contentArea?.querySelectorAll(selector).forEach(card => {
    card.addEventListener('click',   () => handler(card));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(card); });
  });
}

// ─── Utility: empty state HTML ────────────────────────────────────────────────
function emptyState(icon, title, msg = '', showReload = false) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>${title}</h3>
      ${msg ? `<p>${msg}</p>` : ''}
      ${showReload ? `<button class="btn btn-primary mt-4" onclick="location.reload()">🔄 Réessayer</button>` : ''}
    </div>`;
}

// ─── Search ───────────────────────────────────────────────────────────────────
let searchTimer;
function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();
  if (el.searchClear) el.searchClear.style.display = query ? 'block' : 'none';
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filteredPdfs = state.searchQuery
      ? state.currentPdfs.filter(p => p.name.toLowerCase().includes(state.searchQuery))
      : [...state.currentPdfs];
    updateResultsCount(state.filteredPdfs.length);
    renderPdfs(state.filteredPdfs, el.contentArea);
  }, 200);
}

function clearSearch() {
  state.searchQuery = '';
  if (el.searchInput) el.searchInput.value = '';
  if (el.searchClear) el.searchClear.style.display = 'none';
  state.filteredPdfs = [...state.currentPdfs];
  updateResultsCount(state.filteredPdfs.length);
  renderPdfs(state.filteredPdfs, el.contentArea);
}

function updateResultsCount(n) {
  if (el.resultsCount) el.resultsCount.textContent = `${n} document${n !== 1 ? 's' : ''}`;
}

// ─── Favorites ────────────────────────────────────────────────────────────────
function toggleFavorite(id, pdfsPool = []) {
  const pdf = pdfsPool.find(p => p.id === id)
           || state.favorites.find(p => p.id === id)
           || state.readHistory.find(p => p.id === id);
  if (!pdf) return;

  const idx = state.favorites.findIndex(f => f.id === id);
  if (idx > -1) {
    state.favorites.splice(idx, 1);
    showToast('info', 'Retiré des favoris');
  } else {
    state.favorites.push(pdf);
    showToast('success', 'Ajouté aux favoris');
  }
  localStorage.setItem('lycee_favorites', JSON.stringify(state.favorites));
  document.querySelectorAll(`.pdf-card-favorite-btn[data-id="${id}"]`).forEach(b => {
    b.classList.toggle('active', idx === -1);
  });
  if (state.currentTab === 'favorites') renderFavorites();
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function renderHome() {
  if (el.homeWelcome) {
    const name = state.user?.user_metadata?.full_name || state.user?.email?.split('@')[0] || 'Élève';
    el.homeWelcome.innerHTML = `<h2>Bonjour, ${name} ! 👋</h2><p>Apprends quelque chose de nouveau aujourd'hui.</p>`;
  }
  if (el.motivationQuote) {
    el.motivationQuote.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }
  if (el.continueLearning) {
    if (state.lastRead) {
      el.continueLearning.classList.remove('hidden');
      if (el.continuePdfTitle) el.continuePdfTitle.textContent = state.lastRead.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
      if (el.continuePdfMeta)  el.continuePdfMeta.textContent  = formatFileSize(state.lastRead.size_bytes);
      if (el.continuePdfProgress) el.continuePdfProgress.style.width = '65%';
    } else {
      el.continueLearning.classList.add('hidden');
    }
  }
}

// ─── Favorites view ───────────────────────────────────────────────────────────
function renderFavorites() {
  const area = q('favorites-list-area');
  if (!area) return;
  if (!state.favorites.length) {
    area.innerHTML = emptyState('❤️', 'Aucun favori', 'Appuyez sur ❤️ sur un PDF pour l\'ajouter ici.');
    return;
  }
  renderPdfs(state.favorites, area);
}

// ─── Profile view ─────────────────────────────────────────────────────────────
function renderProfile() {
  const u = state.user;
  if (el.profileName)  el.profileName.textContent  = u ? (u.user_metadata?.full_name || 'Élève') : 'Utilisateur Invité';
  if (el.profileEmail) el.profileEmail.textContent = u ? u.email : 'Connectez-vous pour sauvegarder vos stats';
  if (el.profileSignout) el.profileSignout.classList.toggle('hidden', !u);

  if (el.profileAvatarArea) {
    if (u?.user_metadata?.avatar_url) {
      el.profileAvatarArea.innerHTML = `<img src="${u.user_metadata.avatar_url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      const init = (u?.user_metadata?.full_name || u?.email || '?')[0].toUpperCase();
      el.profileAvatarArea.innerHTML = `<span style="font-weight:700;font-size:2rem;color:var(--primary);">${init}</span>`;
    }
  }

  if (el.statRead)     el.statRead.textContent     = state.readHistory.length;
  if (el.statFavs)     el.statFavs.textContent     = state.favorites.length;
  if (el.statProgress) el.statProgress.textContent = Math.min(Math.round(state.readHistory.length / 10 * 100), 100) + '%';
}

// ─── Auth UI ───────────────────────────────────────────────────────────────────
function updateAuthUI(user) {
  state.user = user;
  if (el.authBtn)  el.authBtn.classList.toggle('hidden', !!user);
  if (el.userArea) el.userArea.classList.toggle('hidden', !user);
  if (user && el.userInitial) {
    const avatar = user.user_metadata?.avatar_url;
    if (avatar && el.userAvatar) {
      el.userAvatar.innerHTML = `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      el.userInitial.textContent = (user.user_metadata?.full_name || user.email || '?')[0].toUpperCase();
    }
  }
  if (state.currentTab === 'profile') renderProfile();
}

function openAuthModal()  { switchAuthView('login');  if (el.authModal) { el.authModal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; } }
function closeAuthModal() { if (el.authModal) { el.authModal.classList.add('hidden'); document.body.style.overflow = ''; } }
function switchAuthView(view) {
  ['login','signup','forgot'].forEach(v => {
    const el2 = q(`auth-view-${v}`);
    if (el2) el2.classList.toggle('hidden', v !== view);
  });
}

// ─── PDF Viewer ────────────────────────────────────────────────────────────────
function openPdf(url, name, id = null, pdfsPool = []) {
  if (!el.pdfModal || !el.pdfIframe) return;
  const clean = (name || '').replace(/\.pdf$/i, '').replace(/_/g, ' ');
  if (el.pdfModalTitle) el.pdfModalTitle.textContent = clean;
  if (el.pdfLoadingState) el.pdfLoadingState.style.display = 'flex';
  if (el.pdfDownloadBtn)  el.pdfDownloadBtn.href = url;
  if (el.pdfOpenBtn)      el.pdfOpenBtn.href     = url;

  // Track history
  if (id) {
    const obj = pdfsPool.find(p => p.id === id) || state.currentPdfs.find(p => p.id === id) || { id, name, url };
    if (!state.readHistory.some(p => p.id === obj.id)) {
      state.readHistory.push(obj);
      localStorage.setItem('lycee_history', JSON.stringify(state.readHistory));
    }
    state.lastRead = obj;
    localStorage.setItem('lycee_last_read', JSON.stringify(obj));
  }

  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  el.pdfIframe.src = viewerUrl;
  el.pdfIframe.onload = () => { if (el.pdfLoadingState) el.pdfLoadingState.style.display = 'none'; };

  el.pdfModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  state.pdfZoom = 100;
  applyPdfStyles();
}

function closePdf() {
  if (!el.pdfModal) return;
  el.pdfModal.classList.add('hidden');
  if (el.pdfIframe) el.pdfIframe.src = 'about:blank';
  document.body.style.overflow = '';
}

function applyPdfStyles() {
  if (!el.pdfIframe) return;
  el.pdfIframe.style.transform = `scale(${state.pdfZoom / 100})`;
  el.pdfIframe.style.transformOrigin = 'top center';
  el.pdfIframe.classList.toggle('dark-reader-filter', state.pdfInverted);
  if (el.pdfToolTheme) el.pdfToolTheme.classList.toggle('active', state.pdfInverted);
}

function openModal(modalEl)  { if (modalEl) { modalEl.classList.remove('hidden'); document.body.style.overflow = 'hidden'; } }
function closeModal(modalEl) { if (modalEl) { modalEl.classList.add('hidden');    document.body.style.overflow = '';       } }

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  // Build element references NOW that DOM is ready
  buildEls();

  // Apply saved theme
  applyTheme(state.theme);

  // ── Bottom nav tab clicks ──
  TABS.forEach(tab => {
    const btn = q(`nav-tab-${tab}`);
    if (btn) btn.addEventListener('click', () => switchTab(tab));
  });

  // ── AppBar brand click → Home ──
  if (el.appBrandLink) el.appBrandLink.addEventListener('click', () => switchTab('home'));

  // ── Theme toggle ──
  if (el.themeToggle) el.themeToggle.addEventListener('click', toggleTheme);
  if (el.darkSwitch) {
    el.darkSwitch.addEventListener('change', () => {
      applyTheme(el.darkSwitch.checked ? 'dark' : 'light');
    });
  }

  // ── Search ──
  if (el.searchInput) el.searchInput.addEventListener('input', e => handleSearch(e.target.value));
  if (el.searchClear) el.searchClear.addEventListener('click', clearSearch);

  // ── Home quick-access cards ──
  if (el.homeQuickFavs) el.homeQuickFavs.addEventListener('click', () => switchTab('favorites'));

  // Home popular subject cards (delegated from static HTML)
  const homeView = q('view-home');
  if (homeView) {
    homeView.addEventListener('click', e => {
      const card = e.target.closest('[data-explore-level]');
      if (card) {
        const lvName = card.dataset.exploreLevel;
        switchTab('explore');
        setTimeout(() => {
          const lCard = el.contentArea?.querySelector(`.level-card[data-name="${lvName}"]`);
          if (lCard) lCard.click();
        }, 250);
      }
    });
  }

  // ── PDF modal ──
  if (el.modalClose) el.modalClose.addEventListener('click', closePdf);
  if (el.pdfModal)   el.pdfModal.addEventListener('click', e => { if (e.target === el.pdfModal) closePdf(); });

  // ── PDF toolbar ──
  if (el.pdfToolZoomIn)   el.pdfToolZoomIn.addEventListener('click',   () => { if (state.pdfZoom < 200) { state.pdfZoom += 10; applyPdfStyles(); } });
  if (el.pdfToolZoomOut)  el.pdfToolZoomOut.addEventListener('click',  () => { if (state.pdfZoom > 60)  { state.pdfZoom -= 10; applyPdfStyles(); } });
  if (el.pdfToolTheme)    el.pdfToolTheme.addEventListener('click',    () => { state.pdfInverted = !state.pdfInverted; applyPdfStyles(); });
  if (el.pdfToolBookmark) el.pdfToolBookmark.addEventListener('click', () => { if (state.lastRead) showToast('success', 'Position sauvegardée !'); });
  if (el.pdfToolShare)    el.pdfToolShare.addEventListener('click',    () => {
    if (state.lastRead?.url) {
      navigator.clipboard?.writeText(state.lastRead.url).then(() => showToast('info', 'Lien copié !'));
    }
  });

  // ── Continue Reading button on Home ──
  if (el.continuePdfBtn) {
    el.continuePdfBtn.addEventListener('click', () => {
      if (state.lastRead) openPdf(state.lastRead.url, state.lastRead.name, state.lastRead.id);
    });
  }

  // ── Auth modal ──
  if (el.authBtn)      el.authBtn.addEventListener('click',      openAuthModal);
  if (el.userAvatar)   el.userAvatar.addEventListener('click',   () => switchTab('profile'));
  if (el.authModalClose) el.authModalClose.addEventListener('click', closeAuthModal);
  if (el.authModal) el.authModal.addEventListener('click', e => { if (e.target === el.authModal) closeAuthModal(); });

  // ── Auth form toggles ──
  if (el.gotoSignup) el.gotoSignup.addEventListener('click', () => switchAuthView('signup'));
  if (el.gotoLogin)  el.gotoLogin.addEventListener('click',  () => switchAuthView('login'));
  if (el.gotoLogin2) el.gotoLogin2.addEventListener('click', () => switchAuthView('login'));
  if (el.gotoForgot) el.gotoForgot.addEventListener('click', () => switchAuthView('forgot'));

  // ── Google Sign-In ──
  if (el.googleBtn) el.googleBtn.addEventListener('click', async () => {
    try { await signInWithGoogle(); }
    catch (err) { showToast('error', 'Erreur Google', err.message); }
  });

  // ── Email/Password login ──
  if (el.loginForm) el.loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = q('login-email')?.value;
    const pass  = q('login-password')?.value;
    try { await signInWithEmail(email, pass); showToast('success', 'Connecté !'); closeAuthModal(); }
    catch (err) { showToast('error', 'Erreur de connexion', err.message); }
  });

  // ── Sign-Up ──
  if (el.signupForm) el.signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name  = q('signup-name')?.value;
    const email = q('signup-email')?.value;
    const pass  = q('signup-password')?.value;
    try { await signUpWithEmail(email, pass, name); showToast('success', 'Compte créé !', 'Vérifiez votre email.'); closeAuthModal(); }
    catch (err) { showToast('error', 'Erreur d\'inscription', err.message); }
  });

  // ── Forgot Password ──
  if (el.forgotForm) el.forgotForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = q('forgot-email')?.value;
    try { await resetPassword(email); showToast('success', 'Email envoyé !'); closeAuthModal(); }
    catch (err) { showToast('error', 'Erreur', err.message); }
  });

  // ── Sign-Out ──
  if (el.profileSignout) el.profileSignout.addEventListener('click', async () => {
    try { await signOut(); showToast('info', 'Déconnecté'); switchTab('home'); }
    catch (err) { showToast('error', 'Erreur', err.message); }
  });

  // ── Notification switch (mock) ──
  if (el.notifSwitch) el.notifSwitch.addEventListener('change', e => {
    showToast('info', e.target.checked ? 'Notifications activées' : 'Notifications désactivées');
  });

  // ── Profile sub-modals ──
  const modalPairs = [
    { btn: el.profileAbout,   modal: el.aboutModal,   close: el.aboutModalClose },
    { btn: el.profileTerms,   modal: el.termsModal,   close: el.termsModalClose },
    { btn: el.profileContact, modal: el.contactModal, close: el.contactModalClose }
  ];
  modalPairs.forEach(({ btn, modal, close }) => {
    if (btn   && modal) btn.addEventListener('click',   () => openModal(modal));
    if (close && modal) close.addEventListener('click', () => closeModal(modal));
    if (modal)          modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal); });
  });

  // ── Keyboard escape ──
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closePdf();
      closeAuthModal();
      modalPairs.forEach(({ modal }) => closeModal(modal));
    }
  });

  // ── Supabase Auth state ──
  try {
    const user = await getCurrentUser();
    updateAuthUI(user);
    onAuthStateChange((event, session) => {
      updateAuthUI(session?.user || null);
      if (event === 'SIGNED_IN') { showToast('success', 'Connecté !'); closeAuthModal(); }
    });
  } catch (_) { /* auth is optional */ }

  // ── Start on Home ──
  switchTab('home');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
