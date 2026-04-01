const { supabaseFetch } = require('./_lib/supabase');

const SITE_ORIGIN =
  (process.env.SITE_URL || 'https://www.almostmintcondition.com').replace(
    /\/$/,
    ''
  );

function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch (_) {
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  let posts = [];

  try {
    const response = await supabaseFetch(
      'posts?select=title,date_published&status=eq.published&order=created_at.desc',
      { method: 'GET' },
      true
    );
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = null;
    }

    if (response.ok && Array.isArray(data)) {
      posts = data;
    }
    // If Supabase errors, still emit a valid sitemap with static URLs only
  } catch (_) {
    posts = [];
  }

  const today = new Date().toISOString().split('T')[0];

  const articleUrls = posts
    .filter(function (p) {
      return p && p.title;
    })
    .map(function (p) {
      const date = formatDate(p.date_published);
      const slug = slugify(p.title);
      if (!slug) return '';
      return `  <url>
    <loc>${SITE_ORIGIN}/article/${slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .filter(Boolean)
    .join('\n');

  const staticUrls = [
    `  <url>
    <loc>${SITE_ORIGIN}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
    `  <url>
    <loc>${SITE_ORIGIN}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
    `  <url>
    <loc>${SITE_ORIGIN}/favorites</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`,
    `  <url>
    <loc>${SITE_ORIGIN}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`,
    `  <url>
    <loc>${SITE_ORIGIN}/undervalued-picks</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
  ].join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${articleUrls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(sitemap);
};
