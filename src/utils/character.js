import { NAMES_P } from '../data/lore';
import { SD, SKD, ALL_SKILLS, skCost } from '../data/stats';
import { pk, r1 } from './dice';
import { getProfs } from './profStore';
import { getTraits } from './traitStore';
import { armorPenaltyOf } from '../data/combat';
import { activeTraitEffects } from '../data/traits';
import { originOf } from '../data/professions';

function iS(){var s={};SD.forEach(function(x){s[x.key]=1});return s}
function iSk(){var s={};ALL_SKILLS.forEach(function(n){s[n]=0});return s}
function uSP(s){return Object.values(s).reduce(function(a,b){return a+b},0)}
/* Потрачено очков навыков: навыки ×2 стоят 2 очка за единицу */
function uSkP(s){var t=0;ALL_SKILLS.forEach(function(n){t+=(s[n]||0)*skCost(n)});return t}
function gE(b,bo){var r=Object.assign({},b);Object.entries(bo||{}).forEach(function(e){r[e[0]]=(r[e[0]]||0)+e[1]});return r}

/* Штраф Дозы ко всем броскам: 4–6 → −1, 7+ → −2 */
function dosePenalty(dose){dose=dose||0;if(dose>=7)return -2;if(dose>=4)return -1;return 0}
/* Штраф болезней и статусов к броску от характеристики statKey:
   all_roll — ко всем броскам, stat_roll — к броскам от этой характеристики.
   (Общего «−1 за любую болезнь» больше нет: у каждой болезни свои эффекты.) */
function diseasePenalty(c,statKey){return activeTraitEffects(c,getTraits()).reduce(function(a,e){if(e.type==="all_roll")return a+(e.amount||0);if(e.type==="stat_roll"&&e.stat===statKey)return a+(e.amount||0);return a},0)}
/* Постоянный эффект отрицательной Воли: пока текущая Воля < 0 — штраф ко
   всем броскам, равный самой отрицательной Воле. */
function willPenalty(curWill){return curWill<0?curWill:0}

/* cF — итоговые характеристики и навыки персонажа.
   fs — характеристики с эффектами, eSk — навыки с эффектами,
   src — от чего пришёл бонус к навыку/характеристике (для шума и износа),
   pen — общие штрафы к броскам, rollPen(statKey) — сумма штрафов и её части. */
function cF(c){
  var es=Object.assign({},iS(),c.stats||{});
  var eSk=Object.assign({},iSk(),c.skills||{});
  var src={skill:{},stat:{}};
  var effs=activeTraitEffects(c,getTraits());
  var cassStat={};
  effs.forEach(function(e){
    if(e.type==="stat_bonus"&&e.stat){
      var add=e.amount||0;
      if(e.src&&e.src.from==="cassette"){
        /* Кассеты на характеристику: одна на характеристику, итог не выше 10 */
        if(cassStat[e.stat])return;cassStat[e.stat]=true;
        add=Math.max(0,Math.min(add,10-(es[e.stat]||0)));
      }
      es[e.stat]=(es[e.stat]||0)+add;
      (src.stat[e.stat]=src.stat[e.stat]||[]).push({amount:add,src:e.src});
    }
    if(e.type==="skill_bonus"&&e.skill){
      eSk[e.skill]=(eSk[e.skill]||0)+(e.amount||0);
      (src.skill[e.skill]=src.skill[e.skill]||[]).push({amount:e.amount||0,src:e.src});
    }
  });
  effs.forEach(function(e){if(e.type==="stat_set"&&e.stat)es[e.stat]=e.value});
  /* Штраф к Уклонению от надетой тяжёлой брони/шлема/щита — складывается
     в сам навык, поэтому автоматически участвует во всех бросках уклонения. */
  var ap=armorPenaltyOf(c,es);if(ap.dodge)eSk["Уклонение"]=(eSk["Уклонение"]||0)+ap.dodge;
  var mxW=c.willOv||es.volya||1;
  var curW=c.curWill!==null&&c.curWill!==undefined?c.curWill:mxW;
  function effPen(statKey){return effs.reduce(function(a,e){if(e.type==="all_roll")return a+(e.amount||0);if(e.type==="stat_roll"&&e.stat===statKey)return a+(e.amount||0);return a},0)}
  var pen={will:willPenalty(curW),shaken:c.shakenPenalty?-c.shakenPenalty:0,dose:dosePenalty(c.dose),disease:0,of:effPen,
    attack:effs.reduce(function(a,e){return a+(e.type==="attack_bonus"?(e.amount||0):0)},0),aim:effs.reduce(function(a,e){return a+(e.type==="aim_pen"?(e.amount||0):0)},0)};
  function rollPen(statKey){
    var parts=[];
    if(pen.will)parts.push({label:"Воля",value:pen.will});
    if(pen.shaken)parts.push({label:"Потрясён",value:pen.shaken});
    if(pen.dose)parts.push({label:"Доза",value:pen.dose});
    var dp=effPen(statKey);if(dp)parts.push({label:"Болезни и раны",value:dp});
    return{total:parts.reduce(function(a,p){return a+p.value},0),parts:parts};
  }
  return{race:null,fs:es,eSk:eSk,effects:effs,src:src,pen:pen,rollPen:rollPen}}

