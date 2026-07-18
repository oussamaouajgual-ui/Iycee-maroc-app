/**
 * ui.js
 * Bibliothèque Lycée Maroc — Dashboard UI Controller (Single Page App)
 *
 * Manages the views, themes, tab switches, cascading lists, search queries,
 * favorites, statistics, authentication modals, and PDF custom viewer.
 */

import {
  fetchLevels,
  fetchBranches,
  fetchSubjects,
  fetchPdfs,
  searchPdfs,
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

// ─── App Global State ────────────────────────────────────────────────────────
const state = {
  currentTab:    'home', // 'home', 'explore', 'favorites', 'profile'
  currentStep:   0,      // 0=levels, 1=branches, 2=subjects, 3=pdfs
  selectedLevel:   null,
  selectedBranch:  null,
  selectedSubject: null,
  currentPdfs:    [],
  filteredPdfs:   [],
  searchQuery:    '',
  theme: localStorage.getItem('theme') || 'dark',
  user:  null,

  // Local Storage Features
  favorites: JSON.parse(localStorage.getItem('lycee_favorites') || '[]'),
  readHistory: JSON.parse(localStorage.getItem('lycee_history') || '[]'),
  lastRead: JSON.parse(localStorage.getItem('lycee_last_read') || 'null'),
  
  // Custom PDF viewer settings
  pdfZoom: 100,
  pdfInverted: false
};

// ─── Theme & Motivation Configurations ───────────────────────────────────────
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

const MOTIVATIONAL_QUOTES = [
  "« La persévérance est la clé de la réussite scolaire. » 💡",
  "« Chaque cours lu est un pas de plus vers votre réussite ! » 🚀",
  "« Croyez en vous-même et en tout ce que vous êtes. » 🌟",
  "« Le secret de la réussite est la constance dans l'effort. » 📚",
  "« N'abandonnez jamais, de grandes choses prennent du temps. » 🎓",
  "« L'éducation est l'arme la plus puissante pour changer le monde. » 🇲🇦"
];

const LEVEL_CONFIG = {
  'tronc-commun': { icon: '🌱', label: 'Tronc Commun', desc: '1ère année du lycée' },
  '1ere-bac':     { icon: '📘', label: '1ère Bac',     desc: '2ème année du lycée' },
  '2eme-bac':     { icon: '🎓', label: '2ème Bac',     desc: 'Examen National — Baccalauréat' }
};

const BRANCH_ICONS = {
  'sciences-biof':          '🔬',
  'sciences-experimentales':'⚡',
  'sciences-maths':         '📐',
  'sciences-physiques':     '⚗️',
  'sciences-svt':           '🧬',
  'default':                '📚'
};

// ─── Helper Query Selector ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  // Navigation Tabs
  navHome:      $('nav-tab-home'),
  navExplore:   $('nav-tab-explore'),
  navFavorites: $('nav-tab-favorites'),
  navProfile:   $('nav-tab-profile'),

  // Views Portal
  viewHome:      $('view-home'),
  viewExplore:   $('view-explore'),
  viewFavorites: $('view-favorites'),
  viewProfile:   $('view-profile'),

  // Explore metadata header
  exploreHeaderMeta: $('explore-header-meta'),
  stepsContainer:  $('steps-container'),
  breadcrumb:      $('breadcrumb'),
  contentArea:     $('content-area'),
  sectionTitle:    $('section-title'),
  sectionSubtitle: $('section-subtitle'),

  // Search
  searchContainer: $('search-container'),
  searchInput:     $('search-input'),
  searchClear:     $('search-clear'),
  resultsCount:    $('results-count'),

  // Auth Button
  authBtn:         $('auth-btn'),
  userArea:        $('user-area'),
  userAvatar:      $('user-avatar'),
  userInitial:     $('user-initial'),

  // Theme Toggle
  themeToggle:     $('theme-toggle'),

  // Modals & Popups
  pdfModal:        $('pdf-modal'),
  pdfIframe:       $('pdf-iframe'),
  pdfModalTitle:   $('pdf-modal-title'),
  modalClose:      $('modal-close'),
  pdfDownloadBtn:  $('pdf-download-btn'),
  pdfOpenBtn:      $('pdf-open-btn'),
  pdfLoadingState: $('pdf-loading-state'),

  // PDF Toolbar Buttons
  pdfZoomIn:       $('pdf-tool-zoom-in'),
  pdfZoomOut:      $('pdf-tool-zoom-out'),
  pdfToolTheme:    $('pdf-tool-theme'),
  pdfToolBookmark: $('pdf-tool-bookmark'),
  pdfToolShare:    $('pdf-tool-share'),

  // Auth Overlays
  authModal:       $('auth-modal'),
  authModalClose:  $('auth-modal-close'),
  googleSigninBtn: $('google-signin-btn'),
  
  // Auth subviews
  authViewLogin:   $('auth-view-login'),
  authViewSignup:  $('auth-view-signup'),
  authViewForgot:  $('auth-view-forgot'),

  // Auth links
  gotoSignup:      $('goto-signup'),
  gotoLogin:       $('goto-login'),
  gotoLogin2:      $('goto-login-2'),
  gotoForgot:      $('goto-forgot'),

  // Auth forms
  loginForm:       $('login-form'),
  signupForm:      $('signup-form'),
  forgotForm:      $('forgot-form'),

  // Profile view items
  profileDisplayName:  $('profile-display-name'),
  profileDisplayEmail: $('profile-display-email'),
  profileAvatarArea:   $('profile-avatar-area'),
  profileAvatarInitial:$('profile-avatar-initial'),
  profileSignoutBtn:   $('profile-signout-btn'),
  
  // Profile modallers
  profileAboutBtn:     $('profile-about-btn'),
  profileTermsBtn:     $('profile-terms-btn'),
  profileContactBtn:   $('profile-contact-btn'),
  
  // Modals
  aboutModal:          $('about-modal'),
  aboutModalClose:     $('about-modal-close'),
  termsModal:          $('terms-modal'),
  termsModalClose:     $('terms-modal-close'),
  contactModal:        $('contact-modal'),
  contactModalClose:   $('contact-modal-close'),

  // Settings
  settingDarkModeSwitch: $('setting-dark-mode-switch'),
  settingNotificationSwitch: $('setting-notification-switch'),

  // Toast
  toastContainer:  $('toast-container'),

  // Home Specifics
  motivationQuote:    $('motivation-quote'),
  continueLearningWrapper: $('continue-learning-wrapper'),
  continuePdfTitle:   $('continue-pdf-title'),
  continuePdfMeta:    $('continue-pdf-meta'),
  continuePdfProgress:$('continue-pdf-progress'),
  continuePdfBtn:     $('continue-pdf-btn'),
  homePopularSubjects: $('home-popular-subjects'),
  homeQuickFavs:       $('home-quick-favs'),
  homeWelcome:         $('home-welcome'),

  // Profile Specific Stats
  statReadCount:      $('stat-read-count'),
  statFavoritesCount: $('stat-favorites-count'),
  statProgressStreak:  $('stat-progress-streak')
};

