import React from 'react';
import { cF } from '../../utils/character';
import { rollHit } from '../../utils/dice';
import { driverRoll, repairHull, repairPartBonus, fixPart, refuel, refuelAmount, sumDice, movingPen } from '../../utils/vehicles';
import { getScene } from '../../utils/sceneStore';
import { tryPay } from '../../utils/currency';
import { newVehicle, normalizeVehicle } from '../../data/vehicles';
import { myVehicles } from '../../utils/garage';
import ShopPicker from '../ShopPicker';
import VehicleCard from '../VehicleCard';
import SignsStrip from '../SignsStrip';
import { lastRollPatch } from '../../utils/signs';

/* Вкладка «Машина»: свои машины и машины партии (ТЗ v4, п.16.3). */
function GarageTab(pr){
var c=pr.char;var sv=pr.save;var gm=!!pr.isGM;var inf=cF(c);var g=c.garage||[];var who=c.name||"???";
var node=pr.vehicles||{};var list=myVehicles(c,node);
function log(e){if(pr.addLog)pr.addLog(Object.assign({who:who,total:0,detail:""},e))}
/* Сохранить машину туда, где она лежит; extra — доп. поля листа (расход вещей) */
function setV(e,v,extra){
  var nv=normalizeVehicle(v);
  if(e.owner.type==="char"){sv(Object.assign({},c,extra||{},{garage:g.map(function(x){return x.id===nv.id?nv:x})}));return}
  if(pr.saveVehicle)pr.saveVehicle(nv.id,nv);if(extra)sv(Object.assign({},c,extra));
}
function upd(e,patch){setV(e,Object.assign({},e.v,patch))}
function drv(){return{reak:inf.fs.reak||0,driving:inf.eSk["Вождение"]||0,pen:inf.rollPen("reak").total}}
function roll(v){var r=driverRoll(drv(),v,{swamp:getScene().swamp});sv(Object.assign({},c,lastRollPatch("Вождение","reak",r.d,r.total,pr.initiative,"Вождение")));log({type:"skill",label:"Бросок водителя: "+v.name+(r.crit?" · крит":r.fumble?" · срыв":""),detail:"d10("+r.d+") + "+r.parts.map(function(p){return p.label+"("+p.value+")"}).join(" + ")+" = "+r.total,total:r.total});if(pr.onRoll)pr.onRoll({label:"Бросок водителя",d10:r.d,crit:r.crit,fumble:r.fumble,parts:r.parts,total:r.total,subtext:v.name})}
/* Расход вещи из сумки: null — нет такой */
function useItem(re){var inv=c.inventory||[];var it=inv.find(function(i){return re.test(i.name||"")&&(i.qty||0)>0});if(!it)return null;
  return{inventory:inv.map(function(i){return i===it?Object.assign({},i,{qty:(i.qty||0)-1}):i}).filter(function(i){return !(i.qty!=null&&i.qty<=0)})}}
function repair(e,tool){var v=e.v;var use=useItem(tool==="wire"?/проволок/i:/ящик инструмент/i);if(!use&&!gm){alert(tool==="wire"?"Нужна проволока с изолентой в сумке":"Нужен ящик инструментов в сумке");return}
  var r=repairHull(v,tool);setV(e,r.v,use||undefined);log({type:"rest",label:v.name+": ремонт за час, Корпус +"+r.add,detail:(tool==="wire"?"проволока 1d4":"ящик инструментов 1d6")+(use?" (потрачено)":"")+" · "+r.v.hull+"/"+r.v.maxHull,total:r.add})}
function fix(e,part){var v=e.v;var R=rollHit();var bon=repairPartBonus(v);var pen=inf.rollPen("razum");var t=R.d+(inf.fs.razum||0)+(inf.eSk["Механика"]||0)+bon+pen.total;var ok=t>=14;if(ok)setV(e,fixPart(v,part));
  log({type:"skill",label:v.name+": ремонт "+(part==="motor"?"мотора":v.tracks?"гусеницы":"колеса")+" — "+(ok?"готово":"не вышло"),detail:"d10("+R.d+") + Разум + Механика"+(bon?" + "+bon+" (буханка)":"")+(pen.total?" + штраф("+pen.total+")":"")+" = "+t+" против СЛ 14",total:t});
  if(pr.onRoll)pr.onRoll({label:"Механика · СЛ 14",d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:"Разум",value:inf.fs.razum||0},{label:"Механика",value:inf.eSk["Механика"]||0}].concat(bon?[{label:"Буханка",value:bon}]:[]).concat(pen.parts),total:t,subtext:ok?"Починено":"Не вышло"})}
function fuel(e){var v=e.v;var use=useItem(/канистр/i);if(!use&&!gm){alert("Нужна канистра горючки в сумке");return}var r=refuel(v);if(r.error){alert(r.error);return}
  setV(e,r.v,use||undefined);log({type:"gear",label:v.name+": заправка +"+r.add+" перег.",detail:"бак "+r.v.fuel+"/"+r.v.tank+(use?" · канистра потрачена":"")})}
