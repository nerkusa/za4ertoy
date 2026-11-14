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
var TIPS=[
  {key:"kist",name:"Кисть",effects:[],text:""},
  {key:"instrument",name:"Инструмент",effects:[sk("Механика",2)],text:""},
  {key:"kleshnya",name:"Клешня",effects:[sk("Ближний бой",2)],text:"Тонкая работа невозможна.",noFine:true},
  {key:"kryuk",name:"Крюк",effects:[sk("Атлетика",1)],text:""},
  {key:"hirurg_kist",name:"Хирургическая кисть",effects:[sk("Медицина",2)],text:""},
  {key:"rezak",name:"Резак",effects:[],text:"Режет металл, цепи, замки."},
  {key:"stvol",name:"Ствол",effects:[],text:"Однозарядный ствол в протезе.",weapon:{name:"Насадка «Ствол»",type:"Guns",dmgType:"П",dmgDice:"3d6",bonus:0,hands:1,clip:1},price:120},
  {key:"shchup",name:"Щуп",effects:[],text:"Достаёт туда, куда рука не пролезет."}
];
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
  im("shina","Позвоночная шина",400,[],""),
  im("pruzhina","Колени «Пружина»",450,[],""),
  im("plastina","Пластина в черепе",150,[],""),
  ad("shchelkalka","Щёлкалка в запястье",60,[],""),
  ad("depo","Депо",70,[],"Раз за бой: до конца боя штраф от ран не действует.",{depo:true}),
  ad("kompas","Компас в кости",30,[],"+1 Выживание при поиске дороги."),
  ad("plastinki","Пластинки на предплечьях",50,[],""),
  ad("skoby","Скобы на костяшках",20,[],"Рукопашное оружие.",{weapon:{name:"Скобы на костяшках",type:"Brawl",dmgType:"Д",dmgDice:"1d4",bonus:1,hands:1}}),
  ad("fonar","Фонарь в ладони",40,[],""),
  ad("zaglushki","Ушные заглушки",30,[],""),
  ad("taynik","Тайник под кожей",25,[],""),
  fu("tiski","Руки «Тиски»",2,[],"+2 Тело для силы и хватки."),
  fu("hodok","Ноги «Ходок»",2,[],""),
  fu("karkas","Каркас",3,[st("telo",2)],""),
  fu("korpus","Корпус",0,[{type:"stat_set",stat:"telo",value:10}],"Занимает все гнёзда. Кассеты невозможны.",{allNests:true,steps:3})
];
var IRON_STAGES=[
  {at:1,name:"Уход",text:"10 ер. в неделю за каждый солюшн."},
  {at:3,name:"Фантомы",text:"Тело помнит то, чего уже нет."},
  {at:5,name:"Немота",text:"Без планшета Здоровье видно только словами."},
  {at:7,name:"Чужой",text:"−2 к Характеру с обычными людьми."}
];
var UPKEEP=10;
var DISEASES=["Болотная лихорадка","Лентец","Чахотка","Гаревый кашель","Сибирка","Клещ","Цинга","Горячка пятна"];
function doseState(d){d=d||0;if(d>=10)return"Край";if(d>=7)return"Горячка пятна";if(d>=4)return"Мутит";return""}

var GEAR_DEFAULTS={cassettes:CASSETTES,tips:TIPS,implants:IMPLANTS};

export { BRACELETS, CASS_CLASSES, CASS_KINDS, kindName, CASSETTES, NOISE, IMPRINT_STAGES, ARM_PRICE, LEG_PRICE, HVATKA_PRICE, FINE_SKILLS, TIPS, IMPLANTS, IRON_STAGES, UPKEEP, DISEASES, doseState, GEAR_DEFAULTS };
