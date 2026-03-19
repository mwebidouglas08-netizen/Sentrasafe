const { sql, ensureSchema } = require('../_db');
const { setCors, requireAuth, norm } = require('../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT id, name, email, role, status, avatar, created_at, last_login
      FROM users WHERE id = ${user.id}
    `;
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    return res.status(200).json(norm(rows[0]));
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
