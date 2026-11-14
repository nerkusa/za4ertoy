import React, { useState } from 'react';
import { ARMOR_T, SHIELD_T } from '../../data/combat';
import { DT, WT } from '../../data/stats';
import { uid } from '../../utils/dice';
import { priceNum, fmtMoney } from '../../utils/currency';
import { CASS_KINDS, BRACELETS } from '../../data/gear';
import { getTraits } from '../../utils/traitStore';
import { buildShopDefaults, buildMiscDefaults } from '../../data/shopDefaults';
import LiveField from '../LiveField';

const backBtn = { padding: '5px 12px', borderRadius:0, border: '2px solid #c6bba3', background: '#f1ead9', color: '#211d18', fontWeight: 700, fontSize: 11, cursor: 'pointer' };
const inp = { width: '100%', padding: '6px 8px', border: '2px solid #c6bba3', borderRadius:0, fontSize: 12, fontFamily: "var(--f-body)", background: '#e2d8c3', color: '#211d18', outline: 'none' };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6a6052', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 };

const CATS = [
  { id: 'weapon', name: 'Оружие', color: '#8a3b22' },
  { id: 'armor', name: 'Броня', color: '#3f6b34' },
  { id: 'shield', name: 'Щиты', color: '#4f5b2a' },
  { id: 'item', name: 'Вещи', color: '#8a6200' },
  { id: 'ammo', name: 'Патроны', color: '#5a4a2a' },
  { id: 'cassette', name: 'Кассеты', color: '#211d18' },
  { id: 'solution', name: 'Солюшны', color: '#6b2f4a' },
];
const SOL_KINDS = [{ id: 'bracelet', name: 'Браслет' }, { id: 'arm', name: 'Протез руки' }, { id: 'hvatka', name: '«Хватка»' }, { id: 'leg', name: 'Нога «Опора»' }, { id: 'tip', name: 'Насадка' }, { id: 'implant', name: 'Вживляемое / накладное' }];

const PROJ_TYPES = ['Пуля', 'Болт', 'Стрела'];

const REPAIR_DICE = ['1d4', '1d6', '1d8', '1d10', '1d12'];
const HEAL_DICE = ['1d4', '1d6', '2d4', '2d6', '3d6', '4d6'];

// подкатегории для группировки — броня делится и по ярусу (лёгкая/средняя/тяжёлая), и по слоту (голова/тело),
// чтобы список не открывался одним гигантским полотном
const SUBLABEL = {
  armor: {
    'light-head': 'Шлем лёгкий', 'light-body': 'Доспех лёгкий',
    'medium-head': 'Шлем средний', 'medium-body': 'Доспех средний',
    'heavy-head': 'Шлем тяжёлый', 'heavy-body': 'Доспех тяжёлый',
  },
  weapon: { Battle: 'Боевое оружие', Simple: 'Простое оружие', Guns: 'Огнестрел', Archery: 'Лук', Thrown: 'Метательное', Brawl: 'Рукопашное' },
  shield: { light: 'Щит лёгкий', medium: 'Щит средний', tower: 'Щит тяжёлый' },
  item: { potion: 'Зелья и тоники', ammo: 'Боеприпасы', repair: 'Ремкомплекты', misc: 'Бытовые вещи' },
};
const SUBORDER_BASE = { armor: ['light-head', 'light-body', 'medium-head', 'medium-body', 'heavy-head', 'heavy-body'], weapon: ['Battle', 'Simple', 'Guns', 'Archery', 'Thrown', 'Brawl'], shield: ['light', 'medium', 'tower'], item: ['potion', 'ammo', 'repair', 'misc'] };
const SLOT_LABEL = { head: 'Голова', body: 'Тело' };
const SUBORDER = Object.assign({}, SUBORDER_BASE, { item: ['potion', 'repair', 'misc'] });
function itemSubOf(it) { if (it.heal || it.doseHeal) return 'potion'; if (it.ptype || it.cat === 'ammo') return 'ammo'; if (it.dice || it.cat === 'tool') return 'repair'; return 'misc'; }
function subOf(it) { if (it.cat === 'armor') return (it.type || 'light') + '-' + (it.slot || 'body'); if (it.cat === 'shield') return it.type; if (it.cat === 'weapon') return it.wtype; if (it.cat === 'item' || it.cat === 'tool') return itemSubOf(it); return null; }