// ─── Theme Manager ────────────────────────────────────────────────────────────
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (els.themeToggle) {
    els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  if (els.settingDarkModeSwitch) {
    els.settingDarkModeSwitch.checked = theme === 'dark';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
let toastId = 0;
export function showToast(type, title, message = '', duration = 4000) {
  if (!els.toastContainer) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const id = ++toastId;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.id = `toast-${id}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
  `;

  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);

  return id;
}

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
function switchTab(tabId) {
  state.currentTab = tabId;
  
  // Update nav item active states
  const tabs = ['home', 'explore', 'favorites', 'profile'];
  tabs.forEach(tab => {
    const navItem = els[`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}`];
    const viewItem = els[`view${tab.charAt(0).toUpperCase() + tab.slice(1)}`];
    
    if (navItem) navItem.classList.toggle('active', tab === tabId);
    if (viewItem) viewItem.classList.toggle('active', tab === tabId);
  });

  // Display breadcrumb bar only on Explore
  if (els.exploreHeaderMeta) {
    els.exploreHeaderMeta.style.display = tabId === 'explore' ? 'block' : 'none';
  }

  // Refresh tab content dynamically
  if (tabId === 'home') {
    renderHomeView();
  } else if (tabId === 'explore') {
    renderStepsIndicator();
    renderBreadcrumb();
    if (state.currentStep === 0) showLevels();
    else if (state.currentStep === 1) showBranches(state.selectedLevel.id);
    else if (state.currentStep === 2) showSubjects(state.selectedBranch.id);
    else if (state.currentStep === 3) showPdfs(state.selectedSubject.id);
  } else if (tabId === 'favorites') {
    renderFavoritesView();
  } else if (tabId === 'profile') {
    renderProfileView();
  }
}

// ─── Skeletons Generators ─────────────────────────────────────────────────────
function createLevelSkeletons(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-circle" style="width:52px;height:52px;border-radius:12px;"></div>
      <div class="skeleton skeleton-line w-3-4" style="height:16px; margin-top:8px;"></div>
      <div class="skeleton skeleton-line w-1-2" style="height:10px; margin-top:4px;"></div>
    </div>
  `).join('');
}

function createBranchSkeletons(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" style="flex-direction:row; align-items:center; gap:16px;">
      <div class="skeleton skeleton-circle" style="width:48px;height:48px;border-radius:12px;flex-shrink:0;"></div>
      <div class="skeleton skeleton-line w-1-2" style="height:14px;"></div>
    </div>
  `).join('');
}

