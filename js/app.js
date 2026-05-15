/* ── Modais genéricos ────────────────────────────────────── */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ── Toast ───────────────────────────────────────────────── */

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ── Loading overlay ─────────────────────────────────────── */

function showAppLoading(show) {
  const el = document.getElementById('app-loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

/* ── FAB ─────────────────────────────────────────────────── */

function toggleFabMenu() {
  const menu = document.getElementById('fab-menu');
  if (menu) menu.classList.toggle('open');
}

function closeFabMenu() {
  const menu = document.getElementById('fab-menu');
  if (menu) menu.classList.remove('open');
}

/* ── Undo ────────────────────────────────────────────────── */

function performUndo() {
  if (!canUndo()) { showToast('Nada para desfazer'); return; }
  undoLast();
  renderAll();
  updateHeaderStats();
  applyFilters();
  updateShowcase();
  showToast('↩ Ação desfeita');
}

// Ctrl+Z / Cmd+Z
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isReadOnly) {
    e.preventDefault();
    performUndo();
  }
});

/* ── Fluxo de autenticação ───────────────────────────────── */

async function handleSignIn(user) {
  setCurrentUser(user.uid);

  // Carrega perfil (apelido + foto) em paralelo com o álbum
  let firestoreData = null;
  let userProfile   = {};
  try {
    [firestoreData, userProfile] = await Promise.all([
      fbLoadAlbum(user.uid),
      fbLoadProfile(user.uid),
    ]);
  } catch (err) {
    console.error('[copa2026] Erro ao carregar dados do Firestore:', err);
    try { firestoreData = await fbLoadAlbum(user.uid); } catch { /* noop */ }
  }

  // Carrega stats sociais em paralelo
  let socialStats = { seguidores: 0, seguindo: 0 };
  try { socialStats = await fbGetProfileStats(user.uid); } catch { /* noop */ }

  updateUserHeader(user, userProfile, { figurinhas: 0, ...socialStats }, true);
  setMyProfile(userProfile);

  // Garante que o apelido esteja registrado no índice de usernames
  if (userProfile.apelido) {
    fbEnsureUsernameRegistered(userProfile.apelido, user.uid).catch(() => {});
  }

  if (firestoreData === null) {
    // Nenhum dado no Firestore — verificar migração do localStorage
    const localData = getLocalRawState();
    if (localData && Object.keys(localData).length > 0) {
      loadStateFromObject(localData);
      try {
        await fbSaveAlbum(user.uid, localData);
        clearLocalState();
        showToast('✅ Coleção migrada para sua conta!');
      } catch {
        showToast('⚠️ Não foi possível migrar agora. Tentando novamente...');
      }
    } else {
      loadStateFromObject({});
      // Cria documento de álbum vazio para que o Firestore permita leituras sociais
      fbSaveAlbum(user.uid, {}).catch(() => {});
    }
  } else {
    loadStateFromObject(firestoreData);
  }

  // Se o usuário não tem apelido, cria um padrão com base no nome e registra no índice
  if (!userProfile.apelido) {
    try {
      const base     = (user.displayName || user.email?.split('@')[0] || 'usuario')
                         .trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const exists   = await fbLookupApelido(base);
      const apelido  = exists ? `${base}${user.uid.slice(0, 4)}` : base;
      await fbSaveProfile(user.uid, { apelido });
      await fbEnsureUsernameRegistered(apelido, user.uid);
      userProfile    = { ...userProfile, apelido };
      // Atualiza header com o apelido recém-criado
      updateUserHeader(user, userProfile, { figurinhas: getStats().owned, ...socialStats }, true);
      setMyProfile(userProfile);
    } catch { /* noop — não bloqueia o carregamento */ }
  }

  hideAuthModal();
  renderAll();
  updateHeaderStats(); // atualiza figurinhas no header via updateHeaderFigurinhas()
  setMySocialStats(socialStats);
  applyFilters();
  updateShowcase();
}

