/* Слепок ест носителя (ТЗ v4, п.20): выгорание Выдержки, захват, сплав. */
import { skCost, NPC_SK } from '../data/stats';

var VYD="Выдержка";
function burnedOf(c){return Math.max(0,(c&&c.burned)||0)}
/* Итоговая Выдержка = купленная − сгоревшая */
function vydOf(c){return Math.max(0,((c&&c.skills&&c.skills[VYD])||0)-burnedOf(c))}
function slepsIn(c){return ((c&&c.cassettes)||[]).filter(function(x){return x&&x.inNest&&x.kind==="slep"&&!x.dead})}
function donorName(x){return (x&&(x.donor||x.title||x.key))||"?"}

/* Проваленная стойкость: при Отпечатке 4–5 (до броска) сгорает очко Выдержки */
function burnOnFail(c,x,imprintBefore){
  if((imprintBefore||0)<4)return null;
  var b=burnedOf(c)+1;var left=Math.max(0,((c.skills||{})[VYD]||0)-b);
  return{patch:{burned:b},left:left,text:"Слепок «"+donorName(x)+"» съел очко Выдержки (осталось "+left+")"};
}

/* Что мастер должен решить: захват (Выдержка 0) или Край (Отпечаток 5) */
function slepDecision(c){
  if(!c||c.captured)return null;
  var sl=slepsIn(c);if(!sl.length&&!burnedOf(c))return null;
  var v=vydOf(c);
  if(burnedOf(c)>0&&v<=0)return{type:"zero",cass:sl[0]||null,donor:donorName(sl[0]),fusion:false};
  var edge=sl.find(function(x){return (x.imprint||0)>=5&&!x.fused});
  if(edge)return{type:"edge",cass:edge,donor:donorName(edge),fusion:v>=3};
  return null;
}

/* «Восстановить»: после чистки (слепка нет) или при Отпечатке 0, раз за уровень */
function restoreState(c){
  var b=burnedOf(c);if(!b)return{show:false};
  var sl=slepsIn(c);var clean=sl.length===0||sl.every(function(x){return !(x.imprint||0)});
  var cost=skCost(VYD);
  if(!clean)return{show:false};
  if(c.vydRestoredAt===c.level)return{show:true,ok:false,reason:"уже восстанавливал на этом уровне"};
  if((c.skillPts||0)<cost)return{show:true,ok:false,reason:"нужно "+cost+" очка навыков"};
  return{show:true,ok:true,cost:cost};
}
function restorePatch(c){var s=restoreState(c);if(!s.ok)return null;return{burned:burnedOf(c)-1,skillPts:(c.skillPts||0)-s.cost,vydRestoredAt:c.level}}

/* Захват: лист помечается, а донор появляется в списке NPC мастера */
function captureNpc(c,inf,x){
  var fs=inf.fs;var es=inf.eSk;var donor=donorName(x);
  var skills={};NPC_SK.forEach(function(s){var v=es[s.l]||0;if(v)skills[s.k]=v});
  var hp=((fs.telo||0)+(fs.reak||0))*2+(c.hpRoll||0)+(c.levelHp||0);
  return{name:donor+" (в теле: "+(c.name||"?")+")",level:c.level||1,hp:hp,maxHp:hp,xpReward:hp*2,faction:null,zoneMult:null,halfKR:false,ironCrit:false,
    stats:Object.assign({},fs),skills:skills,extraSkills:{},weapons:(c.weapons||[]).slice(0,3),
    note:"Захвачен донором слепка «"+donor+"»"+(x&&x.donorSkill?". Навык донора: "+x.donorSkill+" +3":"")+(x&&x.donorKnows?". Знал: "+x.donorKnows:""),
    armorHead:"none",armorHeadHp:0,armorHeadMaxHp:0,armorHeadName:"",armorBody:"none",armorBodyHp:0,armorBodyMaxHp:0,armorBodyName:"",
    shieldType:"none",shieldHp:0,shieldMaxHp:0,shieldName:""};
}

export { VYD, burnedOf, vydOf, slepsIn, donorName, burnOnFail, slepDecision, restoreState, restorePatch, captureNpc };
