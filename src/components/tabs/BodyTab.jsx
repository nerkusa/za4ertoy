import React, { useState } from 'react';
import { cF } from '../../utils/character';
import { getTraits } from '../../utils/traitStore';
import { getProfs } from '../../utils/profStore';
import { ORIGINS, originOf } from '../../data/professions';
import { IRON_STAGES, UPKEEP, DISEASES, doseState, diseaseList, diseaseByKey } from '../../data/gear';
import { findBy, solutionList, ironSteps, upkeepCount } from '../../data/traits';
import { inCombat } from '../../utils/gearFx';
import { patchFromShopItem, removeSolution, setTip, setTipBroken } from '../../utils/gearOps';
import { tryPay, fmtMoney } from '../../utils/currency';
import { rollHit } from '../../utils/dice';
import ShopPicker from '../ShopPicker';
import LiveField from '../LiveField';

function AccountCard(pr){
var _cp=useState("");var curPass=_cp[0];var sCurPass=_cp[1];
var _nl=useState(pr.login);var newLogin=_nl[0];var sNewLogin=_nl[1];
var _np=useState("");var newPass=_np[0];var sNewPass=_np[1];
var _np2=useState("");var newPass2=_np2[0];var sNewPass2=_np2[1];
var _st=useState(null);var status=_st[0];var sStatus=_st[1];
var _bz=useState(false);var busy=_bz[0];var sBusy=_bz[1];
function submit(){
  if(!curPass){sStatus({ok:false,text:"Введи текущий пароль"});return}
  if(newPass&&newPass!==newPass2){sStatus({ok:false,text:"Новые пароли не совпадают"});return}
  sBusy(true);sStatus(null);
  pr.changeAccount(curPass,newLogin.trim(),newPass||null).then(function(res){
    sBusy(false);
    if(!res.ok){sStatus({ok:false,text:res.error||"Не удалось изменить аккаунт"});return}
    sStatus({ok:true,text:"Сохранено"});sCurPass("");sNewPass("");sNewPass2("")
  })
}
return(<div className="sec">
<h3>Аккаунт</h3>
<div className="n-field"><label>Логин</label><input className="n-input" value={newLogin} onChange={function(e){sNewLogin(e.target.value)}}/></div>
<div className="n-field"><label>Текущий пароль</label><input className="n-input" type="password" value={curPass} onChange={function(e){sCurPass(e.target.value)}}/></div>
<div className="row">
  <div className="n-field" style={{flex:1,minWidth:140}}><label>Новый пароль</label><input className="n-input" type="password" value={newPass} onChange={function(e){sNewPass(e.target.value)}} placeholder="пусто — не менять"/></div>
  <div className="n-field" style={{flex:1,minWidth:140}}><label>Повтори новый пароль</label><input className="n-input" type="password" value={newPass2} onChange={function(e){sNewPass2(e.target.value)}}/></div>
</div>
{status&&<div style={{fontSize:13,fontWeight:700,color:status.ok?"var(--ok)":"var(--rust)"}}>{status.text}</div>}
<div><button onClick={submit} disabled={busy} className="btn main">{busy?"Сохраняю…":"Сохранить"}</button></div>
</div>)}

