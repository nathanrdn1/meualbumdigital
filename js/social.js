/* ── Estado social ───────────────────────────────────────── */

let _myStateSnapshot  = null;
let _myProfile        = {};
let _savedLogoutBtn   = null;
let _visitingUid      = null;
let _socialPanelOpen  = false;

function setMyProfile(profile) { _myProfile = profile || {}; }

function isVisitingFriend() { return _visitingUid !== null; }
function getMyStateSnapshot() { return _myStateSnapshot; }

/* ── Painel social ───────────────────────────────────────── */

function openSocialPanel() {
  document.getElementById('social-panel')?.classList.add('open');
  document.getElementById('social-panel-overlay')?.classList.add('open');
  _socialPanelOpen = true;
  loadFollowingList();
}

function closeSocialPanel() {
  document.getElementById('social-panel')?.classList.remove('open');
  document.getElementById('social-panel-overlay')?.classList.remove('open');
  _socialPanelOpen = false;
}

function showSocialFab(visible) {
  const fab = document.getElementById('social-fab');
  if (fab) fab.style.display = visible ? 'flex' : 'none';
}

/* ── Buscar usuário ──────────────────────────────────────── */

async function socialSearch() {
  const input    = document.getElementById('social-search-input');
  const resultEl = document.getElementById('social-search-result');
  const apelido  = input?.value.trim();
  if (!apelido || !resultEl) return;

  resultEl.innerHTML = '<span class="social-msg">Buscando…</span>';

  try {
    const found = await fbLookupApelido(apelido);
    if (!found) {
      resultEl.innerHTML = '<span class="social-msg social-msg-warn">Usuário não encontrado.</span>';
      return;
    }
    if (found.uid === currentUserId) {
      resultEl.innerHTML = '<span class="social-msg social-msg-warn">Este é você!</span>';
      return;
    }
    const profile  = await fbGetUserProfile(found.uid);
    const already  = await fbIsFollowing(currentUserId, found.uid);
    resultEl.innerHTML = '';
    resultEl.appendChild(_buildFriendCard(found.uid, profile, already, true));
    _loadFriendStats(found.uid, resultEl.querySelector('.social-friend-card'));
  } catch (err) {
    console.error('[social] Erro na busca:', err);
    resultEl.innerHTML = '<span class="social-msg social-msg-warn">Erro ao buscar.</span>';
  }
}

/* ── Seguir / Deixar de seguir ───────────────────────────── */

async function toggleFollow(uid, profile, btn) {
  if (!currentUserId) return;
  const following = btn.dataset.following === 'true';
  btn.disabled = true;

  try {
    if (following) {
      await fbUnfollowUser(currentUserId, uid);
      btn.dataset.following = 'false';
      btn.textContent = 'Seguir';
      btn.classList.replace('social-btn-unfollow', 'social-btn-follow');
      // Remove da lista de seguindo
      document.querySelector(`#social-following-list [data-uid="${uid}"]`)
        ?.closest('.social-friend-card')?.remove();
      _checkEmptyFollowing();
    } else {
      await fbFollowUser(currentUserId, uid, profile);
      btn.dataset.following = 'true';
      btn.textContent = 'Seguindo';
      btn.classList.replace('social-btn-follow', 'social-btn-unfollow');
      await loadFollowingList();
    }
  } catch (err) {
    console.error('[social] Erro ao seguir/deixar de seguir:', err);
    showToast('⚠️ Erro ao atualizar');
  } finally {
    btn.disabled = false;
  }
}

/* ── Lista de seguindo ───────────────────────────────────── */

async function loadFollowingList() {
  const listEl = document.getElementById('social-following-list');
  if (!listEl || !currentUserId) return;

  listEl.innerHTML = '<span class="social-msg">Carregando…</span>';

  try {
    const list = await fbGetFollowingList(currentUserId);
    listEl.innerHTML = '';

    if (list.length === 0) {
      listEl.innerHTML = '<span class="social-msg">Você ainda não segue ninguém.<br>Busque um apelido acima para começar.</span>';
      return;
    }

    for (const friend of list) {
      const card = _buildFriendCard(friend.uid, friend, true, false);
      listEl.appendChild(card);
      _loadFriendStats(friend.uid, card);
    }
  } catch (err) {
    console.error('[social] Erro ao carregar lista:', err);
    listEl.innerHTML = '<span class="social-msg social-msg-warn">Erro ao carregar.</span>';
  }
}

async function _loadFriendStats(uid, card) {
  if (!card) return;
  try {
    const state = await fbLoadFriendAlbum(uid);
    let owned = 0, total = 0;
    for (const g of ALBUM_DATA) {
      for (const team of g.teams) {
        for (const player of team.players) {
          total++;
          const id = `${team.id}-${player.num}`;
          if (state[id]?.owned) owned++;
        }
      }
    }
    const el = card.querySelector('[data-friend-stats]');
    if (el) el.textContent = `${owned} / ${total} figurinhas`;
  } catch { /* noop */ }
}

function _checkEmptyFollowing() {
  const listEl = document.getElementById('social-following-list');
  if (!listEl) return;
  if (!listEl.querySelector('.social-friend-card')) {
    listEl.innerHTML = '<span class="social-msg">Você ainda não segue ninguém.<br>Busque um apelido acima para começar.</span>';
  }
}

/* ── Construção de card ──────────────────────────────────── */

