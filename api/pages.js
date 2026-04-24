const { supabaseFetch } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const id = (req.query && req.query.id) ? String(req.query.id) : '';
  if (!id) {
    res.status(400).json({ error: 'Missing id query param' });
    return;
  }
  try {
    // Use the database admin key when present (needed if anonymous reads are blocked). Otherwise use the normal public key so local test still runs.
    const useServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = await supabaseFetch(`pages?id=eq.${encodeURIComponent(id)}&select=content`, { method: 'GET' }, useServiceRole);
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.status(response.status).send(text);
  } catch (_) {
    res.status(500).json({ error: 'Failed to load page' });
  }
};
