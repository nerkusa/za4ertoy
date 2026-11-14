import React, { useState } from 'react';
import { getProfs } from '../../utils/profStore';
import { ORIGINS } from '../../data/professions';
import { ALL_SKILLS } from '../../data/stats';
import LiveField from '../LiveField';

/* Профессии (правятся) и два варианта происхождения (по книге). */
export default function ProfEditor(pr) {
  const profs = getProfs();
  const [open, setOpen] = useState(null);
  function save(l) { pr.saveProfs(l); }
  function upd(id, patch) { save(profs.map(function (p) { return p.id === id ? Object.assign({}, p, patch) : p; })); }
  function add() { const id = 'prof_' + Date.now().toString(36); save(profs.concat([{ id: id, name: 'Новая профессия', skills: [], kit: '', desc: '' }])); setOpen(id); }
  function toggleSkill(p, s) { const has = (p.skills || []).indexOf(s) >= 0; upd(p.id, { skills: has ? p.skills.filter(function (x) { return x !== s; }) : (p.skills || []).concat([s]) }); }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>Профессии и происхождение</h2><div className="row"><button className="btn sm" onClick={add}>Добавить профессию</button><button className="btn sm" onClick={function () { if (window.confirm('Вернуть книжные профессии?')) pr.saveProfs(null); }}>Вернуть книжные</button></div></div>
      <h3>Происхождение</h3>
      <div className="gm-cards">{ORIGINS.map(function (o) { return <div key={o.id} className="card"><div className="ch"><b>{o.name}</b><span>{o.age}</span></div><div className="cb">{o.rules.map(function (r, i) { return <p key={i}>{r}</p>; })}</div></div>; })}</div>
      <h3>Профессии</h3>
      <div className="gm-cards">
        {profs.filter(function (p) { return p.id !== 'none'; }).map(function (p) {
          const isOpen = open === p.id;
          return (
            <div key={p.id} className="card">
              <div className="ch"><b>{p.name}</b><span>+2 к трём навыкам</span></div>
              <div className="cb">
                <dl className="kv"><dt>Навыки</dt><dd>{(p.skills || []).join(', ') || '—'}</dd><dt>Набор</dt><dd>{p.kit || '—'}</dd></dl>
                <div className="row"><button className="btn sm" onClick={function () { setOpen(isOpen ? null : p.id); }}>{isOpen ? 'Закрыть' : 'Править'}</button><button className="btn sm" onClick={function () { if (window.confirm('Удалить профессию ' + p.name + '?')) save(profs.filter(function (x) { return x.id !== p.id; })); }}>Удалить</button></div>
                {isOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="n-field"><label>Название</label><LiveField className="n-input" value={p.name} onCommit={function (v) { upd(p.id, { name: v }); }} /></div>
                  <span className="lblm">Навыки +2</span>
                  <div className="zones">{ALL_SKILLS.map(function (s) { return <button key={s} className={(p.skills || []).indexOf(s) >= 0 ? 'on' : ''} onClick={function () { toggleSkill(p, s); }}>{s}</button>; })}</div>
                  <div className="n-field"><label>Стартовый набор</label><LiveField tag="textarea" value={p.kit || ''} onCommit={function (v) { upd(p.id, { kit: v }); }} style={{ width: '100%', minHeight: 50 }} /></div>
                </div>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="hint">Бонусы профессии и происхождения вписываются в лист вручную при создании персонажа.</p>
    </div>
  );
}
