const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8788;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const USERS_FILE = process.env.USERS_FILE || path.join(__dirname, 'users.json');
const SESSIONS_FILE = process.env.SESSIONS_FILE || path.join(path.dirname(USERS_FILE), 'sessions.json');
const hidden = require('./hidden');

/* Встроенный аккаунт ГМ задаётся переменными окружения GM_LOGIN и
   GM_PASSWORD (см. deploy/zachertoy-server.service). Если они не заданы,
   войти как ГМ нельзя — сервер пишет об этом при старте. */
const ADMIN_LOGIN = String(process.env.GM_LOGIN || '').trim();
const ADMIN_PASSWORD = String(process.env.GM_PASSWORD || '');
const ADMIN_ENABLED = !!(ADMIN_LOGIN && ADMIN_PASSWORD);
function isAdminLogin(login) { return ADMIN_ENABLED && String(login).toLowerCase() === ADMIN_LOGIN.toLowerCase(); }

let tree = {};
try {
  tree = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) {
  tree = {};
}

/* Логины/хеши паролей — отдельно от общего дерева, чтобы их нельзя было
   прочитать через обычный get/onValue (у того протокола нет прав доступа). */
let users = {};
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} catch (e) {
  users = {};
}

/* Сессии: токен → {login, role}. Роль соединения берётся только отсюда —
   клиенту на слово не верим. От роли зависит, что сервер отдаёт:
   игроку скрытые поля (настоящий вид палёнки, карта героя) не уходят. */
let sessions = {};
try {
  sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
} catch (e) {
  sessions = {};
}
let sessionsSaveTimer = null;
function scheduleSessionsSave() {
  if (sessionsSaveTimer) return;
  sessionsSaveTimer = setTimeout(function () {
    sessionsSaveTimer = null;
    fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions), function () {});
  }, 300);
}
function newSession(login, role) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions[token] = { login: login, role: role, ts: Date.now() };
  scheduleSessionsSave();
  return token;
}
function dropSessionsOf(login) {
  Object.keys(sessions).forEach(function (t) { if (sessions[t].login === login) delete sessions[t]; });
  scheduleSessionsSave();
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () {
    saveTimer = null;
    fs.writeFile(DATA_FILE, JSON.stringify(tree), function (err) { if (err) console.log('НЕ УДАЛОСЬ СОХРАНИТЬ МИР: ' + err.message); });
  }, 300);
}

let usersSaveTimer = null;
function scheduleUsersSave() {
  if (usersSaveTimer) return;
  usersSaveTimer = setTimeout(function () {
    usersSaveTimer = null;
    fs.writeFile(USERS_FILE, JSON.stringify(users), function (err) { if (err) console.log('НЕ УДАЛОСЬ СОХРАНИТЬ АККАУНТЫ: ' + err.message); });
  }, 300);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function splitPath(p) {
  return (p || '').split('/').filter(Boolean);
}

function getAt(segments) {
  let node = tree;
  for (const seg of segments) {
    if (node == null || typeof node !== 'object') return null;
    node = node[seg];
  }
  return node === undefined ? null : node;
}

function setAt(segments, value) {
  if (segments.length === 0) {
    tree = value === null || value === undefined ? {} : value;
    return;
  }
  let node = tree;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (node[seg] == null || typeof node[seg] !== 'object') node[seg] = {};
    node = node[seg];
  }
  const last = segments[segments.length - 1];
  if (value === null || value === undefined) {
    delete node[last];
  } else {
    node[last] = value;
  }
}

/* a и b — массивы сегментов пути; связаны, если один — префикс другого */
function related(a, b) {
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.every(function (seg, i) { return seg === longer[i]; });
}

const subs = new Map(); // id -> { id, ws, path, segments }

function isGM(ws) { return !!(ws.ctx && ws.ctx.role === 'gm'); }
function readFor(ws, segments) {
  const value = getAt(segments);
  return isGM(ws) ? value : hidden.scrubAt(segments, value, getAt);
}

function sendVal(sub) {
  if (sub.ws.readyState !== 1) return;
  const value = readFor(sub.ws, sub.segments);
  sub.ws.send(JSON.stringify({ t: 'val', id: sub.id, path: sub.path, value: value }));
}

function notify(changedSegments) {
  subs.forEach(function (sub) {
    if (related(changedSegments, sub.segments)) sendVal(sub);
  });
}

/* Если рядом есть собранный сайт (../build или STATIC_DIR), сервер отдаёт
   и его — тогда хватает одного порта: удобно для туннеля с домашнего ПК.
   На VPS сайт по-прежнему отдаёт nginx. */
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || path.join(__dirname, '..', 'build'));
const HAS_STATIC = fs.existsSync(path.join(STATIC_DIR, 'index.html'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json' };
function serveStatic(req, res) {
  let rel = decodeURIComponent(String(req.url || '/').split('?')[0]);
  let file = path.resolve(STATIC_DIR, '.' + rel);
  if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) file = path.join(STATIC_DIR, 'index.html');
    fs.readFile(file, function (e2, buf) {
      if (e2) { res.writeHead(404); res.end(); return; }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000' });
      res.end(buf);
    });
  });
}

