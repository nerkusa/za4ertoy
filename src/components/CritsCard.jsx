import React from 'react';
import { rollHit } from '../utils/dice';
import { cF } from '../utils/character';

/* Статусы критов на листе: игрок видит и может остановить кровотечение
   (жгут или Медицина СЛ 12), мастер снимает любой статус вручную. */
function CritsCard(pr){
var c=pr.char;var sv=pr.save;var gm=!!pr.isGM;var crits=c.crits||[];
if(!crits.length)return null;
var who=c.name||"???";
function drop(id){sv(Object.assign({},c,{crits:crits.filter(function(x){return x.id!==id})}))}
function tourniquet(x){
  var inv=c.inventory||[];var idx=inv.findIndex(function(i){return /жгут/i.test(i.name||"")&&(i.qty||0)>0});
  if(idx<0){alert("Жгута в сумке нет");return}
  var ninv=inv.map(function(i,j){return j===idx?Object.assign({},i,{qty:(i.qty||0)-1}):i}).filter(function(i){return (i.qty||0)>0});
  sv(Object.assign({},c,{inventory:ninv,crits:crits.filter(function(k){return k.id!==x.id})}));
  if(pr.addLog)pr.addLog({who:who,type:"rest",label:who+": кровотечение остановлено жгутом",detail:"",total:0});
}
function medicine(x){
  var inf=cF(c);var R=rollHit();var pen=inf.rollPen("razum");var t=R.d+(inf.fs.razum||0)+(inf.eSk["Медицина"]||0)+pen.total;var ok=t>=12;
  if(ok)drop(x.id);
  if(pr.addLog)pr.addLog({who:who,type:"skill",label:"Медицина против кровотечения — "+(ok?"остановлено":"не вышло"),detail:"d10("+R.d+") + Разум + Медицина"+(pen.total?" + штраф("+pen.total+")":"")+" = "+t+" против СЛ 12",total:t});
  if(pr.onRoll)pr.onRoll({label:"Медицина · СЛ 12",d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:"Разум",value:inf.fs.razum||0},{label:"Медицина",value:inf.eSk["Медицина"]||0}].concat(pen.parts),total:t,subtext:ok?"Кровь остановлена":"Кровь идёт"});
}
function tick(x,field){var v=Math.max(0,(x[field]||0)-1);sv(Object.assign({},c,{crits:v>0?crits.map(function(k){return k.id===x.id?Object.assign({},k,(function(){var o={};o[field]=v;return o})()):k}):crits.filter(function(k){return k.id!==x.id})}))}
return(<div className="sec rust">
<h3>Раны и криты</h3>
{crits.map(function(x){return <div key={x.id} className="row" style={{justifyContent:"space-between",borderBottom:"1px dashed var(--line)",paddingBottom:6}}>
  <span style={{minWidth:0,flex:1}}><b>{x.name}</b>{x.side?<span className="lblm">{x.side==="L"?" · левая":" · правая"}</span>:null}<br/><span className="hint">{x.text}{x.roundsLeft?" · осталось раундов: "+x.roundsLeft:""}{x.skipLeft?" · пропусков хода: "+x.skipLeft:""}{x.gmFlag?" · решает мастер":""}{x.until==="rest"?" · снимется отдыхом":""}</span></span>
  <span className="row">
    {x.bleed&&<button className="btn sm" onClick={function(){tourniquet(x)}}>Жгут</button>}
    {x.bleed&&<button className="btn sm" onClick={function(){medicine(x)}}>Медицина СЛ 12</button>}
    {x.roundsLeft&&<button className="btn sm" onClick={function(){tick(x,"roundsLeft")}}>Раунд прошёл</button>}
    {x.skipLeft&&<button className="btn sm" onClick={function(){tick(x,"skipLeft")}}>Ход пропущен</button>}
    {gm&&<button className="btn sm" onClick={function(){drop(x.id)}}>Снять</button>}
  </span>
</div>})}
{crits.some(function(x){return x.bleed})&&<p className="hint">Кровотечение снимает Здоровье само в начале каждого твоего хода.</p>}
</div>)}

export default CritsCard;
