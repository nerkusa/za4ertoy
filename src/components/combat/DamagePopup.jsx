import React from 'react';
import NpcDeathPopup from './NpcDeathPopup';

function DamagePopup(pr){
  var ev=pr.event;
  if(!ev)return null;
  var dead=ev.newHp<=0;
  var pct=ev.maxHp>0?(ev.newHp/ev.maxHp)*100:0;
  return(<div style={{position:"fixed",inset:0,background:dead?"rgba(0,0,0,0.85)":"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:996,animation:"fadeIn 0.15s"}} onClick={pr.onClose}>
    <div onClick={function(e){e.stopPropagation()}} style={{background:dead?"linear-gradient(135deg,#211d18,#b2b6ca)":"linear-gradient(135deg,#efe2d6,#efe2d6)",border:"3px solid "+(dead?"#6a6052":"#8a3b22"),borderRadius:0,padding:"18px 24px",textAlign:"center",minWidth:250,maxWidth:320,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",animation:"popIn 0.3s"}}>
      <div style={{fontSize:40,marginBottom:6}}>{dead?"":""}</div>
      <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:18,color:dead?"#e2d8c3":"#8a3b22",marginBottom:4}}>{dead?"ПОГИБ":"РАНЕН"}</div>
      <div style={{background:dead?"rgba(255,255,255,0.1)":"#ebe3d1",borderRadius:0,padding:"8px 14px",marginBottom:10}}>
        <div style={{fontSize:11,color:dead?"#6a6052":"#6a6052",marginBottom:2}}>{ev.attackerName+" нанёс "+ev.dmg+" урона"}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
          <span style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:22,color:dead?"#6a6052":"#8a3b22",textDecoration:dead?"line-through":"none"}}>{ev.oldHp}</span>
          <span style={{fontSize:14,color:dead?"#6a6052":"#6a6052"}}>→</span>
          <span style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:28,color:dead?"#b2b6ca":"#8a3b22"}}>{ev.newHp}</span>
          <span style={{fontSize:10,color:dead?"#6a6052":"#6a6052"}}>{"/ "+ev.maxHp}</span>
        </div>
        {!dead&&<div style={{marginTop:6,background:"#e2d8c3",borderRadius:0,height:8,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:pct<=25?"#8a3b22":pct<=50?"#8a6200":"#3f6b34",borderRadius:0,transition:"width 0.5s"}}/></div>}
      </div>
      {dead&&<div style={{fontSize:10,color:"#6a6052",marginBottom:10}}>Персонаж потерял сознание или погиб</div>}
      <button onClick={pr.onClose} style={{width:"100%",padding:8,borderRadius:0,border:"none",background:dead?"#b2b6ca":"#8a3b22",color:dead?"#ebe3d1":"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:12,cursor:"pointer"}}>OK</button>
    </div>
  </div>)}

/* ── NpcDeathPopup ── */

export default DamagePopup;
