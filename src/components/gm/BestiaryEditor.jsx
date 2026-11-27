import React, { useState } from 'react';
import { db, ref, set, update } from '../../firebase';
import { resolvePlayerHit, npcZoneMult, npcRaw, npcCritPatch } from '../../utils/hits';
import { npcCritPen } from '../../utils/crits';
import { movingPen } from '../../utils/vehicles';
import { ARMOR_T, SHIELD_T, ZONES, aimPen } from '../../data/combat';
import { DT, SD, SKD, WT, skLabel, NPC_SK, npcAtk, stName, stShort, wtLabel } from '../../data/stats';
import { S } from '../../styles/ui';
import { cF, mHP, willPenalty } from '../../utils/character';
import { calcAE } from '../../utils/combat';
import { r1, rN, sm, uid, rollHit } from '../../utils/dice';
import GMAttackPanel from '../combat/GMAttackPanel';
import { condsOf, condTurnStart } from '../../utils/conditions';
import CondBar from '../CondBar';
import PlayerAttackNotif from '../combat/PlayerAttackNotif';
import RollPopup from '../combat/RollPopup';
import InitiativeBar from '../combat/InitiativeBar';
import ShopPicker from '../ShopPicker';
import { GROUP_HINTS } from '../../data/npcDefaults';
import { buildAllNpcDefaults, CAMPAIGN_CAT } from '../../data/npcPacks';
import { FACTIONS, factionOf } from '../../data/factions';
/* Значок фракции у NPC */
function FacBadge(p){var f=factionOf(p.id);if(!f)return null;return <span title={f.name+(f.sign?" · знак: "+f.sign:"")} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:18,height:18,padding:"0 4px",background:"#211d18",color:"#e9b12b",fontFamily:"var(--f-mono)",fontSize:10,marginLeft:4}}>{f.icon}</span>}

/* Встроенная рукопашная атака — есть у каждого NPC изначально */
var FIST={name:"Кулаки",dice:"1d4",dmgType:"Д",bonus:0,type:"Brawl"};
/* Имена навыков, уже покрытых NPC_SK (боевые) — остальные навыки из SKD
   считаются "дополнительными" (для не-боевых проверок NPC: расследование,
   убеждение, ремесло и т.д.) и хранятся отдельно в n.extraSkills{имя:значение}. */
var NPC_SK_NAMES={"Уклонение":1,"Ближний бой":1,"Огнестрел":1,"Метание":1,"Атлетика":1};
var EXTRA_SK_BY_STAT={};
Object.keys(SKD).forEach(function(st){EXTRA_SK_BY_STAT[st]=SKD[st].filter(function(s){return !NPC_SK_NAMES[s.name]})});
var EXTRA_SK_STAT={};
Object.keys(SKD).forEach(function(st){SKD[st].forEach(function(s){if(!NPC_SK_NAMES[s.name])EXTRA_SK_STAT[s.name]=st})});

