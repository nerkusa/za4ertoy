import { clampMolva, molvaLevel, molvaSteps, molvaBounty, molvaPriceMult } from '../data/molva';
import React from 'react';
import { cF, hpOf, willOf, hpWords, xpProgress } from '../utils/character';
import { getProfs } from '../utils/profStore';
import { getTraits } from '../utils/traitStore';
import { originOf } from '../data/professions';
import { IRON_STAGES, doseState, diseaseList } from '../data/gear';
import { ironSteps, hasTablet } from '../data/traits';
import { inCombat } from '../utils/gearFx';
import LiveField from './LiveField';
import { yearsWord } from '../utils/creation';

/* Шапка-досье: портрет, кличка, профессия, происхождение, бейджи и трекеры. */
function Dossier(pr){
var c=pr.char;var sv=pr.save;var gm=!!pr.isGM;var inf=cF(c);var fs=inf.fs;var cat=getTraits();
var hp=hpOf(c,fs);var w=willOf(c,fs);var xpp=xpProgress(c);
var pf=getProfs().find(function(p){return p.id===c.profession})||getProfs()[0];var org=originOf(c.origin);
var steps=ironSteps(c,cat);var dose=c.dose||0;var dis=c.diseases||[];var money=c.money||0;var molva=c.molva||0;
/* Немота: 5+ шагов железа, игрок без планшета видит Здоровье только словами */
var mute=!gm&&steps>=5&&!hasTablet(c);
var hpPct=hp.max>0?Math.max(0,Math.min(100,(hp.cur/hp.max)*100)):0;
var stage=IRON_STAGES.filter(function(s){return steps>=s.at}).pop();
function setHp(d){sv(Object.assign({},c,{curHp:Math.max(0,Math.min(hp.max,hp.cur+d))}))}
function onPortrait(e){var file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>500000){alert("Файл слишком большой. Не больше 500 КБ.");return}var reader=new FileReader();reader.onload=function(ev){sv(Object.assign({},c,{portrait:ev.target.result}))};reader.readAsDataURL(file)}
return(<div className="dossier">
<label className="portrait" style={{backgroundImage:c.portrait?"url("+c.portrait+")":"none",cursor:"pointer",display:"block"}} title="Сменить портрет">
  {!c.portrait&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#8f8573",fontFamily:"var(--f-display)",fontSize:40}}>{(c.name||"?")[0]}</div>}
  <span>{"УР. "+(c.level||1)}</span>
  <input type="file" accept="image/*" style={{display:"none"}} onChange={onPortrait}/>
</label>
<div className="idblock">
  <div className="nameRow">
    {pr.onBack&&<button className="btn sm" onClick={pr.onBack}>К отряду</button>}
    {gm?<LiveField className="nameInput" value={c.name||""} placeholder="Кличка" onCommit={function(val){sv(Object.assign({},c,{name:val}))}}/>:<span className="nameInput">{c.name||"?"}</span>}
    <span className="meta">{[pf.id!=="none"?pf.name:"без профессии",org.name+(c.age?", "+yearsWord(c.age):""),"опыт "+xpp.got+"/"+xpp.need].join(" · ")}</span>
  </div>
  <div className="badges">
    {c.bracelet&&c.bracelet.model?<span className="badge dark">{"MG+ "+c.bracelet.model}</span>:<span className="badge">браслета нет</span>}
    {doseState(dose)&&<span className="badge rust">{doseState(dose)}</span>}
    {diseaseList(c).map(function(d){return <span key={d.key} className="badge rust">{d.name}</span>})}
    {(c.crits||[]).map(function(x){return <span key={x.id} className="badge rust">{x.name}</span>})}
    {stage&&<span className="badge">{"железо "+steps+" · "+stage.name}</span>}
    {inCombat(pr.initiative,c._fbId)&&<span className="badge dark">в бою</span>}
    {c.shakenPenalty>0&&<span className="badge rust">{"потрясён −"+c.shakenPenalty}</span>}
    {c.broken&&<span className="badge rust">сломлен</span>}
    {c.portrait&&<button onClick={function(){sv(Object.assign({},c,{portrait:""}))}} style={{border:"none",background:"none",fontSize:11,color:"var(--muted)",textDecoration:"underline",padding:0}}>убрать портрет</button>}
  </div>
  <div className="trackers">
    <div className="trk hp">
      <div className="lbl"><span>Здоровье</span><span>{"Воля "+w.cur+"/"+w.max}</span></div>
      <div className="val">{mute?<span style={{fontSize:17}}>{hpWords(hp.cur,hp.max)}</span>:<React.Fragment>{hp.cur}<small>{"/ "+hp.max}</small></React.Fragment>}
        <span className="pm">{[-5,-1,1,5].map(function(d){return <button key={d} style={{width:30}} onClick={function(){setHp(d)}}>{d>0?"+"+d:d}</button>})}</span></div>
      <div className="bar"><i className={hpPct<50?"warn":""} style={{width:(mute?(hpPct>=70?100:hpPct>=35?55:20):hpPct)+"%"}}/></div>
    </div>
    <div className="trk">
      <div className="lbl"><span>Доза</span><span>{dose+"/10"}</span></div>
      <div className="pips">{[1,2,3,4,5,6,7,8,9,10].map(function(i){return <button key={i} title={"Доза "+i} className={(dose>=i?"on":"")+(i<=3?" lo":"")} onClick={function(){sv(Object.assign({},c,{dose:dose===i?i-1:i}))}}/>})}</div>
      <div className="state">{doseState(dose)}</div>
    </div>
    <div className="trk">
      <div className="lbl"><span>Еврорубли</span></div>
      <div className="val" style={{fontSize:19}}><LiveField type="text" inputMode="numeric" pattern="[0-9]*" value={money} title="Впиши сумму" onCommit={function(val){sv(Object.assign({},c,{money:Math.max(0,parseInt(val)||0)}))}} style={{width:"100%",minWidth:0,fontFamily:"var(--f-display)",fontSize:19,padding:"2px 6px"}}/></div>
      <div className="lbl"><span>ер. · впиши сумму</span></div>
    </div>
    <div className="trk">
      <div className="lbl"><span>Молва</span></div>
      <div className="val" style={{fontSize:19}}>{(molva>0?"+":"")+molva}<span className="lblm" style={{marginLeft:6,fontSize:10}}>{molvaLevel(molva).name}</span></div>
      {gm?<span className="pm" style={{marginLeft:0}}><button onClick={function(){sv(Object.assign({},c,{molva:clampMolva(molva-1)}))}}>−</button><button onClick={function(){sv(Object.assign({},c,{molva:clampMolva(molva+1)}))}}>+</button></span>
         :null}
    </div>
  </div>
  {molva!==0&&<details className="molva-box"><summary>{"Молва "+(molva>0?"+":"")+molva+" · "+molvaLevel(molva).name+(molvaBounty(molva)?" · награда за голову "+molvaBounty(molva)+" ер.":"")+(molvaPriceMult(molva)===null?" · не продают":molvaPriceMult(molva)!==1?" · цены "+(molvaPriceMult(molva)>1?"+":"−")+Math.round(Math.abs(molvaPriceMult(molva)-1)*100)+"%":"")}</summary>
    {molvaSteps(molva).map(function(st){return <div key={st.n} className="logrow" style={{gridTemplateColumns:"34px 1fr"}}><span className="tm">{(st.n>0?"+":"")+st.n}</span><span><b>{st.name}.</b>{" "+st.text}{st.who?<span className="hint">{" Кто приходит: "+st.who}</span>:null}</span></div>})}
  </details>}
  {xpp.ready&&!gm&&<div className="state" style={{color:"var(--ok)"}}>Опыта хватает на новый уровень — скажи мастеру.</div>}
</div>
</div>)}

export default Dossier;
