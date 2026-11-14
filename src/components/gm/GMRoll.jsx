import React, { useState } from 'react';
import { r1 } from '../../utils/dice';

const DICE = [4, 6, 8, 10, 12, 20, 100];
const CLR = '#8a6200';
const inp = { padding: '5px 7px', border: '2px solid #c6bba3', borderRadius:0, fontSize: 11, fontFamily: "var(--f-body)", background: '#e2d8c3', color: '#211d18', outline: 'none' };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6a6052', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 };

export default function GMRoll(pr) {
  const addLog = pr.addLog;
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState('');
  const [qty, setQty] = useState(1);
  const [die, setDie] = useState(8);
  const [stat, setStat] = useState(0);
  const [skill, setSkill] = useState(0);
  const [res, setRes] = useState(null);

  function roll() {
    const n = Math.max(1, Math.min(30, parseInt(qty) || 1));
    const rolls = [];
    for (let i = 0; i < n; i++) rolls.push(r1(die));
    const sum = rolls.reduce(function (a, b) { return a + b; }, 0);
    const st = parseInt(stat) || 0;
    const sk = parseInt(skill) || 0;
    const total = sum + st + sk;
    const detail = n + 'd' + die + '[' + rolls.join(',') + ']' + (st ? ' + хар(' + st + ')' : '') + (sk ? ' + навык(' + sk + ')' : '') + ' = ' + total;
    setRes({ act: act, total: total, detail: detail });
    if (addLog) addLog({ who: 'ГМ' + (act ? ' — ' + act : ''), type: 'gm_roll', label: detail, detail: '', total: total });
  }

  return (
    <div style={{ border: '2px solid ' + CLR + '40', borderRadius:0, background: '#f0e2b8', overflow: 'hidden' }}>
      <button onClick={function () { setOpen(!open); }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', border: 'none', background: 'none', cursor: 'pointer' }}>
        <span style={{ fontFamily: "var(--f-body)", fontWeight: 700, fontSize: 13, color: CLR }}>Свой бросок ГМ</span>
        <span style={{ fontSize: 11, color: CLR, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div><label style={lbl}>Действие</label><input value={act} onChange={function (e) { setAct(e.target.value); }} placeholder="напр. Скрытность стражника" style={Object.assign({}, inp, { width: '100%' })} /></div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 52 }}><label style={lbl}>Кол-во</label><input type="number" min="1" value={qty} onChange={function (e) { setQty(e.target.value); }} style={Object.assign({}, inp, { width: '100%' })} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>Кость</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {DICE.map(function (d) {
                  const on = die === d;
                  return <button key={d} onClick={function () { setDie(d); }} style={{ padding: '4px 8px', borderRadius:0, border: '2px solid ' + (on ? CLR : '#c6bba3'), background: on ? CLR + '22' : '#e2d8c3', color: on ? CLR : '#6a6052', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>{'d' + d}</button>;
                })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1 }}><label style={lbl}>+ Характеристика (число)</label><input type="number" value={stat} onChange={function (e) { setStat(e.target.value); }} style={Object.assign({}, inp, { width: '100%' })} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>+ Навык (число)</label><input type="number" value={skill} onChange={function (e) { setSkill(e.target.value); }} style={Object.assign({}, inp, { width: '100%' })} /></div>
          </div>
          <button onClick={roll} style={{ padding: 10, borderRadius:0, border: 'none', background: CLR, color: '#f0e2b8', fontFamily: "var(--f-body)", fontWeight:700, fontSize: 13, cursor: 'pointer' }}>Бросить {qty + 'd' + die}{(parseInt(stat) || 0) ? ' +' + (parseInt(stat) || 0) : ''}{(parseInt(skill) || 0) ? ' +' + (parseInt(skill) || 0) : ''}</button>
          {res && (
            <div style={{ background: '#f1ead9', border: '1px solid ' + CLR + '30', borderRadius:0, padding: '8px 10px', textAlign: 'center' }}>
              {res.act && <div style={{ fontSize: 10, color: CLR, fontWeight: 700, marginBottom: 2 }}>{res.act}</div>}
              <div style={{ fontSize: 11, color: '#6a6052', fontFamily: 'monospace', marginBottom: 3 }}>{res.detail}</div>
              <div style={{ fontFamily: "var(--f-body)", fontWeight:700, fontSize: 30, color: '#211d18' }}>{res.total}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
