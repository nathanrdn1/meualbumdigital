/**
 * CONFIGURAÇÃO DO FIREBASE
 * ─────────────────────────────────────────────────────────────
 * Copie este arquivo para firebase-config.js e preencha com
 * as credenciais do seu projeto Firebase.
 *
 * firebase-config.js está no .gitignore e NUNCA deve ser commitado.
 *
 * Como obter as credenciais:
 * 1. https://console.firebase.google.com/
 * 2. Configurações do projeto (⚙️) → Seus apps → Web (</>)
 * 3. Copie o objeto firebaseConfig
 *
 * REGRAS DO FIRESTORE necessárias:
 * ─────────────────────────────────────────────────────────────
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /albums/{userId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *   }
 * }
 */

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
