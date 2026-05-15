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

/* ── Firestore — usernames únicos ────────────────────────── */

async function fbLookupApelido(apelido) {
  const key = apelido.trim().toLowerCase();
  const doc = await db.collection('usernames').doc(key).get();
  return doc.exists ? doc.data() : null;
}

function fbRegisterUsername(apelido, uid) {
  const key = apelido.trim().toLowerCase();
  return db.collection('usernames').doc(key).set({ uid, apelido: apelido.trim() });
}

function fbRemoveUsername(apelido) {
  const key = apelido.trim().toLowerCase();
  return db.collection('usernames').doc(key).delete();
}

/* ── Firestore — sistema de seguir ───────────────────────── */

function fbFollowUser(myUid, theirUid, profileSnapshot) {
  return db.collection('users').doc(myUid).collection('following').doc(theirUid).set({
    uid:         theirUid,
    apelido:     profileSnapshot.apelido     || '',
    photoBase64: profileSnapshot.photoBase64 || null,
    followedAt:  firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function fbUnfollowUser(myUid, theirUid) {
  return db.collection('users').doc(myUid).collection('following').doc(theirUid).delete();
}

async function fbIsFollowing(myUid, theirUid) {
  const doc = await db.collection('users').doc(myUid).collection('following').doc(theirUid).get();
  return doc.exists;
}

async function fbGetFollowingList(myUid) {
  const snap = await db.collection('users').doc(myUid)
    .collection('following').orderBy('followedAt', 'desc').get();
  return snap.docs.map(d => d.data());
}

async function fbLoadFriendAlbum(friendUid) {
  const doc = await db.collection('albums').doc(friendUid).get();
  if (!doc.exists) return {};
  return doc.data().state || {};
}

async function fbGetUserProfile(uid) {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : {};
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
  const uid = auth.currentUser ? auth.currentUser.uid : null;

  let ownerProfile = {};
  if (uid) {
    try { ownerProfile = await fbLoadProfile(uid); } catch { /* noop */ }
  }

  await db.collection('shares').doc(shortId).set({
    state,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    uid,
    ownerProfile: {
      apelido:     ownerProfile.apelido     || '',
      photoBase64: ownerProfile.photoBase64 || null,
    },
  });
  return shortId;
}

// Carrega o estado a partir de um ID curto
async function fbLoadShare(shortId) {
  const doc = await db.collection('shares').doc(shortId).get();
  if (!doc.exists) return null;
  return {
    state:        doc.data().state        || null,
    uid:          doc.data().uid          || null,
    ownerProfile: doc.data().ownerProfile || null,
  };
}
