const { sql, ensureSchema } = require('../_db');
const { setCors, requireAuth, norm } = require('../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureSchema();
    const [analyses, reports, notifications, totalA, harmfulA, totalR, openR] = await Promise.all([
      sql`SELECT * FROM analyses WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 10`,
      sql`SELECT * FROM reports WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 10`,
      sql`SELECT * FROM notifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 20`,
      sql`SELECT COUNT(*) as c FROM analyses WHERE user_id = ${user.id}`,
      sql`SELECT COUNT(*) as c FROM analyses WHERE user_id = ${user.id} AND verdict NOT IN ('safe','low_risk')`,
      sql`SELECT COUNT(*) as c FROM reports WHERE user_id = ${user.id}`,
      sql`SELECT COUNT(*) as c FROM reports WHERE user_id = ${user.id} AND status = 'open'`,
    ]);
    return res.status(200).json({
      analyses:      analyses.rows.map(norm),
      reports:       reports.rows.map(norm),
      notifications: notifications.rows.map(norm),
      stats: {
        totalAnalyses:   parseInt(totalA.rows[0].c),
        harmfulDetected: parseInt(harmfulA.rows[0].c),
        reportsField:    parseInt(totalR.rows[0].c),
        openReports:     parseInt(openR.rows[0].c),
      }
    });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
