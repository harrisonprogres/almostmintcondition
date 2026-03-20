const { supabaseFetch } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const response = await supabaseFetch('favorites?select=*&order=sort_order.asc', { method: 'GET' }, false);
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (_) {
    res.status(500).json({ error: 'Failed to load favorites' });
  }
};