function BestiaryEditor(pr){
var templ=pr.npcTempl||{};var spawned=pr.spawned||{};
var _cat=useState(null);var selCat=_cat[0];var sCat=_cat[1];
var _cn=useState("");var catName=_cn[0];var sCatName=_cn[1];
/* roll popup для ГМ в бестиарии */
var _rp=useState(null);var rollP=_rp[0];var sRollP=_rp[1];
/* target selection for NPC attacks */
var _ptgt=useState(null);var playerTgtId=_ptgt[0];var sPlayerTgt=_ptgt[1];
var _ntgt=useState(null);var npcTgtId=_ntgt[0];var sNpcTgt=_ntgt[1];
var _pzone=useState("Торс");var playerZone=_pzone[0];var sPlayerZone=_pzone[1];
var _naim=useState(false);var npcAim=_naim[0];var sNpcAim=_naim[1];
/* NPC form state */
var _nn=useState("");var nn=_nn[0];var sNN=_nn[1];var _nl=useState(1);var nl=_nl[0];var sNL=_nl[1];var _nhp=useState(20);var nhp=_nhp[0];var sNHP=_nhp[1];var _nxp=useState(20);var nxp=_nxp[0];var sNXP=_nxp[1];
var _nstats=useState({telo:3,reak:3,vosp:3,razum:2,har:2,volya:3});var nstats=_nstats[0];var sNStats=_nstats[1];
var _nskills=useState({dodge:2,melee:2});var nskills=_nskills[0];var sNSkills=_nskills[1];
var _skn=useState(null);var skNpc=_skn[0];var sSkNpc=_skn[1];
var _nweapons=useState([]);var nweapons=_nweapons[0];var sNWeapons=_nweapons[1];
var _nar=useState("none");var nar=_nar[0];var sNAR=_nar[1];var _narh=useState(10);var narh=_narh[0];var sNARH=_narh[1];var _narnm=useState("");var narnm=_narnm[0];var sNARNM=_narnm[1];
var _narbod=useState("none");var narbod=_narbod[0];var sNARBOD=_narbod[1];var _narbh=useState(10);var narbh=_narbh[0];var sNARBH=_narbh[1];var _narbnm=useState("");var narbnm=_narbnm[0];var sNARBNM=_narbnm[1];
var _nsh=useState("none");var nsh=_nsh[0];var sNSh=_nsh[1];var _nshh=useState(15);var nshh=_nshh[0];var sNShH=_nshh[1];var _nshnm=useState("");var nshnm=_nshnm[0];var sNShNM=_nshnm[1];
var _twn=useState("");var twn=_twn[0];var sTWN=_twn[1];var _twd=useState("1d6");var twd=_twd[0];var sTWD=_twd[1];var _twt=useState("Battle");var twt=_twt[0];var sTWT=_twt[1];var _twdt=useState("Р");var twdt=_twdt[0];var sTWDT=_twdt[1];var _twb=useState(0);var twb=_twb[0];var sTWB=_twb[1];
var _navat=useState("");var navat=_navat[0];var sNAvat=_navat[1];
var _nfac=useState("");var nfac=_nfac[0];var sNFac=_nfac[1];
var _ff=useState("");var facFilter=_ff[0];var sFacFilter=_ff[1];
var _nexsk=useState({});var nexsk=_nexsk[0];var sNExSk=_nexsk[1];
var _editNpc=useState(null);var editNpc=_editNpc[0];var sEditNpc=_editNpc[1];
var cats=Object.keys(templ);
var playerChars=(pr.characters||[]).filter(function(x){return x.active});if(playerChars.length===0)playerChars=(pr.characters||[]);
var allPlayerChars=pr.characters||[];

function addCat(){if(!catName.trim())return;var n=Object.assign({},templ);n[catName.trim()]={_created:Date.now()};pr.saveNpcTempl(n);sCatName("")}
function delCat(c2){var n=Object.assign({},templ);delete n[c2];pr.saveNpcTempl(n)}
function seedNpcs(){
  var defaults=buildAllNpcDefaults();var n=Object.assign({},templ);var added=0;
  Object.keys(defaults).forEach(function(catName){
    var defCat=defaults[catName];var existing=n[catName]||{_created:Date.now()};
    var existingNames={};Object.keys(existing).forEach(function(k){if(k!=="_created")existingNames[(existing[k].name||"").trim().toLowerCase()]=true;});
    var merged=Object.assign({},existing);
    Object.keys(defCat).forEach(function(k){if(k==="_created")return;var nd=defCat[k];var nameKey=(nd.name||"").trim().toLowerCase();if(existingNames[nameKey])return;merged[k]=nd;added++;});
    n[catName]=merged;
  });
  if(added===0){alert("Все эти NPC уже есть в бестиарии.");return;}
  if(!window.confirm("Добавить "+added+" NPC из стартового бестиария (книга, общий пак и кампания «Падение Запада»)? Существующих не тронет.")) return;
  pr.saveNpcTempl(n);
}
function resetForm(){sNN("");sNL(1);sNHP(20);sNXP(20);sNStats({telo:3,reak:3,vosp:3,razum:2,har:2,volya:3});sNSkills({dodge:2,melee:2});sNExSk({});sNWeapons([]);sNAR("none");sNARH(10);sNARNM("");sNARBOD("none");sNARBH(10);sNARBNM("");sNSh("none");sNShH(15);sNShNM("");sNAvat("");sNFac("");sEditNpc(null)}
function loadNpcToForm(n){sNN(n.name||"");sNL(n.level||1);sNHP(n.maxHp||20);sNXP(n.xpReward!=null?n.xpReward:(n.maxHp||20));sNStats(n.stats||{telo:3,reak:3,vosp:3,razum:2,har:2,volya:3});sNSkills(n.skills||{dodge:2,melee:2});sNExSk(n.extraSkills||{});sNWeapons(n.weapons||[]);sNAR(n.armorHead||"none");sNARH(n.armorHeadHp||10);sNARNM(n.armorHeadName||"");sNARBOD(n.armorBody||"none");sNARBH(n.armorBodyHp||10);sNARBNM(n.armorBodyName||"");sNSh(n.shieldType||"none");sNShH(n.shieldHp||15);sNShNM(n.shieldName||"");sNAvat(n.avatar||"");sNFac(n.faction||"")}
function saveNpc(){if(!nn.trim()||!selCat)return;var n=Object.assign({},templ);if(!n[selCat])n[selCat]={_created:Date.now()};var id=editNpc||("npc_"+Date.now());n[selCat][id]={name:nn.trim(),level:nl,hp:nhp,maxHp:nhp,xpReward:nxp,stats:Object.assign({},nstats),skills:Object.assign({},nskills),extraSkills:Object.assign({},nexsk),weapons:nweapons.slice(),armorHead:nar,armorHeadHp:narh,armorHeadMaxHp:narh,armorHeadName:nar!=="none"?narnm.trim():"",armorBody:narbod,armorBodyHp:narbh,armorBodyMaxHp:narbh,armorBodyName:narbod!=="none"?narbnm.trim():"",shieldType:nsh,shieldHp:nshh,shieldMaxHp:nshh,shieldName:nsh!=="none"?nshnm.trim():"",avatar:navat||"",faction:nfac||null,zoneMult:(n[selCat][id]||{}).zoneMult||null,halfKR:!!(n[selCat][id]||{}).halfKR,ironCrit:!!(n[selCat][id]||{}).ironCrit,note:(n[selCat][id]||{}).note||"",group:(n[selCat][id]||{}).group||"",arc:(n[selCat][id]||{}).arc||"",campaign:!!(n[selCat][id]||{}).campaign||selCat===CAMPAIGN_CAT};pr.saveNpcTempl(n);resetForm()}
function delNpc(cat,id){var n=Object.assign({},templ);if(n[cat])delete n[cat][id];pr.saveNpcTempl(n)}
function addTmpWeapon(){if(!twn.trim())return;sNWeapons(nweapons.concat([{id:uid(),name:twn.trim(),dice:twd,type:twt,dmgType:twdt,bonus:twb}]));sTWN("")}
function addWeaponFromShop(it){sNWeapons(nweapons.concat([{id:uid(),name:it.name,dice:it.dmgDice,type:it.wtype,dmgType:it.dmgType,bonus:it.bonus||0}]))}
function pickArmorHead(it){sNAR(it.type||"light");sNARH(it.hp||10);sNARNM(it.name||"")}
function pickArmorBody(it){sNARBOD(it.type||"light");sNARBH(it.hp||10);sNARBNM(it.name||"")}
function pickShield(it){sNSh(it.type||"light");sNShH(it.hp||15);sNShNM(it.name||"")}
function spawnNpc(cat,id){var t=templ[cat]&&templ[cat][id];if(!t)return;var sp=Object.assign({},spawned);var sid="s_"+Date.now();sp[sid]=Object.assign({},t,{_catId:cat,_tmplId:id,spawnedAt:Date.now()});pr.saveSpawned(sp);pr.addLog({who:"ГМ",type:"spawn",label:""+t.name+" появился!",detail:"",total:0})}
function despawn(id){var sp=Object.assign({},spawned);delete sp[id];pr.saveSpawned(sp)}
function updateSpawned(id,data){var sp=Object.assign({},spawned);sp[id]=data;pr.saveSpawned(sp)}
/* Текущая Воля NPC (по умолчанию = базовый стат, если ещё не тратилась) и штраф = самой отрицательной Воле при уходе в минус */
function npcCurWill(s){return s.curWill!=null?s.curWill:((s.stats||{}).volya||0)}
/* Штраф NPC: отрицательная Воля плюс статусы критов (контузия и т. п.) */
function npcWillPen(s){return willPenalty(npcCurWill(s))+npcCritPen(s,"all")}
function rollInitiative(){
  var list=[];
  /* Машина в бою — через водителя: в порядке хода видно, кто за рулём */
  function carOf(id){var v=Object.values(pr.vehicles||{}).find(function(x){return x.driverId===id});if(!v)(pr.characters||[]).forEach(function(pc){(pc.garage||[]).forEach(function(g){if(g.driverId===id)v=g})});return v?v.name:""}
  (pr.characters||[]).filter(function(x){return x.active}).forEach(function(pc){var inf=cF(pc);var rv=inf.fs.reak||0;var R=rollHit();list.push({id:pc._fbId,name:pc.name||"?",kind:"player",init:R.d+rv,car:carOf(pc._fbId)})});
  Object.entries(spawned).forEach(function(e){var id=e[0];var s=e[1];var hp=s.hp!==undefined?s.hp:s.maxHp;if(hp<=0)return;var rv=(s.stats||{}).reak||0;var R=rollHit();list.push({id:id,name:s.name,kind:"npc",init:R.d+rv,car:carOf(id)})});
  if(!list.length)return;
  list.sort(function(a,b){return b.init-a.init});
  if(pr.saveInitiative)pr.saveInitiative({list:list,turn:0,round:1});
  pr.addLog({who:"ГМ",type:"spawn",label:"Инициатива брошена",detail:list.map(function(x){return x.name+":"+x.init}).join(", "),total:0});
}
function nextTurn(){var init=pr.initiative;if(!init||!init.list||!init.list.length)return;var n=(init.turn||0)+1;var round=init.round||1;if(n>=init.list.length){n=0;round++}if(pr.saveInitiative)pr.saveInitiative(Object.assign({},init,{turn:n,round:round}));
  /* начало хода NPC: огонь, пропуск хода, отсчёт состояний (у игроков — на их клиенте) */
  var ent=init.list[n];var sp=ent&&ent.kind==="npc"?spawned[ent.id]:null;
  if(sp&&condsOf(sp).length){var ct=condTurnStart(sp);var hp=sp.hp!==undefined?sp.hp:sp.maxHp;var nh=Math.max(0,hp-ct.dmg);
    var all=Object.assign({},spawned);all[ent.id]=Object.assign({},sp,{conds:ct.conds,hp:nh});pr.saveSpawned(all);
    if(ct.notes.length)pr.addLog({who:sp.name,type:"crit",label:sp.name+": "+ct.notes.join(", "),detail:"начало хода"+(ct.dmg?" · Здоровье "+hp+"→"+nh:""),total:ct.dmg});
    if(ct.ended.length)setTimeout(function(){pr.addLog({who:sp.name,type:"rest",label:sp.name+": прошло — "+ct.ended.join(", "),detail:"",total:0})},5)}
}
function endCombat(){if(pr.saveInitiative)pr.saveInitiative(null);(pr.characters||[]).forEach(function(pc){if(pc.combatDepoUsed)set(ref(db,"rooms/"+pr.roomCode+"/characters/"+pc._fbId+"/combatDepoUsed"),false)});pr.addLog({who:"ГМ",type:"spawn",label:"Бой окончен",detail:"",total:0})}

/* Применить урон к игроку (с учётом брони и зоны) */
function applyDmgToPlayer(ptgt,rawDmg,dmgType,zoneName,who){
  var pZone=ZONES.find(function(x){return x.name===zoneName})||ZONES[2];
  var h=resolvePlayerHit(ptgt,rawDmg,dmgType,pZone,null);
  update(ref(db,"rooms/"+pr.roomCode+"/characters/"+ptgt._fbId),h.patch);
  pr.addLog({who:who,type:"dmg_npc",label:ptgt.name+" ["+pZone.name+"] "+dmgType+" · "+h.hd+" Здоровья",detail:h.desc+" | Здоровье "+h.oldHp+"→"+h.newHp,total:h.hd});
  if(h.crit)setTimeout(function(){pr.addLog({who:ptgt.name,type:"crit",label:h.crit.label,detail:"удар на "+h.hd+" Здоровья",total:0})},5);
  /* Событие урона — игрок увидит попап */
  if(h.hd>0){set(ref(db,"rooms/"+pr.roomCode+"/dmgEvents/"+ptgt._fbId),{attackerName:who,dmg:h.hd,oldHp:h.oldHp,newHp:h.newHp,maxHp:h.maxHp,crit:h.crit?h.crit.label:"",ts:Date.now()});}
}

/* NPC: бросок на попадание */
function npcAttack(s,w){
  var st=s.stats||{};var sk=s.skills||{};
  var na=npcAtk(st,sk,w);var rv=na.rv,skVal=na.skVal,skNm=na.skNm,atName=na.atName;
  var wp=npcWillPen(s);
  var R=rollHit();var d=R.d;var aimP=(npcAim&&playerTgtId)?aimPen(playerZone):0;wp+=npcCritPen(s,"attack");
  /* Стрельба на ходу: −2, водитель −4, дорожники без штрафа */
  if((pr.scene||{}).moving){var sid=Object.keys(spawned).find(function(k){return spawned[k]===s});var drv=Object.values(pr.vehicles||{}).some(function(v){return v.driverId===sid});wp+=movingPen(drv,/дорожник/i.test(s.name||""))}var t=d+rv+skVal+(w.bonus||0)-aimP+wp;
  var tgtChar=playerTgtId?playerChars.find(function(x){return x._fbId===playerTgtId}):null;
  var tgtName=tgtChar?tgtChar.name:"";
  pr.addLog({who:s.name,type:"hit",label:""+w.name+(tgtName?" → "+tgtName:"")+(aimP?" "+playerZone+"(−"+aimP+")":"")+(R.crit?" крит":R.fumble?" срыв":""),detail:"d10("+d+")"+" + "+atName+"("+rv+") + "+skNm+"("+skVal+") + бонус("+(w.bonus||0)+")"+(aimP?" − прицел("+aimP+")":"")+(wp?" − деморализован("+Math.abs(wp)+")":"")+" = "+t,total:t});
  /* RollPopup не показываем — результат отображается в GMAttackPanel */
  if(!playerTgtId){sRollP({label:s.name+" — "+w.name+" Попад.",d10:d,crit:R.crit,fumble:R.fumble,parts:[{label:atName,value:rv},{label:skNm,value:skVal},{label:"Бнс",value:w.bonus||0}],total:t,subtext:"(нет цели)"});}
  if(playerTgtId&&pr.savePendingAttack){
    pr.savePendingAttack({id:"atk_"+Date.now(),attackerName:s.name,targetId:playerTgtId,targetName:tgtName,
      hitRoll:t,atkD:d,atkREF:rv,atkStatName:atName,atkSkill:skVal,atkSkillName:skNm,atkBonus:w.bonus||0,atkPenalty:wp,atkCrit:R.crit,atkFumble:R.fumble,
      weaponName:w.name,dmgDice:w.dice||"1d6",dmgType:w.dmgType||"Р",dmgBonus:w.bonus||0,
      zone:playerZone,aimedZone:aimP?playerZone:null,status:"pending_dodge",ts:Date.now()});
  }
}

/* NPC: бросок на урон + применение к игроку */
function npcDmg(s,w){
  var m=(w.dice||"1d6").match(/(\d+)d(\d+)/);if(!m)return;
  var dice=rN(parseInt(m[1]),parseInt(m[2]));
  var rawDmg=sm(dice)+(w.bonus||0);
  var ptgt=playerTgtId?playerChars.find(function(x){return x._fbId===playerTgtId}):null;
  if(ptgt){
    applyDmgToPlayer(ptgt,rawDmg,w.dmgType,playerZone,s.name);
  } else {
    pr.addLog({who:s.name,type:"dmg",label:""+w.name+" ("+w.dmgType+") — нет цели",detail:(w.dice||"1d6")+"["+dice.join(",")+"]+бонус("+(w.bonus||0)+")="+rawDmg,total:rawDmg});
  }
  /* Попап урона без d10 — формула: кубик + бонус */
  sRollP({label:s.name+" "+w.name+" Урон",d10:null,parts:[{label:w.dice||"1d6",value:sm(dice)},{label:"Бнс",value:w.bonus||0}],total:rawDmg,subtext:"Тип: "+w.dmgType+(ptgt?" → "+ptgt.name+"\nЗона: "+playerZone:" (нет цели)")});
}

/* NPC пытается устрашить игрока: d10+EMP+Запугивание (или d10+WILL «природный ужас», если навыка нет) */
function npcFear(s,id){
  if(!playerTgtId){alert("Выбери цель-игрока сверху");return}
  var st=s.stats||{};var exsk=s.extraSkills||{};
  var wp=npcWillPen(s);
  var hasIntim=(exsk["Запугивание"]||0)>0;
  var rv=hasIntim?(st.har||0):(st.volya||0);
  var skVal=hasIntim?(exsk["Запугивание"]||0):0;
  var statNm=hasIntim?"Характер":"Воля";var skNm=hasIntim?"Запугивание":"(природный ужас)";
  var R=rollHit();var d=R.d;var t=d+rv+skVal+wp;
  var tgtChar=playerChars.find(function(x){return x._fbId===playerTgtId});
  var tgtName=tgtChar?tgtChar.name:"";
  pr.addLog({who:s.name,type:"fear",label:""+s.name+" пытается устрашить"+(tgtName?" → "+tgtName:"")+(R.crit?" крит":R.fumble?" срыв":""),detail:"d10("+d+")"+" + "+statNm+"("+rv+") + "+skNm+"("+skVal+")"+(wp?" − деморализован("+Math.abs(wp)+")":"")+" = "+t,total:t});
  if(playerTgtId&&pr.savePendingAttack){
    pr.savePendingAttack({id:"atk_"+Date.now(),attackerName:s.name,targetId:playerTgtId,targetName:tgtName,fear:true,
      hitRoll:t,atkD:d,atkREF:rv,atkStatName:statNm,atkSkill:skVal,atkSkillName:skNm,atkBonus:0,atkPenalty:wp,atkCrit:R.crit,atkFumble:R.fumble,
      weaponName:"Устрашение",status:"pending_dodge",ts:Date.now()});
  }
}
/* Союзный NPC бьёт вражеского NPC — ГМ разрешает всё сам (бросок атаки vs уклонение → урон) */
function npcVsNpc(s,w){
  if(!npcTgtId){alert("Выбери цель-NPC (враг) сверху");return}
  var tgt=spawned[npcTgtId];if(!tgt){alert("Цель не найдена");return}
  var st=s.stats||{};var sk=s.skills||{};
  var na=npcAtk(st,sk,w);var rv=na.rv,skVal=na.skVal,atName=na.atName;
  var R=rollHit();var hit=R.d+rv+skVal+(w.bonus||0)+npcWillPen(s);
  var tst=tgt.stats||{};var tsk=tgt.skills||{};var D=rollHit();var dodge=D.d+(tst.reak||0)+(tsk.dodge||0)+npcWillPen(tgt);
  if(dodge>=hit){pr.addLog({who:s.name,type:"dodge",label:""+s.name+" → "+tgt.name+": промах (уклон "+dodge+" ≥ "+hit+")",detail:"",total:hit});sRollP({label:s.name+" → "+tgt.name,d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:atName,value:rv},{label:"нав",value:skVal}],total:hit,subtext:"Уклонился ("+dodge+")"});return;}
  var m=(w.dice||"1d6").match(/(\d+)d(\d+)/);var dice=m?rN(parseInt(m[1]),parseInt(m[2])):[r1(6)];
  var zoneD=r1(6);var zoneObj=ZONES[zoneD-1];var crit=R.crit?1.5:1;var rawDmg=Math.floor((sm(dice)+(w.bonus||0))*crit);var mult=Math.floor(npcRaw(tgt,rawDmg,w.dmgType)*npcZoneMult(tgt,zoneObj));
  var at=zoneObj.slot==="head"?(tgt.armorHead||"none"):(tgt.armorBody||"none");var ahp=zoneObj.slot==="head"?(tgt.armorHeadHp||0):(tgt.armorBodyHp||0);if(ahp<=0)at="none";
  var ae=zoneObj.ignoreArmor?{ad:0,hd:mult,desc:"мимо брони: "+zoneObj.name}:calcAE(at,w.dmgType||"Р",mult);
  var shieldDmg=0,shieldDesc="";
  if(tgt.shieldType&&tgt.shieldType!=="none"&&(tgt.shieldHp||0)>0){var shObj=SHIELD_T.find(function(t){return t.id===tgt.shieldType});var absorb=shObj?shObj.absorb:0;shieldDmg=Math.floor(ae.hd*absorb);ae=Object.assign({},ae,{hd:Math.max(0,ae.hd-shieldDmg)});shieldDesc=" щит "+(tgt.shieldName||(shObj?shObj.name:tgt.shieldType))+" −"+shieldDmg;}
  var newHp=Math.max(0,(tgt.hp||0)-ae.hd);var upd=Object.assign({},tgt,{hp:newHp});
  if(shieldDmg>0)upd.shieldHp=Math.max(0,(tgt.shieldHp||0)-shieldDmg);
  if(ae.ad>0){if(zoneObj.slot==="head")upd.armorHeadHp=Math.max(0,(tgt.armorHeadHp||0)-ae.ad);else upd.armorBodyHp=Math.max(0,(tgt.armorBodyHp||0)-ae.ad);}
  var _cr=npcCritPatch(tgt,zoneObj.name,ae.hd);Object.assign(upd,_cr.patch);if(_cr.label)setTimeout(function(){pr.addLog({who:s.name,type:"crit",label:tgt.name+": "+_cr.label,detail:"удар на "+ae.hd+" Здоровья",total:0})},5);
  updateSpawned(npcTgtId,upd);
  pr.addLog({who:s.name,type:"dmg",label:""+s.name+" → "+tgt.name+" ["+zoneObj.e+zoneObj.name+"] "+ae.hd+" HP"+(R.crit?" · крит":""),detail:hit+" vs "+dodge+" | "+ae.desc+shieldDesc+" | Здоровье "+(tgt.hp||0)+"→"+newHp,total:ae.hd});
  sRollP({label:s.name+" → "+tgt.name,d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:atName,value:rv},{label:"нав",value:skVal}],total:hit,subtext:""+ae.hd+" урона ("+zoneObj.name+")\nЗдоровье "+(tgt.hp||0)+"→"+newHp});
}

