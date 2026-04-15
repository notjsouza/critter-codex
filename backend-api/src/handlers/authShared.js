const crypto = require('crypto');

const APP_AUTH_REDIRECT_URI = process.env.APP_AUTH_REDIRECT_URI || 'crittercodex://auth';
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const GOOGLE_OAUTH_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || '';
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'local-dev-auth-secret';
const AUTH_STATE_SECRET = process.env.AUTH_STATE_SECRET || 'local-dev-state-secret';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function createSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, expectedHash) {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function generateConfirmationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const input = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  const padded = pad ? input + '='.repeat(4 - pad) : input;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  if (expected !== signature) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }
}

function createSessionToken(email, provider = 'email') {
  const now = Math.floor(Date.now() / 1000);
  return signToken(
    {
      sub: email,
      provider,
      iat: now,
      exp: now + 60 * 60 * 24 * 7,
    },
    AUTH_TOKEN_SECRET
  );
}

function createOAuthState() {
  const nonce = crypto.randomBytes(12).toString('hex');
  const ts = Date.now();
  const payload = { nonce, ts };
  return signToken(payload, AUTH_STATE_SECRET);
}

function verifyOAuthState(state) {
  const payload = verifyToken(state, AUTH_STATE_SECRET);
  if (!payload || typeof payload.ts !== 'number') {
    return false;
  }

  return Date.now() - payload.ts <= 10 * 60 * 1000;
}

function getGoogleAuthorizationUrl() {
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_REDIRECT_URI) {
    return null;
  }

  const state = createOAuthState();
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGoogleCode(code) {
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REDIRECT_URI) {
    throw new Error('Google OAuth environment variables are missing.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${body}`);
  }

  return response.json();
}

function parseGoogleIdToken(idToken) {
  const parts = String(idToken || '').split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

function getAppAuthRedirectUrl(token, email) {
  const params = new URLSearchParams({ token });
  if (email) {
    params.set('email', email);
  }

  return `${APP_AUTH_REDIRECT_URI}?${params.toString()}`;
}

module.exports = {
  normalizeEmail,
  createSalt,
  hashPassword,
  verifyPassword,
  generateConfirmationCode,
  createSessionToken,
  verifyToken,
  getGoogleAuthorizationUrl,
  verifyOAuthState,
  exchangeGoogleCode,
  parseGoogleIdToken,
  getAppAuthRedirectUrl,
};