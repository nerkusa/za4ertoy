/* Жизненный путь: корни, «кто ты внутри», пятилетки с ветвлением и
   эффекты событий с пределами книги (+2 к навыкам всего, не выше потолка
   старта; 100 ер. всего). Чистые функции; rnd(n) — бросок dn (для тестов). */
import { PRE_ROOTS, POST_ROOTS, ROOT_TITLES, INNER, INNER_TITLES, PRE_YEARS, AFTER, CHILDHOOD, FRIEND, ENEMY, LOVE, inRange, LIFE_SKILL_CAP, LIFE_MONEY_CAP } from '../data/lifepath';
import { DISEASES, CASSETTES } from '../data/gear';
import { buildShopDefaults } from '../data/shopDefaults';
import { newVehicle } from '../data/vehicles';
import { PROFS } from '../data/professions';
import { r1, uid } from './dice';
import { EXTRA_TABLES, extraTable } from '../data/lifepathExtra';
import { grantPatch } from './grant';
import { giveSolution, addCassette } from './gearOps';

var NOW=2035,STRIKE=2012,START_CAP=8;

/* Пятилетки: довоенный — с 15 лет до 2012-го по «Довоенным годам», плюс
   4 по «После ударов»; послевоенный — floor(возраст/5), первые два —
   «Детство», остальные — «После ударов». */
function periods(origin,age){
  age=parseInt(age)||0;var birth=NOW-age;var out=[];
  if(origin==="pre"){
    var n=Math.max(0,Math.floor((STRIKE-birth-15)/5));
    for(var i=0;i<n;i++){var f=birth+15+5*i;out.push({from:f,to:f+5,table:"pre"})}
    for(var j=0;j<4;j++){var g=STRIKE+5*j;out.push({from:g,to:g+5,table:"after"})}
  } else {
    var m=Math.floor(age/5);
    for(var k=0;k<m;k++){out.push({from:birth+5*k,to:birth+5*k+5,table:k<2?"child":"after",ageFrom:5*k,ageTo:5*k+5})}
  }
  return out;
}
function rollRoots(origin,rnd){rnd=rnd||r1;var t=origin==="pre"?PRE_ROOTS:POST_ROOTS;return Object.keys(t).map(function(k){var n=rnd(10);return{key:k,title:ROOT_TITLES[k],n:n,t:t[k][n-1]}})}
function rollInner(rnd){rnd=rnd||r1;return Object.keys(INNER).map(function(k){var n=rnd(10);return{key:k,title:INNER_TITLES[k],n:n,t:INNER[k][n-1]}})}
function rollLove(rnd,forced){
  var n=forced?1:rnd(10);var how=inRange(LOVE.how,n);var ev={kind:"love",rolls:[n],how:how.key,t:"Любовь: "+how.t};
  if(how.key==="tragic"){var a=rnd(10);ev.rolls.push(a);ev.t="Любовь, трагическая: "+LOVE.tragedy[a-1]}
  if(how.key==="hard"){var b=rnd(10);ev.rolls.push(b);ev.t="Любовь, сложная: "+LOVE.hard[b-1]}
  return ev;
}
function rollFriend(rnd){var a=rnd(10),b=rnd(10),c=rnd(10);return{kind:"friend",rolls:[a,b,c],who:FRIEND.who[a-1],how:FRIEND.how[b-1],close:inRange(FRIEND.close,c).t,t:"Друг: "+FRIEND.who[a-1]+". "+FRIEND.how[b-1]+". "+inRange(FRIEND.close,c).t}}
function rollEnemy(rnd){var a=rnd(10),b=rnd(10),c=rnd(10),d=rnd(10);return{kind:"enemy",rolls:[a,b,c,d],who:ENEMY.who[a-1],why:ENEMY.why[b-1],what:ENEMY.what[c-1],power:inRange(ENEMY.power,d).t,t:"Враг: "+ENEMY.who[a-1]+". За что: "+ENEMY.why[b-1].toLowerCase()+". "+ENEMY.what[c-1]+". "+inRange(ENEMY.power,d).t}}
/* Бросок одной пятилетки */
function rollPeriod(p,rnd){
  rnd=rnd||r1;var label=p.from+"–"+p.to;
  if(p.table==="child"){var c=rnd(10);var ce=CHILDHOOD[c-1];return{label:label,table:"child",kind:"child",rolls:[c],t:ce.t,fx:ce.fx}}
  var tb=p.table==="pre"?PRE_YEARS:AFTER;var n=rnd(10);var ev;
  if(n<=4){var x=rnd(10);var good=x%2===0;var y=rnd(10);var it=(good?tb.good:tb.bad)[y-1];ev={kind:good?"good":"bad",rolls:[n,x,y],t:(good?"Удача: ":"Беда: ")+it.t,fx:it.fx};
    if(it.fx&&it.fx.love){var lv=rollLove(rnd,true);ev.t+=". "+lv.t}}
  else if(n<=7){var z=rnd(10);ev=z%2===0?rollFriend(rnd):rollEnemy(rnd);ev.rolls=[n,z].concat(ev.rolls)}
  else if(n<=9){ev=rollLove(rnd);ev.rolls=[n].concat(ev.rolls)}
  else ev={kind:"quiet",rolls:[n],t:"Тихие годы. Работал, ел, спал"};
  return Object.assign({label:label,table:p.table},ev);
}
function rollYears(origin,age,rnd){return periods(origin,age).map(function(p){return rollPeriod(p,rnd)})}

