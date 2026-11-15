import React from 'react';
import { cF } from '../../utils/character';
import { rollHit } from '../../utils/dice';
import { driverRoll, repairHull, repairPartBonus, fixPart } from '../../utils/vehicles';
import { getScene } from '../../utils/sceneStore';
import { tryPay } from '../../utils/currency';
import { newVehicle } from '../../data/vehicles';
import ShopPicker from '../ShopPicker';
import VehicleCard from '../VehicleCard';

/* Вкладка «Гараж»: машины персонажа (Буханка Водилы, купленные, выданные). */
function GarageTab(pr){
var c=pr.char;var sv=pr.save;var gm=!!pr.isGM;var inf=cF(c);var g=c.garage||[];var who=c.name||"???";
function log(e){if(pr.addLog)pr.addLog(Object.assign({who:who,total:0,detail:""},e))}
function upd(id,patch){sv(Object.assign({},c,{garage:g.map(function(v){return v.id===id?Object.assign({},v,patch):v})}))}
function setV(v){sv(Object.assign({},c,{garage:g.map(function(x){return x.id===v.id?v:x})}))}
function drv(){return{reak:inf.fs.reak||0,driving:inf.eSk["Вождение"]||0,pen:inf.rollPen("reak").total}}
function roll(v){var r=driverRoll(drv(),v,{swamp:getScene().swamp});log({type:"skill",label:"Бросок водителя: "+v.name+(r.crit?" · крит":r.fumble?" · срыв":""),detail:"d10("+r.d+") + "+r.parts.map(function(p){return p.label+"("+p.value+")"}).join(" + ")+" = "+r.total,total:r.total});if(pr.onRoll)pr.onRoll({label:"Бросок водителя",d10:r.d,crit:r.crit,fumble:r.fumble,parts:r.parts,total:r.total,subtext:v.name})}
function hasItem(re){return (c.inventory||[]).some(function(i){return re.test(i.name||"")&&(i.qty||0)>0})}
function repair(v,tool){if(!gm&&!hasItem(tool==="wire"?/проволок/i:/ящик инструмент/i)){alert(tool==="wire"?"Нужна проволока с изолентой в сумке":"Нужен ящик инструментов в сумке");return}var r=repairHull(v,tool);setV(r.v);log({type:"rest",label:v.name+": ремонт за час, Корпус +"+r.add,detail:(tool==="wire"?"проволока 1d4":"ящик 1d6")+" · "+r.v.hull+"/"+r.v.maxHull,total:r.add})}
function fix(v,part){var R=rollHit();var bon=repairPartBonus(v);var pen=inf.rollPen("razum");var t=R.d+(inf.fs.razum||0)+(inf.eSk["Механика"]||0)+bon+pen.total;var ok=t>=14;if(ok)setV(fixPart(v,part));
  log({type:"skill",label:v.name+": ремонт "+(part==="motor"?"мотора":"колеса")+" — "+(ok?"готово":"не вышло"),detail:"d10("+R.d+") + Разум + Механика"+(bon?" + "+bon+" (буханка)":"")+(pen.total?" + штраф("+pen.total+")":"")+" = "+t+" против СЛ 14",total:t});
  if(pr.onRoll)pr.onRoll({label:"Механика · СЛ 14",d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:"Разум",value:inf.fs.razum||0},{label:"Механика",value:inf.eSk["Механика"]||0}].concat(bon?[{label:"Буханка",value:bon}]:[]).concat(pen.parts),total:t,subtext:ok?"Починено":"Не вышло"})}
function buy(it){var pay=tryPay(c,it.price);if(pay===null)return;var nv=newVehicle(it.gearKey);if(!nv){alert("Нет такой машины");return}sv(Object.assign({},c,pay,{garage:g.concat([nv])}));log({type:"gear",label:"Купил машину: "+nv.name})}
function toggleDrive(v){var on=v.driverId!==c._fbId;sv(Object.assign({},c,{garage:g.map(function(x){return Object.assign({},x,{driverId:x.id===v.id&&on?c._fbId:(x.driverId===c._fbId?null:x.driverId)})})}));log({type:"gear",label:who+(on?" садится за руль: ":" выходит из-за руля: ")+v.name})}
return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <h2>Гараж</h2>
  <p className="hint">Обычная езда проверок не требует. Бросок водителя — в погоне, на таране, в топи и на развороте под огнём: Реакция + Вождение + Управляемость + d10. Погоню и таран ведёт мастер.</p>
  {g.length===0&&<p className="hint">Машин нет. Купи ниже из каталога или попроси мастера выдать.</p>}
  <div className="cards">{g.map(function(v){var driving=v.driverId===c._fbId;return <VehicleCard key={v.id} v={v} sub={driving?"ты за рулём":""} driverName={driving?who:null}>
    <div className="row">
      <button className={"btn sm"+(driving?" main":"")} onClick={function(){toggleDrive(v)}}>{driving?"Выйти из-за руля":"За руль"}</button>
      <button className="btn sm" onClick={function(){roll(v)}}>Бросок водителя</button>
      {v.burning&&<button className="btn sm" onClick={function(){upd(v.id,{burning:false});log({type:"rest",label:v.name+": пожар потушен"})}}>Потушить</button>}
    </div>
    {(v.hull<v.maxHull||v.speedLoss||v.wheelsHit)&&<div className="row">
      {v.hull<v.maxHull&&<button className="btn sm" onClick={function(){repair(v,"tools")}}>Ящик: +1d6</button>}
      {v.hull<v.maxHull&&<button className="btn sm" onClick={function(){repair(v,"wire")}}>Проволока: +1d4</button>}
      {v.speedLoss>0&&<button className="btn sm" onClick={function(){fix(v,"motor")}}>Мотор · СЛ 14</button>}
      {v.wheelsHit>0&&<button className="btn sm" onClick={function(){fix(v,"wheel")}}>Колесо · СЛ 14</button>}
    </div>}
    {gm&&<div className="row"><span className="lblm">Мастер:</span>{[-5,-1,1,5].map(function(d){return <button key={d} className="btn sm" onClick={function(){upd(v.id,{hull:Math.max(0,Math.min(v.maxHull,v.hull+d))})}}>{"Корпус "+(d>0?"+":"")+d}</button>})}<button className="btn sm" onClick={function(){upd(v.id,{stopped:!v.stopped})}}>{v.stopped?"Поехала":"Встала"}</button><button className="btn sm" onClick={function(){if(window.confirm("Убрать машину из гаража?"))sv(Object.assign({},c,{garage:g.filter(function(x){return x.id!==v.id})}))}}>Убрать</button></div>}
  </VehicleCard>})}</div>
  {!gm&&(pr.shop||[]).filter(function(i){return i.cat==="vehicle"&&!i.notForSale}).length===0&&<p className="hint">В каталоге пока нет машин — попроси мастера добавить стартовый каталог.</p>}
  {!gm&&<ShopPicker color="#4f5b2a" label="Купить машину" items={(pr.shop||[]).filter(function(i){return i.cat==="vehicle"})} sub={function(it){return it.desc||""}} onPick={buy}/>}
  <p className="hint">Горючка: канистра на 20 л — один перегон буханке или джипу, два — мотоциклу. Ремонт Корпуса — за час работы; мотор и колесо — Механика СЛ 14.</p>
</div>)}

export default GarageTab;
