import React from 'react';
import { CONDITIONS, condByKey, condsOf, addCond, removeCond, condLabel } from '../utils/conditions';

/* Значки состояний (опутан, оглох, горит…). edit — мастер: добавить и
   снять. self — сам персонаж: «Выпутаться» и «Потушить». */
export default function CondBar(pr) {
  const t = pr.target || {}; const list = condsOf(t);
  if (!list.length && !pr.edit) return null;
  function set(conds, label) { pr.onChange(conds, label); }
  return (
    <div className="condbar">
      {list.map(function (x) {
        const d = condByKey(x.key);
        return <span key={x.key} className={'cond c-' + x.key} title={d.text}>
          <b>{d.icon}</b>{condLabel(x)}
          {pr.self && d.escape && <button onClick={function () { pr.onEscape && pr.onEscape(d); }}>{'выпутаться · ' + d.escape.skill + ' СЛ ' + d.escape.dc}</button>}
          {pr.self && x.key === 'fire' && <button onClick={function () { set(removeCond(t, 'fire'), 'потушил себя (ход)'); }}>потушить</button>}
          {pr.edit && <button title="Снять" onClick={function () { set(removeCond(t, x.key), 'снято: ' + d.name); }}>×</button>}
        </span>;
      })}
      {pr.edit && <select value="" onChange={function (e) { const k = e.target.value; if (!k) return; set(addCond(t, k, pr.src || 'мастер'), condByKey(k).name); }}>
        <option value="">+ состояние</option>
        {CONDITIONS.map(function (c) { return <option key={c.key} value={c.key} title={c.text}>{c.name}</option>; })}
      </select>}
    </div>
  );
}
