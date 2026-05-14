/* ── Estado local do perfil ──────────────────────────────── */

let _pendingPhotoBase64 = null; // foto nova aguardando salvar

/* ── Abrir / Fechar ──────────────────────────────────────── */

async function openProfileModal() {
  openModal('profile-modal');

  const user = auth.currentUser;
  if (!user) return;

  // Limpa mensagens anteriores
  _setProfileMsg('error', '');
  _setProfileMsg('success', '');

  // Preenche campos do Firebase Auth
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  if (nameEl)  nameEl.value  = user.displayName || '';
  if (emailEl) emailEl.value = user.email || '';

  // Mostra/esconde seção de senha conforme provedor
  const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
  const pwdSection = document.getElementById('profile-password-section');
  const googleNote = document.getElementById('profile-google-note');
  if (pwdSection) pwdSection.style.display = isGoogle ? 'none' : 'block';
  if (googleNote) googleNote.style.display = isGoogle ? 'block' : 'none';

  // Limpa campos de senha
  ['profile-password', 'profile-password-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Carrega dados do Firestore (apelido + foto)
  _pendingPhotoBase64 = null;
  try {
    const profile = await fbLoadProfile(user.uid);
    const apelidoEl = document.getElementById('profile-apelido');
    if (apelidoEl) apelidoEl.value = profile.apelido || '';

    if (profile.photoBase64) {
      _pendingPhotoBase64 = profile.photoBase64;
      _showPhotoPreview(profile.photoBase64);
    } else {
      _showInitialsPreview(user);
    }
  } catch {
    _showInitialsPreview(user);
  }
}

function closeProfileModal() {
  closeModal('profile-modal');
  _pendingPhotoBase64 = null;
}

/* ── Foto de perfil ──────────────────────────────────────── */

function handleProfilePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 512 * 1024) {
    _setProfileMsg('error', 'Foto muito grande. Máximo 512 KB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    _pendingPhotoBase64 = ev.target.result;
    _showPhotoPreview(_pendingPhotoBase64);
    _setProfileMsg('error', '');
  };
  reader.readAsDataURL(file);

  // Reset input para permitir selecionar o mesmo arquivo novamente
  e.target.value = '';
}

function _showPhotoPreview(base64) {
  const img      = document.getElementById('profile-photo-preview');
  const initials = document.getElementById('profile-photo-initials');
  if (img)      { img.src = base64; img.style.display = 'block'; }
  if (initials) initials.style.display = 'none';
}

function _showInitialsPreview(user) {
  const img      = document.getElementById('profile-photo-preview');
  const initials = document.getElementById('profile-photo-initials');
  if (img)      { img.src = ''; img.style.display = 'none'; }
  if (initials) {
    const name = user.displayName || user.email || '?';
    initials.textContent = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    initials.style.display = 'flex';
  }
}

/* ── Salvar perfil ───────────────────────────────────────── */

async function saveProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const name    = (document.getElementById('profile-name')?.value    || '').trim();
  const apelido = (document.getElementById('profile-apelido')?.value || '').trim();
  const btn     = document.getElementById('profile-save-btn');

  _setProfileMsg('error', '');
  _setProfileMsg('success', '');
  _setBtnLoading(btn, true, 'Salvando…');

  try {
    // Atualiza displayName no Firebase Auth
    if (name !== (user.displayName || '')) {
      await auth.currentUser.updateProfile({ displayName: name });
    }

    // Salva apelido e foto no Firestore
    const data = { apelido };
    if (_pendingPhotoBase64) data.photoBase64 = _pendingPhotoBase64;
    await fbSaveProfile(user.uid, data);

    // Atualiza header imediatamente
    const profile = { apelido, photoBase64: _pendingPhotoBase64 || undefined };
    updateUserHeader(auth.currentUser, profile);

    _setProfileMsg('success', 'Perfil atualizado com sucesso!');
    showToast('✅ Perfil atualizado!');
  } catch (err) {
    _setProfileMsg('error', _fbProfileError(err.code));
  } finally {
    _setBtnLoading(btn, false, 'Salvar alterações');
  }
}

/* ── Alterar senha ───────────────────────────────────────── */

async function changePassword() {
  const newPass     = document.getElementById('profile-password')?.value || '';
  const confirmPass = document.getElementById('profile-password-confirm')?.value || '';
  const btn         = document.getElementById('profile-password-btn');

  _setProfileMsg('error', '');
  _setProfileMsg('success', '');

  if (!newPass)              { _setProfileMsg('error', 'Digite a nova senha.');                    return; }
  if (newPass.length < 6)    { _setProfileMsg('error', 'A senha deve ter pelo menos 6 caracteres.'); return; }
  if (newPass !== confirmPass) { _setProfileMsg('error', 'As senhas não coincidem.');               return; }

  _setBtnLoading(btn, true, 'Alterando…');

  try {
    await auth.currentUser.updatePassword(newPass);
    document.getElementById('profile-password').value         = '';
    document.getElementById('profile-password-confirm').value = '';
    _setProfileMsg('success', 'Senha alterada com sucesso!');
    showToast('🔒 Senha alterada!');
  } catch (err) {
    const msg = err.code === 'auth/requires-recent-login'
      ? 'Por segurança, saia e entre novamente antes de alterar a senha.'
      : _fbProfileError(err.code);
    _setProfileMsg('error', msg);
  } finally {
    _setBtnLoading(btn, false, 'Alterar senha');
  }
}

/* ── Helpers ─────────────────────────────────────────────── */

function _setProfileMsg(type, msg) {
  const id = type === 'error' ? 'profile-error' : 'profile-success';
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent    = msg;
  el.style.display  = msg ? 'block' : 'none';
}

function _setBtnLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = label;
}

function _fbProfileError(code) {
  const MAP = {
    'auth/weak-password':          'A senha deve ter pelo menos 6 caracteres.',
    'auth/requires-recent-login':  'Saia e entre novamente para alterar a senha.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  };
  return MAP[code] || 'Ocorreu um erro. Tente novamente.';
}

/* ── Binding de eventos ──────────────────────────────────── */

function bindProfileEvents() {
  // Fechar modal
  document.getElementById('profile-close-btn')
    ?.addEventListener('click', closeProfileModal);

  document.getElementById('profile-modal')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('profile-modal')) closeProfileModal();
    });

  // Upload de foto
  document.getElementById('profile-photo-btn')
    ?.addEventListener('click', () => document.getElementById('profile-photo-input')?.click());

  document.getElementById('profile-photo-wrap')
    ?.addEventListener('click', () => document.getElementById('profile-photo-input')?.click());

  document.getElementById('profile-photo-input')
    ?.addEventListener('change', handleProfilePhotoChange);

  // Salvar e alterar senha
  document.getElementById('profile-save-btn')
    ?.addEventListener('click', saveProfile);

  document.getElementById('profile-password-btn')
    ?.addEventListener('click', changePassword);

  // Abrir perfil ao clicar no avatar ou nome (mas não no botão Sair)
  document.getElementById('user-avatar')
    ?.addEventListener('click', openProfileModal);

  document.getElementById('user-name')
    ?.addEventListener('click', openProfileModal);
}