function buy(it){var pay=tryPay(c,it.price);if(pay===null)return;var nv=newVehicle(it.gearKey,{owner:{type:"char",id:c._fbId}});if(!nv){alert("Нет такой машины");return}sv(Object.assign({},c,pay,{garage:g.concat([nv])}));log({type:"gear",label:"Купил машину: "+nv.name})}
/* За руль: водитель у машины один; сам — только за одним рулём */
function toggleDrive(e){
  var v=e.v;var on=v.driverId!==c._fbId;
  var garage=g.map(function(x){if(x.id===v.id&&e.owner.type==="char")return Object.assign({},x,{driverId:on?c._fbId:null});return x.driverId===c._fbId?Object.assign({},x,{driverId:null}):x});
  if(JSON.stringify(garage)!==JSON.stringify(g))sv(Object.assign({},c,{garage:garage}));
  Object.keys(node).forEach(function(id){var x=node[id];if(!x)return;if(id===v.id&&e.owner.type!=="char")pr.saveVehicle(id,Object.assign({},x,{driverId:on?c._fbId:null}));else if(x.driverId===c._fbId)pr.saveVehicle(id,Object.assign({},x,{driverId:null}))});
  log({type:"gear",label:who+(on?" садится за руль: ":" выходит из-за руля: ")+v.name});
}
function shootMount(e){var v=e.v;var m=v.mount;if(!m)return;var R=rollHit();var moving=getScene().moving;var drive=v.driverId===c._fbId;
  var noPen=v.sidecar||(v.mods||[]).indexOf("stanok")>=0||v.loopholes;var mp=moving?(drive?movingPen(true,false):(noPen?0:-2)):0;
  var t=R.d+(inf.fs.reak||0)+(inf.eSk["Огнестрел"]||0)+mp+inf.rollPen("reak").total;var dmg=sumDice(m.dmgDice);
  log({type:"attack",label:"Станок: "+m.name+" ("+v.name+") — атака "+t,detail:"d10("+R.d+") + Реакция + Огнестрел"+(mp?" "+mp+" на ходу":"")+" = "+t+" · урон "+dmg+" "+m.dmgType,total:t});
  if(pr.onRoll)pr.onRoll({label:"Станок: "+m.name,d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:"Реакция",value:inf.fs.reak||0},{label:"Огнестрел",value:inf.eSk["Огнестрел"]||0}].concat(mp?[{label:"На ходу",value:mp}]:[]),total:t,subtext:"Урон "+dmg+" "+m.dmgType})}
function driverName(v){if(!v.driverId)return null;if(v.driverId===c._fbId)return who;var d=(pr.characters||[]).find(function(x){return x._fbId===v.driverId});return d?d.name:"кто-то"}
return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <h2>Машина</h2>
  {(c.signs||[]).length>0&&<SignsStrip char={c} save={sv} addLog={pr.addLog} onRoll={pr.onRoll} initiative={pr.initiative} isGM={gm}/>}
  <p className="hint">Обычная езда проверок не требует. Бросок водителя — в погоне, на таране, в топи и на развороте под огнём: Реакция + Вождение + Управляемость + d10. Погоню, таран и перегоны ведёт мастер.</p>
  {list.length===0&&<p className="hint">Машин нет — ни своей, ни у партии. Купи ниже или попроси мастера выдать.</p>}
  <div className="cards">{list.map(function(e){var v=e.v;var driving=v.driverId===c._fbId;return <VehicleCard key={e.ref} v={v} sub={(e.owner.type==="party"?"машина партии":"твоя")+(driving?" · ты за рулём":"")} driverName={driverName(v)}>
    <div className="row">
      <button className={"btn sm"+(driving?" main":"")} onClick={function(){toggleDrive(e)}}>{driving?"Выйти из-за руля":"Сесть за руль"}</button>
      <button className="btn sm" onClick={function(){roll(v)}}>Бросок водителя</button>
      {!v.noFuel&&<button className="btn sm" disabled={(v.fuel||0)>=(v.tank||0)} title={"Канистра: +"+refuelAmount(v)+" перег."} onClick={function(){fuel(e)}}>{"Заправить +"+refuelAmount(v)}</button>}
      {v.mount&&<button className="btn sm" onClick={function(){shootMount(e)}}>{"Станок: "+v.mount.name}</button>}
      {v.burning&&<button className="btn sm" onClick={function(){upd(e,{burning:false});log({type:"rest",label:v.name+": пожар потушен"})}}>Потушить</button>}
    </div>
    {(v.hull<v.maxHull||v.speedLoss||v.wheelsHit)&&<div className="row">
      {v.hull<v.maxHull&&<button className="btn sm" onClick={function(){repair(e,"tools")}}>Ящик: +1d6</button>}
      {v.hull<v.maxHull&&<button className="btn sm" onClick={function(){repair(e,"wire")}}>Проволока: +1d4</button>}
      {v.speedLoss>0&&<button className="btn sm" onClick={function(){fix(e,"motor")}}>Мотор · СЛ 14</button>}
      {v.wheelsHit>0&&<button className="btn sm" onClick={function(){fix(e,"wheel")}}>{(v.tracks?"Гусеница":"Колесо")+" · СЛ 14"}</button>}
    </div>}
  </VehicleCard>})}</div>
  {!gm&&<ShopPicker color="#4f5b2a" label="Купить машину" items={(pr.shop||[]).filter(function(i){return i.cat==="vehicle"})} sub={function(it){return it.desc||""}} onPick={buy}/>}
  <p className="hint">Бак считается в перегонах. Канистра — +1 перегон (мотоциклу и квадроциклу +2). Ремонт Корпуса — за час: ящик инструментов 1d6 или проволока 1d4, вещь тратится. Мотор и колесо — Механика СЛ 14.</p>
</div>)}

export default GarageTab;
