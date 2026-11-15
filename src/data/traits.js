/* Эффекты персонажа. В базе это были черты (traits → activeTraitEffects → cF);
   здесь тот же механизм собирает эффекты из кассет в гнёздах, насадки
   протеза, вживляемого, накладного и происхождения. Всё, что попадает
   сюда как stat_bonus / skill_bonus, автоматически участвует в проверках
   и в бою через cF.

   Типы эффектов: stat_bonus, skill_bonus, hp_flat, stat_set,
   free_overcome_fear («Стержень»), aim_bonus («Хирург»),
   dual_wield, armor_effectiveness (остались от базы). */
import { BRACELETS, FINE_SKILLS } from './gear';
import { originOf } from './professions';
import { diseaseList } from './gear';
import { critEffects } from '../utils/crits';

function genId(){return "gx_"+Date.now().toString(36)+Math.floor(Math.random()*1000).toString(36)}

var EFFECT_TYPES=[
  {id:"stat_bonus",name:"+ к характеристике"},
  {id:"skill_bonus",name:"+ к навыку"},
  {id:"hp_flat",name:"+ к Здоровью"},
];

function findBy(list,key){return (list||[]).find(function(x){return x.key===key})||null}

/* Что читает браслет персонажа */
function braceletOf(c){var m=c&&c.bracelet&&c.bracelet.model;return m&&BRACELETS[m]?BRACELETS[m]:null}
function canRead(c,cls){var b=braceletOf(c);return !!(b&&b.reads.indexOf(cls)>=0)}

/* Список солюшнов персонажа с описаниями из каталога */
function solutionList(c,cat){
  var s=(c&&c.solutions)||{};var out=[];
  if(s.arm&&s.arm.grade!=="hvatka")out.push({slot:"arm",name:"Протез руки"+(s.arm.grade==="rebuilt"?" (перебранный)":""),nest:1,steps:1});
  if(s.arm&&s.arm.grade==="hvatka")out.push({slot:"arm",name:"«Хватка» (временный протез)",nest:0,steps:0});
  if(s.leg)out.push({slot:"leg",name:"Нога «Опора»",nest:1,steps:1});
  (s.implants||[]).concat(s.addons||[]).forEach(function(k){var d=findBy(cat.implants,k);if(d)out.push({slot:d.kind,key:k,name:d.name,nest:d.nest||0,steps:d.steps||0,def:d})});
  return out;
}
function ironSteps(c,cat){return solutionList(c,cat).reduce(function(a,x){return a+(x.steps||0)},0)}
function upkeepCount(c,cat){return solutionList(c,cat).filter(function(x){return (x.steps||0)>0}).length}
/* Гнёзда: всего / заняты солюшнами / заняты кассетами / свободно */
function nestInfo(c,cat){
  var b=braceletOf(c);var total=b?b.nests:0;
  var sl=solutionList(c,cat);
  var all=sl.some(function(x){return x.def&&x.def.allNests});
  var sol=all?total:sl.reduce(function(a,x){return a+(x.nest||0)},0);
  var cass=((c&&c.cassettes)||[]).filter(function(x){return x.inNest}).length;
  return{total:total,solutions:Math.min(total,sol),cassettes:cass,free:Math.max(0,total-sol-cass),blocked:all};
}
/* Можно ли вставить кассету: {ok, reason} */
function canInsert(c,cass,cat){
  var def=findBy(cat.cassettes,cass.key);
  if(!braceletOf(c))return{ok:false,reason:"браслета нет"};
  var ni=nestInfo(c,cat);
  if(ni.blocked)return{ok:false,reason:"Корпус: кассеты невозможны"};
  if(def&&!canRead(c,def.cls))return{ok:false,reason:"нужен "+(def.cls==="MIL"?"Military":def.cls==="UTIL"?"Utilitary или Military":"браслет")+" или перешивка у кассетника (Техника СЛ 18)"};
  if(((c.cassettes)||[]).some(function(x){return x.inNest&&x.key===cass.key&&x.id!==cass.id}))return{ok:false,reason:"такая кассета уже стоит — дважды не складывается"};
  if(ni.free<=0)return{ok:false,reason:"нет свободных гнёзд"};
  return{ok:true,reason:""};
}
/* Работает ли вставленная кассета (палёнка — только если «завелась») */
function cassWorks(x){
  if(!x||!x.inNest||x.dead||x.muted)return false;
  if(x.kind==="fake")return x.fakeState==="copy";
  return true;
}
/* Эффекты одной кассеты с учётом вида: слепок даёт +3 вместо +2 */
function cassEffects(x,def){
  return (def.effects||[]).map(function(e){
    var o=Object.assign({},e);
    if(x.kind==="slep"&&e.type==="skill_bonus"&&(e.amount||0)>=2)o.amount=(e.amount||0)+1;
    return o;
  });
}

