/* Кассета как предмет (ТЗ v4, п.15): своя запись, класс, ёмкость, год,
   состояние, слепок, палёнка. Справочные данные — в data/gear.js. */
import { uid } from './dice';
import { kindName } from '../data/gear';

var CAPACITIES=[16,32,64,128];
var CONDITIONS=[{id:"good",name:"целая"},{id:"worn",name:"затёртая"},{id:"broken",name:"битая"}];
var COMBAT_SKILLS=["Ближний бой","Огнестрел","Метание","Уклонение"];
var CLASS_PRICE={MIL:400,UTIL:150,CIVIL:80};
function condName(k){var d=CONDITIONS.find(function(x){return x.id===k});return d?d.name:"целая"}
function findDef(cat,key){return ((cat&&cat.cassettes)||[]).find(function(x){return x.key===key})||null}

/* Запись на характеристику или боевая — только MIL */
function milOnly(def){
  if(!def)return false;if(def.origOnly)return true;
  return (def.effects||[]).some(function(e){return e.type==="stat_bonus"||e.type==="attack_bonus"||e.type==="aim_bonus"||e.type==="aim_pen"||(e.type==="skill_bonus"&&COMBAT_SKILLS.indexOf(e.skill)>=0)});
}

/* Описание кассеты: из каталога или своя запись; класс и ёмкость — самой кассеты */
function cassDef(x,cat){
  if(!x)return null;
  var base=x.key==="custom"
    ?{key:"custom",name:x.title||"Своя запись",cls:x.cls||"CIVIL",cap:x.capacity||32,effects:x.effects||[],text:x.effect||"",noise:x.noise||"",price:CLASS_PRICE[x.cls||"CIVIL"]||80}
    :(findDef(cat,x.key)||{key:x.key,name:x.title||x.key,cls:x.cls||"?",cap:x.capacity||0,effects:[],text:"нет в каталоге",price:0});
  var cls=x.cls||base.cls;
  return Object.assign({},base,{cls:cls,cap:x.kind==="slep"?128:(x.capacity||base.cap)});
}

/* Цена продажи (ТЗ 15.4). Игрок видит палёнку как оригинал — и цену оригинала. */
function salePrice(x,def){
  if(!x||!def)return 0;
  var p=def.price||0;
  if(x.kind==="copy")p=Math.floor(p/2);
  else if(x.kind==="slep")p=Math.max(40,p);
  else if(x.kind==="fake")p=x.revealed?0:p;
  if(x.dead)return 0;
  if(x.condition==="worn")p=Math.floor(p*0.75);
  else if(x.condition==="broken")p=Math.floor(p*0.5);
  return p;
}

/* «Твёрдая рука (MIL · 64 · оригинал · затёртая)»; forGm — настоящий вид */
function cassLabel(x,def,forGm){
  var k=x.kind==="fake"&&!forGm&&!x.revealed?"orig":x.kind;
  var parts=[def.cls,def.cap,kindName(k)];
  if(x.kind==="fake"&&forGm&&!x.revealed)parts[2]="палёнка под оригинал";
  if(x.condition&&x.condition!=="good")parts.push(condName(x.condition));
  return def.name+" ("+parts.join(" · ")+")";
}

/* Новая кассета из формы мастера */
function makeCassette(f,cat){
  var def=f.key==="custom"?null:findDef(cat,f.key);
  var kind=f.kind||"copy";
  var x={id:uid(),key:f.key,kind:kind,inNest:false,imprint:0,
    title:def?def.name:(f.title||"Своя запись"),
    cls:def&&milOnly(def)?"MIL":(f.cls||(def?def.cls:"CIVIL")),
    capacity:kind==="slep"?128:(parseInt(f.capacity)||(def?def.cap:32)),
    year:f.year||"",condition:f.condition||"good"};
  if(f.key==="custom"){
    x.effects=f.skill&&parseInt(f.amount)?[{type:"skill_bonus",skill:f.skill,amount:parseInt(f.amount)}]:[];
    x.effect=f.effect||"";x.noise=f.noise||"";
    if(f.skill&&COMBAT_SKILLS.indexOf(f.skill)>=0)x.cls="MIL";
  }
  if(kind==="slep"){
    x.imprint=Math.max(0,Math.min(5,parseInt(f.imprint)||0));
    x.donor=f.donor||"";x.donorSkill=f.donorSkill||"";x.donorKnows=f.donorKnows||"";x.quirk1=f.quirk1||"";x.quirk3=f.quirk3||"";
  }
  if(kind==="fake")x.fakeAs="orig";
  return x;
}

/* «Конец сессии»: каждая битая кассета в браслете — d10, на 1 Пробой */
function endSessionRolls(c,roll){
  var res=[];
  var cass=(c.cassettes||[]).map(function(x){
    if(!x.inNest||x.dead||x.condition!=="broken")return x;
    var d=roll();res.push({id:x.id,title:x.title||x.key,d:d,dead:d===1});
    return d===1?Object.assign({},x,{dead:true}):x;
  });
  return{cassettes:cass,results:res};
}

export { CAPACITIES, CONDITIONS, COMBAT_SKILLS, condName, milOnly, cassDef, salePrice, cassLabel, makeCassette, endSessionRolls };
