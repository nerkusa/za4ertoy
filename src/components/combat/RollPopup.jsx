import React, { useEffect, useRef, useState } from 'react';
import { IconD10 } from '../../icons/index';

var ROLL_MS=650;

function RollPopup(p){
var _ph=useState("result");var phase=_ph[0];var sPhase=_ph[1];
var _sp=useState(1);var spin=_sp[0];var sSpin=_sp[1];
var timerRef=useRef(null);var intRef=useRef(null);

useEffect(function(){
  if(!p.roll)return;
  var isDmg=p.roll.d10===null;
  if(isDmg){sPhase("result");return}
  sPhase("rolling");
  sSpin(1+Math.floor(Math.random()*10));
  intRef.current=setInterval(function(){sSpin(1+Math.floor(Math.random()*10))},60);
  timerRef.current=setTimeout(function(){
    clearInterval(intRef.current);
    sPhase("result");
  },ROLL_MS);
  return function(){clearTimeout(timerRef.current);clearInterval(intRef.current)};
},[p.roll]);

if(!p.roll)return null;
var r=p.roll;var iC=r.crit||r.d10===10;var iF=r.fumble||r.d10===1;var isDmg=r.d10===null;
var rolling=phase==="rolling"&&!isDmg;

return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,animation:"fadeIn 0.2s"}} onClick={rolling?undefined:p.onClose}>

{rolling
?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
  <div style={{width:84,height:84,borderRadius:0,background:"radial-gradient(circle at 50% 40%,var(--color-accent-2),var(--color-accent) 70%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 40px rgba(138,59,34,.55)",animation:"diceSpin 0.65s linear infinite"}}>
    <span style={{fontFamily:"var(--f-body)",fontSize:34,fontWeight:700,color:"#ebe3d1"}}>{spin}</span>
  </div>
  <div style={{fontSize:12,color:"var(--color-text-muted)",fontWeight:600,letterSpacing:.05}}>{r.label}</div>
</div>
:<div onClick={function(e){e.stopPropagation()}} style={{background:isDmg?"linear-gradient(135deg,#efe2d6,#efe2d6)":iC?"linear-gradient(135deg,#f0e2b8,#f0e2b8)":iF?"linear-gradient(135deg,#efe2d6,#efe2d6)":"linear-gradient(135deg,#e2d8c3,#f1ead9)",border:isDmg?"3px solid #8a3b22":iC?"3px solid #8a6200":iF?"3px solid #8a3b22":"3px solid #c6bba3",borderRadius:0,padding:"16px 22px",textAlign:"center",minWidth:240,maxWidth:350,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",animation:iC?"critPop 0.4s":"popIn 0.3s"}}>
<div style={{fontSize:12,color:"#6a6052",fontWeight:700,marginBottom:r.subtext?6:4}}>{r.label}</div>
{r.subtext&&<div style={{fontSize:12,color:"#8a3b22",fontWeight:600,fontStyle:"italic",marginBottom:10,padding:"5px 9px",background:"rgba(138,59,34,.1)",borderRadius:0,borderLeft:"3px solid #8a3b22",textAlign:"left",whiteSpace:"pre-line"}}>{r.subtext}</div>}
<div style={{background:"#e2d8c3",border:"2px solid #c6bba3",borderRadius:0,padding:"8px 10px",marginBottom:8,position:"relative"}}>
{iC&&!isDmg&&<div style={{position:"absolute",inset:0,borderRadius:0,background:"radial-gradient(circle,rgba(233,177,43,.25),transparent 70%)",animation:"critFlash 0.5s ease-out"}}/>}
<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexWrap:"wrap",position:"relative"}}>{!isDmg&&<span style={{display:"flex",alignItems:"center",gap:3,fontFamily:"var(--f-body)",fontSize:20,fontWeight:700,color:iC?"#8a6200":iF?"#8a3b22":"#4f5b2a"}}><IconD10 size={18}/>{r.d10}</span>}{(r.parts||[]).map(function(pt,i){return <span key={i} style={{display:"flex",alignItems:"center",gap:2}}><span style={{color:"#6a6052",fontSize:13}}>+</span><span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>{pt.label}</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{pt.value}</span></span></span>})}</div>
</div>
<div style={{fontFamily:"var(--f-body)",fontSize:30,fontWeight:700,color:isDmg?"#8a3b22":iC?"#8a6200":iF?"#8a3b22":"#211d18"}}>{"= "+r.total}</div>
{iC&&<div style={{fontSize:13,color:"#8a6200",fontWeight:700}}>КРИТ</div>}{iF&&<div style={{fontSize:13,color:"#8a3b22",fontWeight:700}}>СРЫВ!</div>}
<button onClick={p.onClose} style={{marginTop:10,padding:"4px 18px",borderRadius:0,border:"2px solid #c6bba3",background:"#f1ead9",fontWeight:700,fontSize:11,cursor:"pointer"}}>OK</button>
</div>}
</div>)}

export default RollPopup;
