async function openShareModal() {
  const modal   = document.getElementById('share-modal');
  const linkEl  = document.getElementById('share-link');
  const copyBtn = document.getElementById('share-copy-btn');

  // Abre o modal e mostra estado de carregamento
  openModal('share-modal');
  if (linkEl)  { linkEl.value = 'Gerando link…'; linkEl.style.color = 'var(--text-muted)'; }
  if (copyBtn) copyBtn.disabled = true;

  try {
    const shortId = await fbSaveShare(serializeStateAsObject());
    const base    = window.location.href.split('?')[0];
    const url     = `${base}?c=${shortId}`;

    if (linkEl)  { linkEl.value = url; linkEl.style.color = ''; }
    if (copyBtn) copyBtn.disabled = false;
  } catch (err) {
    console.error('[share] Erro ao gerar link:', err);
    if (linkEl)  { linkEl.value = 'Erro ao gerar link. Tente novamente.'; }
    if (copyBtn) copyBtn.disabled = false;
    showToast('⚠️ Não foi possível gerar o link');
  }
}

// Serializa o estado atual como objeto puro (sem stringify)
function serializeStateAsObject() {
  try {
    return JSON.parse(serializeState());
  } catch {
    return {};
  }
}

function copyShareLink() {
  const linkEl = document.getElementById('share-link');
  const url    = linkEl ? linkEl.value : '';
  if (!url || url.startsWith('Gerando') || url.startsWith('Erro')) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('🔗 Link copiado!'))
      .catch(() => fallbackCopyText(url));
  } else {
    fallbackCopyText(url);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity  = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('🔗 Link copiado!');
}

// Retorna true se a URL atual é um link compartilhado (e carrega o estado)
async function checkSharedUrl() {
  const params = new URLSearchParams(window.location.search);

  // Novo formato: ?c=<shortId>
  const shortId = params.get('c');
  if (shortId) {
    try {
      const result = await fbLoadShare(shortId);
      if (!result || !result.state) { showToast('⚠️ Link inválido ou expirado'); return false; }
      loadStateFromObject(result.state);
      isReadOnly = true;
      showReadOnlyBanner();

      if (result.uid) {
        try {
          const profile = await fbLoadProfile(result.uid);
          const mockUser = { displayName: profile.apelido || 'Colecionador', email: '' };
          updateUserHeader(mockUser, profile);
        } catch { /* noop */ }
      }

      return true;
    } catch (err) {
      console.error('[share] Erro ao carregar link:', err);
      return false;
    }
  }

  // Formato legado: ?colecao=<lzstring> (compatibilidade com links antigos)
  const colecao = params.get('colecao');
  if (colecao) {
    try {
      const json  = LZString.decompressFromEncodedURIComponent(colecao);
      if (!json) return false;
      const state = JSON.parse(json);
      loadStateFromObject(state);
      isReadOnly = true;
      showReadOnlyBanner();
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

function showReadOnlyBanner() {
  const banner = document.getElementById('readonly-banner');
  if (banner) banner.style.display = 'flex';
}

function createOwnCollection() {
  window.location.href = window.location.href.split('?')[0];
}
