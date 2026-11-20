/* Обвес машин (ТЗ v4, п.17.2, только приложение). fx — что меняется в полях
   машины при установке (и откатывается при снятии); остальное — подсказка. */
var VEHICLE_MODS=[
  {key:"setka",name:"Сетка на окна",effect:"«Консерва» и «Коктейль» в кабину не залетают: урон идёт в Корпус",price:40,slots:1,fx:{}},
  {key:"otval",name:"Отвал-таран",effect:"+2d6 к тарану, таранящая машина получает четверть урона вместо половины; −1 Скорость",price:120,slots:1,fx:{ram:2,speed:-1,ramSelf:0.25}},
  {key:"bronelisty",name:"Бронелисты",effect:"+10 прочности брони; лёгкая становится средней; −1 Управляемость",price:250,slots:1,fx:{armor:10,armorUp:true,handling:-1}},
  {key:"zapbak",name:"Запасной бак",effect:"+1 к баку",price:60,slots:1,fx:{tank:1}},
  {key:"prozhektor",name:"Прожектор",effect:"Ночью нет штрафа к Вождению и Внимательности впереди машины; машину видно за 5 км",price:50,slots:1,fx:{}},
  {key:"lebedka",name:"Лебёдка",effect:"Вытащить себя или чужую машину из топи без проверки, 10 минут",price:90,slots:1,fx:{}},
  {key:"glushitel",name:"Глушитель",effect:"Машину не слышно дальше 300 м; −1 Скорость",price:80,slots:1,fx:{speed:-1}},
  {key:"stanok",name:"Станок под пулемёт",effect:"Можно поставить «Казённый» или огнемёт. Стрелок на ходу без штрафа −2",price:150,slots:1,fx:{mountOk:true}},
  {key:"shipy",name:"Шипы на колёсах",effect:"Таран по пешеходу +1d6; колесо у этой машины выбивается только на 2 из d6 при втором попадании",price:70,slots:1,fx:{}},
  {key:"kletka",name:"Решётка-клетка",effect:"Пассажиры получают броню машины по всем попаданиям «водитель»; −2 места",price:100,slots:1,fx:{seats:-2}}
];
/* Оружие на станок */
var MOUNTS=[
  {key:"kazenny",name:"«Казённый», пулемёт",dmgDice:"4d6",dmgType:"П",type:"Guns"},
  {key:"ognemet",name:"Огнемёт",dmgDice:"2d6",dmgType:"Д",type:"Guns"}
];
function modByKey(k){return VEHICLE_MODS.find(function(m){return m.key===k})||null}
export { VEHICLE_MODS, MOUNTS, modByKey };
