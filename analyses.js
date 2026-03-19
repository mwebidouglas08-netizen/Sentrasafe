const { sql, ensureSchema } = require('./_db');
const { setCors, requireAuth, norm } = require('./_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT * FROM analyses WHERE user_id = ${user.id}
      ORDER BY created_at DESC LIMIT 50
    `;
    return res.status(200).json(rows.map(norm));
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
