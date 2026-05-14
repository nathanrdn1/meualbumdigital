/* ── Cache de dados Wikipedia/Wikidata ───────────────────── */

const _playerCache    = new Map(); // playerName → { url, age, clubName }
let   _showcaseFavIds = new Set();

/* ── Mapa de adjetivos de nacionalidade por seleção ─────── */

const _NATIONALITY = {
  MEX: 'Mexican',    RSA: 'South African', KOR: 'South Korean', CZE: 'Czech',
  CAN: 'Canadian',   BIH: 'Bosnian',       QAT: 'Qatari',       SUI: 'Swiss',
  BRA: 'Brazilian',  MAR: 'Moroccan',      HAI: 'Haitian',      SCO: 'Scottish',
  USA: 'American',   PAR: 'Paraguayan',    AUS: 'Australian',   TUR: 'Turkish',
  GER: 'German',     CUW: 'Curaçaoan',     CIV: 'Ivorian',      ECU: 'Ecuadorian',
  NED: 'Dutch',      JPN: 'Japanese',      SWE: 'Swedish',      TUN: 'Tunisian',
  BEL: 'Belgian',    EGY: 'Egyptian',      IRN: 'Iranian',      NZL: 'New Zealand',
  ESP: 'Spanish',    CPV: 'Cape Verdean',  KSA: 'Saudi',        URU: 'Uruguayan',
  FRA: 'French',     SEN: 'Senegalese',    IRQ: 'Iraqi',        NOR: 'Norwegian',
  ARG: 'Argentine',  ALG: 'Algerian',      AUT: 'Austrian',     JOR: 'Jordanian',
  POR: 'Portuguese', COD: 'Congolese',     UZB: 'Uzbek',        COL: 'Colombian',
  ENG: 'English',    CRO: 'Croatian',      GHA: 'Ghanaian',     PAN: 'Panamanian',
};

/* ── API Wikipedia + Wikidata ────────────────────────────── */

