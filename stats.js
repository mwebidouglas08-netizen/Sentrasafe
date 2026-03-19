const { sql, ensureSchema } = require('../_db');
const { setCors, requireAdmin, norm } = require('../_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    await ensureSchema();
    const today = new Date().toISOString().split('T')[0];

    const [users, analyses, totalR, openR, critical, verdict, reports, newUsers] = await Promise.all([
      sql`SELECT COUNT(*) as c FROM users WHERE role != 'admin'`,
      sql`SELECT COUNT(*) as c FROM analyses`,
      sql`SELECT COUNT(*) as c FROM reports`,
      sql`SELECT COUNT(*) as c FROM reports WHERE status = 'open'`,
      sql`SELECT COUNT(*) as c FROM analyses WHERE verdict = 'critical' AND created_at >= ${today}`,
      sql`SELECT verdict, COUNT(*) as c FROM analyses GROUP BY verdict`,
      sql`SELECT * FROM reports ORDER BY created_at DESC LIMIT 10`,
      sql`SELECT id, name, email, role, status, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC LIMIT 10`,
    ]);

    return res.status(200).json({
      totalUsers:       parseInt(users.rows[0].c),
      totalAnalyses:    parseInt(analyses.rows[0].c),
      totalReports:     parseInt(totalR.rows[0].c),
      openReports:      parseInt(openR.rows[0].c),
      criticalToday:    parseInt(critical.rows[0].c),
      verdictBreakdown: verdict.rows,
      recentReports:    reports.rows.map(norm),
      recentUsers:      newUsers.rows.map(norm),
    });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
