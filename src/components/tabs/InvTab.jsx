import React, { useState } from 'react';
import { uid, r1 } from '../../utils/dice';
import { cF, hpOf, willOf } from '../../utils/character';
import { priceNum, fmtMoney, tryPay } from '../../utils/currency';
import LiveField from '../LiveField';
import { diseaseFlag } from '../../data/gear';

/* "NdM" -> сумма броска */
function rollDice(d){var m=(""+d).match(/(\d+)d(\d+)/);if(!m)return r1(4);var n=parseInt(m[1])||1,f=parseInt(m[2])||4,t=0;for(var i=0;i<n;i++)t+=r1(f);return t}

var ITEM_SUBORDER=["potion","ammo","repair","misc"];
var ITEM_SUBLABEL={potion:"Расходники",ammo:"Боеприпасы",repair:"Ремкомплекты",misc:"Вещи"};
function itemSubOf(it){if(it.heal||it.doseHeal)return"potion";if(it.ptype||it.cat==="ammo")return"ammo";if(it.dice||it.cat==="tool")return"repair";return"misc"}

/* Сумка: вещи, расходники, деньги. Логика базы, валюта — одна (ер.). */
function InvTab(pr){var c=pr.char;var sv=pr.save;var _a=useState("");var ni=_a[0];var sNI=_a[1];var _sp=useState(false);var spOpen=_sp[0];var sSpOpen=_sp[1];
var _cg=useState({});var collapsedGroups=_cg[0];var sCG=_cg[1];
var shopItems=(pr.shop||[]).filter(function(i){return (i.cat==="item"||i.cat==="tool"||i.cat==="ammo")&&!i.notForSale});
var money=c.money||0;var inv=c.inventory||[];

function addLocal(){if(!ni.trim())return;sv(Object.assign({},c,{inventory:inv.concat([{id:uid(),name:ni.trim(),qty:1,equipped:false}])}));sNI("")}

/* Расходники: бинты лечат Здоровье (heal), синька снимает Дозу (doseHeal),
   healWill — Волю. Тратятся и пишутся в лог. */
function useItem(idx){
  var it=inv[idx];if(!it||(!it.heal&&!it.doseHeal))return;
  var patch={};var label,sub,amt=0;var fs=cF(c).fs;
  if(it.doseHeal){
    if(/синьк/i.test(it.name||"")&&diseaseFlag(c,"noSinka")){alert("Белая кровь: синька не снимает Дозу");return}
    amt=parseInt(it.doseHeal)||0;var nd=Math.max(0,(c.dose||0)-amt);patch.dose=nd;
    label=it.name+": Доза −"+amt;sub="Доза: "+(c.dose||0)+" → "+nd;
  } else {
    amt=rollDice(it.heal);if(!it.healWill&&diseaseFlag(c,"healHalf"))amt=Math.floor(amt/2);
    if(it.healWill){var w=willOf(c,fs);patch.curWill=Math.min(w.max,w.cur+amt);label=it.name+": +"+amt+" Воли";sub="Восстановлено Воли: +"+amt}
    else{var h=hpOf(c,fs);patch.curHp=Math.min(h.max,h.cur+amt);label=it.name+": +"+amt+" Здоровья";sub="Восстановлено Здоровья: +"+amt}
  }
  patch.inventory=inv.map(function(i,j){return j===idx?Object.assign({},i,{qty:(i.qty||0)-1}):i}).filter(function(i){return i.qty>0});
  sv(Object.assign({},c,patch));
  if(pr.addLog)pr.addLog({who:c.name||"???",type:"rest",label:label,detail:it.heal||"",total:amt});
  if(pr.onRoll)pr.onRoll({label:it.name,d10:null,parts:[],total:amt,subtext:sub});
}

function pickItem(it){
  var pay=tryPay(c,it.price);if(pay===null)return;var patch=Object.assign({},pay);
  var ptype=it.ptype||(it.cat==="ammo"?"Пуля":"");
  var dice=it.dice||(it.cat==="tool"?"1d4":"");
  var heal=it.heal||"";var doseHeal=it.doseHeal||0;
  var n=inv.slice();
  if(ptype){
    var bundle=it.bundleQty||1;
    var ex=n.find(function(i){return i.proj&&i.ptype===ptype});
    if(ex){n=n.map(function(i){return i===ex?Object.assign({},i,{qty:(i.qty||0)+bundle}):i})}
    else{n=n.concat([{id:uid(),name:it.name,qty:bundle,equipped:false,proj:true,ptype:ptype}])}
  } else if(dice){
    n=n.concat([{id:uid(),name:it.name,qty:1,equipped:false,tool:true,dice:dice}]);
  } else if(heal||doseHeal){
    var exH=n.find(function(i){return i.name===it.name&&(i.heal||"")===heal&&(i.doseHeal||0)===doseHeal});
    if(exH){n=n.map(function(i){return i===exH?Object.assign({},i,{qty:(i.qty||0)+1}):i})}
    else{n=n.concat([{id:uid(),name:it.name,qty:1,equipped:false,heal:heal,healWill:!!it.healWill,doseHeal:doseHeal}])}
  } else {
    n=n.concat([Object.assign({id:uid(),name:it.name,qty:1,equipped:false},it.charges!=null?{charges:it.charges}:{},it.desc?{desc:it.desc}:{})]);
  }
  patch.inventory=n;
  sv(Object.assign({},c,patch));
  sSpOpen(false);
}
function setQty(idx,d){sv(Object.assign({},c,{inventory:inv.map(function(i,j){return j===idx?Object.assign({},i,{qty:Math.max(0,(i.qty||0)+d)}):i}).filter(function(i){return i.qty>0})}))}

return(<div style={{display:"flex",flexDirection:"column",gap:8}}>
<div className="row" style={{background:"var(--paper)",border:"1px solid var(--ink)",padding:"6px 10px"}}>
  <span className="lblm">Еврорубли</span>
  <span className="pm" style={{marginLeft:0}}>{[-10,-1].map(function(d){return <button key={d} style={{width:34}} onClick={function(){sv(Object.assign({},c,{money:Math.max(0,money+d)}))}}>{d}</button>})}</span>
  <LiveField type="number" min="0" value={money} onCommit={function(val){sv(Object.assign({},c,{money:Math.max(0,parseInt(val)||0)}))}} style={{width:84,textAlign:"center",fontFamily:"var(--f-mono)",fontSize:16}}/>
  <span className="pm" style={{marginLeft:0}}>{[1,10].map(function(d){return <button key={d} style={{width:34}} onClick={function(){sv(Object.assign({},c,{money:money+d}))}}>{"+"+d}</button>})}</span>
  <span className="mono">ер.</span>
</div>
<div className="row">
<input className="n-input" style={{flex:1,minWidth:120}} value={ni} onChange={function(e){sNI(e.target.value)}} placeholder="Своя вещь…" onKeyDown={function(e){if(e.key==="Enter")addLocal()}}/>
<button className="btn" onClick={addLocal}>Добавить</button>
<button className="btn main" onClick={function(){sSpOpen(!spOpen)}}>{spOpen?"Закрыть каталог":"Из каталога"}</button>
</div>
{spOpen&&<div style={{background:"var(--paper)",border:"1px solid var(--ink)",padding:8,display:"flex",flexDirection:"column",gap:4}}>
{shopItems.length===0&&<div className="hint" style={{textAlign:"center",padding:6}}>Пусто — мастер ещё не добавил вещи</div>}
{ITEM_SUBORDER.map(function(sk){
var list=shopItems.filter(function(it){return itemSubOf(it)===sk});
if(!list.length)return null;
var collapsed=collapsedGroups[sk]!==undefined?collapsedGroups[sk]:list.length>6;
return(<div key={sk} style={{display:"flex",flexDirection:"column",gap:3}}>
<button onClick={function(){sCG(function(cg){var n=Object.assign({},cg);n[sk]=!collapsed;return n})}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",padding:"4px 1px",marginTop:3}}>
<span className="lblm" style={{color:"var(--swamp)"}}>{ITEM_SUBLABEL[sk]}</span>
<span className="lblm">{(collapsed?"показать ":"скрыть ")+list.length}</span>
</button>
{!collapsed&&list.map(function(it){var ptype=it.ptype||(it.cat==="ammo"?"Пуля":"");var dice=it.dice||(it.cat==="tool"?"1d4":"");var cost=priceNum(it.price);
return(<div key={it.id} style={{display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid var(--line)",padding:"5px 2px"}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700}}>{it.name}{cost>0?<span className="mono" style={{fontSize:12,color:"var(--swamp)",marginLeft:8}}>{fmtMoney(cost)}</span>:null}</div>
<div className="hint">{[it.desc,ptype?("снаряд: "+ptype+(it.bundleQty>1?" ×"+it.bundleQty:"")):null,dice?"починка "+dice:null,it.heal?("+"+it.heal+(it.healWill?" Воли":" Здоровья")):null,it.doseHeal?("−"+it.doseHeal+" Дозы"):null].filter(Boolean).join(" · ")}</div>
</div>
<button className="btn sm" onClick={function(){pickItem(it)}}>Взять</button>
</div>)})}
</div>)})}
</div>}
{inv.length===0&&<p className="hint">Сумка пуста.</p>}
<div className="log">
{inv.map(function(it,idx){var usable=it.heal||it.doseHeal;return <div key={(it.id!=null?it.id:"i")+"_"+idx} style={{display:"flex",alignItems:"center",gap:6,borderBottom:"1px solid var(--line)",padding:"5px 0",flexWrap:"wrap"}}>
<button title="Отметить «при себе»" onClick={function(){sv(Object.assign({},c,{inventory:inv.map(function(i,j){return j===idx?Object.assign({},i,{equipped:!i.equipped}):i})}))}} style={{width:22,height:22,border:"1px solid var(--ink)",background:it.equipped?"var(--ink)":"var(--paper)",padding:0}}/>
<span style={{flex:1,minWidth:90}}>{it.name}{it.heal?<span className="mono" style={{fontSize:11,color:"var(--swamp)",marginLeft:6}}>{"+"+it.heal}</span>:null}{it.doseHeal?<span className="mono" style={{fontSize:11,color:"var(--swamp)",marginLeft:6}}>{"−"+it.doseHeal+" Дозы"}</span>:null}{it.proj?<span className="mono" style={{fontSize:11,color:"var(--muted)",marginLeft:6}}>{it.ptype}</span>:null}{it.desc?<span className="hint" style={{display:"block",fontSize:12}}>{it.desc}</span>:null}</span>
{usable&&<button className="btn sm" onClick={function(){useItem(idx)}}>Применить</button>}{it.charges!=null&&<button className="btn sm" disabled={it.charges<=0} title="Списать одно применение" onClick={function(){sv(Object.assign({},c,{inventory:inv.map(function(i,j){return j===idx?Object.assign({},i,{charges:Math.max(0,(i.charges||0)-1)}):i})}));if(pr.addLog)pr.addLog({who:c.name||"???",type:"rest",label:it.name+": применение ("+(it.charges-1)+" осталось)",detail:it.desc||"",total:0})}}>{"Применить · "+it.charges}</button>}
<span className="pm" style={{marginLeft:0}}><button onClick={function(){setQty(idx,-1)}}>−</button></span>
<b className="mono" style={{minWidth:22,textAlign:"center"}}>{it.qty}</b>
<span className="pm" style={{marginLeft:0}}><button onClick={function(){setQty(idx,1)}}>+</button></span>
<button title="Выбросить" onClick={function(){sv(Object.assign({},c,{inventory:inv.filter(function(i,j){return j!==idx})}))}} style={{background:"none",border:"none",color:"var(--rust)",fontSize:15,padding:"0 4px"}}>✕</button>
</div>})}
</div>
</div>)}

export default InvTab;