const server = http.createServer(function (req, res) {
  if (HAS_STATIC) { serveStatic(req, res); return; }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('zachertoy-server ok');
});
const wss = new WebSocketServer({ server });

let connSeq = 1;

wss.on('connection', function (ws) {
  /* msg.id для подписок нумеруется на клиенте с нуля при каждой загрузке
     страницы, поэтому у двух одновременно подключённых вкладок (например,
     ГМ и игрок) id подписок совпадают ("s1", "s2", ...). Раньше subs был
     глобальной Map с ключом = голый msg.id — вторая вкладка молча
     затирала подписку первой на том же id, и та переставала получать
     обновления по этому узлу (баг с "не удаляется чат" и т.п.). Ключ
     теперь скоупится соединением. */
  const connId = connSeq++;
  const localSubKeys = new Set();

  ws.on('message', function (raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (msg.t === 'sub') {
      const segments = splitPath(msg.path);
      const key = connId + ':' + msg.id;
      const sub = { id: msg.id, ws: ws, path: msg.path || '', segments: segments };
      subs.set(key, sub);
      localSubKeys.add(key);
      sendVal(sub);
    } else if (msg.t === 'unsub') {
      const key = connId + ':' + msg.id;
      subs.delete(key);
      localSubKeys.delete(key);
    } else if (msg.t === 'resume') {
      const sess = sessions[String(msg.token || '')];
      if (sess && (sess.role === 'gm' ? isAdminLogin(sess.login) : !!users[sess.login])) {
        ws.ctx = { login: sess.login, role: sess.role };
        ws.send(JSON.stringify({ t: 'auth', rid: msg.rid, ok: true, login: sess.login, role: sess.role, token: msg.token }));
      } else {
        ws.ctx = null;
        ws.send(JSON.stringify({ t: 'auth', rid: msg.rid, ok: false, error: 'Сессия устарела — войди заново' }));
      }
    } else if (msg.t === 'logout') {
      if (msg.token && sessions[msg.token]) { delete sessions[msg.token]; scheduleSessionsSave(); }
      ws.ctx = null;
      if (msg.rid) ws.send(JSON.stringify({ t: 'ack', rid: msg.rid }));
    } else if (msg.t === 'set' || msg.t === 'update') {
      const writes = [];
      if (msg.t === 'set') writes.push([splitPath(msg.path), msg.value === undefined ? null : msg.value]);
      else Object.keys(msg.updates || {}).forEach(function (p) { writes.push([splitPath(p), msg.updates[p] === undefined ? null : msg.updates[p]]); });
      const gm = isGM(ws);
      const changed = [];
      writes.forEach(function (w) {
        const segments = w[0];
        /* игрок не может переписать корень или целую комнату */
        if (!gm && segments.length < 3) return;
        const ids = gm ? [] : hidden.charIdsTouched(segments, w[1], getAt);
        const before = {};
        ids.forEach(function (id) { before[id] = hidden.clone(getAt(['rooms', segments[1], 'characters', id])); });
        setAt(segments, w[1]);
        changed.push(segments);
        ids.forEach(function (id) {
          const cs = ['rooms', segments[1], 'characters', id];
          const res = hidden.restoreHidden(before[id], getAt(cs), id);
          if (getAt(cs) !== null) setAt(cs, res.char);
          res.events.forEach(function (ev) {
            const es = ['rooms', segments[1], ev.node, String(Date.now()) + '_' + crypto.randomBytes(3).toString('hex')];
            setAt(es, Object.assign({ ts: Date.now() }, ev.entry));
            changed.push(es);
          });
        });
      });
      scheduleSave();
      changed.forEach(notify);
      if (msg.rid) ws.send(JSON.stringify({ t: 'ack', rid: msg.rid }));
    } else if (msg.t === 'get') {
      const segments = splitPath(msg.path);
      ws.send(JSON.stringify({ t: 'get', rid: msg.rid, path: msg.path, value: readFor(ws, segments) }));
    } else if (msg.t === 'register') {
      const login = String(msg.login || '').trim();
      const password = String(msg.password || '');
      let error = null;
      if (!login || !password) error = 'Заполни логин и пароль';
      else if (login.length < 3) error = 'Логин слишком короткий (мин. 3 символа)';
      else if (password.length < 4) error = 'Пароль слишком короткий (мин. 4 символа)';
      else if (isAdminLogin(login)) error = 'Этот логин занят';
      else if (users[login]) error = 'Такой логин уже есть';
      if (!error) {
        const salt = crypto.randomBytes(16).toString('hex');
        users[login] = { salt: salt, hash: hashPassword(password, salt) };
        scheduleUsersSave();
      }
      let token = null;
      if (!error) { token = newSession(login, 'player'); ws.ctx = { login: login, role: 'player' }; }
      ws.send(JSON.stringify({ t: 'auth', rid: msg.rid, ok: !error, error: error, login: login, role: 'player', token: token }));
    } else if (msg.t === 'login') {
      const login = String(msg.login || '').trim();
      const password = String(msg.password || '');
      if (isAdminLogin(login) && password === ADMIN_PASSWORD) {
        ws.ctx = { login: ADMIN_LOGIN, role: 'gm' };
        ws.send(JSON.stringify({ t: 'auth', rid: msg.rid, ok: true, login: ADMIN_LOGIN, role: 'gm', token: newSession(ADMIN_LOGIN, 'gm') }));
        return;
      }
      const u = users[login];
      const ok = !!u && hashPassword(password, u.salt) === u.hash;
      if (ok) ws.ctx = { login: login, role: 'player' };
      ws.send(JSON.stringify({ t: 'auth', rid: msg.rid, ok: ok, error: ok ? null : 'Неверный логин или пароль', login: login, role: 'player', token: ok ? newSession(login, 'player') : null }));
    } else if (msg.t === 'change_account') {
      const room = String(msg.room || '').trim();
      const oldLogin = String(msg.oldLogin || '').trim();
      const currentPassword = String(msg.currentPassword || '');
      const newLogin = String(msg.newLogin || '').trim() || oldLogin;
      const newPassword = msg.newPassword ? String(msg.newPassword) : null;
      let error = null;
      const u = users[oldLogin];
      if (isAdminLogin(oldLogin)) error = 'Аккаунт ГМ нельзя изменить здесь';
      else if (!u) error = 'Аккаунт не найден';
      else if (hashPassword(currentPassword, u.salt) !== u.hash) error = 'Неверный текущий пароль';
      else if (newLogin.length < 3) error = 'Логин слишком короткий (мин. 3 символа)';
      else if (newPassword !== null && newPassword.length < 4) error = 'Новый пароль слишком короткий (мин. 4 символа)';
      else if (isAdminLogin(newLogin)) error = 'Этот логин занят';
      else if (newLogin.toLowerCase() !== oldLogin.toLowerCase() && users[newLogin]) error = 'Такой логин уже есть';
      if (!error) {
        const salt = newPassword !== null ? crypto.randomBytes(16).toString('hex') : u.salt;
        const hash = newPassword !== null ? hashPassword(newPassword, salt) : u.hash;
        if (newLogin !== oldLogin) {
          delete users[oldLogin];
          Object.keys(sessions).forEach(function (t) { if (sessions[t].login === oldLogin) sessions[t].login = newLogin; });
          scheduleSessionsSave();
          if (ws.ctx && ws.ctx.login === oldLogin) ws.ctx.login = newLogin;
        }
        users[newLogin] = { salt: salt, hash: hash };
        scheduleUsersSave();
        if (newLogin !== oldLogin && room) {
          const segsOld = splitPath('rooms/' + room + '/characters/' + oldLogin);
          const segsNew = splitPath('rooms/' + room + '/characters/' + newLogin);
          const charData = getAt(segsOld);
          if (charData !== null) {
            setAt(segsNew, charData);
            setAt(segsOld, null);
            scheduleSave();
            notify(segsOld);
            notify(segsNew);
          }
        }
      }
      ws.send(JSON.stringify({ t: 'change_account', rid: msg.rid, ok: !error, error: error, login: newLogin, role: 'player' }));
    } else if (msg.t === 'delete_account') {
      /* Удаление персонажа ГМ-ом должно полностью освобождать логин/пароль,
         иначе повторная регистрация под тем же именем падает с «логин занят». */
      const login = String(msg.login || '').trim();
      if (isGM(ws) && login && !isAdminLogin(login) && users[login]) {
        delete users[login];
        scheduleUsersSave();
        dropSessionsOf(login);
      }
      if (msg.rid) ws.send(JSON.stringify({ t: 'ack', rid: msg.rid }));
    }
  });

  ws.on('close', function () {
    localSubKeys.forEach(function (key) {
      subs.delete(key);
    });
  });
});

server.listen(PORT, function () {
  console.log('zachertoy-server listening on :' + PORT + ' (data: ' + DATA_FILE + ', users: ' + USERS_FILE + ')');
  if (HAS_STATIC) console.log('Сайт отдаётся отсюда же: http://localhost:' + PORT + ' (' + STATIC_DIR + ')');
  if (!ADMIN_ENABLED) console.log('ВНИМАНИЕ: GM_LOGIN / GM_PASSWORD не заданы — вход ГМ отключён.');
});
