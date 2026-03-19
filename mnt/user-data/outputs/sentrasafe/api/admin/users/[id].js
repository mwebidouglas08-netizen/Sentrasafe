const { sql, ensureSchema } = require('../../_db');
const { setCors, requireAdmin } = require('../../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.query;

  try {
    await ensureSchema();

    if (req.method === 'PUT') {
      const { status } = req.body;
      await sql`UPDATE users SET status = ${status} WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