async function fetchWikiPlayerData(playerName, nationality = '') {
  const cacheKey = `${playerName}|${nationality}`;
  if (_playerCache.has(cacheKey)) return _playerCache.get(cacheKey);

  try {
    // Passo 1: busca o artigo do jogador em ordem de especificidade
    // 1º: "<nome> <nacionalidade> footballer"  →  ex: "Rodrygo Brazilian footballer"
    // 2º: "<nome> footballer"                  →  descarta homônimos não-futebolistas
    // 3º: "<nome>" simples                     →  último recurso
    const queries = nationality
      ? [`${playerName} ${nationality} footballer`, `${playerName} footballer`, playerName]
      : [`${playerName} footballer`, playerName];

    let articleTitle = null;
    for (const query of queries) {
      const r = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json&origin=*`
      );
      const [, titles] = await r.json();
      if (titles.length) { articleTitle = titles[0]; break; }
    }
    if (!articleTitle) { _playerCache.set(cacheKey, {}); return {}; }

    // Passo 2: foto do artigo Wikipedia + QID do jogador no Wikidata
    // A foto retornada é a imagem principal do artigo (foto de infobox do jogador).
    // Se não existir foto no Wikipedia, retorna null — não buscamos em outros sites.
    const r2 = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=pageimages|pageprops&format=json&pithumbsize=500&origin=*`
    );
    const d2   = await r2.json();
    const page = Object.values(d2.query.pages)[0];
    const url  = page?.thumbnail?.source ?? null;
    const qid  = page?.pageprops?.wikibase_item ?? null;

    let age      = null;
    let clubName = null;

    if (qid) {
      try {
        // Passo 3: Wikidata do jogador — nascimento (P569) + clube atual (P54)
        const r3 = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`
        );
        const d3     = await r3.json();
        const claims = d3.entities?.[qid]?.claims;

        // Idade (P569)
        const dob = claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time;
        if (dob) {
          const year  = parseInt(dob.slice(1, 5),  10);
          const month = parseInt(dob.slice(6, 8),  10);
          const day   = parseInt(dob.slice(9, 11), 10);
          const now   = new Date();
          age = now.getFullYear() - year;
          if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--;
        }

        // Clube atual (P54 sem data de término P582)
        const p54 = claims?.P54 || [];
        let clubQid = null;
        for (const c of p54) {
          if (!c.qualifiers?.P582 && c.mainsnak?.snaktype === 'value') {
            clubQid = c.mainsnak.datavalue.value.id;
          }
        }

        // Passo 4: nome do clube (apenas label, sem buscar logo)
        if (clubQid) {
          try {
            const r4 = await fetch(
              `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${clubQid}&props=labels&languages=en&format=json&origin=*`
            );
            const d4 = await r4.json();
            clubName = d4.entities?.[clubQid]?.labels?.en?.value ?? null;
          } catch { /* clube indisponível */ }
        }
      } catch { /* wikidata indisponível */ }
    }

    const data = { url, age, clubName };
    _playerCache.set(cacheKey, data);
    return data;
  } catch {
    _playerCache.set(cacheKey, {});
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
    bImg.src       = flagUrl;
    bImg.alt       = team.name;
    bImg.className = 'showcase-flag-badge-img';
    badge.appendChild(bImg);
  } else {
    const bSpan = document.createElement('span');
    bSpan.className   = 'showcase-flag-badge-emoji';
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

  const text = document.createElement('div');
  text.className = 'showcase-text';

  const nameEl = document.createElement('div');
  nameEl.className   = 'showcase-name';
  nameEl.textContent = player.name;

  /* Linha: idade + repetidas */
  const metaRow = document.createElement('div');
  metaRow.className = 'showcase-meta';

  const ageEl = document.createElement('span');
  ageEl.className = 'showcase-age';
  ageEl.dataset.showcaseAge = stickerId;
  ageEl.textContent = '—';

  const dupesEl = document.createElement('span');
  dupesEl.className = `showcase-dupes${dupes > 0 ? ' has-dupes' : ''}`;
  dupesEl.dataset.showcaseDupes = stickerId;
  dupesEl.textContent = `×${dupes}`;

  metaRow.appendChild(ageEl);
  metaRow.appendChild(dupesEl);

  /* Nome do clube (abaixo da idade) */
  const clubEl = document.createElement('span');
  clubEl.className = 'showcase-club';
  clubEl.dataset.showcaseClub = stickerId;

  text.appendChild(nameEl);
  text.appendChild(metaRow);
  text.appendChild(clubEl);

  info.appendChild(text);
  card.appendChild(photoWrap);
  card.appendChild(info);
  return card;
}

/* ── Carregamento assíncrono de foto + idade + clube ─────── */

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

  if (!_isSearchable(player, group)) {
    skeleton?.remove();
    if (fallback) fallback.style.display = 'flex';
    return;
  }

  const nationality = _NATIONALITY[data.team.id] || '';
  const wikiData = await fetchWikiPlayerData(player.name, nationality);

  if (!_findWrap()) return;

  skeleton?.remove();

  // Foto (apenas Wikipedia — sem fallback para outros sites)
  if (wikiData.url) {
    img.onload  = () => { img.style.display = 'block'; };
    img.onerror = () => { if (fallback) fallback.style.display = 'flex'; };
    img.src = wikiData.url;
  } else {
    if (fallback) fallback.style.display = 'flex';
  }

  // Idade — "25 anos"
  if (wikiData.age != null) {
    document.querySelectorAll('.showcase-age').forEach(el => {
      if (el.dataset.showcaseAge === stickerId) el.textContent = `${wikiData.age} anos`;
    });
  }

  // Nome do clube (abaixo da idade)
  if (wikiData.clubName) {
    document.querySelectorAll('.showcase-club').forEach(el => {
      if (el.dataset.showcaseClub === stickerId) el.textContent = wikiData.clubName;
    });
    document.querySelectorAll('.showcase-card').forEach(cardEl => {
      if (cardEl.dataset.stickerId === stickerId) {
        cardEl.title = `${player.name} · ${wikiData.clubName}`;
      }
    });
  }
}

/* ── Atualiza contador de repetidas em tempo real ────────── */

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

  container?.querySelectorAll('.showcase-card').forEach(card => {
    if (!newSet.has(card.dataset.stickerId)) card.remove();
  });

  favIds.forEach((id, idx) => {
    if (_showcaseFavIds.has(id)) return;
    const card = _createShowcaseCard(id);
    if (!card || !container) return;

    const allCards = [...container.querySelectorAll('.showcase-card')];
    const refCard  = allCards[idx] || null;
    container.insertBefore(card, refCard);

    _loadShowcaseData(id);
  });

  _showcaseFavIds = newSet;
}
