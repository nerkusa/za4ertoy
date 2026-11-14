import React, { useState } from 'react';
import MapView from './MapView';
import LoreContent from '../LoreContent';
import { normalizeSections, MAP_META } from '../../utils/lore';

const backBtn = { alignSelf: 'flex-start', padding: '5px 12px', borderRadius:0, border: '2px solid #c6bba3', background: '#f1ead9', color: '#211d18', fontWeight: 700, fontSize: 11, cursor: 'pointer' };

function Card(pr) {
  const meta = pr.meta;
  const color = meta.color || '#8a3b22';
  return (
    <button onClick={pr.onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius:0, border: '2px solid ' + color + '22', background: color + '0e', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ width: 34, height: 34, borderRadius:0, background: color + '1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--f-body)", fontWeight: 700, fontSize: 12, color: '#211d18' }}>{meta.title}</div>
        {pr.subtitle && <div style={{ fontSize: 11, color: '#6a6052', marginTop: 1 }}>{pr.subtitle}</div>}
      </div>
      <span style={{ color: color }}>›</span>
    </button>
  );
}

export default function LibTab(pr) {
  const lore = pr.lore || {};
  const [openId, setOpenId] = useState(null);
  const sections = normalizeSections(lore);

  if (openId === 'map') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={function () { setOpenId(null); }} style={backBtn}>← Назад</button>
        <MapView mapData={pr.mapData} saveMap={pr.saveMap} characters={pr.characters} isGM={pr.isGM} charId={pr.charId} />
      </div>
    );
  }

  const sec = sections.find(function (s) { return s.id === openId; });
  if (sec) {
    const hasContent = (sec.blocks || []).some(function (b) {
      return (b.type === 'image' && b.value) || (b.value && b.value.trim());
    });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={function () { setOpenId(null); }} style={backBtn}>← Назад</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28 }}>{sec.icon}</div>
          <div style={{ fontFamily: "var(--f-body)", fontWeight:700, fontSize: 16, color: sec.color, marginTop: 4 }}>{sec.title}</div>
        </div>
        {hasContent
          ? <LoreContent section={sec} />
          : <div style={{ textAlign: 'center', padding: 20, color: '#6a6052' }}><div style={{ fontSize: 24 }}></div><div style={{ fontSize: 12, fontWeight: 700 }}>Пусто</div></div>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontFamily: "var(--f-body)", fontWeight:700, fontSize: 17 }}>Лорбук</div>
      </div>
      <Card meta={MAP_META} subtitle="Карта мира" onClick={function () { setOpenId('map'); }} />
      {sections.map(function (s) {
        return <Card key={s.id} meta={s} onClick={function () { setOpenId(s.id); }} />;
      })}
      {sections.length === 0 && <div style={{ textAlign: 'center', padding: 16, color: '#6a6052', fontSize: 11 }}>Разделов пока нет</div>}
    </div>
  );
}
