import React, { useState } from 'react';
import { db, ref, set } from '../firebase';
import { getTraits } from '../utils/traitStore';
import { periods, rollRoots, rollInner, rollPeriod, applyLifepath } from '../utils/lifepath';
import { LIFE_SKILL_CAP, LIFE_MONEY_CAP } from '../data/lifepath';
import { yearsWord } from '../utils/creation';

/* Шаг 7 создания: жизненный путь. Бросаются корни, «кто ты внутри» и
   пятилетки; эффекты применяются разом на «Готово» с пределами книги.
   Перебросить можно только с разрешения мастера (c.lifepathReroll). */
function LifepathStep(pr){
var c=pr.char;var sv=pr.save;var cat=getTraits();
var _lp=useState(function(){return Object.assign({roots:[],inner:[],years:[]},c.lifepath||{})});var lp=_lp[0];var sLp=_lp[1];
var reroll=!!c.lifepathReroll;
var per=periods(c.origin,c.age);
function put(n){sLp(n);sv(Object.assign({},c,{lifepath:n}))}
var preview=applyLifepath(c,cat,lp,function(){return 1});
function rollRow(i){var y=lp.years.slice();y[i]=rollPeriod(per[i]);put(Object.assign({},lp,{years:y}))}
function setNick(i,v){var y=lp.years.slice();y[i]=Object.assign({},y[i],{nick:v});sLp(Object.assign({},lp,{years:y}))}
var allYears=per.every(function(p,i){return lp.years[i]});
var ready=lp.roots.length&&lp.inner.length&&allYears;
function done(){
  if(!ready){alert("Брось корни, «Кто ты внутри» и все пятилетки");return}
  var r=applyLifepath(c,cat,lp);
  sv(Object.assign({},c,r.patch,{lifepathReroll:false}));
  var who=c.name||"???";
  /* Друзья и враги — в бестиарий мастера, папка «Связи игроков» */
  if(pr.room)r.contacts.forEach(function(k,i){
    var id="npc_link_"+Date.now().toString(36)+"_"+i;var nm=(k.nick||k.who);
    set(ref(db,"rooms/"+pr.room+"/npcTemplates/Связи игроков/"+id),{name:nm+" ("+(k.kind==="friend"?"друг":"враг")+" "+who+")",level:1,hp:24,maxHp:24,xpReward:24,owner:c._fbId,ownerName:who,kind:k.kind,faction:null,
      stats:{telo:5,reak:5,vosp:5,razum:4,har:4,volya:5},skills:{},extraSkills:{},weapons:[],armorHead:"none",armorHeadHp:0,armorHeadMaxHp:0,armorBody:"none",armorBodyHp:0,armorBodyMaxHp:0,shieldType:"none",shieldHp:0,shieldMaxHp:0,note:(k.label?k.label+": ":"")+k.t});
  });
  if(pr.room)set(ref(db,"rooms/"+pr.room+"/npcTemplates/Связи игроков/_created"),Date.now());
  if(pr.addLog)pr.addLog({who:who,type:"give",label:who+": жизненный путь записан",detail:r.lines.slice(-per.length).join(" · ")+(r.skipped.length?" · без эффекта (предел): "+r.skipped.join(", "):""),total:0});
}
function Row(p){return <div className="logrow" style={{gridTemplateColumns:"110px 1fr"}}><span className="tm">{p.title}</span><span>{p.children}</span></div>}
var sectionBtn=function(label,has,onClick){return <button className="btn" disabled={has&&!reroll} title={has&&!reroll?"Перебросить можно только с разрешения мастера":""} onClick={onClick}>{has?"Перебросить":label}</button>};

return(<div className="zc-main"><div className="zc-scroll">
<div style={{background:"var(--paper)",padding:14,display:"flex",flexDirection:"column",gap:12}}>
  <div className="row" style={{justifyContent:"space-between"}}><span className="lblm">Создание персонажа · шаг 7 из 7</span><span className="lblm">Жизненный путь</span></div>
  <h2>{(c.name||"?")+", "+(c.age?yearsWord(c.age):"")}</h2>
  <p className="hint">Кубы пишут твою биографию: откуда ты, кто остался из родни, кому ты должен и кто ждёт тебя с ножом. Всё, что выпало, мастер может вытащить в игру.{reroll?" Мастер разрешил переброс.":" Перебросить можно только с разрешения мастера."}</p>
  <div className="sec"><div className="row" style={{justifyContent:"space-between"}}><h3>{c.origin==="pre"?"Корни довоенного":"Корни послевоенного"}</h3>{sectionBtn("Бросить корни",lp.roots.length>0,function(){put(Object.assign({},lp,{roots:rollRoots(c.origin)}))})}</div>
    {lp.roots.length>0&&<div className="log">{lp.roots.map(function(r){return <Row key={r.key} title={r.title+" · "+r.n}>{r.t}</Row>})}</div>}</div>
  <div className="sec"><div className="row" style={{justifyContent:"space-between"}}><h3>Кто ты внутри</h3>{sectionBtn("Кто ты внутри",lp.inner.length>0,function(){put(Object.assign({},lp,{inner:rollInner()}))})}</div>
    {lp.inner.length>0&&<div className="log">{lp.inner.map(function(r){return <Row key={r.key} title={r.title+" · "+r.n}>{r.t}</Row>})}</div>}</div>
  <div className="sec"><h3>{"Годы · пятилеток: "+per.length}</h3>
    <p className="hint">{c.origin==="pre"?"Довоенный: с пятнадцати лет до 2012-го — «Довоенные годы», потом четыре броска «После ударов».":"Послевоенный: за каждые пять полных лет; первые два — «Детство», остальные — «После ударов»."}{" 1–4 удача или беда, 5–7 друг или враг, 8–9 любовь, 10 тихие годы."}</p>
    <div className="log">{per.map(function(p,i){var ev=lp.years[i];var tbl=p.table==="child"?"детство":p.table==="pre"?"довоенные":"после ударов";
      return <div key={i} className="logrow" style={{gridTemplateColumns:"110px 1fr auto"}}><span className="tm">{p.from+"–"+p.to+" · "+tbl}</span>
        <span>{ev?<React.Fragment>{ev.t}{ev.rolls?<span className="mono" style={{color:"var(--muted)",fontSize:11}}>{" ["+ev.rolls.join(", ")+"]"}</span>:null}
          {(ev.kind==="friend"||ev.kind==="enemy")&&<input className="n-input" style={{marginTop:4,minHeight:30}} placeholder={"Кличка "+(ev.kind==="friend"?"друга":"врага")} value={ev.nick||""} onChange={function(e){setNick(i,e.target.value)}} onBlur={function(){put(lp)}}/>}</React.Fragment>:<span className="hint">не брошено</span>}</span>
        <button className="btn sm" disabled={!!ev&&!reroll} onClick={function(){rollRow(i)}}>{ev?"Заново":"Бросить"}</button></div>})}</div>
  </div>
  <div className={preview.skipped.length?"warnbox":"okbox"}>{"Предел: навыки +"+preview.skillsUsed+" из +"+LIFE_SKILL_CAP+", деньги "+preview.moneyUsed+" из "+LIFE_MONEY_CAP+" ер."+(preview.skipped.length?" Сверх предела — без эффекта: "+preview.skipped.join(", ")+".":"")}</div>
  <div><button className="btn main" disabled={!ready} onClick={done}>Готово — записать в биографию</button></div>
</div>
</div></div>)}

export default LifepathStep;
