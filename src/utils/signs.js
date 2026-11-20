/* Знаки (ТЗ v4, п.14.2): до трёх на листе, переброс только сразу после
   подходящего броска, после использования Знак сгорает. */
import { TAROT, MAX_SIGNS, cardById } from '../data/tarot';

/* Можно ли выдать ещё один Знак */
function canGiveSign(c,cardId){
  var card=cardById(cardId);if(!card)return{ok:false,reason:"нет такой карты"};
  if(card.kind!=="sign")return{ok:false,reason:"карта исхода — Знаком не выдаётся"};
  if(((c&&c.signs)||[]).length>=MAX_SIGNS)return{ok:false,reason:"у героя уже три Знака"};
  return{ok:true};
}
function giveSign(c,cardId,now){var ok=canGiveSign(c,cardId);if(!ok.ok)return{error:ok.reason};return{signs:((c.signs)||[]).concat([{cardId:cardId,givenAt:now||Date.now()}])}}
/* Последний бросок ещё «свежий»: в бою — тот же раунд, вне боя — 5 минут */
var FRESH_MS=5*60*1000;
function freshRoll(c,ini,now){
  var r=c&&c.lastRoll;if(!r||r.used)return null;
  if(ini&&Array.isArray(ini.list)&&ini.list.length){if(r.round!==(ini.round||1))return null}
  else if((now||Date.now())-(r.ts||0)>FRESH_MS)return null;
  return r;
}
/* Подходит ли Знак к последнему броску */
function signFits(card,roll){
  if(!card||!card.skills.length)return true;
  if(!roll)return false;
  if(card.skills[0]==="*")return true;
  return card.skills.indexOf(roll.skill)>=0;
}
/* Запомнить бросок для Знаков: d — кубик, total — итог */
function lastRollPatch(skill,stat,d,total,ini,label){return{lastRoll:{skill:skill||null,stat:stat||null,d:d,total:total,ts:Date.now(),round:ini&&Array.isArray(ini.list)&&ini.list.length?(ini.round||1):null,label:label||skill||""}}}
/* Переброс: новый d10 вместо старого, остальные слагаемые те же */
function rerollTotal(roll,newD){return (roll.total||0)-(roll.d||0)+newD}
function burnSign(c,idx){return{signs:((c.signs)||[]).filter(function(_,i){return i!==idx})}}

export { canGiveSign, giveSign, freshRoll, signFits, lastRollPatch, rerollTotal, burnSign, TAROT, MAX_SIGNS };
