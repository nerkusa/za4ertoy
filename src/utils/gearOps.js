/* Выдача и покупка кассет, браслета и солюшнов. Возвращают патч персонажа
   (или {error}) — применяет вызывающий код. Протезы — c.prostheses:
   armL, armR, legL, legR (у каждого своя насадка) и запас насадок
   armTips / legTips. Кисть и стопа идут в комплекте с каждой конечностью. */
import { uid } from './dice';
import { findBy, gearWeapons, gearShields, isArm } from '../data/traits';
import { syncGearWeapons, syncGearShields } from './gearFx';
import { prosthesesOf } from './crits';

function withWeapons(c,cat,patch){
  var next=Object.assign({},c,patch);
  var w=syncGearWeapons(next,cat,gearWeapons);next=Object.assign(next,w);
  return Object.assign({},patch,w,syncGearShields(next,cat,gearShields));
}
function addCassette(c,cat,key,kind){
  var def=findBy(cat.cassettes,key);if(!def)return{error:"Нет такой кассеты в каталоге"};
  var x={id:uid(),key:key,kind:kind||"copy",inNest:false,imprint:0,title:def.name,cls:def.cls,capacity:kind==="slep"?128:def.cap,condition:"good",year:""};
  if(kind==="fake")x.fakeAs="orig";
  return{cassettes:(c.cassettes||[]).concat([x])};
}
function sol(c){return Object.assign({arm:null,leg:null,implants:[],addons:[]},c.solutions||{})}
function pros(c){var p=prosthesesOf(c);p.armTips=((c.prostheses&&c.prostheses.armTips)||[]).slice();p.legTips=((c.prostheses&&c.prostheses.legTips)||[]).slice();return p}
/* Патч протезов: старая схема solutions.arm/leg очищается */
function prosPatch(c,cat,p){var patch={prostheses:p};if(c.solutions&&(c.solutions.arm||c.solutions.leg))patch.solutions=Object.assign({},c.solutions,{arm:null,leg:null});return withWeapons(c,cat,patch)}
function freeSlot(p,kind,want){var keys=kind==="arm"?["armR","armL"]:["legR","legL"];if(want&&keys.indexOf(want)>=0)return p[want]?null:want;return keys.find(function(k){return !p[k]})||null}
/* Сколько таких насадок можно поставить ещё: свои (из запаса) + комплектная */
function tipFree(p,limbKey,tipKey){
  var arm=isArm(limbKey);var keys=arm?["armL","armR"]:["legL","legR"];
  var owned=(arm?p.armTips:p.legTips).filter(function(k){return k===tipKey}).length;
  var base=arm?"kist":"stopa";
  var mounted=keys.filter(function(k){return k!==limbKey&&p[k]&&p[k].tip===tipKey}).length;
  if(tipKey===base)return 1;
  return owned-mounted;
}
/* what: {t:"bracelet",model} | {t:"arm",grade,limb?} | {t:"hvatka",limb?} | {t:"leg",grade,limb?} | {t:"tip",key} | {t:"legtip",key} | {t:"implant",key} */
function giveSolution(c,cat,what){
  var s=sol(c);var p=pros(c);
  if(what.t==="bracelet")return{bracelet:{model:what.model}};
  if(what.t==="arm"||what.t==="hvatka"){
    var k=freeSlot(p,"arm",what.limb);if(!k)return{error:"Обе руки уже железные"};
    p[k]=what.t==="hvatka"?{grade:"hvatka",tip:null,broken:false}:{grade:what.grade||"new",tip:"kist",broken:false};
    return prosPatch(c,cat,p);
  }
  if(what.t==="leg"){var k2=freeSlot(p,"leg",what.limb);if(!k2)return{error:"Обе ноги уже железные"};p[k2]={grade:what.grade||"new",tip:"stopa",broken:false};return prosPatch(c,cat,p)}
  if(what.t==="tip"){if(!findBy(cat.tips,what.key))return{error:"Нет в каталоге"};p.armTips=p.armTips.concat([what.key]);return prosPatch(c,cat,p)}
  if(what.t==="legtip"){if(!findBy(cat.legTips||[],what.key))return{error:"Нет в каталоге"};p.legTips=p.legTips.concat([what.key]);return prosPatch(c,cat,p)}
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
  var s=sol(c);var p=pros(c);
  if(what.limb){p[what.limb]=null;return prosPatch(c,cat,p)}
  if(what.t==="implant"){s.implants=(s.implants||[]).filter(function(k){return k!==what.key});s.addons=(s.addons||[]).filter(function(k){return k!==what.key});return withWeapons(c,cat,{solutions:s})}
  return{};
}
/* Сменить насадку на конечности (только вне боя — проверяет интерфейс) */
function setTip(c,cat,limbKey,tipKey){
  var p=pros(c);var l=p[limbKey];if(!l||l.grade==="hvatka")return{error:"Нет протеза с замком"};
  if(tipKey&&tipFree(p,limbKey,tipKey)<=0)return{error:"Такой насадки нет в запасе"};
  p[limbKey]=Object.assign({},l,{tip:tipKey});return prosPatch(c,cat,p);
}
function setLimb(c,cat,limbKey,fields){var p=pros(c);if(!p[limbKey])return{};p[limbKey]=Object.assign({},p[limbKey],fields);return prosPatch(c,cat,p)}
/* Для старого кода: сломать/починить первую руку */
function setTipBroken(c,cat,broken){var p=pros(c);var k=["armR","armL"].find(function(x){return p[x]});return k?setLimb(c,cat,k,{broken:!!broken}):{}}
/* Патч из товара каталога (cat: cassette | solution). */
function patchFromShopItem(c,cat,it,limit){
  if(it.cat==="cassette")return addCassette(c,cat,it.gearKey,it.kind||"copy");
  if(it.cat==="solution"){
    if(it.sol==="bracelet")return giveSolution(c,cat,{t:"bracelet",model:it.gearKey});
    if(it.sol==="arm")return giveSolution(c,cat,{t:"arm",grade:it.gearKey||"new"});
    if(it.sol==="hvatka")return giveSolution(c,cat,{t:"hvatka"});
    if(it.sol==="leg")return giveSolution(c,cat,{t:"leg",grade:it.gearKey||"new"});
    if(it.sol==="tip")return giveSolution(c,cat,{t:"tip",key:it.gearKey});
    if(it.sol==="legtip")return giveSolution(c,cat,{t:"legtip",key:it.gearKey});
    return giveSolution(c,cat,{t:"implant",key:it.gearKey,limit:limit});
  }
  return{error:"Не кассета и не солюшн"};
}

export { addCassette, giveSolution, removeSolution, setTip, setLimb, setTipBroken, tipFree, patchFromShopItem, withWeapons };
