<?php
/**
 * Serve as credenciais do Firebase como JavaScript.
 *
 * As credenciais reais ficam em firebase-secrets.php,
 * um nível ACIMA do public_html (não acessível via HTTP).
 *
 * Para configurar no servidor:
 *   1. No File Manager da Hostinger, vá até a pasta raiz (acima do public_html)
 *   2. Crie o arquivo firebase-secrets.php com o conteúdo abaixo:
 *
 *   <?php
 *   define('FB_API_KEY',            'sua-api-key');
 *   define('FB_AUTH_DOMAIN',        'seu-projeto.firebaseapp.com');
 *   define('FB_PROJECT_ID',         'seu-projeto-id');
 *   define('FB_STORAGE_BUCKET',     'seu-projeto.firebasestorage.app');
 *   define('FB_MESSAGING_SENDER_ID','seu-sender-id');
 *   define('FB_APP_ID',             'seu-app-id');
 *   define('FB_MEASUREMENT_ID',     'seu-measurement-id');
 */

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store, no-cache');

// __DIR__ = .../public_html/js
// dirname(__DIR__, 2) = pasta raiz do usuário (acima do public_html)
$secretsFile = dirname(__DIR__, 2) . '/firebase-secrets.php';

if (file_exists($secretsFile)) {
    require $secretsFile;
} else {
    // Fallback: tenta ler de variáveis de ambiente do servidor
    define('FB_API_KEY',             getenv('FIREBASE_API_KEY')             ?: '');
    define('FB_AUTH_DOMAIN',         getenv('FIREBASE_AUTH_DOMAIN')         ?: '');
    define('FB_PROJECT_ID',          getenv('FIREBASE_PROJECT_ID')          ?: '');
    define('FB_STORAGE_BUCKET',      getenv('FIREBASE_STORAGE_BUCKET')      ?: '');
    define('FB_MESSAGING_SENDER_ID', getenv('FIREBASE_MESSAGING_SENDER_ID') ?: '');
    define('FB_APP_ID',              getenv('FIREBASE_APP_ID')              ?: '');
    define('FB_MEASUREMENT_ID',      getenv('FIREBASE_MEASUREMENT_ID')      ?: '');
}

$config = json_encode([
    'apiKey'            => FB_API_KEY,
    'authDomain'        => FB_AUTH_DOMAIN,
    'projectId'         => FB_PROJECT_ID,
    'storageBucket'     => FB_STORAGE_BUCKET,
    'messagingSenderId' => FB_MESSAGING_SENDER_ID,
    'appId'             => FB_APP_ID,
    'measurementId'     => FB_MEASUREMENT_ID,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

echo "const FIREBASE_CONFIG = {$config};";
