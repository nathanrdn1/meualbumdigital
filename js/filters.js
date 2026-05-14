let currentFilter = 'all';
let currentSearch = '';
let searchDebounceTimer = null;

function initFilters() {
  const pills = document.querySelectorAll('.pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      applyFilters();
    });
  });

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearch = searchInput.value.trim().toLowerCase();
      applyFilters();
    }, 200);
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
      const cards = block.querySelectorAll('.sticker[data-sticker-id]');
      let teamVisible = false;

      cards.forEach(card => {
        const id = card.dataset.stickerId;
        const s = getSticker(id);
        const playerName = card.dataset.playerName || '';
        const teamName = card.dataset.teamName || '';

        let matchSearch = true;
        if (currentSearch) {
          matchSearch = playerName.includes(currentSearch) ||
                        teamName.includes(currentSearch) ||
                        id.toLowerCase().includes(currentSearch);
        }

        let matchFilter = true;
        switch (currentFilter) {
          case 'owned':
            matchFilter = s.owned;
            break;
          case 'missing':
            matchFilter = !s.owned;
            break;
          case 'dupes':
            matchFilter = s.qty > 1;
            break;
          case 'favs':
            matchFilter = s.fav;
            break;
          default:
            matchFilter = true;
        }

        const visible = matchSearch && matchFilter;
        card.hidden = !visible;
        if (visible) {
          teamVisible = true;
          visibleCount++;
        }
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

  if (currentFilter === 'all' && !currentSearch) {
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
