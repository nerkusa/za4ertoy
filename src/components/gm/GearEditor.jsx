import React, { useState } from 'react';
import { getTraits } from '../../utils/traitStore';
import { GEAR_DEFAULTS, CASS_CLASSES } from '../../data/gear';
import { EFFECT_TYPES, genId } from '../../data/traits';
import { SD, ALL_SKILLS } from '../../data/stats';
import LiveField from '../LiveField';

const TABS = [['cassettes', 'Кассеты'], ['tips', 'Насадки'], ['implants', 'Вживляемое и накладное']];
const IMPL_KINDS = [['implant', 'вживляемое'], ['addon', 'накладное'], ['full', 'полная замена']];

function effSummary(effs) {
  return (effs || []).map(function (e) {
    if (e.type === 'stat_bonus') return (e.amount > 0 ? '+' : '') + e.amount + ' ' + ((SD.find(function (s) { return s.key === e.stat; }) || {}).full || e.stat);
    if (e.type === 'skill_bonus') return (e.amount > 0 ? '+' : '') + e.amount + ' ' + e.skill;
    if (e.type === 'hp_flat') return (e.amount > 0 ? '+' : '') + e.amount + ' Здоровье';
    if (e.type === 'stat_set') return 'Тело ' + e.value;
    if (e.type === 'free_overcome_fear') return 'пересиливает страх';
    if (e.type === 'aim_bonus') return 'прицел −' + e.amount;
    return e.type;
  }).join(', ');
}

/* Редактор эффектов (бывший редактор черт): кассеты и солюшны.
   Эффекты stat_bonus / skill_bonus / hp_flat сами попадают в проверки и бой. */
