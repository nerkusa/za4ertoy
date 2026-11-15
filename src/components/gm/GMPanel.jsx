import React, { useState } from 'react';
import { getProfs } from '../../utils/profStore';
import { getTraits } from '../../utils/traitStore';
import { cF, hpOf, willOf, xpProgress, levelUpReward } from '../../utils/character';
import { originOf } from '../../data/professions';
import { BRACELETS, DISEASES, IRON_STAGES, IMPRINT_STAGES, CASS_KINDS, kindName, doseState, diseaseList, diseaseByKey } from '../../data/gear';
import { critsAfterRest } from '../../utils/crits';
import CritsCard from '../CritsCard';
import { findBy, nestInfo, solutionList, ironSteps } from '../../data/traits';
import { grantPatch, grantLabel } from '../../utils/grant';
import { rollTrinket } from '../../data/trinkets';
import { r1 } from '../../utils/dice';
import { fmtMoney, priceNum } from '../../utils/currency';
import { IconParty, IconChat, IconHistory, IconSkull, IconShop, IconGear, IconChar, IconLib } from '../../icons/index';
import BestiaryEditor from './BestiaryEditor';
import DonatePage from './DonatePage';
import GameView from '../GameView';
import GMRoll from './GMRoll';
import ChatTab from '../tabs/ChatTab';
import CoopRollPopup from '../combat/CoopRollPopup';
import RollPopup from '../combat/RollPopup';
import LoreEditor from './LoreEditor';
import ProfEditor from './ProfEditor';
import ShopEditor from './ShopEditor';
import GearEditor from './GearEditor';

const NAV = [
  { id: 'overview', icon: <IconParty />, label: 'Отряд' },
  { id: 'chat', icon: <IconChat />, label: 'Чат и лог' },
  { id: 'history', icon: <IconHistory />, label: 'История' },
  { id: 'bestiary', icon: <IconSkull />, label: 'Бестиарий' },
  { id: 'shop', icon: <IconShop />, label: 'Каталог' },
  { id: 'gear', icon: <IconGear />, label: 'Эффекты' },
  { id: 'profs', icon: <IconChar />, label: 'Профессии' },
  { id: 'lore', icon: <IconLib />, label: 'Лор и карта' },
];
const GRANT_CATS = [['weapon', 'Оружие'], ['armor', 'Броня'], ['shield', 'Щит'], ['item', 'Вещь'], ['ammo', 'Патроны'], ['cassette', 'Кассета'], ['solution', 'Солюшн']];

/* Выдача игроку из каталога */
function GrantBox(pr) {
  const c = pr.char;
  const [gc, setGc] = useState('weapon');
  const [id, setId] = useState('');
  const [kind, setKind] = useState('copy');
  const list = (pr.shop || []).filter(function (i) { return gc === 'item' ? (i.cat === 'item' || i.cat === 'tool') : i.cat === gc; });
  const it = list.find(function (i) { return i.id === id; });
  const def = it && it.cat === 'cassette' ? findBy(getTraits().cassettes, it.gearKey) : null;
  function give() {
    if (!it) return;
    const opts = { kind: kind };
    const p = grantPatch(c, getTraits(), it, opts);
    if (p.error) { alert(p.error); return; }
    pr.saveChar(c._fbId, Object.assign({}, c, p));
    if (pr.addLog) pr.addLog({ who: 'ГМ', type: 'give', label: 'ГМ выдал: ' + grantLabel(it, opts, false) + ' → ' + (c.name || '?'), detail: '', total: 0 });
    pr.log('Выдал', (c.name || '?') + ': ' + grantLabel(it, opts, true));
  }
  return (
    <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="lblm">Выдача из каталога</span>
      <div className="row">
        <select value={gc} onChange={function (e) { setGc(e.target.value); setId(''); }}>{GRANT_CATS.map(function (g) { return <option key={g[0]} value={g[0]}>{g[1]}</option>; })}</select>
        <select value={id} onChange={function (e) { setId(e.target.value); }} style={{ flex: 1, minWidth: 120 }}><option value="">— что выдать —</option>{list.map(function (i) { return <option key={i.id} value={i.id}>{i.name + (i.notForSale ? ' · не продаётся' : priceNum(i.price) ? ' · ' + fmtMoney(i.price) : '')}</option>; })}</select>
        {gc === 'cassette' && <select value={kind} onChange={function (e) { setKind(e.target.value); }}>{CASS_KINDS.filter(function (k) { return !(def && def.origOnly) || k.id === 'orig' || k.id === 'fake'; }).map(function (k) { return <option key={k.id} value={k.id}>{k.name}</option>; })}</select>}
        <button className="btn sm" disabled={!it} onClick={give}>Выдать</button>
      </div>
      {list.length === 0 && <span className="hint">В этой категории каталога пусто — добавь стартовый каталог в разделе «Каталог».</span>}
    </div>
  );
}

