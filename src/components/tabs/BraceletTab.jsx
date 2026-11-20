import React, { useState } from 'react';
import { cF } from '../../utils/character';
import { getTraits } from '../../utils/traitStore';
import { BRACELETS, NOISE, IMPRINT_STAGES, CASS_KINDS, kindName } from '../../data/gear';
import { cassDef, cassLabel, salePrice, CONDITIONS, condName } from '../../utils/cassettes';
import { burnOnFail } from '../../utils/slep';
import { nestInfo, canInsert, solutionList, cassEffects, hasTablet } from '../../data/traits';
import { fakeOutcome, slepCheck, slepDC, inCombat } from '../../utils/gearFx';
import { patchFromShopItem } from '../../utils/gearOps';
import { tryPay } from '../../utils/currency';
import { r1 } from '../../utils/dice';
import { stName } from '../../data/stats';
import ShopPicker from '../ShopPicker';

function effText(effs){return (effs||[]).map(function(e){if(e.type==="stat_bonus")return "+"+e.amount+" "+stName(e.stat);if(e.type==="skill_bonus")return (e.amount>0?"+":"")+e.amount+" "+e.skill;if(e.type==="hp_flat")return (e.amount>0?"+":"")+e.amount+" Здоровье";return null}).filter(Boolean).join(", ")}

