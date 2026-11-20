/* Машины (глава 7 «Гараж»). armorType — класс брони как у людей,
   armorHp — её прочность. ram — кости тарана. price null — не продаётся. */
function v(key,name,hull,armorType,armorHp,speed,handling,seats,tank,ram,price,extra){
  return Object.assign({key:key,name:name,hull:hull,maxHull:hull,armorType:armorType,armorHp:armorHp,maxArmorHp:armorHp,speed:speed,handling:handling,seats:seats,tank:tank,ram:ram,price:price,note:""},extra||{});
}
var VEHICLES=[
  v("moto","Мотоцикл йегеря",20,"none",0,5,2,"2",3,"2d6",null,{moto:true,small:true,fuel2:true,note:"Попадание по водителю идёт целиком, без брони машины. Упал на скорости — 2d6 обоим."}),
  v("buggy","Багги",30,"light",10,4,1,"2",2,"3d6",600),
  v("bukhanka","Буханка",45,"light",10,2,-1,"8",3,"4d6",900,{repairBonus:2,swampFree:true,terrain:{swamp:0,water:false,offroad:0},note:"При ремонте +2 к Механике. Топь не даёт штрафа к Вождению. Восемь мест или полтонны груза."}),
  v("jeep","Джип",45,"medium",18,3,0,"5",3,"4d6",1500),
  v("interceptor","Перехватчик дорожников",50,"medium",18,5,1,"2",4,"4d6",null,{note:"Машина Дорожного корпуса. Угнанный ищут по всему тракту."}),
  v("truck","Грузовик конвоя",90,"heavy",30,2,-2,"3 + кузов",5,"6d6",null),
  v("buggy_cult","Багги культа",30,"light",10,4,1,"2",2,"3d6",null,{weapon:{name:"Огнемёт",dmgDice:"2d6",dmgType:"Д",type:"Guns"},note:"Огнемёт: 2d6 Д по одной цели рядом, цель загорается (1d6 в раунд)."}),
  v("bezbashennik","Безбашенник",120,"heavy",40,2,-2,"10",5,"8d6",null,{weapon:{name:"«Казённый», пулемёт",dmgDice:"4d6",dmgType:"П",type:"Guns"},note:"Бронетранспортёр без башни, пулемёт «Казённый» (4d6 П)."}),
  /* ТЗ v4, п.17 — только для приложения */
  v("zhuk","Квадроцикл «Жук»",22,"none",0,4,2,"2",2,"2d6",350,{moto:true,small:true,fuel2:true,terrain:{swamp:-1,water:false,offroad:0},note:"Топь −1 к Вождению вместо −2. Попадание по водителю целиком, как у мотоцикла."}),
  v("troika","Мотоцикл с коляской «Тройка»",28,"none",0,4,0,"3",3,"3d6",500,{moto:true,small:true,fuel2:true,sidecar:true,note:"Стрелок в коляске стреляет на ходу без штрафа −2."}),
  v("kozlik","«Козлик»",40,"light",10,3,1,"4",3,"3d6",1100,{terrain:{swamp:-1,water:false,offroad:0},note:"Довоенный вездеходный джип. Топь −1 к Вождению вместо −2."}),
  v("shmel","Аэролодка «Шмель»",25,"none",0,4,1,"3",2,"1d6",900,{small:true,terrain:{swamp:0,water:true,offroad:0,landStop:true},note:"Только вода и топь, на суше стоит. Ревёт: −4 к Скрытности всей группы, слышно за 3 км."}),
  v("utyug","Гусеничный «Утюг»",60,"medium",18,2,-1,"6",4,"5d6",2800,{tracks:true,terrain:{swamp:0,water:true,offroad:0},note:"Вездеход: топь и колея без штрафа, переплывает реку. Попадание «колесо» — слетела гусеница: машина стоит до ремонта (Механика СЛ 14, час)."}),
  v("povozka","Повозка на якутской лошади",25,"none",0,2,-1,"4 + груз",0,"1d6",null,{noFuel:true,terrain:{swamp:0,water:false,offroad:0},note:"Корпус — Здоровье лошади. Бак — трава. Топь без штрафа. Цена — обмен."}),
  v("bochka","Бензовоз «Бочка»",80,"medium",18,2,-2,"2",6,"6d6",null,{tanker:true,note:"Цистерна: 20 канистр горючки. Попадание «бак» на 4–6 по d6 — взрыв 6d6 всем в 10 м. Не продаётся."}),
  v("krepost","Грузовик-«крепость»",110,"heavy",34,1,-3,"3 + кузов 10",6,"7d6",null,{mountOk:true,loopholes:true,note:"Конвойный броневик Артели. Две бойницы (стрельба из кузова без штрафа) и станок под «Казённый». Не продаётся."})
];
function vehicleByKey(k){return VEHICLES.find(function(x){return x.key===k})||null}
/* Экземпляр машины для гаража */
function vehId(){return "veh_"+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36)}
function newVehicle(key,extra){var d=vehicleByKey(key);if(!d)return null;return normalizeVehicle(Object.assign({id:vehId()},JSON.parse(JSON.stringify(d)),{wheelsHit:0,speedLoss:0,burning:false,stopped:false},extra||{}))}
/* Машина в модели v4: бак, местность, станок, обвес, повреждения, владелец.
   wheelsHit/speedLoss/burning остаются рабочими полями; damage — их сводка. */
function normalizeVehicle(v,owner){
  if(!v||typeof v!=="object")return v;
  var o=Object.assign({},v);
  if(o.fuel==null)o.fuel=o.noFuel?0:(o.tank||0);
  if(!Array.isArray(o.mods))o.mods=[];
  if(!o.terrain)o.terrain=o.swampFree?{swamp:0,water:false,offroad:0}:{swamp:-2,water:false,offroad:0};
  if(o.mount===undefined)o.mount=o.weapon||null;
  if(owner&&!o.owner)o.owner=owner;
  if(o.maxArmorHp==null)o.maxArmorHp=o.armorHp||0;
  if(o.maxHull==null)o.maxHull=o.hull||0;
  o.damage={wheels:o.wheelsHit||0,engine:(o.speedLoss||0)>0,burning:!!o.burning};
  return o;
}
/* Своя машина мастера с ручными полями */
function customVehicle(f){return normalizeVehicle({id:vehId(),key:"custom",name:f.name||"Своя машина",hull:+f.hull||30,maxHull:+f.hull||30,armorType:f.armorType||"none",armorHp:+f.armorHp||0,maxArmorHp:+f.armorHp||0,speed:+f.speed||3,handling:+f.handling||0,seats:String(f.seats||"2"),tank:+f.tank||3,ram:f.ram||"3d6",price:null,note:f.note||"",wheelsHit:0,speedLoss:0,burning:false,stopped:false,small:!!f.small})}

export { VEHICLES, vehicleByKey, newVehicle, normalizeVehicle, customVehicle, vehId };
