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
  const sel = document.getElementById('team-filter');
  if (!sel) return;

  // Coleta times não-especiais e ordena por nome
  const teams = [];
  for (const g of ALBUM_DATA) {
    if (g.special) continue;
    for (const team of g.teams) {
      teams.push({ id: team.id, name: team.name, flag: team.flag });
    }
  }
  teams.sort((a, b) => a.name.localeCompare(b.name, 'pt'));

  teams.forEach(t => {
    const opt = document.createElement('option');
    opt.value       = t.id;
    opt.textContent = `${t.flag}  ${t.name}`;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    currentTeam = sel.value;
    sel.classList.toggle('active', !!currentTeam);
    applyFilters();
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
          case 'owned':   matchFilter = s.owned;    break;
          case 'missing': matchFilter = !s.owned;   break;
          case 'dupes':   matchFilter = s.qty > 1;  break;
          case 'favs':    matchFilter = s.fav;      break;
          default:        matchFilter = true;
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