/* Карточка игрока в обзоре отряда */
function PartyCard(pr) {
  const c = pr.char;
  const inf = cF(c); const cat = getTraits();
  const pf = getProfs().find(function (p) { return p.id === c.profession; }) || getProfs()[0];
  const hp = hpOf(c, inf.fs); const w = willOf(c, inf.fs);
  const hpPct = hp.max > 0 ? Math.max(0, Math.min(100, (hp.cur / hp.max) * 100)) : 0;
  const xpp = xpProgress(c);
  const [xg, setXg] = useState('');
  const [mg, setMg] = useState('');
  const [nd, setNd] = useState(DISEASES[0].key);
  const [more, setMore] = useState(false);
  const dose = c.dose || 0; const dis = diseaseList(c); const steps = ironSteps(c, cat);
  const ni = nestInfo(c, cat); const b = c.bracelet && BRACELETS[c.bracelet.model];
  const inNest = (c.cassettes || []).filter(function (x) { return x.inNest; });
  const stage = IRON_STAGES.filter(function (s) { return steps >= s.at; }).pop();

  function log(label, detail) { if (pr.addGmLog) pr.addGmLog({ who: pr.myName || 'ГМ', target: c.name || '?', label: label, detail: detail || '' }); }
  function save(p) { pr.saveChar(c._fbId, Object.assign({}, c, p)); }
  function giveXp() { const amt = parseInt(xg) || 0; if (!amt) return; save({ xp: Math.max(0, (c.xp || 0) + amt) }); log('Выдал опыт', c.name + ': ' + (amt > 0 ? '+' : '') + amt + ' XP'); setXg(''); }
  function giveMoney() { const amt = parseInt(mg) || 0; if (!amt) return; save({ money: Math.max(0, (c.money || 0) + amt) }); log('Деньги', c.name + ': ' + (amt > 0 ? '+' : '') + amt + ' ер.'); setMg(''); }
  function levelUp() {
    const nl = c.level + 1; const rw = levelUpReward(nl);
    save({ level: nl, lockedSkills: Object.assign({}, c.skills), skillPts: (c.skillPts || 0) + rw.skillPoints, levelHp: (c.levelHp || 0) + rw.maxHp, levelUpPending: { level: nl, stat: 0, skill: rw.skillPoints, maxHp: rw.maxHp } });
    log('Поднял уровень', c.name + ': ур.' + c.level + ' → ' + nl + ' (+' + rw.skillPoints + ' очк. навыка, +' + rw.maxHp + ' к Здоровью)');
  }
  /* Отдых восстанавливает Здоровье и Волю, как в базе; при Дозе 4+ Здоровье не восстанавливается */
  function rest() {
    const noHeal = dose >= 4;
    if (noHeal && !window.confirm((c.name || '?') + ': Доза ' + dose + ' — по правилам Здоровье не восстанавливается. Восстановить только Волю?')) return;
    const half = dis.some(function (d) { return d.flags.restHalf; });
    save({ curHp: noHeal ? hp.cur : (half ? Math.min(hp.max, hp.cur + Math.floor((hp.max - hp.cur) / 2)) : hp.max), curWill: w.max, shakenPenalty: 0, broken: false, depoCharge: 1, combatDepoUsed: false, crits: critsAfterRest(c), cassettes: (c.cassettes || []).map(function (x) { return x.stuck ? Object.assign({}, x, { stuck: false }) : x; }) });
    log('Отдых', c.name + (noHeal ? ' (Доза 4+: без Здоровья)' : ''));
  }
  function adjHp(d) { save({ curHp: Math.max(0, Math.min(hp.max, hp.cur + d)) }); log(d < 0 ? 'Урон' : 'Лечение', c.name + ': ' + (d > 0 ? '+' : '') + d + ' Здоровья'); }
  function adjDose(d) { const n = Math.max(0, Math.min(10, dose + d)); save({ dose: n }); log('Доза', c.name + ': ' + dose + ' → ' + n); }
  function del() { if (!window.confirm('Удалить ' + c.name + '? Персонаж и его аккаунт (логин/пароль) будут удалены безвозвратно.')) return; log('Удалил персонажа', c.name); pr.deleteChar(c._fbId); }

  return (
    <div className="card">
      <div className="ch">
        <b>{c.name || '?'}</b>
        <span>{[pf.id !== 'none' ? pf.name : null, originOf(c.origin).name, 'ур. ' + c.level].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="cb">
        <div className="row">
          <button className={'btn sm' + (c.active ? ' main' : '')} onClick={function () { save({ active: !c.active }); }}>{c.active ? 'В игре' : 'В игру'}</button>
          <button className="btn sm" onClick={function () { pr.onOpen(c._fbId); }}>Открыть лист</button>
          {!c.locked && <span className="pill">черновик</span>}
          {steps >= 5 && <span className="pill" title="Игрок без планшета видит Здоровье словами">немота</span>}
        </div>
        <div>
          <div className="lblm" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Здоровье</span><b style={{ color: 'var(--ink)' }}>{hp.cur + ' / ' + hp.max}</b></div>
          <div className="bar"><i className={hpPct < 50 ? 'warn' : ''} style={{ width: hpPct + '%' }} /></div>
        </div>
        <dl className="kv">
          <dt>Воля</dt><dd>{w.cur + ' / ' + w.max}</dd>
          <dt>Доза</dt><dd>{dose + ' / 10' + (doseState(dose) ? ' · ' + doseState(dose) : '')}</dd>
          <dt>Болезни</dt><dd>{dis.length ? dis.map(function (d) { return d.name + ' (' + d.cure + ')'; }).join(', ') : '—'}</dd>
          <dt>Деньги</dt><dd>{fmtMoney(c.money || 0)}</dd>
          <dt>Молва</dt><dd>{(c.molva > 0 ? '+' : '') + (c.molva || 0)}</dd>
          <dt>Опыт</dt><dd>{xpp.got + '/' + xpp.need + ' до ур.' + (xpp.level + 1) + (xpp.ready ? ' · готов' : '') + ' · награда: +1 очко навыка и +2 Здоровья'}</dd>
          <dt>Браслет</dt><dd>{b ? b.name + ' · свободно ' + ni.free + ' из ' + ni.total : 'нет'}</dd>
          <dt>В гнёздах</dt><dd>{inNest.length ? inNest.map(function (x) { const d = findBy(cat.cassettes, x.key); return (d ? d.name : x.key) + ' (' + kindName(x.kind) + (x.kind === 'fake' && x.fakeState ? ': ' + (x.fakeState === 'silent' ? 'молчит' : x.fakeState === 'copy' ? 'как копия' : 'застряла') : '') + (x.kind === 'slep' ? ', отпечаток ' + (x.imprint || 0) + ' ' + IMPRINT_STAGES[x.imprint || 0] : '') + ')'; }).join('; ') : '—'}</dd>
          <dt>Солюшны</dt><dd>{solutionList(c, cat).map(function (x) { return x.name; }).join(', ') || '—'}{' · шагов железа: ' + steps + (stage ? ' (' + stage.name + ')' : '')}</dd>
        </dl>
        <div className="row">
          {[-5, -1, 1, 5].map(function (d) { return <button key={d} className="btn sm" onClick={function () { adjHp(d); }}>{'Зд ' + (d > 0 ? '+' : '') + d}</button>; })}
          <button className="btn sm" onClick={function () { adjDose(-1); }}>Доза −</button>
          <button className="btn sm" onClick={function () { adjDose(1); }}>Доза +</button>
          <button className="btn sm" onClick={rest}>Отдых</button>
          <button className={'btn sm' + (xpp.ready ? ' main' : '')} onClick={levelUp}>Ур. +1</button>
        </div>
        <div className="row">
          <input type="number" value={xg} onChange={function (e) { setXg(e.target.value); }} placeholder="± опыт" style={{ width: 84 }} />
          <button className="btn sm" onClick={giveXp}>Опыт</button>
          <input type="number" value={mg} onChange={function (e) { setMg(e.target.value); }} placeholder="± ер." style={{ width: 84 }} />
          <button className="btn sm" onClick={giveMoney}>Деньги</button>
          <button className="btn sm" onClick={function () { setMore(!more); }}>{more ? 'Свернуть' : 'Ещё'}</button>
        </div>
        {more && <div className="row">
          <select value={nd} onChange={function (e) { setNd(e.target.value); }}>{DISEASES.map(function (d) { return <option key={d.key} value={d.key}>{d.name}</option>; })}</select>
          <button className="btn sm" onClick={function () { const d = diseaseByKey(nd); if (d && !dis.some(function (x) { return x.key === d.key; })) { save({ diseases: dis.map(function (x) { return { key: x.key, name: x.name }; }).concat([{ key: d.key, name: d.name }]) }); log('Болезнь', c.name + ': ' + d.name); } }}>Заразить</button>
          {dis.map(function (d) { return <button key={d.key} className="btn sm" onClick={function () { save({ diseases: dis.filter(function (x) { return x.key !== d.key; }).map(function (x) { return { key: x.key, name: x.name }; }) }); log('Снял болезнь', c.name + ': ' + d.name); }}>{'Снять: ' + d.name}</button>; })}
          <button className="btn sm" title="d30 по таблице безделушек, в сумку" onClick={function () { const t = rollTrinket(r1); save(grantPatch(c, getTraits(), t.item)); log('Безделушка', c.name + ': d30 = ' + t.roll + ' — ' + t.item.desc + ' (' + t.item.price + ' ер.)'); if (pr.addLog) pr.addLog({ who: 'ГМ', type: 'give', label: 'ГМ выдал безделушку → ' + (c.name || '?'), detail: t.item.desc, total: 0 }); }}>Безделушка</button>
          <button className="btn sm" onClick={function () { save({ molva: Math.max(-5, (c.molva || 0) - 1) }); }}>Молва −</button>
          <button className="btn sm" onClick={function () { save({ molva: Math.min(5, (c.molva || 0) + 1) }); }}>Молва +</button>
          <button className="btn sm" style={{ borderColor: 'var(--rust)', color: 'var(--rust)' }} onClick={del}>Удалить</button>
        </div>}
        <CritsCard char={c} save={function (d) { pr.saveChar(c._fbId, d); }} isGM={true} addLog={pr.addLog} />
        <GrantBox char={c} shop={pr.shop} saveChar={pr.saveChar} addLog={pr.addLog} log={log} />
      </div>
    </div>
  );
}

function Overview(pr) {
  const [q, setQ] = useState('');
  const shown = q.trim() ? pr.characters.filter(function (c) { return (c.name || '').toLowerCase().includes(q.trim().toLowerCase()); }) : pr.characters;
  function restAll() {
    if (pr.characters.length === 0) return;
    const dosed = pr.characters.filter(function (c) { return (c.dose || 0) >= 4; });
    if (!window.confirm('Отдых всему отряду (' + pr.characters.length + '): Здоровье и Воля восстанавливаются.' + (dosed.length ? '\nДоза 4+ — Здоровье не восстановится у: ' + dosed.map(function (c) { return c.name || '?'; }).join(', ') + '.' : ''))) return;
    pr.characters.forEach(function (c) {
      const fs = cF(c).fs; const hp = hpOf(c, fs); const w = willOf(c, fs);
      const half = diseaseList(c).some(function (d) { return d.flags.restHalf; });
      pr.saveChar(c._fbId, Object.assign({}, c, { curHp: (c.dose || 0) >= 4 ? hp.cur : (half ? Math.min(hp.max, hp.cur + Math.floor((hp.max - hp.cur) / 2)) : hp.max), curWill: w.max, shakenPenalty: 0, broken: false, depoCharge: 1, combatDepoUsed: false, crits: critsAfterRest(c) }));
    });
    if (pr.addGmLog) pr.addGmLog({ who: pr.myName || 'ГМ', label: 'Отдых всего отряда', detail: pr.characters.map(function (c) { return c.name || '?'; }).join(', ') });
  }
  /* Новый день: ежедневные потери от болезней (Сибирка, Гниль — Здоровье, Ожерелье — Воля) */
  function newDay() {
    const hit = [];
    pr.characters.forEach(function (c) {
      const ds = diseaseList(c); let dh = 0, dw = 0;
      ds.forEach(function (d) { dh += d.flags.dailyHp || 0; dw += d.flags.dailyWill || 0; });
      if (!dh && !dw) return;
      const fs = cF(c).fs; const hp = hpOf(c, fs); const w = willOf(c, fs);
      pr.saveChar(c._fbId, Object.assign({}, c, { curHp: Math.max(0, hp.cur + dh), curWill: w.cur + dw }));
      hit.push((c.name || '?') + (dh ? ' ' + dh + ' Здоровья' : '') + (dw ? ' ' + dw + ' Воли' : ''));
    });
    if (pr.addGmLog) pr.addGmLog({ who: pr.myName || 'ГМ', label: 'Новый день', detail: hit.length ? hit.join('; ') : 'болезни никого не тронули' });
    if (!hit.length) alert('Новый день: ежедневных потерь от болезней ни у кого нет.');
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>Отряд</h2>
      <div className="row">
        <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Поиск игрока по имени…" className="n-input" style={{ flex: '1 1 200px' }} />
        <button className="btn" onClick={restAll} disabled={pr.characters.length === 0}>Отдых всего отряда</button>
        <button className="btn" onClick={newDay} disabled={pr.characters.length === 0} title="Сибирка и Гниль: −1 Здоровья, Ожерелье: −1 Воли">Новый день</button>
      </div>
      <GMRoll addLog={pr.addLog} />
      {pr.characters.length === 0 && <p className="hint">Ждём игроков: они появятся здесь после регистрации.</p>}
      {pr.characters.length > 0 && shown.length === 0 && <p className="hint">Никого не найдено.</p>}
      <div className="gm-cards">
        {shown.map(function (c) { return <PartyCard key={c._fbId} char={c} saveChar={pr.saveChar} deleteChar={pr.deleteChar} onOpen={pr.onOpen} addGmLog={pr.addGmLog} addLog={pr.addLog} shop={pr.shop} myName={pr.myName} />; })}
      </div>
    </div>
  );
}

/* История: действия мастера и скрытые результаты (палёнки, Отпечаток) */
function HistoryPanel(pr) {
  const entries = pr.gmLog || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>История мастера</h2>
        {pr.clearGmLog && entries.length > 0 && <button className="btn sm" onClick={function () { if (window.confirm('Очистить историю?')) pr.clearGmLog(); }}>Очистить</button>}
      </div>
      <p className="hint">Здесь твои действия и то, что видишь только ты: скрытые броски палёнок, рост Отпечатка.</p>
      {entries.length === 0 && <p className="hint">Пока пусто.</p>}
      <div className="log">
        {entries.map(function (e, i) {
          return (
            <div key={i} className="logrow" style={{ gridTemplateColumns: '70px 1fr' }}>
              <span className="tm">{e.ts ? new Date(e.ts).toLocaleTimeString() : ''}</span>
              <span><b>{e.label}</b>{e.detail ? ' — ' + e.detail : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChatSection(pr) {
  const [chatRoll, setChatRoll] = useState(null);
  const [chatCoopRoll, setChatCoopRoll] = useState(null);
  const [speakAs, setSpeakAs] = useState('Мастер');
  const spawnedList = Object.entries(pr.spawned || {}).filter(function (e) { var hp = e[1].hp !== undefined ? e[1].hp : e[1].maxHp; return hp > 0; });
  const speakOptions = ['Мастер'].concat(spawnedList.map(function (e) { return e[1].name; }));
  const activeSpeaker = speakOptions.indexOf(speakAs) >= 0 ? speakAs : 'Мастер';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 420 }}>
      <RollPopup roll={chatRoll} onClose={function () { setChatRoll(null); }} />
      <CoopRollPopup roll={chatCoopRoll} onClose={function () { setChatCoopRoll(null); }} />
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <h2>Чат и лог</h2>
        {pr.clearChat && <button onClick={function () { if (!window.confirm('Очистить весь чат (сообщения и броски)?')) return; pr.clearChat(); if (pr.clearLogs) pr.clearLogs(); }} className="btn sm">Очистить</button>}
      </div>
      {spawnedList.length > 0 && (
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="lblm">Говорю за:</span>
          {speakOptions.map(function (name) { return <button key={name} onClick={function () { setSpeakAs(name); }} className={'btn sm' + (activeSpeaker === name ? ' main' : '')}>{name}</button>; })}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatTab chat={pr.chat} logs={pr.logs} sendChat={pr.sendChat} addLog={pr.addLog} onRoll={setChatRoll} onCoopRoll={setChatCoopRoll} characters={pr.characters} spawned={pr.spawned} who={activeSpeaker} />
      </div>
    </div>
  );
}

function GMPanel(pr) {
  const [sid, setSid] = useState(null);
  const [section, setSection] = useState('overview');
  const [showDonate, setShowDonate] = useState(false);

  const sel = pr.characters.find(function (c) { return c._fbId === sid; });
  if (sel) return <GameView char={sel} save={function (d) { pr.saveChar(sel._fbId, d); }} onBack={function () { setSid(null); }} isGM={true} logs={pr.logs} addLog={pr.addLog} addGmLog={pr.addGmLog} chat={pr.chat} sendChat={pr.sendChat} lore={pr.lore} mapData={pr.mapData} saveMap={pr.saveMap} characters={pr.characters} spawned={pr.spawned} saveSpawned={pr.saveSpawned} pendAtk={pr.pendAtk} clearPendingAttack={pr.clearPendingAttack} room={pr.roomCode} savePendingAttack={pr.savePendingAttack} saveNpcHit={pr.saveNpcHit} shop={pr.shop} initiative={pr.initiative} saveInitiative={pr.saveInitiative} traits={pr.traits} />;

  const backToOverview = function () { setSection('overview'); };

  return (
    <div className="gm-shell">
      {showDonate && <DonatePage onClose={function () { setShowDonate(false); }} isGM={true} saveMap={pr.saveMap} mapData={pr.mapData} />}
      <nav className="gm-nav">
        {NAV.map(function (n) { return <button key={n.id} className={section === n.id ? 'on' : ''} onClick={function () { setSection(n.id); }}>{n.icon}<span>{n.label}</span></button>; })}
      </nav>
      <div className="gm-body">
        {section === 'overview' && <Overview characters={pr.characters} saveChar={pr.saveChar} deleteChar={pr.deleteChar} onOpen={function (id) { setSid(id); }} addLog={pr.addLog} addGmLog={pr.addGmLog} myName={pr.myName} shop={pr.shop} />}
        {section === 'chat' && <ChatSection chat={pr.chat} logs={pr.logs} sendChat={pr.sendChat} addLog={pr.addLog} clearChat={pr.clearChat} clearLogs={pr.clearLogs} characters={pr.characters} spawned={pr.spawned} />}
        {section === 'history' && <HistoryPanel gmLog={pr.gmLog} clearGmLog={pr.clearGmLog} />}
        {section === 'bestiary' && <BestiaryEditor npcTempl={pr.npcTempl} saveNpcTempl={pr.saveNpcTempl} spawned={pr.spawned} saveSpawned={pr.saveSpawned} onBack={backToOverview} addLog={pr.addLog} characters={pr.characters} roomCode={pr.roomCode} savePendingAttack={pr.savePendingAttack} clearPendingAttack={pr.clearPendingAttack} pendAtk={pr.pendAtk} logs={pr.logs} initiative={pr.initiative} saveInitiative={pr.saveInitiative} shop={pr.shop} scene={pr.scene} saveScene={pr.saveScene} />}
        {section === 'lore' && <LoreEditor lore={pr.lore} saveLore={pr.saveLore} mapData={pr.mapData} saveMap={pr.saveMap} characters={pr.characters} onBack={backToOverview} />}
        {section === 'profs' && <ProfEditor profs={pr.profs} saveProfs={pr.saveProfs} onBack={backToOverview} />}
        {section === 'shop' && <ShopEditor shop={pr.shop} saveShop={pr.saveShop} onBack={backToOverview} />}
        {section === 'gear' && <GearEditor traits={pr.traits} saveTraits={pr.saveTraits} onBack={backToOverview} />}
      </div>
    </div>
  );
}

export default GMPanel;
