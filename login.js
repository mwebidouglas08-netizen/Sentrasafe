const bcrypt = require('bcryptjs');
const { sql, ensureSchema } = require('../_db');
const { setCors, signToken, norm } = require('../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureSchema();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = rows[0];
    if (!user) return res.status(400).json({ error: 'No account found with that email' });
    if (!bcrypt.compareSync(password, user.password))
      return res.status(400).json({ error: 'Incorrect password' });
    if (user.status === 'suspended')
      return res.status(403).json({ error: 'Account suspended. Contact support.' });

    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
    const token = signToken({ id: user.id, role: user.role });
    const { password: _, ...safe } = user;
    return res.status(200).json({ token, user: norm(safe) });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
