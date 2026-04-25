const { requireAdmin } = require('../_lib/adminAuth');
const { supabaseFetch } = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const withViewsPath = 'posts?select=id,tag,title,author,date_published,read_time,excerpt,category,emoji,header_img,raw_body,status,view_count&order=created_at.desc';
      const withoutViewsPath = 'posts?select=id,tag,title,author,date_published,read_time,excerpt,category,emoji,header_img,raw_body,status&order=created_at.desc';

      let response = await supabaseFetch(
        withViewsPath,
        { method: 'GET' },
        true
      );
      let text = await response.text();

      if (!response.ok) {
        try {
          const err = JSON.parse(text);
          if (err && err.code === '42703') {
            response = await supabaseFetch(
              withoutViewsPath,
              { method: 'GET' },
              true
            );
            text = await response.text();
          }
        } catch (_) {
          // keep original response
        }
      }

      if (response.ok) {
        try {
          const rows = JSON.parse(text);
          if (Array.isArray(rows)) {
            rows.forEach((row) => {
              if (typeof row.view_count !== 'number') row.view_count = 0;
            });
            res.status(200).json(rows);
            return;
          }
        } catch (_) {
          // fallback to passthrough below
        }
      }

      res.status(response.status).send(text);
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const response = await supabaseFetch('posts?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
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
    const response = await supabaseFetch(`posts?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (_) {
    res.status(500).json({ error: 'Failed to update posts' });
  }
};
