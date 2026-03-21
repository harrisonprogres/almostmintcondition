const { supabaseFetch } = require('./_lib/supabase');
const { handleNewsletterPost } = require('./_lib/newsletterHandler');

module.exports = async (req, res) => {
  // Newsletter signup (pretty URLs via vercel.json rewrite → /api/posts?amc_newsletter=1)
  if (
    req.method === 'POST' &&
    req.query &&
    String(req.query.amc_newsletter || '') === '1'
  ) {
    return handleNewsletterPost(req, res);
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const response = await supabaseFetch('posts?select=*&status=eq.published&order=created_at.desc', { method: 'GET' }, false);
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (_) {
    res.status(500).json({ error: 'Failed to load posts' });
  }
};
