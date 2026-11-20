/* Эффекты персонажа. В базе это были черты (traits → activeTraitEffects → cF);
   здесь тот же механизм собирает эффекты из кассет в гнёздах, насадки
   протеза, вживляемого, накладного и происхождения. Всё, что попадает
   сюда как stat_bonus / skill_bonus, автоматически участвует в проверках
   и в бою через cF.

   Типы эффектов: stat_bonus, skill_bonus, hp_flat, stat_set,
   free_overcome_fear («Стержень»), aim_bonus («Хирург»),
   dual_wield, armor_effectiveness (остались от базы). */
import { BRACELETS, FINE_SKILLS } from './gear';
import { cassDef } from '../utils/cassettes';
import { originOf } from './professions';
import { diseaseList, IRON_FIST } from './gear';
import { prosthesesOf } from '../utils/crits';
import { getScene } from '../utils/sceneStore';
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
var LIMB_KEYS=["armL","armR","legL","legR"];
var LIMB_NAME={armL:"Левая рука",armR:"Правая рука",legL:"Левая нога",legR:"Правая нога"};
function isArm(k){return k==="armL"||k==="armR"}
/* Железная конечность (не «Хватка»): гнездо, шаг железа, бьёт как Тело 7 */
function isIron(limb){return !!(limb&&limb.grade!=="hvatka")}
function solutionList(c,cat){
  var s=(c&&c.solutions)||{};var out=[];var p=prosthesesOf(c);
  LIMB_KEYS.forEach(function(k){var l=p[k];if(!l)return;
    if(l.grade==="hvatka")out.push({slot:k,name:LIMB_NAME[k]+": «Хватка»",nest:0,steps:0});
    else out.push({slot:k,name:LIMB_NAME[k]+": "+(isArm(k)?"протез руки":"нога «Опора»")+(l.grade==="rebuilt"?" (перебранный)":"")+(l.broken?" — сломан":""),nest:1,steps:1});
  });
  (s.implants||[]).concat(s.addons||[]).forEach(function(k){var d=findBy(cat.implants,k);if(d)out.push({slot:d.kind,key:k,name:d.name,nest:d.nest||0,steps:d.steps||0,def:d})});
  return out;
}
/* Насадка на конечности (рабочая), или null */
function limbTip(c,cat,k){var l=prosthesesOf(c)[k];if(!l||l.grade==="hvatka"||l.broken||!l.tip)return null;return findBy(isArm(k)?cat.tips:(cat.legTips||[]),l.tip)}
function ironArms(c){var p=prosthesesOf(c);return ["armL","armR"].filter(function(k){return isIron(p[k])&&!p[k].broken})}
function ironLegs(c){var p=prosthesesOf(c);return ["legL","legR"].filter(function(k){return isIron(p[k])})}
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
  var def=cassDef(cass,cat);
  if(!braceletOf(c))return{ok:false,reason:"браслета нет"};
  var ni=nestInfo(c,cat);
  if(ni.blocked)return{ok:false,reason:"Корпус: кассеты невозможны"};
  if(def&&!canRead(c,def.cls))return{ok:false,reason:"нужен "+(def.cls==="MIL"?"Military":def.cls==="UTIL"?"Utilitary или Military":"браслет")+" или перешивка у кассетника (Техника СЛ 18)"};
  if(((c.cassettes)||[]).some(function(x){return x.inNest&&x.key===cass.key&&(cass.key!=="custom"||x.title===cass.title)&&x.id!==cass.id}))return{ok:false,reason:"такая кассета уже стоит — дважды не складывается"};
  if(ni.free<=0)return{ok:false,reason:"нет свободных гнёзд"};
  return{ok:true,reason:""};
}
/* Работает ли вставленная кассета (палёнка — только если «завелась») */
function cassWorks(x){
  if(!x||!x.inNest||x.dead||x.muted||x.dud)return false;
  if(x.kind==="fake")return x.fakeState==="copy";
  return true;
}
/* Эффекты одной кассеты с учётом вида: слепок даёт +3 вместо +2;
   затёртая и битая — бонус −1, но не ниже +1 */
function cassEffects(x,def){
  return (def.effects||[]).map(function(e){
    var o=Object.assign({},e);
    if(x.kind==="slep"&&e.type==="skill_bonus"&&(e.amount||0)>=2)o.amount=(e.amount||0)+1;
    if((x.condition==="worn"||x.condition==="broken")&&(o.type==="skill_bonus"||o.type==="stat_bonus")&&(o.amount||0)>1)o.amount=o.amount-1;
    return o;
  });
}

/* Плоский список активных эффектов. У каждого — src: откуда он взялся
   (нужно для шума кассет и износа насадки). */
