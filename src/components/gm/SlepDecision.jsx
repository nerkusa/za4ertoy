import React, { useState } from 'react';
import { cF } from '../../utils/character';
import { slepDecision, vydOf, captureNpc } from '../../utils/slep';

/* Окно мастера: Выдержка 0 — захват; Отпечаток 5 — захват или сплав (п.20) */
function SlepDecision(pr) {
  const [later, setLater] = useState({});
  const list = (pr.characters || []).map(function (c) { return { c: c, d: slepDecision(c) }; }).filter(function (e) { return e.d && !later[e.c._fbId + ':' + e.d.type + ':' + (e.d.cass ? e.d.cass.id : '')]; });
  if (!list.length) return null;
  const c = list[0].c; const d = list[0].d; const key = c._fbId + ':' + d.type + ':' + (d.cass ? d.cass.id : '');
  function gmLog(label, detail) { if (pr.addGmLog) pr.addGmLog({ who: pr.myName || 'ГМ', target: c.name || '?', label: label, detail: detail || '' }); }
  function capture() {
    if (!window.confirm('Захват: ' + (c.name || '?') + ' переходит к мастеру. Подтвердить?')) return;
    const npc = captureNpc(c, cF(c), d.cass);
    const t = Object.assign({}, pr.npcTempl || {});
    const grp = Object.assign({ _created: Date.now() }, t['Захваченные'] || {});
    grp['captured_' + c._fbId + '_' + Date.now().toString(36)] = npc;
    t['Захваченные'] = grp;
    pr.saveNpcTempl(t);
    pr.saveChar(c._fbId, Object.assign({}, c, { captured: { by: d.donor, ts: Date.now() }, active: false }));
    if (pr.addLog) pr.addLog({ who: c.name || '?', type: 'noise', label: 'Захвачен донором «' + d.donor + '»', detail: 'личности носителя больше нет — персонаж у мастера', total: 0 });
    gmLog('Захват', (c.name || '?') + ' → NPC «' + npc.name + '» (Бестиарий, «Захваченные»)');
  }
  function fuse() {
    pr.saveChar(c._fbId, Object.assign({}, c, { cassettes: (c.cassettes || []).map(function (x) { return x.id === d.cass.id ? Object.assign({}, x, { fused: true }) : x; }) }));
    if (pr.addLog) pr.addLog({ who: c.name || '?', type: 'gear', label: 'Сплав со слепком «' + d.donor + '»', detail: 'навык слепка остаётся; характер переписывают игрок и мастер', total: 0 });
    gmLog('Сплав', (c.name || '?') + ' и «' + d.donor + '»');
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 995, padding: 16 }}>
      <div className="card" style={{ maxWidth: 440, width: '100%' }}>
        <div className="ch"><b>{d.type === 'zero' ? 'Захват' : 'Край: Отпечаток 5'}</b><span>{c.name || '?'}</span></div>
        <div className="cb" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.type === 'zero'
            ? <p className="hint">{'Выдержка 0: слепок «' + d.donor + '» съел носителя. Персонаж переходит к мастеру — в Бестиарий, группа «Захваченные».'}</p>
            : <p className="hint">{'Слепок «' + d.donor + '» дошёл до Края. Выдержка ' + vydOf(c) + (d.fusion ? ' — можно выбрать захват или сплав.' : ' — меньше 3, сплав невозможен: только захват.')}</p>}
          <div className="row">
            <button className="btn main" onClick={capture}>{d.type === 'zero' ? 'Захват: персонаж переходит к мастеру' : 'Захват'}</button>
            {d.type === 'edge' && d.fusion && <button className="btn" onClick={fuse}>Сплав</button>}
            <button className="btn" onClick={function () { setLater(Object.assign({}, later, { [key]: true })); }}>Позже</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlepDecision;
