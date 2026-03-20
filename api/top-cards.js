const { supabaseFetch } = require('./_lib/supabase');

function isMissingTopCardsTable(status, bodyText) {
  if (status === 404) return true;
  const t = String(bodyText || '');
  return /could not find the table|relation .* does not exist|schema cache|PGRST205/i.test(t);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Server-side only: use service role so reads work even if anon RLS
    // wasn't set up for `top_cards` (ticker is public data anyway).
    const response = await supabaseFetch(
      'top_cards?select=*&order=rank.asc&limit=7',
      { method: 'GET' },
      true
    );
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');

    if (!response.ok) {
      if (isMissingTopCardsTable(response.status, text)) {
        res.status(200).json([]);
        return;
      }
      res.status(response.status).send(text);
      return;
    }

    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to load top cards',
      detail: err && err.message ? err.message : String(err)
    });
  }
};