return(<div style={{flex:1,display:"flex",flexDirection:"column"}}>
<RollPopup roll={rollP} onClose={function(){sRollP(null)}}/>
<GMAttackPanel attacks={pr.pendAtk||{}} clearPendingAttack={pr.clearPendingAttack} characters={pr.characters||[]} room={pr.roomCode} addLog={pr.addLog} onRoll={sRollP}/>
<PlayerAttackNotif attacks={pr.pendAtk||{}} clearPendingAttack={pr.clearPendingAttack} spawned={pr.spawned||{}} saveSpawned={pr.saveSpawned} addLog={pr.addLog} onRoll={sRollP} room={pr.roomCode}/>
<div style={{padding:"8px 10px",borderBottom:"2px solid #8a3b2228",background:"#efe2d6",display:"flex",alignItems:"center",gap:6}}><button onClick={pr.onBack} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:"#6a6052"}}>←</button><span style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:14,color:"#8a3b22"}}>Бестиарий</span></div>
<div style={{flex:1,padding:8,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>

{/* Инициатива / порядок ходов */}
<div style={{display:"flex",flexDirection:"column",gap:5}}>
{pr.initiative?<InitiativeBar initiative={pr.initiative}/>:<div style={{fontSize:11,color:"#6a6052",fontStyle:"italic",border:"2px dashed #8a620030",borderRadius:0,padding:"6px 8px",background:"#f0e2b8"}}>Бой не начат. Отметь игроков «В игру», заспавни NPC и брось инициативу.</div>}
<div style={{display:"flex",gap:3}}>
{!pr.initiative&&<button onClick={rollInitiative} style={{flex:1,padding:"5px",borderRadius:0,border:"2px solid #8a620040",background:"#f0e2b8",color:"#8a6200",fontWeight:700,fontSize:10,cursor:"pointer"}}>Бросить инициативу</button>}
{pr.initiative&&<button onClick={nextTurn} style={{flex:1,padding:"5px",borderRadius:0,border:"none",background:"#8a6200",color:"#ebe3d1",fontWeight:700,fontSize:10,cursor:"pointer"}}>▶ Следующий ход</button>}
{pr.initiative&&<button onClick={rollInitiative} title="Перебросить" style={{padding:"5px 8px",borderRadius:0,border:"1px solid #c6bba3",background:"#f1ead9",color:"#6a6052",fontSize:10,cursor:"pointer"}}>Заново</button>}
{pr.initiative&&<button onClick={endCombat} title="Завершить бой" style={{padding:"5px 8px",borderRadius:0,border:"1px solid #8a3b2230",background:"#efe2d6",color:"#8a3b22",fontSize:10,cursor:"pointer"}}>Конец</button>}
</div>
</div>
{/* Флаги сцены: влияют на штрафы у всех */}
<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,color:"#6a6052",fontFamily:"var(--f-mono)",textTransform:"uppercase"}}>Сцена:</span>
{[["swamp","Топь","−2 к Атлетике и Уклонению всем; железной ноге без «Болотохода» ещё −2"],["offroad","Бездорожье","Ролики: −2 к Уклонению"],["moving","На ходу","Стрельба из едущей машины −2, водитель −4"]].map(function(f){var on=!!(pr.scene||{})[f[0]];return <button key={f[0]} title={f[2]} className={"btn sm"+(on?" main":"")} onClick={function(){var n=Object.assign({},pr.scene||{});n[f[0]]=!on;if(pr.saveScene)pr.saveScene(n);pr.addLog({who:"ГМ",type:"spawn",label:"Сцена: "+f[1]+(on?" — снято":" — включено"),detail:f[2],total:0})}}>{f[1]}</button>})}
</div>
{/* Выбор цели для атак NPC по игрокам */}
{<div style={{border:"2px solid #4f5b2a28",borderRadius:0,padding:"6px 8px",background:"#e5e4cc"}}>
<label style={Object.assign({},S.lb,{color:"#4f5b2a"})}>Цель NPC-атак (игрок)</label>
{playerChars.length===0&&<div style={{fontSize:11,color:"#6a6052",fontStyle:"italic",padding:"4px 0"}}>Нет активных игроков — отметь игроков "В игру" в панели ГМ</div>}
<div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}}>
{playerChars.map(function(pc){var inf2=cF(pc);var pMx=pc.hpOv||mHP(inf2.fs,pc);var pCur=pc.curHp!==null&&pc.curHp!==undefined?pc.curHp:pMx;var pPct=pMx>0?(pCur/pMx)*100:0;var isSel=playerTgtId===pc._fbId;
return <button key={pc._fbId} onClick={function(){sPlayerTgt(isSel?null:pc._fbId)}} style={{padding:"3px 7px",borderRadius:0,border:"2px solid "+(isSel?"#4f5b2a":"#c6bba3"),background:isSel?"#e5e4cc":"#f1ead9",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
<span>{pc.name}</span>
<div style={{width:40,height:4,background:"#e2d8c3",borderRadius:0,overflow:"hidden"}}><div style={{height:"100%",width:pPct+"%",background:pPct<=25?"#8a3b22":pPct<=50?"#8a6200":"#3f6b34",borderRadius:0}}/></div>
<span style={{fontSize:10,color:"#6a6052"}}>{pCur+"/"+pMx}</span>
</button>})}
</div>
{playerTgtId&&<div style={{marginTop:4}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><label style={Object.assign({},S.lb,{marginTop:3})}>Зона удара по игроку</label><button onClick={function(){sNpcAim(!npcAim)}} title="Прицельный удар: NPC бьёт по выбранной зоне со штрафом" style={{padding:"2px 7px",borderRadius:0,border:"2px solid "+(npcAim?"#8a6200":"#c6bba3"),background:npcAim?"#f0e2b8":"#f1ead9",fontSize:11,fontWeight:700,color:npcAim?"#8a6200":"#6a6052",cursor:"pointer"}}>{npcAim?("Прицельно (−"+aimPen(playerZone)+")"):"Прицельно: выкл"}</button></div>
<div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:2}}>
{ZONES.map(function(z){return <button key={z.name} onClick={function(){sPlayerZone(z.name)}} style={{padding:"2px 5px",borderRadius:0,border:"2px solid "+(playerZone===z.name?"#8a6200":"#c6bba3"),background:playerZone===z.name?"#f0e2b8":"#f1ead9",fontSize:11,fontWeight:playerZone===z.name?700:400,cursor:"pointer",opacity:npcAim&&playerZone!==z.name?0.5:1}}>{z.e+" "+z.name+(z.ignoreArmor?" (мимо брони)":"")+" ×"+z.mult+(npcAim?" −"+aimPen(z.name):"")}</button>})}
</div>
</div>}
</div>}

