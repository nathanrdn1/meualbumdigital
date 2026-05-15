// Inicializa o Firebase com as credenciais do firebase-config.js
firebase.initializeApp(FIREBASE_CONFIG);

const auth = firebase.auth();
const db   = firebase.firestore();

// Provider do Google
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/* ── Autenticação ─────────────────────────────────────────── */

function fbSignInWithGoogle() {
  return auth.signInWithPopup(googleProvider);
}

function fbSignInWithEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

async function fbRegisterWithEmail(email, password, displayName) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  if (displayName) {
    await cred.user.updateProfile({ displayName: displayName.trim() });
  }
  return cred;
}

function fbSendPasswordReset(email) {
  return auth.sendPasswordResetEmail(email);
}

function fbSignOut() {
  return auth.signOut();
}

/* ── Firestore — álbum do usuário ─────────────────────────── */

// Coleção: albums / {uid} → { state: {...}, updatedAt: Timestamp }
async function fbLoadAlbum(uid) {
  const doc = await db.collection('albums').doc(uid).get();
  if (!doc.exists) return null;
  return doc.data().state || {};
}

function fbSaveAlbum(uid, state) {
  return db.collection('albums').doc(uid).set(
    {
      state,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/* ── Firestore — perfil do usuário ───────────────────────── */

// Coleção: users/{uid} → { apelido, photoBase64, updatedAt }
async function fbLoadProfile(uid) {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : {};
}

function fbSaveProfile(uid, data) {
  return db.collection('users').doc(uid).set(
    { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

/* ── Firestore — links de compartilhamento ────────────────── */

const _SHORT_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function _generateShortId(length = 8) {
  return Array.from({ length }, () =>
    _SHORT_CHARS[Math.floor(Math.random() * _SHORT_CHARS.length)]
  ).join('');
}

// Salva o estado no Firestore e retorna o ID curto gerado
async function fbSaveShare(state) {
  const shortId = _generateShortId();
  await db.collection('shares').doc(shortId).set({
    state,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    uid: auth.currentUser ? auth.currentUser.uid : null,
  });
  return shortId;
}

// Carrega o estado a partir de um ID curto
async function fbLoadShare(shortId) {
  const doc = await db.collection('shares').doc(shortId).get();
  if (!doc.exists) return null;
  return { state: doc.data().state || null, uid: doc.data().uid || null };
}