/* Здоровье = (Тело + Реакция) × 2 + hpRoll (+ эффекты hp_flat). Кубик
   бросается один раз (hpRoll хранится на персонаже). */
/* Здоровье = (Тело + Реакция) × 2 + d10 + рост за уровни + эффекты.
   levelHp копится при повышении уровня (+2 за уровень с правил v3):
   у старых персонажей прошлые уровни не пересчитываются. */
function mHP(f,c){
  var base=(f.telo||0)*2+(f.reak||0)*2+((c&&c.hpRoll)||0)+((c&&c.levelHp)||0);
  if(!c)return Math.max(1,base);
  var bonus=0;
  activeTraitEffects(c,getTraits()).forEach(function(e){if(e.type==="hp_flat")bonus+=(e.amount||0)});
  return Math.max(1,base+bonus);
}
function nC(name){return{name:name||"",level:1,xp:0,portrait:"",bio:"",locked:false,
  curHp:null,hpOv:null,curWill:null,willOv:null,hpRoll:r1(10),
  weapons:[],armors:[],equippedHead:null,equippedBody:null,shield:null,shieldHp:0,shieldMaxHp:0,equippedWeapon:null,weaponMode:"1h",
  inventory:[],shakenPenalty:0,broken:false,
  stats:iS(),skills:iSk(),skillPts:0,money:0,profession:"none",origin:"post",
  dose:0,diseases:[],crits:[],combatDepoUsed:false,depoCharge:1,
  bracelet:null,cassettes:[],solutions:{arm:null,leg:null,implants:[],addons:[]},molva:0}}

/* Опыт до следующего уровня растёт на 100 за уровень. xpForLevel(N) —
   сколько всего опыта нужно набрать с нуля, чтобы ДОСТИЧЬ уровня N. */
function xpForLevel(level){var total=0;for(var i=1;i<level;i++)total+=i*100;return total}
function xpProgress(c){
  var lvl=c.level||1;var have=c.xp||0;
  var curThresh=xpForLevel(lvl);var nextThresh=xpForLevel(lvl+1);
  var need=Math.max(1,nextThresh-curThresh);var got=Math.max(0,Math.min(need,have-curThresh));
  return{level:lvl,have:have,curThresh:curThresh,nextThresh:nextThresh,need:need,got:got,pct:Math.min(100,(got/need)*100),ready:have>=nextThresh};
}

/* Награда за уровень — только очки навыков: характеристики растут
   только через кассеты. Уровни выше 10 получают награду 10-го. */
/* Каждый уровень 2–10: +1 очко навыка и +2 к максимальному Здоровью
   (навык ×2 растёт раз в два уровня). skill — старое имя поля для кода базы. */