/* Применить события к персонажу. Возвращает патч, строки биографии,
   контакты для мастера (друзья и враги) и что ушло без эффекта. */
function applyLifepath(c,cat,lp,rnd){
  rnd=rnd||r1;var cur=Object.assign({},c);var skillsUsed=0,moneyUsed=0;var lines=[],contacts=[],skipped=[];
  function patch(p){if(p&&!p.error)Object.assign(cur,p);return !!(p&&!p.error)}
  function addSkill(names,amount){
    var list=[].concat(names);var sk=Object.assign({},cur.skills||{});
    var n=list.slice().sort(function(a,b){return (sk[a]||0)-(sk[b]||0)}).find(function(x){return (sk[x]||0)+amount<=START_CAP});
    if(!n||skillsUsed+amount>LIFE_SKILL_CAP)return false;
    sk[n]=(sk[n]||0)+amount;skillsUsed+=amount;cur.skills=sk;cur.lockedSkills=Object.assign({},cur.lockedSkills||{},(function(){var o={};o[n]=sk[n];return o})());return true;
  }
  function applyFx(fx,ev){
    if(!fx)return true;var ok=true;
    if(fx.skill)ok=addSkill(fx.skill,fx.amount||1)&&ok;
    if(fx.profSkill){var pf=PROFS.find(function(p){return p.id===cur.profession});ok=(pf?addSkill(pf.skills,fx.profSkill):false)&&ok}
    if(fx.money){if(moneyUsed+fx.money>LIFE_MONEY_CAP)ok=false;else{moneyUsed+=fx.money;cur.money=(cur.money||0)+fx.money}}
    if(fx.dose)cur.dose=Math.min(10,(cur.dose||0)+fx.dose);
    if(fx.disease){var pool=DISEASES.filter(function(d){return d.key!=="gnil"&&d.key!=="belaya"});var d=pool[rnd(pool.length)-1];cur.diseases=(cur.diseases||[]).concat([{key:d.key,name:d.name}]);ev.t+=" — "+d.name}
    if(fx.debt)cur.debts=(cur.debts||[]).concat([{id:uid(),to:fx.debtTo||"",amount:fx.debt}]);
    if(fx.item)patch(grantPatch(cur,cat,{cat:"item",name:fx.item,desc:"С жизненного пути"}));
    if(fx.imprint)cur.lifeImprint=(cur.lifeImprint||0)+fx.imprint;
    if(fx.maxHp)cur.bonusHp=(cur.bonusHp||0)+fx.maxHp;
    if(fx.prosthesis){var kind=fx.prosthesis==="roll"?(rnd(2)===1?"hvatka":"opora"):fx.prosthesis;ok=patch(giveSolution(cur,cat,kind==="hvatka"?{t:"hvatka"}:{t:"leg",grade:"new"}))&&ok;ev.t+=" — "+(kind==="hvatka"?"«Хватка»":"«Опора»")}
    if(fx.bracelet){if(cur.bracelet)ok=false;else cur.bracelet={model:fx.bracelet}}
    if(fx.cassette){var cs=CASSETTES.filter(function(x){return x.cls===fx.cassette&&!x.origOnly});var pick=cs[rnd(cs.length)-1];ok=patch(addCassette(cur,cat,pick.key,"copy"))&&ok;ev.t+=" — «"+pick.name+"»"}
    if(fx.weapon){var ws=buildShopDefaults().filter(function(i){return i.cat==="weapon"&&!i.notForSale&&i.price>0&&i.price<=fx.weapon});var wpn=ws[rnd(ws.length)-1];ok=patch(grantPatch(cur,cat,wpn))&&ok;ev.t+=" — "+wpn.name}
    if(fx.vehicle){cur.garage=(cur.garage||[]).concat([newVehicle(fx.vehicle,{name:"Мотоцикл без колеса",hull:0,wheelsHit:1,stopped:true})])}
    if(fx.enemy)contacts.push({kind:"enemy",who:fx.enemy,label:ev.label,t:fx.enemy});
    if(fx.friend)contacts.push({kind:"friend",who:fx.friend,label:ev.label,t:fx.friend});
    return ok;
  }
  (lp.roots||[]).forEach(function(r){lines.push(r.title+": "+r.t)});
  if((lp.inner||[]).length)lines.push("Кто ты внутри: "+lp.inner.map(function(r){return r.title+" — "+r.t}).join("; "));
  (lp.extra||[]).forEach(function(r){lines.push(r.title+": "+r.t)});
  (lp.years||[]).forEach(function(ev0){
    var ev=Object.assign({},ev0);var ok=applyFx(ev.fx,ev);
    if(ev.kind==="friend"||ev.kind==="enemy")contacts.push({kind:ev.kind,who:ev.who,nick:ev.nick||"",label:ev.label,t:ev.t});
    var line=ev.label+": "+ev.t+(ev.nick?" (кличка: "+ev.nick+")":"");
    if(!ok){line+=" — без эффекта: предел жизненного пути";skipped.push(ev.label)}
    lines.push(line);
  });
  var keys=["skills","lockedSkills","money","dose","diseases","debts","inventory","weapons","shields","lifeImprint","bonusHp","prostheses","solutions","bracelet","cassettes","garage"];
  var out={};keys.forEach(function(k){if(cur[k]!==c[k])out[k]=cur[k]});
  out.bio=[].concat(lines,(Array.isArray(c.bio)?c.bio:(c.bio?[c.bio]:[])));
  out.lifepath=Object.assign({},lp,{done:true});
  return{patch:out,lines:lines,contacts:contacts,skipped:skipped,skillsUsed:skillsUsed,moneyUsed:moneyUsed};
}

