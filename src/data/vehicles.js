/* Машины (глава 7 «Гараж»). armorType — класс брони как у людей,
   armorHp — её прочность. ram — кости тарана. price null — не продаётся. */
function v(key,name,hull,armorType,armorHp,speed,handling,seats,tank,ram,price,extra){
  return Object.assign({key:key,name:name,hull:hull,maxHull:hull,armorType:armorType,armorHp:armorHp,maxArmorHp:armorHp,speed:speed,handling:handling,seats:seats,tank:tank,ram:ram,price:price,note:""},extra||{});
}
var VEHICLES=[
  v("moto","Мотоцикл йегеря",20,"none",0,5,2,"2",3,"2d6",null,{moto:true,note:"Попадание по водителю идёт целиком, без брони машины. Упал на скорости — 2d6 обоим."}),
  v("buggy","Багги",30,"light",10,4,1,"2",2,"3d6",600),
  v("bukhanka","Буханка",45,"light",10,2,-1,"8",3,"4d6",900,{repairBonus:2,swampFree:true,note:"При ремонте +2 к Механике. Топь не даёт штрафа к Вождению. Восемь мест или полтонны груза."}),
  v("jeep","Джип",45,"medium",18,3,0,"5",3,"4d6",1500),
  v("interceptor","Перехватчик дорожников",50,"medium",18,5,1,"2",4,"4d6",null,{note:"Машина Дорожного корпуса. Угнанный ищут по всему тракту."}),
  v("truck","Грузовик конвоя",90,"heavy",30,2,-2,"3 + кузов",5,"6d6",null),
  v("buggy_cult","Багги культа",30,"light",10,4,1,"2",2,"3d6",null,{weapon:{name:"Огнемёт",dmgDice:"2d6",dmgType:"Д",type:"Guns"},note:"Огнемёт: 2d6 Д по одной цели рядом, цель загорается (1d6 в раунд)."}),
  v("bezbashennik","Безбашенник",120,"heavy",40,2,-2,"10",5,"8d6",null,{weapon:{name:"«Казённый», пулемёт",dmgDice:"4d6",dmgType:"П",type:"Guns"},note:"Бронетранспортёр без башни, пулемёт «Казённый» (4d6 П)."})
];
function vehicleByKey(k){return VEHICLES.find(function(x){return x.key===k})||null}
/* Экземпляр машины для гаража */
function newVehicle(key,extra){var d=vehicleByKey(key);if(!d)return null;return Object.assign({id:"veh_"+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36)},JSON.parse(JSON.stringify(d)),{wheelsHit:0,speedLoss:0,burning:false,stopped:false},extra||{})}

export { VEHICLES, vehicleByKey, newVehicle };
