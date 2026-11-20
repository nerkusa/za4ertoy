/* Машины в бою (глава 7). Чистые функции; rnd(n) — бросок dn для тестов.
   Корпус — Здоровье машины, броня — как у людей (класс и прочность). */
import { calcAE } from './combat';
import { r1, rollHit } from './dice';
import { modByKey } from '../data/vehicleMods';

function sumDice(expr,rnd){rnd=rnd||r1;var m=String(expr||"").match(/(\d+)d(\d+)(?:\+(\d+))?/);if(!m)return 0;var t=0;for(var i=0;i<parseInt(m[1]);i++)t+=rnd(parseInt(m[2]));return t+(parseInt(m[3])||0)}
/* Текущая скорость и штраф к Вождению машины */
function speedOf(v){return Math.max(0,(v.speed||0)-(v.speedLoss||0))}
function wheelPen(v){return (v.wheelsHit||0)>=1?-2:0}
/* Бросок водителя: Реакция + Вождение + Управляемость + d10.
   swamp — топь (−2, у Буханки штрафа нет). R — готовый rollHit (для тестов). */
function driverRoll(drv,v,opts,R){
  opts=opts||{};R=R||rollHit();
  var sw=opts.swamp?swampPen(v):0;
  var parts=[{label:"Реакция",value:drv.reak||0},{label:"Вождение",value:drv.driving||0},{label:"Управляемость",value:v.handling||0}];
  if(wheelPen(v))parts.push({label:"Колесо",value:wheelPen(v)});
  if(sw)parts.push({label:"Топь",value:sw});
  if(drv.pen)parts.push({label:"Штраф",value:drv.pen});
  var total=R.d+parts.reduce(function(a,p){return a+p.value},0);
  return{total:total,d:R.d,crit:R.crit,fumble:R.fumble,parts:parts};
}
/* Штраф топи к Вождению: по умолчанию −2, у машины может быть свой */
function swampPen(v){if(v.swampFree)return 0;var t=v.terrain;if(t&&t.swamp!=null)return t.swamp;return -2}
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
function ramResult(att,def,ramDice,rnd,selfFrac){
  if(!(att>def))return{hit:false,dmg:0,self:0};
  var dmg=sumDice(ramDice,rnd);return{hit:true,dmg:dmg,self:Math.floor(dmg*(selfFrac||0.5))};
}
/* Доля урона таранящей машине: с «Отвалом» — четверть */
function ramSelfFrac(v){return hasMod(v,"otval")?0.25:0.5}
/* Кости тарана: по пешеходу с «Шипами» +1d6 */
function ramDiceOf(v,walker){return walker&&hasMod(v,"shipy")?addDice(v.ram,1):v.ram}
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
    var w=(v.wheelsHit||0)+1;
    if(v.tracks){out.v.wheelsHit=2;out.v.stopped=true;out.notes.push("слетела гусеница: машина стоит до ремонта (Механика СЛ 14, час)")}
    else if(w>=2&&hasMod(v,"shipy")&&(opts.spike||rnd(6))!==2){out.v.wheelsHit=1;out.notes.push("шипы: колесо держится")}
    else{out.v.wheelsHit=w;if(w>=2){out.v.stopped=true;out.notes.push("второе колесо — машина встала")}else out.notes.push("колесо пробито: −2 к Вождению")}
  } else {
    var hh=hullHit(v,dmg,dmgType);out.v=hh.v;out.hull=hh.hd;out.notes.push("Корпус −"+hh.hd+(hh.ad?" (броня −"+hh.ad+")":""));
    if(d===5){out.v.speedLoss=(v.speedLoss||0)+1;out.notes.push("мотор: −1 к Скорости до ремонта")}
    if(d===6){var f=opts.fire||rnd(6);out.fire=f;
      if(v.tanker&&f>=4){out.v.burning=true;out.boom=sumDice("6d6",rnd);out.notes.push("цистерна рванула: "+out.boom+" всем в 10 м")}
      else if(f===6){out.v.burning=true;out.notes.push("бак горит: всем внутри 1d6 каждый раунд")}else out.notes.push("бак цел ("+f+")")}
  }
  out.v.damage={wheels:out.v.wheelsHit||0,engine:(out.v.speedLoss||0)>0,burning:!!out.v.burning};
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