/* Плоский список активных эффектов. У каждого — src: откуда он взялся
   (нужно для шума кассет и износа насадки). */
function activeTraitEffects(c,cat){
  var out=[];if(!c)return out;cat=cat||{};
  var seen={};
  if(!nestInfo(c,cat).blocked)(c.cassettes||[]).forEach(function(x){
    if(!cassWorks(x)||seen[x.key])return;
    var def=findBy(cat.cassettes,x.key);if(!def||!canRead(c,def.cls))return;
    seen[x.key]=true;
    cassEffects(x,def).forEach(function(e){out.push(Object.assign({},e,{src:{from:"cassette",id:x.id,key:x.key,name:def.name,kind:x.kind==="fake"?"copy":x.kind}}))});
  });
  var s=c.solutions||{};
  if(s.arm&&s.arm.grade==="hvatka"){
    FINE_SKILLS.forEach(function(n){out.push({type:"skill_bonus",skill:n,amount:-2,src:{from:"hvatka",name:"«Хватка»"}})});
  } else if(s.arm&&s.arm.tip&&!s.arm.broken){
    var tip=findBy(cat.tips,s.arm.tip);
    if(tip)(tip.effects||[]).forEach(function(e){out.push(Object.assign({},e,{src:{from:"tip",key:tip.key,name:tip.name}}))});
  }
  (s.implants||[]).concat(s.addons||[]).forEach(function(k){
    var d=findBy(cat.implants,k);
    if(d)(d.effects||[]).forEach(function(e){out.push(Object.assign({},e,{src:{from:d.kind,key:k,name:d.name}}))});
  });
  (originOf(c.origin).effects||[]).forEach(function(e){out.push(Object.assign({},e,{src:{from:"origin",name:originOf(c.origin).name}}))});
  diseaseList(c).forEach(function(d){d.effects.forEach(function(e){out.push(Object.assign({},e,{src:{from:"disease",name:d.name}}))})});
  critEffects(c).forEach(function(e){out.push(e)});
  return out;
}
/* Двойная атака доступна всем (в базе её открывала черта) */
function hasTraitEffect(c,cat,type){
  if(type==="dual_wield")return true;
  return activeTraitEffects(c,cat).some(function(e){return e.type===type});
}
function armorEffectivenessOf(c,cat){
  var effs=activeTraitEffects(c,cat).filter(function(e){return e.type==="armor_effectiveness"&&e.value!=null});
  if(!effs.length)return 1;
  return effs.reduce(function(v,e){return Math.min(v,e.value)},1);
}
/* Насадка, которая сейчас на протезе и не сломана */
function activeTip(c,cat){var a=c&&c.solutions&&c.solutions.arm;if(!a||a.grade==="hvatka"||!a.tip||a.broken)return null;return findBy(cat.tips,a.tip)}
/* «Тонкая работа невозможна» — клешня на протезе */
function fineBlocked(c,cat,skill){var t=activeTip(c,cat);return !!(t&&t.noFine&&FINE_SKILLS.indexOf(skill)>=0)}
/* Оружие от железа: насадка «Ствол», скобы на костяшках */
function gearWeapons(c,cat){
  var out=[];var t=activeTip(c,cat);
  if(t&&t.weapon)out.push(Object.assign({id:"gear_tip_"+t.key,gear:true},t.weapon));
  var s=(c&&c.solutions)||{};
  (s.addons||[]).concat(s.implants||[]).forEach(function(k){var d=findBy(cat.implants,k);if(d&&d.weapon)out.push(Object.assign({id:"gear_"+k,gear:true},d.weapon))});
  return out;
}
function hasDepo(c,cat){var s=(c&&c.solutions)||{};return (s.addons||[]).some(function(k){var d=findBy(cat.implants,k);return d&&d.depo})}
/* Планшет в сумке открывает игроку Отпечаток и точное Здоровье */
function hasTablet(c){return ((c&&c.inventory)||[]).some(function(i){return /планшет/i.test(i.name||"")})}

export { EFFECT_TYPES, genId, findBy, braceletOf, canRead, solutionList, ironSteps, upkeepCount, nestInfo, canInsert, cassWorks, cassEffects, hasTraitEffect, activeTraitEffects, armorEffectivenessOf, activeTip, fineBlocked, gearWeapons, hasDepo, hasTablet };