{/* NPC на поле боя */}
{Object.keys(spawned).length>0&&<div style={{border:"2px solid #8a3b2220",borderRadius:0,padding:"6px 8px",background:"#efe2d6"}}>
<div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:11,color:"#8a3b22",marginBottom:4}}>На поле боя</div>
<div style={{display:"flex",flexWrap:"wrap",gap:2,marginBottom:5,alignItems:"center"}}><span style={{fontSize:11,color:"#6a6052"}}>Цель для союзников:</span>{Object.entries(spawned).filter(function(e){var hp=e[1].hp!==undefined?e[1].hp:e[1].maxHp;return hp>0}).map(function(e){var nid=e[0];var n=e[1];var on=npcTgtId===nid;return <button key={nid} onClick={function(){sNpcTgt(on?null:nid)}} style={{padding:"2px 6px",borderRadius:0,border:"2px solid "+(on?"#8a3b22":"#c6bba3"),background:on?"#efe2d6":"#f1ead9",fontSize:11,fontWeight:on?700:400,cursor:"pointer",color:n.side==="ally"?"#3f6b34":"#211d18"}}>{(n.side==="ally"?"":"")+n.name}</button>})}</div>
{Object.entries(spawned).map(function(e){var id=e[0];var s=e[1];var hpP=s.maxHp>0?((s.hp||0)/s.maxHp)*100:0;var st=s.stats||{};var sk=s.skills||{};var wpns=s.weapons||[];
return <div key={id} style={{background:"#e2d8c3",border:"1px solid #c6bba3",borderRadius:0,padding:"5px 7px",marginBottom:4}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{display:"flex",alignItems:"center",gap:5,fontWeight:700,fontSize:11}}>{s.avatar&&<img src={s.avatar} alt="" style={{width:20,height:20,borderRadius:0,objectFit:"cover"}}/>}{s.name}<FacBadge id={s.faction}/>{s.arc&&<span style={{fontSize:9,color:"#6a6052",fontWeight:400}}>{"арка "+s.arc}</span>}{s.faction&&((pr.factions||{})[s.faction]||{}).rep<=-3?<span style={{fontSize:10,color:"#8a3b22",fontWeight:700,marginLeft:4}}>враги партии: нападает сразу</span>:null} <span style={{fontSize:11,color:"#6a6052"}}>Ур.{s.level}</span></span><div style={{display:"flex",gap:4,alignItems:"center"}}><button onClick={function(){updateSpawned(id,Object.assign({},s,{side:s.side==="ally"?"enemy":"ally"}))}} title="Сторона: союзник/враг" style={{fontSize:11,padding:"1px 6px",borderRadius:0,border:"1px solid "+(s.side==="ally"?"#3f6b3440":"#8a3b2240"),background:s.side==="ally"?"#e5e4cc":"#efe2d6",color:s.side==="ally"?"#3f6b34":"#8a3b22",fontWeight:700,cursor:"pointer"}}>{s.side==="ally"?"союзник":"враг"}</button><button onClick={function(){if(window.confirm("Убрать "+s.name+"?"))despawn(id)}} style={{fontSize:11,background:"none",border:"none",color:"#8a3b22",cursor:"pointer"}}>✕</button></div></div>
{s.note&&<div style={{fontSize:11,color:"#6a6052",fontStyle:"italic"}}>{s.note}</div>}
<div style={{marginTop:3}}><CondBar target={s} edit={true} onChange={function(conds,label){updateSpawned(id,Object.assign({},s,{conds:conds}));if(pr.addLog)pr.addLog({who:"ГМ",type:"crit",label:s.name+": "+label,detail:"",total:0})}}/></div>
{(s.hp||0)<=0&&<div style={{background:"#211d18",borderRadius:0,padding:"3px 7px",marginTop:3,textAlign:"center",fontSize:11,color:"#e2d8c3",fontWeight:700}}>Повержен</div>}
<div style={{display:"flex",alignItems:"center",gap:3,marginTop:2}}><span style={{fontSize:11}}></span><div style={{flex:1,background:"#e2d8c3",borderRadius:0,height:8,overflow:"hidden"}}><div style={{height:"100%",width:hpP+"%",background:(s.hp||0)<=0?"#211d18":"#8a3b22",borderRadius:0}}/></div><div style={{display:"flex",gap:1}}>{[-5,-1,1,5].map(function(d){return <button key={d} onClick={function(){updateSpawned(id,Object.assign({},s,{hp:Math.max(0,Math.min(s.maxHp,(s.hp||0)+d))}))}} style={{padding:"1px 4px",borderRadius:0,fontSize:10,fontWeight:700,border:"1px solid #c6bba3",background:d<0?"#efe2d6":"#e5e4cc",color:d<0?"#8a3b22":"#3f6b34",cursor:"pointer"}}>{d>0?"+"+d:d}</button>})}</div><span style={{fontSize:11,fontWeight:700,fontFamily:"var(--f-body)"}}>{(s.hp||0)+"/"+s.maxHp}</span></div>
{s.armorHead&&s.armorHead!=="none"&&<div style={{fontSize:10,color:"#6a6052",marginTop:1}}>{s.armorHeadName||(ARMOR_T.find(function(a){return a.id===s.armorHead})||{}).name||s.armorHead} {s.armorHeadHp||0}/{s.armorHeadMaxHp||0}</div>}
{s.armorBody&&s.armorBody!=="none"&&<div style={{fontSize:10,color:"#6a6052"}}>{s.armorBodyName||(ARMOR_T.find(function(a){return a.id===s.armorBody})||{}).name||s.armorBody} {s.armorBodyHp||0}/{s.armorBodyMaxHp||0}</div>}
{s.shieldType&&s.shieldType!=="none"&&<div style={{fontSize:10,color:"#6a6052"}}>{s.shieldName||(SHIELD_T.find(function(t){return t.id===s.shieldType})||{}).name||s.shieldType} {s.shieldHp||0}/{s.shieldMaxHp||0}</div>}
<div style={{fontSize:10,color:npcCurWill(s)<0?"#8a3b22":"#6a6052",fontWeight:npcCurWill(s)<0?700:400}}>Воля {npcCurWill(s)}/{(s.stats||{}).volya||0}{npcCurWill(s)<0?" ("+npcWillPen(s)+" ко всем броскам)":""}</div>
{(s.crits||[]).length>0&&<div style={{display:"flex",gap:3,marginTop:2,flexWrap:"wrap",alignItems:"center"}}>{(s.crits||[]).map(function(x){return <span key={x.id} title={x.text} style={{fontSize:10,fontWeight:700,color:"#8a3b22",border:"1px solid #8a3b22",padding:"1px 5px"}}>{x.name+(x.roundsLeft?" · "+x.roundsLeft+" р.":"")}<button onClick={function(){updateSpawned(id,Object.assign({},s,{crits:(s.crits||[]).filter(function(k){return k.id!==x.id})}))}} style={{border:"none",background:"none",color:"#8a3b22",padding:"0 0 0 4px",cursor:"pointer"}}>✕</button></span>})}</div>}
{(s.broken||s.shakenPenalty>0)&&<div style={{display:"flex",gap:3,marginTop:2,flexWrap:"wrap",alignItems:"center"}}>
{s.broken&&<span style={{fontSize:10,fontWeight:700,color:"#8a3b22",background:"#efe2d6",borderRadius:0,padding:"1px 5px"}}>Сломлен</span>}
{s.shakenPenalty>0&&<span style={{fontSize:10,fontWeight:700,color:"#8a6200",background:"#f0e2b8",borderRadius:0,padding:"1px 5px"}}>{"Потрясён −"+s.shakenPenalty}</span>}
<button onClick={function(){updateSpawned(id,Object.assign({},s,{broken:false,shakenPenalty:0}))}} style={{fontSize:10,background:"none",border:"none",color:"#6a6052",cursor:"pointer",textDecoration:"underline"}}>снять</button>
</div>}
<div style={{display:"flex",gap:2,marginTop:3,flexWrap:"wrap"}}>
<div style={{display:"flex",gap:1,marginBottom:1}}>
<button onClick={function(){s.side==="ally"?npcVsNpc(s,FIST):npcAttack(s,FIST)}} title="Рукопашная: Тело + Ближний бой" style={{padding:"2px 5px",borderRadius:0,border:"1px solid #8a620040",background:"#f0e2b8",fontSize:10,fontWeight:700,color:"#8a6200",cursor:"pointer"}}>{"Кулаки"+(s.side==="ally"?(npcTgtId?" ":""):(playerTgtId?" →":""))}</button>
{s.side!=="ally"&&<button onClick={function(){npcDmg(s,FIST)}} style={{padding:"2px 5px",borderRadius:0,border:"1px solid #8a3b2220",background:"#efe2d6",fontSize:10,fontWeight:700,color:"#8a3b22",cursor:"pointer"}}>{"Урон"+(playerTgtId?" →":"")}</button>}
</div>
{wpns.map(function(w,wi){return <div key={wi} style={{display:"flex",gap:1,marginBottom:1}}>
<button onClick={function(){s.side==="ally"?npcVsNpc(s,w):npcAttack(s,w)}} style={{padding:"2px 5px",borderRadius:0,border:"1px solid #4f5b2a20",background:"#e5e4cc",fontSize:10,fontWeight:700,color:"#4f5b2a",cursor:"pointer"}}>{""+w.name+(s.side==="ally"?(npcTgtId?" ":""):(playerTgtId?" →":""))}</button>
{s.side!=="ally"&&<button onClick={function(){npcDmg(s,w)}} style={{padding:"2px 5px",borderRadius:0,border:"1px solid #8a3b2220",background:"#efe2d6",fontSize:10,fontWeight:700,color:"#8a3b22",cursor:"pointer"}}>{"Урон"+(playerTgtId?" →":"")}</button>}
</div>})}
<button onClick={function(){var R=rollHit();var d=R.d;var dv=st.reak||0;var dg=sk.dodge||0;var wp=npcWillPen(s);var t=d+dv+dg+wp;sRollP({label:s.name+" — Уклонение",d10:d,crit:R.crit,fumble:R.fumble,parts:[{label:"Реакция",value:dv},{label:"Уклонение",value:dg}],total:t});pr.addLog({who:s.name,type:"dodge",label:"Уклонение"+(R.crit?" · крит":R.fumble?" · срыв":""),detail:"d10("+d+")"+" + Реакция("+dv+") + Уклонение("+dg+")"+(wp?" − деморализован("+Math.abs(wp)+")":"")+" = "+t,total:t})}} style={{padding:"3px 6px",borderRadius:0,border:"1px solid #3f6b3420",background:"#e5e4cc",fontSize:11,fontWeight:700,color:"#3f6b34",cursor:"pointer"}}>Уклон.</button>
{s.side!=="ally"&&<button onClick={function(){npcFear(s,id)}} title="Устрашение: Характер + Запугивание (или Воля — природный ужас, если навыка нет)" style={{padding:"3px 6px",borderRadius:0,border:"1px solid #6b2f4a20",background:"#eadbd8",fontSize:11,fontWeight:700,color:"#6b2f4a",cursor:"pointer"}}>{"Устрашение"+(playerTgtId?" →":"")}</button>}
<button onClick={function(){sSkNpc(skNpc===id?null:id)}} style={{padding:"3px 6px",borderRadius:0,border:"1px solid #8a620030",background:"#f0e2b8",fontSize:11,fontWeight:700,color:"#8a6200",cursor:"pointer"}}>{skNpc===id?"✕":"Навык"}</button>
</div>
{skNpc===id&&<div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:3,padding:4,background:"#f1ead9",borderRadius:0}}>
{NPC_SK.map(function(it){var stv=st[it.st]||0;var skv=sk[it.k]||0;return <button key={it.k} onClick={function(){var R=rollHit();var d=R.d;var wp=npcWillPen(s);var t=d+stv+skv+wp;sRollP({label:s.name+" — "+it.l,d10:d,crit:R.crit,fumble:R.fumble,parts:[{label:stName(it.st),value:stv},{label:it.l,value:skv}],total:t});pr.addLog({who:s.name,type:"skill",label:""+it.l+(R.crit?" · крит":R.fumble?" · срыв":""),detail:"d10("+d+")"+" + "+stName(it.st)+"("+stv+") + "+it.l+"("+skv+")"+(wp?" − деморализован("+Math.abs(wp)+")":"")+" = "+t,total:t})}} style={{padding:"2px 5px",borderRadius:0,border:"1px solid #c6bba3",background:"#e2d8c3",fontSize:10,fontWeight:700,color:skv>0?"#211d18":"#6a6052",cursor:"pointer"}}>{it.l+" ("+stShort(it.st)+"+"+skv+")"}</button>})}
{Object.keys(s.extraSkills||{}).map(function(nm){var stKey=EXTRA_SK_STAT[nm];if(!stKey)return null;var stv=st[stKey]||0;var skv=(s.extraSkills||{})[nm]||0;return <button key={nm} onClick={function(){var R=rollHit();var d=R.d;var wp=npcWillPen(s);var t=d+stv+skv+wp;sRollP({label:s.name+" — "+skLabel(nm),d10:d,crit:R.crit,fumble:R.fumble,parts:[{label:stName(stKey),value:stv},{label:skLabel(nm),value:skv}],total:t});pr.addLog({who:s.name,type:"skill",label:""+skLabel(nm)+(R.crit?" · крит":R.fumble?" · срыв":""),detail:"d10("+d+")"+" + "+stName(stKey)+"("+stv+") + "+skLabel(nm)+"("+skv+")"+(wp?" − деморализован("+Math.abs(wp)+")":"")+" = "+t,total:t})}} style={{padding:"2px 5px",borderRadius:0,border:"1px solid #c6bba3",background:"#e5e4cc",fontSize:10,fontWeight:700,color:skv>0?"#211d18":"#6a6052",cursor:"pointer"}}>{skLabel(nm)+" ("+stShort(stKey)+"+"+skv+")"}</button>})}
</div>}
</div>})}
</div>}