function activeTraitEffects(c,cat){
  var out=[];if(!c)return out;cat=cat||{};
  var seen={};
  if(!nestInfo(c,cat).blocked)(c.cassettes||[]).forEach(function(x){
    var sk=x.key==="custom"?"custom:"+(x.title||x.id):x.key;
    if(!cassWorks(x)||seen[sk])return;
    var def=cassDef(x,cat);if(!def||!canRead(c,def.cls))return;
    seen[sk]=true;
    cassEffects(x,def).forEach(function(e){out.push(Object.assign({},e,{src:{from:"cassette",id:x.id,key:x.key,name:def.name,kind:x.kind==="fake"?"copy":x.kind}}))});
  });
  var s=c.solutions||{};var pr=prosthesesOf(c);
  /* «Хватка»: −2 к тонкой работе (один раз, сколько бы их ни было) */
  if(LIMB_KEYS.some(function(k){return pr[k]&&pr[k].grade==="hvatka"}))FINE_SKILLS.forEach(function(n){out.push({type:"skill_bonus",skill:n,amount:-2,src:{from:"hvatka",name:"«Хватка»"}})});
  /* Насадки на каждой рабочей конечности; одинаковые не складываются */
  var seenTip={};
  LIMB_KEYS.forEach(function(k){var t=limbTip(c,cat,k);if(!t||seenTip[t.key])return;seenTip[t.key]=true;
    (t.effects||[]).forEach(function(e){out.push(Object.assign({},e,{src:{from:"tip",key:t.key,name:t.name,limb:k}}))});
    if(t.finePen)FINE_SKILLS.forEach(function(n){out.push({type:"skill_bonus",skill:n,amount:-t.finePen,src:{from:"tipPen",name:t.name,limb:k}})});
  });
  /* Сцена: топь (−2 к Атлетике и Уклонению всем; железной ноге без «Болотохода» ещё −2), бездорожье на роликах */
  var sc=getScene();var legs=ironLegs(c);
  var allBolot=legs.length>0&&legs.every(function(k){return (pr[k].tip||"")==="bolotohod"});
  if(sc.swamp&&!allBolot){
    var sw=-2-(legs.length?2:0);
    ["Атлетика","Уклонение"].forEach(function(n){out.push({type:"skill_bonus",skill:n,amount:sw,src:{from:"scene",name:legs.length?"Топь, железная нога":"Топь"}})});
  }
  if(sc.offroad&&legs.some(function(k){return pr[k].tip==="roliki"&&!pr[k].broken}))out.push({type:"skill_bonus",skill:"Уклонение",amount:-2,src:{from:"scene",name:"Ролики на бездорожье"}});
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
/* Первая рабочая насадка на руке (для старого кода) */
function activeTip(c,cat){for(var i=0;i<2;i++){var t=limbTip(c,cat,["armR","armL"][i]);if(t)return t}return null}
/* «Тонкая работа невозможна» — клешня на любой руке */
function fineBlocked(c,cat,skill){return FINE_SKILLS.indexOf(skill)>=0&&["armL","armR"].some(function(k){var t=limbTip(c,cat,k);return !!(t&&t.noFine)})}
/* Оружие и щиты от железа: насадки-оружие, кулак протеза, «Копыто», скобы, «Заслон» */
function gearWeapons(c,cat){
  var out=[];
  ironArms(c).forEach(function(k){
    var t=limbTip(c,cat,k);
    if(t&&t.weapon)out.push(Object.assign({id:"gear_tip_"+k+"_"+t.key,gear:true,limb:k},t.weapon));
    else if(!t||!t.shield)out.push(Object.assign({id:"gear_fist_"+k,gear:true,limb:k},IRON_FIST,{name:IRON_FIST.name+(k==="armL"?" (левый)":" (правый)")}));
  });
  ["legL","legR"].forEach(function(k){var t=limbTip(c,cat,k);if(t&&t.weapon)out.push(Object.assign({id:"gear_tip_"+k+"_"+t.key,gear:true,limb:k},t.weapon))});
  var s=(c&&c.solutions)||{};
  (s.addons||[]).concat(s.implants||[]).forEach(function(k){var d=findBy(cat.implants,k);if(d&&d.weapon)out.push(Object.assign({id:"gear_"+k,gear:true},d.weapon))});
  return out;
}
function gearShields(c,cat){var out=[];ironArms(c).forEach(function(k){var t=limbTip(c,cat,k);if(t&&t.shield)out.push(Object.assign({id:"gear_sh_"+k,gear:true,limb:k},t.shield))});return out}
/* Две рабочие железные руки — двойная атака без −2 */
function twoIronArms(c){return ironArms(c).length>=2}
function hasDepo(c,cat){var s=(c&&c.solutions)||{};return (s.addons||[]).some(function(k){var d=findBy(cat.implants,k);return d&&d.depo})}
/* Планшет в сумке открывает игроку Отпечаток и точное Здоровье */
function hasTablet(c){return ((c&&c.inventory)||[]).some(function(i){return /планшет/i.test(i.name||"")})}

export { LIMB_KEYS, LIMB_NAME, isArm, isIron, limbTip, ironArms, ironLegs, gearShields, twoIronArms, EFFECT_TYPES, genId, findBy, braceletOf, canRead, solutionList, ironSteps, upkeepCount, nestInfo, canInsert, cassWorks, cassEffects, hasTraitEffect, activeTraitEffects, armorEffectivenessOf, activeTip, fineBlocked, gearWeapons, hasDepo, hasTablet };
