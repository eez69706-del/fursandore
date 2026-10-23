/* ============================================================
   APP — نقطة الدخول + الأحداث
   ============================================================ */

/* ============================================================
   BIND PAGE — يربط الأحداث بعد كل render
   ============================================================ */
function bindPage(){
  const tb = $("#themeBtn");
  if(tb) tb.onclick = toggleTheme;

  const adminBtn = $("#adminLoginBtn");
  if(adminBtn) adminBtn.onclick = openAdminLogin;

  const adminFromManage = $("#adminLoginFromManage");
  if(adminFromManage) adminFromManage.onclick = openAdminLogin;

  /* Navigation */
  $$("[data-nav]").forEach(b => {
    b.onclick = async function(){
      const target = b.dataset.nav;

      if(target === "tournament" &&
         (!state.tournament || !state.tournament.rounds || state.tournament.rounds.length===0)){
        if(state.teams.length < 2){
          toast("أضف فريقين على الأقل أولاً","error");
          state.view = "manage";
          render();
          return;
        }
        if(!API.isAdmin()){
          toast("سجّل دخول الأدمن لتوليد البطولة","error");
          return;
        }
        const order = promptOrder();
        if(order === null) return;
        await apiGenerateTournament(order);
      }

      state.view = target;
      render();
    };
  });

  startClock();

  if(state.view === "manage") bindManage();
  if(state.view === "tournament") bindTournament();
  if(state.view === "history") bindHistory();
  if(state.view === "stats") bindStats();
}

/* ============================================================
   PROMPT ORDER
   ============================================================ */
