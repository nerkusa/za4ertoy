/* Стартовый бестиарий «За Чертой · 2035» (приложение В).
   Характеристики: Тело / Реакция / Восприятие / Разум / Характер / Воля.
   Боевые навыки — в skills (dodge, melee, guns, thrown, athletics),
   остальные — в extraSkills по названию. xpReward по умолчанию равен HP. */
var A={
  kurtka:{type:'light',hp:10,name:'Кожаная куртка дорожника'},
  razgruzka:{type:'light',hp:12,name:'Разгрузка с пластинами'},
  bushlat:{type:'medium',hp:18,name:'Бушлат йегеря'},
  stal:{type:'heavy',hp:30,name:'Сварная сталь'},
  kaska:{type:'light',hp:8,name:'Каска с поста'},
  shlem:{type:'medium',hp:12,name:'Шлем йегеря с окулярами'},
  roga:{type:'medium',hp:12,name:'Рогатый шлем Орды'},
  shkuraL:{type:'light',hp:12,name:'Шкура'},
  shkuraM:{type:'medium',hp:20,name:'Толстая шкура'}
};
function w(name,dice,type,dmgType,bonus){return{id:'w_'+name,name:name,dice:dice,type:type,dmgType:dmgType,bonus:bonus||0}}
var W={
  nozh:w('Нож','1d6','Simple','К'),shtyk:w('Штык','1d6','Battle','К',1),kryuk:w('Крюк Орды','1d6','Battle','К',2),kryuk2:w('Двуручный крюк','4d6','Battle','К'),
  trubach:w('«Трубач»','2d6','Guns','П'),kum:w('«Кум»','3d6','Guns','П'),karmannik:w('«Карманник»','2d6','Guns','П'),soroka:w('«Сорока»','3d6','Guns','П'),
  reglament:w('«Регламент»','3d6','Guns','П'),ustav:w('«Устав»','3d6','Guns','П',2),delegat:w('«Делегат»','4d6','Guns','П'),hardskil:w('Кольт «Хардскил»','4d6','Guns','П'),
  klyki:w('Клыки','1d6','Brawl','К',1),kogti:w('Когти','2d6','Brawl','Р',2),lapy:w('Лапы','3d6','Brawl','Д')
};
function slot(a){return a?{type:a.type,hp:a.hp,name:a.name}:{type:'none',hp:0,name:''}}
function npc(name,st,hp,o){
  o=o||{};var h=slot(o.head),b=slot(o.body);var s=st.split('/').map(Number);
  return{name:name,level:o.level||1,hp:hp,maxHp:hp,xpReward:hp,
    stats:{telo:s[0],reak:s[1],vosp:s[2],razum:s[3],har:s[4],volya:s[5]},
    skills:o.skills||{},extraSkills:o.extra||{},weapons:o.weapons||[],note:o.note||'',
    armorHead:h.type,armorHeadHp:h.hp,armorHeadMaxHp:h.hp,armorHeadName:h.name,
    armorBody:b.type,armorBodyHp:b.hp,armorBodyMaxHp:b.hp,armorBodyName:b.name,
    shieldType:'none',shieldHp:0,shieldMaxHp:0,shieldName:''};
}
function buildNpcDefaults(){
  var cats={};
  function add(cat,list){var obj={_created:Date.now()};list.forEach(function(n,i){obj['npc_seed_'+Object.keys(cats).length+'_'+i]=n});cats[cat]=obj}
  add('Люди тракта',[
    npc('Мародёр','5/6/5/3/4/4',24,{weapons:[W.trubach,W.nozh],skills:{guns:3,melee:3}}),
    npc('Наёмник откола','6/6/4/3/3/5',30,{body:A.razgruzka,head:A.kaska,weapons:[W.soroka,W.shtyk],skills:{guns:5,dodge:4,melee:3},extra:{'Запугивание':4}})
  ]);
  add('Полис',[
    npc('Йегерь-рекрут','5/5/4/3/3/4',25,{body:A.razgruzka,weapons:[W.reglament],skills:{guns:3}}),
    npc('Йегерь-боец','6/6/5/3/3/6',30,{body:A.bushlat,head:A.shlem,weapons:[W.ustav,W.reglament],skills:{guns:5,dodge:4},extra:{'Запугивание':4}}),
    npc('Йегерь-ветеран','7/7/6/4/4/8',35,{body:A.bushlat,head:A.shlem,weapons:[W.ustav,W.delegat],skills:{guns:7},extra:{'Запугивание':6,'Выдержка':6}}),
    npc('Дорожник','6/8/6/4/5/6',32,{body:A.kurtka,head:A.kaska,weapons:[W.kum,W.karmannik],skills:{guns:5,dodge:5}})
  ]);
  add('Орда',[
    npc('Раб-смертник','4/4/3/3/2/2',15,{note:'Горящая бочка: взрыв 4d6 рядом.'}),
    npc('Посвящённый','5/5/4/3/3/3',22,{weapons:[W.nozh,W.trubach],skills:{melee:3}}),
    npc('Воин Орды','6/6/4/3/3/5',28,{body:A.razgruzka,head:A.roga,weapons:[W.kryuk,W.kum],skills:{melee:5,guns:4},extra:{'Запугивание':4}})
  ]);
  add('Твари',[
    npc('Серый','5/8/7/1/1/4',20,{weapons:[W.klyki],skills:{melee:5},note:'Ходят стаей по 3–5.'}),
    npc('Чучуна','8/7/7/1/1/5',40,{body:A.shkuraL,weapons:[W.kogti],skills:{melee:6},extra:{'Скрытность':6}}),
    npc('Шатун','10/5/6/1/1/7',60,{body:A.shkuraM,weapons:[W.lapy],skills:{melee:7},extra:{'Запугивание':6}})
  ]);
  add('Именные',[
    npc('Батый Дархан','10/5/5/2/4/8',50,{body:A.stal,head:A.roga,weapons:[W.kryuk2],skills:{melee:8},extra:{'Запугивание':8}}),
    npc('Тинь','4/6/8/8/7/9',22,{note:'Не дерётся.',extra:{'Проницательность':8,'Обман':7}}),
    npc('Йегерь Рог','6/8/8/5/3/9',34,{body:A.bushlat,head:A.shlem,weapons:[W.hardskil],skills:{guns:8},extra:{'Выживание':7}})
  ]);
  return cats;
}

export { buildNpcDefaults };
