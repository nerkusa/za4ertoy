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
  koktejl:w('«Коктейль»','2d6','Thrown','Д'),konserva:w('«Консерва»','4d6','Thrown','П'),
  klyki:w('Клыки','1d6','Brawl','К',1),kogti:w('Когти','2d6','Brawl','Р',2),lapy:w('Лапы','3d6','Brawl','Д')
};
function slot(a){return a?{type:a.type,hp:a.hp,name:a.name}:{type:'none',hp:0,name:''}}
/* o.faction — id фракции (data/factions.js) или null; o.xpMult — множитель опыта
   (вожаки ×2); o.zoneMult/halfKR/ironCrit — железные NPC (Лента). */
function npc(name,st,hp,o){
  o=o||{};var h=slot(o.head),b=slot(o.body);var s=st.split('/').map(Number);
  return{name:name,level:o.level||1,hp:hp,maxHp:hp,xpReward:hp*(o.xpMult||1),faction:o.faction||null,
    zoneMult:o.zoneMult||null,halfKR:!!o.halfKR,ironCrit:!!o.ironCrit,
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
  /* Глава 11: фракции за трактом. Опыт за победу = Здоровье. */
  add('Фракции за трактом',[
    npc('Людоед (Родня)','6/5/6/3/4/4',26,{faction:'rodnya',body:{type:'light',hp:6,name:'Ватник'},weapons:[w('Топор «Колун»','2d6','Battle','Р'),W.nozh],skills:{melee:4},extra:{'Скрытность':4,'Обман':5,'Выживание':5},note:'Хозяева: на своём хуторе +2 к Скрытности, 1d6 капканов (2d6 К). По спящему атака без защиты.'}),
    npc('Ловчий Покрова','5/7/7/3/3/6',28,{faction:'pokrov',body:{type:'light',hp:8,name:'Лоскутная накидка'},weapons:[w('Лук «Тальниковый»','1d6','Archery','С',1),w('Гарпун «Нерпа»','2d6','Archery','К'),w('Нож-свежевальник','1d6','Simple','Р',1)],skills:{guns:5},extra:{'Выживание':6,'Скрытность':5,'Запугивание':5},note:'Метка: +2 к Выживанию и Внимательности против добычи. Первая встреча — бросок страха. Стреляют в ноги без штрафа прицела.'}),
    npc('Поджигатель культа','6/6/4/3/4/7',30,{faction:'kult',body:{type:'light',hp:8,name:'Обгорелая кожа'},head:{type:'light',hp:10,name:'Мотошлем'},weapons:[W.koktejl,w('Цепь','1d6','Simple','Д',1),W.kum],skills:{melee:4,thrown:4,driving:5},note:'Не бросает страх. Вечный Тракт: при Корпусе 0 или падении — бесплатный таран.'}),
    npc('Лентач-сборщик','8/4/5/5/2/3',40,Object.assign({faction:'lenta',body:{type:'heavy',hp:30,name:'Железный корпус'},weapons:[w('«Молот»','2d6','Battle','Д',2),w('Клинок «Жнец»','2d6','Battle','Р')],skills:{melee:5},extra:{'Техника':5,'Запугивание':4},note:'Голова ×1. К и Р вдвое слабее. Чужие голоса: Проницательность СЛ 14 или −1 Воли. Медленный, в топи −4 к Уклонению.'},{zoneMult:{'Голова':1},halfKR:true,ironCrit:true})),
    npc('Суоьулэр, свора','5/6/4/2/3/3',24,{faction:'sok',weapons:[w('Мачете «Тальник»','1d6','Battle','Р',2),W.trubach,W.nozh],skills:{melee:4},extra:{'Запугивание':5,'Скрытность':3},note:'На Соке: 3 раунда без штрафа ран и страха, потом −2. Срыв на атаке — бьёт ближайшего.'}),
    npc('Безбашенный, боец','7/6/5/3/3/6',34,{faction:'bezbash',body:{type:'medium',hp:20,name:'Сапёрный нагрудник'},head:A.kaska,weapons:[W.soroka,W.konserva],skills:{guns:6,dodge:3,thrown:4,driving:4},extra:{'Выдержка':5},note:'Бешенка: раз за бой 3 раунда +2 к атаке и без страха, потом −2 до отдыха. Прикрытие: +2 союзнику по той же цели.'})
  ]);
  /* Вожаки фракций — в «Именные», опыт ×2 */
  var named=cats['Именные'];var startN=Object.keys(named).length;
  [
    npc('Бабка','3/3/7/6/8/9',18,{faction:'rodnya',xpMult:2,extra:{'Обман':9,'Проницательность':8,'Убеждение':7},note:'Не дерётся. Её слово — закон для всей Родни. Убить её — война со всеми хуторами.'}),
    npc('Пастырь','6/7/8/6/7/9',36,{faction:'pokrov',xpMult:2,body:{type:'medium',hp:18,name:'Покров из кожи'},weapons:[w('Нож-свежевальник','1d6','Simple','Р',2)],skills:{melee:6},extra:{'Запугивание':9,'Выживание':8,'Скрытность':6},note:'Первая встреча — страх с −2. Ловчие рядом защищают его щитом из тел: +2 к их атаке, пока он жив.'}),
    npc('Накал','7/6/5/6/8/10',38,{faction:'kult',xpMult:2,body:{type:'medium',hp:18,name:'Обгорелый бушлат'},weapons:[w('Огнемёт из паяльной лампы','2d6','Guns','Д',0),W.delegat],skills:{guns:5,melee:5,driving:7},extra:{'Убеждение':8,'Запугивание':7},note:'Не бросает страх. Пока Накал в бою, культисты рядом +1 к атаке. Огнемёт поджигает: 1d6 в раунд.'}),
    npc('Голос','8/3/7/9/4/2',50,Object.assign({faction:'lenta',xpMult:2,body:{type:'heavy',hp:40,name:'Железный корпус'},weapons:[w('«Молот»','2d6','Battle','Д',2)],skills:{melee:4},extra:{'Техника':9,'Знания':9,'Запугивание':6},note:'Голова ×1. К и Р вдвое слабее. Хор: раз в раунд кто-то рядом бросает Проницательность СЛ 16 или −2 Воли. Говорит десятком голосов.'},{zoneMult:{'Голова':1},halfKR:true,ironCrit:true})),
    npc('Сладкий','4/6/7/8/7/7',22,{faction:'sok',xpMult:2,weapons:[W.karmannik],skills:{guns:4},extra:{'Обман':8,'Торг':9,'Проницательность':8,'Медицина':6},note:'Сам не дерётся, рядом всегда 2–4 Пса. Знает, кто в Полисе в доле.'}),
    npc('Ротный','7/7/7/6/6/8',36,{faction:'bezbash',xpMult:2,body:{type:'medium',hp:20,name:'Сапёрный нагрудник'},head:A.kaska,weapons:[W.soroka,W.delegat],skills:{guns:7,dodge:5,driving:5},extra:{'Выдержка':8,'Запугивание':6},note:'Не принимает Бешенку. Командир: раз в раунд один боец роты действует вне очереди.'})
  ].forEach(function(n,i){named['npc_seed_faction_boss_'+(startN+i)]=n});
  return cats;
}

export { buildNpcDefaults };
