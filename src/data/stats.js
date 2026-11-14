/* Характеристики и навыки «За Чертой · 2035».
   Навыков ×2 нет: все навыки стоят одинаково (x2 оставлен false для
   совместимости с кодом базы). */
var SD=[
  {key:"telo",full:"Тело",short:"ТЕЛ",color:"#8a3b22",emoji:""},
  {key:"reak",full:"Реакция",short:"РЕА",color:"#4f5b2a",emoji:""},
  {key:"vosp",full:"Восприятие",short:"ВОС",color:"#3f6b34",emoji:""},
  {key:"razum",full:"Разум",short:"РАЗ",color:"#5a4a2a",emoji:""},
  {key:"har",full:"Характер",short:"ХАР",color:"#7a5a12",emoji:""},
  {key:"volya",full:"Воля",short:"ВОЛ",color:"#211d18",emoji:""}
];
function sk(n){return{name:n,x2:false}}
var SKD={
  telo:[sk("Ближний бой"),sk("Атлетика"),sk("Запугивание")],
  reak:[sk("Огнестрел"),sk("Метание"),sk("Уклонение"),sk("Скрытность"),sk("Воровство")],
  vosp:[sk("Внимательность"),sk("Выживание"),sk("Проницательность")],
  razum:[sk("Техника"),sk("Механика"),sk("Медицина"),sk("Знания")],
  har:[sk("Убеждение"),sk("Обман"),sk("Торг")],
  volya:[sk("Выдержка")]
};
var ALL_SKILLS=Object.keys(SKD).reduce(function(a,k){return a.concat(SKD[k].map(function(s){return s.name}))},[]);
/* Навык → характеристика */
var SK_STAT={};Object.keys(SKD).forEach(function(k){SKD[k].forEach(function(s){SK_STAT[s.name]=k})});
function skStat(n){return SK_STAT[n]||null}
function stName(k){var d=SD.find(function(s){return s.key===k});return d?d.full:k}
function stShort(k){var d=SD.find(function(s){return s.key===k});return d?d.short:k}

/* Тип оружия базы → наш навык */
var WS={Battle:"Ближний бой",Simple:"Ближний бой",Brawl:"Ближний бой",Guns:"Огнестрел",Archery:"Огнестрел",Thrown:"Метание"};
var DT=["К","Р","Д","С","П"];var WT=["Battle","Simple","Guns","Archery","Thrown","Brawl"];
/* Характеристика броска на попадание: всё холодное и рукопашное — от Тела,
   остальное (огнестрел, арбалеты, метание) — от Реакции. */
var WSTAT={Brawl:"telo",Battle:"telo",Simple:"telo"};function wStat(t){return WSTAT[t]||"reak"}
var WT_LABEL={Battle:"Холодное",Simple:"Подручное",Guns:"Огнестрел",Archery:"Арбалет / лук",Thrown:"Метательное",Brawl:"Рукопашное"};function wtLabel(t){return WT_LABEL[t]||t}
var DT_LABEL={"К":"колющий","Р":"режущий","Д":"дробящий","С":"стрела","П":"пуля"};
/* Боевые навыки NPC (ключи в npc.skills) */
var NPC_WSK={Brawl:"melee",Battle:"melee",Simple:"melee",Guns:"guns",Archery:"guns",Thrown:"thrown"};
var NPC_SK=[{k:"dodge",l:"Уклонение",st:"reak"},{k:"melee",l:"Ближний бой",st:"telo"},{k:"guns",l:"Огнестрел",st:"reak"},{k:"thrown",l:"Метание",st:"reak"},{k:"athletics",l:"Атлетика",st:"telo"}];
/* Бросок атаки NPC: характеристика + навык по типу оружия */
function npcAtk(st,skills,w){var key=NPC_WSK[w.type]||"melee";var stat=wStat(w.type);var d=NPC_SK.find(function(x){return x.k===key});return{rv:(st||{})[stat]||0,skVal:(skills||{})[key]||0,skNm:d?d.l:key,atName:stName(stat)}}
var SK_LABEL={};
function skLabel(n){return SK_LABEL[n]||n}
/* СЛ проверок */
var DC_LIST=[{v:8,l:"пустяк"},{v:12,l:"обычное дело"},{v:16,l:"трудно"},{v:20,l:"очень трудно"},{v:24,l:"почти невозможно"},{v:28,l:"легенда"}];

export { SD, SKD, ALL_SKILLS, SK_STAT, skStat, stName, stShort, WS, DT, DT_LABEL, WT, SK_LABEL, skLabel, WSTAT, wStat, WT_LABEL, wtLabel, NPC_WSK, NPC_SK, npcAtk, DC_LIST };
