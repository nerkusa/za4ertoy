import React from 'react';
import { FACTIONS, REP_LABEL, LEAN } from '../../data/factions';

/* Фракции за трактом (глава 11): карточки, отношение партии −3…+3,
   к кому склоняется фракция перед войной (заметка мастера). Хранится в
   мире: factions = { [id]: { rep, lean } }. */
export default function FactionsPanel(pr) {
  const st = pr.factions || {};
  function put(id, patch) { const n = Object.assign({}, st); n[id] = Object.assign({ rep: 0, lean: 'neutral' }, st[id] || {}, patch); pr.saveFactions(n); }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Фракции за трактом</h2>
      <p className="hint">Отношение партии к фракции, −3…+3, видят игроки на листе в «Репутации». При −3 NPC этой фракции нападают сразу. При +3 у фракции можно торговать по её ценам. Баланс перед войной — заметка мастера, на механику не влияет.</p>
      <div className="gm-cards">
        {FACTIONS.map(function (f) {
          const s = Object.assign({ rep: 0, lean: 'neutral' }, st[f.id] || {}); const rep = s.rep || 0;
          return (
            <div key={f.id} className="card">
              <div className="ch"><b>{f.name}</b><span>{'знак: ' + f.sign}</span></div>
              <div className="cb">
                <dl className="kv">
                  <dt>Вожак</dt><dd>{f.leader}</dd><dt>Сила</dt><dd>{f.power}</dd><dt>Где</dt><dd>{f.where}</dd>
                  <dt>Чем живут</dt><dd>{f.lives}</dd><dt>Чего хотят</dt><dd>{f.wants}</dd>
                  <dt>С Полисом</dt><dd>{f.polis}</dd><dt>С Ордой</dt><dd>{f.horde}</dd><dt>С остальными</dt><dd>{f.others}</dd>
                </dl>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="lblm">Партия</span>
                  <span className="row"><span className="pm" style={{ marginLeft: 0 }}><button disabled={rep <= -3} onClick={function () { put(f.id, { rep: rep - 1 }); }}>−</button></span>
                    <b className="mono" style={{ minWidth: 110, textAlign: 'center' }}>{(rep > 0 ? '+' : '') + rep + ' · ' + REP_LABEL[String(rep)]}</b>
                    <span className="pm" style={{ marginLeft: 0 }}><button disabled={rep >= 3} onClick={function () { put(f.id, { rep: rep + 1 }); }}>+</button></span></span>
                </div>
                {rep <= -3 && <div className="warnbox">Враги: NPC этой фракции нападают сразу.</div>}
                {rep >= 3 && <div className="okbox">{'Свои: торговля по ценам фракции' + (f.trade ? ' — ' + f.trade : '') + '.'}</div>}
                <div className="row"><span className="lblm">Перед войной склоняется</span>
                  {LEAN.map(function (l) { return <button key={l.id} className={'btn sm' + (s.lean === l.id ? ' main' : '')} onClick={function () { put(f.id, { lean: l.id }); }}>{l.name}</button>; })}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
