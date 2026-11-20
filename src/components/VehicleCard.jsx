import React from 'react';
import { speedOf, modSlots } from '../utils/vehicles';
import { modByKey } from '../data/vehicleMods';

var ARMOR_NAME={none:"—",light:"лёгкая",medium:"средняя",heavy:"тяжёлая"};
/* Карточка машины: корпус, броня, скорость, управляемость, места, бак, таран, состояние */
function VehicleCard(pr){
  var v=pr.v;var pct=v.maxHull>0?Math.max(0,Math.min(100,(v.hull/v.maxHull)*100)):0;
  var state=[v.stopped?"стоит":null,v.wheelsHit?(v.wheelsHit>=2?"два колеса пробиты":"колесо пробито: −2 к Вождению"):null,v.speedLoss?"мотор: Скорость −"+v.speedLoss:null,v.burning?"горит: всем внутри 1d6 в раунд":null,v.outOfFuel?"бак пуст":null].filter(Boolean);
  return <div className="card"><div className="ch"><b>{v.name}</b><span>{pr.sub||""}</span></div><div className="cb">
    <div><div className="lblm" style={{display:"flex",justifyContent:"space-between"}}><span>Корпус</span><b style={{color:"var(--ink)"}}>{v.hull+" / "+v.maxHull}</b></div><div className="bar"><i className={pct<50?"warn":""} style={{width:pct+"%"}}/></div></div>
    <dl className="kv">
      <dt>Броня</dt><dd>{ARMOR_NAME[v.armorType||"none"]+(v.armorType&&v.armorType!=="none"?", "+(v.armorHp||0)+"/"+(v.maxArmorHp||v.armorHp||0):"")}</dd>
      <dt>Скорость</dt><dd>{speedOf(v)+(v.speedLoss?" (из "+v.speed+")":"")}</dd>
      <dt>Управляемость</dt><dd>{(v.handling>0?"+":"")+v.handling}</dd>
      <dt>Мест</dt><dd>{v.seats}</dd><dt>Бак</dt><dd>{v.noFuel?"трава":(v.fuel!=null?v.fuel:v.tank)+" / "+v.tank+" перег."+((v.fuel!=null&&v.fuel<=0)?" · пусто":"")}</dd><dt>Таран</dt><dd>{v.ram}</dd>
      {(v.mount||v.weapon)&&<React.Fragment><dt>Станок</dt><dd>{(v.mount||v.weapon).name+" "+(v.mount||v.weapon).dmgDice+" "+(v.mount||v.weapon).dmgType}</dd></React.Fragment>}
      <dt>Обвес</dt><dd>{((v.mods||[]).map(function(k){var m=modByKey(k);return m?m.name:k}).join(", ")||"—")+" · слотов "+(v.mods||[]).length+"/"+modSlots(v)}</dd>
      {pr.driverName&&<React.Fragment><dt>За рулём</dt><dd>{pr.driverName}</dd></React.Fragment>}
    </dl>
    {v.note&&<p className="hint">{v.note}</p>}
    {(v.mods||[]).length>0&&<p className="hint">{(v.mods||[]).map(function(k){var m=modByKey(k);return m?m.name+": "+m.effect:""}).join(" · ")}</p>}
    {state.length>0&&<div className="warnbox">{state.join(" · ")}</div>}
    {pr.children}
  </div></div>;
}
export default VehicleCard;
