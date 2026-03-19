const { sql, ensureSchema } = require('../_db');
const { setCors, requireAdmin, norm } = require('../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM analyses ORDER BY created_at DESC LIMIT 200`;
      return res.status(200).json(rows.map(norm));
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
