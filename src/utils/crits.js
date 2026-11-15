/* Криты (глава 6 «Критические ранения»). Удар, снявший 10+ Здоровья уже
   после брони и щита, — крит по зоне. 15+ — тяжёлый. Крит по железной
   руке или ноге ломает протез, а не конечность. Статусы лежат в c.crits
   (у NPC — в npc.crits), их эффекты идут через общий механизм эффектов. */
import { r1 } from './dice';

var CRIT_MIN=10,CRIT_HEAVY=15;
function st(key,name,text,effects,extra){return Object.assign({key:key,name:name,text:text,effects:effects||[]},extra||{})}
var CRITS={
  "Голова":{lo:st("contusion","Контузия","−2 ко всем броскам до отдыха",[{type:"all_roll",amount:-2}],{until:"rest"}),
           hi:st("ko","Без сознания","на d6 раундов",[],{rounds:true})},
  "Шея":{lo:st("bleed","Кровотечение","−2 Здоровья в начале каждого хода; жгут или Медицина СЛ 12",[],{bleed:2}),
        hi:st("bleed_hi","Сильное кровотечение","−4 Здоровья в начале каждого хода; жгут или Медицина СЛ 12",[],{bleed:4})},
  "Торс":{lo:st("ribs","Сломаны рёбра","−2 к Уклонению и Атлетике до лечения",[{type:"skill_bonus",skill:"Уклонение",amount:-2},{type:"skill_bonus",skill:"Атлетика",amount:-2}]),
         hi:st("ribs_hi","Сломаны рёбра, тяжело","−2 к Уклонению и Атлетике, −2 к атаке",[{type:"skill_bonus",skill:"Уклонение",amount:-2},{type:"skill_bonus",skill:"Атлетика",amount:-2},{type:"attack_bonus",amount:-2}])},
  "Руки":{lo:st("arm_fracture","Перелом руки","оружие в этой руке падает, рукой пользоваться нельзя"),
         hi:st("arm_lost","Потеря руки","руку не спасти — к хирургу",[],{gmFlag:true})},
  "Пах":{lo:st("shock","Болевой шок","пропускает следующий ход",[],{skip:1}),
        hi:st("shock_hi","Болевой шок","пропускает два хода",[],{skip:2})},
  "Ноги":{lo:st("leg_fracture","Перелом ноги","двигается вдвое медленнее, −3 к Уклонению",[{type:"skill_bonus",skill:"Уклонение",amount:-3}]),
         hi:st("leg_lost","Потеря ноги","ногу не спасти",[],{gmFlag:true})}
};

/* Протезы персонажа: {armL, armR, legL, legR}. Старая схема (solutions.arm /
   solutions.leg) читается как правая рука / правая нога. */
function prosthesesOf(c){
  var p=Object.assign({armL:null,armR:null,legL:null,legR:null},(c&&c.prostheses)||{});
  var s=(c&&c.solutions)||{};
  if(!c||!c.prostheses){if(s.arm)p.armR=s.arm;if(s.leg)p.legR=Object.assign({tip:"stopa",tips:["stopa"]},s.leg)}
  return p;
}

function newId(){return "crit_"+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36)}
function hasCrit(t,key){return ((t&&t.crits)||[]).some(function(x){return x.key===key})}

/* Что даёт удар hd Здоровья в зону zoneName. rnd — функция d(n) (для тестов). */
function critOutcome(t,zoneName,hd,rnd,isNpc){
  rnd=rnd||r1;
  if(!(hd>=CRIT_MIN))return null;
  var row=CRITS[zoneName];if(!row)return null;
  var heavy=hd>=CRIT_HEAVY;
  if(!isNpc&&(zoneName==="Руки"||zoneName==="Ноги")){
    var side=rnd(2)===1?"L":"R";var limbKey=(zoneName==="Руки"?"arm":"leg")+side;
    var limb=prosthesesOf(t)[limbKey];
    if(limb)return{kind:"prosthesis",limbKey:limbKey,label:"Крит по протезу: "+(zoneName==="Руки"?"рука":"нога")+(side==="L"?" левая":" правая")+" сломана"};
    var s0=Object.assign({},heavy?row.hi:row.lo,{side:side});
    return{kind:"status",status:s0,label:"Крит: "+s0.name+(side==="L"?" (левая)":" (правая)")+" — "+s0.text};
  }
  var s=Object.assign({},heavy?row.hi:row.lo);
  /* Вторая контузия — без сознания */
  if(s.key==="contusion"&&hasCrit(t,"contusion"))s=Object.assign({},row.hi);
  if(s.rounds)s.roundsLeft=rnd(6);
  if(s.skip)s.skipLeft=s.skip;
  return{kind:"status",status:s,label:"Крит: "+s.name+(s.roundsLeft?" на "+s.roundsLeft+" раунд.":"")+" — "+s.text};
}
/* Патч цели по исходу крита */
function critPatch(t,out){
  if(!out)return{};
  if(out.kind==="prosthesis"){
    var p=prosthesesOf(t);p[out.limbKey]=Object.assign({},p[out.limbKey],{broken:true});
    var patch={prostheses:p};
    /* старая схема (solutions.arm/leg) переезжает в prostheses */
    if(t.solutions&&(t.solutions.arm||t.solutions.leg))patch.solutions=Object.assign({},t.solutions,{arm:null,leg:null});
    return patch;
  }
  var stt=Object.assign({id:newId(),ts:Date.now()},out.status);
  var pt={crits:((t.crits)||[]).concat([stt])};
  if(stt.key==="arm_fracture"||stt.key==="arm_lost"){pt.equippedWeapon=null;pt.equippedWeaponOff=null}
  return pt;
}
/* Отдых снимает статусы «до отдыха» (контузия) */
function critsAfterRest(t){return ((t&&t.crits)||[]).filter(function(x){return x.until!=="rest"})}
/* Кровотечение: сколько снять в начале хода */
function bleedAmount(t){return ((t&&t.crits)||[]).reduce(function(a,x){return a+(x.bleed||0)},0)}
/* Эффекты статусов — в общий список эффектов */
function critEffects(t){var out=[];((t&&t.crits)||[]).forEach(function(x){(x.effects||[]).forEach(function(e){out.push(Object.assign({},e,{src:{from:"crit",name:x.name,id:x.id}}))})});return out}
/* Штраф NPC от статусов: all — ко всем броскам, attack — к атаке, dodge — к уклонению */
function npcCritPen(npc,what){
  return critEffects(npc).reduce(function(a,e){
    if(e.type==="all_roll")return a+(e.amount||0);
    if(what==="attack"&&e.type==="attack_bonus")return a+(e.amount||0);
    if(what==="dodge"&&e.type==="skill_bonus"&&e.skill==="Уклонение")return a+(e.amount||0);
    return a;
  },0);
}

export { CRIT_MIN, CRIT_HEAVY, CRITS, prosthesesOf, critOutcome, critPatch, critsAfterRest, bleedAmount, critEffects, npcCritPen, hasCrit };