export default function GearEditor(pr) {
  const cat = getTraits();
  const [tab, setTab] = useState('cassettes');
  const [open, setOpen] = useState(null);
  const list = cat[tab] || [];

  function persist(next) { pr.saveTraits(Object.assign({ cassettes: cat.cassettes, tips: cat.tips, implants: cat.implants }, next)); }
  function setList(l) { const o = {}; o[tab] = l; persist(o); }
  function upd(key, patch) { setList(list.map(function (x) { return x.key === key ? Object.assign({}, x, patch) : x; })); }
  function add() {
    const key = genId();
    const base = tab === 'cassettes' ? { key: key, name: 'Новая кассета', cls: 'CIVIL', cap: 32, effects: [], text: '', price: 80 }
      : tab === 'tips' ? { key: key, name: 'Новая насадка', effects: [], text: '' }
        : { key: key, name: 'Новый солюшн', kind: 'implant', nest: 1, steps: 1, price: 300, effects: [], text: '' };
    setList(list.concat([base])); setOpen(key);
  }
  function del(key) { if (window.confirm('Удалить из каталога эффектов? У персонажей, у кого это уже есть, эффект пропадёт.')) setList(list.filter(function (x) { return x.key !== key; })); }
  function reset() { if (window.confirm('Вернуть весь каталог эффектов к книжному? Свои правки пропадут.')) pr.saveTraits(null); }

  function effRow(x, e, i) {
    function ue(patch) { upd(x.key, { effects: x.effects.map(function (y, j) { return j === i ? Object.assign({}, y, patch) : y; }) }); }
    const known = EFFECT_TYPES.some(function (t) { return t.id === e.type; });
    return (
      <div key={i} className="row">
        {known ? <select value={e.type} onChange={function (ev) { ue({ type: ev.target.value }); }}>{EFFECT_TYPES.map(function (t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</select> : <span className="pill">{effSummary([e])}</span>}
        {e.type === 'stat_bonus' && <select value={e.stat || 'telo'} onChange={function (ev) { ue({ stat: ev.target.value }); }}>{SD.map(function (s) { return <option key={s.key} value={s.key}>{s.full}</option>; })}</select>}
        {e.type === 'skill_bonus' && <select value={e.skill || ALL_SKILLS[0]} onChange={function (ev) { ue({ skill: ev.target.value }); }}>{ALL_SKILLS.map(function (s) { return <option key={s} value={s}>{s}</option>; })}</select>}
        {known && <LiveField type="number" value={e.amount || 0} onCommit={function (v) { ue({ amount: parseInt(v) || 0 }); }} style={{ width: 64 }} />}
        <button className="btn sm" onClick={function () { upd(x.key, { effects: x.effects.filter(function (y, j) { return j !== i; }) }); }}>убрать</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Редактор эффектов</h2>
        <button className="btn sm" onClick={reset}>Вернуть книжный каталог</button>
      </div>
      <p className="hint">Кассеты и солюшны с эффектами. Бонусы к характеристикам и навыкам сами участвуют в проверках и в бою. Текст — подсказка игроку, мастер применяет его сам.</p>
      <div className="row">{TABS.map(function (t) { return <button key={t[0]} className={'btn' + (tab === t[0] ? ' main' : '')} onClick={function () { setTab(t[0]); setOpen(null); }}>{t[1]}</button>; })}<button className="btn" onClick={add}>Добавить</button></div>
      <div className="gm-cards">
        {list.map(function (x) {
          const isOpen = open === x.key;
          return (
            <div key={x.key} className="card">
              <div className="ch"><b>{x.name}</b><span>{tab === 'cassettes' ? x.cls + ' · ' + x.cap : tab === 'implants' ? ((IMPL_KINDS.find(function (k) { return k[0] === x.kind; }) || [])[1] || '') + ' · гнёзд ' + (x.nest || 0) : 'насадка'}</span></div>
              <div className="cb">
                <p>{[effSummary(x.effects), x.text].filter(Boolean).join(' · ') || 'без эффекта'}</p>
                <div className="row"><button className="btn sm" onClick={function () { setOpen(isOpen ? null : x.key); }}>{isOpen ? 'Закрыть' : 'Править'}</button><button className="btn sm" onClick={function () { del(x.key); }}>Удалить</button></div>
                {isOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="n-field"><label>Название</label><LiveField className="n-input" value={x.name} onCommit={function (v) { upd(x.key, { name: v }); }} /></div>
                  {tab === 'cassettes' && <div className="row">
                    <div className="n-field"><label>Класс</label><select value={x.cls} onChange={function (e) { upd(x.key, { cls: e.target.value }); }}>{CASS_CLASSES.map(function (c) { return <option key={c} value={c}>{c}</option>; })}</select></div>
                    <div className="n-field"><label>Ёмкость</label><LiveField type="number" value={x.cap} onCommit={function (v) { upd(x.key, { cap: parseInt(v) || 0 }); }} style={{ width: 80 }} /></div>
                    <label style={{ fontSize: 13 }}><input type="checkbox" checked={!!x.origOnly} onChange={function (e) { upd(x.key, { origOnly: e.target.checked }); }} /> только оригинал</label>
                  </div>}
                  {tab === 'implants' && <div className="row">
                    <div className="n-field"><label>Вид</label><select value={x.kind} onChange={function (e) { const k = e.target.value; upd(x.key, { kind: k, nest: k === 'addon' ? 0 : (x.nest || 1), steps: k === 'addon' ? 0 : (x.steps || 1) }); }}>{IMPL_KINDS.map(function (k) { return <option key={k[0]} value={k[0]}>{k[1]}</option>; })}</select></div>
                    <div className="n-field"><label>Гнёзд</label><LiveField type="number" value={x.nest || 0} onCommit={function (v) { upd(x.key, { nest: Math.max(0, parseInt(v) || 0) }); }} style={{ width: 70 }} /></div>
                    <div className="n-field"><label>Шагов железа</label><LiveField type="number" value={x.steps || 0} onCommit={function (v) { upd(x.key, { steps: Math.max(0, parseInt(v) || 0) }); }} style={{ width: 70 }} /></div>
                  </div>}
                  <span className="lblm">Эффекты</span>
                  {(x.effects || []).map(function (e, i) { return effRow(x, e, i); })}
                  <div><button className="btn sm" onClick={function () { upd(x.key, { effects: (x.effects || []).concat([{ type: 'skill_bonus', skill: ALL_SKILLS[0], amount: 1 }]) }); }}>Добавить эффект</button></div>
                  <div className="n-field"><label>Текст</label><LiveField tag="textarea" value={x.text || ''} onCommit={function (v) { upd(x.key, { text: v }); }} style={{ width: '100%', minHeight: 50 }} /></div>
                </div>}
              </div>
            </div>
          );
        })}
      </div>
      {cat === GEAR_DEFAULTS && <p className="hint">Сейчас действует книжный каталог. Первая правка сохранит свой вариант для этого мира.</p>}
    </div>
  );
}
