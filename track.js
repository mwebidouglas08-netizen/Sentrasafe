const { sql, ensureSchema } = require('../../_db');
const { setCors, norm } = require('../../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureSchema();
    const ref = (req.query.ref || '').toUpperCase();
    if (!ref) return res.status(400).json({ error: 'Reference number required' });

    const { rows } = await sql`
      SELECT id, ref_number, incident_type, platform, status, priority, created_at, updated_at
      FROM reports WHERE ref_number = ${ref}
    `;
    if (!rows.length) return res.status(404).json({ error: 'Report not found' });
    return res.status(200).json(norm(rows[0]));
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
