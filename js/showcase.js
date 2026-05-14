/* ── Cache de dados Wikipedia/Wikidata ───────────────────── */

const _playerCache   = new Map(); // playerName → { url, age }
let   _showcaseFavIds = new Set(); // IDs atualmente na vitrine

/* ── API Wikipedia + Wikidata ────────────────────────────── */

async function fetchWikiPlayerData(playerName) {
  if (_playerCache.has(playerName)) return _playerCache.get(playerName);

  try {
    // Passo 1: artigo mais próximo via opensearch
    const r1 = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(playerName)}&limit=1&format=json&origin=*`
    );
    const [, titles] = await r1.json();
    if (!titles.length) { _playerCache.set(playerName, {}); return {}; }

    // Passo 2: foto + QID do Wikidata em uma só chamada
    const r2 = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles[0])}&prop=pageimages|pageprops&format=json&pithumbsize=500&origin=*`
    );
    const d2   = await r2.json();
    const page = Object.values(d2.query.pages)[0];
    const url  = page?.thumbnail?.source ?? null;
    const qid  = page?.pageprops?.wikibase_item ?? null;

    // Passo 3: data de nascimento pelo Wikidata (P569)
    let age = null;
    if (qid) {
      try {
        const r3 = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`
        );
        const d3  = await r3.json();
        const dob = d3.entities?.[qid]?.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time;
        if (dob) {
          // formato: +1995-02-12T00:00:00Z
          const year  = parseInt(dob.slice(1, 5),  10);
          const month = parseInt(dob.slice(6, 8),  10);
          const day   = parseInt(dob.slice(9, 11), 10);
          const now   = new Date();
          age = now.getFullYear() - year;
          if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--;
        }
      } catch { /* age permanece null */ }
    }

    const data = { url, age };
    _playerCache.set(playerName, data);
    return data;
  } catch {
    _playerCache.set(playerName, {});
    return {};
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
  if (group.special) return false;
  if (player.num === 1) return false;
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
  const sticker = getSticker(stickerId);
  const dupes   = sticker.qty > 1 ? sticker.qty - 1 : 0;
  const flagUrl = getFlagUrl(team.id);

  const card = document.createElement('div');
  card.className = 'showcase-card';
  card.dataset.stickerId = stickerId;
  card.title = `${player.name} · ${team.name}`;

  /* ── Área da foto ── */
  const photoWrap = document.createElement('div');
  photoWrap.className = 'showcase-photo-wrap';
  photoWrap.dataset.showcaseId = stickerId;

  const skeleton = document.createElement('div');
  skeleton.className = 'showcase-skeleton';

  const img = document.createElement('img');
  img.className = 'showcase-img';
  img.alt = player.name;

  const fallback = document.createElement('div');
  fallback.className = 'showcase-fallback';
  const flagFbEl = document.createElement('span');
  flagFbEl.className = 'showcase-fallback-flag';
  flagFbEl.textContent = team.flag || '🌍';
  const numFbEl = document.createElement('span');
  numFbEl.className = 'showcase-fallback-num';
  numFbEl.textContent = `#${player.num}`;
  fallback.appendChild(flagFbEl);
  fallback.appendChild(numFbEl);

  /* Badge bandeira — canto superior direito */
  const badge = document.createElement('div');
  badge.className = 'showcase-flag-badge';
  if (flagUrl) {
    const bImg = document.createElement('img');
    bImg.src     = flagUrl;
    bImg.alt     = team.name;
    bImg.className = 'showcase-flag-badge-img';
    badge.appendChild(bImg);
  } else {
    const bSpan = document.createElement('span');
    bSpan.className = 'showcase-flag-badge-emoji';
    bSpan.textContent = team.flag || '';
    badge.appendChild(bSpan);
  }

  photoWrap.appendChild(skeleton);
  photoWrap.appendChild(img);
  photoWrap.appendChild(fallback);
  photoWrap.appendChild(badge);

  /* ── Barra de info ── */
  const info = document.createElement('div');
  info.className = 'showcase-info';

  /* Escudo circular do time */
  const crest = document.createElement('div');
  crest.className = 'showcase-crest';
  if (flagUrl) {
    const cImg = document.createElement('img');
    cImg.src       = flagUrl;
    cImg.alt       = team.name;
    cImg.className = 'showcase-crest-img';
    crest.appendChild(cImg);
  } else {
    const cSpan = document.createElement('span');
    cSpan.className   = 'showcase-crest-emoji';
    cSpan.textContent = team.flag || '';
    crest.appendChild(cSpan);
  }

  /* Bloco de texto */
  const text = document.createElement('div');
  text.className = 'showcase-text';

  const nameEl = document.createElement('div');
  nameEl.className   = 'showcase-name';
  nameEl.textContent = player.name;

  const meta = document.createElement('div');
  meta.className = 'showcase-meta';

  const ageEl = document.createElement('span');
  ageEl.className = 'showcase-age';
  ageEl.dataset.showcaseAge = stickerId;
  ageEl.textContent = '—';

  const dupesEl = document.createElement('span');
  dupesEl.className = `showcase-dupes${dupes > 0 ? ' has-dupes' : ''}`;
  dupesEl.dataset.showcaseDupes = stickerId;
  dupesEl.textContent = `×${dupes}`;

  meta.appendChild(ageEl);
  meta.appendChild(dupesEl);
  text.appendChild(nameEl);
  text.appendChild(meta);

  info.appendChild(crest);
  info.appendChild(text);

  card.appendChild(photoWrap);
  card.appendChild(info);
  return card;
}

/* ── Carregamento assíncrono de foto + idade ─────────────── */

async function _loadShowcaseData(stickerId) {
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

  // Busca foto + idade
  const wikiData = await fetchWikiPlayerData(player.name);

  // Card pode ter sido removido durante o await
  if (!_findWrap()) return;

  skeleton?.remove();

  // Foto
  if (wikiData.url) {
    img.onload  = () => { img.style.display = 'block'; };
    img.onerror = () => { if (fallback) fallback.style.display = 'flex'; };
    img.src = wikiData.url;
  } else {
    if (fallback) fallback.style.display = 'flex';
  }

  // Idade
  if (wikiData.age != null) {
    document.querySelectorAll('.showcase-age').forEach(el => {
      if (el.dataset.showcaseAge === stickerId) el.textContent = `${wikiData.age}a`;
    });
  }
}

/* ── Atualiza contador de repetidas de um card existente ──── */

function updateShowcaseCard(stickerId) {
  const sticker = getSticker(stickerId);
  const dupes   = sticker.qty > 1 ? sticker.qty - 1 : 0;
  document.querySelectorAll('.showcase-dupes').forEach(el => {
    if (el.dataset.showcaseDupes === stickerId) {
      el.textContent = `×${dupes}`;
      el.classList.toggle('has-dupes', dupes > 0);
    }
  });
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

  // Remove cards desfavoritados
  container?.querySelectorAll('.showcase-card').forEach(card => {
    if (!newSet.has(card.dataset.stickerId)) card.remove();
  });

  // Adiciona novos cards na posição correta
  favIds.forEach((id, idx) => {
    if (_showcaseFavIds.has(id)) return; // já existe
    const card = _createShowcaseCard(id);
    if (!card || !container) return;

    const allCards = [...container.querySelectorAll('.showcase-card')];
    const refCard  = allCards[idx] || null;
    container.insertBefore(card, refCard);

    _loadShowcaseData(id);
  });

  _showcaseFavIds = newSet;
}
