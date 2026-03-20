const { getSession } = require('../_lib/adminAuth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const host = (req.headers && req.headers.host) || '';
  if (host.includes('localhost')) {
    res.status(200).json({ authenticated: true, email: 'local-dev' });
    return;
  }
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.status(200).json({ authenticated: true, email: session.email });
};
