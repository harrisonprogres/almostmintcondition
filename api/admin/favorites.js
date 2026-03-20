const { requireAdmin } = require('../_lib/adminAuth');
const { supabaseFetch } = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (!['POST', 'DELETE'].includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const response = await supabaseFetch('favorites', {
        method: 'POST',
        body: JSON.stringify(body)
      }, true);
      const text = await response.text();
      res.status(response.status).send(text);
      return;
    }

    const id = (req.query && req.query.id) ? String(req.query.id) : '';
    if (!id) {
      res.status(400).json({ error: 'Missing id query param' });
      return;
    }
    const response = await supabaseFetch(`favorites?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (_) {
    res.status(500).json({ error: 'Failed to update favorites' });
  }
};
