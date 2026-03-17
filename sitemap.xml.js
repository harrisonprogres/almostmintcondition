const SUPABASE_URL = 'https://ieccsyjiuugisdegiele.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ttGwvqGFtCWKuTFyP2SvjQ_SfzAesGs';

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

module.exports = async (req, res) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=title,date_published&status=eq.published&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const posts = await response.json();

    const urls = posts.map(p => {
      const date = p.date_published || new Date().toISOString().split('T')[0];
      return `  <url>
    <loc>https://www.almostmintcondition.com/article/${slugify(p.title)}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.almostmintcondition.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).send(sitemap);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
};
