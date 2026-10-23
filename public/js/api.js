/* ============================================================
   API CLIENT
   ============================================================ */
const API = {
  base: '',
  adminPass: sessionStorage.getItem('adminPass') || '',
  async req(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (this.adminPass) headers['x-admin-pass'] = this.adminPass;
    const r = await fetch(this.base + path, { ...opts, headers });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || 'خطأ في الاتصال');
    }
    return r.json();
  },
  get: (p) => API.req(p),
  post: (p, b) => API.req(p, { method: 'POST', body: JSON.stringify(b) }),
  put: (p, b) => API.req(p, { method: 'PUT', body: JSON.stringify(b) }),
  del: (p) => API.req(p, { method: 'DELETE' }),
  isAdmin() { return !!this.adminPass; },
  login(pass) { this.adminPass = pass; sessionStorage.setItem('adminPass', pass); },
  logout() { this.adminPass = ''; sessionStorage.removeItem('adminPass'); }
};

/* ============================================================
   STATE
   ============================================================ */
const state = {
  teams: [],
  tournament: null,
  history: [],
  view: 'landing',
  theme: localStorage.getItem('t_theme') || 'light',
  search: '',
  selectedTeams: [],
  clockInterval: null,
  socket: null,
  loading: true
};
document.documentElement.setAttribute('data-theme', state.theme);

const COLORS = ["#5e7cff","#12c48b","#ef4b5e","#8b6aff","#f5a623","#0a9e6e","#d6870d","#4f6ef7","#9c4dd4","#2fb8c4","#e8654a","#586076","#c9358b","#0b8fb5","#a05e1e","#5d7a8c","#7e57c2","#26a69a","#ef5350","#ffa726"];
const EMOJIS = ["⚽","🦅","🦁","🐆","🦈","🐺","🐉","🦂","🐯","🦊","⭐","🔥","⚡","🌟","💫","🏆","🥇","🎯","🚀","👑"];

/* ============================================================
   HELPERS
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const el = (t,h,c) => { const e=document.createElement(t); if(h!==undefined)e.innerHTML=h; if(c)e.className=c; return e; };
const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4);
const escapeHtml = s => String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate = ts => new Date(ts).toLocaleDateString("ar-SA",{day:"numeric",month:"long",year:"numeric"});
const fmtTime = ts => new Date(ts).toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
const now = () => Date.now();

function teamById(id){ return state.teams.find(t=>t.id===id); }
function teamColor(team){ return team ? (team.color || "#5e7cff") : "#8890a4"; }
function teamEmoji(team){ return team && team.emoji ? team.emoji : null; }

/* ============================================================
   LOAD FROM SERVER
   ============================================================ */
async function loadAll(){
  try {
    const [teams, tournament, history] = await Promise.all([
      API.get('/api/teams'),
      API.get('/api/tournament'),
      API.get('/api/history')
    ]);
    state.teams = teams;
    state.tournament = tournament;
    state.history = history;
    state.loading = false;
    render();
  } catch(e){
    console.error(e);
    toast('فشل الاتصال بالسيرفر', 'error');
    state.loading = false;
    render();
  }
}

/* ============================================================
   SOCKET.IO
   ============================================================ */
function initSocket(){
  if(typeof io === 'undefined') return;
  state.socket = io();
  state.socket.on('connect', () => console.log('⚡ متصل بالسيرفر'));
  state.socket.on('full:reload', (data) => {
    state.teams = data.teams || [];
    state.tournament = data.tournament || null;
    state.history = data.history || [];
    state.loading = false;
    render();
  });
  state.socket.on('teams:update', (teams) => { state.teams = teams; render(); });
  state.socket.on('tournament:update', (tr) => {
    state.tournament = tr;
    render();
    flashLive();
  });
  state.socket.on('history:update', (h) => { state.history = h; render(); });
}

function flashLive(){
  const badge = document.getElementById('liveBadge');
  if(!badge) return;
  badge.style.display = 'flex';
  clearTimeout(badge._t);
  badge._t = setTimeout(() => badge.style.display = 'none', 3000);
}

/* ============================================================
   API CALLS
   ============================================================ */
async function apiAddTeam(name, color, emoji){
  try {
    const team = await API.post('/api/teams', { name, color, emoji });
    toast('تمت الإضافة', 'success');
    return team;
  } catch(e){ toast(e.message, 'error'); return null; }
}

async function apiUpdateTeam(id, data){
  try {
    await API.put('/api/teams/' + id, data);
    toast('تم التعديل', 'success');
    return true;
  } catch(e){ toast(e.message, 'error'); return false; }
}

async function apiDeleteTeam(id){
  try {
    await API.del('/api/teams/' + id);
    toast('تم الحذف', 'success');
    return true;
  } catch(e){ toast(e.message, 'error'); return false; }
}

async function apiBulkDelete(ids){
  try {
    await API.post('/api/teams/bulk-delete', { ids });
    toast('تم الحذف', 'success');
    return true;
  } catch(e){ toast(e.message, 'error'); return false; }
}

async function apiGenerateTournament(order){
  try {
    await API.post('/api/tournament/generate', { order });
    toast('تم توليد البطولة', 'success');
    return true;
  } catch(e){ toast(e.message, 'error'); return false; }
}

async function apiSaveScore(roundIndex, matchIndex, payload){
  try {
    await API.post('/api/tournament/score', { roundIndex, matchIndex, ...payload });
    toast('تم الحفظ', 'success');
    return true;
  } catch(e){ toast(e.message, 'error'); return false; }
}

async function apiResetTournament(){
  try {
    await API.post('/api/tournament/reset', {});
    toast('تم الحذف', 'success');
    return true;
  } catch(e){ toast(e.message, 'error'); return false; }
}

async function apiClearHistory(){
  try {
    await API.del('/api/history');
    toast('تم المسح', 'success');
    return true;
  } catch(e){ toast(e.message, 'error'); return false; }
}

/* ============================================================
   COMPUTE STATS
   ============================================================ */
function computeTeamStats(){
  const stats = {};
  state.teams.forEach(t => {
    stats[t.id] = { id:t.id, name:t.name, color:teamColor(t), wins:0, losses:0, goals:0, goalsAgainst:0, matches:0 };
  });
  const tr = state.tournament;
  if(tr && tr.rounds){
    tr.rounds.forEach(round => round.forEach(m => {
      if(m.winner && m.a && m.b){
        if(stats[m.a.id]){
          stats[m.a.id].matches++;
          stats[m.a.id].goals += (m.scoreA||0);
          stats[m.a.id].goalsAgainst += (m.scoreB||0);
        }
        if(stats[m.b.id]){
          stats[m.b.id].matches++;
          stats[m.b.id].goals += (m.scoreB||0);
          stats[m.b.id].goalsAgainst += (m.scoreA||0);
        }
        const loserId = m.winner === m.a.id ? m.b.id : m.a.id;
        if(stats[m.winner]) stats[m.winner].wins++;
        if(stats[loserId]) stats[loserId].losses++;
      }
    }));
  }
  return stats;
}

function countGoals(){
  const tr = state.tournament;
  if(!tr) return 0;
  let total = 0;
  tr.rounds.forEach(r => r.forEach(m => { total += (m.scoreA||0) + (m.scoreB||0); }));
  return total;
}