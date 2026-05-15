/* ── Controle de IDs na vitrine ──────────────────────────── */

let _showcaseFavIds = new Set();

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

/* ── Criação de card (síncrono — sem API externa) ────────── */

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
  card.title = `${player.name} · ${team.name} · ${stickerId}`;

  /* ── Body: bandeira + número ── */
  const body = document.createElement('div');
  body.className = 'showcase-body';

  /* Bandeira centralizada (grande) */
  const flagWrap = document.createElement('div');
  flagWrap.className = 'showcase-body-flag';
  if (flagUrl) {
    const fImg = document.createElement('img');
    fImg.src       = flagUrl;
    fImg.alt       = team.name;
    fImg.className = 'showcase-body-flag-img';
    flagWrap.appendChild(fImg);
  } else {
    const fSpan = document.createElement('span');
    fSpan.className   = 'showcase-body-flag-emoji';
    fSpan.textContent = team.flag || '🌍';
    flagWrap.appendChild(fSpan);
  }

  /* Número da figurinha */
  const numEl = document.createElement('div');
  numEl.className   = 'showcase-num';
  numEl.textContent = `#${player.num}`;

  body.appendChild(flagWrap);
  body.appendChild(numEl);

  /* ── Info bar: nome + código + repetidas ── */
  const info = document.createElement('div');
  info.className = 'showcase-info';

  const nameEl = document.createElement('div');
  nameEl.className   = 'showcase-name';
  nameEl.textContent = player.name;

  const meta = document.createElement('div');
  meta.className = 'showcase-meta';

  const codeEl = document.createElement('span');
  codeEl.className   = 'showcase-code-label';
  codeEl.textContent = stickerId;

  const dupesEl = document.createElement('span');
  dupesEl.className = `showcase-dupes${dupes > 0 ? ' has-dupes' : ''}`;
  dupesEl.dataset.showcaseDupes = stickerId;
  dupesEl.textContent = `×${dupes}`;

  meta.appendChild(codeEl);
  meta.appendChild(dupesEl);
  info.appendChild(nameEl);
  info.appendChild(meta);

  /* ── Badge de conquista: checkmark + quantidade ── */
  const badge = document.createElement('div');
  badge.className = `showcase-badge${sticker.qty > 0 ? ' has-qty' : ''}`;
  badge.dataset.showcaseBadge = stickerId;
  badge.innerHTML = `
    <svg class="showcase-badge-check" width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 13l5 5L20 7" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="showcase-badge-qty">${sticker.qty}</span>
  `;

  card.appendChild(body);
  card.appendChild(info);
  card.appendChild(badge);
  return card;
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

  document.querySelectorAll('.showcase-badge').forEach(el => {
    if (el.dataset.showcaseBadge === stickerId) {
      el.classList.toggle('has-qty', sticker.qty > 0);
      const qtyEl = el.querySelector('.showcase-badge-qty');
      if (qtyEl) qtyEl.textContent = sticker.qty;
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
    container?.querySelectorAll('.showcase-card').forEach(c => c.remove());
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
    if (container?.querySelector(`.showcase-card[data-sticker-id="${id}"]`)) return;
    const card = _createShowcaseCard(id);
    if (!card || !container) return;

    const allCards = [...container.querySelectorAll('.showcase-card')];
    container.insertBefore(card, allCards[idx] || null);
  });

  _showcaseFavIds = newSet;
}
