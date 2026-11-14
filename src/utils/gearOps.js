/* Выдача и покупка кассет, браслета и солюшнов. Возвращают патч персонажа
   (или {error}) — применяет вызывающий код. */
import { uid } from './dice';
import { findBy, gearWeapons } from '../data/traits';
import { syncGearWeapons } from './gearFx';

function withWeapons(c,cat,patch){
  var next=Object.assign({},c,patch);
  return Object.assign({},patch,syncGearWeapons(next,cat,gearWeapons));
}
function addCassette(c,cat,key,kind){
  var def=findBy(cat.cassettes,key);if(!def)return{error:"Нет такой кассеты в каталоге"};
  var x={id:uid(),key:key,kind:kind||"copy",inNest:false,imprint:0};
  return{cassettes:(c.cassettes||[]).concat([x])};
}
function sol(c){return Object.assign({arm:null,leg:null,implants:[],addons:[]},c.solutions||{})}
/* what: {t:"bracelet",model} | {t:"arm",grade} | {t:"hvatka"} | {t:"leg"} | {t:"tip",key} | {t:"implant",key} */
function giveSolution(c,cat,what){
  var s=sol(c);
  if(what.t==="bracelet")return{bracelet:{model:what.model}};
  if(what.t==="arm"){s.arm={grade:what.grade||"new",tip:"kist",tips:["kist"],broken:false};return withWeapons(c,cat,{solutions:s})}
  if(what.t==="hvatka"){s.arm={grade:"hvatka",tip:null,tips:[],broken:false};return withWeapons(c,cat,{solutions:s})}
  if(what.t==="leg"){s.leg={grade:what.grade||"new"};return{solutions:s}}
  if(what.t==="tip"){
    if(!s.arm||s.arm.grade==="hvatka")return{error:"Насадке нужен протез руки с замком"};
    var tips=(s.arm.tips||["kist"]);if(tips.indexOf(what.key)>=0)return{error:"Такая насадка уже есть"};
    s.arm=Object.assign({},s.arm,{tips:tips.concat([what.key])});return{solutions:s};
  }
  if(what.t==="implant"){
    var d=findBy(cat.implants,what.key);if(!d)return{error:"Нет в каталоге"};
    var listKey=d.kind==="addon"?"addons":"implants";
    if((s[listKey]||[]).indexOf(what.key)>=0)return{error:"Уже установлено"};
    if(d.kind==="addon"&&what.limit!=null&&(s.addons||[]).length>=what.limit)return{error:"Накладного не больше Тело/2 ("+what.limit+")"};
    s[listKey]=(s[listKey]||[]).concat([what.key]);
    return withWeapons(c,cat,{solutions:s});
  }
  return{error:"Неизвестный солюшн"};
}
function removeSolution(c,cat,what){
  var s=sol(c);
  if(what.t==="arm")s.arm=null;
  if(what.t==="leg")s.leg=null;
  if(what.t==="implant"){s.implants=(s.implants||[]).filter(function(k){return k!==what.key});s.addons=(s.addons||[]).filter(function(k){return k!==what.key})}
  if(what.t==="tip"&&s.arm){var tips=(s.arm.tips||[]).filter(function(k){return k!==what.key});s.arm=Object.assign({},s.arm,{tips:tips,tip:s.arm.tip===what.key?(tips[0]||null):s.arm.tip})}
  return withWeapons(c,cat,{solutions:s});
}
/* Сменить насадку на протезе (поломка относится к снятой насадке и остаётся с ней) */
function setTip(c,cat,key){
  var s=sol(c);if(!s.arm)return{error:"Нет протеза"};
  var bt=Object.assign({},s.arm.brokenTips||{});
  if(s.arm.tip)bt[s.arm.tip]=!!s.arm.broken;
  s.arm=Object.assign({},s.arm,{tip:key,broken:!!bt[key],brokenTips:bt});
  return withWeapons(c,cat,{solutions:s});
}
function setTipBroken(c,cat,broken){
  var s=sol(c);if(!s.arm)return{};
  s.arm=Object.assign({},s.arm,{broken:!!broken});
  return withWeapons(c,cat,{solutions:s});
}
/* Патч из товара каталога (cat: cassette | solution). */
function patchFromShopItem(c,cat,it,limit){
  if(it.cat==="cassette")return addCassette(c,cat,it.gearKey,it.kind||"copy");
  if(it.cat==="solution"){
    if(it.sol==="bracelet")return giveSolution(c,cat,{t:"bracelet",model:it.gearKey});
    if(it.sol==="arm")return giveSolution(c,cat,{t:"arm",grade:it.gearKey||"new"});
    if(it.sol==="hvatka")return giveSolution(c,cat,{t:"hvatka"});
    if(it.sol==="leg")return giveSolution(c,cat,{t:"leg"});
    if(it.sol==="tip")return giveSolution(c,cat,{t:"tip",key:it.gearKey});
    return giveSolution(c,cat,{t:"implant",key:it.gearKey,limit:limit});
  }
  return{error:"Не кассета и не солюшн"};
}

export { addCassette, giveSolution, removeSolution, setTip, setTipBroken, patchFromShopItem, withWeapons };
