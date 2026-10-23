const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { nanoid } = require('nanoid');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ============ AUTH MIDDLEWARE ============ */
function isAdmin(req, res, next) {
  const pass = req.headers['x-admin-pass'] || req.query.pass;
  if (pass === db.getSetting('adminPassword')) return next();
  res.status(401).json({ error: 'غير مصرح' });
}

/* ============ HEALTH ============ */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

/* ============ SETTINGS ============ */
app.get('/api/settings', (req, res) => {
  const s = db.get().settings || {};
  res.json({
    schoolName: s.schoolName,
    tournamentName: s.tournamentName
  });
});

app.post('/api/settings', isAdmin, (req, res) => {
  const { schoolName, tournamentName, adminPassword } = req.body;
  if (schoolName) db.setSetting('schoolName', schoolName);
  if (tournamentName) db.setSetting('tournamentName', tournamentName);
  if (adminPassword) db.setSetting('adminPassword', adminPassword);
  res.json({ ok: true });
});

/* ============ TEAMS ============ */
app.get('/api/teams', (req, res) => {
  res.json(db.get().teams);
});

app.post('/api/teams', isAdmin, (req, res) => {
  const { name, color, emoji } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'اسم مطلوب' });
  const teams = db.get().teams;
  if (teams.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'الاسم موجود' });
  }
  const team = {
    id: nanoid(10),
    name: name.trim(),
    color: color || '#5e7cff',
    emoji: emoji || '⚽',
    createdAt: Date.now()
  };
  teams.push(team);
  db.save();
  io.emit('teams:update', teams);
  res.status(201).json(team);
});

app.put('/api/teams/:id', isAdmin, (req, res) => {
  const teams = db.get().teams;
  const idx = teams.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'غير موجود' });
  teams[idx] = { ...teams[idx], ...req.body, id: teams[idx].id };
  db.save();
  io.emit('teams:update', teams);
  res.json(teams[idx]);
});

app.delete('/api/teams/:id', isAdmin, (req, res) => {
  const teams = db.get().teams;
  const filtered = teams.filter(t => t.id !== req.params.id);
  db.set({ teams: filtered });
  io.emit('teams:update', filtered);
  res.json({ ok: true });
});

app.post('/api/teams/bulk-delete', isAdmin, (req, res) => {
  const { ids } = req.body;
  const filtered = db.get().teams.filter(t => !ids.includes(t.id));
  db.set({ teams: filtered });
  io.emit('teams:update', filtered);
  res.json({ ok: true });
});

/* ============ TOURNAMENT ============ */
app.get('/api/tournament', (req, res) => {
  res.json(db.get().tournament);
});

app.post('/api/tournament/generate', isAdmin, (req, res) => {
  const { order } = req.body; // مصفوفة IDs
  const teams = db.get().teams;
  if (teams.length < 2) return res.status(400).json({ error: 'تحتاج فريقين على الأقل' });

  const ordered = (order || teams.map(t => t.id))
    .map(id => teams.find(t => t.id === id))
    .filter(Boolean);

  let n = 1;
  while (n < ordered.length) n *= 2;
  const padded = [...ordered];
  while (padded.length < n) padded.push(null);

  const rounds = [];
  const r1 = [];
  for (let i = 0; i < padded.length; i += 2) {
    r1.push({
      id: nanoid(10),
      a: padded[i] ? { id: padded[i].id, name: padded[i].name } : null,
      b: padded[i + 1] ? { id: padded[i + 1].id, name: padded[i + 1].name } : null,
      scoreA: null, scoreB: null, penA: null, penB: null,
      winner: null, date: null, motm: null
    });
  }
  rounds.push(r1);
  let count = r1.length;
  while (count > 1) {
    count = Math.ceil(count / 2);
    const r = [];
    for (let i = 0; i < count; i++) {
      r.push({
        id: nanoid(10), a: null, b: null,
        scoreA: null, scoreB: null, penA: null, penB: null,
        winner: null, date: null, motm: null
      });
    }
    rounds.push(r);
  }

  const tournament = {
    id: nanoid(10),
    rounds,
    champion: null,
    createdAt: Date.now()
  };

  db.set({ tournament });
  autoAdvanceByes(tournament);
  db.save();
  io.emit('tournament:update', tournament);
  res.json(tournament);
});

