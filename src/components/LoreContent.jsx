import React from 'react';

// inline **bold** and *italic*
function inline(str, keyBase) {
  const nodes = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(str))) {
    if (m.index > last) nodes.push(str.slice(last, m.index));
    if (m[2] != null) nodes.push(<strong key={keyBase + '_' + (k++)}>{m[2]}</strong>);
    else nodes.push(<em key={keyBase + '_' + (k++)}>{m[3]}</em>);
    last = re.lastIndex;
  }
  if (last < str.length) nodes.push(str.slice(last));
  return nodes;
}

function renderText(text, color) {
  return text.split('\n').map(function (l, i) {
    if (l.startsWith('### ')) return <div key={i} style={{ fontFamily: "var(--f-body)", fontWeight: 700, fontSize: 13, marginTop: 8, color: '#211d18' }}>{inline(l.slice(4), i)}</div>;
    if (l.startsWith('## ')) return <div key={i} style={{ fontFamily: "var(--f-body)", fontWeight:700, fontSize: 15, color: color, marginTop: 10 }}>{inline(l.slice(3), i)}</div>;
    if (l.startsWith('# ')) return <div key={i} style={{ fontFamily: "var(--f-body)", fontWeight:700, fontSize: 17, marginTop: 12, color: '#211d18' }}>{inline(l.slice(2), i)}</div>;
    if (l.startsWith('---')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid #c6bba3', margin: '8px 0' }} />;
    if (l.startsWith('- ')) return <div key={i} style={{ fontSize: 11, paddingLeft: 12, lineHeight: 1.6, color: '#b2b6ca' }}>• {inline(l.slice(2), i)}</div>;
    if (!l.trim()) return <div key={i} style={{ height: 6 }} />;
    return <div key={i} style={{ fontSize: 11, lineHeight: 1.6, color: '#b2b6ca' }}>{inline(l, i)}</div>;
  });
}

export default function LoreContent(pr) {
  const section = pr.section || {};
  const color = section.color || '#8a3b22';
  const blocks = section.blocks || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {blocks.map(function (b, bi) {
        if (b.type === 'image') {
          if (!b.value) return null;
          return (
            <figure key={bi} style={{ margin: 0 }}>
              <img src={b.value} alt={b.caption || ''} style={{ width: '100%', borderRadius:0, border: '2px solid #c6bba3', display: 'block' }} />
              {b.caption && <figcaption style={{ fontSize: 11, color: '#6a6052', textAlign: 'center', marginTop: 3, fontStyle: 'italic' }}>{b.caption}</figcaption>}
            </figure>
          );
        }
        const text = b.value || '';
        if (!text.trim()) return null;
        return (
          <div key={bi} style={{ background: '#e2d8c3', border: '2px solid #c6bba3', borderRadius:0, padding: '12px 10px' }}>
            {renderText(text, color)}
          </div>
        );
      })}
    </div>
  );
}
