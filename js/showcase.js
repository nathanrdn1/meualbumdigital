/* ── Cache de fotos Wikipedia ────────────────────────────── */

const _photoCache = new Map(); // playerName → url | null
let _showcaseFavIds = new Set(); // IDs atualmente na vitrine

/* ── API Wikipedia ───────────────────────────────────────── */

async function fetchWikiPhoto(playerName) {
  if (_photoCache.has(playerName)) return _photoCache.get(playerName);

  try {
    // Passo 1: encontra o artigo mais próximo via opensearch
    const r1 = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(playerName)}&limit=1&format=json&origin=*`
    );
    const [, titles] = await r1.json();
    if (!titles.length) { _photoCache.set(playerName, null); return null; }

    // Passo 2: busca thumbnail do artigo encontrado
    const r2 = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles[0])}&prop=pageimages&format=json&pithumbsize=500&origin=*`
    );
    const d2   = await r2.json();
    const page = Object.values(d2.query.pages)[0];
    const url  = page?.thumbnail?.source || null;

    _photoCache.set(playerName, url);
    return url;
  } catch {
    _photoCache.set(playerName, null);
    return null;
  }
}

/* ── Helpers de dados ────────────────────────────────────── */

function _findPlayerById(stickerId) {
  const lastDash = stickerId.lastIndexOf('-');
  if (lastDash < 0) return null;
  const teamId = stickerId.slice(0, lastDash);
  const num    = parseInt(stickerId.slice(lastDash + 1), 10);

  for (const g of ALBUM_DATA) {
    for (const team of g.teams) {
      if (team.id !== teamId) continue;
      const player = team.players.find(p => p.num === num);
      if (player) return { team, player, group: g };
    }
  }
  return null;
}

function _isSearchable(player, group) {
  if (group.special) return false;       // FWC / CC
  if (player.num === 1) return false;    // Escudo
  if (!player.name || player.name === 'Escudo') return false;
  return true;
}

function _getAllFavIds() {
  const ids = [];
  for (const g of ALBUM_DATA) {
    for (const team of g.teams) {
      for (const player of team.players) {
        const id = `${team.id}-${player.num}`;
        if (getSticker(id).fav) ids.push(id);
      }
    }
  }
  return ids;
}

/* ── Criação de card ─────────────────────────────────────── */

function _createShowcaseCard(stickerId) {
  const data = _findPlayerById(stickerId);
  if (!data) return null;
  const { team, player } = data;

  const card = document.createElement('div');
  card.className = 'showcase-card';
  card.dataset.stickerId = stickerId;
  card.title = `${player.name} · ${team.name}`;

  /* Área da foto */
  const photoWrap = document.createElement('div');
  photoWrap.className = 'showcase-photo-wrap';
  photoWrap.dataset.showcaseId = stickerId;

  const skeleton  = document.createElement('div');
  skeleton.className = 'showcase-skeleton';

  const img = document.createElement('img');
  img.className = 'showcase-img';
  img.alt = player.name;

  const fallback = document.createElement('div');
  fallback.className = 'showcase-fallback';

  // Conteúdo do fallback
  const flagEl = document.createElement('span');
  flagEl.className = 'showcase-fallback-flag';
  flagEl.textContent = team.flag || '🌍';

  const numEl = document.createElement('span');
  numEl.className = 'showcase-fallback-num';
  numEl.textContent = `#${player.num}`;

  fallback.appendChild(flagEl);
  fallback.appendChild(numEl);
  photoWrap.appendChild(skeleton);
  photoWrap.appendChild(img);
  photoWrap.appendChild(fallback);

  /* Info bar */
  const info = document.createElement('div');
  info.className = 'showcase-info';

  const flagWrap = document.createElement('div');
  flagWrap.className = 'showcase-info-flag';
  const flagUrl = getFlagUrl(team.id);
  if (flagUrl) {
    const fImg = document.createElement('img');
    fImg.src = flagUrl;
    fImg.alt = team.name;
    fImg.className = 'showcase-flag-img';
    flagWrap.appendChild(fImg);
  } else {
    const fSpan = document.createElement('span');
    fSpan.className = 'showcase-flag-emoji';
    fSpan.textContent = team.flag || '';
    flagWrap.appendChild(fSpan);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'showcase-name';
  nameEl.textContent = player.name;

  const codeEl = document.createElement('div');
  codeEl.className = 'showcase-code';
  codeEl.textContent = stickerId;

  info.appendChild(flagWrap);
  info.appendChild(nameEl);
  info.appendChild(codeEl);

  card.appendChild(photoWrap);
  card.appendChild(info);
  return card;
}

/* ── Carregamento assíncrono da foto ─────────────────────── */

async function _loadShowcasePhoto(stickerId) {
  const data = _findPlayerById(stickerId);
  if (!data) return;
  const { player, group } = data;

  const _findWrap = () => {
    for (const w of document.querySelectorAll('.showcase-photo-wrap')) {
      if (w.dataset.showcaseId === stickerId) return w;
    }
    return null;
  };

  const wrap = _findWrap();
  if (!wrap) return;

  const skeleton = wrap.querySelector('.showcase-skeleton');
  const img      = wrap.querySelector('.showcase-img');
  const fallback = wrap.querySelector('.showcase-fallback');

  // Escudo / especiais: fallback imediato
  if (!_isSearchable(player, group)) {
    skeleton?.remove();
    if (fallback) fallback.style.display = 'flex';
    return;
  }

  // Busca foto na Wikipedia
  const url = await fetchWikiPhoto(player.name);

  // Verifica se o card ainda existe após o await
  if (!_findWrap()) return;

  skeleton?.remove();

  if (url) {
    img.onload  = () => { img.style.display = 'block'; };
    img.onerror = () => { if (fallback) fallback.style.display = 'flex'; };
    img.src = url;
  } else {
    if (fallback) fallback.style.display = 'flex';
  }
}

/* ── API pública ─────────────────────────────────────────── */

/**
 * Atualiza a vitrine de favoritas de forma incremental:
 * - Adiciona cards novos
 * - Remove cards desfavoritados
 * - Não re-carrega fotos já buscadas
 */
function updateShowcase() {
  const section = document.getElementById('showcase-section');
  if (!section) return;

  const favIds = _getAllFavIds();

  if (favIds.length === 0) {
    section.style.display = 'none';
    _showcaseFavIds.clear();
    return;
  }

  section.style.display = 'block';
  const countEl = document.getElementById('showcase-count');
  if (countEl) countEl.textContent = favIds.length;

  const newSet    = new Set(favIds);
  const container = document.getElementById('showcase-cards');

  // Remove cards desfavoritados — percorre os cards existentes diretamente
  container?.querySelectorAll('.showcase-card').forEach(card => {
    if (!newSet.has(card.dataset.stickerId)) card.remove();
  });

  // Adiciona novos cards na posição correta (ordem do álbum)
  favIds.forEach((id, idx) => {
    if (_showcaseFavIds.has(id)) return; // já existe
    const card = _createShowcaseCard(id);
    if (!card || !container) return;

    // Insere na posição correta
    const allCards = [...container.querySelectorAll('.showcase-card')];
    const refCard  = allCards[idx] || null;
    container.insertBefore(card, refCard);

    // Carrega foto em background
    _loadShowcasePhoto(id);
  });

  _showcaseFavIds = newSet;
}
