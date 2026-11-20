/* Миграция персонажей на правила v3 (рулбук, версия 37). Чистая функция:
   возвращает того же персонажа, если менять нечего. Характеристики и уже
   полученные награды за уровни не пересчитываются. */
import { ALL_SKILLS } from '../data/stats';
import { diseaseByKey, CASSETTES } from '../data/gear';
import { prosthesesOf } from './crits';

function migrateChar(c){
  if(!c||typeof c!=="object")return c;
  var out=c;function set(k,v){if(out===c)out=Object.assign({},c);out[k]=v}
  /* новый навык Вождение = 0 (и прочие недостающие навыки) */
  var sk=c.skills||{};var miss=ALL_SKILLS.filter(function(n){return sk[n]===undefined});
  if(miss.length){var ns=Object.assign({},sk);miss.forEach(function(n){ns[n]=0});set("skills",ns)}
  if(c.locked&&c.lockedSkills){var lk=c.lockedSkills;var lm=ALL_SKILLS.filter(function(n){return lk[n]===undefined});if(lm.length){var nl=Object.assign({},lk);lm.forEach(function(n){nl[n]=sk[n]||0});set("lockedSkills",nl)}}
  if(!Array.isArray(c.crits))set("crits",[]);
  if(!c.reputation||typeof c.reputation!=="object")set("reputation",{});
  /* протезы: solutions.arm/leg → prostheses.armR/legR */
  if(!c.prostheses||typeof c.prostheses!=="object"){
    var p=prosthesesOf(c);set("prostheses",Object.assign({armL:null,armR:null,legL:null,legR:null,armTips:[],legTips:[]},{armL:p.armL,armR:p.armR,legL:p.legL,legR:p.legR},
      {armTips:((c.solutions&&c.solutions.arm&&c.solutions.arm.tips)||[]).filter(function(k){return k!=="kist"})}));
    if(c.solutions&&(c.solutions.arm||c.solutions.leg))set("solutions",Object.assign({},c.solutions,{arm:null,leg:null}));
  }
  /* биография — список строк */
  if(!Array.isArray(c.bio))set("bio",c.bio?String(c.bio).split("\n"):[]);
  /* болезни-строки → объекты */
  if(Array.isArray(c.diseases)&&c.diseases.some(function(d){return typeof d==="string"}))
    set("diseases",c.diseases.map(function(d){if(typeof d!=="string")return d;var o=diseaseByKey(d);return o?{key:o.key,name:o.name}:{key:d,name:d}}));
  /* v4: у кассеты есть состояние, ёмкость, класс и название */
  if(Array.isArray(c.cassettes)&&c.cassettes.some(function(x){return x&&(!x.condition||!x.capacity||!x.cls)}))
    set("cassettes",c.cassettes.map(function(x){
      if(!x||(x.condition&&x.capacity&&x.cls))return x;
      var d=CASSETTES.find(function(k){return k.key===x.key});
      return Object.assign({},x,{condition:x.condition||"good",capacity:x.capacity||(x.kind==="slep"?128:(d?d.cap:64)),cls:x.cls||(d?d.cls:"CIVIL"),title:x.title||(d?d.name:x.key)});
    }));
  return out;
}
function needsMigration(c){return migrateChar(c)!==c}

export { migrateChar, needsMigration };
