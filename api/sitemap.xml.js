const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatDate(dateStr) {
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch(e) {
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      res.status(500).send('Missing Supabase configuration');
      return;
    }
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
      const date = formatDate(p.date_published);
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
