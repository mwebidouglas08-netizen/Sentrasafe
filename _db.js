const { sql } = require('@vercel/postgres');

// Run schema migrations — idempotent, safe to call on every request
async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT DEFAULT 'user',
      status      TEXT DEFAULT 'active',
      avatar      TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      last_login  TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS analyses (
      id              TEXT PRIMARY KEY,
      user_id         TEXT,
      content         TEXT NOT NULL,
      verdict         TEXT NOT NULL,
      scores          JSONB,
      summary         TEXT,
      flags           JSONB,
      recommendation  TEXT,
      should_report   BOOLEAN DEFAULT FALSE,
      report_to       TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id            TEXT PRIMARY KEY,
      user_id       TEXT,
      incident_type TEXT NOT NULL,
      platform      TEXT NOT NULL,
      description   TEXT NOT NULL,
      evidence      TEXT,
      status        TEXT DEFAULT 'open',
      priority      TEXT DEFAULT 'medium',
      ai_guidance   TEXT,
      ref_number    TEXT UNIQUE,
      anonymous     BOOLEAN DEFAULT FALSE,
      notes         TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      message    TEXT NOT NULL,
      type       TEXT DEFAULT 'info',
      read       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS resources (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      category    TEXT,
      icon        TEXT,
      featured    BOOLEAN DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Seed admin if not exists
  const { rows } = await sql`SELECT id FROM users WHERE role='admin' LIMIT 1`;
  if (!rows.length) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    await sql`
      INSERT INTO users (id, name, email, password, role, status)
      VALUES (
        ${uuidv4()},
        'Admin',
        'admin@sentrasafe.com',
        ${bcrypt.hashSync('Admin@2024', 10)},
        'admin',
        'active'
      )
      ON CONFLICT (email) DO NOTHING
    `;
  }

  // Seed resources if not exists
  const { rows: resRows } = await sql`SELECT COUNT(*) as c FROM resources`;
  if (resRows[0].c === '0') {
    const { v4: uuidv4 } = require('uuid');
    const resources = [
      { title: 'Crisis Text Line', desc: 'Text HOME to 741741 for free 24/7 crisis support', cat: 'emergency', icon: '🆘', featured: true },
      { title: 'Cyber Civil Rights Initiative', desc: 'Support for victims of non-consensual intimate images and online harassment', cat: 'harassment', icon: '🛡️', featured: true },
      { title: 'StopBullying.gov', desc: 'Official resource for cyberbullying prevention and response', cat: 'bullying', icon: '📋', featured: false },
      { title: 'PolitiFact Fact Checker', desc: 'Verify claims and identify misinformation before sharing', cat: 'misinformation', icon: '🔍', featured: false },
      { title: 'Anti-Defamation League', desc: 'Resources for victims of hate speech and discrimination', cat: 'hate_speech', icon: '💙', featured: true },
      { title: 'Mental Health Support', desc: 'Online harassment causes real trauma. BetterHelp and Talkspace offer online therapy', cat: 'mental_health', icon: '🧠', featured: true },
      { title: 'Electronic Frontier Foundation', desc: 'Digital rights, legal resources and guides for online safety', cat: 'legal', icon: '🌐', featured: false },
      { title: 'National Domestic Violence Hotline', desc: 'Call 1-800-799-7233 if online harassment extends to physical threats', cat: 'emergency', icon: '📞', featured: false },
    ];
    for (const r of resources) {
      await sql`
        INSERT INTO resources (id, title, description, category, icon, featured)
        VALUES (${uuidv4()}, ${r.title}, ${r.desc}, ${r.cat}, ${r.icon}, ${r.featured})
        ON CONFLICT DO NOTHING
      `;
    }
  }
}

module.exports = { sql, ensureSchema };
