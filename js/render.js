function renderAll() {
  const container = document.getElementById('main-content');
  container.innerHTML = '';

  for (const groupData of ALBUM_DATA) {
    const section = createGroupSection(groupData);
    container.appendChild(section);
  }
}

function createGroupSection(groupData) {
  const section = document.createElement('div');
  section.className = 'section';
  section.dataset.group = groupData.group;
  if (groupData.special) section.dataset.special = '1';

  const label = document.createElement('div');
  label.className = 'group-label';

  let iconHtml = '';
  if (groupData.group === 'FWC') {
    iconHtml = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="flex-shrink:0">
      <path d="M6 3H4a2 2 0 000 4c0 2 1.5 3.5 3 4.2" stroke="rgba(201,168,76,0.4)" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M18 3h2a2 2 0 010 4c0 2-1.5 3.5-3 4.2" stroke="rgba(201,168,76,0.4)" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M6 3h12v9a6 6 0 01-12 0V3z" fill="rgba(201,168,76,0.2)" stroke="#C9A84C" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  } else if (groupData.group === 'CC') {
    iconHtml = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="flex-shrink:0">
      <circle cx="12" cy="12" r="9" fill="rgba(201,168,76,0.15)" stroke="rgba(201,168,76,0.4)" stroke-width="1.8"/>
      <path d="M9 8c0 0 1-1 3-1s3 1.5 3 2.5S14 11 12 11s-3 1-3 2.5S10.5 16 13 16" stroke="#C9A84C" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  }

  label.innerHTML = `
    <div class="group-line"></div>
    <div class="group-text">${iconHtml}${groupData.label}</div>
    <div class="group-line"></div>
  `;
  section.appendChild(label);

  for (const team of groupData.teams) {
    const teamBlock = createTeamBlock(team, groupData.special);
    section.appendChild(teamBlock);
  }

  return section;
}

function createTeamBlock(team, isSpecial) {
  const block = document.createElement('div');
  block.className = 'team-block';
  block.dataset.teamId = team.id;

  const { owned, total } = getTeamStats(team.id, team.players);
  const pct = total > 0 ? ((owned / total) * 100).toFixed(1) : '0.0';

  let flagHtml = '';
  if (!isSpecial) {
    const flagUrl = getFlagUrl(team.id);
    flagHtml = flagUrl
      ? `<img class="team-flag-img" src="${flagUrl}" alt="Bandeira ${team.name}" width="36" height="27" loading="lazy" />`
      : `<span class="team-flag" aria-hidden="true">${team.flag}</span>`;
  } else {
    flagHtml = `<span class="team-flag-special" aria-hidden="true">${team.flag}</span>`;
  }

  const header = document.createElement('div');
  header.className = 'team-header';
  header.innerHTML = `
    <div class="team-flag-wrap">${flagHtml}</div>
    <div class="team-info">
      <div class="team-name">${team.name}</div>
      <div class="team-count" data-team-count="${team.id}">${owned} / ${total} figurinhas</div>
    </div>
    <div class="team-progress-wrap">
      <div class="team-progress-track">
        <div class="team-progress-fill" data-team-bar="${team.id}" style="width:${pct}%"></div>
      </div>
      <div class="team-pct" data-team-pct="${team.id}">${pct}%</div>
    </div>
  `;
  block.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'sticker-grid';
  grid.dataset.teamGrid = team.id;

  for (const player of team.players) {
    const card = createStickerCard(team, player, isSpecial);
    grid.appendChild(card);
  }

  block.appendChild(grid);
  return block;
}

