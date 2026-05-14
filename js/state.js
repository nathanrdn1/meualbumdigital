const STORAGE_KEY = 'copa2026_album';
const UNDO_LIMIT  = 30;

let albumState      = {};
let isReadOnly      = false;
let currentUserId   = null;
let firestoreTimer  = null;

/* ── Undo stack ──────────────────────────────────────────── */

const undoStack = [];

function setCurrentUser(uid) {
  currentUserId = uid;
}

/** Salva snapshot do estado atual antes de uma mutação */
function pushUndo() {
  undoStack.push(JSON.parse(JSON.stringify(albumState)));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  _refreshUndoUI();
}

function canUndo() {
  return undoStack.length > 0;
}

/**
 * Desfaz a última ação: restaura o estado anterior e sincroniza.
 * Retorna true se havia algo para desfazer.
 */
function undoLast() {
  if (!canUndo()) return false;
  albumState = undoStack.pop();
  _refreshUndoUI();

  // Salva imediatamente (cancela debounce pendente)
  clearTimeout(firestoreTimer);
  _saveLocalStorage();
  if (currentUserId) {
    fbSaveAlbum(currentUserId, albumState).catch(console.error);
  }
  return true;
}

function _refreshUndoUI() {
  const badge  = document.getElementById('undo-badge');
  const action = document.getElementById('fab-undo');
  if (badge) {
    const n = undoStack.length;
    badge.textContent    = n;
    badge.style.display  = n > 0 ? 'inline-flex' : 'none';
  }
  if (action) {
    action.style.opacity       = canUndo() ? '1' : '0.4';
    action.style.pointerEvents = canUndo() ? 'all' : 'none';
  }
}

/* ── Persistência ────────────────────────────────────────── */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    albumState = raw ? JSON.parse(raw) : {};
  } catch {
    albumState = {};
  }
}

/** Retorna os dados do localStorage sem carregá-los no estado (usado para migração) */
function getLocalRawState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearLocalState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

function _saveLocalStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(albumState)); } catch { /* noop */ }
}

/**
 * Persiste o estado:
 * - localStorage imediatamente (backup offline)
 * - Firestore com debounce de 800 ms (evita writes excessivos)
 */
function saveState() {
  if (isReadOnly) return;
  _saveLocalStorage();
  if (currentUserId) {
    clearTimeout(firestoreTimer);
    firestoreTimer = setTimeout(() => {
      fbSaveAlbum(currentUserId, albumState).catch(console.error);
    }, 800);
  }
}

/** Carrega um objeto externo como estado (URL compartilhada ou Firestore) */
function loadStateFromObject(obj) {
  albumState = obj || {};
  undoStack.length = 0; // limpa histórico ao trocar de conta
  _refreshUndoUI();
}

function serializeState() {
  return JSON.stringify(albumState);
}

/* ── Operações de figurinha ─────────────────────────────── */

function getSticker(id) {
  return albumState[id] || { owned: false, qty: 0, fav: false };
}

function toggleOwned(id) {
  pushUndo();
  const s = getSticker(id);
  albumState[id] = s.owned
    ? { ...s, owned: false, qty: 0 }
    : { ...s, owned: true,  qty: 1 };
  saveState();
  return albumState[id];
}

function setQty(id, qty) {
  pushUndo();
  const n = Math.max(0, qty);
  const s = getSticker(id);
  albumState[id] = { ...s, qty: n, owned: n > 0 };
  saveState();
  return albumState[id];
}

function incrementQty(id) {
  pushUndo();
  const s = getSticker(id);
  const n = s.qty + 1;
  albumState[id] = { ...s, qty: n, owned: true };
  saveState();
  return albumState[id];
}

function decrementQty(id) {
  pushUndo();
  const s   = getSticker(id);
  const n   = Math.max(0, s.qty - 1);
  albumState[id] = { ...s, qty: n, owned: n > 0 };
  saveState();
  return albumState[id];
}

function toggleFav(id) {
  pushUndo();
  const s = getSticker(id);
  albumState[id] = { ...s, fav: !s.fav };
  saveState();
  return albumState[id];
}

/* ── Estatísticas ────────────────────────────────────────── */

function getStats() {
  let total = 0, owned = 0, dupes = 0, favs = 0;
  for (const g of ALBUM_DATA) {
    for (const team of g.teams) {
      for (const player of team.players) {
        total++;
        const s = getSticker(`${team.id}-${player.num}`);
        if (s.owned) owned++;
        if (s.qty > 1) dupes += s.qty - 1;
        if (s.fav)   favs++;
      }
    }
  }
  return { total, owned, missing: total - owned, dupes, favs };
}

function getTeamStats(teamId, players) {
  let owned = 0;
  for (const p of players) {
    if (getSticker(`${teamId}-${p.num}`).owned) owned++;
  }
  return { owned, total: players.length };
}

/* ── Exportação de repetidas ─────────────────────────────── */

function getExportData() {
  const result = [];
  for (const g of ALBUM_DATA) {
    for (const team of g.teams) {
      const dupes = [];
      for (const player of team.players) {
        const id = `${team.id}-${player.num}`;
        const s  = getSticker(id);
        if (s.qty > 1) dupes.push({ id, name: player.name, qty: s.qty - 1 });
      }
      if (dupes.length > 0) result.push({ team, dupes });
    }
  }
  return result;
}
