import React, { useState } from 'react';
import { priceNum, fmtMoney } from '../utils/currency';

// Reusable "take from shop" picker.
// props: items, color, onPick(item), sub(item)->string, label,
//        optional grouping: subOf(item)->key, suborder[], sublabels{key:label}
export default function ShopPicker(pr) {
  const [open, setOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const items = (pr.items || []).filter(function (i) { return pr.all || !i.notForSale; });
  const color = pr.color || '#8a6200';


  function row(it) {
    const cost = priceNum(it.price);
    return (
      <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1ead9', border: '1px solid #c6bba3', borderRadius:0, padding: '4px 7px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#211d18' }}>{it.name}{cost > 0 ? <span style={{ fontSize: 11, color: '#8a6200', marginLeft: 5 }}>{fmtMoney(cost)}</span> : null}</div>
          {pr.sub && <div style={{ fontSize: 11, color: '#6a6052' }}>{pr.sub(it)}</div>}
        </div>
        <button onClick={function () { pr.onPick(it); setOpen(false); }} style={{ padding: '3px 9px', borderRadius:0, border: 'none', background: color, color: '#ebe3d1', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Взять</button>
      </div>
    );
  }

  let body;
  if (pr.suborder && pr.subOf) {
    body = pr.suborder.map(function (sk) {
      const list = items.filter(function (i) { return pr.subOf(i) === sk; });
      if (!list.length) return null;
      const collapsed = collapsedGroups[sk] !== undefined ? collapsedGroups[sk] : list.length > 6;
      return (
        <div key={sk} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <button onClick={function () { setCollapsedGroups(function (c) { const n = Object.assign({}, c); n[sk] = !collapsed; return n; }); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '3px 1px', marginTop: 3, cursor: 'pointer' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{(pr.sublabels && pr.sublabels[sk]) || sk}</span>
            <span style={{ fontSize: 11, color: '#6a6052' }}>{(collapsed ? 'показать ' : 'скрыть ') + list.length}</span>
          </button>
          {!collapsed && list.map(row)}
        </div>
      );
    });
  } else {
    body = items.map(row);
  }

  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={function () { setOpen(!open); }} style={{ width: '100%', padding: '5px 8px', borderRadius:0, border: '1px dashed ' + color + '60', background: color + '12', color: color, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>{open ? 'Закрыть каталог' : (pr.label || 'Взять из каталога')}</button>
      {open && (
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.length === 0 && <div style={{ fontSize: 11, color: '#6a6052', fontStyle: 'italic', textAlign: 'center', padding: 6 }}>Пусто — ГМ ещё не добавил вещи этой категории</div>}
          {body}
        </div>
      )}
    </div>
  );
}