function createSubjectSkeletons(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" style="align-items:center;gap:10px;">
      <div class="skeleton skeleton-circle" style="width:44px;height:44px;border-radius:50px;"></div>
      <div class="skeleton skeleton-line w-3-4" style="height:12px;"></div>
      <div class="skeleton skeleton-line w-1-4" style="height:8px;"></div>
    </div>
  `).join('');
}

function createPdfSkeletons(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-pdf-card">
      <div class="skeleton skeleton-pdf-preview"></div>
      <div class="skeleton-pdf-body">
        <div class="skeleton skeleton-line" style="height:14px; width:70%;"></div>
        <div class="skeleton skeleton-line w-1-2" style="height:10px; margin-top:6px;"></div>
      </div>
    </div>
  `).join('');
}

// ─── Step / Breadcrumb Renderer (Explore tab) ───────────────────────────────
const STEPS = [
  { label: 'Niveau',  icon: '🎓' },
  { label: 'Filière', icon: '🔬' },
  { label: 'Matière', icon: '📚' },
  { label: 'PDFs',    icon: '📄' }
];

function renderStepsIndicator() {
  if (!els.stepsContainer) return;
  els.stepsContainer.innerHTML = ''; // Steps are hidden now in mobile header to clean up app bar space.
}

function renderBreadcrumb() {
  if (!els.breadcrumb) return;

  const items = [{ label: '🏠 Explore', step: 0 }];

  if (state.selectedLevel) {
    const cfg = LEVEL_CONFIG[state.selectedLevel.name] || {};
    items.push({ label: cfg.label || state.selectedLevel.display_name, step: 1 });
  }
  if (state.selectedBranch) {
    items.push({ label: state.selectedBranch.display_name, step: 2 });
  }
  if (state.selectedSubject) {
    items.push({ label: state.selectedSubject.display_name, step: 3 });
  }

  els.breadcrumb.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    return `
      <div class="breadcrumb-item ${isLast ? 'active' : ''}" data-step="${item.step}">
        ${item.label}
      </div>
      ${!isLast ? '<span class="breadcrumb-sep">›</span>' : ''}
    `;
  }).join('');

  els.breadcrumb.querySelectorAll('.breadcrumb-item:not(.active)').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => navigateToStep(parseInt(el.dataset.step)));
  });
}

function navigateToStep(step) {
  if (step === 0) {
    state.currentStep    = 0;
    state.selectedLevel   = null;
    state.selectedBranch  = null;
    state.selectedSubject = null;
    showLevels();
  } else if (step === 1 && state.selectedLevel) {
    state.currentStep    = 1;
    state.selectedBranch  = null;
    state.selectedSubject = null;
    showBranches(state.selectedLevel.id);
  } else if (step === 2 && state.selectedBranch) {
    state.currentStep    = 2;
    state.selectedSubject = null;
    showSubjects(state.selectedBranch.id);
  } else if (step === 3 && state.selectedSubject) {
    state.currentStep = 3;
    showPdfs(state.selectedSubject.id);
  }
}

// ─── Section Header Helper ────────────────────────────────────────────────────
function setSectionHeader(label, title, subtitle) {
  if (els.sectionTitle)    els.sectionTitle.textContent    = title;
  if (els.sectionSubtitle) els.sectionSubtitle.textContent = subtitle;
}

function setContent(html) {
  if (!els.contentArea) return;
  els.contentArea.innerHTML = html;
}

function showSearch(show) {
  if (els.searchContainer) {
    els.searchContainer.style.display = show ? 'block' : 'none';
  }
}

