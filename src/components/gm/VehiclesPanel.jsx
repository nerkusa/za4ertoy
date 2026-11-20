import React, { useState } from 'react';
import { db, ref, set } from '../../firebase';
import { normalizeVehicle } from '../../data/vehicles';
import { allVehicles } from '../../utils/garage';
import { cF, hpOf } from '../../utils/character';
import { rollHit, r1 } from '../../utils/dice';
import { driverRoll, chaseRound, CHASE_GOAL, ramResult, ramSelfFrac, ramDiceOf, vehicleHit, zeroHull } from '../../utils/vehicles';
import { DT } from '../../data/stats';

/* Машины у мастера: свои машины NPC, все машины партии, погоня, таран,
   попадание по машине (глава 7). Машина в бою ходит через водителя. */
export default function VehiclesPanel(pr) {
  const chars = pr.characters || []; const spawned = pr.spawned || {}; const gmV = pr.vehicles || {};
  const [chase, setChase] = useState({ a: '', b: '', pa: 0, pb: 0, round: 0, last: '' });
  const [ram, setRam] = useState({ att: '', tgt: '' });
  const [hit, setHit] = useState({ v: '', dmg: 10, type: 'П' });

  /* Все машины: партии, NPC и из гаражей игроков (utils/garage) */
  const all = allVehicles(chars, gmV).map(function (e) { return Object.assign({}, e, { owner: e.ownerName }); });
  function find(r) { return all.find(function (x) { return x.ref === r; }); }
  function saveV(entry, nv) {
    nv = normalizeVehicle(nv);
    if (entry.ref.indexOf('node:') === 0) { set(ref(db, 'rooms/' + pr.roomCode + '/vehicles/' + nv.id), nv); return; }
    const c = entry.char; pr.saveChar(c._fbId, Object.assign({}, c, { garage: (c.garage || []).map(function (x) { return x.id === nv.id ? nv : x; }) }));
  }
  function log(label, detail, total) { pr.addLog({ who: 'ГМ', type: 'chase', label: label, detail: detail || '', total: total || 0 }); }
  /* Водитель машины: игрок или NPC на поле боя */
  function driverOf(v) {
    if (!v || !v.driverId) return null;
    const c = chars.find(function (x) { return x._fbId === v.driverId; });
    if (c) { const inf = cF(c); return { kind: 'pc', id: c._fbId, name: c.name || '?', reak: inf.fs.reak || 0, driving: inf.eSk['Вождение'] || 0, pen: inf.rollPen('reak').total, dodge: (inf.fs.reak || 0) + (inf.eSk['Уклонение'] || 0), char: c }; }
    const n = spawned[v.driverId];
    if (n) return { kind: 'npc', id: v.driverId, name: n.name, reak: (n.stats || {}).reak || 0, driving: (n.skills || {}).driving || (n.extraSkills || {})['Вождение'] || 0, npc: n };
    return null;
  }
  function hurtDriver(d, dmg, why) {
    if (!d || !dmg) return;
    if (d.kind === 'pc') { const h = hpOf(d.char, cF(d.char).fs); const nh = Math.max(0, h.cur - dmg); pr.saveChar(d.id, Object.assign({}, d.char, { curHp: nh })); set(ref(db, 'rooms/' + pr.roomCode + '/dmgEvents/' + d.id), { attackerName: why, dmg: dmg, oldHp: h.cur, newHp: nh, maxHp: h.max, ts: Date.now() }); }
    else { const sp = Object.assign({}, spawned); sp[d.id] = Object.assign({}, d.npc, { hp: Math.max(0, (d.npc.hp || 0) - dmg) }); pr.saveSpawned(sp); }
  }
  const scene = pr.scene || {};


  /* ── Погоня ── */
  function chaseStep() {
    const A = find(chase.a), B = find(chase.b);
    if (!A || !B || A.ref === B.ref) { alert('Выбери две разные машины'); return; }
    const da = driverOf(A.v), db2 = driverOf(B.v);
    if (!da || !db2) { alert('У обеих машин должен быть водитель'); return; }
    const ra = driverRoll(da, A.v, { swamp: scene.swamp }), rb = driverRoll(db2, B.v, { swamp: scene.swamp });
    const r = chaseRound({ v: A.v, total: ra.total }, { v: B.v, total: rb.total });
    let pa = chase.pa, pb = chase.pb; if (r.winner === 'a') pa += r.gain; if (r.winner === 'b') pb += r.gain;
    const txt = A.v.name + ' (' + da.name + '): ' + ra.total + (r.ta !== ra.total ? ' +' + (r.ta - ra.total) + ' скорость' : '') + ' против ' + B.v.name + ' (' + db2.name + '): ' + rb.total + (r.tb !== rb.total ? ' +' + (r.tb - rb.total) + ' скорость' : '');
    const res = r.winner ? (r.winner === 'a' ? A.v.name : B.v.name) + ' +' + r.gain : 'ничья';
    const fin = pa >= CHASE_GOAL ? A.v.name + ' — ушёл или догнал' : pb >= CHASE_GOAL ? B.v.name + ' — ушёл или догнал' : '';
    setChase(Object.assign({}, chase, { pa: pa, pb: pb, round: chase.round + 1, last: txt + ' → ' + res + (fin ? '. ' + fin : '') }));
    log('Погоня, раунд ' + (chase.round + 1) + ': ' + res + ' · дистанция ' + pa + ':' + pb + (fin ? ' · ' + fin : ''), txt, 0);
  }

  /* ── Таран ── tgt: машина (ref) или пешеход "walk:pc:id" / "walk:npc:id" */
  function doRam() {
    const A = find(ram.att); if (!A) { alert('Выбери таранящую машину'); return; }
    const da = driverOf(A.v); if (!da) { alert('У таранящей машины нет водителя'); return; }
    const ra = driverRoll(da, A.v, { swamp: scene.swamp });
    let def = 0, defTxt = '', tgtName = '';
    const T = find(ram.tgt);
    if (T) { const dt = driverOf(T.v); const rt = dt ? driverRoll(dt, T.v, { swamp: scene.swamp }) : { total: 0 }; def = rt.total; defTxt = dt ? 'Вождение ' + rt.total : 'без водителя'; tgtName = T.v.name; }
    else if (ram.tgt.indexOf('walk:') === 0) {
      const parts = ram.tgt.split(':'); const R = rollHit();
      if (parts[1] === 'pc') { const c = chars.find(function (x) { return x._fbId === parts[2]; }); const inf = cF(c); def = R.d + (inf.fs.reak || 0) + (inf.eSk['Уклонение'] || 0) + inf.rollPen('reak').total; tgtName = c.name; }
      else { const n = spawned[parts[2]]; def = R.d + ((n.stats || {}).reak || 0) + ((n.skills || {}).dodge || 0); tgtName = n.name; }
      defTxt = 'Уклонение ' + def;
    } else { alert('Выбери цель'); return; }
    const res = ramResult(ra.total, def, ramDiceOf(A.v, !T), undefined, ramSelfFrac(A.v));
    if (!res.hit) { log('Таран: ' + A.v.name + ' → ' + tgtName + ' — мимо', 'Вождение ' + ra.total + ' против ' + defTxt, ra.total); return; }
    const notes = [];
    if (T) {
      const nv = Object.assign({}, T.v, { hull: Math.max(0, T.v.hull - res.dmg) }); const z = zeroHull(T.v, nv, true); saveV(T, z.v); if (z.text) notes.push(T.v.name + ': ' + z.text);
      if (z.flip) hurtDriver(driverOf(T.v), z.flip, 'переворот');
    } else {
      const parts2 = ram.tgt.split(':');
      if (parts2[1] === 'pc') { const c2 = chars.find(function (x) { return x._fbId === parts2[2]; }); hurtDriver({ kind: 'pc', id: c2._fbId, char: c2 }, res.dmg, A.v.name + ' (таран)'); }
      else hurtDriver({ kind: 'npc', id: parts2[2], npc: spawned[parts2[2]] }, res.dmg, 'таран');
    }
    const selfV = Object.assign({}, A.v, { hull: Math.max(0, A.v.hull - res.self) }); const zs = zeroHull(A.v, selfV, true); saveV(A, zs.v); if (zs.text) notes.push(A.v.name + ': ' + zs.text);
    if (zs.flip) hurtDriver(da, zs.flip, 'переворот');
    log('Таран: ' + A.v.name + ' → ' + tgtName + ' · ' + res.dmg + (T ? ' Корпуса' : ' Здоровья'), 'Вождение ' + ra.total + ' против ' + defTxt + ' · таранящему ' + res.self + ' Корпуса' + (notes.length ? ' · ' + notes.join(' · ') : ''), res.dmg);
  }

  /* ── Попадание по машине (урон уже брошен стрелком) ── */
  function doHit() {
    const E = find(hit.v); if (!E) { alert('Выбери машину'); return; }
    const r = vehicleHit(E.v, parseInt(hit.dmg) || 0, hit.type, r1);
    saveV(E, r.v); const d = driverOf(E.v);
    if (r.driverDmg) hurtDriver(d, r.driverDmg, 'попадание в машину');
    if (r.flip) hurtDriver(d, r.flip, 'переворот');
    log('Попадание по машине ' + E.v.name + ': d6 = ' + r.d6 + ' · ' + r.where, r.notes.join(' · ') + (r.driverDmg ? ' · водителю ' + r.driverDmg + (d ? ' (' + d.name + ')' : '') : ''), r.hull || r.driverDmg || 0);
  }
  function opt(x) { const d = driverOf(x.v); return <option key={x.ref} value={x.ref}>{x.v.name + ' · ' + x.owner + (d ? ' · за рулём ' + d.name : ' · без водителя') + ' · Корпус ' + x.v.hull}</option>; }
  const live = Object.entries(spawned).filter(function (e) { return (e[1].hp !== undefined ? e[1].hp : e[1].maxHp) > 0; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Погоня, таран, попадание</h2>
      <p className="hint">Бросок водителя: Реакция + Вождение + Управляемость + d10. Машина в бою ходит через водителя. Стрельба на ходу (флаг сцены «На ходу» в бестиарии): −2, водитель −4, дорожники без штрафа.</p>

      <div className="sec">
        <h3>Погоня</h3>
        <div className="row"><select value={chase.a} onChange={function (e) { setChase(Object.assign({}, chase, { a: e.target.value })); }} style={{ flex: 1, minWidth: 160 }}><option value="">— машина 1 —</option>{all.map(opt)}</select>
          <select value={chase.b} onChange={function (e) { setChase(Object.assign({}, chase, { b: e.target.value })); }} style={{ flex: 1, minWidth: 160 }}><option value="">— машина 2 —</option>{all.map(opt)}</select></div>
        <div className="row"><button className="btn main" onClick={chaseStep}>Раунд погони</button><button className="btn sm" onClick={function () { setChase(Object.assign({}, chase, { pa: 0, pb: 0, round: 0, last: '' })); }}>Сначала</button>
          <span className="mono">{'Дистанция ' + chase.pa + ' : ' + chase.pb + ' (до ' + CHASE_GOAL + ') · раунд ' + chase.round}</span></div>
        {chase.last && <div className={chase.pa >= CHASE_GOAL || chase.pb >= CHASE_GOAL ? 'okbox' : 'warnbox'}>{chase.last}</div>}
        <p className="hint">Быстрая машина прибавляет разницу Скоростей. Победитель раунда +1 к дистанции, при разнице 5 и больше +2. Набрал 3 — ушёл или догнал. Пассажиры в это время стреляют.</p>
      </div>

      <div className="sec rust">
        <h3>Таран</h3>
        <div className="row"><select value={ram.att} onChange={function (e) { setRam(Object.assign({}, ram, { att: e.target.value })); }} style={{ flex: 1, minWidth: 160 }}><option value="">— кто таранит —</option>{all.map(opt)}</select>
          <select value={ram.tgt} onChange={function (e) { setRam(Object.assign({}, ram, { tgt: e.target.value })); }} style={{ flex: 1, minWidth: 160 }}><option value="">— цель —</option><optgroup label="Машины">{all.map(opt)}</optgroup><optgroup label="Пешком">{chars.filter(function (c) { return c.active; }).map(function (c) { return <option key={c._fbId} value={'walk:pc:' + c._fbId}>{(c.name || '?') + ' (игрок)'}</option>; })}{live.map(function (e) { return <option key={e[0]} value={'walk:npc:' + e[0]}>{e[1].name}</option>; })}</optgroup></select>
          <button className="btn main" onClick={doRam}>Таран</button></div>
        <p className="hint">Вождение против Вождения цели, пешеход защищается Уклонением. Урон тарана — по Корпусу или Здоровью пешехода; таранящему половина. Корпус 0 от тарана — переворот, 3d6 внутри.</p>
      </div>

      <div className="sec">
        <h3>Попадание по машине</h3>
        <div className="row"><select value={hit.v} onChange={function (e) { setHit(Object.assign({}, hit, { v: e.target.value })); }} style={{ flex: 1, minWidth: 160 }}><option value="">— машина —</option>{all.map(opt)}</select>
          <input type="number" value={hit.dmg} onChange={function (e) { setHit(Object.assign({}, hit, { dmg: e.target.value })); }} style={{ width: 70 }} title="Урон" />
          <select value={hit.type} onChange={function (e) { setHit(Object.assign({}, hit, { type: e.target.value })); }}>{DT.map(function (t) { return <option key={t} value={t}>{t}</option>; })}</select>
          <button className="btn main" onClick={doHit}>Бросить d6</button></div>
        <p className="hint">1 водитель (броня машины берёт половину, у мотоцикла — нет) · 2 колесо · 3–4 корпус · 5 мотор, −1 к Скорости · 6 бак, на d6 = 6 горит.</p>
      </div>

    </div>
  );
}
