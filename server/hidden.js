/* Скрытые от игрока данные: настоящий вид палёнки и карта героя.
   Мастер видит всё. Игроку сервер отдаёт «очищенную» копию, а когда
   игрок сохраняет лист целиком, скрытые поля берутся из старой версии —
   игрок не может ни прочитать их, ни затереть. */
const crypto = require('crypto');

/* Таблица шумов (рулбук, гл. 5) — нужна, когда палёнка при вставке
   «шумит и заедает»: этот бросок делает сервер, игрок видит только шум. */
const NOISE = [
  'Чужой голос: −1 к Выдержке до конца сцены',
  'Залипание: кассета не вынимается до отдыха',
  'Обрыв: кассета молчит до конца сцены',
  'Эхо: повторяешь фразы с плёнки, −2 к Скрытности на сцену',
  'Мигрень: −1 ко всем проверкам Разума на сцену',
  'Чужая привычка: мастер даёт странность до конца сессии',
  'Перемотка: теряешь следующий ход',
  'Тремор: −1 к Реакции на сцену',
  'Чужой сон: утром Выдержка СЛ 12, иначе отдых не засчитан',
  'Пробой: плёнку зажевало, кассета испорчена'
];
function d10() { return crypto.randomInt(1, 11); }
function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function isObj(v) { return v != null && typeof v === 'object'; }

/* Кассета глазами игрока */
function scrubCassette(x) {
  if (!isObj(x) || x.kind !== 'fake') return x;
  const y = Object.assign({}, x);
  if (!x.revealed) y.kind = 'orig';
  /* палёнка, которая молчит или заела, — не работает; причину игрок не видит */
  if (x.inNest && x.fakeState && x.fakeState !== 'copy') y.dud = true;
  delete y.fakeAs; delete y.fakeState;
  return y;
}
function scrubChar(c) {
  if (!isObj(c)) return c;
  const y = Object.assign({}, c);
  if (Array.isArray(c.cassettes)) y.cassettes = c.cassettes.map(scrubCassette);
  if (isObj(c.heroCard) && !c.heroCard.revealed) y.heroCard = { revealed: false };
  return y;
}

function scrubSpawned(n) {
  if (!isObj(n) || !n.campaign) return n;
  const y = Object.assign({}, n); delete y.note; delete y.arc; delete y.group; delete y.campaign;
  return y;
}

/* value лежит по пути segs; вернуть то, что можно отдать игроку */
function scrubAt(segs, value, getAt) {
  if (value == null) return value;
  if (segs.length > 0 && segs[0] !== 'rooms') return value;
  if (segs.length >= 3 && segs[2] === 'gmLog') return null;
  /* бестиарий мастера (в т.ч. NPC кампании) игроку не нужен и не отдаётся */
  if (segs.length >= 3 && segs[2] === 'npcTemplates') return null;
  /* NPC кампании на поле: игроку — без заметок мастера (там спойлеры) */
  if (segs.length >= 3 && segs[2] === 'spawned') {
    if (segs.length === 3) {
      if (!isObj(value)) return value;
      const outS = {};
      Object.keys(value).forEach(function (k) { outS[k] = scrubSpawned(value[k]); });
      return outS;
    }
    if (segs.length === 4) return scrubSpawned(value);
    let nodeS = scrubSpawned(getAt(segs.slice(0, 4)));
    for (let i = 4; i < segs.length; i++) { if (!isObj(nodeS)) return null; nodeS = nodeS[segs[i]]; }
    return nodeS === undefined ? null : nodeS;
  }
  if (segs.length >= 3 && segs[2] === 'characters') {
    if (segs.length === 3) {
      if (!isObj(value)) return value;
      const out = {};
      Object.keys(value).forEach(function (k) { out[k] = scrubChar(value[k]); });
      return out;
    }
    if (segs.length === 4) return scrubChar(value);
    let node = scrubChar(getAt(segs.slice(0, 4)));
    for (let i = 4; i < segs.length; i++) { if (!isObj(node)) return null; node = node[segs[i]]; }
    return node === undefined ? null : node;
  }
  if (segs.length < 3 && isObj(value)) {
    const out = Array.isArray(value) ? [] : {};
    Object.keys(value).forEach(function (k) { out[k] = scrubAt(segs.concat([k]), value[k], getAt); });
    return out;
  }
  return value;
}

