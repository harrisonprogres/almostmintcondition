const { supabaseFetch } = require('./supabase');

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

async function handleNewsletterPost(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
  }

  const email = String((body && body.email) || '')
    .trim()
    .toLowerCase();

  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, error: 'Enter a valid email.' });
    return;
  }

  try {
    const response = await supabaseFetch(
      'newsletter_subscribers',
      {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ email })
      },
      true
    );

    const text = await response.text();

    if (response.ok) {
      res.status(200).json({ ok: true, message: "You're on the list!" });
      return;
    }

    if (
      response.status === 409 ||
      /duplicate|unique|23505/i.test(text)
    ) {
      res.status(200).json({
        ok: true,
        message: "You're already subscribed — thanks for sticking with us!"
      });
      return;
    }

    if (
      response.status === 404 ||
      /could not find the table|relation .* does not exist|PGRST205/i.test(text)
    ) {
      res.status(503).json({
        ok: false,
        error: 'Newsletter is not set up yet. Check back soon.'
      });
      return;
    }

    res.status(500).json({ ok: false, error: 'Could not save. Try again later.' });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : 'Server error'
    });
  }
}

module.exports = { handleNewsletterPost };