var LEVEL_REWARDS={};for(var _l=2;_l<=10;_l++)LEVEL_REWARDS[_l]={skillPoints:1,maxHp:2,skill:1};
function levelUpReward(level){return LEVEL_REWARDS[level]||LEVEL_REWARDS[10]}

/* Случайные 6 характеристик и навыки под профессию и происхождение.
   Правил создания по очкам в книге пока нет — это только черновик для
   быстрого старта, числа потом правятся вручную. */
/* Очки создания: 15 на характеристики и 15 на навыки, потолок на старте 8.
   Основной путь — utils/creation.js; здесь — для генератора. */
var STAT_POINTS=15,SKILL_POINTS=15;
/* Потрачено очков характеристик сверх стартовых значений происхождения */
function statSpent(stats,originId){var b=originId?(originOf(originId).base||{}):{};return SD.reduce(function(a,s){return a+Math.max(0,((stats||{})[s.key]||1)-(b[s.key]||1))},0)}
function skillSpent(skills){return uSkP(skills||{})}
/* Потолок характеристики и навыка в черновике с учётом происхождения */
function statCap(originId,k){var c=originOf(originId).caps||{};return Math.min(8,c[k]||8)}
function skillCap(originId,n){var c=originOf(originId).startSkillCaps||{};return c[n]!==undefined?c[n]:8}
function rndCore(pr,originId){
  var org=originOf(originId);var caps=org.caps||{};var skCaps=org.startSkillCaps||{};
  var st=Object.assign(iS(),org.base||{});var keys=SD.map(function(s){return s.key});
  function cap(k){return Math.min(8,caps[k]||8)}
  for(var i=0;i<STAT_POINTS;i++){var cn=keys.filter(function(k){return st[k]<cap(k)});if(!cn.length)break;st[pk(cn)]++}
  var sk=iSk();var pref=(pr&&pr.skills)||[];var budget=SKILL_POINTS;
  function scap(n){return Math.min(6,skCaps[n]!==undefined?skCaps[n]:6)}
  for(var x=0;x<400&&budget>0;x++){
    var fits=function(n){return sk[n]<scap(n)&&skCost(n)<=budget};
    var pool=(x<12&&pref.length?pref:ALL_SKILLS).filter(fits);
    if(!pool.length){pool=ALL_SKILLS.filter(fits);if(!pool.length)break}
    var n1=pk(pool);sk[n1]++;budget-=skCost(n1);
  }
  return{stats:st,skills:sk}}
function rnd(pId,originId){var P=getProfs();var pr=P.find(function(p){return p.id===pId})||P[0];var core=rndCore(pr,originId||"post");return{name:pk(NAMES_P),stats:core.stats,skills:core.skills}}
function rndStats(pId,originId){var P=getProfs();var pr=P.find(function(p){return p.id===pId})||P[0];return rndCore(pr,originId||"post")}

/* Текущее и максимальное Здоровье / Воля */
function hpOf(c,fs){var mx=c.hpOv||mHP(fs,c);var cur=c.curHp!==null&&c.curHp!==undefined?c.curHp:mx;return{cur:cur,max:mx}}
function willOf(c,fs){var mx=c.willOv||fs.volya||1;var cur=c.curWill!==null&&c.curWill!==undefined?c.curWill:mx;return{cur:cur,max:mx}}
/* Здоровье словами — для «Немоты» (5+ шагов железа, без планшета) */
function hpWords(cur,max){var p=max>0?cur/max:0;if(p>=0.7)return"легко";if(p>=0.35)return"плохо";return"очень плохо"}

export { STAT_POINTS, SKILL_POINTS, statSpent, skillSpent, statCap, skillCap, iS, iSk, uSP, uSkP, gE, cF, mHP, nC, rnd, rndStats, rndCore, xpForLevel, xpProgress, levelUpReward, LEVEL_REWARDS, willPenalty, dosePenalty, diseasePenalty, hpOf, willOf, hpWords };