/* ── Правка мастером (после «Готово») ── */
/* Переброс одной строки корней / «кто ты внутри» / штриха */
function rollRootKey(origin,key,rnd){rnd=rnd||r1;var t=origin==="pre"?PRE_ROOTS:POST_ROOTS;if(!t[key])return null;var n=rnd(10);return{key:key,title:ROOT_TITLES[key],n:n,t:t[key][n-1]}}
function rollInnerKey(key,rnd){rnd=rnd||r1;if(!INNER[key])return null;var n=rnd(10);return{key:key,title:INNER_TITLES[key],n:n,t:INNER[key][n-1]}}
function rollExtra(key,rnd){rnd=rnd||r1;var tb=extraTable(key);if(!tb)return null;var n=rnd(tb.rows.length);return{key:key,title:tb.title,n:n,t:tb.rows[n-1]}}
/* Событие из выбранной таблицы: мастер добавляет его в годы */
var EVENT_KINDS=[
  {id:"pre_good",name:"Довоенные годы: удача"},{id:"pre_bad",name:"Довоенные годы: беда"},
  {id:"after_good",name:"После ударов: удача"},{id:"after_bad",name:"После ударов: беда"},
  {id:"child",name:"Детство"},{id:"friend",name:"Друг"},{id:"enemy",name:"Враг"},{id:"love",name:"Любовь"},
  {id:"quiet",name:"Тихие годы"},{id:"custom",name:"Своё событие (текст)"}
];
function rollEventKind(kind,label,rnd,text){
  rnd=rnd||r1;var ev;
  if(kind==="child"){var c=rnd(10);var ce=CHILDHOOD[c-1];ev={table:"child",kind:"child",rolls:[c],t:ce.t,fx:ce.fx}}
  else if(/^(pre|after)_(good|bad)$/.test(kind)){var tb=kind.indexOf("pre")===0?PRE_YEARS:AFTER;var good=/good$/.test(kind);var y=rnd(10);var it=(good?tb.good:tb.bad)[y-1];
    ev={table:kind.indexOf("pre")===0?"pre":"after",kind:good?"good":"bad",rolls:[y],t:(good?"Удача: ":"Беда: ")+it.t,fx:it.fx};if(it.fx&&it.fx.love){var lv=rollLove(rnd,true);ev.t+=". "+lv.t}}
  else if(kind==="friend")ev=rollFriend(rnd);
  else if(kind==="enemy")ev=rollEnemy(rnd);
  else if(kind==="love")ev=rollLove(rnd);
  else if(kind==="quiet")ev={kind:"quiet",rolls:[],t:"Тихие годы. Работал, ел, спал"};
  else ev={kind:"custom",rolls:[],t:text||"…"};
  return Object.assign({label:label||"",gm:true},ev);
}
/* Механика одного события (как на шаге 7, с теми же пределами) — патч листа */
function eventFxPatch(c,cat,ev,rnd){
  var r=applyLifepath(c,cat,{roots:[],inner:[],years:[ev]},rnd);var p=Object.assign({},r.patch);delete p.bio;delete p.lifepath;
  return{patch:p,skipped:r.skipped.length>0,line:r.lines[r.lines.length-1]};
}
/* Есть ли у события механика */
function hasFx(ev){return !!(ev&&ev.fx&&Object.keys(ev.fx).some(function(k){return k!=="love"}))}
/* Строки биографии, которые написал жизненный путь */
var LIFE_PREFIXES=Object.keys(ROOT_TITLES).map(function(k){return ROOT_TITLES[k]+":"}).concat(["Кто ты внутри:"],EXTRA_TABLES.map(function(t){return t.title+":"}));
function isLifeLine(l){l=String(l||"");return /^\d{4}–\d{4}:/.test(l)||LIFE_PREFIXES.some(function(p){return l.indexOf(p)===0})||/^[^:]{0,40}·\s?мастер:/.test(l)}
function lifeLines(lp){
  var lines=[];(lp.roots||[]).forEach(function(r){lines.push(r.title+": "+r.t)});
  if((lp.inner||[]).length)lines.push("Кто ты внутри: "+lp.inner.map(function(r){return r.title+" — "+r.t}).join("; "));
  (lp.extra||[]).forEach(function(r){lines.push(r.title+": "+r.t)});
  (lp.years||[]).forEach(function(ev){lines.push((ev.label?ev.label:"Событие · мастер")+": "+ev.t+(ev.nick?" (кличка: "+ev.nick+")":""))});
  return lines;
}
/* Переписать био: строки пути заново, остальное (что дописали руками) — как было */
function rebuildBio(c,lp){var bio=Array.isArray(c.bio)?c.bio:(c.bio?[c.bio]:[]);return lifeLines(lp).concat(bio.filter(function(l){return !isLifeLine(l)}))}

export { periods, rollRoots, rollInner, rollPeriod, rollYears, applyLifepath, rollRootKey, rollInnerKey, rollExtra, EVENT_KINDS, rollEventKind, eventFxPatch, hasFx, isLifeLine, lifeLines, rebuildBio };