/* Вкладка «Тело»: происхождение и профессия, Доза и болезни, солюшны и цена железа. */
function BodyTab(pr){
var c=pr.char;var sv=pr.save;var gm=!!pr.isGM;var cat=getTraits();var inf=cF(c);var fs=inf.fs;
var canEditId=gm||!c.locked;
var fighting=inCombat(pr.initiative,c._fbId)&&!gm;
var org=originOf(c.origin);var profs=getProfs();var pf=profs.find(function(p){return p.id===c.profession})||profs[0];
var s=c.solutions||{};var arm=s.arm;var steps=ironSteps(c,cat);var upk=upkeepCount(c,cat)*UPKEEP;
var dose=c.dose||0;var dis=diseaseList(c);
var _d=useState(DISEASES[0].key);var newDis=_d[0];var sNewDis=_d[1];
var who=c.name||"???";
function log(e){if(pr.addLog)pr.addLog(Object.assign({who:who,total:0,detail:""},e))}
function apply(p,label){if(p.error){alert(p.error);return false}sv(Object.assign({},c,p));if(label)log({type:"gear",label:label});return true}
function buy(it){var pay=tryPay(c,it.price);if(pay===null)return;var p=patchFromShopItem(c,cat,it,Math.floor((fs.telo||0)/2));if(p.error){alert(p.error);return}sv(Object.assign({},c,pay,p));log({type:"gear",label:"Купил: "+it.name})}
function changeTip(k){if(fighting){alert("В бою насадки не меняют");return}var t=findBy(cat.tips,k);apply(setTip(c,cat,k),"Сменил насадку: "+(t?t.name:k))}
function payWeek(){if(upk<=0)return;var pay=tryPay(c,upk);if(pay===null)return;sv(Object.assign({},c,pay));log({type:"gear",label:"Оплатил уход за железом: "+fmtMoney(upk)})}
function foodCheck(){
  var R=rollHit();var pen=inf.rollPen("vosp");var t=R.d+(fs.vosp||0)+(inf.eSk["Выживание"]||0)+pen.total;var ok=t>=12;
  log({type:"skill",label:"Проверить еду — "+(ok?"чисто (успех)":"не понял (провал)"),detail:"d10("+R.d+") + Восприятие("+(fs.vosp||0)+") + Выживание("+(inf.eSk["Выживание"]||0)+")"+(pen.total?" + штраф("+pen.total+")":"")+" = "+t+" против СЛ 12",total:t});
  if(pr.onRoll)pr.onRoll({label:"Проверить еду",d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:"Восприятие",value:fs.vosp||0},{label:"Выживание",value:inf.eSk["Выживание"]||0}].concat(pen.parts),total:t,subtext:"СЛ 12: "+(ok?"УСПЕХ":"ПРОВАЛ")});
}
var solShop=(pr.shop||[]).filter(function(i){return i.cat==="solution"&&i.sol!=="bracelet"&&!i.notForSale});
var list=solutionList(c,cat);

return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div className="zc-two">
<div className="sec">
  <h3>Происхождение и профессия</h3>
  <div className="row">
    <div className="n-field" style={{flex:1,minWidth:140}}><label>Происхождение</label><select className="n-input" disabled={!canEditId} value={c.origin||"post"} onChange={function(e){sv(Object.assign({},c,{origin:e.target.value,curHp:null}))}}>{ORIGINS.map(function(o){return <option key={o.id} value={o.id}>{o.name+" · "+o.age}</option>})}</select></div>
    <div className="n-field" style={{flex:1,minWidth:140}}><label>Профессия</label><select className="n-input" disabled={!canEditId} value={c.profession||"none"} onChange={function(e){sv(Object.assign({},c,{profession:e.target.value}))}}>{profs.map(function(p){return <option key={p.id} value={p.id}>{p.name}</option>})}</select></div>
  </div>
  <dl className="kv">
    <dt>{org.name}</dt><dd>{org.rules.join("; ")+"."}</dd>
    {pf.id!=="none"&&<React.Fragment><dt>{pf.name}</dt><dd>{"+2 к навыкам: "+(pf.skills||[]).join(", ")+"."}</dd><dt>Набор</dt><dd>{pf.kit}</dd></React.Fragment>}
  </dl>
  <p className="hint">Бонусы происхождения и профессии к навыкам вписываются в лист вручную при создании. Здоровье −5 у довоенного считается само.</p>
