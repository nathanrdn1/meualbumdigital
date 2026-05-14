function openExportModal() {
  const data = getExportData();
  const modal = document.getElementById('export-modal');
  const body = document.getElementById('export-modal-body');
  const subtitle = document.getElementById('export-modal-sub');

  body.innerHTML = '';

  if (data.length === 0) {
    body.innerHTML = '<div class="modal-empty">Nenhuma figurinha repetida ainda.</div>';
    subtitle.textContent = 'Sem repetidas para troca';
  } else {
    let totalDupes = 0;
    const fragment = document.createDocumentFragment();

    for (const { team, dupes } of data) {
      const groupHeader = document.createElement('div');
      groupHeader.className = 'modal-group-header';
      groupHeader.textContent = `${team.flag} ${team.name}`;
      fragment.appendChild(groupHeader);

      const list = document.createElement('ul');
      list.className = 'modal-list';

      for (const dupe of dupes) {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = dupe.name + ' ';
        const codeSpan = document.createElement('span');
        codeSpan.className = 'code';
        codeSpan.textContent = dupe.id;
        nameSpan.appendChild(codeSpan);

        const qtySpan = document.createElement('span');
        qtySpan.className = 'qty-badge';
        qtySpan.textContent = `×${dupe.qty}`;

        li.appendChild(nameSpan);
        li.appendChild(qtySpan);
        list.appendChild(li);
        totalDupes += dupe.qty;
      }

      fragment.appendChild(list);
    }

    body.appendChild(fragment);
    subtitle.textContent = `Lista gerada automaticamente · ${totalDupes} figurinha${totalDupes !== 1 ? 's' : ''}`;
  }

  openModal('export-modal');
}

function buildExportText() {
  const data = getExportData();
  if (data.length === 0) return 'Nenhuma figurinha repetida.';

  let text = '🔄 MINHAS REPETIDAS — Copa 2026\n';
  text += '================================\n';

  let total = 0;
  for (const { team, dupes } of data) {
    text += `\n${team.flag} ${team.name.toUpperCase()}\n`;
    for (const d of dupes) {
      text += `  ${d.id} ${d.name} (${d.qty}x)\n`;
      total += d.qty;
    }
  }

  text += `\n================================\nTotal: ${total} figurinha${total !== 1 ? 's' : ''} para troca`;
  return text;
}

function copyExportList() {
  const text = buildExportText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('Lista copiada!')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function downloadExportList() {
  const text = buildExportText();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'copa2026-trocas.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Arquivo baixado!');
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Lista copiada!');
}
