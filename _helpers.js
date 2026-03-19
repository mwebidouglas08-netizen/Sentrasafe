const jwt  = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET     = process.env.JWT_SECRET     || 'sentrasafe_secret_2026';
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY || '';

// ── CORS headers ──────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// ── Auth helpers ──────────────────────────────────────────────
function verifyToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = verifyToken(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return null;
  }
  return user;
}

// ── AI Analysis ───────────────────────────────────────────────
async function analyzeWithAI(content, type = 'auto') {
  const prompt = `You are SentraSafe AI, a content moderation system. Analyze this content for online harms.

Content type hint: ${type}
Content: "${content.substring(0, 2000)}"

Respond ONLY in this exact JSON format (no markdown, no text outside JSON):
{
  "overall_verdict": "safe|low_risk|medium_risk|high_risk|critical",
  "confidence": 0-100,
  "summary": "2-3 sentences describing what was found",
  "categories": {
    "harassment": 0-100,
    "misinformation": 0-100,
    "hate_speech": 0-100,
    "threats": 0-100,
    "manipulation": 0-100
  },
  "flags": ["specific concern 1", "specific concern 2"],
  "recommendation": "specific actionable advice",
  "should_report": true|false,
  "report_to": "platform or authority if should_report is true",
  "counter_narrative": "factual counter if misinformation, otherwise null"
}`;

  if (!ANTHROPIC_KEY) return getDemoAnalysis(content);

  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  }, { headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } });

  const raw = res.data.content?.[0]?.text || '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function getDemoAnalysis(content) {
  const hasThreats  = /kill|hurt|attack|find you|know where|scare|regret|stab/i.test(content);
  const hasBullying = /worthless|hate you|ugly|stupid|loser|pathetic|nobody likes/i.test(content);
  const hasMisinfo  = /proven|cover.?up|5g|microchip|share before deleted|they don.t want you/i.test(content);
  const hasHate     = /inferior|go back|they are all|hate.*people/i.test(content);

  if (hasThreats)  return { overall_verdict:'critical',  confidence:92, summary:'Threatening language and direct threats of harm detected. Immediate action recommended.', categories:{harassment:85,misinformation:10,hate_speech:45,threats:95,manipulation:60}, flags:['Direct threats','Potential physical danger','Targeted harassment'], recommendation:'Document immediately, report to platform and consider contacting law enforcement.', should_report:true,  report_to:'Platform and law enforcement', counter_narrative:null };
  if (hasBullying) return { overall_verdict:'high_risk',  confidence:87, summary:'Clear cyberbullying patterns including personal attacks and degrading language.', categories:{harassment:88,misinformation:5,hate_speech:30,threats:20,manipulation:45}, flags:['Personal attacks','Degrading language'], recommendation:'Block the sender, report to platform, and document all instances.', should_report:true,  report_to:'Platform safety team', counter_narrative:null };
  if (hasMisinfo)  return { overall_verdict:'medium_risk',confidence:78, summary:'Misinformation patterns including unverified claims designed to spread virally.', categories:{harassment:5,misinformation:85,hate_speech:10,threats:5,manipulation:75}, flags:['Unverified claims','Viral spread tactics'], recommendation:'Do not share. Check PolitiFact or Snopes to verify claims.', should_report:true,  report_to:'Platform misinformation team', counter_narrative:'Consult WHO, CDC or reputable scientific organizations for verified information.' };
  if (hasHate)     return { overall_verdict:'high_risk',  confidence:85, summary:'Hate speech patterns targeting a group based on identity.', categories:{harassment:60,misinformation:15,hate_speech:90,threats:25,manipulation:40}, flags:['Group targeting','Discriminatory language'], recommendation:'Report to platform immediately. Document with screenshots.', should_report:true,  report_to:'Platform trust and safety', counter_narrative:null };
  return { overall_verdict:'safe', confidence:94, summary:'No significant harmful content detected. Content appears civil and appropriate.', categories:{harassment:5,misinformation:3,hate_speech:2,threats:1,manipulation:8}, flags:[], recommendation:'Content appears safe.', should_report:false, report_to:null, counter_narrative:null };
}

async function getAIGuidance(type, platform, description) {
  if (!ANTHROPIC_KEY) {
    return `Your report has been received. Next steps:\n\n1. Document all evidence — screenshots with timestamps and URLs.\n2. Report directly to ${platform} using their built-in reporting tools.\n3. Block the harasser to prevent further contact.\n4. Tell a trusted person about the situation.\n5. If you feel physically threatened, contact local law enforcement immediately.\n\nReference number will be assigned. We review all reports within 24-48 hours.`;
  }
  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: `You are SentraSafe AI support. Victim reporting: ${type} on ${platform}. Description: "${description.substring(0,500)}". Provide warm, practical next steps (5 numbered steps max). Include ${platform}-specific reporting steps. Under 200 words. Plain text.` }]
  }, { headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } });
  return res.data.content?.[0]?.text || '';
}

const genRef = () => 'SS-' + Math.random().toString(36).substring(2, 8).toUpperCase();

// ── snake_case → camelCase row normalizer ─────────────────────
// Postgres returns snake_case columns; the frontend expects camelCase.
// Call norm(row) on every row before sending to client.
function norm(row) {
  if (!row) return row;
  const map = {
    user_id:       'userId',
    created_at:    'createdAt',
    updated_at:    'updatedAt',
    last_login:    'lastLogin',
    incident_type: 'incidentType',
    ref_number:    'refNumber',
    ai_guidance:   'aiGuidance',
    should_report: 'shouldReport',
    report_to:     'reportTo',
    resolved_at:   'resolvedAt',
  };
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = map[k] || k;
    // parse JSONB columns that come back as objects or strings
    if ((key === 'scores' || key === 'flags') && typeof v === 'string') {
      try { out[key] = JSON.parse(v); } catch { out[key] = v; }
    } else {
      out[key] = v;
    }
  }
  return out;
}

module.exports = { setCors, verifyToken, signToken, requireAuth, requireAdmin, analyzeWithAI, getDemoAnalysis, getAIGuidance, genRef, uuidv4, norm };
