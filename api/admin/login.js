const { setSessionCookie } = require('../_lib/adminAuth');
const fs = require('fs');
const path = require('path');

function normalizeEnvValue(value) {
  if (typeof value !== 'string') return '';
  let out = value.trim();
  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("'") && out.endsWith("'"))
  ) {
    out = out.slice(1, -1).trim();
  }
  return out;
}

function readLocalEnvValue(key) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return '';
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    const prefix = `${key}=`;
    const line = lines.find((l) => l.startsWith(prefix));
    if (!line) return '';
    return normalizeEnvValue(line.slice(prefix.length));
  } catch (_) {
    return '';
  }
}

function getConfigValue(key) {
  const fromProcess = normalizeEnvValue(process.env[key]);
  if (fromProcess) return fromProcess;
  return readLocalEnvValue(key);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    const expectedEmail = getConfigValue('ADMIN_EMAIL').toLowerCase();
    const expectedPassword = getConfigValue('ADMIN_PASSWORD');
    if (!expectedEmail || !expectedPassword) {
      res.status(500).json({ error: 'Admin credentials not configured' });
      return;
    }

    if (email !== expectedEmail || password !== expectedPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    try {
      setSessionCookie(res, email);
      res.status(200).json({ ok: true });
    } catch (err) {
      const message = err && err.message ? err.message : 'Failed to create session';
      res.status(500).json({ error: message });
    }
  } catch (_) {
    res.status(400).json({ error: 'Invalid request body' });
  }
};
