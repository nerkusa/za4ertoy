import React, { useState, useEffect } from 'react';
import { r1 } from '../utils/dice';
import { bleedAmount } from '../utils/crits';
import { cF, hpOf } from '../utils/character';
import { IconCar, IconBattle, IconChat, IconLib, IconScroll, IconSkills, IconBracelet, IconBody, IconInv } from '../icons/index';
import Dossier from './Dossier';
import CreationWizard from './CreationWizard';
import LifepathStep from './LifepathStep';
import ReputationCard from './ReputationCard';
import PartyRail from './PartyRail';
import ChatTab from './tabs/ChatTab';
import SkillsTab from './tabs/SkillsTab';
import BraceletTab from './tabs/BraceletTab';
import BodyTab from './tabs/BodyTab';
import InvTab from './tabs/InvTab';
import GarageTab from './tabs/GarageTab';
import CheatTab from './tabs/CheatTab';
import CombatTab from './tabs/CombatTab';
import CoopRollPopup from './combat/CoopRollPopup';
import DamagePopup from './combat/DamagePopup';
import GMAttackPanel from './combat/GMAttackPanel';
import LibTab from './tabs/LibTab';
import LevelUpPopup from './combat/LevelUpPopup';
import NpcDeathPopup from './combat/NpcDeathPopup';
import PendingAttackPopup from './combat/PendingAttackPopup';
import PlayerAttackNotif from './combat/PlayerAttackNotif';
import PlayerAttackStatus from './combat/PlayerAttackStatus';
import RollPopup from './combat/RollPopup';

/* Лист игрока: шапка-досье и вкладки. Этот же лист открывает ГМ
   (isGM) — тогда он правит любое поле. */
