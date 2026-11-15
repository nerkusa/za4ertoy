/* Попадание по цели после броска урона: множитель зоны (с учётом железа),
   броня, щит, крит. Одна функция для всех мест, где урон доходит до
   персонажа или NPC. Боевая механика базы (calcAE, броня, щиты) — как была. */
import { calcAE } from './combat';
import { cF, mHP } from './character';
import { getTraits } from './traitStore';
import { armorEffectivenessOf } from '../data/traits';
import { critOutcome, critPatch } from './crits';

var ZONE_KEY={"Голова":"head","Шея":"neck","Торс":"torso","Руки":"arms","Пах":"groin","Ноги":"legs"};
/* Множитель зоны: железо может его заменить (Пластина в черепе: голова ×1) */
function zoneMultFor(effects,zoneObj){
  var k=ZONE_KEY[zoneObj.name];var m=zoneObj.mult;
  (effects||[]).forEach(function(e){if(e.type==="zone_mult_override"&&e.zone===k)m=Math.min(m,e.mult)});
  return m;
}
/* Снижение урона по зоне (Пластинки на предплечьях: руки −3) */
function zoneReduceFor(effects,zoneObj){
  var k=ZONE_KEY[zoneObj.name];
  return (effects||[]).reduce(function(a,e){return a+(e.type==="zone_dmg_reduce"&&e.zone===k?(e.amount||0):0)},0);
}

/* Урон по персонажу. shield — {absorb,name,id} или null. rnd — d(n) для тестов.
   Возвращает патч персонажа и описание. */
function resolvePlayerHit(ch,rawDmg,dmgType,zoneObj,shield,rnd){
  var inf=cF(ch);var effs=inf.effects||[];
  var mult=zoneMultFor(effs,zoneObj);
  var multiplied=Math.floor(rawDmg*mult);
  var red=zoneReduceFor(effs,zoneObj);if(red)multiplied=Math.max(0,multiplied-red);
  var pArmorId=zoneObj.slot==="head"?ch.equippedHead:ch.equippedBody;
  var pArmorObj=(ch.armors||[]).find(function(a){return a.id===pArmorId});
  var pArmorType=pArmorObj?(pArmorObj.hp>0?pArmorObj.type:"none"):"none";
  var ae=zoneObj.ignoreArmor?{ad:0,hd:multiplied,desc:"мимо брони: "+zoneObj.name+" ×"+mult+" → Здоровье −"+multiplied}:calcAE(pArmorType,dmgType||"Р",multiplied);
  ae=Object.assign({},ae);
  var notes=[];
  if(mult!==zoneObj.mult)notes.push(zoneObj.name+" ×"+mult+" (железо)");
  if(red)notes.push("железо −"+red);
  var armorEff=armorEffectivenessOf(ch,getTraits());
  if(!zoneObj.ignoreArmor&&armorEff<1&&ae.ad>0){var reducedAd=Math.floor(ae.ad*armorEff);var lostAd=ae.ad-reducedAd;ae.ad=reducedAd;ae.hd+=lostAd}
  var shieldDmg=0;
  if(shield&&shield.absorb){shieldDmg=Math.floor(ae.hd*shield.absorb);ae.hd=Math.max(0,ae.hd-shieldDmg);notes.push(shield.name+" поглотил "+shieldDmg)}
  var maxHp=ch.hpOv||mHP(inf.fs,ch);
  var cur=ch.curHp!==null&&ch.curHp!==undefined?ch.curHp:maxHp;
  var newHp=Math.max(0,cur-ae.hd);
  var patch={curHp:newHp};
  if(shield&&shield.id&&shieldDmg>0){patch.shields=(ch.shields||[]).map(function(s){return s.id===shield.id?Object.assign({},s,{hp:Math.max(0,s.hp-shieldDmg)}):s});if(patch.shields.find(function(s){return s.id===shield.id&&s.hp<=0}))patch.equippedShield=null}
  if(pArmorObj&&ae.ad>0)patch.armors=(ch.armors||[]).map(function(a){return a.id===pArmorId?Object.assign({},a,{hp:Math.max(0,a.hp-ae.ad)}):a});
  var crit=critOutcome(ch,zoneObj.name,ae.hd,rnd,false);
  if(crit)Object.assign(patch,critPatch(ch,crit));
  return{patch:patch,hd:ae.hd,ad:ae.ad,oldHp:cur,newHp:newHp,maxHp:maxHp,mult:mult,desc:ae.desc+(notes.length?" · "+notes.join(" · "):""),crit:crit,armorName:pArmorObj?pArmorObj.name:"",armorOld:pArmorObj?pArmorObj.hp:0};
}

/* NPC: свой множитель зоны (npc.zoneMult {Голова:1}) и «К и Р вдвое слабее» (npc.halfKR) */
function npcZoneMult(npc,zoneObj){var o=(npc&&npc.zoneMult)||{};return o[zoneObj.name]!=null?Math.min(zoneObj.mult,o[zoneObj.name]):zoneObj.mult}
function npcRaw(npc,rawDmg,dmgType){return (npc&&npc.halfKR&&(dmgType==="К"||dmgType==="Р"))?Math.floor(rawDmg/2):rawDmg}
/* Крит по NPC: патч (npc.crits) и строка для лога; у железных NPC (npc.ironCrit) крит ломает деталь */
function npcCritPatch(npc,zoneName,hd,rnd){
  var out=critOutcome(npc,zoneName,hd,rnd,true);if(!out)return{patch:{},label:""};
  if(npc&&npc.ironCrit)return{patch:{},label:"Крит по железу: ломается деталь ("+zoneName+")"};
  return{patch:critPatch(npc,out),label:out.label};
}

export { ZONE_KEY, zoneMultFor, zoneReduceFor, resolvePlayerHit, npcZoneMult, npcRaw, npcCritPatch };
