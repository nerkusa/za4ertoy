/* Браслет, кассеты, солюшны, шумы, болезни — справочники.
   Каталог (кассеты, насадки, импланты) ГМ может править в редакторе
   эффектов; значения по умолчанию — здесь. */
var BRACELETS={
  Civil:{name:"Civil",nests:3,reads:["CIVIL"]},
  Utilitary:{name:"Utilitary",nests:5,reads:["UTIL","CIVIL"]},
  Military:{name:"Military",nests:7,reads:["MIL","UTIL","CIVIL"]}
};
var CASS_CLASSES=["MIL","UTIL","CIVIL"];
var CASS_KINDS=[{id:"orig",name:"оригинал"},{id:"copy",name:"копия"},{id:"slep",name:"слепок"},{id:"fake",name:"палёнка"}];
function kindName(k){var d=CASS_KINDS.find(function(x){return x.id===k});return d?d.name:k}
function st(stat,n){return{type:"stat_bonus",stat:stat,amount:n}}
function sk(skill,n){return{type:"skill_bonus",skill:skill,amount:n}}
function cs(key,name,cls,cap,effects,text,extra){return Object.assign({key:key,name:name,cls:cls,cap:cap,effects:effects||[],text:text||"",price:cls==="MIL"?400:cls==="UTIL"?150:80},extra||{})}
var CASSETTES=[
  cs("zhila","Жила","MIL",64,[st("telo",1)],"",{origOnly:true}),
  cs("refleks","Рефлекс","MIL",64,[st("reak",1)],"",{origOnly:true}),
  cs("glaz","Глаз","MIL",64,[st("vosp",1)],"",{origOnly:true}),
  cs("schetchik","Счётчик","MIL",64,[st("razum",1)],"",{origOnly:true}),
  cs("yazyk","Язык","MIL",64,[st("har",1)],"",{origOnly:true}),
  cs("sterzhen","Стержень","MIL",64,[st("volya",1),{type:"free_overcome_fear"}],"При Здоровье ниже четверти пересиливает страх без траты Воли.",{origOnly:true}),
  cs("tverdaya_ruka","Твёрдая рука","MIL",64,[],"Дым, пыль, тряска не мешают. Переброс срыва атаки раз за бой.",{origOnly:true}),
  cs("hirurg","Хирург","MIL",64,[sk("Медицина",1),{type:"aim_bonus",amount:2}],"Прицельный штраф на 2 меньше."),
  cs("medved","Медведь","MIL",64,[sk("Ближний бой",2),sk("Запугивание",1)],""),
  cs("tishina","Тишина","MIL",64,[sk("Скрытность",2)],""),
  cs("svidetel","Свидетель","UTIL",32,[],"Знаешь, кто тебя видит."),
  cs("nochnik","Ночник","UTIL",32,[],"Темнота не мешает."),
  cs("dozimetr","Дозиметр","UTIL",32,[],"+2 к Выживанию против отравы."),
  cs("bolotnik","Болотник","UTIL",32,[],"Топь не мешает."),
  cs("vzlomshchik","Взломщик","UTIL",64,[sk("Техника",2),sk("Воровство",1)],"Воровство — только на замках."),
  cs("efir","Эфир","UTIL",32,[sk("Внимательность",1)],"Чужие частоты."),
  cs("kartograf","Картограф","CIVIL",32,[],"Раз за сессию — тайник."),
  cs("baranka","Баранка","CIVIL",32,[],"+2 к вождению."),
  cs("torgash","Торгаш","CIVIL",32,[sk("Торг",2)],"Настоящая цена."),
  cs("kolybelnaya","Колыбельная","CIVIL",32,[sk("Выдержка",1)],"Отдых вдвое лучше.")
];
var NOISE=[
  "Чужой голос: −1 к Выдержке до конца сцены",
  "Залипание: кассета не вынимается до отдыха",
  "Обрыв: кассета молчит до конца сцены",
  "Эхо: повторяешь фразы с плёнки, −2 к Скрытности на сцену",
  "Мигрень: −1 ко всем проверкам Разума на сцену",
  "Чужая привычка: мастер даёт странность до конца сессии",
  "Перемотка: теряешь следующий ход",
  "Тремор: −1 к Реакции на сцену",
  "Чужой сон: утром Выдержка СЛ 12, иначе отдых не засчитан",
  "Пробой: плёнку зажевало, кассета испорчена"
];
var IMPRINT_STAGES=["—","Привычки","Память","Желания","Провалы","Край"];

