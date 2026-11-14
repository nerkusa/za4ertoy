import React, { useState } from 'react';
import { SD, SKD, skCost } from '../data/stats';
import { ORIGINS } from '../data/professions';
import { getProfs } from '../utils/profStore';
import { getTraits } from '../utils/traitStore';
import { mHP } from '../utils/character';
import { baseStats, yearsWord, START_CAP, STAT_POINTS, SKILL_POINTS, PRE_POINTS, PRE_SKILLS, AGE, STRELOK_GUNS, emptyCreation, statBonus, skillBonus, statMax, skillMax, finalStats, finalSkills, statsLeft, skillsLeft, preLeft, canStat, canSkill, stepErrors, clampCreation, kitList, finishPatch } from '../utils/creation';

var STEPS=["Кличка","Происхождение","Профессия","Характеристики","Навыки","Итог"];

/* Пошаговое создание персонажа. Пока лист не принят, игрок видит только
   этот экран; после «Принять» характеристики и навыки закрыты. */
function CreationWizard(pr){
var c=pr.char;var sv=pr.save;var profs=getProfs();var cat=getTraits();
/* Выбор держим локально (иначе быстрые нажатия подряд затирают друг
   друга, пока сервер не ответил) и сохраняем на сервер при каждом шаге. */
var _cr=useState(function(){var x=Object.assign(emptyCreation(),c.creation||{});x.kit=Object.assign({gun:"",cass:[]},x.kit||{});if(!c.creation&&c.name&&!x.name)x.name=c.name;return x});var cr=_cr[0];var sCr=_cr[1];
var _s=useState(Math.min(c.creationStep||0,5));var step=_s[0];var sStep=_s[1];
var _t=useState(false);var tried=_t[0];var sTried=_t[1];
function put(next,clamp){var n=clamp?clampCreation(next,profs):next;sCr(n);sv(Object.assign({},c,{creation:n,creationStep:step}))}
function set(k,v,clamp){var n=JSON.parse(JSON.stringify(cr));n[k]=v;put(n,clamp)}
var errs=stepErrors(cr,step,profs);
function next(){if(errs.length){sTried(true);return}sTried(false);sStep(step+1);sv(Object.assign({},c,{creation:cr,creationStep:step+1}))}
function back(){sTried(false);sStep(step-1)}
function finish(){
  for(var i=0;i<5;i++){if(stepErrors(cr,i,profs).length){sStep(i);sTried(true);return}}
  if(!window.confirm("Принять персонажа? Характеристики и навыки после этого меняет только мастер (и очки за уровень)."))return;
  var r=finishPatch(c,cat,cr,profs);
  sv(Object.assign({},c,r.patch));
  if(pr.addLog)pr.addLog({who:cr.name,type:"give",label:cr.name+" создан: "+((profs.find(function(p){return p.id===cr.profession})||{}).name||"")+", "+(ORIGINS.find(function(o){return o.id===cr.origin})||{}).name.toLowerCase(),detail:r.kitNames.length?"Стартовый набор: "+r.kitNames.join(", "):"",total:0});
}
function adj(field,key,d){var n=JSON.parse(JSON.stringify(cr));n[field]=n[field]||{};n[field][key]=Math.max(0,(n[field][key]||0)+d);put(n)}
function onPortrait(e){var file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>500000){alert("Файл слишком большой. Не больше 500 КБ.");return}var rd=new FileReader();rd.onload=function(ev){sv(Object.assign({},c,{portrait:ev.target.result}))};rd.readAsDataURL(file)}

var pf=profs.find(function(p){return p.id===cr.profession});
var fs=finalStats(cr);var fsk=finalSkills(cr,profs);var sb=statBonus(cr);var kb=skillBonus(cr,profs);

function Counter(p){return <span className="pm" style={{marginLeft:0}}><button disabled={!p.minus} onClick={p.onMinus}>−</button><button disabled={!p.plus} onClick={p.onPlus}>+</button></span>}

