import React, { useState } from 'react';
import { GM_TABLES, tableRow } from '../../data/gmTables';
import { rollTrinket } from '../../data/trinkets';
import { r1 } from '../../utils/dice';

/* Вкладка мастера «Таблицы»: бросок по таблицам книги и кампании.
   Результат видит только мастер, пока не нажмёт «В лог всем». */
export default function TablesPanel(pr) {
  const [res, setRes] = useState({});
  const groups = []; GM_TABLES.forEach(function (t) { if (groups.indexOf(t.group) < 0) groups.push(t.group); });
  const [open, setOpen] = useState(null);
  function roll(tb) {
    const n = r1(tb.die); const row = tableRow(tb, n);
    const text = Array.isArray(row) ? tb.cols.map(function (c, i) { return c + ': ' + row[i]; }).join(' · ') : row;
    setRes(Object.assign({}, res, { [tb.key]: { n: n, text: text } }));
    if (pr.addGmLog) pr.addGmLog({ who: pr.myName || 'ГМ', label: tb.title + ' · d' + tb.die + ' = ' + n, detail: text });
  }
  function trinket() { const t = rollTrinket(r1); setRes(Object.assign({}, res, { trinket: { n: t.roll, text: t.item.desc } })); }
  function pub(tb, r) { if (pr.addLog) pr.addLog({ who: 'ГМ', type: 'give', label: tb + ': ' + r.text, detail: 'бросок ' + r.n, total: 0 }); }
  function Card(tb) {
    const r = res[tb.key]; const isOpen = open === tb.key;
    return <div key={tb.key} className="card"><div className="ch"><b>{tb.title}</b><span>{'d' + tb.die + ' · ' + tb.source}</span></div><div className="cb">
      <div className="row"><button className="btn main" onClick={function () { roll(tb); }}>{'Бросить d' + tb.die}</button>
        {r && <button className="btn sm" onClick={function () { pub(tb.title, r); }}>В лог всем</button>}
        <button className="btn sm" onClick={function () { setOpen(isOpen ? null : tb.key); }}>{isOpen ? 'Скрыть таблицу' : 'Вся таблица'}</button></div>
      {r && <div className="okbox"><b className="mono">{r.n}</b>{' — ' + r.text}</div>}
      {isOpen && <div className="log">{tb.rows.map(function (x, i) {
        const k = x && typeof x === 'object' && !Array.isArray(x) ? (x.min === x.max ? '' + x.min : x.min + '–' + x.max) : '' + (i + 1);
        const t = x && typeof x === 'object' && !Array.isArray(x) ? x.t : Array.isArray(x) ? x.join(' / ') : x;
        return <div key={i} className="logrow" style={{ gridTemplateColumns: '40px 1fr' }}><span className="tm">{k}</span><span>{t}</span></div>;
      })}</div>}
    </div></div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Таблицы</h2>
      <p className="hint">Бросок видишь только ты (и он пишется в «Историю»). Игрокам — кнопкой «В лог всем».</p>
      {groups.map(function (g) { return <div key={g} className="sec"><h3>{g === 'Падение Запада' ? 'Кампания «Падение Запада»' : 'Из книги'}</h3>
        <div className="gm-cards">{GM_TABLES.filter(function (t) { return t.group === g; }).map(Card)}
          {g === 'Книга' && <div className="card"><div className="ch"><b>Безделушка</b><span>d30 · гл. 9</span></div><div className="cb"><div className="row"><button className="btn main" onClick={trinket}>Бросить d30</button>{res.trinket && <button className="btn sm" onClick={function () { pub('Безделушка', res.trinket); }}>В лог всем</button>}</div>{res.trinket && <div className="okbox"><b className="mono">{res.trinket.n}</b>{' — ' + res.trinket.text}</div>}</div></div>}
        </div></div>; })}
    </div>
  );
}
