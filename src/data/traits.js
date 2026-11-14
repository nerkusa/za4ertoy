/* Черты — не покупаются очками, выдаются ГМ по ходу игры (обучение, ранения,
   сюжетные события, рождение — см. категорию «Врождённая»). Устроены в духе
   Crusader Kings III: большинство личностных черт ходят парами-противоположностями
   (Храбрый/Трусливый, Честный/Лживый...), и у персонажа обычно есть только ОДНА
   черта из пары — не «плюс» и не «минус» сами по себе, а разный взгляд на мир,
   что механически чуть тянет в свою сторону. Многие личностные черты нарочно
   слабы или вовсе без effects[] — их сила в отыгрыше и в том, как на них
   реагируют NPC, а не в цифрах на листе.

   Каждая черта может нести effects[] — реальную механику:
   stat_bonus (+к характеристике), skill_bonus (+к навыку), hp_flat (+ХП),
   dual_wield (открывает бой двумя одноручными оружиями во вкладке «Бой»),
   armor_effectiveness (броня защищает слабее — доля от нормы, напр. 0.667),
   cancels (отменяет эффекты другой черты — черта-«протез» компенсирует увечье).
   Черта без effects — чисто описательная, эффект отыгрывается вручную. */

function genId(){return "tr_"+Date.now().toString(36)+Math.floor(Math.random()*1000).toString(36)}

var TRAIT_CATEGORIES=[
  {id:"congenital",name:"Врождённая",color:"#38bdf8"},
  {id:"positive",name:"Позитивная",color:"#10b981"},
  {id:"negative",name:"Негативная / увечье",color:"#ef4444"},
  {id:"mixed",name:"Смешанная / характер",color:"#f59e0b"},
];

var TRAIT_EFFECT_TYPES=[
  {id:"none",name:"Без механики (только описание)"},
  {id:"stat_bonus",name:"+ к характеристике"},
  {id:"skill_bonus",name:"+ к навыку"},
  {id:"hp_flat",name:"+ к макс. ХП"},
  {id:"dual_wield",name:"⚔️⚔️ Бой двумя одноручными оружиями"},
  {id:"armor_effectiveness",name:"🛡 Броня защищает слабее (доля, напр. 0.667 = 2/3)"},
  {id:"cancels",name:"🦾 Протез — гасит эффекты другой черты"},
  {id:"revive_at_one",name:"❤️ HP не падает ниже 1 (раз за сцену/день)"},
];

var TRAITS=[];

/* Плоский список эффектов всех назначенных персонажу черт, с учётом
   отмены: если хоть одна назначенная черта содержит {type:"cancels",
   target:X}, эффекты черты X в список не попадают (сама черта X при этом
   остаётся в листе персонажа как есть — отменяется только механика). */
function activeTraitEffects(c,traits){
  var ids=(c&&c.traits)||[];
  var mine=traits.filter(function(t){return ids.indexOf(t.id)>=0});
  var cancelled={};
  mine.forEach(function(t){(t.effects||[]).forEach(function(e){if(e.type==="cancels"&&e.target)cancelled[e.target]=true})});
  var out=[];
  mine.forEach(function(t){if(cancelled[t.id])return;(t.effects||[]).forEach(function(e){out.push(e)})});
  return out;
}
function hasTraitEffect(c,traits,type){
  return activeTraitEffects(c,traits).some(function(e){return e.type===type});
}
/* Множитель эффективности брони (1 = норма, 0.667 = 2/3 и т.д.) — берём
   минимум, если вдруг назначено несколько таких черт. */
function armorEffectivenessOf(c,traits){
  var effs=activeTraitEffects(c,traits).filter(function(e){return e.type==="armor_effectiveness"&&e.value!=null});
  if(!effs.length)return 1;
  return effs.reduce(function(v,e){return Math.min(v,e.value)},1);
}

export { TRAITS, TRAIT_CATEGORIES, TRAIT_EFFECT_TYPES, genId, hasTraitEffect, activeTraitEffects, armorEffectivenessOf };