function handleSignOut() {
  setCurrentUser(null);
  loadStateFromObject({});
  renderAll();
  updateHeaderStats();
  showAuthModal();
}

/* ── Binding de eventos ──────────────────────────────────── */

function bindEvents() {
  // Delegação de eventos do álbum
  document.getElementById('main-content').addEventListener('click', e => {
    if (isReadOnly) return;

    const starBtn = e.target.closest('[data-star-id]');
    if (starBtn) {
      e.stopPropagation();
      const id = starBtn.dataset.starId;
      toggleFav(id);
      updateStickerCard(id);
      updateHeaderStats();
      updateShowcase();
      return;
    }

    const decBtn = e.target.closest('[data-dec]');
    if (decBtn) {
      e.stopPropagation();
      const id = decBtn.dataset.dec;
      decrementQty(id);
      updateStickerCard(id);
      updateTeamProgressById(id);
      updateHeaderStats();
      updateShowcaseCard(id);
      applyFilters();
      return;
    }

    const incBtn = e.target.closest('[data-inc]');
    if (incBtn) {
      e.stopPropagation();
      const id = incBtn.dataset.inc;
      incrementQty(id);
      updateStickerCard(id);
      updateTeamProgressById(id);
      updateHeaderStats();
      updateShowcaseCard(id);
      applyFilters();
      return;
    }

    const card = e.target.closest('.sticker[data-sticker-id]');
    if (card) {
      const id = card.dataset.stickerId;
      toggleOwned(id);
      updateStickerCard(id);
      updateTeamProgressById(id);
      updateHeaderStats();
      applyFilters();
    }
  });

  // Modais de exportação e compartilhamento
  document.getElementById('export-copy-btn').addEventListener('click', copyExportList);
  document.getElementById('export-download-btn').addEventListener('click', downloadExportList);
  document.getElementById('export-close-btn').addEventListener('click', () => closeModal('export-modal'));
  document.getElementById('share-copy-btn').addEventListener('click', copyShareLink);
  document.getElementById('share-close-btn').addEventListener('click', () => closeModal('share-modal'));

  // Fechar modal ao clicar no overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // FAB
  document.getElementById('fab-main').addEventListener('click', toggleFabMenu);

  document.getElementById('fab-undo').addEventListener('click', () => {
    performUndo(); // mantém o menu aberto para desfazer múltiplas ações
  });

  document.getElementById('fab-export').addEventListener('click', () => {
    closeFabMenu();
    openExportModal();
  });

  document.getElementById('fab-share').addEventListener('click', () => {
    closeFabMenu();
    openShareModal(); // async — abre modal e preenche link em background
  });

  // Fechar FAB ao clicar fora
  document.addEventListener('click', e => {
    const fab = document.getElementById('fab-container');
    if (fab && !fab.contains(e.target)) closeFabMenu();
  });

  // Banner de modo somente leitura
  const createBtn = document.getElementById('create-collection-btn');
  if (createBtn) createBtn.addEventListener('click', createOwnCollection);
}

/* ── Auxiliares de progresso ─────────────────────────────── */

function updateTeamProgressById(stickerId) {
  const parts = stickerId.split('-');
  if (parts.length < 2) return;
  const teamId = parts.slice(0, -1).join('-');
  updateTeamProgress(teamId);
}

/* ── Inicialização ───────────────────────────────────────── */

async function init() {
  // Modo de compartilhamento via URL — sem autenticação necessária
  const shared = await checkSharedUrl();
  if (shared) {
    showAppLoading(false);
    renderAll();
    updateHeaderStats();
    initFilters();
    bindEvents();
    updateShowcase();
    return;
  }

  // Modo normal — aguarda autenticação Firebase
  initFilters();
  bindEvents();
  bindProfileEvents();
  bindSocialEvents();

  initAuth(
    async user => {
      await handleSignIn(user);
      showSocialFab(true);
      showAppLoading(false);
    },
    () => {
      showSocialFab(false);
      showAppLoading(false);
      handleSignOut();
    }
  );
}

document.addEventListener('DOMContentLoaded', init);