/* ── Обвес (п.17.2): эффекты пишутся в поля машины при установке и
   откатываются при снятии ── */
function hasMod(v,k){return ((v&&v.mods)||[]).indexOf(k)>=0}
function modSlots(v){return v&&v.small?1:3}
function addDice(expr,n){var m=String(expr||"").match(/^(\d+)d(\d+)(.*)$/);if(!m)return expr;return Math.max(1,parseInt(m[1])+n)+"d"+m[2]+m[3]}
function addSeats(seats,n){var s=String(seats==null?"":seats);var m=s.match(/^(\d+)(.*)$/);if(!m)return s;return Math.max(1,parseInt(m[1])+n)+m[2]}
var ARMOR_UP={none:"light",light:"medium",medium:"medium",heavy:"heavy"};
function applyFx(v,fx,sign){
  var o=Object.assign({},v);
  if(fx.armor){
    if(sign>0){o._armorWas=o.armorType||"none";o.armorType=fx.armorUp?ARMOR_UP[o.armorType||"none"]:(o.armorType&&o.armorType!=="none"?o.armorType:"light")}
    else{o.armorType=o._armorWas||o.armorType;delete o._armorWas}
    o.armorHp=Math.max(0,(o.armorHp||0)+sign*fx.armor);o.maxArmorHp=Math.max(0,(o.maxArmorHp||0)+sign*fx.armor);
    if(o.armorType==="none"){o.armorHp=0;o.maxArmorHp=0}
  }
  if(fx.handling)o.handling=(o.handling||0)+sign*fx.handling;
  if(fx.speed)o.speed=Math.max(0,(o.speed||0)+sign*fx.speed);
  if(fx.tank){o.tank=Math.max(0,(o.tank||0)+sign*fx.tank);o.fuel=Math.min(o.fuel||0,o.tank)}
  if(fx.ram)o.ram=addDice(o.ram,sign*fx.ram);
  if(fx.seats)o.seats=addSeats(o.seats,sign*fx.seats);
  return o;
}
function installMod(v,key){
  var m=modByKey(key);if(!m)return{error:"Нет такого обвеса"};
  if(hasMod(v,key))return{error:"Уже стоит"};
  if((v.mods||[]).length>=modSlots(v))return{error:"Нет свободного слота обвеса ("+modSlots(v)+")"};
  var o=applyFx(v,m.fx||{},1);o.mods=(v.mods||[]).concat([key]);return{v:o};
}
function removeMod(v,key){
  var m=modByKey(key);if(!m||!hasMod(v,key))return{v:v};
  var o=applyFx(v,m.fx||{},-1);o.mods=(v.mods||[]).filter(function(k){return k!==key});
  if(m.fx&&m.fx.mountOk&&!v.mountOk&&!(v.weapon))o.mount=null;
  return{v:o};
}
function canMount(v){return !!(v&&(v.mountOk||v.weapon||hasMod(v,"stanok")))}
/* ── Горючка: бак в перегонах ── */
function refuelAmount(v){return v.fuel2?2:1}
function refuel(v){
  if(v.noFuel)return{error:"Эту машину кормят травой"};
  if((v.fuel||0)>=(v.tank||0))return{error:"Бак полный"};
  var add=Math.min(refuelAmount(v),(v.tank||0)-(v.fuel||0));var o=Object.assign({},v,{fuel:(v.fuel||0)+add});
  if(o.outOfFuel){delete o.outOfFuel;if((o.hull||0)>0&&!((o.wheelsHit||0)>=2))o.stopped=false}
  return{v:o,add:add};
}
/* Перегон пройден: −1 перегон; бак 0 — машина стоит */
function legDone(v){
  if(v.noFuel)return{v:v,empty:false};
  var f=Math.max(0,(v.fuel||0)-1);var o=Object.assign({},v,{fuel:f});
  if(f===0){o.stopped=true;o.outOfFuel=true}
  return{v:o,empty:f===0};
}

export { swampPen, ramSelfFrac, ramDiceOf, hasMod, modSlots, addDice, addSeats, installMod, removeMod, canMount, refuel, refuelAmount, legDone, sumDice, speedOf, wheelPen, driverRoll, chaseRound, CHASE_GOAL, ramResult, hullHit, HIT_TABLE, vehicleHit, zeroHull, repairHull, repairPartBonus, fixPart, movingPen };
