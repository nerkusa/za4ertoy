/* Выдача из каталога: превращает товар каталога в патч персонажа.
   Используется ГМ-панелью («Выдача»). opts.kind — вид кассеты. */
import { uid } from './dice';
import { SHIELD_T } from '../data/combat';
import { patchFromShopItem } from './gearOps';
import { kindName } from '../data/gear';

function grantPatch(c,cat,it,opts){
  opts=opts||{};
  if(it.cat==="weapon"){
    var w={id:uid(),name:it.name,type:it.wtype,dmgType:it.dmgType,bonus:it.bonus||0,dmgDice:it.dmgDice,hands:it.hands||1,desc:it.desc||""};
    if(it.hands===1.5){w.dmgDice2h=it.dmgDice2h;w.bonus2h=it.bonus2h||0}
    if(it.wtype==="Guns"||it.dmgType==="П"){w.clip=it.clip||1;w.ammo=it.clip||1;if(it.ammoType)w.ammoType=it.ammoType}
    if(it.wtype==="Archery"&&it.ammoType)w.ammoType=it.ammoType;
    ["aimBonus","charges","consumable"].forEach(function(f){if(it[f]!=null)w[f]=it[f]});
    return{weapons:(c.weapons||[]).concat([w])};
  }
  if(it.cat==="armor")return{armors:(c.armors||[]).concat([{id:uid(),name:it.name,type:it.type,slot:it.slot||"body",hp:it.hp,maxHp:it.hp,desc:it.desc||""}])};
  if(it.cat==="shield"){var t=SHIELD_T.find(function(x){return x.id===it.type})||SHIELD_T[0];return{shields:(c.shields||[]).concat([{id:uid(),name:it.name,type:it.type,absorb:t.absorb,hp:it.hp,maxHp:it.hp,desc:it.desc||""}])}}
  if(it.cat==="cassette")return patchFromShopItem(c,cat,Object.assign({},it,{kind:opts.kind||it.kind||"copy"}));
  if(it.cat==="solution")return patchFromShopItem(c,cat,it,null);
  /* вещи, патроны, ремкомплекты, расходники */
  var inv=(c.inventory||[]).slice();var ptype=it.ptype||(it.cat==="ammo"?"Пуля":"");
  if(ptype){var bundle=it.bundleQty||1;var ex=inv.find(function(i){return i.proj&&i.ptype===ptype});
    if(ex)inv=inv.map(function(i){return i===ex?Object.assign({},i,{qty:(i.qty||0)+bundle}):i});
    else inv=inv.concat([{id:uid(),name:it.name,qty:bundle,equipped:false,proj:true,ptype:ptype}])}
  else if(it.dice||it.cat==="tool")inv=inv.concat([{id:uid(),name:it.name,qty:1,equipped:false,tool:true,dice:it.dice||"1d4"}]);
  else if(it.heal||it.doseHeal){var exH=inv.find(function(i){return i.name===it.name&&(i.heal||"")===(it.heal||"")&&(i.doseHeal||0)===(it.doseHeal||0)});
    if(exH)inv=inv.map(function(i){return i===exH?Object.assign({},i,{qty:(i.qty||0)+1}):i});
    else inv=inv.concat([{id:uid(),name:it.name,qty:1,equipped:false,heal:it.heal||"",healWill:!!it.healWill,doseHeal:it.doseHeal||0}])}
  else inv=inv.concat([Object.assign({id:uid(),name:it.name,qty:1,equipped:false},it.charges!=null?{charges:it.charges}:{},it.desc?{desc:it.desc}:{},it.trinket?{trinket:true}:{})]);
  return{inventory:inv};
}
/* Как выдача выглядит в общем логе: палёнка — как оригинал */
function grantLabel(it,opts,forGm){
  if(it.cat!=="cassette")return it.name;
  var k=(opts&&opts.kind)||it.kind||"copy";
  return it.name.replace(/, копия$/,"")+" ("+kindName(!forGm&&k==="fake"?"orig":k)+")";
}

export { grantPatch, grantLabel };
