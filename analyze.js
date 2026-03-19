const { sql, ensureSchema } = require('./_db');
const { setCors, verifyToken, analyzeWithAI, uuidv4 } = require('./_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureSchema();
    const { content, type } = req.body;
    if (!content || content.trim().length < 3) return res.status(400).json({ error: 'Content too short to analyze' });

    const authUser = verifyToken(req); // optional auth
    const result = await analyzeWithAI(content, type || 'auto');
    const id = uuidv4();

    await sql`
      INSERT INTO analyses (id, user_id, content, verdict, scores, summary, flags, recommendation, should_report, report_to)
      VALUES (
        ${id},
        ${authUser?.id || null},
        ${content.substring(0, 1000)},
        ${result.overall_verdict},
        ${JSON.stringify(result.categories || {})},
        ${result.summary},
        ${JSON.stringify(result.flags || [])},
        ${result.recommendation},
        ${result.should_report || false},
        ${result.report_to || null}
      )
    `;

    if (authUser?.id && result.overall_verdict === 'critical') {
      await sql`
        INSERT INTO notifications (id, user_id, message, type)
        VALUES (${uuidv4()}, ${authUser.id}, ${'⚠️ Critical content detected in your recent analysis. Please review and take action.'}, 'danger')
      `;
    }

    return res.status(200).json({ id, ...result });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
