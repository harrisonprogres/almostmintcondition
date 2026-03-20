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
    const response = await supabaseFetch(`pages?id=eq.${encodeURIComponent(id)}&select=content`, { method: 'GET' }, false);
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (_) {
    res.status(500).json({ error: 'Failed to load page' });
  }
};