</div>
<div className="sec rust">
  <h3>Доза и болезни</h3>
  <div className="row"><span className="lblm">Доза</span><b className="mono">{dose+" / 10"}</b>{doseState(dose)&&<span className="pill" style={{borderColor:"var(--rust)",color:"var(--rust)"}}>{doseState(dose)}</span>}
    <span className="pm"><button onClick={function(){sv(Object.assign({},c,{dose:Math.max(0,dose-1)}))}}>−</button><button onClick={function(){sv(Object.assign({},c,{dose:Math.min(10,dose+1)}))}}>+</button></span></div>
  <p className="hint">4–6 «Мутит»: −1 ко всем броскам. 7–9 «Горячка пятна»: −2. 10 — «Край». При Дозе 4+ отдых не восстанавливает Здоровье.</p>
  <div style={{display:"flex",flexDirection:"column",gap:6}}>{dis.length===0&&<span className="hint">Болезней нет.</span>}{dis.map(function(d){return <div key={d.key} style={{borderLeft:"3px solid var(--rust)",paddingLeft:8}}>
    <div className="row" style={{justifyContent:"space-between"}}><b>{d.name}</b>{gm&&<button className="btn sm" onClick={function(){sv(Object.assign({},c,{diseases:(c.diseases||[]).filter(function(x){var k=typeof x==="string"?x:(x.key||x.name);return k!==d.key&&k!==d.name})}))}}>Вылечена</button>}</div>
    <div className="hint">{d.text+". Лечение: "+d.cure+"."}</div></div>})}</div>
  {gm&&<div className="row"><select value={newDis} onChange={function(e){sNewDis(e.target.value)}}>{DISEASES.map(function(d){return <option key={d.key} value={d.key}>{d.name}</option>})}</select><button className="btn sm" onClick={function(){var d=diseaseByKey(newDis);if(d&&!dis.some(function(x){return x.key===d.key}))sv(Object.assign({},c,{diseases:(c.diseases||[]).concat([{key:d.key,name:d.name}])}))}}>Добавить болезнь</button></div>}
  <div className="row"><button className="btn" onClick={foodCheck}>Проверить еду · СЛ 12</button></div>
  <p className="hint">Бинты (+1d6 Здоровья) и синька (−2 Дозы) лежат в сумке и применяются оттуда.</p>
</div>
</div>

