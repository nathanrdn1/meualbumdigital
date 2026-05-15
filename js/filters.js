let currentFilter = 'all';
let currentSearch = '';
let currentTeam   = '';
let searchDebounceTimer = null;

function initFilters() {
  /* Pills de status */
  const pills = document.querySelectorAll('.pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      applyFilters();
    });
  });

  /* Campo de busca */
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearch = searchInput.value.trim().toLowerCase();
      applyFilters();
    }, 200);
  });

  /* Seletor de seleção */
  _initTeamFilter();
}

function _initTeamFilter() {
  const wrap  = document.getElementById('team-filter-wrap');
  const btn   = document.getElementById('team-filter-btn');
  const list  = document.getElementById('team-filter-dropdown');
  const label = document.getElementById('team-filter-label');
  const iconSlot = document.getElementById('team-filter-icon-slot');
  if (!wrap || !btn || !list) return;

  /* Coleta times não-especiais e ordena por nome */
  const teams = [];
  for (const g of ALBUM_DATA) {
    if (g.special) continue;
    for (const team of g.teams) {
      teams.push({ id: team.id, name: team.name, flag: team.flag });
    }
  }
  teams.sort((a, b) => a.name.localeCompare(b.name, 'pt'));

  /* Opção "Todas as seleções" */
  const allOpt = document.createElement('div');
  allOpt.className = 'team-filter-option selected';
  allOpt.dataset.value = '';
  allOpt.innerHTML = `
    <span class="team-filter-opt-icon">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="rgba(201,168,76,0.5)" stroke-width="1.8"/>
        <path d="M2 12h20M12 2c-3 4-3 16 0 20M12 2c3 4 3 16 0 20" stroke="rgba(201,168,76,0.5)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </span>
    <span class="team-filter-opt-name">Todas as seleções</span>`;
  list.appendChild(allOpt);

  /* Opção por seleção com bandeira */
  teams.forEach(t => {
    const opt = document.createElement('div');
    opt.className = 'team-filter-option';
    opt.dataset.value = t.id;
    const flagUrl = getFlagUrl(t.id);
    const flagHtml = flagUrl
      ? `<img src="${flagUrl}" alt="${t.name}" class="team-filter-opt-flag" width="20" height="15" loading="lazy" />`
      : `<span style="font-size:13px;line-height:1">${t.flag || '🌍'}</span>`;
    opt.innerHTML = `
      <span class="team-filter-opt-icon">${flagHtml}</span>
      <span class="team-filter-opt-name">${t.name}</span>`;
    list.appendChild(opt);
  });

  /* Abre / fecha */
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = !list.hidden;
    list.hidden = isOpen;
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  /* Seleciona opção */
  list.addEventListener('click', e => {
    const opt = e.target.closest('.team-filter-option');
    if (!opt) return;
    const value = opt.dataset.value;

    list.querySelectorAll('.team-filter-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');

    currentTeam = value;

    if (value) {
      const t = teams.find(t => t.id === value);
      const flagUrl = getFlagUrl(value);
      iconSlot.innerHTML = flagUrl
        ? `<img src="${flagUrl}" alt="${t.name}" class="team-filter-btn-flag" width="18" height="14" />`
        : `<span style="font-size:13px;line-height:1">${t.flag || '🌍'}</span>`;
      label.textContent = t.name;
      btn.classList.add('active');
    } else {
      iconSlot.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
        <path d="M2 12h20M12 2c-3 4-3 16 0 20M12 2c3 4 3 16 0 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
      label.textContent = 'Seleções';
      btn.classList.remove('active');
    }

    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    applyFilters();
  });

  /* Fecha ao clicar fora */
  document.addEventListener('click', () => {
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  });

  /* Fecha com Escape */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !list.hidden) {
      list.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
}

function applyFilters() {
  const sections = document.querySelectorAll('.section[data-group]');
  let visibleCount = 0;

  sections.forEach(section => {
    const teamBlocks = section.querySelectorAll('.team-block');
    let sectionVisible = false;

    teamBlocks.forEach(block => {
      const teamId = block.dataset.teamId;

      /* Filtro por seleção */
      if (currentTeam && teamId !== currentTeam) {
        block.hidden = true;
        return;
      }

      const cards = block.querySelectorAll('.sticker[data-sticker-id]');
      let teamVisible = false;

      cards.forEach(card => {
        const id = card.dataset.stickerId;
        const s  = getSticker(id);
        const playerName = card.dataset.playerName || '';
        const teamName   = card.dataset.teamName   || '';

        let matchSearch = true;
        if (currentSearch) {
          matchSearch = playerName.includes(currentSearch) ||
                        teamName.includes(currentSearch) ||
                        id.toLowerCase().includes(currentSearch);
        }

        let matchFilter = true;
        switch (currentFilter) {
          case 'owned':        matchFilter = s.owned;    break;
          case 'missing':      matchFilter = !s.owned;   break;
          case 'dupes':        matchFilter = s.qty > 1;  break;
          case 'favs':         matchFilter = s.fav;      break;
          case 'friend-has': {
            const mine = getMyStateSnapshot();
            matchFilter = s.owned && !(mine?.[id]?.owned);
            break;
          }
          case 'friend-dupes': matchFilter = s.qty > 1; break;
          default:             matchFilter = true;
        }

        const visible = matchSearch && matchFilter;
        card.hidden = !visible;
        if (visible) { teamVisible = true; visibleCount++; }
      });

      block.hidden = !teamVisible;
      if (teamVisible) sectionVisible = true;
    });

    section.hidden = !sectionVisible;
  });

  updateResultsCounter(visibleCount);
  updateNoResults(visibleCount);
}

function updateResultsCounter(count) {
  const el = document.getElementById('results-counter');
  if (!el) return;
  if (currentFilter === 'all' && !currentSearch && !currentTeam) {
    el.textContent = '';
    return;
  }
  el.textContent = `${count} figurinha${count !== 1 ? 's' : ''} encontrada${count !== 1 ? 's' : ''}`;
}

function updateNoResults(count) {
  const el = document.getElementById('no-results');
  if (!el) return;
  el.classList.toggle('visible', count === 0);
}
