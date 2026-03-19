const axios = require('axios');
const { setCors, verifyToken } = require('../_helpers');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    if (!ANTHROPIC_KEY) {
      return res.status(200).json({
        reply: "I'm here to help. If you're experiencing online harassment, document everything, block the person, and report to the platform. For immediate crisis support, text HOME to 741741 (Crisis Text Line). You are not alone and help is available."
      });
    }

    const messages = [
      ...(history || []).slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const r = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: 'You are SentraSafe AI, a compassionate support assistant helping victims of online harassment, cyberbullying, and misinformation. Be warm, practical, and empowering. Provide specific actionable advice. Keep responses concise (under 150 words). Never minimize harassment severity. Always include safety resources when appropriate.',
      messages
    }, {
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
    });

    return res.status(200).json({ reply: r.data.content?.[0]?.text || "I'm here to help. Please describe what you're experiencing." });
  } catch(e) {
    console.error(e);
    return res.status(200).json({ reply: "I'm here to support you. For immediate crisis help, text HOME to 741741." });
  }
};
