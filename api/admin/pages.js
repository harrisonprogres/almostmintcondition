const { requireAdmin } = require('../_lib/adminAuth');
const { supabaseFetch } = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  const id = (req.query && req.query.id) ? String(req.query.id) : '';
  if (!id) {
    res.status(400).json({ error: 'Missing id query param' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const response = await supabaseFetch(`pages?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(body)
    }, true);
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (_) {
    res.status(500).json({ error: 'Failed to save page' });
  }
};
