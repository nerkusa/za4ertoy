/* Последствия бросков для кассет и насадок, слепки, палёнки. Чистые
   функции: возвращают патч персонажа и строки для лога — применяет их
   вызывающий код. */
import { NOISE } from '../data/gear';
import { findBy } from '../data/traits';
import { r1 } from './dice';

/* Срыв на броске навыка skill.
   - навык усилен копией или слепком → шум (d10 по таблице), отдельной строкой в лог;
     у слепка — ещё и Отпечаток +1 сразу;
   - сработал бонус насадки → насадка ломается (у перебранного протеза —
     ещё и на базовой 2).
   inf — результат cF(c); R — результат rollHit(); d10 — необязательный
   заранее брошенный кубик шума (для тестов). */
function fumbleFx(c,inf,skill,R,d10){
  var out={patch:{},logs:[],notes:[]};
  if(!c||!inf||!skill||!R)return out;
  var srcs=((inf.src&&inf.src.skill&&inf.src.skill[skill])||[]).filter(function(s){return s.src&&s.amount>0});
  if(R.fumble){
    var noisy=srcs.filter(function(s){return s.src.from==="cassette"&&(s.src.kind==="copy"||s.src.kind==="slep")});
    if(noisy.length){
      var n=d10||r1(10);var cs=noisy[0].src;
      out.logs.push({type:"noise",label:"Шум кассеты «"+cs.name+"» ("+n+")",detail:NOISE[n-1],total:0});
      out.notes.push("Шум: "+NOISE[n-1]);
      var sleps=noisy.filter(function(s){return s.src.kind==="slep"}).map(function(s){return s.src.id});
      if(sleps.length){
        out.patch.cassettes=(c.cassettes||[]).map(function(x){return sleps.indexOf(x.id)>=0?Object.assign({},x,{imprint:Math.min(5,(x.imprint||0)+1)}):x});
        out.logs.push({type:"noise",label:"Слепок «"+cs.name+"»: срыв",detail:"Отпечаток растёт",total:0,gmOnly:true});
      }
    }
  }
  var tipSrc=srcs.find(function(s){return s.src.from==="tip"});
  var arm=c.solutions&&c.solutions.arm;
  if(tipSrc&&arm&&!arm.broken&&(R.fumble||(arm.grade==="rebuilt"&&R.base===2))){
    out.patch.solutions=Object.assign({},c.solutions,{arm:Object.assign({},arm,{broken:true})});
    out.logs.push({type:"noise",label:"Насадка «"+tipSrc.src.name+"» сломалась",detail:R.fumble?"срыв на броске":"перебранный протез: выпало 2",total:0});
    out.notes.push("Насадка «"+tipSrc.src.name+"» сломалась");
  }
  return out;
}

/* Стойкость слепка: Воля + Выдержка + d10 против СЛ 12 + 2 × Отпечаток,
   −2 к броску за каждый другой слепок в гнёздах. */
function slepDC(imprint){return 12+2*(imprint||0)}
function slepOthers(c,cassId){return ((c&&c.cassettes)||[]).filter(function(x){return x.inNest&&x.kind==="slep"&&x.id!==cassId}).length}
function slepCheck(c,inf,cassId,roll){
  var x=((c&&c.cassettes)||[]).find(function(k){return k.id===cassId});
  var imprint=(x&&x.imprint)||0;var dc=slepDC(imprint);var others=slepOthers(c,cassId);
  var total=(inf.fs.volya||0)+(inf.eSk["Выдержка"]||0)+roll-2*others;
  var ok=total>=dc;
  return{ok:ok,total:total,dc:dc,others:others,imprint:ok?imprint:Math.min(5,imprint+1)};
}

/* Палёнка при вставке, скрытый d10: 1–4 молчит, 5–8 работает как копия,
   9–10 сразу шум и кассета застряла. */
function fakeOutcome(d){if(d<=4)return"silent";if(d<=8)return"copy";return"stuck"}

/* Оружие от железа («Ствол», скобы) держим в c.weapons с пометкой gearKey:
   добавляем, когда насадка/накладное на месте, убираем, когда сняты. */
function syncGearWeapons(c,cat,gearWeaponsFn){
  var want=gearWeaponsFn(c,cat);var have=(c.weapons||[]);
  var keep=have.filter(function(w){return !w.gearKey||want.some(function(g){return g.id===w.gearKey})});
  want.forEach(function(g){if(!keep.some(function(w){return w.gearKey===g.id})){var nw=Object.assign({},g,{id:g.id+"_"+Date.now().toString(36),gearKey:g.id});delete nw.gear;if(nw.dmgType==="П"){nw.clip=nw.clip||1;nw.ammo=nw.clip}keep=keep.concat([nw])}});
  var patch={weapons:keep};
  if(c.equippedWeapon&&!keep.some(function(w){return w.id===c.equippedWeapon}))patch.equippedWeapon=null;
  if(c.equippedWeaponOff&&!keep.some(function(w){return w.id===c.equippedWeaponOff}))patch.equippedWeaponOff=null;
  return patch;
}
/* Идёт ли бой для персонажа: он в списке инициативы */
function inCombat(initiative,charId){return !!(initiative&&Array.isArray(initiative.list)&&initiative.list.some(function(x){return x.id===charId}))}

export { fumbleFx, slepDC, slepOthers, slepCheck, fakeOutcome, syncGearWeapons, inCombat, findBy };