function promptOrder(){
  const how = confirm("ترتيب الفرق عشوائياً؟\n\nموافق = عشوائي\nإلغاء = حسب الترتيب");
  let order = state.teams.map(t => t.id);
  if(how){
    for(let i=order.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  return order;
}

/* ============================================================
   BIND MANAGE
   ============================================================ */
function bindManage(){
  if(!API.isAdmin()) return;

  const grid = $("#teamsGrid");
  if(grid){
    const filtered = state.teams.filter(t => t.name.toLowerCase().includes(state.search.toLowerCase()));
    if(filtered.length===0){
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="empty-ico"><i class="fa-solid fa-users-slash"></i></span><p>'+(state.search?"لا توجد نتائج":"لا يوجد فرق بعد.")+'</p></div>';
    } else {
      const allStats = computeTeamStats();
      filtered.forEach(t => {
        const stats = allStats[t.id] || {wins:0, losses:0, goals:0, matches:0};
        const isSelected = state.selectedTeams.includes(t.id);
        const card = el("div","","team-card"+(isSelected?" selected":""));
        card.style.setProperty("--team-color", teamColor(t));
        card.innerHTML = `
          <div class="team-top">
            <div class="team-avatar" style="background:${teamColor(t)}">${teamEmoji(t) || escapeHtml(t.name.charAt(0))}</div>
            <div class="team-info">
              <h4>${escapeHtml(t.name)}</h4>
              <small>${stats.matches||0} مباراة</small>
            </div>
          </div>
          <div class="team-record">
            <div class="team-stat win"><b>${stats.wins||0}</b><span>فوز</span></div>
            <div class="team-stat loss"><b>${stats.losses||0}</b><span>خسارة</span></div>
            <div class="team-stat"><b>${stats.goals||0}</b><span>هدف</span></div>
          </div>
          <div class="team-actions">
            <button class="btn btn-secondary btn-small" data-edit="${t.id}"><i class="fa-solid fa-pen"></i> تعديل</button>
            <button class="btn btn-quiet btn-small" data-select="${t.id}"><i class="fa-solid fa-${isSelected?'check':'square'}"></i></button>
            <button class="btn btn-danger btn-small" data-del="${t.id}"><i class="fa-solid fa-trash"></i></button>
          </div>`;
        grid.appendChild(card);
      });

      grid.querySelectorAll("[data-edit]").forEach(b => {
        b.onclick = function(e){ e.stopPropagation(); openEditTeam(state.teams.find(x=>x.id===b.dataset.edit)); };
      });
      grid.querySelectorAll("[data-del]").forEach(b => {
        b.onclick = function(e){ e.stopPropagation(); openDeleteTeam(state.teams.find(x=>x.id===b.dataset.del)); };
      });
      grid.querySelectorAll("[data-select]").forEach(b => {
        b.onclick = function(e){
          e.stopPropagation();
          const id = b.dataset.select;
          if(state.selectedTeams.includes(id)){
            state.selectedTeams = state.selectedTeams.filter(x=>x!==id);
          } else {
            state.selectedTeams.push(id);
          }
          render();
        };
      });
    }
  }

  const search = $("#searchTeams");
  if(search) search.oninput = function(){ state.search = search.value; bindManage(); };

  const selectAll = $("#selectAllBtn");
  if(selectAll) selectAll.onclick = function(){
    state.selectedTeams = (state.selectedTeams.length === state.teams.length)
      ? []
      : state.teams.map(t => t.id);
    render();
  };

  const bulkDelete = $("#bulkDeleteBtn");
  if(bulkDelete) bulkDelete.onclick = async function(){
    if(!confirm(`حذف ${state.selectedTeams.length} فريق؟`)) return;
    await apiBulkDelete(state.selectedTeams);
    state.selectedTeams = [];
  };

  const bulkCancel = $("#bulkCancelBtn");
  if(bulkCancel) bulkCancel.onclick = function(){ state.selectedTeams = []; render(); };

  const input = $("#newTeamName");
  const addBtn = $("#addTeamBtn");
  async function doAdd(){
    const name = input.value.trim();
    if(!name){ toast("اكتب اسم الفريق","error"); return; }
    if(state.teams.some(t=>t.name.toLowerCase()===name.toLowerCase())){ toast("الاسم موجود","error"); return; }
    const color = COLORS[state.teams.length % COLORS.length];
    const emoji = EMOJIS[state.teams.length % EMOJIS.length];
    input.value = "";
    await apiAddTeam(name, color, emoji);
  }
  if(addBtn) addBtn.onclick = doAdd;
  if(input) input.addEventListener("keydown", e => { if(e.key==="Enter") doAdd(); });

  const genBtn = $("#genTourBtn");
  if(genBtn) genBtn.onclick = async function(){
    if(state.teams.length<2){ toast("تحتاج فريقين على الأقل","error"); return; }
    const order = promptOrder();
    if(order===null) return;
    const ok = await apiGenerateTournament(order);
    if(ok){ state.view = "tournament"; render(); }
  };

  const shuffleBtn = $("#shuffleBtn");
  if(shuffleBtn) shuffleBtn.onclick = function(){
    toast("الخلط صار في السيرفر عند التوليد","success");
  };

  const clearBtn = $("#clearTourBtn");
  if(clearBtn) clearBtn.onclick = async function(){
    if(!confirm("حذف البطولة الحالية؟")) return;
    await apiResetTournament();
  };

  const exportBtn = $("#exportBtn");
  if(exportBtn) exportBtn.onclick = function(){
    window.open('/api/export', '_blank');
    toast("جارٍ التصدير","success");
  };

  const importBtn = $("#importBtn");
  const importFile = $("#importFile");
  if(importBtn && importFile){
    importBtn.onclick = () => importFile.click();
    importFile.onchange = function(e){
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = async function(ev){
        try {
          const data = JSON.parse(ev.target.result);
          if(!data.teams || !Array.isArray(data.teams)) throw new Error("ملف غير صالح");
          if(!confirm("سيتم استبدال البيانات. متابعة؟")) return;
          await API.post('/api/import', data);
          toast("تم الاستيراد","success");
        } catch(err){ toast("فشل الاستيراد: "+err.message, "error"); }
      };
      reader.readAsText(file);
    };
  }
}

/* ============================================================
   BIND TOURNAMENT
   ============================================================ */
function bindTournament(){
  const tr = state.tournament;
  if(!tr) return;

  renderBracket();

  const reset = $("#resetTourBtn");
  if(reset) reset.onclick = async function(){
    if(!confirm("إعادة التوليد تحذف النتائج. متابعة؟")) return;
    const order = promptOrder();
    if(order===null) return;
    await apiGenerateTournament(order);
  };

  const printBtn = $("#printBtn");
  if(printBtn) printBtn.onclick = function(){ window.print(); };

  const shareBtn = $("#shareBtn");
  if(shareBtn) shareBtn.onclick = function(){
    const text = `🏆 بطولة الفرسان\n📊 ${state.teams.length} فريق\n⚽ ${countGoals()} هدف\n\n` +
      (state.tournament.champion ? `👑 البطل: ${state.tournament.champion.name}` : "⏳ البطولة جارية...");
    if(navigator.clipboard){
      navigator.clipboard.writeText(text)
        .then(()=>toast("تم النسخ","success"))
        .catch(()=>toast("فشل النسخ","error"));
    } else {
      prompt("انسخ النص:", text);
    }
  };
}

/* ============================================================
   BIND HISTORY
   ============================================================ */
function bindHistory(){
  const btn = $("#clearHistoryBtn");
  if(btn) btn.onclick = async function(){
    if(!confirm("مسح سجل الأبطال؟")) return;
    await apiClearHistory();
  };

  $$("[data-history]").forEach(item => {
    item.onclick = function(){
      const idx = parseInt(item.dataset.history, 10);
      const h = state.history[idx];
      if(!h) return;
      const body = el("div");
      body.innerHTML = `
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:64px;margin-bottom:10px">🏆</div>
          <h3 style="margin:0 0 6px;font-size:22px;font-weight:900">${escapeHtml(h.championName)}</h3>
          <p style="color:var(--muted);font-size:13px;margin:0">${fmtDate(h.date)}</p>
        </div>
        <div class="stats-grid">
          <div class="stat-highlight sh-blue"><div class="sh-icon"><i class="fa-solid fa-users"></i></div><div><b>${h.teamsCount}</b><small>فريق</small></div></div>
          <div class="stat-highlight sh-purple"><div class="sh-icon"><i class="fa-solid fa-sitemap"></i></div><div><b>${h.rounds}</b><small>دور</small></div></div>
          <div class="stat-highlight sh-gold"><div class="sh-icon"><i class="fa-solid fa-bullseye"></i></div><div><b>${h.totalGoals||0}</b><small>هدف</small></div></div>
        </div>`;
      openModal({title:"تفاصيل البطولة", body, actions:[{label:"إغلاق", cls:"btn-quiet", onClick:c=>c()}]});
    };
  });
}

/* ============================================================
   BIND STATS
   ============================================================ */
function bindStats(){
  const compareBtn = $("#compareBtn");
  if(compareBtn) compareBtn.onclick = function(){
    const aId = $("#h2hTeamA").value;
    const bId = $("#h2hTeamB").value;
    if(aId === bId){ toast("اختر فريقين مختلفين","error"); return; }
    const stats = computeTeamStats();
    const A = stats[aId], B = stats[bId];
    if(!A || !B) return;
    const teamA = teamById(aId), teamB = teamById(bId);
    const result = $("#h2hResult");
    if(!result) return;
    result.innerHTML = `
      <div class="h2h-grid">
        <div class="h2h-team">
          <div class="h2h-avatar" style="background:${teamColor(teamA)}">${teamEmoji(teamA) || teamA.name.charAt(0)}</div>
          <div class="h2h-name">${escapeHtml(teamA.name)}</div>
        </div>
        <div class="h2h-vs">VS</div>
        <div class="h2h-team">
          <div class="h2h-avatar" style="background:${teamColor(teamB)}">${teamEmoji(teamB) || teamB.name.charAt(0)}</div>
          <div class="h2h-name">${escapeHtml(teamB.name)}</div>
        </div>
      </div>
      <div class="h2h-stats">
        <div>
          <div class="h2h-stat-row"><span>${A.wins}</span><span style="color:var(--mint)">فوز</span></div>
          <div class="h2h-stat-row"><span>${A.goals}</span><span>هدف</span></div>
          <div class="h2h-stat-row"><span>${A.goalsAgainst}</span><span>ضد</span></div>
          <div class="h2h-stat-row"><span>${A.matches}</span><span>مباراة</span></div>
        </div>
        <div style="border-right:1px dashed var(--line);border-left:1px dashed var(--line);padding:0 14px;display:flex;align-items:center;justify-content:center;">
          <i class="fa-solid fa-code-compare" style="color:var(--blue);font-size:20px"></i>
        </div>
        <div>
          <div class="h2h-stat-row"><span style="color:var(--mint)">فوز</span><span>${B.wins}</span></div>
          <div class="h2h-stat-row"><span>هدف</span><span>${B.goals}</span></div>
          <div class="h2h-stat-row"><span>ضد</span><span>${B.goalsAgainst}</span></div>
          <div class="h2h-stat-row"><span>مباراة</span><span>${B.matches}</span></div>
        </div>
      </div>`;
  };
}

/* ============================================================
   EDIT / DELETE TEAM
   ============================================================ */
function openEditTeam(team){
  if(!team) return;
  const body = el("div");
  body.innerHTML = `
    <div class="field"><label>اسم الفريق</label><input id="editTeamName" value="${escapeHtml(team.name)}" maxlength="40"></div>
    <div class="field"><label>لون الفريق</label>
      <div class="color-row" id="colorRow">
        ${COLORS.map(c => `<div class="color-dot ${c===teamColor(team)?"active":""}" data-color="${c}" style="background:${c}"></div>`).join("")}
      </div>
    </div>
    <div class="field"><label>شعار الفريق (إيموجي)</label>
      <div class="emoji-row" id="emojiRow">
        ${EMOJIS.map(e => `<button type="button" class="emoji-btn ${e===teamEmoji(team)?"active":""}" data-emoji="${e}">${e}</button>`).join("")}
      </div>
    </div>`;
  let selectedColor = teamColor(team);
  let selectedEmoji = teamEmoji(team);
  const r = openModal({
    title:"تعديل الفريق", body,
    actions:[
      {label:'إلغاء', cls:"btn-quiet", onClick:c=>c()},
      {label:'حفظ', cls:"btn-primary", onClick:async c=>{
        const v = r.modal.querySelector("#editTeamName").value.trim();
        if(!v){ toast("اكتب اسم","error"); return; }
        if(state.teams.some(t=>t.id!==team.id && t.name.toLowerCase()===v.toLowerCase())){
          toast("الاسم موجود","error"); return;
        }
        const ok = await apiUpdateTeam(team.id, { name:v, color:selectedColor, emoji:selectedEmoji });
        if(ok) c();
      }}
    ]
  });
  r.modal.querySelectorAll("[data-color]").forEach(d => {
    d.onclick = function(){
      r.modal.querySelectorAll("[data-color]").forEach(x => x.classList.remove("active"));
      d.classList.add("active");
      selectedColor = d.dataset.color;
    };
  });
  r.modal.querySelectorAll("[data-emoji]").forEach(d => {
    d.onclick = function(){
      r.modal.querySelectorAll("[data-emoji]").forEach(x => x.classList.remove("active"));
      d.classList.add("active");
      selectedEmoji = d.dataset.emoji;
    };
  });
}

function openDeleteTeam(team){
  if(!team) return;
  const body = el("div");
  body.innerHTML = '<p>هل تريد حذف <b>'+escapeHtml(team.name)+'</b>؟ لا يمكن التراجع.</p>';
  openModal({
    title:"تأكيد الحذف", body,
    actions:[
      {label:'إلغاء', cls:"btn-quiet", onClick:c=>c()},
      {label:'حذف', cls:"btn-danger", onClick:async c=>{
        const ok = await apiDeleteTeam(team.id);
        if(ok) c();
      }}
    ]
  });
}

/* ============================================================
   SCORE MODAL
   ============================================================ */
function openScoreModal(ri, mi){
  if(!API.isAdmin()){ toast("سجّل دخول الأدمن أولاً","error"); return; }
  const tr = state.tournament;
  const m = tr.rounds[ri][mi];
  if(!m.a || !m.b){ toast("لم يتأهل الفريقان","error"); return; }
  const body = el("div");
  body.innerHTML = `
    <div class="score-inputs">
      <div><div class="team-name">${escapeHtml(m.a.name)}</div>
        <input type="number" id="scoreA" min="0" value="${m.scoreA!=null?m.scoreA:0}"></div>
      <div class="score-vs">VS</div>
      <div><div class="team-name">${escapeHtml(m.b.name)}</div>
        <input type="number" id="scoreB" min="0" value="${m.scoreB!=null?m.scoreB:0}"></div>
    </div>
    <div class="penalty-row">
      <label><i class="fa-solid fa-circle-dot"></i> ركلات الترجيح (عند التعادل)</label>
      <div class="row">
        <input type="number" id="penA" min="0" placeholder="ترجيح ${escapeHtml(m.a.name)}" value="${m.penA!=null?m.penA:""}">
        <input type="number" id="penB" min="0" placeholder="ترجيح ${escapeHtml(m.b.name)}" value="${m.penB!=null?m.penB:""}">
      </div>
    </div>
    <div class="field" style="margin-top:14px;">
      <label><i class="fa-solid fa-star" style="color:var(--gold)"></i> أفضل لاعب (اختياري)</label>
      <select id="motmSelect">
        <option value="">— بدون —</option>
        <option value="${m.a.id}" ${m.motm && m.motm.teamId===m.a.id?"selected":""}>${escapeHtml(m.a.name)}</option>
        <option value="${m.b.id}" ${m.motm && m.motm.teamId===m.b.id?"selected":""}>${escapeHtml(m.b.name)}</option>
      </select>
    </div>`;
  const r = openModal({
    title:"نتيجة المباراة", body,
    actions:[
      {label:'إلغاء', cls:"btn-quiet", onClick:c=>c()},
      {label:'حفظ', cls:"btn-primary", onClick:async c=>{
        const sA = parseInt(r.modal.querySelector("#scoreA").value||"0",10);
        const sB = parseInt(r.modal.querySelector("#scoreB").value||"0",10);
        const pA = r.modal.querySelector("#penA").value===""?null:parseInt(r.modal.querySelector("#penA").value,10);
        const pB = r.modal.querySelector("#penB").value===""?null:parseInt(r.modal.querySelector("#penB").value,10);
        const motmVal = r.modal.querySelector("#motmSelect").value;
        if(isNaN(sA)||isNaN(sB)||sA<0||sB<0){ toast("نتيجة غير صحيحة","error"); return; }
        const ok = await apiSaveScore(ri, mi, {
          scoreA: sA, scoreB: sB,
          penA: pA, penB: pB,
          motm: motmVal || null
        });
        if(ok) c();
      }}
    ]
  });
}

/* ============================================================
   START
   ============================================================ */
function start(){
  try {
    initSocket();
    loadAll();
    setTimeout(() => {
      const splash = $("#splash");
      if(splash) splash.classList.add("hide");
    }, 900);
  } catch(err){
    console.error("Boot error:", err);
    const app = document.getElementById("app");
    if(app){
      app.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center;padding:30px;text-align:center">'
        + '<div><div style="font-size:46px;margin-bottom:12px">⚠️</div>'
        + '<h2 style="margin:0 0 8px">حدث خطأ</h2>'
        + '<p style="color:#8790a7;font-size:14px;max-width:480px">' + escapeHtml(err.message||String(err)) + '</p>'
        + '<button onclick="location.reload()" style="margin-top:16px;padding:11px 22px;border:0;border-radius:12px;background:#5e7cff;color:#fff;font-weight:700;cursor:pointer">إعادة المحاولة</button></div></div>';
    }
  }
}

/* Keyboard shortcuts */
document.addEventListener("keydown", function(e){
  if(e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
  if(e.key === "t" || e.key === "T"){ toggleTheme(); }
  if(e.key === "1"){ state.view = "landing"; render(); }
  if(e.key === "2"){ state.view = "tournament"; render(); }
  if(e.key === "3"){ state.view = "manage"; render(); }
  if(e.key === "4"){ state.view = "history"; render(); }
  if(e.key === "5"){ state.view = "stats"; render(); }
  if(e.key === "h" || e.key === "H"){ state.view = "landing"; render(); }
});

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}