function GameView(pr){var c=pr.char;var _t=useState("skills");var tab=_t[0];var sT=_t[1];var _r=useState(null);var rP=_r[0];var sRP=_r[1];
var _nd=useState(null);var npcDeathEv=_nd[0];var sNpcDeathEv=_nd[1];
var _cp=useState(null);var coopTarget=_cp[0];var sCoopTarget=_cp[1];
var _cr=useState(null);var coopRoll=_cr[0];var sCoopRoll=_cr[1];
function quickRoll(charId){sT("chat");sCoopTarget(charId)}
useEffect(function(){if(!c.hpRoll)pr.save(Object.assign({},c,{hpRoll:r1(10)}))},[c._fbId]);
/* «Депо» действует до конца боя: бой кончился — флаг снимается */
useEffect(function(){if(c.combatDepoUsed&&!pr.initiative&&!pr.isGM)pr.save(Object.assign({},c,{combatDepoUsed:false}))},[!!pr.initiative,c.combatDepoUsed]);
/* Кровотечение: в начале своего хода теряешь Здоровье. Списывает только
   клиент игрока, один раз на ход (bleedTick = раунд:ход). */
var _ini=pr.initiative;var _turnKey=_ini&&Array.isArray(_ini.list)&&_ini.list[_ini.turn||0]&&_ini.list[_ini.turn||0].id===c._fbId?(_ini.round||1)+":"+(_ini.turn||0):"";
useEffect(function(){
  if(pr.isGM||!_turnKey||c.bleedTick===_turnKey)return;
  var b=bleedAmount(c);if(!b){pr.save(Object.assign({},c,{bleedTick:_turnKey}));return}
  var h=hpOf(c,cF(c).fs);var nh=Math.max(0,h.cur-b);
  pr.save(Object.assign({},c,{curHp:nh,bleedTick:_turnKey}));
  if(pr.addLog)pr.addLog({who:c.name||"???",type:"crit",label:(c.name||"???")+": кровотечение −"+b+" Здоровья",detail:"начало хода · Здоровье "+h.cur+"→"+nh,total:b});
},[_turnKey]);
var tabs=[{id:"skills",l:"Навыки",ic:<IconSkills/>},{id:"combat",l:"Бой",ic:<IconBattle/>},{id:"bracelet",l:"Браслет",ic:<IconBracelet/>},{id:"body",l:"Тело",ic:<IconBody/>},{id:"bag",l:"Сумка",ic:<IconInv/>},{id:"garage",l:"Машина",ic:<IconCar/>},{id:"chat",l:"Чат и лог",ic:<IconChat/>},{id:"library",l:"Лор",ic:<IconLib/>},{id:"guide",l:"Памятка",ic:<IconScroll/>}];
var pendAtk=pr.pendAtk||{};var clearPA=pr.clearPendingAttack;var isGMv=pr.isGM;
/* Лист не принят — игрок проходит пошаговое создание */
if(!isGMv&&!c.locked)return <CreationWizard char={c} save={pr.save} addLog={pr.addLog}/>;
/* Шаг 7 — жизненный путь — после «Принять» */
if(!isGMv&&c.lifepath&&!c.lifepath.done)return <LifepathStep char={c} save={pr.save} addLog={pr.addLog} room={pr.room}/>;
return(<div className="zc-main"><RollPopup roll={rP} onClose={function(){sRP(null)}}/>{!isGMv&&<PendingAttackPopup attacks={pendAtk} myId={pr.char._fbId} myChar={pr.char} clearPendingAttack={clearPA} addLog={pr.addLog} onRoll={sRP} room={pr.room}/>}{!isGMv&&<PlayerAttackStatus attacks={pendAtk} myName={pr.char.name} myId={pr.char._fbId} room={pr.room} spawned={pr.spawned||{}} saveSpawned={pr.saveSpawned} addLog={pr.addLog} onRoll={sRP} saveNpcHit={pr.saveNpcHit}/>}{isGMv&&<GMAttackPanel attacks={pendAtk} clearPendingAttack={clearPA} characters={pr.characters||[]} room={pr.room} addLog={pr.addLog} onRoll={sRP}/>}{!isGMv&&(function(){var myEvs=Object.entries(pr.dmgEvents||{}).filter(function(e){return e[1]&&pr.char._fbId===e[0]});if(myEvs.length===0)return null;var ev=myEvs[0];return <DamagePopup event={ev[1]} onClose={function(){if(pr.clearDmgEvent)pr.clearDmgEvent(ev[0]);}}/>;})()}{isGMv&&npcDeathEv&&<NpcDeathPopup event={npcDeathEv} onClose={function(){sNpcDeathEv(null)}}/>}{isGMv&&<PlayerAttackNotif attacks={pendAtk} clearPendingAttack={clearPA} spawned={pr.spawned||{}} saveSpawned={pr.saveSpawned} addLog={pr.addLog} onRoll={sRP} room={pr.room}/>}{!isGMv&&c.levelUpPending&&<LevelUpPopup pending={c.levelUpPending} onAccept={function(){pr.save(Object.assign({},c,{levelUpPending:null}))}}/>}<CoopRollPopup roll={coopRoll} onClose={function(){sCoopRoll(null)}}/>{c.captured&&<div className="warnbox" style={{margin:"10px 0",fontWeight:700}}>{"Захвачен донором «"+(c.captured.by||"?")+"». Личности носителя больше нет — персонаж у мастера."}</div>}
<div className="zc-scroll">
<Dossier char={c} save={pr.save} isGM={pr.isGM} initiative={pr.initiative} onBack={pr.onBack}/>
<div>
<div className="tabs" role="tablist">{tabs.map(function(t){return <button key={t.id} role="tab" aria-selected={tab===t.id?"true":"false"} onClick={function(){sT(t.id)}}>{t.ic}{t.l}</button>})}</div>
<div className="panel" style={tab==="chat"?{height:"72vh",minHeight:380,overflow:"hidden"}:null}>
{tab==="skills"&&<SkillsTab char={c} save={pr.save} onRoll={sRP} isGM={pr.isGM} addLog={pr.addLog} initiative={pr.initiative}/>}
{tab==="combat"&&<CombatTab vehicles={pr.vehicles} char={c} save={pr.save} logs={pr.logs} addLog={pr.addLog} onRoll={sRP} spawned={pr.spawned} saveSpawned={pr.saveSpawned} characters={pr.characters} isGM={pr.isGM} onNpcDeath={sNpcDeathEv} savePendingAttack={pr.savePendingAttack} room={pr.room} saveNpcHit={pr.saveNpcHit} shop={pr.shop} initiative={pr.initiative} saveInitiative={pr.saveInitiative}/>}
{tab==="bracelet"&&<BraceletTab char={c} save={pr.save} onRoll={sRP} isGM={pr.isGM} addLog={pr.addLog} addGmLog={pr.addGmLog} shop={pr.shop} initiative={pr.initiative}/>}
{tab==="body"&&<BodyTab addGmLog={pr.addGmLog} char={c} save={pr.save} onRoll={sRP} isGM={pr.isGM} addLog={pr.addLog} shop={pr.shop} initiative={pr.initiative} changeAccount={pr.changeAccount}/>}
{tab==="body"&&<div style={{marginTop:12}}><ReputationCard factions={pr.factions}/></div>}
{tab==="garage"&&<GarageTab char={c} save={pr.save} onRoll={sRP} isGM={pr.isGM} addLog={pr.addLog} shop={pr.shop} vehicles={pr.vehicles} saveVehicle={pr.saveVehicle} characters={pr.characters} initiative={pr.initiative}/>}
{tab==="bag"&&<InvTab char={c} save={pr.save} shop={pr.shop} addLog={pr.addLog} onRoll={sRP}/>}
{tab==="chat"&&<ChatTab chat={pr.chat} logs={pr.logs} sendChat={pr.sendChat} addLog={pr.addLog} onRoll={sRP} onCoopRoll={sCoopRoll} char={isGMv?null:c} characters={pr.characters} spawned={pr.spawned} who={isGMv?"Мастер":(c.name||"???")} coopTarget={coopTarget} onCoopConsumed={function(){sCoopTarget(null)}}/>}
{tab==="library"&&<LibTab lore={pr.lore} mapData={pr.mapData} saveMap={pr.saveMap} characters={pr.characters} isGM={pr.isGM} charId={c._fbId}/>}
{tab==="guide"&&<CheatTab/>}
</div>
</div>
{tab==="chat"&&<PartyRail characters={pr.characters} selfId={c._fbId} onQuickRoll={quickRoll}/>}
</div>
</div>)}

export default GameView;
