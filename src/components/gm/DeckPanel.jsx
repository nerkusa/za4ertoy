import React, { useState } from 'react';
import { TAROT, cardById, skillsText } from '../../data/tarot';
import { canGiveSign, giveSign } from '../../utils/signs';
import { r1 } from '../../utils/dice';
import { TarotCard } from '../SignsStrip';

/* Вкладка мастера «Колода» (ТЗ v4, п.14.3–14.4) */
export default function DeckPanel(pr) {
  const chars = pr.characters || [];
  const [drawn, setDrawn] = useState(null);
  const [to, setTo] = useState('');
  function gmLog(label, detail) { if (pr.addGmLog) pr.addGmLog({ who: pr.myName || 'ГМ', label: label, detail: detail || '' }); }
  function draw() { setDrawn(TAROT[r1(22) - 1].id); }
  function give(cardId) {
    const c = chars.find(function (x) { return x._fbId === to; }); if (!c) { alert('Выбери персонажа'); return; }
    const p = giveSign(c, cardId); if (p.error) { alert(p.error); return; }
    pr.saveChar(c._fbId, Object.assign({}, c, p));
    const card = cardById(cardId);
    if (pr.addLog) pr.addLog({ who: 'ГМ', type: 'give', label: 'ГМ выдал Знак «' + card.name + '» → ' + (c.name || '?'), detail: card.sign, total: 0 });
    gmLog('Выдал Знак', (c.name || '?') + ': ' + card.num + ' ' + card.name);
  }
  function showAll(cardId) {
    const card = cardById(cardId);
    pr.showTarot({ cardId: cardId, ts: Date.now() });
    if (pr.addLog) pr.addLog({ who: 'ГМ', type: 'give', label: 'Карта: ' + card.num + ' «' + card.name + '»', detail: card.meaning + (card.kind === 'outcome' ? ' · карта исхода' : ''), total: 0 });
  }
  function setHero(c, cardId, how) {
    pr.saveChar(c._fbId, Object.assign({}, c, { heroCard: cardId == null ? null : { cardId: cardId, revealed: false } }));
    gmLog('Карта героя', (c.name || '?') + ': ' + (cardId == null ? 'снята' : cardById(cardId).name + (how ? ' (' + how + ')' : '')));
  }
  function reveal(c) {
    const card = cardById(c.heroCard.cardId);
    pr.saveChar(c._fbId, Object.assign({}, c, { heroCard: Object.assign({}, c.heroCard, { revealed: true }) }));
    if (pr.addLog) pr.addLog({ who: c.name || '?', type: 'give', label: 'Карта героя открыта: ' + card.num + ' «' + card.name + '»', detail: card.meaning, total: 0 });
  }
  const sel = chars.find(function (x) { return x._fbId === to; });
  const chk = drawn != null && sel ? canGiveSign(sel, drawn) : null;
  const charSel = <select value={to} onChange={function (e) { setTo(e.target.value); }}><option value="">— кому —</option>{chars.map(function (c) { return <option key={c._fbId} value={c._fbId}>{(c.name || '?') + ' · Знаков ' + (c.signs || []).length + '/3'}</option>; })}</select>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Колода</h2>
      <div className="sec">
        <div className="row"><button className="btn main" onClick={draw}>Вытянуть карту</button>{drawn != null && charSel}</div>
        {drawn != null && <div className="row" style={{ alignItems: 'flex-start' }}>
          <TarotCard card={cardById(drawn)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn" disabled={!chk || !chk.ok} title={chk && !chk.ok ? chk.reason : ''} onClick={function () { give(drawn); }}>Выдать как Знак → персонаж</button>
            {chk && !chk.ok && <span className="hint">{chk.reason}</span>}
            {cardById(drawn).kind === 'outcome' && <span className="hint">Карта исхода — Знаком не выдаётся.</span>}
            <button className="btn" onClick={function () { showAll(drawn); }}>Показать всем</button>
          </div>
        </div>}
      </div>
      <div className="sec">
        <h3>Карта героя</h3>
        <p className="hint">Игрок видит рубашку, пока карта не открыта; номер карты ему не уходит.</p>
        {chars.map(function (c) {
          const h = c.heroCard; const hc = h && h.cardId != null ? cardById(h.cardId) : null;
          return <div key={c._fbId} className="row">
            <b style={{ minWidth: 120 }}>{c.name || '?'}</b>
            <select value={hc ? hc.id : ''} onChange={function (e) { setHero(c, e.target.value === '' ? null : parseInt(e.target.value), ''); }}><option value="">— нет —</option>{TAROT.map(function (t) { return <option key={t.id} value={t.id}>{t.num + ' ' + t.name}</option>; })}</select>
            <button className="btn sm" onClick={function () { setHero(c, TAROT[r1(22) - 1].id, 'вслепую'); }}>Вытянуть вслепую</button>
            {hc && !h.revealed && <button className="btn sm main" onClick={function () { reveal(c); }}>Открыть</button>}
            {hc && <span className="pill">{h.revealed ? 'открыта' : 'скрыта'}</span>}
          </div>;
        })}
      </div>
      <div className="sec">
        <h3>Все карты</h3>
        <div className="row" style={{ marginBottom: 6 }}>{charSel}<span className="hint">выбери, кому выдавать Знак из справочника</span></div>
        <div className="tcards">{TAROT.map(function (t) { const ck = sel ? canGiveSign(sel, t.id) : null; return <TarotCard key={t.id} card={t}>
          {t.skills.length > 0 && <span className="tm">{'Переброс: ' + skillsText(t)}</span>}
          <div className="row" style={{ gap: 4 }}>
            {t.kind === 'sign' && <button className="btn sm" disabled={!ck || !ck.ok} title={ck && !ck.ok ? ck.reason : 'выбери персонажа'} onClick={function () { give(t.id); }}>Знак</button>}
            <button className="btn sm" onClick={function () { showAll(t.id); }}>Всем</button>
          </div>
        </TarotCard>; })}</div>
      </div>
    </div>
  );
}