function createStickerCard(team, player, isSpecial) {
  const id = `${team.id}-${player.num}`;
  const s = getSticker(id);
  const isEscudo = player.num === 1 && !isSpecial;

  const card = document.createElement('div');
  card.className = getStickerClass(s) + (isEscudo ? ' sticker-escudo' : '');
  card.dataset.stickerId = id;
  card.dataset.teamId = team.id;
  card.dataset.playerName = player.name.toLowerCase();
  card.dataset.teamName = team.name.toLowerCase();

  let visualHtml = '';
  if (isEscudo) {
    const flagUrl = getFlagUrl(team.id);
    visualHtml = flagUrl
      ? `<img class="sticker-flag-img sticker-escudo-img" src="${flagUrl}" alt="Escudo ${team.name}" width="40" height="30" loading="lazy" />`
      : `<span class="sticker-flag" aria-hidden="true">${team.flag}</span>`;
  } else if (!isSpecial) {
    const flagUrl = getFlagUrl(team.id);
    visualHtml = flagUrl
      ? `<img class="sticker-flag-img" src="${flagUrl}" alt="Bandeira ${team.name}" width="32" height="24" loading="lazy" />`
      : `<span class="sticker-flag" aria-hidden="true">${team.flag}</span>`;
  } else {
    visualHtml = `<span class="sticker-special-icon" aria-hidden="true">${team.flag}</span>`;
  }

  const nameClass = isEscudo ? 'sticker-name sticker-escudo-name' : `sticker-name ${s.owned ? 'owned' : ''}`;
  const displayName = isEscudo ? team.name : player.name;

  card.innerHTML = `
    ${s.owned ? '<span class="sticker-check" aria-hidden="true">✓</span>' : ''}
    <button class="sticker-star-btn ${s.fav ? 'active' : ''}"
      aria-label="Marcar ${displayName} como favorita"
      data-star-id="${id}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path class="star-path" d="M12 2l2.9 6.1L22 9.2l-5 5 1.2 7L12 18l-6.2 3.2 1.2-7-5-5 7.1-1.1L12 2z" stroke-linejoin="round"/>
      </svg>
    </button>
    ${visualHtml}
    <div class="${nameClass}">${displayName}</div>
    <span class="sticker-code">${id}</span>
    <div class="qty-ctrl">
      <button class="qty-btn" aria-label="Diminuir quantidade de ${displayName}" data-dec="${id}">−</button>
      <span class="qty-num" data-qty="${id}">${s.qty}</span>
      <button class="qty-btn" aria-label="Aumentar quantidade de ${displayName}" data-inc="${id}">+</button>
    </div>
  `;

  return card;
}

function getStickerClass(s) {
  let cls = 'sticker';
  if (s.owned && s.fav) cls += ' pasted fav';
  else if (s.owned) cls += ' pasted';
  else if (s.fav) cls += ' fav';
  else cls += ' missing';
  return cls;
}

function updateStickerCard(id) {
  const main = document.getElementById('main-content');
  const card = main?.querySelector(`[data-sticker-id="${id}"]`);
  if (!card) return;

  const s = getSticker(id);
  const isEscudo = card.classList.contains('sticker-escudo');
  const baseClass = getStickerClass(s) + (isEscudo ? ' sticker-escudo' : '');
  card.className = baseClass;

  const check = card.querySelector('.sticker-check');
  const name = card.querySelector('.sticker-name');
  const qty = card.querySelector(`[data-qty="${id}"]`);
  const star = card.querySelector(`[data-star-id="${id}"]`);

  if (s.owned && !check) {
    const span = document.createElement('span');
    span.className = 'sticker-check';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = '✓';
    card.insertBefore(span, card.firstChild);
  } else if (!s.owned && check) {
    check.remove();
  }

  if (name && !isEscudo) {
    name.className = `sticker-name ${s.owned ? 'owned' : ''}`;
  }
  if (qty) qty.textContent = s.qty;
  if (star) star.className = `sticker-star-btn ${s.fav ? 'active' : ''}`;
}

function updateTeamProgress(teamId) {
  let team = null;
  for (const g of ALBUM_DATA) {
    team = g.teams.find(t => t.id === teamId);
    if (team) break;
  }
  if (!team) return;

  const { owned, total } = getTeamStats(teamId, team.players);
  const pct = total > 0 ? ((owned / total) * 100).toFixed(1) : '0.0';

  const countEl = document.querySelector(`[data-team-count="${teamId}"]`);
  const barEl = document.querySelector(`[data-team-bar="${teamId}"]`);
  const pctEl = document.querySelector(`[data-team-pct="${teamId}"]`);

  if (countEl) countEl.textContent = `${owned} / ${total} figurinhas`;
  if (barEl) barEl.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
}

function updateHeaderStats() {
  const stats = getStats();

  const ownedEl = document.getElementById('stat-owned');
  const missingEl = document.getElementById('stat-missing');
  const dupesEl = document.getElementById('stat-dupes');
  const favsEl = document.getElementById('stat-favs');
  const progressFill = document.getElementById('progress-fill');
  const progressNums = document.getElementById('progress-nums');
  const progressPct = document.getElementById('progress-pct');

  if (ownedEl) ownedEl.textContent = stats.owned;
  updateHeaderFigurinhas();
  if (missingEl) missingEl.textContent = stats.missing;
  if (dupesEl) dupesEl.textContent = stats.dupes;
  if (favsEl) favsEl.textContent = stats.favs;

  const pct = stats.total > 0 ? ((stats.owned / stats.total) * 100).toFixed(1) : '0.0';
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (progressNums) progressNums.textContent = `${stats.owned} / ${stats.total}`;
  if (progressPct) progressPct.textContent = `${pct}% completo`;
}
