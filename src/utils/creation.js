/* Пошаговое создание персонажа. Всё, что игрок выбрал, хранится в
   c.creation; итоговые характеристики, навыки и стартовый набор
   считаются отсюда при «Принять». Чистые функции — покрыты тестами. */
import { SD, ALL_SKILLS } from '../data/stats';
import { PROFS, originOf } from '../data/professions';
import { buildShopDefaults, buildMiscDefaults } from '../data/shopDefaults';
import { grantPatch } from './grant';

/* На старте: 20 очков на характеристики, 25 на навыки, потолок 8 */
var STAT_POINTS=20,SKILL_POINTS=25,PRE_POINTS=4,START_CAP=8;
var PRE_SKILLS=["Знания","Техника","Механика","Медицина"];
var AGE={pre:[45,70],post:[18,23]};
var STRELOK_GUNS=["«Трубач», самопал","«Кум», двуствольный обрез","«Карманник», пистолет"];

/* «год / года / лет» */
function yearsWord(n){n=Math.abs(parseInt(n)||0);var a=n%100,b=n%10;if(a>=11&&a<=14)return n+" лет";if(b===1)return n+" год";if(b>=2&&b<=4)return n+" года";return n+" лет"}
function emptyCreation(){return{name:"",origin:"",age:"",profession:"",postStat:"",pre:{},kit:{gun:"",cass:[]},stats:{},skills:{}}}
function profOf(id,profs){return (profs||PROFS).find(function(p){return p.id===id})||null}

/* Бонусы от выбора (без очков игрока) */
function statBonus(cr){var b={};if(cr.origin==="post"&&cr.postStat)b[cr.postStat]=1;return b}
function skillBonus(cr,profs){
  var b={};function add(n,v){b[n]=(b[n]||0)+v}
  var p=profOf(cr.profession,profs);if(p)(p.skills||[]).forEach(function(n){add(n,2)});
  if(cr.origin==="post"){add("Выживание",2);add("Внимательность",2)}
  if(cr.origin==="pre")Object.keys(cr.pre||{}).forEach(function(n){if(cr.pre[n])add(n,cr.pre[n])});
  return b;
}
/* Потолки: довоенный — Тело и Реакция не выше 7; послевоенный — Знания и Техника на старте не выше 3 */
function statMax(cr,k){var c=originOf(cr.origin).caps||{};return Math.min(START_CAP,c[k]||START_CAP)}
function skillMax(cr,n){var c=cr.origin==="post"?(originOf("post").startSkillCaps||{}):{};return c[n]!==undefined?Math.min(START_CAP,c[n]):START_CAP}

function finalStats(cr){var b=statBonus(cr);var o={};SD.forEach(function(s){o[s.key]=1+((cr.stats||{})[s.key]||0)+(b[s.key]||0)});return o}
function finalSkills(cr,profs){var b=skillBonus(cr,profs);var o={};ALL_SKILLS.forEach(function(n){o[n]=((cr.skills||{})[n]||0)+(b[n]||0)});return o}
function spent(obj){return Object.keys(obj||{}).reduce(function(a,k){return a+(obj[k]||0)},0)}
function statsLeft(cr){return STAT_POINTS-spent(cr.stats)}
function skillsLeft(cr){return SKILL_POINTS-spent(cr.skills)}
function preLeft(cr){return PRE_POINTS-spent(cr.pre)}

/* Можно ли добавить очко */
function canStat(cr,k){return statsLeft(cr)>0&&finalStats(cr)[k]<statMax(cr,k)}
function canSkill(cr,n,profs){return skillsLeft(cr)>0&&finalSkills(cr,profs)[n]<skillMax(cr,n)}

