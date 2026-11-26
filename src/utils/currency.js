/* Одна валюта: полисный еврорубль, «ер.». Цена — число (или null/"" —
   бесплатно). Вещи с notForSale купить нельзя, их выдаёт только ГМ. */
import { molvaPrice } from '../data/molva';
function priceNum(p){
  if(typeof p==="number")return Math.max(0,Math.floor(p));
  if(p&&typeof p==="object")return 0; /* старый формат базы — не используется */
  var n=parseInt(p);return isNaN(n)?0:Math.max(0,n);
}
function fmtMoney(n){return priceNum(n)+" ер."}
/* Списывает цену. Возвращает патч {money}, {} если бесплатно, null (с alert)
   если денег не хватает. */
function tryPay(char,price,opts){
  var cost=priceNum(price);
  if(cost<=0)return {};
  /* Молва у торговцев (гл. 8): −1 — цены +20%, +2 — скидка 10%, +5 — 20%, −2 и ниже — не продают */
  if(!(opts&&opts.noMolva)){var m=(char&&char.molva)||0;var mp=molvaPrice(cost,m);
    if(mp===null){alert("Молва "+m+": тебе не продают. Ищи того, кто не слышал, или отмывайся");return null}
    cost=mp}
  var have=(char&&char.money)||0;
  if(have<cost){alert("Не хватает денег: нужно "+fmtMoney(cost)+", у тебя "+fmtMoney(have));return null}
  return {money:have-cost};
}

export { priceNum, fmtMoney, tryPay };
