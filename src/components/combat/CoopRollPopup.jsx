import React, { useEffect, useRef, useState } from 'react';
import { IconD10 } from '../../icons/index';

var ROLL_MS=650;

/* Попап совместного действия — два игрока кидают одновременно, каждый
   получает свою анимацию и свой отдельный результат (не слитый в одно
   число), чтобы сразу было видно «у кого как вышло». */
function CoopRollPopup(p){
var _ph=useState("result");var phase=_ph[0];var sPhase=_ph[1];
var _s1=useState(1);var spin1=_s1[0];var sSpin1=_s1[1];
var _s2=useState(1);var spin2=_s2[0];var sSpin2=_s2[1];
var timerRef=useRef(null);var intRef=useRef(null);

useEffect(function(){
  if(!p.roll)return;
  sPhase("rolling");
  sSpin1(1+Math.floor(Math.random()*10));sSpin2(1+Math.floor(Math.random()*10));
  intRef.current=setInterval(function(){sSpin1(1+Math.floor(Math.random()*10));sSpin2(1+Math.floor(Math.random()*10))},60);
  timerRef.current=setTimeout(function(){clearInterval(intRef.current);sPhase("result")},ROLL_MS);
  return function(){clearTimeout(timerRef.current);clearInterval(intRef.current)};
},[p.roll]);

if(!p.roll)return null;
var r=p.roll;
var rolling=phase==="rolling";

function Side(side){
  var iC=side.crit||side.d10===10;var iF=side.fumble||side.d10===1;
  return(<div style={{flex:1,minWidth:120,background:"#e2d8c3",border:"2px solid "+(iC?"#8a6200":iF?"#8a3b22":"#c6bba3"),borderRadius:0,padding:"8px 10px",textAlign:"center"}}>
    <div style={{fontSize:10,color:"#6a6052",fontWeight:700,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{side.name}</div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexWrap:"wrap"}}>
      <span style={{display:"flex",alignItems:"center",gap:2,fontFamily:"var(--f-body)",fontSize:16,fontWeight:700,color:iC?"#8a6200":iF?"#8a3b22":"#4f5b2a"}}><IconD10 size={14}/>{side.d10}</span>
      {(side.parts||[]).map(function(pt,i){return <span key={i} style={{fontSize:11,color:"#6a6052"}}>{"+"+pt.value}</span>})}
    </div>
    <div style={{fontFamily:"var(--f-body)",fontSize:22,fontWeight:700,marginTop:4,color:iC?"#8a6200":iF?"#8a3b22":"#211d18"}}>{"= "+side.total}</div>
    {iC&&<div style={{fontSize:10,color:"#8a6200",fontWeight:700}}>КРИТ</div>}
    {iF&&<div style={{fontSize:10,color:"#8a3b22",fontWeight:700}}>СРЫВ</div>}
  </div>);
}

return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,animation:"fadeIn 0.2s"}} onClick={rolling?undefined:p.onClose}>
{rolling
?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
  <div style={{display:"flex",gap:16}}>
    {[spin1,spin2].map(function(sp,i){return <div key={i} style={{width:70,height:70,borderRadius:0,background:"radial-gradient(circle at 50% 40%,var(--color-accent-2),var(--color-accent) 70%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px rgba(138,59,34,.5)",animation:"diceSpin 0.65s linear infinite"}}><span style={{fontFamily:"var(--f-body)",fontSize:28,fontWeight:700,color:"#ebe3d1"}}>{sp}</span></div>})}
  </div>
  <div style={{fontSize:12,color:"var(--color-text-muted)",fontWeight:600}}>{""+r.label}</div>
</div>
:<div onClick={function(e){e.stopPropagation()}} style={{background:"linear-gradient(135deg,#e2d8c3,#f1ead9)",border:"3px solid #8a3b22",borderRadius:0,padding:"16px 20px",textAlign:"center",minWidth:290,maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",animation:"popIn 0.3s"}}>
  <div style={{fontSize:11,color:"#8a3b22",fontWeight:700,marginBottom:2,textTransform:"uppercase",letterSpacing:.04}}>Совместное действие</div>
  <div style={{fontSize:13,color:"#211d18",fontWeight:600,marginBottom:r.desc?6:10}}>{r.label}</div>
  {r.desc&&<div style={{fontSize:12,color:"#8a3b22",fontWeight:600,fontStyle:"italic",marginBottom:10,padding:"5px 9px",background:"rgba(138,59,34,.1)",borderRadius:0,borderLeft:"3px solid #8a3b22",textAlign:"left",whiteSpace:"pre-line"}}>{""+r.desc}</div>}
  <div style={{display:"flex",gap:8}}>{Side(r.a)}{Side(r.b)}</div>
  <button onClick={p.onClose} style={{marginTop:12,padding:"4px 18px",borderRadius:0,border:"2px solid #c6bba3",background:"#f1ead9",fontWeight:700,fontSize:11,cursor:"pointer",color:"#211d18"}}>OK</button>
</div>}
</div>)}

export default CoopRollPopup;
