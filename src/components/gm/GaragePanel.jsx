import React, { useState } from 'react';
import { VEHICLES, newVehicle, customVehicle, normalizeVehicle } from '../../data/vehicles';
import { VEHICLE_MODS, MOUNTS, modByKey } from '../../data/vehicleMods';
import { installMod, removeMod, canMount, legDone, modSlots } from '../../utils/vehicles';
import { allVehicles, ownerLabel } from '../../utils/garage';
import VehicleCard from '../VehicleCard';

const REASONS = ['угнали', 'сгорела', 'продали', 'разбита'];

/* Гараж мастера (ТЗ v4, п.16.2): все машины, выдать, передать, забрать, править */
export default function GaragePanel(pr) {
  const chars = pr.characters || []; const node = pr.vehicles || {}; const spawned = pr.spawned || {};
  const [g, setG] = useState({ key: 'jeep', to: 'party', npcName: '' });
  const [cu, setCu] = useState({ name: '', hull: 30, armorType: 'none', armorHp: 0, speed: 3, handling: 0, seats: '2', tank: 3, ram: '3d6' });
  const [open, setOpen] = useState({});
  const all = allVehicles(chars, node);

  function gmLog(label, detail) { if (pr.addGmLog) pr.addGmLog({ who: pr.myName || 'ГМ', label: label, detail: detail || '' }); }
  function pubLog(label, detail) { if (pr.addLog) pr.addLog({ who: 'ГМ', type: 'gear', label: label, detail: detail || '', total: 0 }); }
  function parseTo(to, npcName) {
    if (to === 'party') return { type: 'party' };
    if (to === 'npc') return { type: 'npc', id: null, name: npcName || '' };
    return { type: 'char', id: to.slice(5) };
  }
  /* Положить машину владельцу */
  function put(v, owner) {
    const nv = normalizeVehicle(Object.assign({}, v, { owner: owner, driverId: null }));
    if (owner.type === 'char') { const c = chars.find(function (x) { return x._fbId === owner.id; }); if (!c) return; pr.saveChar(c._fbId, Object.assign({}, c, { garage: (c.garage || []).concat([nv]) })); }
    else pr.saveVehicle(nv.id, nv);
  }
  /* Убрать машину у текущего владельца */
  function take(e) {
    if (e.owner.type === 'char') { const c = e.char; pr.saveChar(c._fbId, Object.assign({}, c, { garage: (c.garage || []).filter(function (x) { return x.id !== e.v.id; }) })); }
    else pr.saveVehicle(e.v.id, null);
  }
  function save(e, v) {
    const nv = normalizeVehicle(v);
    if (e.owner.type === 'char') { const c = e.char; pr.saveChar(c._fbId, Object.assign({}, c, { garage: (c.garage || []).map(function (x) { return x.id === nv.id ? nv : x; }) })); }
    else pr.saveVehicle(nv.id, nv);
  }
  function grant() {
    const v = g.key === 'custom' ? customVehicle(cu) : newVehicle(g.key);
    if (!v) return;
    if (g.to.indexOf('char:') !== 0 && g.to !== 'party' && g.to !== 'npc') return;
    const owner = parseTo(g.to, g.npcName);
    put(v, owner);
    const lbl = ownerLabel(owner, chars);
    pubLog('ГМ выдал машину: ' + v.name + ' → ' + lbl);
    gmLog('Выдал машину', v.name + ' → ' + lbl);
  }
  function transfer(e, to) {
    const owner = parseTo(to, '');
    if (owner.type === e.owner.type && owner.id === e.owner.id) return;
    take(e); put(e.v, owner);
    pubLog('Машина «' + e.v.name + '» теперь у: ' + ownerLabel(owner, chars), 'было: ' + e.ownerName);
    gmLog('Передал машину', e.v.name + ': ' + e.ownerName + ' → ' + ownerLabel(owner, chars));
  }
  function remove(e, reason) {
    if (!window.confirm('Забрать «' + e.v.name + '» (' + reason + ')? Машина уйдёт в архив.')) return;
    take(e);
    pr.archiveVehicle(e.v.id, { v: Object.assign({}, e.v, { driverId: null }), reason: reason, from: e.ownerName, owner: e.owner, ts: Date.now() });
    pubLog('Машина «' + e.v.name + '» — ' + reason, 'была у: ' + e.ownerName);
    gmLog('Забрал машину', e.v.name + ' (' + e.ownerName + '): ' + reason);
  }
  function restore(id, rec) { put(rec.v, rec.owner && rec.owner.type !== 'char' ? rec.owner : { type: 'party' }); pr.archiveVehicle(id, null); gmLog('Вернул из архива', rec.v.name); }
  /* Перегон пройден: −1 перегон у машин партии и активных героев */
  function leg() {
    const party = all.filter(function (e) { return e.owner.type === 'party' || (e.owner.type === 'char' && e.char && e.char.active); });
    if (!party.length) { alert('У партии нет машин'); return; }
    const empty = []; const byChar = {};
    party.forEach(function (e) {
      const r = legDone(e.v); if (r.empty) empty.push(e.v.name);
      if (e.owner.type === 'char') { (byChar[e.char._fbId] = byChar[e.char._fbId] || { c: e.char, map: {} }).map[e.v.id] = r.v; }
      else pr.saveVehicle(e.v.id, normalizeVehicle(r.v));
    });
    Object.keys(byChar).forEach(function (id) { const b = byChar[id]; pr.saveChar(id, Object.assign({}, b.c, { garage: (b.c.garage || []).map(function (x) { return b.map[x.id] ? normalizeVehicle(b.map[x.id]) : x; }) })); });
    pubLog('Перегон пройден', party.map(function (e) { return e.v.name + ' ' + Math.max(0, (e.v.fuel || 0) - (e.v.noFuel ? 0 : 1)) + '/' + e.v.tank; }).join(', '));
    if (empty.length) pubLog('Бак пуст: ' + empty.join(', '), 'машина стоит, нужна канистра');
  }
  function addMod(e, k) { const r = installMod(e.v, k); if (r.error) { alert(r.error); return; } save(e, r.v); gmLog('Обвес', e.v.name + ': + ' + modByKey(k).name); }
  function delMod(e, k) { save(e, removeMod(e.v, k).v); gmLog('Обвес', e.v.name + ': − ' + modByKey(k).name); }
  const ownerVal = function (o) { return o.type === 'char' ? 'char:' + o.id : o.type; };
  const ownerOpts = [<option key="party" value="party">партия</option>, <option key="npc" value="npc">NPC</option>].concat(chars.map(function (c) { return <option key={c._fbId} value={'char:' + c._fbId}>{c.name || '?'}</option>; }));
  const live = Object.entries(spawned).filter(function (e) { return (e[1].hp !== undefined ? e[1].hp : e[1].maxHp) > 0; });
  const arch = Object.entries(pr.vehArchive || {});
  const nInp = { width: 60 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Гараж</h2>
      <div className="sec">
        <h3>Выдать машину</h3>
        <div className="row">
          <select value={g.key} onChange={function (e) { setG(Object.assign({}, g, { key: e.target.value })); }} style={{ flex: 1, minWidth: 160 }}>
            {VEHICLES.map(function (v) { return <option key={v.key} value={v.key}>{v.name + (v.price ? ' · ' + v.price + ' ер.' : ' · не продаётся')}</option>; })}
            <option value="custom">Своя машина…</option>
          </select>
          <span className="lblm">кому</span>
          <select value={g.to} onChange={function (e) { setG(Object.assign({}, g, { to: e.target.value })); }}>{ownerOpts}</select>
          {g.to === 'npc' && <input placeholder="чья (NPC)" value={g.npcName} onChange={function (e) { setG(Object.assign({}, g, { npcName: e.target.value })); }} style={{ width: 120 }} />}
          <button className="btn main" onClick={grant}>Выдать</button>
        </div>
        {g.key === 'custom' && <div className="row">
          <input placeholder="Название" value={cu.name} onChange={function (e) { setCu(Object.assign({}, cu, { name: e.target.value })); }} style={{ flex: 1, minWidth: 120 }} />
          {[['hull', 'Корпус'], ['armorHp', 'Броня'], ['speed', 'Скор.'], ['handling', 'Упр.'], ['tank', 'Бак']].map(function (f) { return <label key={f[0]} className="lblm">{f[1]} <input type="number" value={cu[f[0]]} onChange={function (e) { setCu(Object.assign({}, cu, { [f[0]]: e.target.value })); }} style={nInp} /></label>; })}
          <select value={cu.armorType} onChange={function (e) { setCu(Object.assign({}, cu, { armorType: e.target.value })); }}>{['none', 'light', 'medium', 'heavy'].map(function (t) { return <option key={t} value={t}>{{ none: 'без брони', light: 'лёгкая', medium: 'средняя', heavy: 'тяжёлая' }[t]}</option>; })}</select>
          <label className="lblm">Мест <input value={cu.seats} onChange={function (e) { setCu(Object.assign({}, cu, { seats: e.target.value })); }} style={nInp} /></label>
          <label className="lblm">Таран <input value={cu.ram} onChange={function (e) { setCu(Object.assign({}, cu, { ram: e.target.value })); }} style={nInp} /></label>
        </div>}
        <div className="row"><button className="btn" onClick={leg} title="−1 перегон у машин партии и героев в игре">Перегон пройден</button><span className="hint">Снимает перегон со всех машин партии; бак 0 — машина стоит.</span></div>
      </div>

      {all.length === 0 && <p className="hint">Машин нет.</p>}
      <div className="gm-cards">{all.map(function (e) {
        const v = e.v; const isOpen = !!open[e.ref]; const dn = v.driverId ? ((chars.find(function (c) { return c._fbId === v.driverId; }) || {}).name || (spawned[v.driverId] || {}).name || '?') : null;
        return <VehicleCard key={e.ref} v={v} sub={e.ownerName} driverName={dn}>
          <div className="row">
            <select value={ownerVal(e.owner)} onChange={function (ev) { transfer(e, ev.target.value); }} title="Передать">{ownerOpts}</select>
            <select value="" onChange={function (ev) { if (ev.target.value) remove(e, ev.target.value); }}><option value="">Забрать…</option>{REASONS.map(function (r) { return <option key={r} value={r}>{r}</option>; })}</select>
            <button className="btn sm" onClick={function () { setOpen(Object.assign({}, open, { [e.ref]: !isOpen })); }}>{isOpen ? 'Свернуть' : 'Править'}</button>
          </div>
          {isOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row">{[-5, -1, 1, 5].map(function (d) { return <button key={d} className="btn sm" onClick={function () { save(e, Object.assign({}, v, { hull: Math.max(0, Math.min(v.maxHull, v.hull + d)) })); }}>{'Корпус ' + (d > 0 ? '+' : '') + d}</button>; })}</div>
            {v.armorType !== 'none' && <div className="row">{[-5, -1, 1, 5].map(function (d) { return <button key={d} className="btn sm" onClick={function () { save(e, Object.assign({}, v, { armorHp: Math.max(0, Math.min(v.maxArmorHp, (v.armorHp || 0) + d)) })); }}>{'Броня ' + (d > 0 ? '+' : '') + d}</button>; })}</div>}
            <div className="row">
              {!v.noFuel && <React.Fragment><button className="btn sm" onClick={function () { save(e, Object.assign({}, v, { fuel: Math.max(0, (v.fuel || 0) - 1) })); }}>Бак −1</button><button className="btn sm" onClick={function () { const f = Math.min(v.tank, (v.fuel || 0) + 1); save(e, Object.assign({}, v, { fuel: f, outOfFuel: false, stopped: v.outOfFuel ? false : v.stopped })); }}>Бак +1</button></React.Fragment>}
              <button className="btn sm" onClick={function () { const w = ((v.wheelsHit || 0) + 1) % 3; save(e, Object.assign({}, v, { wheelsHit: w, stopped: w >= 2 ? true : v.stopped })); }}>{'Колёса: ' + (v.wheelsHit || 0)}</button>
              <button className="btn sm" onClick={function () { save(e, Object.assign({}, v, { speedLoss: v.speedLoss ? 0 : 1 })); }}>{v.speedLoss ? 'Мотор починен' : 'Мотор подбит'}</button>
              <button className="btn sm" onClick={function () { save(e, Object.assign({}, v, { burning: !v.burning })); }}>{v.burning ? 'Потушить' : 'Горит'}</button>
              <button className="btn sm" onClick={function () { save(e, Object.assign({}, v, { stopped: !v.stopped })); }}>{v.stopped ? 'Поехала' : 'Встала'}</button>
            </div>
            <div className="row">
              <select value="" onChange={function (ev) { if (ev.target.value) addMod(e, ev.target.value); }} disabled={(v.mods || []).length >= modSlots(v)}><option value="">{'Обвес (' + (v.mods || []).length + '/' + modSlots(v) + ')…'}</option>{VEHICLE_MODS.filter(function (m) { return (v.mods || []).indexOf(m.key) < 0; }).map(function (m) { return <option key={m.key} value={m.key} title={m.effect}>{m.name + ' · ' + m.price + ' ер.'}</option>; })}</select>
              {(v.mods || []).map(function (k) { const m = modByKey(k); return <button key={k} className="btn sm" title="Снять" onClick={function () { delMod(e, k); }}>{(m ? m.name : k) + ' ×'}</button>; })}
            </div>
            <div className="row">
              {canMount(v) && <select value={(v.mount && v.mount.key) || (v.mount ? '_' : '')} onChange={function (ev) { const m = MOUNTS.find(function (x) { return x.key === ev.target.value; }); save(e, Object.assign({}, v, { mount: m ? Object.assign({}, m) : null })); }}><option value="">станок пуст</option>{v.mount && !v.mount.key && <option value="_">{v.mount.name}</option>}{MOUNTS.map(function (m) { return <option key={m.key} value={m.key}>{m.name}</option>; })}</select>}
              <select value={v.driverId || ''} onChange={function (ev) { save(e, Object.assign({}, v, { driverId: ev.target.value || null })); }}><option value="">— водитель —</option>{chars.map(function (c) { return <option key={c._fbId} value={c._fbId}>{c.name || '?'}</option>; })}{live.map(function (s) { return <option key={s[0]} value={s[0]}>{s[1].name + ' (NPC)'}</option>; })}</select>
            </div>
          </div>}
        </VehicleCard>;
      })}</div>

      {arch.length > 0 && <div className="sec">
        <h3>Архив</h3>
        {arch.sort(function (a, b) { return (b[1].ts || 0) - (a[1].ts || 0); }).map(function (a) { const r = a[1]; return <div key={a[0]} className="row" style={{ justifyContent: 'space-between' }}><span>{(r.v ? r.v.name : '?') + ' — ' + r.reason + ' (была у: ' + (r.from || '?') + ', ' + new Date(r.ts || 0).toLocaleDateString('ru-RU') + ')'}</span><button className="btn sm" onClick={function () { restore(a[0], r); }}>Вернуть</button></div>; })}
      </div>}
    </div>
  );
}
