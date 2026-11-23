import React, { useState } from 'react';
import { getTraits } from '../../utils/traitStore';
import { rollRoots, rollInner, rollRootKey, rollInnerKey, rollExtra, rollPeriod, periods, EVENT_KINDS, rollEventKind, eventFxPatch, hasFx, rebuildBio } from '../../utils/lifepath';
import { EXTRA_TABLES } from '../../data/lifepathExtra';

/* Мастер правит жизненный путь уже готового героя: текст любой строки,
   переброс строки, новые события и штрихи, удаление. Механику события
   можно применить кнопкой; при удалении или правке она не откатывается. */
export default function LifepathEditor(pr) {
  const c = pr.char; const cat = getTraits();
  const lp = Object.assign({ roots: [], inner: [], years: [], extra: [] }, c.lifepath || {});
  const [open, setOpen] = useState(false);
  const [add, setAdd] = useState({ kind: 'after_good', label: '', text: '', fx: true });
  const [ex, setEx] = useState(EXTRA_TABLES[0].key);
  function log(label, detail) { if (pr.addGmLog) pr.addGmLog({ who: 'ГМ', target: c.name || '?', label: label, detail: detail || '' }); }
  /* Сохранить путь; bio — сразу переписать строки биографии */
  function put(nlp, extraPatch, note) {
    const full = Object.assign({}, lp, nlp);
    pr.save(Object.assign({}, c, extraPatch || {}, { lifepath: full, bio: rebuildBio(c, full) }));
    if (note) log('Жизненный путь', (c.name || '?') + ': ' + note);
  }
  function setRow(list, i, patch) { const a = (lp[list] || []).slice(); a[i] = Object.assign({}, a[i], patch); const o = {}; o[list] = a; return o; }
  function delRow(list, i) { const a = (lp[list] || []).filter(function (_, k) { return k !== i; }); const o = {}; o[list] = a; return o; }
  function reroll(list, i) {
    const r = lp[list][i]; let n = null;
    if (list === 'roots') n = rollRootKey(c.origin, r.key);
    else if (list === 'inner') n = rollInnerKey(r.key);
    else if (list === 'extra') n = rollExtra(r.key);
    else {
      const per = periods(c.origin, c.age)[i];
      n = r.gm || !per ? rollEventKind(r.kind === 'good' || r.kind === 'bad' ? (r.table === 'pre' ? 'pre_' : 'after_') + r.kind : r.kind, r.label) : rollPeriod(per);
    }
    if (!n) return;
    const o = {}; o[list] = lp[list].slice(); o[list][i] = n;
    put(o, null, 'переброс «' + (r.title || r.label || 'событие') + '»: ' + n.t + (hasFx(n) ? ' (механика — кнопкой «Эффект»)' : ''));
  }
  function applyFx(i) {
    const ev = lp.years[i]; const r = eventFxPatch(c, cat, ev);
    put(setRow('years', i, { fxApplied: true }), r.patch, 'эффект события «' + ev.t + '»' + (r.skipped ? ' — сверх предела, не применён' : ''));
  }
  function addEvent() {
    const ev = rollEventKind(add.kind, add.label.trim() || 'Событие · мастер', undefined, add.text.trim());
    let patch = null;
    if (add.fx && hasFx(ev)) { patch = eventFxPatch(c, cat, ev).patch; ev.fxApplied = true; }
    put({ years: (lp.years || []).concat([ev]) }, patch, 'добавлено: ' + ev.t + (ev.fxApplied ? ' (эффект применён)' : ''));
    setAdd(Object.assign({}, add, { text: '' }));
  }
  function Row(props) {
    const r = props.r; const list = props.list; const i = props.i;
    return <div className="logrow" style={{ gridTemplateColumns: '120px 1fr auto', alignItems: 'start' }}>
      <span className="tm">{props.title}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <input className="n-input" style={{ minHeight: 30 }} defaultValue={r.t} key={r.t} onBlur={function (e) { if (e.target.value !== r.t) put(setRow(list, i, { t: e.target.value }), null, 'правка: ' + e.target.value); }} />
        {(r.kind === 'friend' || r.kind === 'enemy') && <input className="n-input" style={{ minHeight: 28 }} placeholder="кличка" defaultValue={r.nick || ''} key={'n' + (r.nick || '')} onBlur={function (e) { if (e.target.value !== (r.nick || '')) put(setRow(list, i, { nick: e.target.value })); }} />}
        {list === 'years' && hasFx(r) && <span className="hint" style={{ fontSize: 12 }}>{r.fxApplied ? 'механика применена' : 'механика не применена'}</span>}
      </span>
      <span className="row" style={{ gap: 4 }}>
        <button className="btn sm" title="Перебросить строку" onClick={function () { reroll(list, i); }}>d10</button>
        {list === 'years' && hasFx(r) && !r.fxApplied && <button className="btn sm" onClick={function () { applyFx(i); }}>Эффект</button>}
        {(list === 'years' || list === 'extra') && <button className="btn sm" title="Удалить (механику сними вручную)" onClick={function () { if (window.confirm('Удалить строку?')) put(delRow(list, i), null, 'удалено: ' + r.t); }}>×</button>}
      </span>
    </div>;
  }
  if (!open) return <div className="row"><button className="btn" onClick={function () { setOpen(true); }}>Править жизненный путь (мастер)</button>
    {c.lifepath && !c.lifepath.done && <span className="hint">Игрок ещё проходит шаг 7.</span>}</div>;
  return (
    <div className="sec">
      <div className="row" style={{ justifyContent: 'space-between' }}><h3>Жизненный путь · мастер</h3><button className="btn sm" onClick={function () { setOpen(false); }}>Свернуть</button></div>
      <p className="hint">Правка текста и переброс сразу переписывают строки пути в «Био» (дописанное руками остаётся). Механику событий (навыки, деньги, болезни, железо) приложение применяет только кнопкой «Эффект»; при удалении или переброске её нужно снять вручную.</p>
      <div className="row">
        <button className="btn sm" onClick={function () { put({ roots: rollRoots(c.origin) }, null, 'корни заново'); }}>Корни заново</button>
        <button className="btn sm" onClick={function () { put({ inner: rollInner() }, null, '«кто ты внутри» заново'); }}>«Кто ты внутри» заново</button>
      </div>
      <div className="log">
        {lp.roots.map(function (r, i) { return <Row key={'r' + i} r={r} list="roots" i={i} title={r.title} />; })}
        {lp.inner.map(function (r, i) { return <Row key={'i' + i} r={r} list="inner" i={i} title={r.title} />; })}
        {(lp.extra || []).map(function (r, i) { return <Row key={'e' + i} r={r} list="extra" i={i} title={r.title} />; })}
        {lp.years.map(function (r, i) { return <Row key={'y' + i} r={r} list="years" i={i} title={r.label || 'событие'} />; })}
      </div>
      <div className="row">
        <span className="lblm">Штрих</span>
        <select value={ex} onChange={function (e) { setEx(e.target.value); }}>{EXTRA_TABLES.map(function (t) { return <option key={t.key} value={t.key}>{t.title}</option>; })}</select>
        <button className="btn sm" onClick={function () { const n = rollExtra(ex); put({ extra: (lp.extra || []).filter(function (x) { return x.key !== ex; }).concat([n]) }, null, n.title + ': ' + n.t); }}>Бросить</button>
        <span className="hint" style={{ fontSize: 12 }}>не из рулбука, без механики</span>
      </div>
      <div className="row">
        <span className="lblm">Событие</span>
        <select value={add.kind} onChange={function (e) { setAdd(Object.assign({}, add, { kind: e.target.value })); }}>{EVENT_KINDS.map(function (k) { return <option key={k.id} value={k.id}>{k.name}</option>; })}</select>
        <input placeholder="годы, напр. 2033–2035" value={add.label} onChange={function (e) { setAdd(Object.assign({}, add, { label: e.target.value })); }} style={{ width: 150 }} />
        {add.kind === 'custom' && <input placeholder="что случилось" value={add.text} onChange={function (e) { setAdd(Object.assign({}, add, { text: e.target.value })); }} style={{ flex: 1, minWidth: 160 }} />}
        {add.kind !== 'custom' && <label className="lblm"><input type="checkbox" checked={add.fx} onChange={function (e) { setAdd(Object.assign({}, add, { fx: e.target.checked })); }} /> сразу применить механику</label>}
        <button className="btn sm main" onClick={addEvent}>{add.kind === 'custom' ? 'Добавить' : 'Бросить и добавить'}</button>
      </div>
    </div>
  );
}
