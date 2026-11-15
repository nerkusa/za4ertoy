/* Машины в бою (глава 7). Чистые функции; rnd(n) — бросок dn для тестов.
   Корпус — Здоровье машины, броня — как у людей (класс и прочность). */
import { calcAE } from './combat';
import { r1, rollHit } from './dice';

function sumDice(expr,rnd){rnd=rnd||r1;var m=String(expr||"").match(/(\d+)d(\d+)(?:\+(\d+))?/);if(!m)return 0;var t=0;for(var i=0;i<parseInt(m[1]);i++)t+=rnd(parseInt(m[2]));return t+(parseInt(m[3])||0)}
/* Текущая скорость и штраф к Вождению машины */
function speedOf(v){return Math.max(0,(v.speed||0)-(v.speedLoss||0))}
function wheelPen(v){return (v.wheelsHit||0)>=1?-2:0}
/* Бросок водителя: Реакция + Вождение + Управляемость + d10.
   swamp — топь (−2, у Буханки штрафа нет). R — готовый rollHit (для тестов). */
function driverRoll(drv,v,opts,R){
  opts=opts||{};R=R||rollHit();
  var sw=opts.swamp&&!v.swampFree?-2:0;
  var parts=[{label:"Реакция",value:drv.reak||0},{label:"Вождение",value:drv.driving||0},{label:"Управляемость",value:v.handling||0}];
  if(wheelPen(v))parts.push({label:"Колесо",value:wheelPen(v)});
  if(sw)parts.push({label:"Топь",value:sw});
  if(drv.pen)parts.push({label:"Штраф",value:drv.pen});
  var total=R.d+parts.reduce(function(a,p){return a+p.value},0);
  return{total:total,d:R.d,crit:R.crit,fumble:R.fumble,parts:parts};
}
/* Раунд погони: быстрая машина прибавляет разницу Скоростей; победитель
   получает 1 очко дистанции, при разнице 5 и больше — 2. Ничья — никто. */
function chaseRound(a,b){
  var sa=speedOf(a.v),sb=speedOf(b.v);
  var ta=a.total+(sa>sb?sa-sb:0),tb=b.total+(sb>sa?sb-sa:0);
  if(ta===tb)return{winner:null,gain:0,ta:ta,tb:tb};
  var diff=Math.abs(ta-tb);return{winner:ta>tb?"a":"b",gain:diff>=5?2:1,ta:ta,tb:tb};
}
var CHASE_GOAL=3;
/* Таран: Вождение на Вождение (пешеход — Уклонением). Попал — урон тарана
   по Корпусу цели или Здоровью пешехода; таранящая машина получает половину. */
function ramResult(att,def,ramDice,rnd){
  if(!(att>def))return{hit:false,dmg:0,self:0};
  var dmg=sumDice(ramDice,rnd);return{hit:true,dmg:dmg,self:Math.floor(dmg/2)};
}
/* Урон по Корпусу через броню машины */
function hullHit(v,dmg,dmgType){
  var armor=(v.armorType&&v.armorType!=="none"&&(v.armorHp||0)>0)?v.armorType:"none";
  var ae=calcAE(armor,dmgType||"П",dmg);
  var nv=Object.assign({},v,{hull:Math.max(0,(v.hull||0)-ae.hd)});
  if(ae.ad>0&&armor!=="none")nv.armorHp=Math.max(0,(v.armorHp||0)-ae.ad);
  return{v:nv,hd:ae.hd,ad:ae.ad,desc:ae.desc};
}
var HIT_TABLE=["Водитель","Колесо","Корпус","Корпус","Мотор","Бак"];
/* Попадание по машине, d6 (rnd для теста). Возвращает новую машину,
   урон водителю (если попали в него) и описание. */
function vehicleHit(v,dmg,dmgType,rnd,opts){
  rnd=rnd||r1;opts=opts||{};var d=opts.d6||rnd(6);var out={d6:d,where:HIT_TABLE[d-1],driverDmg:0,v:Object.assign({},v),notes:[]};
  if(d===1){
    if(v.moto){out.driverDmg=dmg;out.notes.push("мотоцикл: урон по водителю целиком")}
    else{var half=Math.floor(dmg/2);var h=hullHit(v,half,dmgType);out.v=h.v;out.driverDmg=dmg-half;out.notes.push("броня машины приняла половину")}
    out.notes.push("водитель: Вождение СЛ 12, или машину заносит");
  } else if(d===2){
    var w=(v.wheelsHit||0)+1;out.v.wheelsHit=w;
    if(w>=2){out.v.stopped=true;out.notes.push("второе колесо — машина встала")}else out.notes.push("колесо пробито: −2 к Вождению");
  } else {
    var hh=hullHit(v,dmg,dmgType);out.v=hh.v;out.hull=hh.hd;out.notes.push("Корпус −"+hh.hd+(hh.ad?" (броня −"+hh.ad+")":""));
    if(d===5){out.v.speedLoss=(v.speedLoss||0)+1;out.notes.push("мотор: −1 к Скорости до ремонта")}
    if(d===6){var f=opts.fire||rnd(6);out.fire=f;if(f===6){out.v.burning=true;out.notes.push("бак горит: всем внутри 1d6 каждый раунд")}else out.notes.push("бак цел ("+f+")")}
  }
  var z=zeroHull(v,out.v,!!opts.ram,rnd);if(z.flip){out.flip=z.flip;out.notes.push(z.text)}else if(z.text)out.notes.push(z.text);out.v=z.v;
  return out;
}
/* Корпус 0: машина встала. От тарана или на Скорости 4–5 — переворот, всем внутри 3d6 */
function zeroHull(before,after,fromRam,rnd){
  if((after.hull||0)>0||(before.hull||0)<=0)return{v:after};
  var v=Object.assign({},after,{stopped:true});
  if(fromRam||speedOf(before)>=4){var dmg=sumDice("3d6",rnd);return{v:v,flip:dmg,text:"Корпус 0 — переворот: всем внутри "+dmg}}
  return{v:v,text:"Корпус 0 — машина встала"};
}
/* Ремонт за час: ящик инструментов 1d6, проволока 1d4 Корпуса */
function repairHull(v,tool,rnd){var add=sumDice(tool==="wire"?"1d4":"1d6",rnd);var nv=Object.assign({},v,{hull:Math.min(v.maxHull||v.hull,(v.hull||0)+add)});if(nv.hull>0&&!(nv.wheelsHit>=2))nv.stopped=false;return{v:nv,add:add}}
/* Мотор и колесо — Механика СЛ 14 (Буханка +2) */
function repairPartBonus(v){return v.repairBonus||0}
function fixPart(v,part){var nv=Object.assign({},v);if(part==="motor")nv.speedLoss=0;if(part==="wheel"){nv.wheelsHit=0;if((nv.hull||0)>0)nv.stopped=false}return nv}
/* Стрельба на ходу: −2 (дорожники без штрафа), водитель −4 */
function movingPen(isDriver,isDorozhnik){if(isDriver)return -4;if(isDorozhnik)return 0;return -2}

export { sumDice, speedOf, wheelPen, driverRoll, chaseRound, CHASE_GOAL, ramResult, hullHit, HIT_TABLE, vehicleHit, zeroHull, repairHull, repairPartBonus, fixPart, movingPen };
