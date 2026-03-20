const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COOKIE_NAME = 'amc_admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret() {
  let secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        const line = lines.find((l) => l.startsWith('ADMIN_SESSION_SECRET='));
        if (line) {
          secret = line.slice('ADMIN_SESSION_SECRET='.length).trim();
          if (
            (secret.startsWith('"') && secret.endsWith('"')) ||
            (secret.startsWith("'") && secret.endsWith("'"))
          ) {
            secret = secret.slice(1, -1).trim();
          }
        }
      }
    } catch (_) {
      // no-op, handled below
    }
  }
  if (!secret) {
    throw new Error('Missing ADMIN_SESSION_SECRET env var');
  }
  return secret;
}

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    + '==='.slice((value.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret())
    .update(value)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[key] = value;
  });
  return out;
}

function makeSessionToken(email) {
  const payload = {
    email,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = sign(body);
  if (signature !== expected) return null;

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(body));
  } catch (_) {
    return null;
  }
  if (!payload || !payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

function setSessionCookie(res, email) {
  const token = makeSessionToken(email);
  const cookieParts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ];
  // Secure cookies require HTTPS; omit on localhost dev.
  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }
  const cookie = cookieParts.join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  const cookieParts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];
  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }
  const cookie = cookieParts.join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  return verifySessionToken(token);
}

function requireAdmin(req, res) {
  const host = (req.headers && req.headers.host) || '';
  if (host.includes('localhost')) {
    return { email: 'local-dev' };
  }
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}

module.exports = {
  setSessionCookie,
  clearSessionCookie,
  getSession,
  requireAdmin
};