<div className="sec">
  <h3>Солюшны · Ампутейшен Солюшнс</h3>
  {fighting&&<div className="warnbox">Идёт бой — насадки менять нельзя.</div>}
  {list.length===0&&<p className="hint">Железа нет.</p>}
  <div className="cards">
  {arm&&arm.grade!=="hvatka"&&<div className="card"><div className="ch"><b>Протез руки</b><span>{(arm.grade==="rebuilt"?"перебранный":"новый")+" · гнездо"}</span></div><div className="cb">
    <div className="n-field"><label>Насадка в замке</label><select className="n-input" disabled={fighting} value={arm.tip||""} onChange={function(e){changeTip(e.target.value)}}>{(arm.tips||["kist"]).map(function(k){var t=findBy(cat.tips,k);return <option key={k} value={k}>{t?t.name:k}</option>})}</select></div>
    {(function(){var t=findBy(cat.tips,arm.tip);if(!t)return null;var eff=(t.effects||[]).map(function(e){return (e.amount>0?"+":"")+e.amount+" "+(e.skill||e.stat)}).join(", ");return <p>{[eff,t.text,t.weapon?"оружие: "+t.weapon.dmgDice+" "+t.weapon.dmgType:null].filter(Boolean).join(" · ")||"без эффекта"}</p>})()}
    {arm.broken&&<div className="warnbox">Насадка сломана — бонуса нет, пока не починят.</div>}
    {arm.grade==="rebuilt"&&<p className="hint">Перебранный: насадка ломается не только на срыве, но и на базовой 2.</p>}
    <p className="hint">Срыв на броске, где сработал бонус насадки, ломает её. Менять — только вне боя.</p>
    {gm&&<div className="row"><button className="btn sm" onClick={function(){apply(setTipBroken(c,cat,!arm.broken),arm.broken?"Насадка починена":"Насадка сломана")}}>{arm.broken?"Починена":"Сломать"}</button><button className="btn sm" onClick={function(){var g=arm.grade==="rebuilt"?"new":"rebuilt";sv(Object.assign({},c,{solutions:Object.assign({},s,{arm:Object.assign({},arm,{grade:g})})}))}}>{arm.grade==="rebuilt"?"Сделать новым":"Сделать перебранным"}</button><button className="btn sm" onClick={function(){if(window.confirm("Снять протез руки?"))apply(removeSolution(c,cat,{t:"arm"}))}}>Снять</button></div>}
  </div></div>}
  {arm&&arm.grade==="hvatka"&&<div className="card"><div className="ch"><b>«Хватка»</b><span>временный · без гнезда</span></div><div className="cb"><p>−2 к тонкой работе: Механика, Медицина, Воровство.</p>{gm&&<div><button className="btn sm" onClick={function(){apply(removeSolution(c,cat,{t:"arm"}))}}>Снять</button></div>}</div></div>}
  {s.leg&&<div className="card"><div className="ch"><b>Нога «Опора»</b><span>гнездо</span></div><div className="cb"><p>Протез ноги.</p>{gm&&<div><button className="btn sm" onClick={function(){apply(removeSolution(c,cat,{t:"leg"}))}}>Снять</button></div>}</div></div>}
  {list.filter(function(x){return x.def}).map(function(x){var d=x.def;var eff=(d.effects||[]).map(function(e){return e.type==="stat_set"?"Тело "+e.value:((e.amount>0?"+":"")+e.amount+" "+(e.skill||e.stat))}).join(", ");
    return <div key={x.key} className="card"><div className="ch"><b>{d.name}</b><span>{d.kind==="addon"?"накладное":d.kind==="full"?"полная замена · "+d.steps+" шага":"вживляемое · гнездо"}</span></div><div className="cb"><p>{[eff,d.text].filter(Boolean).join(" · ")||"—"}</p>
    {d.depo&&<p className="hint">{"Заряд: "+(c.depoCharge!=null?c.depoCharge:1)+". Кнопка — во вкладке «Бой»."}{gm&&<button className="btn sm" style={{marginLeft:8}} onClick={function(){sv(Object.assign({},c,{depoCharge:1,combatDepoUsed:false}))}}>Перезарядить</button>}</p>}
    {gm&&<div><button className="btn sm" onClick={function(){apply(removeSolution(c,cat,{t:"implant",key:x.key}))}}>Снять</button></div>}</div></div>})}
  </div>
  {(s.addons||[]).length>Math.floor((fs.telo||0)/2)&&<div className="warnbox">{"Накладного больше, чем Тело/2 ("+Math.floor((fs.telo||0)/2)+")."}</div>}
  {!gm&&<ShopPicker color="#4f5b2a" label="Купить солюшн" items={solShop} subOf={function(it){return it.sol==="implant"?(it.kind2||"implant"):it.sol}} suborder={["arm","hvatka","leg","tip","implant","addon"]} sublabels={{arm:"Протез руки",hvatka:"Временный протез",leg:"Протез ноги",tip:"Насадки",implant:"Вживляемое",addon:"Накладное"}} sub={function(it){return it.desc||""}} onPick={buy}/>}
</div>

<div className="sec rust">
  <h3>Цена железа</h3>
  <div className="row"><span className="lblm">Шагов</span><b className="mono">{steps}</b>
    {upk>0&&<button className="btn" onClick={payWeek}>{"Оплатить неделю · "+fmtMoney(upk)}</button>}</div>
  <div className="log">{IRON_STAGES.map(function(st){var on=steps>=st.at;return <div key={st.at} className="logrow" style={{gridTemplateColumns:"34px 1fr",opacity:on?1:.45}}><span className="tm">{st.at+"+"}</span><span><b>{st.name}</b>{" — "+st.text}</span></div>})}</div>
</div>

<div className="sec">
  <h3>Био</h3>
  <LiveField tag="textarea" style={{minHeight:80,resize:"vertical",width:"100%"}} value={c.bio||""} onCommit={function(val){sv(Object.assign({},c,{bio:val}))}}/>
</div>
{!gm&&pr.changeAccount&&<AccountCard login={c._fbId} changeAccount={pr.changeAccount}/>}
</div>)}

export default BodyTab;