function _buildFriendCard(uid, profile, isFollowing, isSearchResult) {
  const card = document.createElement('div');
  card.className = 'social-friend-card';
  card.dataset.uid = uid;

  const avatar = document.createElement('div');
  avatar.className = 'social-friend-avatar';
  if (profile.photoBase64) {
    const img = document.createElement('img');
    img.src = profile.photoBase64;
    img.alt = profile.apelido || '';
    avatar.appendChild(img);
  } else {
    avatar.textContent = (profile.apelido || '?').slice(0, 2).toUpperCase();
  }

  const info = document.createElement('div');
  info.className = 'social-friend-info';

  const name = document.createElement('span');
  name.className = 'social-friend-name';
  name.textContent = profile.apelido || 'Sem apelido';

  const stats = document.createElement('span');
  stats.className = 'social-friend-stats';
  stats.dataset.friendStats = '';
  stats.textContent = '…';

  info.appendChild(name);
  info.appendChild(stats);

  const actions = document.createElement('div');
  actions.className = 'social-friend-actions';

  if (!isSearchResult) {
    const visitBtn = document.createElement('button');
    visitBtn.className = 'social-btn social-btn-visit';
    visitBtn.textContent = 'Ver';
    visitBtn.addEventListener('click', () => visitFriendCollection(uid, profile));
    actions.appendChild(visitBtn);
  }

  const followBtn = document.createElement('button');
  followBtn.className = `social-btn ${isFollowing ? 'social-btn-unfollow' : 'social-btn-follow'}`;
  followBtn.textContent = isFollowing ? 'Seguindo' : 'Seguir';
  followBtn.dataset.following = String(isFollowing);
  followBtn.addEventListener('click', () => toggleFollow(uid, profile, followBtn));
  actions.appendChild(followBtn);

  card.appendChild(avatar);
  card.appendChild(info);
  card.appendChild(actions);
  return card;
}

/* ── Visitar coleção de amigo ────────────────────────────── */

async function visitFriendCollection(uid, profile) {
  closeSocialPanel();

  _myStateSnapshot = JSON.parse(JSON.stringify(albumState));
  _visitingUid     = uid;
  isReadOnly       = true;

  // Banner de visita
  const text = document.getElementById('friend-banner-text');
  if (text) text.textContent = `Vendo coleção de ${profile.apelido || 'amigo'}`;
  document.getElementById('friend-banner').style.display  = 'flex';
  document.getElementById('readonly-banner').style.display = 'none';

  // Esconde FAB principal
  document.getElementById('fab-main').style.display = 'none';
  document.getElementById('fab-menu').style.display = 'none';

  // Mostra filtros de comparação
  document.querySelectorAll('.friend-filter-pill').forEach(el => el.style.display = '');

  // Atualiza header com perfil do amigo (remove Sair, desativa cliques)
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) { _savedLogoutBtn = logoutBtn; logoutBtn.remove(); }
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name');
  if (avatarEl) { avatarEl.style.pointerEvents = 'none'; avatarEl.style.cursor = 'default'; }
  if (nameEl)   { nameEl.style.pointerEvents   = 'none'; nameEl.style.cursor   = 'default'; }
  updateUserHeader({ displayName: profile.apelido || 'Amigo', email: '' }, profile);

  try {
    const friendState = await fbLoadFriendAlbum(uid);
    loadStateFromObject(friendState);
    renderAll();
    updateHeaderStats();
    applyFilters();
    updateShowcase();
  } catch {
    showToast('⚠️ Não foi possível carregar a coleção');
    returnToMyCollection();
  }
}

/* ── Voltar para minha coleção ───────────────────────────── */

function returnToMyCollection() {
  if (!_myStateSnapshot) return;

  isReadOnly      = false;
  _visitingUid    = null;

  loadStateFromObject(_myStateSnapshot);
  _myStateSnapshot = null;

  document.getElementById('friend-banner').style.display = 'none';
  document.getElementById('fab-main').style.display = '';
  document.getElementById('fab-menu').style.display = '';

  // Restaura header com meu perfil e botão Sair
  updateUserHeader(auth.currentUser, _myProfile);
  const userInfo = document.querySelector('.user-info');
  if (_savedLogoutBtn && userInfo) { userInfo.appendChild(_savedLogoutBtn); _savedLogoutBtn = null; }
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name');
  if (avatarEl) { avatarEl.style.pointerEvents = ''; avatarEl.style.cursor = ''; }
  if (nameEl)   { nameEl.style.pointerEvents   = ''; nameEl.style.cursor   = ''; }

  // Esconde filtros de comparação e reseta filtro ativo
  document.querySelectorAll('.friend-filter-pill').forEach(el => el.style.display = 'none');
  currentFilter = 'all';
  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === 'all');
  });

  renderAll();
  updateHeaderStats();
  applyFilters();
  updateShowcase();
}

/* ── Binding de eventos ──────────────────────────────────── */

function bindSocialEvents() {
  document.getElementById('social-fab')?.addEventListener('click', () => {
    if (_socialPanelOpen) closeSocialPanel();
    else openSocialPanel();
  });

  document.getElementById('social-panel-close')?.addEventListener('click', closeSocialPanel);
  document.getElementById('social-panel-overlay')?.addEventListener('click', closeSocialPanel);

  document.getElementById('social-search-btn')?.addEventListener('click', socialSearch);
  document.getElementById('social-search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') socialSearch();
  });

  document.getElementById('friend-back-btn')?.addEventListener('click', returnToMyCollection);
}
