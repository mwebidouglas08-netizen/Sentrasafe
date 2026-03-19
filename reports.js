const { sql, ensureSchema } = require('./_db');
const { setCors, requireAuth, verifyToken, getAIGuidance, genRef, uuidv4, norm } = require('./_helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureSchema();

    if (req.method === 'POST') {
      const { incidentType, platform, description, evidence, anonymous } = req.body;
      if (!incidentType || !platform || !description)
        return res.status(400).json({ error: 'Required fields missing' });

      const authUser = verifyToken(req);
      const id      = uuidv4();
      const refNum  = genRef();
      const guidance = await getAIGuidance(incidentType, platform, description);
      const userId   = anonymous ? null : (authUser?.id || null);

      await sql`
        INSERT INTO reports (id, user_id, incident_type, platform, description, evidence,
                             status, priority, ai_guidance, ref_number, anonymous)
        VALUES (${id}, ${userId}, ${incidentType}, ${platform}, ${description},
                ${evidence || null}, 'open', 'medium', ${guidance}, ${refNum}, ${anonymous || false})
      `;

      if (userId && !anonymous) {
        await sql`
          INSERT INTO notifications (id, user_id, message, type)
          VALUES (${uuidv4()}, ${userId},
                  ${`📋 Report ${refNum} filed successfully. We review within 24-48 hours.`},
                  'success')
        `;
      }

      return res.status(200).json({ id, refNumber: refNum, guidance, status: 'open' });
    }

    if (req.method === 'GET') {
      const user = requireAuth(req, res);
      if (!user) return;
      const { rows } = await sql`
        SELECT * FROM reports WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 50
      `;
      return res.status(200).json(rows.map(norm));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
