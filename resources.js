const { sql, ensureSchema } = require('./_db');
const { setCors } = require('./_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureSchema();
    const { category } = req.query;
    const { rows } = category
      ? await sql`SELECT * FROM resources WHERE category = ${category} ORDER BY featured DESC, title ASC`
      : await sql`SELECT * FROM resources ORDER BY featured DESC, title ASC`;
    return res.status(200).json(rows);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
