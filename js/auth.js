/* ── Mensagens de erro em português ──────────────────────── */
const FB_ERRORS = {
  'auth/user-not-found':        'Usuário não encontrado.',
  'auth/wrong-password':        'Senha incorreta.',
  'auth/invalid-credential':    'E-mail ou senha incorretos.',
  'auth/email-already-in-use':  'Este e-mail já está cadastrado.',
  'auth/weak-password':         'A senha deve ter pelo menos 6 caracteres.',
  'auth/invalid-email':         'E-mail inválido.',
  'auth/too-many-requests':     'Muitas tentativas. Tente novamente em alguns minutos.',
  'auth/network-request-failed':'Sem conexão. Verifique sua internet.',
  'auth/popup-closed-by-user':  '',
  'auth/popup-blocked':         'Pop-up bloqueado. Permita pop-ups para este site.',
};

function fbErrorMsg(code) {
  return FB_ERRORS[code] || 'Ocorreu um erro inesperado. Tente novamente.';
}

/* ── Modal ───────────────────────────────────────────────── */

function showAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('open');
}

function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('open');
}

/* ── Helpers de formulário ───────────────────────────────── */

function setAuthLoading(formId, loading) {
  const form = document.getElementById(formId);
  if (!form) return;
  const btn = form.querySelector('.auth-submit');
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
  btn.textContent = loading ? 'Aguarde…' : btn.dataset.label;
}

function setAuthError(errorId, msg) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

/* ── Header — indicador do usuário logado ────────────────── */

function updateUserHeader(user, profile = {}) {
  const indicator  = document.getElementById('user-indicator');
  const initialsEl = document.getElementById('user-avatar-initials');
  const imgEl      = document.getElementById('user-avatar-img');
  const nameEl     = document.getElementById('user-name');
  if (!indicator) return;

  if (user) {
    const displayName = user.displayName || user.email || 'Usuário';
    const initials    = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const shownName   = profile.apelido || displayName.split(' ')[0];

    if (nameEl) nameEl.textContent = shownName;

    // Foto de perfil ou iniciais
    if (profile.photoBase64 && imgEl && initialsEl) {
      imgEl.src          = profile.photoBase64;
      imgEl.style.display    = 'block';
      initialsEl.style.display = 'none';
    } else {
      if (initialsEl) { initialsEl.textContent = initials; initialsEl.style.display = 'flex'; }
      if (imgEl)      imgEl.style.display = 'none';
    }

    indicator.style.display = 'flex';
  } else {
    indicator.style.display = 'none';
  }
}

/* ── Binding dos eventos de auth ─────────────────────────── */

function bindAuthEvents() {
  /* Alternar abas Entrar / Criar conta */
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('login-form').hidden    = target !== 'login';
      document.getElementById('register-form').hidden = target !== 'register';
      setAuthError('login-error', '');
      setAuthError('register-error', '');
    });
  });

  /* Formulário de login */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) return;

      setAuthLoading('login-form', true);
      setAuthError('login-error', '');
      try {
        await fbSignInWithEmail(email, password);
        // onAuthStateChanged cuida do resto
      } catch (err) {
        setAuthError('login-error', fbErrorMsg(err.code));
        setAuthLoading('login-form', false);
      }
    });
  }

  /* Formulário de cadastro */
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name     = document.getElementById('register-name').value.trim();
      const email    = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      if (!email || !password) return;

      setAuthLoading('register-form', true);
      setAuthError('register-error', '');
      try {
        await fbRegisterWithEmail(email, password, name);
        // onAuthStateChanged cuida do resto
      } catch (err) {
        setAuthError('register-error', fbErrorMsg(err.code));
        setAuthLoading('register-form', false);
      }
    });
  }

  /* Google */
  const googleBtn = document.getElementById('google-signin-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      setAuthError('login-error', '');
      setAuthError('register-error', '');
      try {
        await fbSignInWithGoogle();
      } catch (err) {
        const msg = fbErrorMsg(err.code);
        if (msg) {
          setAuthError('login-error', msg);
          setAuthError('register-error', msg);
        }
        googleBtn.disabled = false;
      }
    });
  }

  /* Esqueci a senha */
  const forgotBtn = document.getElementById('forgot-password-btn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      if (!email) { setAuthError('login-error', 'Digite seu e-mail primeiro.'); return; }
      try {
        await fbSendPasswordReset(email);
        setAuthError('login-error', '');
        showToast('📧 E-mail de recuperação enviado!');
      } catch (err) {
        setAuthError('login-error', fbErrorMsg(err.code));
      }
    });
  }

  /* Logout */
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fbSignOut();
    });
  }
}

/* ── Inicialização pública ───────────────────────────────── */

function initAuth(onSignedIn, onSignedOut) {
  bindAuthEvents();

  auth.onAuthStateChanged(async user => {
    if (user) {
      updateUserHeader(user);
      await onSignedIn(user);
    } else {
      updateUserHeader(null);
      onSignedOut();
    }
  });
}