/* Ошибки по шагам: пустой массив — шаг пройден */
function stepErrors(cr,step,profs){
  var e=[];
  if(step===0&&!(cr.name||"").trim())e.push("Впиши кличку");
  if(step===1){
    if(!cr.origin)e.push("Выбери происхождение");
    else{var r=AGE[cr.origin];var a=parseInt(cr.age);if(!(a>=r[0]&&a<=r[1]))e.push("Возраст: от "+r[0]+" до "+r[1]);
      if(cr.origin==="post"&&!cr.postStat)e.push("Выбери +1 к Телу или Реакции");
      if(cr.origin==="pre"&&preLeft(cr)!==0)e.push("Распредели 4 очка знаний (осталось "+preLeft(cr)+")")}
  }
  if(step===2){
    if(!profOf(cr.profession,profs)||cr.profession==="none")e.push("Выбери профессию");
    if(cr.profession==="strelok"&&!cr.kit.gun)e.push("Выбери ствол");
    if(cr.profession==="kassetnik"&&(cr.kit.cass||[]).length!==2)e.push("Выбери 2 кассеты");
  }
  if(step===3){
    if(statsLeft(cr)!==0)e.push("Распредели все очки характеристик (осталось "+statsLeft(cr)+")");
    var fs=finalStats(cr);SD.forEach(function(s){if(fs[s.key]>statMax(cr,s.key))e.push(s.full+": не выше "+statMax(cr,s.key))});
  }
  if(step===4){
    if(skillsLeft(cr)!==0)e.push("Распредели все очки навыков (осталось "+skillsLeft(cr)+")");
    var sk=finalSkills(cr,profs);ALL_SKILLS.forEach(function(n){if(sk[n]>skillMax(cr,n))e.push(n+": не выше "+skillMax(cr,n))});
  }
  return e;
}
/* Смена происхождения или профессии может сломать потолки — подрезаем очки игрока */
function clampCreation(cr,profs){
  var o=JSON.parse(JSON.stringify(cr));
  if(o.origin!=="pre")o.pre={};
  if(o.origin!=="post")o.postStat="";
  SD.forEach(function(s){var over=finalStats(o)[s.key]-statMax(o,s.key);if(over>0)o.stats[s.key]=Math.max(0,(o.stats[s.key]||0)-over)});
  ALL_SKILLS.forEach(function(n){var over=finalSkills(o,profs)[n]-skillMax(o,n);if(over>0)o.skills[n]=Math.max(0,(o.skills[n]||0)-over)});
  return o;
}

/* Стартовый набор профессии — как список товаров каталога */
var KIT={
  strelok:function(cr){return [{name:cr.kit.gun},{name:"Патроны (30 шт.)"},{name:"Разгрузка"}]},
  feldsher:function(){return [{name:"Бинты",qty:3},{name:"Жгут",qty:2},{name:"Скальпель"},{name:"Спирт (фляга)"}]},
  kassetnik:function(cr){return [{name:"Браслет MG+ Utilitary"},{name:"Планшет"},{name:"Станок кассетника"}].concat((cr.kit.cass||[]).map(function(k){return{cassette:k}}))},
  korobeynik:function(){return [{item:{cat:"item",name:"Короб товара на 100 ер.",desc:"Товар на продажу."}},{name:"Весы"},{name:"Якутский нож (быһах)"}]},
  montyor:function(){return [{name:"Ящик инструментов"},{name:"Проволока и изолента"},{name:"Паяльник"}]}
};
function kitList(cr){var f=KIT[cr.profession];return f?f(cr):[]}
function kitPatch(c,cat,cr){
  var all=buildShopDefaults().concat(buildMiscDefaults());var cur=Object.assign({},c);var names=[];
  kitList(cr).forEach(function(k){
    var it=k.item||(k.cassette?{cat:"cassette",gearKey:k.cassette,name:k.cassette}:all.find(function(i){return i.name===k.name}));
    if(!it)return;
    for(var q=0;q<(k.qty||1);q++){var p=grantPatch(cur,cat,it,{kind:"copy"});if(!p.error)cur=Object.assign(cur,p)}
    names.push(k.cassette?(((cat.cassettes||[]).find(function(x){return x.key===k.cassette})||{}).name||k.cassette)+" (копия)":it.name+(k.qty>1?" ×"+k.qty:""));
  });
  var patch={};["weapons","inventory","cassettes","bracelet","solutions","armors","shields"].forEach(function(f){if(cur[f]!==c[f])patch[f]=cur[f]});
  return{patch:patch,names:names};
}
/* Итоговый патч персонажа при «Принять» */
function finishPatch(c,cat,cr,profs){
  var stats=finalStats(cr);var skills=finalSkills(cr,profs);
  var patch={name:cr.name.trim(),origin:cr.origin,age:parseInt(cr.age),profession:cr.profession,stats:stats,skills:skills,lockedSkills:Object.assign({},skills),locked:true,curHp:null,curWill:null,creation:cr};
  var names=[];
  if(!c.kitGiven){var k=kitPatch(c,cat,cr);Object.assign(patch,k.patch);patch.kitGiven=true;names=k.names}
  return{patch:patch,kitNames:names};
}

export { yearsWord, START_CAP, STAT_POINTS, SKILL_POINTS, PRE_POINTS, PRE_SKILLS, AGE, STRELOK_GUNS, emptyCreation, statBonus, skillBonus, statMax, skillMax, finalStats, finalSkills, statsLeft, skillsLeft, preLeft, canStat, canSkill, stepErrors, clampCreation, kitList, kitPatch, finishPatch };
