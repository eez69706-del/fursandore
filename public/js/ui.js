/* TOAST */
function toast(msg, type){
  const t = $("#toast");
  if(!t) return;
  const icon = type==="error" ? "fa-circle-exclamation" : type==="success" ? "fa-circle-check" : "fa-circle-info";
  t.innerHTML = '<i class="fa-solid '+icon+'"></i><span>'+escapeHtml(msg)+'</span>';
  t.className = "toast show " + (type||"");
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove("show"), 2800);
}

/* THEME */
function toggleTheme(){
  state.theme = state.theme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", state.theme);
  localStorage.setItem("t_theme", state.theme);
  const btn = $("#themeBtn");
  if(btn){
    btn.innerHTML = state.theme === "light"
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
  }
}

/* MODAL */
function openModal(opts){
  const root = $("#modal-root");
  if(!root) return { close:()=>{} };
  root.innerHTML = "";
  const ov = el("div","","modal-backdrop");
  const m = el("div","","modal"+(opts.wide?" wide":""));
  m.innerHTML = '<h2>'+opts.title+'</h2><div class="modal-body"></div><div class="modal-actions"></div>';
  m.querySelector(".modal-body").appendChild(opts.body);
  const actBox = m.querySelector(".modal-actions");
  let closed = false;
  function close(){ if(closed) return; closed = true; ov.remove(); }
  opts.actions.forEach(a => {
    const b = el("button", a.label, "btn "+(a.cls||"btn-quiet"));
    b.onclick = function(){ a.onClick(close); };
    actBox.appendChild(b);
  });
  ov.addEventListener("click", e => { if(e.target===ov) close(); });
  function esc(e){
    if(e.key==="Escape"){
      close();
      document.removeEventListener("keydown", esc);
    }
  }
  document.addEventListener("keydown", esc);
  ov.appendChild(m);
  root.appendChild(ov);
  setTimeout(()=>{ const i=m.querySelector("input"); if(i) i.focus(); }, 50);
  return { close, modal:m };
}

/* ADMIN LOGIN */
function openAdminLogin(){
  if(API.isAdmin()){
    if(confirm('تسجيل الخروج من وضع الأدمن؟')){
      API.logout();
      toast('تم الخروج');
      render();
    }
    return;
  }
  const pass = prompt('أدخل كلمة سر الأدمن:');
  if(!pass) return;
  API.login(pass);
  API.get('/api/teams').then(() => {
    toast('مرحباً يا أدمن 👑', 'success');
    render();
  }).catch(() => {
    API.logout();
    toast('كلمة السر غلط', 'error');
  });
}

/* CLOCK */
function startClock(){
  clearInterval(state.clockInterval);
  const update = () => {
    const clock = $("#topbarClock");
    if(!clock) return;
    const d = new Date();
    const time = d.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
    const date = d.toLocaleDateString("ar-SA",{day:"numeric",month:"long"});
    clock.innerHTML = `<i class="fa-regular fa-clock"></i><span>${date} · ${time}</span>`;
  };
  update();
  state.clockInterval = setInterval(update, 30000);
}