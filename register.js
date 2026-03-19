const bcrypt = require('bcryptjs');
const { sql, ensureSchema } = require('../_db');
const { setCors, signToken, uuidv4, norm } = require('../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureSchema();
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be 8+ characters' });

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.rows.length) return res.status(400).json({ error: 'Email already registered' });

    const id = uuidv4();
    await sql`
      INSERT INTO users (id, name, email, password, role, status)
      VALUES (${id}, ${name}, ${email}, ${bcrypt.hashSync(password, 10)}, 'user', 'active')
    `;

    // Welcome notification
    await sql`
      INSERT INTO notifications (id, user_id, message, type)
      VALUES (${uuidv4()}, ${id},
              '👋 Welcome to SentraSafe! Start by analyzing content or filing a report.',
              'success')
    `;

    const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
    const { password: _, ...safe } = rows[0];
    const token = signToken({ id, role: 'user' });
    return res.status(200).json({ token, user: norm(safe) });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
