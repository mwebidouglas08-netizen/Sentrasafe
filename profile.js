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
    const { name, avatar } = req.body;
    if (name) await sql`UPDATE users SET name = ${name} WHERE id = ${user.id}`;
    if (avatar) await sql`UPDATE users SET avatar = ${avatar} WHERE id = ${user.id}`;
    return res.status(200).json({ success: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