/* Вкладка «Браслет»: MG+ mind glider, гнёзда и кассеты. */
function BraceletTab(pr){
var c=pr.char;var sv=pr.save;var gm=!!pr.isGM;var cat=getTraits();var inf=cF(c);
var _n=useState(false);var showNoise=_n[0];var sShowNoise=_n[1];
var fighting=inCombat(pr.initiative,c._fbId)&&!gm;
var tablet=hasTablet(c);
var b=c.bracelet&&BRACELETS[c.bracelet.model]?BRACELETS[c.bracelet.model]:null;
var ni=nestInfo(c,cat);var cass=c.cassettes||[];
var who=c.name||"???";
function log(e){if(pr.addLog)pr.addLog(Object.assign({who:who,total:0,detail:""},e))}
function gmLog(label,detail){if(pr.addGmLog)pr.addGmLog({who:who,target:who,label:label,detail:detail||""})}
function upd(id,patch){sv(Object.assign({},c,{cassettes:cass.map(function(x){return x.id===id?Object.assign({},x,patch):x})}))}
function shownKind(x){return (!gm&&x.kind==="fake"&&!x.revealed)?"orig":x.kind}
function insert(x){
  if(fighting){alert("В бою кассеты не меняют");return}
  var chk=canInsert(c,x,cat);if(!chk.ok){alert(chk.reason);return}
  var def=cassDef(x,cat);
  var patch={inNest:true};
  if(gm&&x.kind==="fake"){
    var d=r1(10);var out=fakeOutcome(d);patch.fakeState=out;
    gmLog("Палёнка «"+def.name+"» вставлена","скрытый d10 = "+d+": "+(out==="silent"?"молчит":out==="copy"?"работает как копия":"шум и застряла"));
    if(out==="stuck"){var n=r1(10);patch.stuck=true;setTimeout(function(){log({type:"noise",label:"Шум кассеты «"+def.name+"» ("+n+")",detail:NOISE[n-1]+" · кассета застряла"})},10)}
  }
  upd(x.id,patch);
  log({type:"gear",label:"Вставил кассету «"+def.name+"»"});
}
function eject(x){
  if(fighting){alert("В бою кассеты не меняют");return}
  if(x.stuck&&!gm){alert("Кассета застряла — не вынимается до отдыха");return}
  var def=cassDef(x,cat);
  upd(x.id,{inNest:false,stuck:false,fakeState:null});
  log({type:"gear",label:"Вынул кассету «"+def.name+"»"});
}
/* Проверка стойкости слепка; scary — страшная сцена при Отпечатке 4+ (СЛ 16).
   При Отпечатке 4–5 провал сжигает очко Выдержки навсегда (п.20). */
function stability(x,scary){
  var def=cassDef(x,cat);var d=r1(10);var res=slepCheck(c,inf,x.id,d);
  var imp0=x.imprint||0;
  if(scary){res=Object.assign({},res,{dc:16,ok:res.total>=16,imprint:imp0})}
  var patch={cassettes:cass.map(function(k){return k.id===x.id?Object.assign({},k,{imprint:res.imprint}):k})};
  var burn=res.ok?null:burnOnFail(c,x,imp0);
  if(burn)Object.assign(patch,burn.patch);
  sv(Object.assign({},c,patch));
  var nm=scary?"Страшная сцена: стойкость слепка «"+def.name+"»":"Стойкость слепка «"+def.name+"»";
  log({type:"skill",label:nm+" — "+(res.ok?"устоял":"провал"),detail:"d10("+d+") + Воля + Выдержка"+(res.others?" − 2×"+res.others+" (другие слепки)":"")+" = "+res.total+(gm||tablet||scary?" против СЛ "+res.dc:""),total:res.total});
  if(burn)setTimeout(function(){log({type:"noise",label:burn.text})},10);
  if(!res.ok&&!scary)gmLog("Слепок «"+def.name+"»: Отпечаток +1","теперь "+res.imprint+" — "+IMPRINT_STAGES[res.imprint]);
  if(!res.ok&&scary)gmLog("Слепок «"+def.name+"»: страшная сцена провалена","до конца сцены телом распоряжается донор");
  if(pr.onRoll)pr.onRoll({label:scary?"Страшная сцена":"Стойкость слепка",d10:d,parts:[{label:"Воля",value:inf.fs.volya||0},{label:"Выдержка",value:inf.eSk["Выдержка"]||0}].concat(res.others?[{label:"Слепки",value:-2*res.others}]:[]),total:res.total,subtext:(res.ok?"Устоял":scary?"Провал — до конца сцены телом распоряжается донор":"Провал — плёнка берёт своё")+(burn?"\n"+burn.text:"")});
}
function buy(it){var pay=tryPay(c,it.price);if(pay===null)return;var p=patchFromShopItem(c,cat,it);if(p.error){alert(p.error);return}sv(Object.assign({},c,pay,p));log({type:"gear",label:"Купил: "+it.name})}

function recall(x){
  var def=cassDef(x,cat);
  if(!window.confirm("Отозвать кассету «"+def.name+"»?"))return;
  sv(Object.assign({},c,{cassettes:cass.filter(function(k){return k.id!==x.id})}));
  log({type:"gear",label:"Кассету «"+def.name+"» забрали"});
  gmLog("Отозвал кассету",cassLabel(x,def,true));
}
function reveal(x){
  var def=cassDef(x,cat);upd(x.id,{revealed:!x.revealed});
  if(!x.revealed){log({type:"gear",label:"Кассета «"+def.name+"» — палёнка",detail:"настоящий вид вскрыт"});gmLog("Показал настоящий вид",def.name+" — палёнка")}
}
function CassCard(x,inNest){
  var def=cassDef(x,cat);
  var kind=shownKind(x);var chk=inNest?null:canInsert(c,x,cat);
  var eff=effText(cassEffects(Object.assign({},x,{kind:kind}),def));
  var price=salePrice(Object.assign({},x,{kind:gm?x.kind:kind}),def);
  return(<div key={x.id} className="nest" style={inNest?null:{minHeight:0}}>
    <span className="n">{def.cls+" · "+def.cap+(x.year?" · "+x.year:"")}</span>
    <b>{def.name}</b>
    <span><span className={"kind "+kind}>{kindName(kind)}</span>{gm&&x.kind==="fake"&&!x.revealed&&<span className="kind slep" style={{marginLeft:4}}>{"палёнка"+(x.fakeState?": "+(x.fakeState==="silent"?"молчит":x.fakeState==="copy"?"как копия":"застряла"):"")}</span>}{x.condition&&x.condition!=="good"&&<span className="kind" style={{marginLeft:4,borderColor:"#e07a5a",color:"#e07a5a"}}>{condName(x.condition)}</span>}</span>
    {eff&&<span className="e">{eff}</span>}
    {def.text&&<span className="t">{def.text}</span>}
    {x.kind==="slep"&&(x.donor||x.donorSkill)&&<span className="t">{"Донор: "+(x.donor||"?")+(x.donorSkill?" · "+x.donorSkill+" +3":"")}</span>}
    {x.kind==="slep"&&x.donorKnows&&<span className="t">{"Знал: "+x.donorKnows}</span>}
    {x.kind==="slep"&&gm&&(x.quirk1||x.quirk3)&&<span className="t">{[x.quirk1?"1: "+x.quirk1:"",x.quirk3?"3: "+x.quirk3:""].filter(Boolean).join(" · ")}</span>}
    {x.kind==="slep"&&<span className="t">{"Отпечаток "+(x.imprint||0)+" · "+IMPRINT_STAGES[x.imprint||0]}<span className="imp" style={{marginTop:3}}>{[1,2,3,4,5].map(function(i){return <i key={i} className={(x.imprint||0)>=i?"on":""}/>})}</span></span>}
    {x.stuck&&<span className="t" style={{color:"#e07a5a"}}>застряла</span>}
    {x.dead&&<span className="t" style={{color:"#e07a5a"}}>испорчена</span>}
    {x.muted&&<span className="t" style={{color:"#e07a5a"}}>молчит до конца сцены</span>}
    {x.dud&&<span className="t" style={{color:"#e07a5a"}}>молчит</span>}
    <span className="t">{"Цена при продаже: "+price+" ер."}</span>
    {x.kind==="slep"&&inNest&&!x.fused&&<button className="btn sm" onClick={function(){stability(x)}}>{"Стойкость"+(gm||tablet?" · СЛ "+slepDC(x.imprint):"")}</button>}
    {x.kind==="slep"&&inNest&&!x.fused&&(x.imprint||0)>=4&&<button className="btn sm" title="Сцена, где страшно или больно" onClick={function(){stability(x,true)}}>Страшная сцена · СЛ 16</button>}
    {x.fused&&<span className="t" style={{color:"#f0d79a"}}>Сплав: донор и носитель — одно</span>}
    {inNest
      ?<button className="btn sm" disabled={fighting||((x.stuck||x.fused)&&!gm)} onClick={function(){eject(x)}}>Вынуть</button>
      :<button className="btn sm" disabled={fighting||!chk.ok} title={chk.reason} onClick={function(){insert(x)}}>Вставить</button>}
    {!inNest&&!chk.ok&&<span className="t" style={{color:"#f0d79a"}}>{chk.reason}</span>}
    {gm&&<div style={{display:"flex",gap:4,flexWrap:"wrap",borderTop:"1px dashed #4a4236",paddingTop:5}}>
      <select value={x.kind} onChange={function(e){upd(x.id,{kind:e.target.value,fakeState:null,fakeAs:e.target.value==="fake"?"orig":null,revealed:false,capacity:e.target.value==="slep"?128:x.capacity})}} style={{fontSize:12,padding:"2px 4px"}}>{CASS_KINDS.map(function(k){return <option key={k.id} value={k.id}>{k.name}</option>})}</select>
      <select value={x.condition||"good"} onChange={function(e){upd(x.id,{condition:e.target.value})}} style={{fontSize:12,padding:"2px 4px"}}>{CONDITIONS.map(function(k){return <option key={k.id} value={k.id}>{k.name}</option>})}</select>
      {x.kind==="slep"&&<React.Fragment><button className="btn sm" onClick={function(){upd(x.id,{imprint:Math.max(0,(x.imprint||0)-1)})}}>отп −</button><button className="btn sm" onClick={function(){upd(x.id,{imprint:Math.min(5,(x.imprint||0)+1)})}}>отп +</button></React.Fragment>}
      {x.kind==="fake"&&<button className="btn sm" title="После удачной Техники СЛ 16" onClick={function(){reveal(x)}}>{x.revealed?"Снова скрыть":"Показать настоящий вид"}</button>}
      <button className="btn sm" onClick={function(){upd(x.id,{stuck:!x.stuck})}}>{x.stuck?"отлипла":"застряла"}</button>
      <button className="btn sm" onClick={function(){upd(x.id,{muted:!x.muted})}}>{x.muted?"звучит":"молчит"}</button>
      <button className="btn sm" onClick={function(){upd(x.id,{dead:!x.dead})}}>{x.dead?"цела":"испорчена"}</button>
      <button className="btn sm" onClick={function(){recall(x)}}>Отозвать</button>
    </div>}
  </div>);
}

var inN=cass.filter(function(x){return x.inNest});var outN=cass.filter(function(x){return !x.inNest});
var sols=solutionList(c,cat).filter(function(x){return x.nest>0});
var nestCells=[];
if(b){
  if(ni.blocked){for(var q=0;q<ni.total;q++)nestCells.push(<div key={"k"+q} className="nest limb"><span className="n">{"гнездо "+(q+1)}</span><b>Корпус</b></div>)}
  else{
    sols.forEach(function(s2,i){for(var k=0;k<s2.nest;k++)nestCells.push(<div key={"s"+i+"_"+k} className="nest limb"><span className="n">солюшн</span><b>{s2.name}</b></div>)});
    inN.forEach(function(x){nestCells.push(CassCard(x,true))});
    for(var f=0;f<ni.free;f++)nestCells.push(<div key={"e"+f} className="nest empty">пустое гнездо</div>);
  }
}
return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
{!b&&<div className="warnbox">Браслета нет. Без MG+ mind glider кассеты не читаются.</div>}
{b&&<div className="bracelet">
  <div className="bhead">
    <div><h3>MG+ mind glider</h3><span className="lblm">ct14inc · {"читает "+b.reads.join(", ")}</span></div>
    <div className="bscreen">{b.name.toUpperCase()+" · "+ni.free+"/"+ni.total+" свободно"}</div>
  </div>
  {fighting&&<div className="warnbox">Идёт бой — кассеты менять нельзя.</div>}
  <div className="nests">{nestCells}</div>
  {ni.solutions+ni.cassettes>ni.total&&<div className="warnbox">Гнёзд меньше, чем занято: мастеру стоит проверить лист.</div>}
</div>}
{gm&&<div className="row"><span className="lblm">Модель браслета (мастер):</span>
  <select value={(c.bracelet&&c.bracelet.model)||""} onChange={function(e){sv(Object.assign({},c,{bracelet:e.target.value?{model:e.target.value}:null}))}}><option value="">нет</option>{Object.keys(BRACELETS).map(function(m){return <option key={m} value={m}>{m+" · "+BRACELETS[m].nests+" гнёзд"}</option>})}</select>
</div>}
<div className="sec">
  <h3>Кассетница</h3>
  {outN.length===0&&<p className="hint">Свободных кассет нет.</p>}
  {outN.length>0&&<div className="nests">{outN.map(function(x){return CassCard(x,false)})}</div>}
  {!gm&&<ShopPicker color="#4f5b2a" label="Купить кассету или браслет" items={(pr.shop||[]).filter(function(i){return (i.cat==="cassette"||(i.cat==="solution"&&i.sol==="bracelet"))&&!i.notForSale})} sub={function(it){return it.desc||""}} onPick={buy}/>}
</div>
<div className="sec">
  <div className="row" style={{justifyContent:"space-between"}}><h3>Таблица шумов</h3><button className="btn sm" onClick={function(){sShowNoise(!showNoise)}}>{showNoise?"Скрыть":"Показать"}</button></div>
  <p className="hint">Срыв на броске навыка, усиленного копией или слепком, — шум. Результат пишется в лог, мастер применяет его сам.</p>
  {showNoise&&<div className="log">{NOISE.map(function(n,i){return <div key={i} className="logrow" style={{gridTemplateColumns:"28px 1fr"}}><span className="tm">{i+1}</span><span>{n}</span></div>})}</div>}
</div>
</div>)}

export default BraceletTab;