/* ── Солюшны ── */
var ARM_PRICE=500,LEG_PRICE=300,HVATKA_PRICE=30;
var FINE_SKILLS=["Механика","Медицина","Воровство"];
/* Насадки на руку (глава 10). weapon — насадка-оружие (prosthetic: бьёт
   как с Телом 7), shield — наручный щит, finePen — штраф к тонкой работе,
   noFine — тонкая работа невозможна. */
var TIPS=[
  {key:"kist",name:"Кисть",effects:[],text:"Как своя. Идёт в комплекте с рукой.",price:150},
  {key:"kleshnya",name:"Клешня",effects:[sk("Ближний бой",2)],text:"Держит как тиски; тонкая работа невозможна.",noFine:true,price:80},
  {key:"instrument",name:"Инструмент",effects:[sk("Механика",2)],text:"Ключи, отвёртка, паяльник.",price:120},
  {key:"kryuk",name:"Крюк",effects:[sk("Атлетика",1)],text:"Лазать, цеплять, драться.",price:40},
  {key:"hirurg_kist",name:"Хирургическая кисть",effects:[sk("Медицина",2)],text:"Тонкая работа.",price:350},
  {key:"rezak",name:"Резак",effects:[],text:"Пилит металл и цепи.",price:150},
  {key:"stvol",name:"Ствол",effects:[],text:"Однозарядный обрез в предплечье, 3d6.",weapon:{name:"Насадка «Ствол»",type:"Guns",dmgType:"П",dmgDice:"3d6",bonus:0,hands:1,clip:1},price:120},
  {key:"shchup",name:"Щуп",effects:[],text:"Щёлкалка в пальце: грязь слышно без дозиметра.",price:60},
  {key:"zhnec",name:"Клинок «Жнец»",effects:[],text:"Выдвижной клинок, 2d6 Р. Из руки не выбить.",weapon:{name:"Клинок «Жнец»",type:"Battle",dmgType:"Р",dmgDice:"2d6",bonus:0,hands:1,prosthetic:true,noDisarm:true},price:200},
  {key:"molot",name:"«Молот»",effects:[],text:"Стальной набалдашник, 2d6+2 Д. Тонкая работа −2.",weapon:{name:"«Молот»",type:"Battle",dmgType:"Д",dmgDice:"2d6",bonus:2,hands:1,prosthetic:true},finePen:2,price:180},
  {key:"zaslon",name:"«Заслон»",effects:[],text:"Наручный лёгкий щит, принимает половину урона. Руки свободны.",shield:{name:"«Заслон»",type:"light",absorb:0.5,hp:12,freeHands:true},price:160},
  {key:"koshka",name:"Кошка",effects:[sk("Атлетика",3)],text:"Трос с крюком на 5 м: +3 к Атлетике при лазании. Подтянуть врага: Тело против Тела.",price:90}
];
/* Насадки на ногу (замок на «Опоре») */
var LEG_TIPS=[
  {key:"stopa",name:"Стопа",effects:[],text:"Обычная, идёт в комплекте с «Опорой».",price:null},
  {key:"bolotohod",name:"«Болотоход»",effects:[],text:"Широкая стопа: топь не даёт штрафов, не вязнешь.",swamp:true,price:80},
  {key:"prygun",name:"«Прыгун»",effects:[sk("Атлетика",2)],text:"Пружина: прыжок на 4 м, запрыгнуть на кузов на ходу.",price:150},
  {key:"kopyto",name:"«Копыто»",effects:[],text:"Пинок 2d6 Д. Кто получил — Атлетика СЛ 12, или падает.",weapon:{name:"«Копыто»",type:"Brawl",dmgType:"Д",dmgDice:"2d6",bonus:0,hands:1,note:"цель: Атлетика СЛ 12 или падает"},price:120},
  {key:"roliki",name:"Ролики",effects:[],text:"По асфальту вдвое быстрее. На бездорожье −2 к Уклонению.",offroadPen:2,price:100},
  {key:"pedal",name:"«Педаль»",effects:[sk("Вождение",2)],text:"Ступня срастается с педалью машины.",price:70}
];
/* Удар железным кулаком: появляется у каждой рабочей руки (не «Хватка») */
var IRON_FIST={name:"Кулак протеза",type:"Brawl",dmgType:"Д",dmgDice:"1d4",bonus:0,hands:1,prosthetic:true};
var PROSTHETIC_TELO=7;
function im(key,name,price,effects,text){return{key:key,name:name,kind:"implant",price:price,nest:1,steps:1,effects:effects||[],text:text||""}}
function ad(key,name,price,effects,text,extra){return Object.assign({key:key,name:name,kind:"addon",price:price,nest:0,steps:0,effects:effects||[],text:text||""},extra||{})}
function fu(key,name,steps,effects,text,extra){return Object.assign({key:key,name:name,kind:"full",price:null,nest:steps,steps:steps,effects:effects||[],text:text||"",gmOnly:true},extra||{})}
var IMPLANTS=[
  im("pricel","Глаз «Прицел»",350,[sk("Огнестрел",1)],""),
  im("glaz_nochnik","Глаз «Ночник»",350,[],"Видит в темноте."),
  im("dymovoy","Глаз «Дымовой»",300,[],"Видит сквозь дым и пыль."),
  im("filtr_legkoe","Фильтр-лёгкое",400,[],"Картридж 20 ер., раз в 2 недели."),
  im("pochechny","Почечный фильтр",450,[],"−1 Доза в неделю. Картридж 30 ер. в месяц."),
  im("kotel","Желудок «Котёл»",350,[],"Переваривает то, что другим нельзя."),
  im("sito","Печень «Сито»",350,[],"Держит отраву и спирт."),
  im("klapan","Клапан",300,[],""),
  im("nasos","Насос",600,[],"Раз за бой — ещё один ход после падения."),
  im("shina","Позвоночная шина",400,[{type:"max_hp",amount:5}],"+5 к максимальному Здоровью, с ног не сбить, носишь вдвое больше."),
  im("pruzhina","Колени «Пружина»",450,[],""),
  im("plastina","Пластина в черепе",150,[{type:"zone_mult_override",zone:"head",mult:1},sk("Внимательность",-1)],"Попадание в голову ×1 вместо ×3. −1 к Внимательности, мигрени к дождю."),
  im("sheynye","Шейные кольца",350,[{type:"zone_mult_override",zone:"neck",mult:1},sk("Внимательность",-1)],"Попадание в шею ×1 вместо ×2. Голову быстро не повернуть."),
  ad("shchelkalka","Щёлкалка в запястье",60,[],""),
  ad("depo","Депо",70,[],"Раз за бой: до конца боя штраф от ран не действует.",{depo:true}),
  ad("kompas","Компас в кости",30,[],"+1 Выживание при поиске дороги."),
  ad("plastinki","Пластинки на предплечьях",50,[{type:"zone_dmg_reduce",zone:"arms",amount:3}],"Попадание в руки: −3 урона."),
  ad("skoby","Скобы на костяшках",20,[],"Рукопашное оружие.",{weapon:{name:"Скобы на костяшках",type:"Brawl",dmgType:"Д",dmgDice:"1d4",bonus:1,hands:1}}),
  ad("fonar","Фонарь в ладони",40,[],""),
  ad("zaglushki","Ушные заглушки",30,[],""),
  ad("taynik","Тайник под кожей",25,[],""),
  fu("tiski","Руки «Тиски»",2,[],"+2 к Телу во всём, где нужны сила и хватка. Насадки те же.",{price:1200}),
  fu("hodok","Ноги «Ходок»",2,[],"Бег без усталости, +2 к защите от сбивания с ног.",{price:1200}),
  fu("karkas","Каркас",3,[st("telo",2)],"+2 к Телу во всём, рёбра не ломаются. Весишь как двое.",{price:2000}),
  fu("korpus","Корпус",0,[{type:"stat_set",stat:"telo",value:10}],"Занимает все гнёзда. Кассеты невозможны.",{allNests:true,steps:3})
];
var IRON_STAGES=[
  {at:1,name:"Уход",text:"10 ер. в неделю за каждый солюшн."},
  {at:3,name:"Фантомы",text:"Тело помнит то, чего уже нет."},
  {at:5,name:"Немота",text:"Без планшета Здоровье видно только словами."},
  {at:7,name:"Чужой",text:"−2 к Характеру с обычными людьми."}
];
var UPKEEP=10;
/* Болезни (глава 6 «Болезни в игре»). effects — механика:
   skill_bonus — к навыку; stat_roll — ко всем броскам от характеристики;
   all_roll — ко всем броскам; hp_flat — к максимуму Здоровья;
   aim_pen — к штрафу прицела. flags — особые правила (отдых, бинты,
   синька, ежедневная потеря). Остальное — text, применяет мастер. */