{/* Категории */}
{(pr.logs||[]).filter(function(l){return l.type==="hit"||l.type==="dmg"||l.type==="dmg_npc"||l.type==="dodge"||l.type==="spawn"||l.type==="fear"}).slice(0,8).length>0&&<div style={{border:"2px solid #c6bba3",borderRadius:0,padding:"6px 8px",background:"#f1ead9"}}><div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:11,marginBottom:4}}>Боевой лог</div><div style={{maxHeight:130,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>{(pr.logs||[]).filter(function(l){return l.type==="hit"||l.type==="dmg"||l.type==="dmg_npc"||l.type==="dodge"||l.type==="spawn"||l.type==="fear"}).slice(0,8).map(function(l,i){var bgc=l.type==="dodge"?"#e5e4cc":l.type==="hit"?"#e5e4cc":l.type==="spawn"?"#e6dcc8":l.type==="fear"?"#eadbd8":"#efe2d6";return <div key={i} style={{background:bgc,borderRadius:0,padding:"3px 6px",fontSize:11}}><b>{l.who||"?"}: {l.label}</b>{l.total>0&&<span style={{fontFamily:"var(--f-body)",fontWeight:700,marginLeft:4}}>={l.total}</span>}</div>})}</div></div>}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:12}}>Категории</div>
<button onClick={seedNpcs} style={{background:"none",border:"none",color:"#6a6052",fontSize:11,cursor:"pointer",textDecoration:"underline"}}>добавить готовых NPC из каталога</button>
</div>
<div style={{display:"flex",gap:3}}><input style={Object.assign({},S.inp,{flex:1})} value={catName} onChange={function(e){sCatName(e.target.value)}} placeholder="Новая категория..." onKeyDown={function(e){if(e.key==="Enter")addCat()}}/><button onClick={addCat} style={{padding:"4px 10px",borderRadius:0,border:"none",background:"#3f6b34",color:"#fff",fontWeight:700,fontSize:10,cursor:"pointer"}}>+</button></div>
{cats.length===0&&<div style={{textAlign:"center",padding:12,color:"#6a6052",fontStyle:"italic",fontSize:11}}>Создай категорию (Бандиты, Нежить, Звери...)</div>}
<div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,color:"#6a6052",fontFamily:"var(--f-mono)",textTransform:"uppercase"}}>Фракция:</span><button className={"btn sm"+(facFilter===""?" main":"")} onClick={function(){sFacFilter("")}}>все</button>{FACTIONS.map(function(f){return <button key={f.id} title={f.name} className={"btn sm"+(facFilter===f.id?" main":"")} onClick={function(){sFacFilter(f.id)}}>{f.short}</button>})}<button className={"btn sm"+(facFilter==="none"?" main":"")} onClick={function(){sFacFilter("none")}}>без фракции</button></div>
{cats.map(function(cat){var npcs=templ[cat]||{};var npcArr=Object.entries(npcs).filter(function(e){return e[0]!=="_created"&&(!facFilter||(facFilter==="none"?!e[1].faction:e[1].faction===facFilter))});if(facFilter&&!npcArr.length)return null;var isOpen=selCat===cat;return <div key={cat} style={{border:"2px solid #8a3b2218",borderRadius:0,overflow:"hidden"}}><button onClick={function(){sCat(isOpen?null:cat)}} style={{width:"100%",display:"flex",justifyContent:"space-between",padding:"6px 8px",background:"#efe2d6",border:"none",cursor:"pointer",fontFamily:"var(--f-body)",fontWeight:700,fontSize:11,color:"#8a3b22"}}><span>{""+cat+" ("+npcArr.length+")"}</span><span style={{transform:isOpen?"rotate(180deg)":"none"}}>▼</span></button>{isOpen&&GROUP_HINTS[cat]&&<div className="hint" style={{padding:"6px 8px",fontSize:12,fontStyle:"italic"}}>{GROUP_HINTS[cat]}</div>}
{isOpen&&<div style={{padding:"5px 7px",background:"#f1ead9",display:"flex",flexDirection:"column",gap:4}}>
{npcArr.map(function(e2){var nid=e2[0];var n=e2[1];return <div key={nid} style={{border:"1px solid #c6bba3",borderRadius:0,padding:"4px 6px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}>{n.avatar&&<img src={n.avatar} alt="" style={{width:18,height:18,borderRadius:0,objectFit:"cover",flexShrink:0}}/>}<span style={{fontWeight:700,fontSize:10}}>{n.name}</span><FacBadge id={n.faction}/>{(n.group||n.arc)&&<span style={{fontSize:9,color:"#6a6052",whiteSpace:"nowrap"}}>{[n.group,n.arc?"арка "+n.arc:""].filter(Boolean).join(" · ")}</span>}<span style={{fontSize:11,color:"#6a6052",marginLeft:3}}>{"Ур."+n.level+" HP:"+n.maxHp+" · XP:"+(n.xpReward!=null?n.xpReward:n.maxHp)}</span></div><div style={{display:"flex",gap:2}}><button onClick={function(){loadNpcToForm(n);sEditNpc(nid);sCat(cat)}} style={{padding:"2px 5px",borderRadius:0,border:"1px solid #4f5b2a20",background:"#e5e4cc",fontSize:10,fontWeight:700,color:"#4f5b2a",cursor:"pointer"}}>Править</button><button onClick={function(){spawnNpc(cat,nid)}} style={{padding:"2px 6px",borderRadius:0,border:"1px solid #3f6b3428",background:"#e5e4cc",fontSize:11,fontWeight:700,color:"#3f6b34",cursor:"pointer"}}>Спавн</button><button onClick={function(){delNpc(cat,nid)}} style={{background:"none",border:"none",color:"#8a3b22",fontSize:11,cursor:"pointer"}}>✕</button></div></div>
<div style={{fontSize:10,color:"#6a6052",marginTop:1}}>{(n.weapons||[]).length>0?(n.weapons||[]).map(function(w){return w.name+" "+w.dice+" "+w.dmgType}).join(", "):"Без оружия"}</div>
</div>})}
<div style={{border:"2px dashed #8a3b2230",borderRadius:0,padding:6,display:"flex",flexDirection:"column",gap:4,background:"#efe2d608"}}>
<div style={{fontSize:11,fontWeight:700,color:"#8a3b22"}}>{editNpc?"Редактировать NPC":"+ Новый NPC"}</div>
<div style={{display:"flex",gap:6,alignItems:"center"}}>
<label style={{width:44,height:44,borderRadius:0,background:navat?"none":"linear-gradient(135deg,#8a3b22,#8a6200)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:navat?0:16,fontWeight:700,color:"#ebe3d1",flexShrink:0,cursor:"pointer",overflow:"hidden",position:"relative"}}>{navat?<img src={navat} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(nn||"?")[0]}<input type="file" accept="image/*" style={{display:"none"}} onChange={function(e){var file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>500000){alert("Файл слишком большой! Макс. 500KB");return}var reader=new FileReader();reader.onload=function(ev){sNAvat(ev.target.result)};reader.readAsDataURL(file)}}/></label>
<input style={Object.assign({},S.inp,{flex:1})} value={nn} onChange={function(e){sNN(e.target.value)}} placeholder="Имя NPC"/>
{navat&&<button onClick={function(){sNAvat("")}} style={{background:"none",border:"none",color:"#8a3b22",fontSize:14,cursor:"pointer",flexShrink:0}} title="Убрать аватар">✕</button>}
</div>
<div style={{display:"flex",gap:3}}><div style={{flex:1}}><label style={{fontSize:10,fontWeight:700}}>Уровень</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} type="number" value={nl} onChange={function(e){sNL(parseInt(e.target.value)||1)}}/></div><div style={{flex:1}}><label style={{fontSize:10,fontWeight:700}}>HP</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} type="number" value={nhp} onChange={function(e){sNHP(parseInt(e.target.value)||1)}}/></div><div style={{flex:1}}><label style={{fontSize:10,fontWeight:700,color:"#8a6200"}}>XP за смерть</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} type="number" value={nxp} onChange={function(e){sNXP(parseInt(e.target.value)||0)}}/></div></div>
<div style={{display:"flex",gap:4,alignItems:"center"}}><label style={{fontSize:10,fontWeight:700}}>Фракция</label><select value={nfac} onChange={function(e){sNFac(e.target.value)}} style={Object.assign({},S.inp,{fontSize:11,padding:2,width:"auto"})}><option value="">— нет —</option>{FACTIONS.map(function(f){return <option key={f.id} value={f.id}>{f.name}</option>})}</select></div>
<div style={{fontSize:11,fontWeight:700,marginTop:2}}>Характеристики</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>{SD.map(function(st){return <div key={st.key} style={{textAlign:"center"}}><label style={{fontSize:10,fontWeight:700,color:st.color}}>{st.full}</label><input style={Object.assign({},S.inp,{fontSize:10,padding:2,textAlign:"center"})} type="number" value={nstats[st.key]||0} onChange={function(e){var ns=Object.assign({},nstats);ns[st.key]=parseInt(e.target.value)||0;sNStats(ns)}}/></div>})}</div>
<div style={{fontSize:11,fontWeight:700,marginTop:2}}>Боевые навыки</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>
{NPC_SK.map(function(sk){return <div key={sk.k}><label style={{fontSize:10,fontWeight:700}}>{sk.l}</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2,textAlign:"center"})} type="number" value={nskills[sk.k]||0} onChange={function(e){var ns=Object.assign({},nskills);ns[sk.k]=parseInt(e.target.value)||0;sNSkills(ns)}}/></div>})}
</div>
<div style={{fontSize:11,fontWeight:700,marginTop:4}}>Дополнительные навыки <span style={{fontWeight:400,color:"#6a6052"}}>(не боевые — для проверок вне боя)</span></div>
{SD.map(function(stD){var list=EXTRA_SK_BY_STAT[stD.key]||[];if(!list.length)return null;return(<div key={stD.key} style={{marginTop:2}}>
<div style={{fontSize:10,fontWeight:700,color:stD.color}}>{stD.full}</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>{list.map(function(sk){return <div key={sk.name}><label style={{fontSize:10,fontWeight:700}}>{skLabel(sk.name)}</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2,textAlign:"center"})} type="number" value={nexsk[sk.name]||0} onChange={function(e){var ns=Object.assign({},nexsk);ns[sk.name]=parseInt(e.target.value)||0;sNExSk(ns)}}/></div>})}</div>
</div>)})}
<div style={{fontSize:11,fontWeight:700,marginTop:4}}>Оружие ({nweapons.length})</div>
{nweapons.map(function(w,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:3,fontSize:11,padding:"2px 4px",background:"#f1ead9",border:"1px solid #c6bba3",borderRadius:0}}><span style={{flex:1,fontWeight:600}}>{w.name} {w.dice} {w.dmgType} +{w.bonus}</span><button onClick={function(){sNWeapons(nweapons.filter(function(x,j){return j!==i}))}} style={{background:"none",border:"none",color:"#8a3b22",cursor:"pointer",fontSize:11}}>✕</button></div>})}
<ShopPicker color="#4f5b2a" label="Оружие из каталога" all={true} items={(pr.shop||[]).filter(function(i){return i.cat==="weapon"})} subOf={function(it){return it.wtype}} suborder={["Battle","Simple","Guns","Archery","Thrown","Brawl"]} sublabels={{Battle:"Боевое оружие",Simple:"Простое оружие",Guns:"Огнестрел",Archery:"Лук",Thrown:"Метательное",Brawl:"Рукопашное"}} sub={function(it){var h=it.hands===2?"двуруч.":it.hands===1.5?"полуторн.":"одноруч.";return wtLabel(it.wtype)+" · "+it.dmgDice+(it.bonus?"+"+it.bonus:"")+" · "+it.dmgType+" · "+h}} onPick={addWeaponFromShop}/>
<div style={{fontSize:10,fontWeight:700,color:"#6a6052"}}>...или создать вручную:</div>
<div style={{display:"flex",gap:2,flexWrap:"wrap"}}><input style={Object.assign({},S.inp,{flex:2,minWidth:60,fontSize:11,padding:2})} value={twn} onChange={function(e){sTWN(e.target.value)}} placeholder="Оружие"/><input style={Object.assign({},S.inp,{width:35,fontSize:11,padding:2})} value={twd} onChange={function(e){sTWD(e.target.value)}} placeholder="1d6"/><select value={twt} onChange={function(e){sTWT(e.target.value)}} style={Object.assign({},S.inp,{width:50,fontSize:11,padding:2})}>{WT.map(function(t){return <option key={t} value={t}>{wtLabel(t)}</option>})}</select><select value={twdt} onChange={function(e){sTWDT(e.target.value)}} style={Object.assign({},S.inp,{width:30,fontSize:11,padding:2})}>{DT.map(function(t){return <option key={t} value={t}>{t}</option>})}</select><input style={Object.assign({},S.inp,{width:28,fontSize:11,padding:2})} type="number" value={twb} onChange={function(e){sTWB(parseInt(e.target.value)||0)}} placeholder="+"/><button onClick={addTmpWeapon} style={{padding:"2px 6px",borderRadius:0,border:"none",background:"#3f6b34",color:"#fff",fontWeight:700,fontSize:10,cursor:"pointer"}}>+</button></div>
<div style={{fontSize:11,fontWeight:700,marginTop:4}}>Броня — Голова</div>
<div style={{display:"flex",gap:3,alignItems:"flex-end"}}>
<div style={{flex:1}}><label style={{fontSize:10,fontWeight:700}}>Ярус</label><select value={nar} onChange={function(e){sNAR(e.target.value)}} style={Object.assign({},S.inp,{fontSize:11,padding:2})}>{ARMOR_T.map(function(a){return <option key={a.id} value={a.id}>{a.name}</option>})}</select></div>
{nar!=="none"&&<div style={{flex:1}}><label style={{fontSize:10,fontWeight:700}}>HP</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} type="number" value={narh} onChange={function(e){sNARH(parseInt(e.target.value)||1)}} placeholder="HP"/></div>}
{nar!=="none"&&<div style={{flex:2}}><label style={{fontSize:10,fontWeight:700}}>Название</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} value={narnm} onChange={function(e){sNARNM(e.target.value)}} placeholder="напр. Кожаный шлем"/></div>}
</div>
<ShopPicker color="#8a3b22" label="Шлем из каталога" all={true} items={(pr.shop||[]).filter(function(i){return i.cat==="armor"&&(i.slot||"body")==="head"})} subOf={function(it){return it.type||"light"}} suborder={["light","medium","heavy"]} sublabels={{light:"Лёгкий",medium:"Средний",heavy:"Тяжёлый"}} sub={function(it){return it.hp+" HP"+(it.desc?" · "+it.desc:"")}} onPick={pickArmorHead}/>
<div style={{fontSize:11,fontWeight:700,marginTop:4}}>Броня — Тело</div>
<div style={{display:"flex",gap:3,alignItems:"flex-end"}}>
<div style={{flex:1}}><label style={{fontSize:10,fontWeight:700}}>Ярус</label><select value={narbod} onChange={function(e){sNARBOD(e.target.value)}} style={Object.assign({},S.inp,{fontSize:11,padding:2})}>{ARMOR_T.map(function(a){return <option key={a.id} value={a.id}>{a.name}</option>})}</select></div>
{narbod!=="none"&&<div style={{flex:1}}><label style={{fontSize:10,fontWeight:700}}>HP</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} type="number" value={narbh} onChange={function(e){sNARBH(parseInt(e.target.value)||1)}} placeholder="HP"/></div>}
{narbod!=="none"&&<div style={{flex:2}}><label style={{fontSize:10,fontWeight:700}}>Название</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} value={narbnm} onChange={function(e){sNARBNM(e.target.value)}} placeholder="напр. Кольчуга"/></div>}
</div>
<ShopPicker color="#8a3b22" label="Доспех из каталога" all={true} items={(pr.shop||[]).filter(function(i){return i.cat==="armor"&&(i.slot||"body")==="body"})} subOf={function(it){return it.type||"light"}} suborder={["light","medium","heavy"]} sublabels={{light:"Лёгкий",medium:"Средний",heavy:"Тяжёлый"}} sub={function(it){return it.hp+" HP"+(it.desc?" · "+it.desc:"")}} onPick={pickArmorBody}/>
<div style={{fontSize:11,fontWeight:700,marginTop:4}}>Щит</div>
<div style={{display:"flex",gap:3,alignItems:"flex-end"}}>
<div style={{flex:1}}><label style={{fontSize:10,fontWeight:700}}>Тип</label><select value={nsh} onChange={function(e){sNSh(e.target.value)}} style={Object.assign({},S.inp,{fontSize:11,padding:2})}><option value="none">Нет</option>{SHIELD_T.map(function(t){return <option key={t.id} value={t.id}>{t.name+" "+(t.absorb*100)+"%"}</option>})}</select></div>
{nsh!=="none"&&<div style={{flex:1}}><label style={{fontSize:10,fontWeight:700}}>HP</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} type="number" value={nshh} onChange={function(e){sNShH(parseInt(e.target.value)||1)}} placeholder="HP"/></div>}
{nsh!=="none"&&<div style={{flex:2}}><label style={{fontSize:10,fontWeight:700}}>Название</label><input style={Object.assign({},S.inp,{fontSize:11,padding:2})} value={nshnm} onChange={function(e){sNShNM(e.target.value)}} placeholder="напр. Круглый щит"/></div>}
</div>
<ShopPicker color="#4f5b2a" label="Щит из каталога" all={true} items={(pr.shop||[]).filter(function(i){return i.cat==="shield"})} subOf={function(it){return it.type||"light"}} suborder={["light","medium","tower"]} sublabels={{light:"Лёгкий",medium:"Средний",tower:"Башенный"}} sub={function(it){var t2=SHIELD_T.find(function(x){return x.id===it.type});return (t2?t2.name+" "+(t2.absorb*100)+"%":it.type)+" · "+it.hp+" HP"+(it.desc?" · "+it.desc:"")}} onPick={pickShield}/>
<div style={{display:"flex",gap:3,marginTop:2}}><button onClick={function(){saveNpc();sCat(cat)}} style={{flex:1,padding:6,borderRadius:0,border:"none",background:"#8a3b22",color:"#fff",fontWeight:700,fontSize:10,cursor:"pointer"}}>{editNpc?"Сохранить":"Создать NPC"}</button>{editNpc&&<button onClick={resetForm} style={{padding:"6px 10px",borderRadius:0,border:"2px solid #c6bba3",background:"#e2d8c3",fontWeight:700,fontSize:10,cursor:"pointer"}}>Отмена</button>}</div>
</div>
<button onClick={function(){if(window.confirm("Удалить категорию "+cat+"?"))delCat(cat)}} style={{fontSize:11,color:"#8a3b22",background:"none",border:"none",cursor:"pointer",marginTop:3}}>Удалить категорию</button>
</div>}
</div>})}
</div></div>)}


export default BestiaryEditor;
