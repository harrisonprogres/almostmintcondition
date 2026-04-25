const { supabaseFetch } = require('./_lib/supabase');
const { handleNewsletterPost } = require('./_lib/newsletterHandler');
const { getSession } = require('./_lib/adminAuth');
const SITE_ORIGIN = (process.env.SITE_URL || 'https://www.almostmintcondition.com').replace(/\/$/, '');
const POST_LIST_SELECT = 'id,tag,title,author,date_published,read_time,excerpt,category,emoji,header_img,status';
// Keep body columns out of list payloads for performance; detail fetches can read full row.

function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseInline(line) {
  const escaped = esc(line);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function parseBody(rawBody) {
  if (!rawBody) return '';
  const lines = String(rawBody).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('## ')) return `<h2>${parseInline(line.slice(3))}</h2>`;
      if (line.startsWith('### ')) return `<h3>${parseInline(line.slice(4))}</h3>`;
      if (line.startsWith('> ')) return `<blockquote>${parseInline(line.slice(2))}</blockquote>`;
      if (line === '---') return '<hr>';
      if (line.startsWith('[IMG:') && line.endsWith(']')) {
        const src = line.slice(5, -1).trim();
        if (!src) return '';
        return `<img class="inline-art-img" src="${esc(src)}" alt="Article image" loading="lazy" decoding="async">`;
      }
      return `<p>${parseInline(line)}</p>`;
    })
    .join('');
}

function formatDate(dateValue) {
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

function pickPostBody(post) {
  if (!post || typeof post !== 'object') return '';
  return post.raw_body || post.content || post.body || '';
}

async function incrementPostViewCount(post) {
  if (!post || !post.id) return;
  // Best-effort counter update; article delivery should never fail because of analytics.
  const nextCount = Math.max(0, Number(post.view_count) || 0) + 1;
  try {
    await supabaseFetch(
      `posts?id=eq.${encodeURIComponent(post.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ view_count: nextCount })
      },
      true
    );
  } catch (_) {
    // ignore view count failures
  }
}

function shouldCountView(req) {
  // Allow an explicit opt-out flag for manual QA/testing sessions.
  if (req && req.query && String(req.query.amc_skip_view || '') === '1') {
    return false;
  }
  // Exclude authenticated admin sessions so your own testing clicks do not inflate counts.
  return !getSession(req);
}

module.exports = async (req, res) => {
  // Newsletter signup (pretty URLs via vercel.json rewrite → /api/posts?amc_newsletter=1)
  if (
    req.method === 'POST' &&
    req.query &&
    String(req.query.amc_newsletter || '') === '1'
  ) {
    return handleNewsletterPost(req, res);
  }
  // Legacy SSR article endpoint safeguard:
  // if old links/caches still hit /api/posts?amc_article=1&slug=...,
  // force them to canonical SPA route to avoid rendering the stripped fallback layout.
  if (
    req.method === 'GET' &&
    req.query &&
    String(req.query.amc_article || '') === '1'
  ) {
    const slug = String(req.query.slug || '').trim().toLowerCase();
    const destination = slug ? `/article/${slug}` : '/';
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(307, destination);
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const id = req.query && req.query.id ? String(req.query.id).trim() : '';
  if (id) {
    try {
      const response = await supabaseFetch(
        // Select full row for detail endpoint to keep article body compatible across schema versions.
        `posts?id=eq.${encodeURIComponent(id)}&status=eq.published&select=*&limit=1`,
        { method: 'GET' },
        false
      );
      const text = await response.text();
      if (response.ok && shouldCountView(req)) {
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data) && data[0]) {
            await incrementPostViewCount(data[0]);
          }
        } catch (_) {
          // ignore JSON parse/count failures, response passthrough remains intact
        }
      }
      res.setHeader('Content-Type', 'application/json');
      // Avoid caching detail fetches so SPA article opens can increment views consistently.
      res.setHeader('Cache-Control', 'no-store');
      res.status(response.status).send(text);
      return;
    } catch (_) {
      res.status(500).json({ error: 'Failed to load post detail' });
      return;
    }
  }
  try {
    const response = await supabaseFetch(
      `posts?select=${POST_LIST_SELECT}&status=eq.published&order=created_at.desc`,
      { method: 'GET' },
      false
    );
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(response.status).send(text);
  } catch (_) {
    res.status(500).json({ error: 'Failed to load posts' });
  }
};