/* Какие персонажи задеты записью игрока */
function charIdsTouched(segs, value, getAt) {
  if (segs[0] !== 'rooms' || segs[2] !== 'characters') return [];
  if (segs.length >= 4) return [segs[3]];
  const ids = {};
  [getAt(segs), value].forEach(function (v) { if (isObj(v)) Object.keys(v).forEach(function (k) { ids[k] = true; }); });
  return Object.keys(ids);
}

/* Игрок сохранил лист: вернуть скрытые поля из старой версии.
   Палёнку, вставленную игроком, «заводит» сервер скрытым d10. */
function restoreHidden(oldC, newC) {
  const events = [];
  if (!isObj(newC)) return { char: newC, events: events };
  const c = Object.assign({}, newC);
  /* карту героя назначает только мастер; у игрока она всегда та же, что была */
  c.heroCard = isObj(oldC) && oldC.heroCard !== undefined ? oldC.heroCard : null;
  const who = c.name || '???';
  const old = {};
  ((oldC && oldC.cassettes) || []).forEach(function (x) { if (isObj(x) && x.id) old[x.id] = x; });
  if (Array.isArray(c.cassettes)) c.cassettes = c.cassettes.map(function (x) {
    if (!isObj(x)) return x;
    const o = old[x.id];
    const y = Object.assign({}, x);
    delete y.dud;
    if (!o || o.kind !== 'fake') {
      /* игрок не может сам сделать кассету палёнкой */
      if (y.kind === 'fake' || y.fakeAs) { if (y.kind === 'fake') y.kind = 'orig'; delete y.fakeAs; delete y.fakeState; }
      return y;
    }
    y.kind = 'fake';
    if (o.fakeAs) y.fakeAs = o.fakeAs; else delete y.fakeAs;
    if (o.revealed) y.revealed = true; else delete y.revealed;
    const title = o.title || x.title || o.key;
    if (y.inNest && !o.inNest) {
      const d = d10();
      const out = d <= 4 ? 'silent' : d <= 8 ? 'copy' : 'stuck';
      y.fakeState = out;
      events.push({ node: 'gmLog', entry: { who: who, target: who, label: 'Палёнка «' + title + '» вставлена', detail: 'скрытый d10 = ' + d + ': ' + (out === 'silent' ? 'молчит' : out === 'copy' ? 'работает как копия' : 'шум и застряла') } });
      if (out === 'stuck') {
        const n = d10();
        y.stuck = true;
        events.push({ node: 'logs', entry: { who: who, type: 'noise', total: 0, label: 'Шум кассеты «' + title + '» (' + n + ')', detail: NOISE[n - 1] + ' · кассета застряла' } });
      }
    } else if (!y.inNest) {
      delete y.fakeState;
    } else {
      if (o.fakeState) y.fakeState = o.fakeState; else delete y.fakeState;
    }
    return y;
  });
  return { char: c, events: events };
}

/* Игрок сохранил NPC (урон, состояния): вернуть скрытые поля NPC кампании */
function spawnedIdsTouched(segs, value, getAt) {
  if (segs[0] !== 'rooms' || segs[2] !== 'spawned') return [];
  if (segs.length >= 4) return [segs[3]];
  const ids = {};
  [getAt(segs), value].forEach(function (v) { if (isObj(v)) Object.keys(v).forEach(function (k) { ids[k] = true; }); });
  return Object.keys(ids);
}
function restoreSpawned(oldN, newN) {
  if (!isObj(newN) || !isObj(oldN) || !oldN.campaign) return newN;
  const y = Object.assign({}, newN);
  ['note', 'arc', 'group', 'campaign'].forEach(function (k) { if (oldN[k] !== undefined) y[k] = oldN[k]; });
  return y;
}

module.exports = { spawnedIdsTouched, restoreSpawned, scrubAt, scrubChar, scrubCassette, charIdsTouched, restoreHidden, clone, NOISE };