app.post('/api/tournament/score', isAdmin, (req, res) => {
  const { roundIndex, matchIndex, scoreA, scoreB, penA, penB, motm } = req.body;
  const tournament = db.get().tournament;
  if (!tournament) return res.status(404).json({ error: 'لا توجد بطولة' });

  const match = tournament.rounds[roundIndex]?.[matchIndex];
  if (!match || !match.a || !match.b) {
    return res.status(400).json({ error: 'مباراة غير صالحة' });
  }

  let winnerId;
  if (scoreA > scoreB) winnerId = match.a.id;
  else if (scoreB > scoreA) winnerId = match.b.id;
  else {
    if (penA == null || penB == null || penA === penB) {
      return res.status(400).json({ error: 'تعادل! أدخل ركلات ترجيح' });
    }
    winnerId = penA > penB ? match.a.id : match.b.id;
  }

  const oldWinner = match.winner;
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.penA = penA ?? null;
  match.penB = penB ?? null;
  match.winner = winnerId;
  match.motm = motm ? { teamId: motm } : null;
  match.date = match.date || Date.now();

  if (oldWinner && oldWinner !== winnerId) resetDownstream(tournament, roundIndex, matchIndex);

  advanceWinner(tournament, roundIndex, matchIndex, winnerId);
  autoAdvanceByes(tournament);

  db.save();
  io.emit('tournament:update', tournament);
  res.json(tournament);
});

app.post('/api/tournament/reset', isAdmin, (req, res) => {
  db.set({ tournament: null });
  io.emit('tournament:update', null);
  res.json({ ok: true });
});

/* ============ HISTORY ============ */
app.get('/api/history', (req, res) => {
  res.json(db.get().history);
});

app.delete('/api/history', isAdmin, (req, res) => {
  db.set({ history: [] });
  io.emit('history:update', []);
  res.json({ ok: true });
});

/* ============ IMPORT/EXPORT ============ */
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="fursan-${Date.now()}.json"`);
  res.json(db.get());
});

app.post('/api/import', isAdmin, (req, res) => {
  const { teams, tournament, history } = req.body;
  if (!Array.isArray(teams)) return res.status(400).json({ error: 'ملف غير صالح' });
  db.set({
    teams,
    tournament: tournament || null,
    history: history || []
  });
  io.emit('full:reload', db.get());
  res.json({ ok: true });
});

/* ============ CORE LOGIC ============ */
function autoAdvanceByes(tournament) {
  tournament.rounds.forEach((round, ri) => {
    round.forEach((m, mi) => {
      if (m.winner) return;
      if (m.a && !m.b) {
        m.winner = m.a.id;
        m.scoreA = 0; m.scoreB = 0;
        advanceWinner(tournament, ri, mi, m.a.id);
      } else if (!m.a && m.b) {
        m.winner = m.b.id;
        m.scoreA = 0; m.scoreB = 0;
        advanceWinner(tournament, ri, mi, m.b.id);
      }
    });
  });
}

function advanceWinner(tournament, ri, mi, teamId) {
  const match = tournament.rounds[ri][mi];
  let winnerTeam = null;
  if (match.a?.id === teamId) winnerTeam = match.a;
  else if (match.b?.id === teamId) winnerTeam = match.b;
  if (!winnerTeam) return;

  const nextRound = tournament.rounds[ri + 1];
  if (!nextRound) {
    tournament.champion = { id: winnerTeam.id, name: winnerTeam.name, date: Date.now() };
    const history = db.get().history;
    const teamsCount = db.get().teams.length;
    const totalGoals = countGoals(tournament);
    history.unshift({
      championName: winnerTeam.name,
      championId: winnerTeam.id,
      teamsCount,
      rounds: tournament.rounds.length,
      totalGoals,
      date: Date.now()
    });
    db.save();
    io.emit('history:update', history);
    return;
  }

  const nextMi = Math.floor(mi / 2);
  const nm = nextRound[nextMi];
  if (mi % 2 === 0) nm.a = { id: winnerTeam.id, name: winnerTeam.name };
  else nm.b = { id: winnerTeam.id, name: winnerTeam.name };
}

function resetDownstream(tournament, ri, mi) {
  for (let r = ri + 1; r < tournament.rounds.length; r++) {
    tournament.rounds[r].forEach(mm => {
      mm.a = null; mm.b = null; mm.winner = null;
      mm.scoreA = null; mm.scoreB = null; mm.penA = null; mm.penB = null;
      mm.date = null; mm.motm = null;
    });
  }
  tournament.champion = null;
}

function countGoals(tournament) {
  let total = 0;
  tournament.rounds.forEach(r => r.forEach(m => {
    total += (m.scoreA || 0) + (m.scoreB || 0);
  }));
  return total;
}

/* ============ SOCKET.IO ============ */
io.on('connection', (socket) => {
  console.log('⚡ متصل:', socket.id);
  socket.emit('full:reload', db.get());

  socket.on('disconnect', () => {
    console.log('❌ فصل:', socket.id);
  });
});

/* ============ START ============ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('🏆 سيرفر بطولة الفرسان شغّال على http://localhost:' + PORT);
  console.log('🔐 كلمة سر الأدمن الافتراضية: fursan2025');
});