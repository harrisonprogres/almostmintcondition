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
  // Exclude authenticated admin sessions so your own dashboard testing doesn't inflate stats.
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
  // Server-rendered article HTML via rewrite: /article/:slug -> /api/posts?amc_article=1&slug=:slug
  if (
    req.method === 'GET' &&
    req.query &&
    String(req.query.amc_article || '') === '1'
  ) {
    const slug = String(req.query.slug || '').trim().toLowerCase();
    if (!slug) {
      res.status(400).send('Missing article slug');
      return;
    }
    let posts = [];
    try {
      const response = await supabaseFetch(
        `posts?select=${POST_LIST_SELECT}&status=eq.published&order=created_at.desc`,
        { method: 'GET' },
        false
      );
      const text = await response.text();
      const data = JSON.parse(text);
      if (response.ok && Array.isArray(data)) posts = data;
    } catch (_) {
      res.status(500).send('Could not load article');
      return;
    }
    const normalizedTarget = normalizeSlug(slug);
    const postSummary =
      posts.find((p) => slugify(p.title) === slug) ||
      posts.find((p) => normalizeSlug(slugify(p.title)) === normalizedTarget);
    if (!postSummary) {
      res.status(404).send('Article not found');
      return;
    }
    let post = null;
    try {
      const detailResponse = await supabaseFetch(
        // Select full row for detail requests so we can support legacy/new body field names.
        `posts?id=eq.${encodeURIComponent(postSummary.id)}&select=*&limit=1`,
        { method: 'GET' },
        false
      );
      const detailText = await detailResponse.text();
      const detailData = JSON.parse(detailText);
      if (detailResponse.ok && Array.isArray(detailData) && detailData[0]) {
        post = detailData[0];
      }
    } catch (_) {
      post = null;
    }
    if (!post) {
      res.status(404).send('Article not found');
      return;
    }
    if (shouldCountView(req)) {
      await incrementPostViewCount(post);
    }
    const canonical = `${SITE_ORIGIN}/article/${slug}`;
    const title = `${post.title} — Almost Mint Condition`;
    const description = post.excerpt || 'Market analysis, collector education, and Pokemon card spotlights.';
    const publishedIso = formatDate(post.date_published);
    const modifiedIso = formatDate(post.updated_at || post.date_published);
    const bodyHtml = parseBody(pickPostBody(post));
    const related = posts
      .filter((p) => p.id !== post.id)
      .slice(0, 6)
      .map((p) => {
        const href = `/article/${slugify(p.title)}`;
        return `<li><a href="${href}">${esc(p.title)}</a></li>`;
      })
      .join('');
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description,
      mainEntityOfPage: canonical,
      author: { '@type': 'Organization', name: 'Almost Mint Condition' },
      publisher: { '@type': 'Organization', name: 'Almost Mint Condition' },
      ...(post.header_img ? { image: [post.header_img] } : {}),
      ...(publishedIso ? { datePublished: publishedIso } : {}),
      ...(modifiedIso ? { dateModified: modifiedIso } : {})
    };
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:site_name" content="Almost Mint Condition">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  ${post.header_img ? `<meta property="og:image" content="${esc(post.header_img)}">` : ''}
  <meta name="twitter:card" content="${post.header_img ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  ${post.header_img ? `<meta name="twitter:image" content="${esc(post.header_img)}">` : ''}
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>
    :root{--bg:#F7F4EE;--ink:#1C1917;--card:#FFFFFF;--red:#D04A2A;--muted:#78716C;--border:#E2DDD6;}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,sans-serif;line-height:1.75}
    .wrap{max-width:900px;margin:0 auto;padding:34px 22px 64px}
    .home-link{display:inline-block;margin-bottom:22px;color:var(--muted);text-decoration:none;font-size:14px}
    .home-link:hover{color:var(--red)}
    .pill{font-size:11px;color:var(--red);letter-spacing:1.1px;text-transform:uppercase;margin-bottom:10px}
    h1{font-size:40px;line-height:1.15;margin:0 0 12px}
    .meta{font-size:14px;color:var(--muted);padding:12px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-bottom:22px}
    .hero{width:100%;border-radius:10px;margin:8px 0 28px;background:#eee}
    .body p{margin:0 0 1.2em}
    .body h2{margin:1.8em 0 .65em;font-size:28px}
    .body h3{margin:1.5em 0 .5em;font-size:16px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}
    .body blockquote{border-left:3px solid var(--red);padding-left:14px;margin:1.4em 0;font-style:italic;color:var(--muted)}
    .body hr{border:none;border-top:1px solid var(--border);margin:1.7em 0}
    .inline-art-img{display:block;max-width:100%;height:auto;margin:1em auto;border-radius:8px}
    .related{margin-top:44px;padding-top:22px;border-top:1px solid var(--border)}
    .related h2{font-size:22px;margin:0 0 10px}
    .related ul{margin:0;padding-left:18px}
    .related li{margin:6px 0}
    .related a{color:var(--red);text-decoration:none}
    .related a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <main class="wrap">
    <a class="home-link" href="/">← Back to Almost Mint Condition</a>
    <div class="pill">${esc(post.tag || 'Article')}</div>
    <h1>${esc(post.title)}</h1>
    <div class="meta">${esc(post.author || 'AMC Staff')} · ${esc(post.date_published || '')} · ${esc(post.read_time || '')}</div>
    ${post.header_img ? `<img class="hero" src="${esc(post.header_img)}" alt="${esc(post.title)} image" fetchpriority="high">` : ''}
    <article class="body">${bodyHtml}</article>
    <section class="related" aria-label="Related articles">
      <h2>Read next</h2>
      <ul>${related}</ul>
    </section>
  </main>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.status(200).send(html);
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
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
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