var FINE_WORK=["Механика","Медицина","Воровство"];
function dz(key,name,effects,flags,cure,text){return{key:key,name:name,effects:effects||[],flags:flags||{},cure:cure,text:text}}
var DISEASES=[
  dz("bolotnaya","Болотная лихорадка",[{type:"stat_roll",stat:"telo",amount:-2}],{restHalf:true},"неделя, СЛ 12","−2 к броскам от Тела, отдых восстанавливает вдвое меньше"),
  dz("lentec","Лентец",[{type:"hp_flat",amount:-3}],{},"неделя, СЛ 14","−3 к максимальному Здоровью, еды нужно вдвое больше"),
  dz("chahotka","Чахотка",[{type:"skill_bonus",skill:"Атлетика",amount:-2}],{},"месяц, СЛ 20","−2 к Атлетике. После каждого боя проверка Тела СЛ 12, иначе −1d6 Здоровья"),
  dz("garevy","Гаревый кашель",[{type:"skill_bonus",skill:"Скрытность",amount:-2},{type:"skill_bonus",skill:"Выдержка",amount:-1}],{},"неделя, СЛ 14","−2 к Скрытности: кашель слышно. −1 к Выдержке"),
  dz("sibirka","Сибирка",[],{dailyHp:-1,noRestDaily:true},"неделя, СЛ 20","−1 Здоровья каждый день, отдых его не возвращает"),
  dz("kleshch","Клещ",[{type:"skill_bonus",skill:"Огнестрел",amount:-2},{type:"skill_bonus",skill:"Метание",amount:-2}].concat(FINE_WORK.map(function(n){return{type:"skill_bonus",skill:n,amount:-2}})),{},"неделя, СЛ 14","Руки трясутся: −2 к Огнестрелу, Метанию и тонкой работе"),
  dz("cinga","Цинга",[{type:"skill_bonus",skill:"Убеждение",amount:-2},{type:"skill_bonus",skill:"Торг",amount:-2}],{restHalf:true,healHalf:true},"неделя, СЛ 12","−2 к Убеждению и Торгу. Бинты и отдых лечат вдвое меньше"),
  dz("goryachka","Горячка пятна",[{type:"all_roll",amount:-2}],{},"неделя, СЛ 16","−2 ко всем броскам. Заразна: кто ухаживает, тот проверяет Тело, СЛ 12"),
  dz("ozherelye","Ожерелье",[],{dailyWill:-1},"месяц, СЛ 16","−1 Воли каждый день, пока не начнут лечить"),
  dz("belaya","Белая кровь",[{type:"hp_flat",amount:-5}],{noSinka:true},"не лечится","−5 к максимальному Здоровью, синька не снимает Дозу"),
  dz("gnil","Гниль",[],{dailyHp:-1},"только ампутация","−1 Здоровья в день. Через неделю конечность не спасти"),
  dz("mutny","Мутный глаз",[{type:"skill_bonus",skill:"Внимательность",amount:-3},{type:"aim_pen",amount:3}],{},"глаз «Прицел» или «Ночник»","−3 к Внимательности и к прицельным выстрелам")
];
function diseaseByKey(k){return DISEASES.find(function(d){return d.key===k||d.name===k})||null}
/* Болезни персонажа объектами; старые строки-названия тоже понимаем */
function diseaseList(c){return ((c&&c.diseases)||[]).map(function(x){var key=typeof x==="string"?x:(x&&(x.key||x.name));return diseaseByKey(key)}).filter(Boolean)}
function diseaseFlag(c,flag){return diseaseList(c).some(function(d){return !!d.flags[flag]})}
function doseState(d){d=d||0;if(d>=10)return"Край";if(d>=7)return"Горячка пятна";if(d>=4)return"Мутит";return""}

var GEAR_DEFAULTS={cassettes:CASSETTES,tips:TIPS,legTips:LEG_TIPS,implants:IMPLANTS};

export { BRACELETS, CASS_CLASSES, CASS_KINDS, kindName, CASSETTES, NOISE, IMPRINT_STAGES, ARM_PRICE, LEG_PRICE, HVATKA_PRICE, FINE_SKILLS, TIPS, LEG_TIPS, IRON_FIST, PROSTHETIC_TELO, IMPLANTS, IRON_STAGES, UPKEEP, DISEASES, FINE_WORK, diseaseByKey, diseaseList, diseaseFlag, doseState, GEAR_DEFAULTS };
