/**
 * ui.js
 * Bibliothèque Lycée Maroc — Dashboard UI Controller
 *
 * Manages the navigation state machine, skeleton loaders,
 * PDF viewer modal, theme system, and all DOM interactions.
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
  signOut,
  getCurrentUser,
  onAuthStateChange
} from './supabase-config.js';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentStep:   0,      // 0=levels, 1=branches, 2=subjects, 3=pdfs
  selectedLevel:   null,
  selectedBranch:  null,
  selectedSubject: null,
  currentPdfs:    [],
  filteredPdfs:   [],
  searchQuery:    '',
  theme: localStorage.getItem('theme') || 'dark',
  user:  null
};

// ─── Subject Icon Map ─────────────────────────────────────────────────────────
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

// Level icons & colors
const LEVEL_CONFIG = {
  'tronc-commun': { icon: '🌱', color: 'var(--accent)',  label: 'Tronc Commun',   desc: '1ère année du lycée' },
  '1ere-bac':     { icon: '📘', color: 'var(--primary)', label: '1ère Bac',       desc: '2ème année du lycée' },
  '2eme-bac':     { icon: '🎓', color: 'var(--purple)',  label: '2ème Bac',       desc: '3ème année — Baccalauréat' }
};

// Branch icons
const BRANCH_ICONS = {
  'sciences-biof':          '🔬',
  'sciences-experimentales':'⚡',
  'sciences-maths':         '📐',
  'sciences-physiques':     '⚗️',
  'sciences-svt':           '🧬',
  'default':                '📚'
};

// ─── Selectors ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  // Steps
  stepsContainer:  $('steps-container'),
  contentArea:     $('content-area'),
  sectionTitle:    $('section-title'),
  sectionSubtitle: $('section-subtitle'),
  sectionLabel:    $('section-label'),

  // Breadcrumb
  breadcrumb:      $('breadcrumb'),

  // Search
  searchContainer: $('search-container'),
  searchInput:     $('search-input'),
  searchClear:     $('search-clear'),
  resultsCount:    $('results-count'),

  // Theme
  themeToggle:     $('theme-toggle'),

  // Auth
  authBtn:         $('auth-btn'),
  userArea:        $('user-area'),
  userAvatar:      $('user-avatar'),
  userInitial:     $('user-initial'),
  signoutBtn:      $('signout-btn'),

  // Modal
  pdfModal:        $('pdf-modal'),
  pdfIframe:       $('pdf-iframe'),
  pdfModalTitle:   $('pdf-modal-title'),
  modalClose:      $('modal-close'),
  pdfDownloadBtn:  $('pdf-download-btn'),
  pdfOpenBtn:      $('pdf-open-btn'),
  pdfLoadingState: $('pdf-loading-state'),

  // Auth modal
  authModal:       $('auth-modal'),
  authModalClose:  $('auth-modal-close'),
  googleSigninBtn: $('google-signin-btn'),

  // Toast
  toastContainer:  $('toast-container')
};

// ─── Theme Manager ────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (els.themeToggle) {
    els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    els.themeToggle.title = theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
let toastId = 0;

function showToast(type, title, message, duration = 4000) {
  if (!els.toastContainer) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const id    = ++toastId;

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

// ─── Skeleton Generators ──────────────────────────────────────────────────────
function createLevelSkeletons(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-circle" style="width:72px;height:72px;border-radius:16px;"></div>
      <div class="skeleton skeleton-line w-3-4" style="height:18px;"></div>
      <div class="skeleton skeleton-line w-1-2" style="height:12px;"></div>
      <div class="skeleton skeleton-line w-1-4" style="height:22px;border-radius:999px;margin-top:4px;"></div>
    </div>
  `).join('');
}

function createBranchSkeletons(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" style="gap:12px;">
      <div class="skeleton skeleton-circle" style="width:52px;height:52px;border-radius:12px;"></div>
      <div class="skeleton skeleton-line w-3-4" style="height:14px;"></div>
    </div>
  `).join('');
}

function createSubjectSkeletons(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" style="align-items:flex-start;gap:10px;">
      <div class="skeleton skeleton-circle" style="width:44px;height:44px;border-radius:10px;"></div>
      <div class="skeleton skeleton-line w-3-4" style="height:14px;"></div>
      <div class="skeleton skeleton-line w-1-2" style="height:10px;"></div>
    </div>
  `).join('');
}

function createPdfSkeletons(count = 8) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-pdf-card">
      <div class="skeleton skeleton-pdf-preview"></div>
      <div class="skeleton-pdf-body">
        <div class="skeleton skeleton-line" style="height:14px;"></div>
        <div class="skeleton skeleton-line w-3-4" style="height:14px;"></div>
        <div class="skeleton skeleton-line w-1-4" style="height:10px;margin-top:4px;"></div>
      </div>
    </div>
  `).join('');
}

// ─── Step / Breadcrumb Renderer ───────────────────────────────────────────────
const STEPS = [
  { label: 'Niveau',  icon: '🎓' },
  { label: 'Filière', icon: '🔬' },
  { label: 'Matière', icon: '📚' },
  { label: 'PDFs',    icon: '📄' }
];

function renderStepsIndicator() {
  if (!els.stepsContainer) return;

  els.stepsContainer.innerHTML = STEPS.map((step, i) => {
    const status = i < state.currentStep
      ? 'completed'
      : i === state.currentStep
        ? 'active'
        : '';

    const connector = i < STEPS.length - 1
      ? `<div class="step-connector ${i < state.currentStep ? 'completed' : ''}"></div>`
      : '';

    return `
      <div class="step ${status}" data-step="${i}">
        <div class="step-dot">
          ${i < state.currentStep ? '✓' : i + 1}
        </div>
        <span class="step-label">${step.icon} ${step.label}</span>
      </div>
      ${connector}
    `;
  }).join('');

  // Make completed steps clickable
  els.stepsContainer.querySelectorAll('.step.completed').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const step = parseInt(el.dataset.step);
      navigateToStep(step);
    });
  });
}

function renderBreadcrumb() {
  if (!els.breadcrumb) return;

  const items = [{ label: '🏠 Accueil', step: 0 }];

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
    el.addEventListener('click', () => navigateToStep(parseInt(el.dataset.step)));
  });
}

// ─── Navigate to a specific step ─────────────────────────────────────────────
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

// ─── Section header helpers ───────────────────────────────────────────────────
function setSectionHeader(label, title, subtitle) {
  if (els.sectionLabel)    els.sectionLabel.textContent    = label;
  if (els.sectionTitle)    els.sectionTitle.textContent    = title;
  if (els.sectionSubtitle) els.sectionSubtitle.textContent = subtitle;
}

function setContent(html, gridClass = '') {
  if (!els.contentArea) return;
  els.contentArea.className = gridClass;
  els.contentArea.innerHTML = html;
}

function showSearch(show) {
  if (els.searchContainer) {
    els.searchContainer.style.display = show ? 'flex' : 'none';
  }
}

// ─── STEP 0: Levels ───────────────────────────────────────────────────────────
async function showLevels() {
  state.currentStep = 0;
  setSectionHeader('🎓 Bienvenue', 'Choisissez votre niveau', 'Sélectionnez votre année scolaire pour accéder aux ressources adaptées.');
  showSearch(false);
  renderStepsIndicator();
  renderBreadcrumb();

  setContent(`<div class="levels-grid stagger-children">${createLevelSkeletons(3)}</div>`);

  try {
    const levels = await fetchLevels();

    const levelHTML = levels.map(level => {
      const cfg = LEVEL_CONFIG[level.name] || { icon: '📚', label: level.display_name, desc: '' };
      return `
        <div class="level-card" data-id="${level.id}" data-name="${level.name}" tabindex="0" role="button" aria-label="Choisir ${cfg.label}">
          <div class="level-card-icon">${cfg.icon}</div>
          <h3>${cfg.label}</h3>
          <p>${cfg.desc}</p>
          <span class="level-count">📂 Voir les filières</span>
        </div>
      `;
    }).join('');

    setContent(`<div class="levels-grid stagger-children">${levelHTML}</div>`);

    // Attach click events
    els.contentArea.querySelectorAll('.level-card').forEach(card => {
      const handler = () => {
        const id   = parseInt(card.dataset.id);
        const name = card.dataset.name;
        state.selectedLevel = { id, name, display_name: LEVEL_CONFIG[name]?.label || name };
        state.currentStep   = 1;
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

// ─── STEP 1: Branches ─────────────────────────────────────────────────────────
async function showBranches(levelId) {
  const levelCfg = LEVEL_CONFIG[state.selectedLevel?.name] || {};
  setSectionHeader('🔬 Filières', `Filières — ${levelCfg.label || ''}`, 'Choisissez votre filière pour accéder aux matières correspondantes.');
  showSearch(false);
  renderStepsIndicator();
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
        <div class="branch-card" data-id="${branch.id}" data-name="${branch.name}" tabindex="0" role="button" aria-label="Choisir ${branch.display_name}">
          <div class="branch-card-icon">${icon}</div>
          <h3>${branch.display_name}</h3>
        </div>
      `;
    }).join('');

    setContent(`<div class="branches-grid stagger-children">${html}</div>`);

    els.contentArea.querySelectorAll('.branch-card').forEach(card => {
      const handler = () => {
        const id   = parseInt(card.dataset.id);
        const name = card.dataset.name;
        state.selectedBranch = { id, name, display_name: card.querySelector('h3').textContent };
        state.currentStep    = 2;
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

// ─── STEP 2: Subjects ─────────────────────────────────────────────────────────
async function showSubjects(branchId) {
  setSectionHeader('📚 Matières', `Matières — ${state.selectedBranch?.display_name || ''}`, 'Sélectionnez une matière pour voir les documents disponibles.');
  showSearch(false);
  renderStepsIndicator();
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
        <div class="subject-card" data-id="${subj.id}" data-name="${subj.name}" tabindex="0" role="button" aria-label="${subj.display_name}">
          <div class="subject-card-icon">${icon}</div>
          <h3>${subj.display_name}</h3>
          <span class="pdf-count">📄 ${subj.pdf_count ?? '?'} document${(subj.pdf_count ?? 0) > 1 ? 's' : ''}</span>
        </div>
      `;
    }).join('');

    setContent(`<div class="subjects-grid stagger-children">${html}</div>`);

    els.contentArea.querySelectorAll('.subject-card').forEach(card => {
      const handler = () => {
        const id   = parseInt(card.dataset.id);
        const name = card.dataset.name;
        state.selectedSubject = { id, name, display_name: card.querySelector('h3').textContent };
        state.currentStep     = 3;
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

// ─── STEP 3: PDFs ─────────────────────────────────────────────────────────────
async function showPdfs(subjectId) {
  setSectionHeader('📄 Documents', `Documents — ${state.selectedSubject?.display_name || ''}`, 'Cliquez sur un document pour le lire ou le télécharger.');
  showSearch(true);
  renderStepsIndicator();
  renderBreadcrumb();

  setContent(`<div class="pdfs-grid">${createPdfSkeletons(8)}</div>`);

  try {
    state.currentPdfs   = await fetchPdfs(subjectId);
    state.filteredPdfs  = [...state.currentPdfs];
    state.searchQuery   = '';

    if (els.searchInput) els.searchInput.value = '';

    renderPdfs(state.filteredPdfs);

  } catch (err) {
    showToast('error', 'Erreur', err.message);
    setContent(`<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`);
  }
}

// ─── PDF Rendering ────────────────────────────────────────────────────────────
function renderPdfs(pdfs) {
  if (els.resultsCount) {
    els.resultsCount.innerHTML = `<strong>${pdfs.length}</strong> document${pdfs.length !== 1 ? 's' : ''} trouvé${pdfs.length !== 1 ? 's' : ''}`;
  }

  if (!pdfs.length) {
    setContent(`
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>Aucun document trouvé</h3>
        <p>Aucun document ne correspond à votre recherche « ${state.searchQuery} ».</p>
        <button class="btn btn-secondary mt-4" id="clear-search-btn">✕ Effacer la recherche</button>
      </div>
    `);
    $('clear-search-btn')?.addEventListener('click', clearSearch);
    return;
  }

  const html = pdfs.map((pdf, idx) => {
    const size     = formatFileSize(pdf.size_bytes);
    const name     = pdf.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const shortName = name.length > 50 ? name.slice(0, 50) + '...' : name;

    return `
      <div class="pdf-card stagger-children" style="animation-delay:${idx * 0.04}s" data-url="${pdf.url}" data-name="${escapeHtml(pdf.name)}" tabindex="0" role="button">
        <div class="pdf-card-preview">
          <div class="pdf-icon-large">📄</div>
          <span class="pdf-badge">PDF</span>
        </div>
        <div class="pdf-card-body">
          <div class="pdf-card-title" title="${escapeHtml(pdf.name)}">${escapeHtml(shortName)}</div>
          <div class="pdf-card-meta">
            <span class="pdf-card-size">💾 ${size}</span>
          </div>
        </div>
        <div class="pdf-card-actions">
          <button class="btn btn-primary open-pdf-btn" data-url="${pdf.url}" data-name="${escapeHtml(pdf.name)}">
            👁️ Lire
          </button>
          <a class="btn btn-secondary" href="${pdf.url}" download="${escapeHtml(pdf.name)}" target="_blank" rel="noopener">
            ⬇️
          </a>
        </div>
      </div>
    `;
  }).join('');

  setContent(`<div class="pdfs-grid">${html}</div>`);

  // Attach PDF open events
  els.contentArea.querySelectorAll('.open-pdf-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openPdfViewer(btn.dataset.url, btn.dataset.name);
    });
  });

  // Card click also opens viewer
  els.contentArea.querySelectorAll('.pdf-card').forEach(card => {
    card.addEventListener('click', e => {
      if (!e.target.closest('.btn')) {
        openPdfViewer(card.dataset.url, card.dataset.name);
      }
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') openPdfViewer(card.dataset.url, card.dataset.name);
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Search ───────────────────────────────────────────────────────────────────
let searchDebounceTimer;

function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    if (!state.searchQuery) {
      state.filteredPdfs = [...state.currentPdfs];
    } else {
      state.filteredPdfs = state.currentPdfs.filter(pdf =>
        pdf.name.toLowerCase().includes(state.searchQuery)
      );
    }
    renderPdfs(state.filteredPdfs);
  }, 250);
}

function clearSearch() {
  state.searchQuery   = '';
  state.filteredPdfs  = [...state.currentPdfs];
  if (els.searchInput) els.searchInput.value = '';
  renderPdfs(state.filteredPdfs);
}

// ─── PDF Viewer Modal ─────────────────────────────────────────────────────────
function openPdfViewer(url, name) {
  if (!els.pdfModal || !els.pdfIframe) return;

  if (els.pdfModalTitle) els.pdfModalTitle.textContent = name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
  if (els.pdfLoadingState) els.pdfLoadingState.style.display = 'flex';
  if (els.pdfDownloadBtn) els.pdfDownloadBtn.href = url;
  if (els.pdfOpenBtn)     els.pdfOpenBtn.href = url;

  // Use Google Docs viewer as a reliable fallback for cross-origin PDFs
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  els.pdfIframe.src = viewerUrl;

  els.pdfIframe.onload = () => {
    if (els.pdfLoadingState) els.pdfLoadingState.style.display = 'none';
  };

  els.pdfModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closePdfViewer() {
  if (!els.pdfModal || !els.pdfIframe) return;
  els.pdfModal.classList.add('hidden');
  els.pdfIframe.src = 'about:blank';
  document.body.style.overflow = '';
}

// ─── Auth UI ──────────────────────────────────────────────────────────────────
function updateAuthUI(user) {
  state.user = user;

  if (user) {
    if (els.authBtn)   els.authBtn.classList.add('hidden');
    if (els.userArea)  els.userArea.classList.remove('hidden');

    const initial = (user.user_metadata?.full_name || user.email || '?')[0].toUpperCase();
    const avatar  = user.user_metadata?.avatar_url;

    if (els.userInitial) {
      if (avatar) {
        els.userAvatar.innerHTML = `<img src="${avatar}" alt="Avatar" onerror="this.remove()">`;
      } else {
        els.userInitial.textContent = initial;
      }
    }
  } else {
    if (els.authBtn)   els.authBtn.classList.remove('hidden');
    if (els.userArea)  els.userArea.classList.add('hidden');
  }
}

function openAuthModal() {
  if (els.authModal) els.authModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  if (els.authModal) els.authModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ─── Navbar scroll effect ─────────────────────────────────────────────────────
function handleNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
      navbar.classList.remove('transparent');
    } else {
      navbar.classList.remove('scrolled');
      navbar.classList.add('transparent');
    }
  }, { passive: true });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function init() {
  // Apply saved theme
  applyTheme(state.theme);

  // Theme toggle
  els.themeToggle?.addEventListener('click', toggleTheme);

  // PDF modal
  els.modalClose?.addEventListener('click', closePdfViewer);
  els.pdfModal?.addEventListener('click', e => {
    if (e.target === els.pdfModal) closePdfViewer();
  });

  // Auth
  els.authBtn?.addEventListener('click', openAuthModal);
  els.authModalClose?.addEventListener('click', closeAuthModal);
  els.authModal?.addEventListener('click', e => {
    if (e.target === els.authModal) closeAuthModal();
  });

  els.googleSigninBtn?.addEventListener('click', async () => {
    try {
      els.googleSigninBtn.classList.add('loading');
      await signInWithGoogle();
    } catch (err) {
      showToast('error', 'Erreur d\'authentification', err.message);
      els.googleSigninBtn.classList.remove('loading');
    }
  });

  els.signoutBtn?.addEventListener('click', async () => {
    try {
      await signOut();
      showToast('info', 'Déconnecté', 'À bientôt !');
    } catch (err) {
      showToast('error', 'Erreur', err.message);
    }
  });

  // Search
  els.searchInput?.addEventListener('input', e => handleSearch(e.target.value));
  els.searchClear?.addEventListener('click', clearSearch);

  // Auth state
  try {
    const user = await getCurrentUser();
    updateAuthUI(user);
    onAuthStateChange((event, session) => {
      updateAuthUI(session?.user || null);
      if (event === 'SIGNED_IN') {
        showToast('success', 'Connecté !', `Bienvenue, ${session.user.user_metadata?.full_name || session.user.email}`);
        closeAuthModal();
      }
    });
  } catch (_) { /* ignore auth errors for public access */ }

  // Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closePdfViewer();
      closeAuthModal();
    }
  });

  // Navbar scroll
  handleNavbarScroll();

  // Start the app
  await showLevels();
}

// ─── Public API (for index.html) ──────────────────────────────────────────────
export { init, toggleTheme, applyTheme, showToast };
export { showLevels, showBranches, showSubjects, showPdfs };

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
