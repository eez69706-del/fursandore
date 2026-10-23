/* ============================================================
   RENDER ROOT
   ============================================================ */
function render(){
  const app = $("#app");
  if(!app) return;
  if(state.loading){
    app.innerHTML = '<div class="boot"><span class="loader"></span><span>جارٍ التحميل…</span></div>';
    return;
  }
  app.innerHTML = renderPage();
  bindPage();
}

function renderPage(){
  if(state.view === "landing") return renderLandingHTML();
  if(state.view === "tournament") return renderTournamentHTML();
  if(state.view === "manage") return renderManageHTML();
  if(state.view === "history") return renderHistoryHTML();
  if(state.view === "stats") return renderStatsHTML();
  return renderLandingHTML();
}

/* ============================================================
   LANDING
   ============================================================ */
function renderLandingHTML(){
  const hasTournament = !!state.tournament && state.tournament.rounds && state.tournament.rounds.length>0;
  const champ = state.history.length > 0 ? state.history[0].championName : null;
  const totalGoals = countGoals();
  const isAdmin = API.isAdmin();

  return `
  <div class="auth-page">
    <button class="theme-toggle" id="themeBtn" aria-label="تبديل المظهر">${state.theme==="light"?'<i class="fa-solid fa-moon"></i>':'<i class="fa-solid fa-sun"></i>'}</button>
    <div class="auth-card">
      <div class="auth-showcase">
        <div class="brand-lockup">
          <div class="brand-symbol"><i class="fa-solid fa-trophy"></i></div>
          <div>مدارس الفرسان<small>بطولة الأبطال</small></div>
        </div>
        <div class="showcase-copy">
          <div class="showcase-kicker">نظام البطولة الاحترافي</div>
          <h1>بطولة الفرسان — أبطال لا يُنسَون</h1>
          <p>فريقان، مباراة، والفائز يتأهل. سجّل النتائج، تابع الجدول، وخلّد اسم البطل في سجل الأبطال.</p>
          <div class="showcase-points">
            <div class="showcase-point"><span class="point-check"><i class="fa-solid fa-check"></i></span> نظام خروج المغلوب التلقائي</div>
            <div class="showcase-point"><span class="point-check"><i class="fa-solid fa-check"></i></span> ركلات ترجيح وتفاصيل كاملة</div>
            <div class="showcase-point"><span class="point-check"><i class="fa-solid fa-check"></i></span> متابعة مباشرة عبر WebSocket</div>
          </div>
        </div>
        <div class="showcase-bottom"><i></i> ${state.socket && state.socket.connected ? "متصل مباشر" : "جارٍ الاتصال..."}</div>
      </div>

      <div class="auth-form-side">
        <div class="auth-eyebrow">مرحباً بك</div>
        <h2>بطولة الفرسان</h2>
        <p class="auth-description">${champ ? "آخر بطل: <b>"+escapeHtml(champ)+"</b> 🏆" : "سجّل فريقك وابدأ رحلة البطولة"}</p>

        <button class="big-tournament-btn" data-nav="tournament">
          <div class="bt-icon"><i class="fa-solid fa-trophy"></i></div>
          <h3>${hasTournament ? "تابع البطولة" : "ابدأ البطولة"}</h3>
          <p>${hasTournament ? "البطولة جارية — اضغط للمتابعة" : "اضغط لبدء بطولة جديدة"}</p>
        </button>

        <button class="admin-login-btn ${isAdmin?'is-admin':''}" id="adminLoginBtn">
          <i class="fa-solid fa-${isAdmin?'user-shield':'lock'}"></i>
          ${isAdmin ? 'أنت أدمن — اضغط للخروج' : 'دخول الأدمن'}
        </button>

        <div class="auth-stats-row">
          <div class="auth-stat-mini"><b>${state.teams.length}</b><small>فريق</small></div>
          <div class="auth-stat-mini"><b>${state.history.length}</b><small>بطولة</small></div>
          <div class="auth-stat-mini"><b>${totalGoals}</b><small>هدف</small></div>
        </div>

        <p class="auth-footnote">مدارس الفرسان · بطولة الأبطال</p>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   SHELL
   ============================================================ */
function shellHTML(active, content){
  const titles = {tournament:"البطولة",manage:"إدارة الفرق",history:"سجل الأبطال",stats:"الإحصائيات"};
  const isAdmin = API.isAdmin();
  return `
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-symbol"><i class="fa-solid fa-trophy"></i></div>
        <div class="sidebar-brand-name">مدارس الفرسان<small>بطولة الأبطال</small></div>
      </div>
      <div class="sidebar-label">القائمة</div>
      <nav class="sidebar-nav">
        <button class="nav-link ${active==="landing"?"active":""}" data-nav="landing"><span class="nav-ico"><i class="fa-solid fa-house"></i></span> الرئيسية</button>
        <button class="nav-link ${active==="tournament"?"active":""}" data-nav="tournament"><span class="nav-ico"><i class="fa-solid fa-trophy"></i></span> البطولة</button>
        <button class="nav-link ${active==="manage"?"active":""}" data-nav="manage"><span class="nav-ico"><i class="fa-solid fa-sliders"></i></span> إدارة الفرق</button>
        <button class="nav-link ${active==="history"?"active":""}" data-nav="history"><span class="nav-ico"><i class="fa-solid fa-crown"></i></span> سجل الأبطال</button>
        <button class="nav-link ${active==="stats"?"active":""}" data-nav="stats"><span class="nav-ico"><i class="fa-solid fa-chart-line"></i></span> الإحصائيات</button>
      </nav>
      <div class="sidebar-spacer"></div>
      <div class="sidebar-help"><b>💡 نصيحة</b><span>${isAdmin ? "أنت أدمن — يمكنك تعديل كل شيء." : "سجّل دخول الأدمن للتعديل."}</span></div>
      <div class="side-user">
        <div class="avatar">${isAdmin?'👑':'ف'}</div>
        <div class="side-user-meta"><b>${isAdmin?'أدمن البطولة':'مشاهد'}</b><small>مدارس الفرسان</small></div>
      </div>
    </aside>
    <div class="workspace">
      <div class="topbar">
        <div class="page-heading">
          <h1>${titles[active]||"الرئيسية"}</h1>
          <p>مدارس الفرسان · بطولة الأبطال</p>
        </div>
        <div class="topbar-clock" id="topbarClock"><i class="fa-regular fa-clock"></i><span>—</span></div>
        <div class="topbar-actions">
          <button class="icon-btn" id="themeBtn" aria-label="تبديل المظهر">${state.theme==="light"?'<i class="fa-solid fa-moon"></i>':'<i class="fa-solid fa-sun"></i>'}</button>
          <button class="btn btn-quiet btn-small" data-nav="landing"><i class="fa-solid fa-house"></i> <span>الرئيسية</span></button>
        </div>
      </div>
      <div class="content">${content}</div>
    </div>
  </div>`;
}

/* ============================================================
   MANAGE
   ============================================================ */
function renderManageHTML(){
  const isAdmin = API.isAdmin();
  let content = "";

  if(!isAdmin){
    content = `
      <div class="panel" style="text-align:center;padding:50px 20px;">
        <i class="fa-solid fa-eye" style="font-size:48px;color:var(--muted);margin-bottom:14px"></i>
        <h3 style="margin:0 0 6px;font-size:18px">وضع المشاهدة فقط</h3>
        <p style="color:var(--muted);margin-bottom:20px">سجّل دخول الأدمن لتعديل الفرق وإدارة البطولة</p>
        <button class="btn btn-primary" id="adminLoginFromManage"><i class="fa-solid fa-lock"></i> دخول الأدمن</button>
      </div>`;
    return shellHTML("manage", content);
  }

  content = `
    ${state.selectedTeams.length>0?`
    <div class="bulk-actions">
      <span><b>${state.selectedTeams.length}</b> فريق محدد</span>
      <div class="flex" style="gap:6px;">
        <button class="btn btn-quiet btn-small" id="bulkDeleteBtn" style="background:rgba(255,255,255,.2);color:#fff;border:0"><i class="fa-solid fa-trash"></i> حذف المحدد</button>
        <button class="btn btn-quiet btn-small" id="bulkCancelBtn" style="background:rgba(255,255,255,.2);color:#fff;border:0"><i class="fa-solid fa-xmark"></i> إلغاء</button>
      </div>
    </div>`:""}

    <div class="panel">
      <div class="panel-head">
        <div><h2 class="panel-title"><i class="fa-solid fa-users"></i> إدارة الفرق</h2><p class="panel-subtitle">أضف أو عدّل أو احذف الفرق. الحد الأدنى للبطولة فريقان.</p></div>
        <div class="flex" style="gap:8px;">
          <button class="btn btn-quiet btn-small" id="importBtn"><i class="fa-solid fa-upload"></i> استيراد</button>
          <button class="btn btn-quiet btn-small" id="exportBtn"><i class="fa-solid fa-download"></i> تصدير</button>
        </div>
      </div>
      <div class="add-team-form">
        <div class="field" style="margin:0;">
          <label>اسم الفريق الجديد</label>
          <input id="newTeamName" type="text" placeholder="مثال: 1/6 أو فريق الصقور" maxlength="40">
        </div>
        <button class="btn btn-primary" id="addTeamBtn"><i class="fa-solid fa-plus"></i> إضافة</button>
      </div>
      <div class="mt-2" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input id="searchTeams" type="text" placeholder="ابحث عن فريق..." value="${escapeHtml(state.search)}"></div>
        <button class="btn btn-quiet btn-small" id="selectAllBtn"><i class="fa-solid fa-check-double"></i> تحديد الكل</button>
      </div>
      <div class="teams-grid" id="teamsGrid"></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><h2 class="panel-title"><i class="fa-solid fa-wand-magic-sparkles"></i> توليد البطولة</h2><p class="panel-subtitle">خروج المغلوب تلقائي.</p></div>
      </div>
      <div class="flex flex-wrap" style="gap:9px;">
        <button class="btn btn-success" id="genTourBtn"><i class="fa-solid fa-trophy"></i> توليد بطولة جديدة</button>
        <button class="btn btn-quiet" id="shuffleBtn"><i class="fa-solid fa-shuffle"></i> خلط عشوائي</button>
        ${state.tournament?'<button class="btn btn-danger" id="clearTourBtn"><i class="fa-solid fa-trash"></i> حذف البطولة</button>':""}
      </div>
    </div>
    <input type="file" id="importFile" accept="application/json" style="display:none">
  `;
  return shellHTML("manage", content);
}

/* ============================================================
   TOURNAMENT
   ============================================================ */
function renderTournamentHTML(){
  const tr = state.tournament;
  if(!tr || !tr.rounds || tr.rounds.length===0){
    const content = `
      <div class="panel">
        <div class="empty-state">
          <span class="empty-ico"><i class="fa-solid fa-trophy"></i></span>
          <p>لا توجد بطولة بعد.</p>
          ${API.isAdmin() ? '<button class="btn btn-primary mt-2" data-nav="manage"><i class="fa-solid fa-sliders"></i> إدارة الفرق</button>' : ''}
        </div>
      </div>`;
    return shellHTML("tournament", content);
  }
  const totalMatches = tr.rounds.reduce((s,r)=>s+r.length,0);
  const played = tr.rounds.reduce((s,r)=>s+r.filter(m=>m.winner).length,0);
  const totalGoals = countGoals();
  const progress = totalMatches ? Math.round((played/totalMatches)*100) : 0;

  const content = `
    <div class="metric-grid">
      <div class="metric-card"><div class="metric-top"><div class="metric-label">الفرق</div><div class="metric-icon blue"><i class="fa-solid fa-users"></i></div></div><div class="metric-value">${state.teams.length}</div></div>
      <div class="metric-card"><div class="metric-top"><div class="metric-label">الأدوار</div><div class="metric-icon purple"><i class="fa-solid fa-sitemap"></i></div></div><div class="metric-value">${tr.rounds.length}</div></div>
      <div class="metric-card"><div class="metric-top"><div class="metric-label">المباريات</div><div class="metric-icon mint"><i class="fa-solid fa-futbol"></i></div></div><div class="metric-value">${played}<span style="font-size:14px;color:var(--muted)">/${totalMatches}</span></div></div>
      <div class="metric-card"><div class="metric-top"><div class="metric-label">الأهداف</div><div class="metric-icon amber"><i class="fa-solid fa-bullseye"></i></div></div><div class="metric-value">${totalGoals}</div></div>
    </div>

    <div class="panel" style="padding:16px 20px;">
      <div class="flex" style="justify-content:space-between;">
        <b style="font-size:13px;">تقدم البطولة</b>
        <b style="font-size:13px;color:var(--blue);">${progress}%</b>
      </div>
      <div style="height:10px;background:var(--paper);border-radius:10px;overflow:hidden;margin-top:10px;">
        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#5e7cff,#8b6aff);border-radius:10px;transition:width .6s;"></div>
      </div>
    </div>

    ${tr.champion?renderChampionBanner(tr):""}

    <div class="panel">
      <div class="panel-head">
        <div><h2 class="panel-title"><i class="fa-solid fa-sitemap"></i> جدول البطولة</h2><p class="panel-subtitle">الفرق موزعة على جهتين والنهائي في المنتصف.</p></div>
        <div class="flex" style="gap:6px;">
          <button class="btn btn-quiet btn-small" id="shareBtn"><i class="fa-solid fa-share-nodes"></i> مشاركة</button>
          <button class="btn btn-quiet btn-small" id="printBtn"><i class="fa-solid fa-print"></i> طباعة</button>
          ${API.isAdmin()?'<button class="btn btn-danger btn-small" id="resetTourBtn"><i class="fa-solid fa-arrows-rotate"></i> إعادة</button>':''}
        </div>
      </div>
      <div class="bracket-outer"><div id="bracketContainer"></div></div>
    </div>`;
  return shellHTML("tournament", content);
}

function renderChampionBanner(tr){
  const stats = computeTeamStats();
  const topScorer = Object.values(stats).sort((a,b)=>b.goals-a.goals)[0];
  const bestDefense = Object.values(stats).filter(t=>t.matches>0).sort((a,b)=>a.goalsAgainst-b.goalsAgainst)[0];
  const confetti = Array.from({length:14}).map((_,i)=>{
    const left = Math.random()*100;
    const delay = Math.random()*3;
    const color = ["#e8b64c","#5e7cff","#12c48b","#8b6aff","#ef4b5e"][i%5];
    return `<div class="confetti" style="left:${left}%;animation-delay:${delay}s;background:${color}"></div>`;
  }).join("");
  return `
    <div class="champion-banner">
      ${confetti}
      <div style="font-size:80px;margin-bottom:14px;position:relative;z-index:1;animation:float 3s ease-in-out infinite;filter:drop-shadow(0 18px 34px rgba(232,182,76,.55))">🏆</div>
      <h2>${escapeHtml(tr.champion.name)}</h2>
      <p>بطل البطولة · ${fmtDate(tr.champion.date||Date.now())}</p>
      <div class="champion-awards">
        ${topScorer && topScorer.goals>0 ? `<div class="award-card"><div class="award-ico">⚽</div><b>${escapeHtml(topScorer.name)}</b><small>الهداف (${topScorer.goals} أهداف)</small></div>`:""}
        ${bestDefense ? `<div class="award-card"><div class="award-ico">🛡️</div><b>${escapeHtml(bestDefense.name)}</b><small>أفضل دفاع (${bestDefense.goalsAgainst} ضد)</small></div>`:""}
        <div class="award-card"><div class="award-ico">🎯</div><b>${countGoals()}</b><small>إجمالي الأهداف</small></div>
      </div>
    </div>`;
}

/* ============================================================
   BRACKET
   ============================================================ */
function renderBracket(){
  const container = $("#bracketContainer");
  if(!container) return;
  const tr = state.tournament;
  if(!tr) return;

  const totalRounds = tr.rounds.length;
  const nonFinalRounds = totalRounds - 1;
  const rightSideRounds = Math.ceil(nonFinalRounds / 2);

  const rightRounds = [];
  const leftRounds = [];
  for(let i=0;i<rightSideRounds;i++) rightRounds.push(i);
  for(let i=rightSideRounds;i<nonFinalRounds;i++) leftRounds.push(i);

  const rightHTML = `
    <div class="bracket-side right">
      ${rightRounds.map(ri => renderRoundColumn(tr, ri, true)).join("")}
    </div>`;

  const leftHTML = `
    <div class="bracket-side left">
      ${leftRounds.slice().reverse().map(ri => renderRoundColumn(tr, ri, false)).join("")}
    </div>`;

  const finalIndex = totalRounds - 1;
  const finalMatch = tr.rounds[finalIndex] ? tr.rounds[finalIndex][0] : null;
  const finalHTML = `
    <div class="champion-center">
      <div class="round-title round-center">🏆 النهائي</div>
      ${finalMatch ? renderMatchCard(finalMatch, finalIndex, 0, true) : ""}
      ${tr.champion ? `
        <div style="text-align:center;margin-top:14px;padding:16px;background:linear-gradient(135deg,var(--gold-soft),var(--amber-soft));border-radius:14px;border:1.5px solid var(--gold);min-width:220px;">
          <div style="font-size:40px;line-height:1">🏆</div>
          <b style="display:block;font-size:15px;margin-top:6px;color:var(--ink)">${escapeHtml(tr.champion.name)}</b>
          <small style="color:var(--muted);font-size:10.5px;font-weight:700">البطل</small>
        </div>` : `
        <div style="text-align:center;padding:14px;color:var(--muted);font-size:11.5px;font-weight:700;">
          <i class="fa-solid fa-hourglass-half"></i> بانتظار البطل
        </div>`}
    </div>`;

  container.innerHTML = `
    <div class="bracket-two-sides">
      ${rightHTML}
      ${finalHTML}
      ${leftHTML}
    </div>`;

  container.querySelectorAll("[data-match]").forEach(card => {
    card.onclick = function(){
      const [ri, mi] = card.dataset.match.split("-").map(Number);
      openScoreModal(ri, mi);
    };
  });
}

function renderRoundColumn(tr, roundIndex, isRight){
  const round = tr.rounds[roundIndex];
  const totalRounds = tr.rounds.length;
  const fromEnd = totalRounds - roundIndex;
  let title = "الدور الأول";
  let cls = "round-1";
  if(fromEnd === 2) { title = "نصف النهائي"; cls = "round-2"; }
  else if(fromEnd === 3) { title = "ربع النهائي"; cls = "round-3"; }
  else if(fromEnd === 1) { title = "النهائي"; cls = "round-final"; }
  else { title = "دور الـ " + Math.pow(2, fromEnd); cls = "round-1"; }

  return `
    <div class="round">
      <div class="round-title ${cls}">${title}</div>
      ${round.map((m, mi) => renderMatchCard(m, roundIndex, mi, false)).join("")}
    </div>`;
}

function renderMatchCard(m, ri, mi, isFinal){
  const a = m.a, b = m.b;
  const aWin = m.winner && a && m.winner === a.id;
  const bWin = m.winner && b && m.winner === b.id;
  const teamA = a ? teamById(a.id) : null;
  const teamB = b ? teamById(b.id) : null;
  const isLive = a && b && !m.winner;
  const finalClass = isFinal ? "final" : "";
  const liveClass = isLive ? "live" : "";
  const motmTeam = m.motm ? teamById(m.motm.teamId) : null;
  const motmHTML = motmTeam ? `<span class="mi-motm" title="أفضل لاعب">⭐ ${escapeHtml(motmTeam.name)}</span>` : "";

  return `
    <div class="match ${finalClass} ${liveClass}" data-match="${ri}-${mi}" style="cursor:pointer">
      ${isFinal ? '<span class="match-badge final-badge">🏆 النهائي</span>' : ""}
      <div class="match-team ${aWin?"winner":""} ${(m.winner&&!aWin)?"loser":""}">
        <div class="mt-left">
          <div class="mt-avatar" style="background:${teamColor(teamA)}">${a ? (teamEmoji(teamA) || a.name.charAt(0)) : "?"}</div>
          <div class="mt-name">${a ? escapeHtml(a.name) : '<span class="mt-empty">بانتظار الفائز</span>'}</div>
        </div>
        <div class="mt-score">${m.scoreA!=null?m.scoreA:"-"}</div>
      </div>
      <div class="match-team ${bWin?"winner":""} ${(m.winner&&!bWin)?"loser":""}">
        <div class="mt-left">
          <div class="mt-avatar" style="background:${teamColor(teamB)}">${b ? (teamEmoji(teamB) || b.name.charAt(0)) : "?"}</div>
          <div class="mt-name">${b ? escapeHtml(b.name) : '<span class="mt-empty">بانتظار الفائز</span>'}</div>
        </div>
        <div class="mt-score">${m.scoreB!=null?m.scoreB:"-"}</div>
      </div>
      ${m.date ? `
        <div class="match-info">
          <span class="mi-date"><i class="fa-regular fa-clock"></i> ${fmtTime(m.date)}</span>
          ${motmHTML}
        </div>` : ""}
    </div>`;
}

/* ============================================================
   HISTORY
   ============================================================ */
function renderHistoryHTML(){
  const h = state.history;
  let list = "";
  if(h.length===0){
    list = `<div class="empty-state"><span class="empty-ico"><i class="fa-solid fa-crown"></i></span><p>لم تُكمل أي بطولة بعد.</p></div>`;
  } else {
    list = '<div class="history-list">' + h.map((item, i) => `
      <div class="history-item" data-history="${i}">
        <div class="history-icon">${i===0?'👑':'🏆'}</div>
        <div class="history-body">
          <b>${escapeHtml(item.championName)}</b>
          <small>${item.teamsCount} فريق · ${item.rounds} دور · ${item.totalGoals||0} هدف</small>
        </div>
        <div class="history-date">${fmtDate(item.date)}</div>
      </div>`).join("") + '</div>';
  }
  const content = `
    <div class="panel">
      <div class="panel-head">
        <div><h2 class="panel-title"><i class="fa-solid fa-crown"></i> سجل الأبطال (${h.length})</h2><p class="panel-subtitle">اضغط أي بطولة لعرض تفاصيلها.</p></div>
        ${API.isAdmin() && h.length>0 ? '<button class="btn btn-danger btn-small" id="clearHistoryBtn"><i class="fa-solid fa-trash"></i> مسح السجل</button>' : ""}
      </div>
      ${list}
    </div>`;
  return shellHTML("history", content);
}

/* ============================================================
   STATS
   ============================================================ */
function renderStatsHTML(){
  const teamStats = computeTeamStats();
  const sorted = Object.values(teamStats).sort((a,b)=>b.wins-a.wins || b.goals-a.goals);

  const topScorer = [...sorted].sort((a,b)=>b.goals-a.goals)[0];
  const bestDefense = [...sorted].filter(t=>t.matches>0).sort((a,b)=>a.goalsAgainst-b.goalsAgainst)[0];
  const mostWins = [...sorted].sort((a,b)=>b.wins-a.wins)[0];
  const worstTeam = [...sorted].filter(t=>t.matches>0).sort((a,b)=>a.wins-b.wins)[0];

  const highlightsHTML = `
    <div class="stats-grid" style="margin-bottom:18px;">
      ${topScorer && topScorer.goals>0 ? `<div class="stat-highlight sh-gold"><div class="sh-icon"><i class="fa-solid fa-bullseye"></i></div><div><b>${escapeHtml(topScorer.name)}</b><small>الهداف · ${topScorer.goals} هدف</small></div></div>`:""}
      ${bestDefense ? `<div class="stat-highlight sh-mint"><div class="sh-icon"><i class="fa-solid fa-shield-halved"></i></div><div><b>${escapeHtml(bestDefense.name)}</b><small>أفضل دفاع · ${bestDefense.goalsAgainst} ضد</small></div></div>`:""}
      ${mostWins && mostWins.wins>0 ? `<div class="stat-highlight sh-blue"><div class="sh-icon"><i class="fa-solid fa-trophy"></i></div><div><b>${escapeHtml(mostWins.name)}</b><small>الأكثر فوزاً · ${mostWins.wins} فوز</small></div></div>`:""}
    </div>`;

  let topList = "";
  if(sorted.length===0){
    topList = `<div class="empty-state"><span class="empty-ico"><i class="fa-solid fa-chart-line"></i></span><p>لا توجد بيانات بعد.</p></div>`;
  } else {
    topList = '<div class="leaderboard">' + sorted.map((t,i)=>{
      const cls = i===0?"top1":i===1?"top2":i===2?"top3":"";
      const medals = ["🥇","🥈","🥉"];
      return `<div class="lb-row ${cls}">
        <div class="lb-rank">${i<3?medals[i]:i+1}</div>
        <div class="lb-team">
          <div class="lb-avatar" style="background:${t.color}">${escapeHtml(t.name.charAt(0))}</div>
          <div class="lb-name">${escapeHtml(t.name)}</div>
        </div>
        <div class="lb-val win">${t.wins}<small>فوز</small></div>
        <div class="lb-val">${t.goals}<small>هدف</small></div>
        <div class="lb-val">${t.matches}<small>مباراة</small></div>
      </div>`;
    }).join("") + '</div>';
  }

  const topGoals = [...sorted].sort((a,b)=>b.goals-a.goals).slice(0,5);
  const maxGoals = topGoals[0]?.goals || 1;
  const barsHTML = topGoals.length > 0 && topGoals[0].goals>0 ? topGoals.map(t=>`
    <div class="bar-item">
      <div class="bar-label">${escapeHtml(t.name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(t.goals/maxGoals)*100}%"></div></div>
      <div class="bar-value">${t.goals}</div>
    </div>`).join("") : '<p class="empty-state">لا توجد بيانات</p>';

  const topWins = [...sorted].sort((a,b)=>b.wins-a.wins).slice(0,5);
  const maxWins = topWins[0]?.wins || 1;
  const winsBarsHTML = topWins.length > 0 && topWins[0].wins>0 ? topWins.map(t=>`
    <div class="bar-item">
      <div class="bar-label">${escapeHtml(t.name)}</div>
      <div class="bar-track"><div class="bar-fill mint" style="width:${(t.wins/maxWins)*100}%"></div></div>
      <div class="bar-value">${t.wins}</div>
    </div>`).join("") : '<p class="empty-state">لا توجد بيانات</p>';

  const h2hHTML = state.teams.length >= 2 ? `
    <div class="panel">
      <div class="panel-head">
        <div><h2 class="panel-title"><i class="fa-solid fa-code-compare"></i> مواجهة مباشرة</h2><p class="panel-subtitle">قارن فريقين.</p></div>
      </div>
      <div class="flex" style="gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <select id="h2hTeamA" class="input" style="flex:1;min-width:140px">
          ${state.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")}
        </select>
        <span style="font-weight:900;color:var(--blue)">VS</span>
        <select id="h2hTeamB" class="input" style="flex:1;min-width:140px">
          ${state.teams.map((t,i) => `<option value="${t.id}" ${i===1?"selected":""}>${escapeHtml(t.name)}</option>`).join("")}
        </select>
        <button class="btn btn-primary btn-small" id="compareBtn"><i class="fa-solid fa-code-compare"></i> قارن</button>
      </div>
      <div id="h2hResult"></div>
    </div>` : "";

  const content = `
    ${highlightsHTML}
    <div class="panel">
      <div class="panel-head"><div><h2 class="panel-title"><i class="fa-solid fa-ranking-star"></i> ترتيب الفرق</h2><p class="panel-subtitle">مرتب حسب الفوز ثم الأهداف.</p></div></div>
      ${topList}
    </div>
    <div class="panel">
      <div class="panel-head"><div><h2 class="panel-title"><i class="fa-solid fa-bullseye"></i> أكثر الفرق تسجيلاً</h2><p class="panel-subtitle">أعلى 5 فرق.</p></div></div>
      <div class="bar-list">${barsHTML}</div>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h2 class="panel-title"><i class="fa-solid fa-trophy"></i> الأكثر فوزاً</h2><p class="panel-subtitle">أعلى 5 فرق.</p></div></div>
      <div class="bar-list">${winsBarsHTML}</div>
    </div>
    ${h2hHTML}`;
  return shellHTML("stats", content);
}