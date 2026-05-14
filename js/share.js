function openShareModal() {
  const modal = document.getElementById('share-modal');
  const linkEl = document.getElementById('share-link');

  const url = buildShareUrl();
  if (linkEl) linkEl.value = url;

  openModal('share-modal');
}

function buildShareUrl() {
  const json = serializeState();
  const compressed = LZString.compressToEncodedURIComponent(json);
  const base = window.location.href.split('?')[0];
  return `${base}?colecao=${compressed}`;
}

function copyShareLink() {
  const linkEl = document.getElementById('share-link');
  const url = linkEl ? linkEl.value : buildShareUrl();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => showToast('Link copiado!')).catch(() => fallbackCopyText(url));
  } else {
    fallbackCopyText(url);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Link copiado!');
}

function checkSharedUrl() {
  const params = new URLSearchParams(window.location.search);
  const colecao = params.get('colecao');
  if (!colecao) return false;

  try {
    const json = LZString.decompressFromEncodedURIComponent(colecao);
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

function showReadOnlyBanner() {
  const banner = document.getElementById('readonly-banner');
  if (banner) banner.style.display = 'flex';
}

function createOwnCollection() {
  const url = window.location.href.split('?')[0];
  window.location.href = url;
}
