import React from 'react';

function LevelUpPopup(pr){
  var p=pr.pending;
  if(!p)return null;
  var hasStat=p.stat>0;
  var hasSkill=p.skill>0;
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:997,animation:"fadeIn 0.15s"}}>
    <div style={{background:"linear-gradient(135deg,#e6dcc8,#ebe3d1)",border:"3px solid #8a3b22",borderRadius:0,padding:"20px 26px",textAlign:"center",minWidth:260,maxWidth:340,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",animation:"popIn 0.3s"}}>
      <div style={{fontSize:40,marginBottom:6}}></div>
      <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:18,color:"#211d18",marginBottom:4}}>{"Новый уровень: "+p.level}</div>
      <div style={{fontSize:11,color:"#6a6052",marginBottom:12}}>Награда за уровень</div>
      <div style={{background:"#ebe3d1",borderRadius:0,padding:"10px 14px",marginBottom:14,display:"flex",flexDirection:"column",gap:6}}>
        {hasStat&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"#6a6052"}}>Очки характеристик</span><span style={{fontWeight:700,color:"#8a6200"}}>{"+"+p.stat}</span></div>}
        {hasSkill&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"#6a6052"}}>Очки навыков</span><span style={{fontWeight:700,color:"#8a6200"}}>{"+"+p.skill}</span></div>}
        {p.maxHp>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"#6a6052"}}>Максимум Здоровья</span><span style={{fontWeight:700,color:"#8a6200"}}>{"+"+p.maxHp}</span></div>}
        {!hasStat&&!hasSkill&&<div style={{fontSize:12,color:"#6a6052"}}>На этот раз без очков</div>}
      </div>
      <div style={{fontSize:10,color:"#6a6052",marginBottom:12}}>Очко навыка тратится на вкладке «Навыки». Навык ×2 стоит 2 очка — он растёт раз в два уровня.</div>
      <button onClick={pr.onAccept} style={{width:"100%",padding:9,borderRadius:0,border:"none",background:"#8a3b22",color:"#ebe3d1",fontFamily:"var(--f-body)",fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ Принять</button>
    </div>
  </div>)}

export default LevelUpPopup;
