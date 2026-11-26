/* Состояния на персонаже или NPC: t.conds = [{key, left, src}].
   left — сколько ещё своих ходов (null — до снятия). Отсчёт — в начале
   хода владельца: left 0 — состояние снимается. */
import { CONDITIONS, condByKey } from '../data/conditions';
import { r1 } from './dice';

function sumDice(expr,rnd){var m=String(expr||'').match(/(\d+)d(\d+)/);if(!m)return 0;var t=0;for(var i=0;i<parseInt(m[1]);i++)t+=rnd(parseInt(m[2]));return t}
function condsOf(t){return ((t&&t.conds)||[]).filter(function(x){return x&&condByKey(x.key)})}
function hasCond(t,k){return condsOf(t).some(function(x){return x.key===k})}
/* Эффекты состояний для движка (как у критов) */
function condEffects(t){
  var out=[];condsOf(t).forEach(function(x){var d=condByKey(x.key);(d.effects||[]).forEach(function(e){out.push(Object.assign({},e,{src:{from:"cond",name:d.name}}))})});
  return out;
}
/* Наложить: повтор обновляет счётчик */
function addCond(t,k,src){
  var d=condByKey(k);if(!d)return condsOf(t);
  var rest=condsOf(t).filter(function(x){return x.key!==k});
  return rest.concat([{key:k,left:d.turns==null?null:d.turns,src:src||""}]);
}
function removeCond(t,k){return condsOf(t).filter(function(x){return x.key!==k})}
/* Начало хода владельца: урон от огня, пропуск хода, отсчёт.
   Возвращает {conds, dmg, skip, ended:[имена снятых], notes:[]}. */
function condTurnStart(t,rnd){
  rnd=rnd||r1;var dmg=0,skip=false,ended=[],notes=[];var next=[];
  condsOf(t).forEach(function(x){
    var d=condByKey(x.key);
    if(x.left===0){ended.push(d.name);return}
    if(d.dot){var n=sumDice(d.dot,rnd);dmg+=n;notes.push(d.name+": −"+n+" Здоровья")}
    if(d.skip){skip=true;notes.push("пропускает ход")}
    next.push(x.left==null?x:Object.assign({},x,{left:x.left-1}));
  });
  return{conds:next,dmg:dmg,skip:skip,ended:ended,notes:notes};
}
/* Отдых снимает всё */
function condsAfterRest(){return []}
function condLabel(x){var d=condByKey(x.key);if(!d)return "";return d.name+(x.left==null?"":x.left===0?" · последний ход":" · ещё "+(x.left+1)+" х.")}

export { CONDITIONS, condByKey, condsOf, hasCond, condEffects, addCond, removeCond, condTurnStart, condsAfterRest, condLabel };