// ─── EXPLORE STEP 0: Levels ───────────────────────────────────────────────────
export async function showLevels() {
  state.currentStep = 0;
  setSectionHeader('🎓', 'Parcourir par Niveau', 'Sélectionnez votre année scolaire pour accéder aux matières.');
  showSearch(false);
  renderBreadcrumb();

  setContent(`<div class="levels-grid stagger-children">${createLevelSkeletons(3)}</div>`);

  try {
    const levels = await fetchLevels();

    const levelHTML = levels.map(level => {
      const cfg = LEVEL_CONFIG[level.name] || { icon: '📚', label: level.display_name, desc: '' };
      return `
        <div class="level-card" data-id="${level.id}" data-name="${level.name}" tabindex="0" role="button">
          <div class="level-icon-wrapper">${cfg.icon}</div>
          <div class="level-details">
            <h3>${cfg.label}</h3>
            <p>${cfg.desc}</p>
          </div>
          <div class="level-arrow">➔</div>
        </div>
      `;
    }).join('');

    setContent(`<div class="levels-grid stagger-children">${levelHTML}</div>`);

    els.contentArea.querySelectorAll('.level-card').forEach(card => {
      const handler = () => {
        const id = parseInt(card.dataset.id);
        const name = card.dataset.name;
        state.selectedLevel = { id, name, display_name: LEVEL_CONFIG[name]?.label || name };
        state.currentStep = 1;
        showBranches(id);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });

  } catch (err) {
    setContent(`
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Erreur de connexion</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary mt-4" onclick="location.reload()">🔄 Réessayer</button>
      </div>
    `);
    showToast('error', 'Erreur', 'Impossible de charger les niveaux.');
  }
}

// ─── EXPLORE STEP 1: Branches ─────────────────────────────────────────────────
export async function showBranches(levelId) {
  const levelCfg = LEVEL_CONFIG[state.selectedLevel?.name] || {};
  setSectionHeader('🔬', levelCfg.label || 'Filières', 'Sélectionnez votre filière ou spécialité.');
  showSearch(false);
  renderBreadcrumb();

  setContent(`<div class="branches-grid stagger-children">${createBranchSkeletons(4)}</div>`);

  try {
    const branches = await fetchBranches(levelId);

    if (!branches.length) {
      setContent(`
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <h3>Aucune filière disponible</h3>
          <p>Ce niveau ne possède pas encore de filières configurées.</p>
        </div>
      `);
      return;
    }

    const html = branches.map(branch => {
      const icon = BRANCH_ICONS[branch.name] || BRANCH_ICONS.default;
      return `
        <div class="branch-card" data-id="${branch.id}" data-name="${branch.name}" tabindex="0" role="button">
          <div class="branch-icon">${icon}</div>
          <h3>${branch.display_name}</h3>
        </div>
      `;
    }).join('');

    setContent(`<div class="branches-grid stagger-children">${html}</div>`);

    els.contentArea.querySelectorAll('.branch-card').forEach(card => {
      const handler = () => {
        const id = parseInt(card.dataset.id);
        state.selectedBranch = { id, display_name: card.querySelector('h3').textContent };
        state.currentStep = 2;
        showSubjects(id);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });

  } catch (err) {
    showToast('error', 'Erreur', err.message);
    setContent(`<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`);
  }
}

// ─── EXPLORE STEP 2: Subjects ─────────────────────────────────────────────────
export async function showSubjects(branchId) {
  setSectionHeader('📚', state.selectedBranch?.display_name || 'Matières', 'Choisissez une matière pour accéder aux documents.');
  showSearch(false);
  renderBreadcrumb();

  setContent(`<div class="subjects-grid stagger-children">${createSubjectSkeletons(6)}</div>`);

  try {
    const subjects = await fetchSubjects(branchId);

    if (!subjects.length) {
      setContent(`<div class="empty-state"><div class="empty-state-icon">📚</div><h3>Aucune matière disponible</h3></div>`);
      return;
    }

    const html = subjects.map(subj => {
      const icon = SUBJECT_ICONS[subj.name] || SUBJECT_ICONS.default;
      return `
        <div class="subject-card" data-id="${subj.id}" data-name="${subj.name}" tabindex="0" role="button">
          <div class="subject-icon">${icon}</div>
          <h3>${subj.display_name}</h3>
          <span class="subject-count">${subj.pdf_count ?? 0} PDFs</span>
        </div>
      `;
    }).join('');

    setContent(`<div class="subjects-grid stagger-children">${html}</div>`);

    els.contentArea.querySelectorAll('.subject-card').forEach(card => {
      const handler = () => {
        const id = parseInt(card.dataset.id);
        const name = card.dataset.name;
        state.selectedSubject = { id, name, display_name: card.querySelector('h3').textContent };
        state.currentStep = 3;
        showPdfs(id);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });

  } catch (err) {
    showToast('error', 'Erreur', err.message);
    setContent(`<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`);
  }
}

// ─── EXPLORE STEP 3: PDFs ─────────────────────────────────────────────────────
export async function showPdfs(subjectId) {
  setSectionHeader('📄', state.selectedSubject?.display_name || 'Documents', 'Recherchez et ouvrez vos fichiers PDF.');
  showSearch(true);
  renderBreadcrumb();

  setContent(`<div class="pdfs-grid">${createPdfSkeletons(4)}</div>`);

  try {
    state.currentPdfs = await fetchPdfs(subjectId);
    state.filteredPdfs = [...state.currentPdfs];
    state.searchQuery = '';

    if (els.searchInput) els.searchInput.value = '';
    if (els.resultsCount) els.resultsCount.textContent = `${state.filteredPdfs.length} documents`;

    renderPdfsList(state.filteredPdfs);

  } catch (err) {
    showToast('error', 'Erreur', err.message);
    setContent(`<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`);
  }
}

// ─── Render PDFs grid helper ──────────────────────────────────────────────────
function renderPdfsList(pdfs, containerId = null) {
  const isFavoritesView = containerId === 'favorites-list-area';
  const targetContainer = containerId ? $(containerId) : els.contentArea;

  if (!pdfs.length) {
    const fallbackHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>Aucun document</h3>
        <p>${isFavoritesView ? 'Vous n\'avez pas encore ajouté de favoris.' : 'Aucun fichier ne correspond à votre recherche.'}</p>
      </div>
    `;
    if (containerId) targetContainer.innerHTML = fallbackHTML;
    else setContent(fallbackHTML);
    return;
  }

  const html = pdfs.map((pdf) => {
    const size = formatFileSize(pdf.size_bytes);
    const cleanName = pdf.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const isFav = state.favorites.some(fav => fav.id === pdf.id || fav.url === pdf.url);

    return `
      <div class="pdf-card" data-id="${pdf.id}" data-url="${pdf.url}" data-name="${escapeHtml(pdf.name)}">
        <div class="pdf-card-preview">
          <span class="pdf-card-icon">📄</span>
          <span class="pdf-card-badge">PDF</span>
        </div>
        <div class="pdf-card-info">
          <div class="pdf-card-title" title="${escapeHtml(pdf.name)}">${escapeHtml(cleanName)}</div>
          <div class="pdf-card-meta">
            <span>💾 ${size}</span>
          </div>
        </div>
        <div class="pdf-card-favorite-btn ${isFav ? 'active' : ''}" data-id="${pdf.id}" title="Favori">❤️</div>
      </div>
    `;
  }).join('');

  if (containerId) {
    targetContainer.innerHTML = `<div class="pdfs-grid">${html}</div>`;
  } else {
    setContent(`<div class="pdfs-grid">${html}</div>`);
  }

  // Handle cards clicks
  const parent = containerId ? targetContainer : els.contentArea;
  parent.querySelectorAll('.pdf-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('pdf-card-favorite-btn')) {
        e.stopPropagation();
        toggleFavorite(card.dataset.id);
      } else {
        openPdfViewer(card.dataset.url, card.dataset.name, card.dataset.id);
      }
    });
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Search Functionality ─────────────────────────────────────────────────────
let searchDebounceTimer;
function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();
  if (els.searchClear) els.searchClear.style.display = query ? 'block' : 'none';

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    if (!state.searchQuery) {
      state.filteredPdfs = [...state.currentPdfs];
    } else {
      state.filteredPdfs = state.currentPdfs.filter(pdf =>
        pdf.name.toLowerCase().includes(state.searchQuery)
      );
    }
    
    if (els.resultsCount) {
      els.resultsCount.textContent = `${state.filteredPdfs.length} documents`;
    }
    renderPdfsList(state.filteredPdfs);
  }, 200);
}

function clearSearch() {
  state.searchQuery = '';
  if (els.searchInput) els.searchInput.value = '';
  if (els.searchClear) els.searchClear.style.display = 'none';
  state.filteredPdfs = [...state.currentPdfs];
  renderPdfsList(state.filteredPdfs);
}

// ─── Favorites Functionality ──────────────────────────────────────────────────
function toggleFavorite(pdfId) {
  // Try to find PDF in current level list or history
  const numericId = parseInt(pdfId);
  let pdf = state.currentPdfs.find(p => p.id === numericId);
  
  if (!pdf) {
    // Check in favorites or history
    pdf = state.favorites.find(p => p.id === numericId) || state.readHistory.find(p => p.id === numericId);
  }

  if (!pdf) return;

  const favIndex = state.favorites.findIndex(fav => fav.id === pdf.id);
  if (favIndex > -1) {
    state.favorites.splice(favIndex, 1);
    showToast('info', 'Retiré des favoris', pdf.name.replace(/\.pdf$/i, '').replace(/_/g, ' '));
  } else {
    state.favorites.push(pdf);
    showToast('success', 'Ajouté aux favoris', pdf.name.replace(/\.pdf$/i, '').replace(/_/g, ' '));
  }

  localStorage.setItem('lycee_favorites', JSON.stringify(state.favorites));

  // Sync icons
  document.querySelectorAll(`.pdf-card-favorite-btn[data-id="${pdfId}"]`).forEach(btn => {
    btn.classList.toggle('active', favIndex === -1);
  });

  // If in favorites view, refresh the list
  if (state.currentTab === 'favorites') {
    renderFavoritesView();
  }
}

// ─── Render HOME Tab ──────────────────────────────────────────────────────────
async function renderHomeView() {
  // Banner Welcome greeting
  if (els.homeWelcome) {
    const greeting = state.user
      ? `Bonjour, ${state.user.user_metadata?.full_name || state.user.email.split('@')[0]} ! 👋`
      : 'Bonjour, Élève ! 👋';
    els.homeWelcome.innerHTML = `<h2>${greeting}</h2><p>Apprends quelque chose de nouveau aujourd'hui.</p>`;
  }

  // Quote
  if (els.motivationQuote) {
    const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    els.motivationQuote.textContent = MOTIVATIONAL_QUOTES[idx];
  }

  // Last Read PDF logic
  if (state.lastRead && els.continueLearningWrapper) {
    els.continueLearningWrapper.classList.remove('hidden');
    if (els.continuePdfTitle) {
      els.continuePdfTitle.textContent = state.lastRead.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    }
    if (els.continuePdfMeta) {
      els.continuePdfMeta.textContent = `💾 Taille: ${formatFileSize(state.lastRead.size_bytes)}`;
    }
    if (els.continuePdfProgress) {
      // Fake progressive reading bar just for design aesthetics
      els.continuePdfProgress.style.width = '65%';
    }
  } else if (els.continueLearningWrapper) {
    els.continueLearningWrapper.classList.add('hidden');
  }

  // Popular subjects render
  if (els.homePopularSubjects) {
    els.homePopularSubjects.innerHTML = `
      <div class="subject-card" onclick="triggerExploreLevel('tronc-commun')">
        <div class="subject-icon">📐</div>
        <h3>Mathématiques</h3>
        <span class="subject-count">Sciences</span>
      </div>
      <div class="subject-card" onclick="triggerExploreLevel('2eme-bac')">
        <div class="subject-icon">⚗️</div>
        <h3>Physique-Chimie</h3>
        <span class="subject-count">2ème Bac</span>
      </div>
    `;
  }
}

// ─── Render FAVORITES Tab ─────────────────────────────────────────────────────
function renderFavoritesView() {
  renderPdfsList(state.favorites, 'favorites-list-area');
}

// ─── Render PROFILE Tab ───────────────────────────────────────────────────────
function renderProfileView() {
  if (state.user) {
    if (els.profileDisplayName) els.profileDisplayName.textContent = state.user.user_metadata?.full_name || 'Élève Connecté';
    if (els.profileDisplayEmail) els.profileDisplayEmail.textContent = state.user.email;
    if (els.profileSignoutBtn) els.profileSignoutBtn.classList.remove('hidden');
    
    const initial = (state.user.user_metadata?.full_name || state.user.email || '?')[0].toUpperCase();
    if (els.profileAvatarArea) {
      const avatarUrl = state.user.user_metadata?.avatar_url;
      if (avatarUrl) {
        els.profileAvatarArea.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
      } else {
        els.profileAvatarArea.innerHTML = `<span id="profile-avatar-initial">${initial}</span>`;
      }
    }
  } else {
    if (els.profileDisplayName) els.profileDisplayName.textContent = 'Utilisateur Invité';
    if (els.profileDisplayEmail) els.profileDisplayEmail.textContent = 'Connectez-vous pour sauvegarder vos stats';
    if (els.profileSignoutBtn) els.profileSignoutBtn.classList.add('hidden');
    if (els.profileAvatarArea) {
      els.profileAvatarArea.innerHTML = `<span id="profile-avatar-initial">?</span>`;
    }
  }

  // Set local counts
  if (els.statReadCount) els.statReadCount.textContent = state.readHistory.length;
  if (els.statFavoritesCount) els.statFavoritesCount.textContent = state.favorites.length;
  if (els.statProgressStreak) {
    const pct = Math.min(Math.round((state.readHistory.length / 10) * 100), 100);
    els.statProgressStreak.textContent = `${pct}%`;
  }
}

// ─── PDF Custom Viewer Modal ──────────────────────────────────────────────────
function openPdfViewer(url, name, id = null) {
  if (!els.pdfModal || !els.pdfIframe) return;

  const cleanName = name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
  if (els.pdfModalTitle) els.pdfModalTitle.textContent = cleanName;
  if (els.pdfLoadingState) els.pdfLoadingState.style.display = 'flex';
  if (els.pdfDownloadBtn) els.pdfDownloadBtn.href = url;
  if (els.pdfOpenBtn) els.pdfOpenBtn.href = url;

  // Track History & Last read
  if (id) {
    const numericId = parseInt(id);
    const pdfObject = state.currentPdfs.find(p => p.id === numericId) || { id: numericId, name, url };
    
    // Add to history if unique
    if (!state.readHistory.some(p => p.id === pdfObject.id)) {
      state.readHistory.push(pdfObject);
      localStorage.setItem('lycee_history', JSON.stringify(state.readHistory));
    }
    
    state.lastRead = pdfObject;
    localStorage.setItem('lycee_last_read', JSON.stringify(state.lastRead));
  }

  // Google docs viewer handles cross-origin PDFs cleanly
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  els.pdfIframe.src = viewerUrl;

  els.pdfIframe.onload = () => {
    if (els.pdfLoadingState) els.pdfLoadingState.style.display = 'none';
  };

  els.pdfModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Apply default toolbar settings
  state.pdfZoom = 100;
  applyPdfToolbarStyles();
}

function closePdfViewer() {
  if (!els.pdfModal || !els.pdfIframe) return;
  els.pdfModal.classList.add('hidden');
  els.pdfIframe.src = 'about:blank';
  document.body.style.overflow = '';
}

function applyPdfToolbarStyles() {
  if (!els.pdfIframe) return;
  
  // Apply zoom
  els.pdfIframe.style.transform = `scale(${state.pdfZoom / 100})`;
  els.pdfIframe.style.transformOrigin = 'top center';
  els.pdfIframe.style.height = `${100 / (state.pdfZoom / 100)}%`;
  
  // Apply dark inverter reader filter
  els.pdfIframe.classList.toggle('dark-reader-filter', state.pdfInverted);
  
  if (els.pdfToolTheme) {
    els.pdfToolTheme.classList.toggle('active', state.pdfInverted);
  }
}

// ─── AUTHENTICATION FLOW & FORM SWITCHER ──────────────────────────────────────
function openAuthModal() {
  switchAuthForm('login');
  if (els.authModal) els.authModal.classList.remove('hidden');
}

function closeAuthModal() {
  if (els.authModal) els.authModal.classList.add('hidden');
}

function switchAuthForm(view) {
  const views = ['login', 'signup', 'forgot'];
  views.forEach(v => {
    const wrapper = els[`authView${v.charAt(0).toUpperCase() + v.slice(1)}`];
    if (wrapper) wrapper.classList.toggle('hidden', v !== view);
  });
}

function updateAuthUI(user) {
  state.user = user;

  if (user) {
    if (els.authBtn) els.authBtn.classList.add('hidden');
    if (els.userArea) els.userArea.classList.remove('hidden');

    const initial = (user.user_metadata?.full_name || user.email || '?')[0].toUpperCase();
    const avatar = user.user_metadata?.avatar_url;

    if (els.userInitial) {
      if (avatar) {
        els.userAvatar.innerHTML = `<img src="${avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        els.userInitial.textContent = initial;
      }
    }
  } else {
    if (els.authBtn) els.authBtn.classList.remove('hidden');
    if (els.userArea) els.userArea.classList.add('hidden');
  }

  // If on profile view, refresh statistics
  if (state.currentTab === 'profile') {
    renderProfileView();
  }
}

// ─── BOOTSTRAP INIT ───────────────────────────────────────────────────────────
async function init() {
  // Apply theme
  applyTheme(state.theme);

  // Bottom Tabs navigation triggers
  const tabs = ['home', 'explore', 'favorites', 'profile'];
  tabs.forEach(tab => {
    const btn = els[`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}`];
    if (btn) {
      btn.addEventListener('click', () => switchTab(tab));
    }
  });

  // Top header links home
  if (els.appBarBrandLink) {
    els.appBarBrandLink.addEventListener('click', () => switchTab('home'));
  }

  // Theme Toggle
  if (els.themeToggle) {
    els.themeToggle.addEventListener('click', toggleTheme);
  }

  // Search
  if (els.searchInput) {
    els.searchInput.addEventListener('input', e => handleSearch(e.target.value));
  }
  if (els.searchClear) {
    els.searchClear.addEventListener('click', clearSearch);
  }

  // Connect Home Favorites Card
  if (els.homeQuickFavs) {
    els.homeQuickFavs.addEventListener('click', () => switchTab('favorites'));
  }

  // Fullscreen PDF modal close
  if (els.modalClose) els.modalClose.addEventListener('click', closePdfViewer);
  if (els.pdfModal) {
    els.pdfModal.addEventListener('click', e => {
      if (e.target === els.pdfModal) closePdfViewer();
    });
  }

  // PDF Toolbar zoom & comfort actions
  if (els.pdfZoomIn) {
    els.pdfZoomIn.addEventListener('click', () => {
      if (state.pdfZoom < 180) {
        state.pdfZoom += 10;
        applyPdfToolbarStyles();
      }
    });
  }
  if (els.pdfZoomOut) {
    els.pdfZoomOut.addEventListener('click', () => {
      if (state.pdfZoom > 70) {
        state.pdfZoom -= 10;
        applyPdfToolbarStyles();
      }
    });
  }
  if (els.pdfToolTheme) {
    els.pdfToolTheme.addEventListener('click', () => {
      state.pdfInverted = !state.pdfInverted;
      applyPdfToolbarStyles();
    });
  }
  if (els.pdfToolBookmark) {
    els.pdfToolBookmark.addEventListener('click', () => {
      if (state.lastRead) {
        showToast('success', 'Position sauvegardée', state.lastRead.name.replace(/\.pdf$/i, '').replace(/_/g, ' '));
      }
    });
  }
  if (els.pdfToolShare) {
    els.pdfToolShare.addEventListener('click', () => {
      if (state.lastRead) {
        navigator.clipboard.writeText(state.lastRead.url);
        showToast('info', 'Lien copié dans le presse-papier !');
      }
    });
  }

  // Last read home resume button
  if (els.continuePdfBtn) {
    els.continuePdfBtn.addEventListener('click', () => {
      if (state.lastRead) {
        openPdfViewer(state.lastRead.url, state.lastRead.name, state.lastRead.id);
      }
    });
  }

  // Profile Sub-Modals Triggers
  const modalPairs = [
    { btn: 'profileAboutBtn', modal: 'aboutModal', close: 'aboutModalClose' },
    { btn: 'profileTermsBtn', modal: 'termsModal', close: 'termsModalClose' },
    { btn: 'profileContactBtn', modal: 'contactModal', close: 'contactModalClose' }
  ];

  modalPairs.forEach(pair => {
    if (els[pair.btn] && els[pair.modal]) {
      els[pair.btn].addEventListener('click', () => {
        els[pair.modal].classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      });
    }
    if (els[pair.close] && els[pair.modal]) {
      els[pair.close].addEventListener('click', () => {
        els[pair.modal].classList.add('hidden');
        document.body.style.overflow = '';
      });
    }
    if (els[pair.modal]) {
      els[pair.modal].addEventListener('click', e => {
        if (e.target === els[pair.modal]) {
          els[pair.modal].classList.add('hidden');
          document.body.style.overflow = '';
        }
      });
    }
  });

  // Settings dark mode switch hook
  if (els.settingDarkModeSwitch) {
    els.settingDarkModeSwitch.addEventListener('change', toggleTheme);
  }

  // Settings notification mock toggle
  if (els.settingNotificationSwitch) {
    els.settingNotificationSwitch.addEventListener('change', e => {
      showToast('info', e.target.checked ? 'Notifications activées' : 'Notifications désactivées');
    });
  }

  // Auth Overlay triggers
  if (els.authBtn) els.authBtn.addEventListener('click', openAuthModal);
  if (els.userAvatar) els.userAvatar.addEventListener('click', () => switchTab('profile'));
  if (els.authModalClose) els.authModalClose.addEventListener('click', closeAuthModal);
  if (els.authModal) {
    els.authModal.addEventListener('click', e => {
      if (e.target === els.authModal) closeAuthModal();
    });
  }

  // Form toggles
  if (els.gotoSignup) els.gotoSignup.addEventListener('click', () => switchAuthForm('signup'));
  if (els.gotoLogin) els.gotoLogin.addEventListener('click', () => switchAuthForm('login'));
  if (els.gotoLogin2) els.gotoLogin2.addEventListener('click', () => switchAuthForm('login'));
  if (els.gotoForgot) els.gotoForgot.addEventListener('click', () => switchAuthForm('forgot'));

  // Auth actions listeners
  if (els.googleSigninBtn) {
    els.googleSigninBtn.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (err) {
        showToast('error', 'Erreur d\'authentification', err.message);
      }
    });
  }

  if (els.loginForm) {
    els.loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('login-email').value;
      const password = $('login-password').value;
      try {
        await signInWithEmail(email, password);
        showToast('success', 'Connexion réussie !');
        closeAuthModal();
      } catch (err) {
        showToast('error', 'Erreur de connexion', err.message);
      }
    });
  }

  if (els.signupForm) {
    els.signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('signup-name').value;
      const email = $('signup-email').value;
      const password = $('signup-password').value;
      try {
        await signUpWithEmail(email, password, name);
        showToast('success', 'Compte créé !', 'Vérifiez votre email si nécessaire.');
        closeAuthModal();
      } catch (err) {
        showToast('error', 'Erreur d\'inscription', err.message);
      }
    });
  }

  if (els.forgotForm) {
    els.forgotForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('forgot-email').value;
      try {
        await resetPassword(email);
        showToast('success', 'Email envoyé !', 'Vérifiez votre boîte de réception.');
        closeAuthModal();
      } catch (err) {
        showToast('error', 'Erreur', err.message);
      }
    });
  }

  if (els.profileSignoutBtn) {
    els.profileSignoutBtn.addEventListener('click', async () => {
      try {
        await signOut();
        showToast('info', 'Déconnecté', 'À bientôt !');
        switchTab('home');
      } catch (err) {
        showToast('error', 'Erreur', err.message);
      }
    });
  }

  // Keyboard accessibility
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closePdfViewer();
      closeAuthModal();
      modalPairs.forEach(p => {
        if (els[p.modal]) els[p.modal].classList.add('hidden');
      });
    }
  });

  // Supabase Auth State Hook
  try {
    const user = await getCurrentUser();
    updateAuthUI(user);
    onAuthStateChange((event, session) => {
      updateAuthUI(session?.user || null);
      if (event === 'SIGNED_IN') {
        showToast('success', 'Connecté !', `Ravi de vous revoir !`);
        closeAuthModal();
      }
    });
  } catch (_) {}

  // Run the default Home View
  renderHomeView();
}

// ─── Public API Exports ───────────────────────────────────────────────────────
export { init, toggleTheme, showToast };

// Initialize automatically
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
