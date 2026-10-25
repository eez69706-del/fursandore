// سيرفر بدون أي مكتبات خارجية - يحتاج Node 16+ فقط
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3737;
const GENERATED = !process.env.ADMIN_PASS;
const ADMIN_PASS = (process.env.ADMIN_PASS || crypto.randomBytes(6).toString('hex')).trim(); // بدون كلمة مرور ثابتة في الكود
const DATA = path.join(__dirname, 'data'), DB_FILE = path.join(DATA, 'db.json'), BAK = path.join(DATA, 'backups');
const PUBLIC = path.join(__dirname, 'public');
fs.mkdirSync(BAK, { recursive: true });

const sessions = new Map();   // token -> وقت الانتهاء
const attempts = new Map();   // ip -> { n, until }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const hash = s => crypto.createHash('sha256').update(String(s)).digest();
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const isAuth = req => { const t = (req.headers.authorization || '').slice(7); const exp = sessions.get(t); if (exp && exp > Date.now()) return true; sessions.delete(t); return false; };
const readBody = req => new Promise((ok, no) => {
  let b = '', size = 0;
  req.on('data', c => { size += c.length; if (size > 5e6) { no(new Error('big')); req.destroy(); } else b += c; });
  req.on('end', () => ok(b)); req.on('error', no);
});

function backup() {
  if (!fs.existsSync(DB_FILE)) return;
  const files = fs.readdirSync(BAK).sort();
  const last = files[files.length - 1];
  if (last && Date.now() - fs.statSync(path.join(BAK, last)).mtimeMs < 10 * 60 * 1000) return; // نسخة كل 10 دقائق كحد أقصى
  fs.copyFileSync(DB_FILE, path.join(BAK, 'db-' + Date.now() + '.json'));
  files.slice(0, Math.max(0, files.length + 1 - 30)).forEach(f => fs.unlinkSync(path.join(BAK, f))); // نحتفظ بآخر 30
}

async function api(req, res, url) {
  if (url === '/api/db' && req.method === 'GET') {
    return send(res, 200, fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {});
  }
  if (url === '/api/db' && req.method === 'PUT') {
    if (!isAuth(req)) return send(res, 401, { error: 'unauthorized' });
    let data; try { data = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'bad json' }); }
    if (!data || !Array.isArray(data.teams)) return send(res, 400, { error: 'invalid db' });
    backup();
    fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(data));
    fs.renameSync(DB_FILE + '.tmp', DB_FILE);               // كتابة آمنة: ما يخرب الملف لو انقطع الكهرباء
    return send(res, 200, { ok: true });
  }
  if (url === '/api/login' && req.method === 'POST') {
    const ip = req.socket.remoteAddress, a = attempts.get(ip) || { n: 0, until: 0 };
    if (a.until > Date.now()) return send(res, 429, { error: 'too many' });
    let pass = ''; try { pass = String(JSON.parse(await readBody(req)).password || '').trim(); } catch {}
    if (crypto.timingSafeEqual(hash(pass), hash(ADMIN_PASS))) {
      attempts.delete(ip);
      const token = crypto.randomBytes(24).toString('hex');
      sessions.set(token, Date.now() + 12 * 3600 * 1000);
      return send(res, 200, { token });
    }
    a.n++; if (a.n >= 5) { a.until = Date.now() + 60000; a.n = 0; }
    attempts.set(ip, a);
    return send(res, 403, { error: 'wrong' });
  }
  if (url === '/api/logout' && req.method === 'POST') { sessions.delete((req.headers.authorization || '').slice(7)); return send(res, 200, { ok: true }); }
  send(res, 404, { error: 'not found' });
}

http.createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url.startsWith('/api/')) return await api(req, res, url);
    const file = path.join(PUBLIC, url === '/' ? 'index.html' : url);
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { console.error(e); send(res, 500, { error: 'server error' }); }
}).listen(PORT, () => {
  console.log('السيرفر شغال: http://localhost:' + PORT);
  if (GENERATED) console.log('ما حددت ADMIN_PASS، كلمة مرور الأدمن لهذي الجلسة: ' + ADMIN_PASS);
});
