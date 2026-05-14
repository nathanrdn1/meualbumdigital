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
