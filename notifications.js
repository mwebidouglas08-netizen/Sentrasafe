const { sql, ensureSchema } = require('../_db');
const { setCors, requireAuth } = require('../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureSchema();
    await sql`UPDATE notifications SET read = TRUE WHERE user_id = ${user.id}`;
    return res.status(200).json({ success: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
