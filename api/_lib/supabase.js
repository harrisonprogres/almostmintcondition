const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function getConfig(useServiceRole) {
  if (!SUPABASE_URL) {
    throw new Error('Missing SUPABASE_URL env var');
  }
  const key = useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(useServiceRole ? 'Missing SUPABASE_SERVICE_ROLE_KEY env var' : 'Missing SUPABASE_ANON_KEY env var');
  }
  return { url: SUPABASE_URL, key };
}

async function supabaseFetch(path, options = {}, useServiceRole = false) {
  const cfg = getConfig(useServiceRole);
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  return fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers
  });
}

module.exports = { supabaseFetch };
