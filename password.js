const bcrypt = require('bcryptjs');
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
    const { currentPassword, newPassword } = req.body;
    const { rows } = await sql`SELECT password FROM users WHERE id = ${user.id}`;
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    if (!bcrypt.compareSync(currentPassword, rows[0].password)) return res.status(400).json({ error: 'Current password incorrect' });
    if ((newPassword || '').length < 8) return res.status(400).json({ error: 'New password must be 8+ characters' });
    await sql`UPDATE users SET password = ${bcrypt.hashSync(newPassword, 10)} WHERE id = ${user.id}`;
    return res.status(200).json({ success: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