function field(label, node) { return <div style={{ flex: 1 }}><label style={lbl}>{label}</label>{node}</div>; }
function priceOf(it) { return priceNum(it.price); }

export default function ShopEditor(pr) {
  const shop = Array.isArray(pr.shop) ? pr.shop : [];
  const saveShop = pr.saveShop;
  const [cat, setCat] = useState('armor');
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const persist = function (arr) { saveShop(arr); };
  const upd = function (id, patch) { persist(shop.map(function (i) { return i.id === id ? Object.assign({}, i, patch) : i; })); };
  const del = function (id) { if (window.confirm('Удалить вещь из магазина?')) persist(shop.filter(function (i) { return i.id !== id; })); };
  const priceField = function (it) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {field('Цена, ер.', <LiveField type="number" min="0" value={priceOf(it)} onCommit={function (val) { upd(it.id, { price: Math.max(0, parseInt(val) || 0) }); }} style={inp} />)}
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, paddingBottom: 8, whiteSpace: 'nowrap' }}><input type="checkbox" checked={!!it.notForSale} onChange={function (e) { upd(it.id, { notForSale: e.target.checked }); }} />не продаётся (только выдача)</label>
      </div>
    );
  };
  const add = function () {
    const base = {
      armor: { cat: 'armor', name: 'Новая броня', type: 'light', slot: 'body', hp: 10, price: 0, desc: '' },
      weapon: { cat: 'weapon', name: 'Новое оружие', wtype: 'Battle', dmgDice: '1d6', dmgType: 'Р', hands: 1, bonus: 0, dmgDice2h: '2d6', bonus2h: 0, price: 0, desc: '' },
      shield: { cat: 'shield', name: 'Новый щит', type: 'light', hp: 15, price: 0, desc: '' },
      item: { cat: 'item', name: 'Новый предмет', desc: '', price: 0, ptype: '', dice: '' },
      ammo: { cat: 'ammo', name: 'Патроны', desc: '', price: 10, ptype: 'Пуля', bundleQty: 10 },
      cassette: { cat: 'cassette', name: 'Новая кассета', gearKey: (getTraits().cassettes[0] || {}).key, kind: 'copy', price: 100, desc: '' },
      solution: { cat: 'solution', name: 'Новый солюшн', sol: 'implant', gearKey: (getTraits().implants[0] || {}).key, price: 100, desc: '' },
    }[cat];
    const it = Object.assign({ id: uid() }, base);
    persist(shop.concat([it]));
    setEditId(it.id);
  };
  const seedAll = function () {
    const existingNames = shop.map(function (i) { return (i.name || '').trim().toLowerCase(); });
    const toAdd = buildShopDefaults().concat(buildMiscDefaults()).filter(function (d) { return existingNames.indexOf(d.name.trim().toLowerCase()) < 0; });
    if (toAdd.length === 0) { alert('Всё это уже есть в магазине.'); return; }
    if (!window.confirm('Добавить ' + toAdd.length + ' готовых вещей из каталога (оружие, броня, щиты, вещи, патроны, кассеты, солюшны)? Существующие вещи не тронет.')) return;
    persist(shop.concat(toAdd));
  };
  const clearCat = function () {
    const toRemove = itemsByCat;
    if (toRemove.length === 0) { alert('В этой категории пусто.'); return; }
    if (!window.confirm('Удалить все вещи категории «' + (CATS.find(function (c) { return c.id === cat; }) || CATS[0]).name + '» (' + toRemove.length + ' шт.)? Это уберёт их у всех игроков, кто ещё не взял их в инвентарь — уже взятое останется. Отменить нельзя.')) return;
    const removeIds = {}; toRemove.forEach(function (i) { removeIds[i.id] = true; });
    persist(shop.filter(function (i) { return !removeIds[i.id]; }));
  };

  const itemsByCat = shop.filter(function (i) { return cat === 'item' ? (i.cat === 'item' || i.cat === 'tool') : i.cat === cat; });
  const items = q.trim() ? itemsByCat.filter(function (i) { return (i.name || '').toLowerCase().includes(q.trim().toLowerCase()); }) : itemsByCat;
  const catColor = (CATS.find(function (c) { return c.id === cat; }) || CATS[0]).color;

  function summary(it) {
    if (it.cat === 'armor') { const a = ARMOR_T.find(function (x) { return x.id === it.type; }); return (SLOT_LABEL[it.slot || 'body']) + ' · ' + (a ? a.name : it.type) + ' · ' + it.hp + ' HP'; }
    if (it.cat === 'shield') { const s = SHIELD_T.find(function (x) { return x.id === it.type; }); return (s ? s.name + ' ' + (s.absorb * 100) + '%' : it.type) + ' · ' + it.hp + ' HP' + (it.desc ? ' · ' + it.desc : ''); }
    if (it.cat === 'weapon') { const h = it.hands === 2 ? 'двуруч.' : it.hands === 1.5 ? 'полуторн.' : 'одноруч.'; return it.wtype + ' · ' + it.dmgDice + (it.bonus ? '+' + it.bonus : '') + ' · ' + it.dmgType + ' · ' + h + (it.desc ? ' · ' + it.desc : ''); }
    if (it.cat === 'cassette') { const cd = getTraits().cassettes.find(function (x) { return x.key === it.gearKey; }); return (cd ? cd.cls + ' · ' + cd.name : it.gearKey) + ' · ' + ((CASS_KINDS.find(function (k) { return k.id === it.kind; }) || {}).name || it.kind) + (it.desc ? ' · ' + it.desc : ''); }
    if (it.cat === 'solution') { return ((SOL_KINDS.find(function (k) { return k.id === it.sol; }) || {}).name || it.sol) + (it.desc ? ' · ' + it.desc : ''); }
    const parts = [];
    if (it.desc) parts.push(it.desc);
    if (it.ptype || it.cat === 'ammo') parts.push('Снаряд: ' + (it.ptype || 'Пуля') + (it.bundleQty > 1 ? ' ×' + it.bundleQty : ''));
    if (it.dice || it.cat === 'tool') parts.push('Починка ' + (it.dice || '1d4'));
    if (it.heal) parts.push('+' + it.heal + (it.healWill ? ' Воли' : ' Здоровья'));
    if (it.doseHeal) parts.push('−' + it.doseHeal + ' Дозы');
    return parts.join(' · ');
  }

  function editForm(it) {
    if (it.cat === 'armor') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {field('Название', <LiveField value={it.name} onCommit={function (val) { upd(it.id, { name: val }); }} style={inp} />)}
          <div style={{ display: 'flex', gap: 6 }}>
            {field('Слот', <select value={it.slot || 'body'} onChange={function (e) { upd(it.id, { slot: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}><option value="head">Голова</option><option value="body">Тело</option></select>)}
            {field('Тип', <select value={it.type} onChange={function (e) { upd(it.id, { type: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}>{ARMOR_T.filter(function (a) { return a.id !== 'none'; }).map(function (a) { return <option key={a.id} value={a.id}>{a.name + ' (Тело≥' + a.bodyReq + ')'}</option>; })}</select>)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {field('HP брони', <LiveField type="number" value={it.hp} onCommit={function (val) { upd(it.id, { hp: parseInt(val) || 1 }); }} style={inp} />)}
          </div>
          {priceField(it)}
          {field('Описание (для игроков)', <LiveField tag="textarea" value={it.desc || ''} onCommit={function (val) { upd(it.id, { desc: val }); }} placeholder="Как выглядит, откуда взялась…" style={Object.assign({}, inp, { minHeight: 40, resize: 'vertical' })} />)}
        </div>
      );
    }
    if (it.cat === 'shield') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {field('Название', <LiveField value={it.name} onCommit={function (val) { upd(it.id, { name: val }); }} style={inp} />)}
          <div style={{ display: 'flex', gap: 6 }}>
            {field('Тип', <select value={it.type} onChange={function (e) { upd(it.id, { type: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}>{SHIELD_T.map(function (s) { return <option key={s.id} value={s.id}>{s.name + ' ' + (s.absorb * 100) + '% (Тело≥' + s.bodyReq + ')'}</option>; })}</select>)}
            {field('HP щита', <LiveField type="number" value={it.hp} onCommit={function (val) { upd(it.id, { hp: parseInt(val) || 1 }); }} style={inp} />)}
          </div>
          {priceField(it)}
          {field('Описание (для игроков)', <LiveField tag="textarea" value={it.desc || ''} onCommit={function (val) { upd(it.id, { desc: val }); }} placeholder="Как выглядит, откуда взялся…" style={Object.assign({}, inp, { minHeight: 40, resize: 'vertical' })} />)}
        </div>
      );
    }
    if (it.cat === 'weapon') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {field('Название', <LiveField value={it.name} onCommit={function (val) { upd(it.id, { name: val }); }} style={inp} />)}
          <div style={{ display: 'flex', gap: 6 }}>
            {field('Тип', <select value={it.wtype} onChange={function (e) { upd(it.id, { wtype: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}>{WT.map(function (t) { return <option key={t} value={t}>{SUBLABEL.weapon[t] || t}</option>; })}</select>)}
            {field('Урон', <select value={it.dmgType} onChange={function (e) { upd(it.id, { dmgType: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}>{DT.map(function (t) { return <option key={t} value={t}>{t}</option>; })}</select>)}
            {field('Руки', <select value={it.hands} onChange={function (e) { upd(it.id, { hands: parseFloat(e.target.value) }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}><option value={1}>1</option><option value={1.5}>1.5</option><option value={2}>2</option></select>)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {field('Кубик', <LiveField value={it.dmgDice} onCommit={function (val) { upd(it.id, { dmgDice: val }); }} placeholder="1d6" style={inp} />)}
            {field('Бонус', <LiveField type="number" value={it.bonus} onCommit={function (val) { upd(it.id, { bonus: parseInt(val) || 0 }); }} style={inp} />)}
          </div>
          {priceField(it)}
          {(it.dmgType === 'П' || it.wtype === 'Archery') && (
            <div style={{ display: 'flex', gap: 6 }}>
              {field(it.wtype === 'Archery' ? 'Колчан (выстрелов)' : 'Магазин (патронов)', <LiveField type="number" value={it.clip || 1} onCommit={function (val) { upd(it.id, { clip: parseInt(val) || 1 }); }} style={inp} />)}
              {it.wtype === 'Archery' && field('Тип боеприпаса', <select value={it.ammoType || 'Стрела'} onChange={function (e) { upd(it.id, { ammoType: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}><option value="Стрела">Стрела (лук)</option><option value="Болт">Болт (арбалет)</option></select>)}
            </div>
          )}
          {it.hands === 1.5 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {field('Кубик (2 руки)', <LiveField value={it.dmgDice2h} onCommit={function (val) { upd(it.id, { dmgDice2h: val }); }} placeholder="2d6" style={inp} />)}
              {field('Бонус (2 руки)', <LiveField type="number" value={it.bonus2h} onCommit={function (val) { upd(it.id, { bonus2h: parseInt(val) || 0 }); }} style={inp} />)}
            </div>
          )}
          {field('Описание (для игроков)', <LiveField tag="textarea" value={it.desc || ''} onCommit={function (val) { upd(it.id, { desc: val }); }} placeholder="Как выглядит, откуда взялось…" style={Object.assign({}, inp, { minHeight: 40, resize: 'vertical' })} />)}
        </div>
      );
    }
    if (it.cat === 'cassette') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {field('Название в каталоге', <LiveField value={it.name} onCommit={function (val) { upd(it.id, { name: val }); }} style={inp} />)}
          <div style={{ display: 'flex', gap: 6 }}>
            {field('Кассета', <select value={it.gearKey} onChange={function (e) { upd(it.id, { gearKey: e.target.value }); }} style={inp}>{getTraits().cassettes.map(function (c2) { return <option key={c2.key} value={c2.key}>{c2.cls + ' · ' + c2.name}</option>; })}</select>)}
            {field('Вид', <select value={it.kind || 'copy'} onChange={function (e) { upd(it.id, { kind: e.target.value }); }} style={inp}>{CASS_KINDS.map(function (k) { return <option key={k.id} value={k.id}>{k.name}</option>; })}</select>)}
          </div>
          {priceField(it)}
          {field('Описание (для игроков)', <LiveField tag="textarea" value={it.desc || ''} onCommit={function (val) { upd(it.id, { desc: val }); }} style={Object.assign({}, inp, { minHeight: 40, resize: 'vertical' })} />)}
          <div style={{ fontSize: 11, color: '#6a6052' }}>Палёнка в каталоге и в логе выглядит для игрока как оригинал.</div>
        </div>
      );
    }
    if (it.cat === 'solution') {
      const g = getTraits();
      const opts = it.sol === 'bracelet' ? Object.keys(BRACELETS).map(function (m) { return { key: m, name: m }; }) : it.sol === 'tip' ? g.tips : it.sol === 'implant' ? g.implants : it.sol === 'arm' ? [{ key: 'new', name: 'новый' }, { key: 'rebuilt', name: 'перебранный' }] : null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {field('Название в каталоге', <LiveField value={it.name} onCommit={function (val) { upd(it.id, { name: val }); }} style={inp} />)}
          <div style={{ display: 'flex', gap: 6 }}>
            {field('Что это', <select value={it.sol} onChange={function (e) { upd(it.id, { sol: e.target.value, gearKey: '' }); }} style={inp}>{SOL_KINDS.map(function (k) { return <option key={k.id} value={k.id}>{k.name}</option>; })}</select>)}
            {opts && field('Из каталога эффектов', <select value={it.gearKey || ''} onChange={function (e) { upd(it.id, { gearKey: e.target.value }); }} style={inp}><option value="">— выбрать —</option>{opts.map(function (o) { return <option key={o.key} value={o.key}>{o.name}</option>; })}</select>)}
          </div>
          {priceField(it)}
          {field('Описание (для игроков)', <LiveField tag="textarea" value={it.desc || ''} onCommit={function (val) { upd(it.id, { desc: val }); }} style={Object.assign({}, inp, { minHeight: 40, resize: 'vertical' })} />)}
        </div>
      );
    }
    // item (и легаси tool/ammo) — единая форма: обычная вещь + необязательные функции
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {field('Название', <LiveField value={it.name} onCommit={function (val) { upd(it.id, { name: val }); }} style={inp} />)}
        {field('Описание', <LiveField tag="textarea" value={it.desc} onCommit={function (val) { upd(it.id, { desc: val }); }} style={Object.assign({}, inp, { minHeight: 40, resize: 'vertical' })} />)}
        {priceField(it)}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          {field('Тип снаряда (необязательно)', <select value={it.ptype || ''} onChange={function (e) { upd(it.id, { ptype: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}><option value="">— нет —</option>{PROJ_TYPES.map(function (p) { return <option key={p} value={p}>{p}</option>; })}</select>)}
          {it.ptype && field('Штук за покупку', <LiveField type="number" min="1" value={it.bundleQty || 1} onCommit={function (val) { upd(it.id, { bundleQty: Math.max(1, parseInt(val) || 1) }); }} style={inp} />)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {field('Кубик починки (необязательно)', <select value={it.dice || ''} onChange={function (e) { upd(it.id, { dice: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}><option value="">— нет —</option>{REPAIR_DICE.map(function (d) { return <option key={d} value={d}>{d}</option>; })}</select>)}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          {field('Кубик лечения (необязательно)', <select value={it.heal || ''} onChange={function (e) { upd(it.id, { heal: e.target.value }); }} style={Object.assign({}, inp, { cursor: 'pointer' })}><option value="">— нет —</option>{HEAL_DICE.map(function (d) { return <option key={d} value={d}>{d}</option>; })}</select>)}
          {it.heal && <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6a6052', paddingBottom: 8, whiteSpace: 'nowrap' }}><input type="checkbox" checked={!!it.healWill} onChange={function (e) { upd(it.id, { healWill: e.target.checked }); }} />Лечит Волю, а не Здоровье</label>}
          {field('Снимает Дозы (число)', <LiveField type="number" min="0" value={it.doseHeal || 0} onCommit={function (val) { upd(it.id, { doseHeal: Math.max(0, parseInt(val) || 0) }); }} style={inp} />)}
        </div>
        <div style={{ fontSize: 11, color: '#6a6052', fontStyle: 'italic' }}>Тип снаряда делает вещь боеприпасом (тратится при перезарядке). Кубик починки — ремкомплект (раз в день). Кубик лечения — расходник: игрок применяет его из сумки. «Снимает Дозы» — как синька. Пустые поля — просто предмет.</div>
      </div>
    );
  }

  function itemRow(it) {
    const open = editId === it.id;
    return (
      <div key={it.id} style={{ border: '2px solid #c6bba3', borderRadius:0, background: '#f1ead9', padding: '7px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--f-body)", fontWeight: 700, fontSize: 12, color: '#211d18' }}>{it.name}{it.notForSale ? <span style={{ fontSize: 11, color: '#8a3b22', marginLeft: 5 }}>не продаётся</span> : priceOf(it) > 0 ? <span style={{ fontSize: 11, color: '#8a6200', marginLeft: 5 }}>{fmtMoney(priceOf(it))}</span> : null}</div>
            <div style={{ fontSize: 11, color: '#6a6052' }}>{summary(it)}</div>
          </div>
          <button onClick={function () { del(it.id); }} style={{ background: 'none', border: 'none', color: '#8a3b22', fontSize: 13, cursor: 'pointer' }}>✕</button>
          <button onClick={function () { setEditId(open ? null : it.id); }} style={{ padding: '4px 9px', borderRadius:0, border: '1px solid ' + catColor + '40', background: catColor + '18', color: catColor, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>{open ? 'Закрыть' : 'Править'}</button>
        </div>
        {open && editForm(it)}
      </div>
    );
  }

  // группировка по подкатегориям — длинные подсписки (>6 вещей) по умолчанию
  // свёрнуты, чтобы страница не превращалась в один гигантский скролл
  const subs = SUBORDER[cat];
  let grouped = null;
  if (subs) {
    grouped = subs.map(function (sk) {
      const list = items.filter(function (i) { return subOf(i) === sk; });
      if (!list.length) return null;
      const key = cat + ':' + sk;
      const collapsed = collapsedGroups[key] !== undefined ? collapsedGroups[key] : (list.length > 6 && !q.trim());
      return (
        <div key={sk} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={function () { setCollapsedGroups(function (c) { const n = Object.assign({}, c); n[key] = !collapsed; return n; }); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '4px 2px', marginTop: 4, cursor: 'pointer' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: catColor }}>{SUBLABEL[cat][sk]}</span>
            <span style={{ fontSize: 11, color: '#6a6052' }}>{(collapsed ? '▸ показать ' : '▾ скрыть ') + list.length}</span>
          </button>
          {!collapsed && list.map(itemRow)}
        </div>
      );
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button onClick={pr.onBack} style={Object.assign({}, backBtn, { alignSelf: 'flex-start' })}>Назад</button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "var(--f-body)", fontWeight:700, fontSize: 16, color: '#8a6200' }}>Каталог</div>
        <div style={{ fontSize: 11, color: '#6a6052' }}>Игроки покупают отсюда, мастер отсюда выдаёт</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 4 }}>
          <button onClick={seedAll} style={{ background: 'none', border: 'none', color: '#6a6052', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>добавить стартовый каталог</button>
          <button onClick={clearCat} style={{ background: 'none', border: 'none', color: '#8a3b22', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>очистить текущую категорию</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {CATS.map(function (cc) {
          const on = cat === cc.id;
          return <button key={cc.id} onClick={function () { setCat(cc.id); setEditId(null); }} style={{ flex: '1 1 40%', padding: '6px 2px', borderRadius:0, border: '2px solid ' + cc.color + (on ? '' : '20'), background: on ? cc.color + '20' : '#f1ead9', color: cc.color, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>{cc.name}</button>;
        })}
      </div>

      <button onClick={add} style={{ padding: 9, borderRadius:0, border: '2px dashed ' + catColor + '60', background: catColor + '12', color: catColor, fontFamily: "var(--f-body)", fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Добавить</button>
      <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Поиск по названию…" style={inp} />

      {items.length === 0 && <div style={{ textAlign: 'center', padding: 14, color: '#6a6052', fontSize: 11, fontStyle: 'italic' }}>{q.trim() ? 'Ничего не найдено' : 'Пусто — добавь первую вещь'}</div>}
      {grouped ? grouped : items.map(itemRow)}
    </div>
  );
}
