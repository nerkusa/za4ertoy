import React, { useState } from 'react';
import { getTraits } from '../../utils/traitStore';
import { CASS_KINDS, CASS_CLASSES } from '../../data/gear';
import { ALL_SKILLS } from '../../data/stats';
import { CAPACITIES, CONDITIONS, COMBAT_SKILLS, milOnly, cassDef, cassLabel, makeCassette } from '../../utils/cassettes';

/* Форма выдачи кассеты мастером (ТЗ v4, п.15.2) */
function CassetteGrant(pr) {
  const c = pr.char; const cat = getTraits();
  const [f, setF] = useState({ key: (cat.cassettes[0] || {}).key || 'custom', kind: 'copy', cls: '', capacity: '', year: '', condition: 'good', imprint: 0, amount: 2, skill: '' });
  function set(k, v) { setF(Object.assign({}, f, { [k]: v })); }
  const def = f.key === 'custom' ? null : cat.cassettes.find(function (x) { return x.key === f.key; });
  const lockMil = def ? milOnly(def) : COMBAT_SKILLS.indexOf(f.skill) >= 0;
  const kinds = CASS_KINDS.filter(function (k) { return !(def && def.origOnly) || k.id === 'orig' || k.id === 'fake'; });
  const kind = kinds.some(function (k) { return k.id === f.kind; }) ? f.kind : kinds[0].id;
  const cls = lockMil ? 'MIL' : (f.cls || (def ? def.cls : 'CIVIL'));
  const cap = kind === 'slep' ? 128 : (parseInt(f.capacity) || (def ? def.cap : 32));
  function pick(key) { setF(Object.assign({}, f, { key: key, cls: '', capacity: '' })); }
  function give() {
    if (f.key === 'custom' && !String(f.title || '').trim()) { alert('Назови запись'); return; }
    const x = makeCassette(Object.assign({}, f, { kind: kind, cls: cls, capacity: cap }), cat);
    pr.saveChar(c._fbId, Object.assign({}, c, { cassettes: (c.cassettes || []).concat([x]) }));
    const d = cassDef(x, cat);
    if (pr.addLog) pr.addLog({ who: 'ГМ', type: 'give', label: 'ГМ выдал кассету «' + d.name + '» ' + cassLabel(x, d, false).slice(d.name.length + 1) + ' → ' + (c.name || '?'), detail: '', total: 0 });
    pr.log('Выдал кассету', (c.name || '?') + ': ' + cassLabel(x, d, true) + (x.kind === 'slep' ? ', донор ' + (x.donor || '?') + ', Отпечаток ' + x.imprint : ''));
  }
  const inp = { fontSize: 13, padding: '3px 6px' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="row">
        <label className="lblm">Запись</label>
        <select value={f.key} onChange={function (e) { pick(e.target.value); }} style={{ flex: 1, minWidth: 140 }}>
          {cat.cassettes.map(function (x) { return <option key={x.key} value={x.key}>{x.name + ' · ' + x.cls}</option>; })}
          <option value="custom">Своя запись…</option>
        </select>
      </div>
      {f.key === 'custom' && <div className="row">
        <input placeholder="Название" value={f.title || ''} onChange={function (e) { set('title', e.target.value); }} style={Object.assign({ flex: 1, minWidth: 120 }, inp)} />
        <select value={f.skill || ''} onChange={function (e) { set('skill', e.target.value); }} style={inp}><option value="">навык — нет</option>{ALL_SKILLS.map(function (s) { return <option key={s} value={s}>{s}</option>; })}</select>
        {f.skill && <input type="number" value={f.amount} onChange={function (e) { set('amount', e.target.value); }} style={Object.assign({ width: 52 }, inp)} />}
        <input placeholder="Что даёт (текст)" value={f.effect || ''} onChange={function (e) { set('effect', e.target.value); }} style={Object.assign({ flex: 2, minWidth: 140 }, inp)} />
        <input placeholder="Шум (текст)" value={f.noise || ''} onChange={function (e) { set('noise', e.target.value); }} style={Object.assign({ flex: 1, minWidth: 120 }, inp)} />
      </div>}
      <div className="row">
        <select value={kind} onChange={function (e) { set('kind', e.target.value); }} style={inp}>{kinds.map(function (k) { return <option key={k.id} value={k.id}>{k.name}</option>; })}</select>
        <select value={cls} disabled={lockMil} title={lockMil ? 'Записи на характеристики и боевые — только MIL' : ''} onChange={function (e) { set('cls', e.target.value); }} style={inp}>{CASS_CLASSES.map(function (k) { return <option key={k} value={k}>{k}</option>; })}</select>
        <select value={cap} disabled={kind === 'slep'} title={kind === 'slep' ? 'Слепок — только 128' : ''} onChange={function (e) { set('capacity', e.target.value); }} style={inp}>{CAPACITIES.map(function (k) { return <option key={k} value={k}>{k}</option>; })}</select>
        <input placeholder="год записи" value={f.year} onChange={function (e) { set('year', e.target.value); }} style={Object.assign({ width: 90 }, inp)} />
        <select value={f.condition} onChange={function (e) { set('condition', e.target.value); }} style={inp}>{CONDITIONS.map(function (k) { return <option key={k.id} value={k.id}>{k.name}</option>; })}</select>
      </div>
      {f.condition !== 'good' && <span className="hint">{f.condition === 'worn' ? 'Затёртая: бонус −1 (не ниже +1).' : 'Битая: бонус −1; в «Конце сессии» d10, на 1 — Пробой.'}</span>}
      {kind === 'slep' && <div className="row">
        <input placeholder="Кличка донора" value={f.donor || ''} onChange={function (e) { set('donor', e.target.value); }} style={Object.assign({ flex: 1, minWidth: 110 }, inp)} />
        <input placeholder="Навык донора (+3)" value={f.donorSkill || ''} onChange={function (e) { set('donorSkill', e.target.value); }} style={Object.assign({ flex: 1, minWidth: 110 }, inp)} />
        <label className="lblm">Отпечаток</label>
        <select value={f.imprint} onChange={function (e) { set('imprint', e.target.value); }} style={inp}>{[0, 1, 2, 3, 4, 5].map(function (k) { return <option key={k} value={k}>{k}</option>; })}</select>
        <input placeholder="Что знал донор" value={f.donorKnows || ''} onChange={function (e) { set('donorKnows', e.target.value); }} style={Object.assign({ flex: '1 1 100%' }, inp)} />
        <input placeholder="Странность на 1-м уровне" value={f.quirk1 || ''} onChange={function (e) { set('quirk1', e.target.value); }} style={Object.assign({ flex: 1, minWidth: 140 }, inp)} />
        <input placeholder="Странность на 3-м уровне" value={f.quirk3 || ''} onChange={function (e) { set('quirk3', e.target.value); }} style={Object.assign({ flex: 1, minWidth: 140 }, inp)} />
      </div>}
      {kind === 'fake' && <span className="hint">Палёнка изображает оригинал этой записи: игрок видит «оригинал» и цену оригинала. При вставке сервер бросает скрытый d10 — результат только в журнале мастера.</span>}
      <div className="row"><button className="btn sm" onClick={give}>Выдать кассету</button></div>
    </div>
  );
}

export default CassetteGrant;