var body=null;
if(step===0)body=(<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <h2>Кто ты?</h2>
  <div className="n-field"><label>Кличка</label><input className="n-input" value={cr.name} maxLength={40} placeholder="Как тебя зовут на тракте" onChange={function(e){set("name",e.target.value)}}/></div>
  <div className="row"><label className="portrait" style={{width:96,backgroundImage:c.portrait?"url("+c.portrait+")":"none",cursor:"pointer",display:"block"}}>{!c.portrait&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#8f8573",fontFamily:"var(--f-mono)",fontSize:11,textAlign:"center"}}>портрет</div>}<input type="file" accept="image/*" style={{display:"none"}} onChange={onPortrait}/></label><p className="hint">Портрет необязателен — можно добавить и потом.</p></div>
</div>);

if(step===1)body=(<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <h2>Откуда ты?</h2>
  <div className="cards">{ORIGINS.map(function(o){var on=cr.origin===o.id;return <button key={o.id} className="card" style={{textAlign:"left",padding:0,outline:on?"3px solid var(--rust)":"none"}} onClick={function(){var n=JSON.parse(JSON.stringify(cr));n.origin=o.id;var r=AGE[o.id];var a=parseInt(n.age);if(!(a>=r[0]&&a<=r[1]))n.age="";put(n,true)}}>
    <div className="ch"><b>{o.name}</b><span>{o.age}</span></div>
    <div className="cb">{o.rules.map(function(r,i){return <p key={i}>{r}</p>})}</div></button>})}</div>
  {cr.origin&&<div className="n-field" style={{maxWidth:200}}><label>{"Возраст ("+AGE[cr.origin][0]+"–"+AGE[cr.origin][1]+")"}</label><input className="n-input" type="text" inputMode="numeric" value={cr.age} onChange={function(e){set("age",e.target.value.replace(/[^0-9]/g,"").slice(0,2))}}/></div>}
  {cr.origin==="post"&&<div className="sec"><h3>+1 к Телу или Реакции</h3><div className="row">{["telo","reak"].map(function(k){return <button key={k} className={"btn"+(cr.postStat===k?" main":"")} onClick={function(){set("postStat",k,true)}}>{k==="telo"?"Тело":"Реакция"}</button>})}</div><p className="hint">+2 к Выживанию и Внимательности начислятся сами.</p></div>}
  {cr.origin==="pre"&&<div className="sec"><h3>{"Знания прошлого: "+PRE_POINTS+" очка · осталось "+preLeft(cr)}</h3>
    {PRE_SKILLS.map(function(n){var v=(cr.pre||{})[n]||0;return <div key={n} className="row" style={{justifyContent:"space-between"}}><span>{n}</span><span className="row"><b className="mono">{"+"+v}</b><Counter minus={v>0} plus={preLeft(cr)>0} onMinus={function(){adj("pre",n,-1)}} onPlus={function(){adj("pre",n,1)}}/></span></div>})}
    <p className="hint">Тело и Реакция у довоенного не выше 7, Здоровье −5.</p></div>}
</div>);

if(step===2)body=(<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <h2>Чем живёшь?</h2>
  <div className="cards">{profs.filter(function(p){return p.id!=="none"}).map(function(p){var on=cr.profession===p.id;return <button key={p.id} className="card" style={{textAlign:"left",padding:0,outline:on?"3px solid var(--rust)":"none"}} onClick={function(){var n=JSON.parse(JSON.stringify(cr));n.profession=p.id;n.kit={gun:"",cass:[]};put(n,true)}}>
    <div className="ch"><b>{p.name}</b><span>+2 к навыкам</span></div>
    <div className="cb"><p>{(p.skills||[]).join(", ")}</p><p className="hint">{"С собой: "+(p.kit||"—")}</p></div></button>})}</div>
  {cr.profession==="strelok"&&<div className="sec"><h3>Ствол на выбор</h3><div className="row">{STRELOK_GUNS.map(function(g){return <button key={g} className={"btn"+(cr.kit.gun===g?" main":"")} onClick={function(){set("kit",Object.assign({},cr.kit,{gun:g}))}}>{g}</button>})}</div></div>}
  {cr.profession==="kassetnik"&&<div className="sec"><h3>{"Две кассеты-копии · выбрано "+(cr.kit.cass||[]).length+" из 2"}</h3>
    <p className="hint">Браслет Utilitary читает кассеты UTIL и CIVIL.</p>
    <div className="zones">{cat.cassettes.filter(function(x){return (x.cls==="UTIL"||x.cls==="CIVIL")&&!x.origOnly}).map(function(x){var on=(cr.kit.cass||[]).indexOf(x.key)>=0;return <button key={x.key} className={on?"on":""} title={x.text} onClick={function(){var l=(cr.kit.cass||[]).slice();if(on)l=l.filter(function(k){return k!==x.key});else{if(l.length>=2)l.shift();l.push(x.key)}set("kit",Object.assign({},cr.kit,{cass:l}))}}>{x.name+" · "+x.cls}</button>})}</div></div>}
  {pf&&kitList(cr).length>0&&<p className="hint">Набор выдастся при «Принять».</p>}
</div>);

if(step===3)body=(<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <h2>Характеристики</h2>
  <div className={statsLeft(cr)===0?"okbox":"warnbox"}>{"Очков: "+STAT_POINTS+" · осталось "+statsLeft(cr)+". Каждая начинается со значения происхождения, на старте не выше "+START_CAP+"."}</div>
  {SD.map(function(s){var v=(cr.stats||{})[s.key]||0;return <div key={s.key} className="stat" style={{borderTopColor:s.color}}><div className="row" style={{padding:"8px 10px",justifyContent:"space-between"}}>
    <span className="sv">{fs[s.key]}</span><span className="sn" style={{flex:1}}>{s.full}<small>{SKD[s.key].map(function(x){return x.name}).join(", ")+(sb[s.key]?" · +"+sb[s.key]+" от происхождения":"")+" · не выше "+statMax(cr,s.key)}</small></span>
    <Counter minus={v>0} plus={canStat(cr,s.key)} onMinus={function(){adj("stats",s.key,-1)}} onPlus={function(){adj("stats",s.key,1)}}/></div><div className="lblm" style={{padding:"0 10px 6px"}}>{"старт "+baseStats(cr)[s.key]+(v?" · +"+v+" очк.":"")}</div></div>})}
  <p className="hint">{"Здоровье выйдет: "+mHP(fs,{hpRoll:c.hpRoll,origin:cr.origin})+" (Тело и Реакция × 2 + бросок"+(cr.origin==="pre"?" − 5":"")+"). Воля: "+fs.volya+"."}</p>
</div>);

if(step===4)body=(<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <h2>Навыки</h2>
  <div className={skillsLeft(cr)===0?"okbox":"warnbox"}>{"Очков: "+SKILL_POINTS+" · осталось "+skillsLeft(cr)+". Навыки ×2 стоят 2 очка за единицу. Бонусы профессии и происхождения уже вписаны и бесплатны. На старте навык не выше "+START_CAP+"."}</div>
  <div className="statgrid">{SD.map(function(s){return <div key={s.key} className="stat" style={{borderTopColor:s.color}}>
    <div className="sh" style={{cursor:"default"}}><span className="sv">{fs[s.key]}</span><span className="sn">{s.full}</span></div>
    <div className="skl">{SKD[s.key].map(function(x){var n=x.name;var v=(cr.skills||{})[n]||0;return <div key={n} className="row" style={{padding:"4px 10px",justifyContent:"space-between",flexWrap:"nowrap"}}>
      <span style={{minWidth:0}}>{n}{skCost(n)>1?<span className="mono" style={{color:"var(--rust)",fontSize:11,marginLeft:4}}>×2</span>:null}{kb[n]?<span className="bon mono" style={{color:"var(--swamp)",fontSize:11,marginLeft:6}}>{"+"+kb[n]}</span>:null}{skillMax(cr,n)<START_CAP?<span className="mono" style={{color:"var(--muted)",fontSize:11,marginLeft:6}}>{"≤"+skillMax(cr,n)}</span>:null}</span>
      <span className="row" style={{flexWrap:"nowrap"}}><b className="mono" style={{minWidth:20,textAlign:"right"}}>{fsk[n]}</b><Counter minus={v>0} plus={canSkill(cr,n,profs)} onMinus={function(){adj("skills",n,-1)}} onPlus={function(){adj("skills",n,1)}}/></span></div>})}</div></div>})}</div>
</div>);

if(step===5){var org=ORIGINS.find(function(o){return o.id===cr.origin})||{};
  body=(<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <h2>{cr.name||"Без клички"}</h2>
  <dl className="kv"><dt>Происхождение</dt><dd>{(org.name||"—")+", "+(cr.age?yearsWord(cr.age):"возраст не указан")}</dd><dt>Профессия</dt><dd>{pf?pf.name:"—"}</dd>
    <dt>Здоровье</dt><dd>{mHP(fs,{hpRoll:c.hpRoll,origin:cr.origin})}</dd><dt>Воля</dt><dd>{fs.volya}</dd>
    <dt>Характеристики</dt><dd>{SD.map(function(s){return s.full+" "+fs[s.key]}).join(" · ")}</dd>
    <dt>Навыки</dt><dd>{Object.keys(fsk).filter(function(n){return fsk[n]>0}).map(function(n){return n+" "+fsk[n]}).join(" · ")||"—"}</dd>
    <dt>С собой</dt><dd>{c.kitGiven?"набор уже выдан":(kitList(cr).map(function(k){if(k.vehicle)return "Буханка (в гараж)";return k.cassette?((cat.cassettes.find(function(x){return x.key===k.cassette})||{}).name+" (копия)"):(k.item?k.item.name:k.name)+(k.qty>1?" ×"+k.qty:"")}).join(", ")||"—")}</dd></dl>
  <div className="warnbox">После «Принять» характеристики и навыки меняет только мастер. Дальше расти — через очки навыков за уровень и кассеты.</div>
  <div><button className="btn main" onClick={finish}>Принять персонажа</button></div>
</div>)}

return(<div className="zc-main"><div className="zc-scroll">
<div style={{background:"var(--paper)",padding:14,display:"flex",flexDirection:"column",gap:12}}>
  <div className="row" style={{justifyContent:"space-between"}}><span className="lblm">{"Создание персонажа · шаг "+(step+1)+" из "+STEPS.length}</span><span className="lblm">{STEPS[step]}</span></div>
  <div className="pips">{STEPS.map(function(n,i){return <button key={n} title={n} className={i<=step?"on":""} style={{cursor:i<step?"pointer":"default"}} onClick={function(){if(i<step){sTried(false);sStep(i)}}}/>})}</div>
  {body}
  {tried&&errs.length>0&&<div className="warnbox">{errs.join(". ")+"."}</div>}
  {step<5&&<div className="row" style={{justifyContent:"space-between"}}>
    <button className="btn" disabled={step===0} onClick={back}>Назад</button>
    <button className="btn main" onClick={next}>Далее</button></div>}
  {step===5&&<div><button className="btn" onClick={back}>Назад</button></div>}
</div>
</div></div>)}

export default CreationWizard;
