import React, { useState } from 'react';
import { SD, SKD, DC_LIST, stName, skCost } from '../../data/stats';
import { cF, rndStats, STAT_POINTS, SKILL_POINTS, statSpent, skillSpent, statCap, skillCap } from '../../utils/character';
import { rollHit } from '../../utils/dice';
import { fumbleFx } from '../../utils/gearFx';
import { fineBlocked } from '../../data/traits';
import { diseaseList } from '../../data/gear';
import { getTraits } from '../../utils/traitStore';
import { IconD10 } from '../../icons/index';
import SignsStrip from '../SignsStrip';
import CondBar from '../CondBar';
import { lastRollPatch } from '../../utils/signs';
import { VYD, burnedOf, restoreState, restorePatch } from '../../utils/slep';

/* Вкладка «Навыки»: проверки характеристик и навыков против СЛ.
   итог = характеристика + навык + эффекты + штрафы + d10 (rollHit). */
function SkillsTab(pr){
var c=pr.char;var sv=pr.save;var isGM=!!pr.isGM;
var inf=cF(c);var fs=inf.fs;var es=inf.eSk;
var _dc=useState(0);var dc=_dc[0];var sDC=_dc[1];
var _un=useState(null);var undo=_un[0];var sU=_un[1];
var free=isGM||!c.locked;            /* свободная правка чисел */
var pts=c.skillPts||0;
var hasUnlocked=c.locked&&!isGM&&JSON.stringify(c.skills||{})!==JSON.stringify(c.lockedSkills||c.skills||{});

/* Черновик игрока: 30 очков на характеристики и 35 на навыки. Мастер правит без бюджета. */
var draft=!c.locked&&!isGM;var stLeft=STAT_POINTS-statSpent(c.stats);var skLeft=SKILL_POINTS-skillSpent(c.skills);
function uS(k,d){if(!free)return;var stats=Object.assign({},c.stats);var cur=stats[k]||1;if(draft&&d>0&&(stLeft<1||cur>=statCap(c.origin,k)))return;stats[k]=Math.max(1,Math.min(10,cur+d));sv(Object.assign({},c,{stats:stats}))}
function uSk(n,d){
  var skills=Object.assign({},c.skills);var cur=skills[n]||0;
  if(free){if(draft&&d>0&&(skLeft<skCost(n)||cur>=skillCap(c.origin,n)))return;skills[n]=Math.max(0,Math.min(10,cur+d));sv(Object.assign({},c,{skills:skills}));return}
  /* принятый лист: игрок тратит только очки уровня, вернуть можно не ниже зафиксированного */
  var floor=(c.lockedSkills&&c.lockedSkills[n])||0;
  var cost=skCost(n);
  if(d<0){if(cur<=floor)return;skills[n]=cur-1;sv(Object.assign({},c,{skills:skills,skillPts:pts+cost}));return}
  if(pts<cost||cur>=10)return;skills[n]=cur+1;sv(Object.assign({},c,{skills:skills,skillPts:pts-cost}));
}
function roll(statKey,skill){
  var R=rollHit();var sVal=fs[statKey]||0;var kVal=skill?(es[skill]||0):0;
  var pen=inf.rollPen(statKey);var total=R.d+sVal+kVal+pen.total;
  var patch={};if(c.shakenPenalty)patch.shakenPenalty=0;
  var fx=skill?fumbleFx(c,inf,skill,R):{patch:{},logs:[],notes:[]};
  Object.assign(patch,fx.patch);
  Object.assign(patch,lastRollPatch(skill,statKey,R.d,total,pr.initiative,skill||stName(statKey)));
  sv(Object.assign({},c,patch));
  var label=skill||stName(statKey);
  var res=dc?(total>=dc?"успех":"провал"):"";
  var parts=[{label:stName(statKey),value:sVal}];
  if(skill)parts.push({label:skill,value:kVal});
  pen.parts.forEach(function(p){parts.push(p)});
  var notes=[];
  if(dc)notes.push("СЛ "+dc+": "+(total>=dc?"УСПЕХ":"ПРОВАЛ"));
  if(skill&&fineBlocked(c,getTraits(),skill))notes.push("Клешня: тонкая работа невозможна");
  fx.notes.forEach(function(n){notes.push(n)});
  if(pr.addLog){
    pr.addLog({who:c.name||"???",type:"skill",label:"Проверка: "+label+(dc?" · СЛ "+dc+" — "+res:"")+(R.crit?" · крит":R.fumble?" · срыв":""),detail:"d10("+R.d+") + "+parts.map(function(p){return p.label+"("+p.value+")"}).join(" + ")+" = "+total,total:total});
    fx.logs.filter(function(l){return !l.gmOnly}).forEach(function(l,i){setTimeout(function(){pr.addLog(Object.assign({who:c.name||"???"},l))},5+i)});
  }
  pr.onRoll({label:label,d10:R.d,crit:R.crit,fumble:R.fumble,parts:parts,total:total,subtext:notes.join("\n")});
}
function bonusOf(list){return (list||[]).filter(function(b){return b.amount}).map(function(b){return (b.amount>0?"+":"")+b.amount+" "+(b.src?b.src.name:"")}).join(", ")}

return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
<SignsStrip char={c} save={sv} addLog={pr.addLog} onRoll={pr.onRoll} initiative={pr.initiative} isGM={isGM}/>
<CondBar target={c}/>
<div className="slbar"><span>СЛ:</span>
<button className={dc===0?"on":""} onClick={function(){sDC(0)}}>без СЛ</button>
{DC_LIST.map(function(d){return <button key={d.v} className={dc===d.v?"on":""} title={d.l} onClick={function(){sDC(d.v)}}>{d.v}</button>})}
<span style={{color:"var(--muted)"}}>{dc?(DC_LIST.find(function(d){return d.v===dc})||{}).l:"бросок без сложности"}</span>
</div>
{(function(){var bad=diseaseList(c).map(function(d){return d.name+": "+d.text}).concat((c.crits||[]).map(function(x){return x.name+": "+x.text}));
  var gen=[inf.pen.will?"Воля "+inf.pen.will+" ко всем броскам":null,inf.pen.shaken?"потрясён "+inf.pen.shaken:null,inf.pen.dose?"Доза "+inf.pen.dose+" ко всем броскам":null].filter(Boolean);
  if(!gen.length&&!bad.length)return null;
  return <div className="warnbox">{gen.length?<div>{"Штрафы: "+gen.join(" · ")}</div>:null}{bad.map(function(t,i){return <div key={i}>{t}</div>})}</div>})()}
{c.locked&&!isGM&&pts>0&&<div className="okbox">{"Очки навыков за уровень: "+pts+" — трать кнопками «+» у навыков. Навык ×2 стоит 2 очка."}</div>}
{isGM&&<div className="hint">Мастер правит числа свободно.</div>}
{draft&&<div className={stLeft===0&&skLeft===0?"okbox":"warnbox"}>{"Создание: характеристики — осталось "+stLeft+" из "+STAT_POINTS+" · навыки — осталось "+skLeft+" из "+SKILL_POINTS+". Распредели и нажми «Принять»."}</div>}

<div className="statgrid">
{SD.map(function(st){var v=fs[st.key]||0;var base=(c.stats||{})[st.key]||0;var sb=bonusOf(inf.src.stat[st.key]);
return(<div key={st.key} className="stat" style={{borderTopColor:st.color}}>
<div style={{display:"flex",alignItems:"center"}}>
<button className="sh" onClick={function(){roll(st.key,null)}} title={"Бросить "+st.full}>
<span className="sv">{v}</span>
<span className="sn">{st.full}<small>{sb?("база "+base+" · "+sb):"бросок характеристики"}</small></span>
<IconD10 size={16}/>
</button>
{free&&<span className="pm" style={{marginRight:8}}><button onClick={function(){uS(st.key,-1)}}>−</button><button disabled={draft&&(stLeft<1||base>=statCap(c.origin,st.key))} onClick={function(){uS(st.key,1)}}>+</button></span>}
</div>
<div className="skl">
{SKD[st.key].map(function(s){var ev=es[s.name]||0;var bon=bonusOf(inf.src.skill[s.name]);var blocked=fineBlocked(c,getTraits(),s.name);
var canMinus=free||(c.locked&&(c.skills[s.name]||0)>((c.lockedSkills&&c.lockedSkills[s.name])||0));var canPlus=draft?(skLeft>=skCost(s.name)&&(c.skills[s.name]||0)<skillCap(c.origin,s.name)):(free||pts>=skCost(s.name));
return(<div key={s.name} style={{display:"flex",alignItems:"center"}}>
<button className="sk" onClick={function(){roll(st.key,s.name)}}>
<span>{s.name}{s.name===VYD&&burnedOf(c)>0&&<span className="burnp" title={"Слепок съел "+burnedOf(c)+" — красные перечёркнутые"}>{Array.from({length:Math.max((c.skills||{})[VYD]||0,burnedOf(c))}).map(function(_,i,arr){return <i key={i} className={i>=arr.length-burnedOf(c)?"x":""}/>})}</span>}{skCost(s.name)>1&&<em className="mono" style={{color:"var(--rust)",fontSize:11,marginLeft:4,fontStyle:"normal"}}>×2</em>}{blocked&&<em style={{color:"var(--rust)",fontSize:11,marginLeft:6}}>тонкая работа невозможна</em>}</span>
<span className="bon">{bon}</span>
<span className="tot">{v+ev}<em>{" ("+v+(ev<0?"−"+(-ev):"+"+ev)+")"}</em></span>
</button>
{(free||pts>0||canMinus&&c.locked&&!isGM&&hasUnlocked)&&<span className="pm" style={{marginRight:8}}><button disabled={!canMinus} onClick={function(){uSk(s.name,-1)}}>−</button><button disabled={!canPlus} onClick={function(){uSk(s.name,1)}}>+</button></span>}
</div>)})}
{st.key==="volya"&&(function(){var rs=restoreState(c);if(!rs.show||isGM&&!rs.ok)return null;return <div className="row" style={{padding:"4px 8px"}}><button className="btn sm" disabled={!rs.ok} title={rs.ok?"Вернуть очко Выдержки за "+rs.cost+" очка навыков":rs.reason} onClick={function(){var p=restorePatch(c);if(!p)return;sv(Object.assign({},c,p));if(pr.addLog)pr.addLog({who:c.name||"???",type:"gear",label:"Восстановил очко Выдержки",detail:"сгоревших осталось "+p.burned,total:0})}}>Восстановить Выдержку</button>{!rs.ok&&<span className="hint" style={{fontSize:12}}>{rs.reason}</span>}</div>})()}
</div>
</div>)})}
</div>

<div className="row">
{!c.locked&&!isGM&&<button className="btn" onClick={function(){sU({stats:Object.assign({},c.stats),skills:Object.assign({},c.skills)});var r=rndStats(c.profession,c.origin);sv(Object.assign({},c,r,{curHp:null,curWill:null}))}}>Случайные числа</button>}
{!c.locked&&!isGM&&undo&&<button className="btn" onClick={function(){sv(Object.assign({},c,undo,{curHp:null,curWill:null}));sU(null)}}>Отменить</button>}
{!c.locked&&!isGM&&<button className="btn main" onClick={function(){if(!window.confirm(((stLeft>0||skLeft>0)?"Остались нераспределённые очки: характеристики "+stLeft+", навыки "+skLeft+". ":"")+"Принять характеристики и навыки? Дальше менять их сможет только мастер."))return;sv(Object.assign({},c,{locked:true,lockedSkills:Object.assign({},c.skills)}))}}>Принять</button>}
{hasUnlocked&&<button className="btn main" onClick={function(){if(!window.confirm("Зафиксировать потраченные очки навыков? Вернуть их после этого будет нельзя."))return;sv(Object.assign({},c,{lockedSkills:Object.assign({},c.skills)}))}}>Зафиксировать</button>}
{isGM&&<span className="pill">{c.locked?"принят игроком":"черновик"}</span>}
{isGM&&c.locked&&<button className="btn sm" onClick={function(){sv(Object.assign({},c,{locked:false}))}}title="Игрок снова пройдёт создание; выбранное им сохранится, стартовый набор повторно не выдаётся">Вернуть на создание</button>}
</div>
</div>)}

export default SkillsTab;
