import React from 'react';
import { db, ref, update, remove } from '../../firebase';
import { cF, mHP, willPenalty } from '../../utils/character';
import { hasTraitEffect } from '../../data/traits';
import { getTraits } from '../../utils/traitStore';
import { rollHit } from '../../utils/dice';
import { fumbleFx } from '../../utils/gearFx';
import GMAttackPanel from './GMAttackPanel';

function PendingAttackPopup(pr){
  var attacks=pr.attacks||{};
  var myId=pr.myId;var myChar=pr.myChar;var addLog=pr.addLog;var onRoll=pr.onRoll;
  /* Показываем pending_dodge/pending_shield/pending_dmg/dodged, а для страха — ещё pending_fear_choice */
  var pending=Object.entries(attacks).filter(function(e){
    return e[1].targetId===myId&&(e[1].status==="pending_dodge"||e[1].status==="pending_shield"||e[1].status==="pending_dmg"||e[1].status==="dodged"||e[1].status==="pending_fear_choice"||!e[1].status);
  });
  if(pending.length===0)return null;
  var entry=pending[0];var id=entry[0];var atk=entry[1];
  var inf=cF(myChar);var fs=inf.fs;var es=inf.eSk;
  var waiting=atk.status==="pending_dodge"||!atk.status;var shieldPhase=atk.status==="pending_shield";
  var dodged=atk.status==="dodged";
  var isFear=!!atk.fear;var fearChoice=atk.status==="pending_fear_choice";
  var atkD=atk.atkD||"?";var atkREF=atk.atkREF||0;var atkSkill=atk.atkSkill||0;
  var atkBonus=atk.atkBonus||0;var atkSkillName=atk.atkSkillName||"Навык";
  var dodgeDetail=atk.dodgeDetail||"";
  var myCurWill=myChar.curWill!==null&&myChar.curWill!==undefined?myChar.curWill:(fs.volya||1);
  var wPen=willPenalty(myCurWill);var sPen=myChar.shakenPenalty?-myChar.shakenPenalty:0;
  var rPen=wPen+sPen+inf.pen.dose;var physPen=rPen+inf.pen.of("reak");
  function clearShakenPatch(patch){if(myChar.shakenPenalty)patch.shakenPenalty=0;return patch}
  /* Срыв: шум кассеты, износ насадки */
  function gearPatch(skill,R,patch){var fx=fumbleFx(myChar,inf,skill,R);Object.assign(patch,fx.patch);fx.logs.filter(function(l){return !l.gmOnly}).forEach(function(l,i){setTimeout(function(){addLog(Object.assign({who:myChar.name||"???"},l))},5+i)});return patch}
  function doDodge(){
    if(isFear){
      var R2=rollHit();var d2=R2.d;var wv2=fs.volya||0;var sc2=es["Выдержка"]||0;var t2=d2+wv2+sc2+rPen+inf.pen.of("volya");
      var det2="d10("+d2+")+Воля("+wv2+")+Выдержка("+sc2+")"+(wPen?" "+wPen+"(деморализован)":"")+(sPen?" "+sPen+"(потрясён)":"")+(inf.pen.dose?" "+inf.pen.dose+"(Доза)":"")+"="+t2;
      var resisted=t2>=atk.hitRoll;
      update(ref(db,"rooms/"+pr.room+"/characters/"+myId),gearPatch("Выдержка",R2,clearShakenPatch({})));
      if(resisted){
        addLog({who:myChar.name||"???",type:"fear",label:"Устоял перед "+atk.attackerName,detail:det2+" vs "+atk.hitRoll,total:t2});
        update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{status:"done"}).then(function(){remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id));});
      } else {
        addLog({who:myChar.name||"???",type:"fear",label:"Не устоял перед "+atk.attackerName,detail:det2+" vs "+atk.hitRoll,total:t2});
        update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{fearRoll:t2,fearD:d2,fearDetail:det2,status:"pending_fear_choice"});
      }
      return;
    }
    var R=rollHit();var d=R.d;
    var dv=fs.reak||0;
    var dg=es["Уклонение"]||0;
    var t=d+dv+dg+physPen;
    var det="d10("+d+")+Реакция("+dv+")+Уклонение("+dg+")"+(physPen?" +штраф("+physPen+")":"")+"="+t;
    var dodgedNow=t>=atk.hitRoll;
    update(ref(db,"rooms/"+pr.room+"/characters/"+myId),gearPatch("Уклонение",R,clearShakenPatch({})));
    if(dodgedNow){
      /* Успех — ставим статус "dodged", ГМ видит результат с кнопкой Закрыть */
      update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{dodgeRoll:t,dodgeDetail:det,status:"dodged"});
      addLog({who:myChar.name||"???",type:"dodge",label:"Уклонился от "+atk.attackerName,detail:det+" vs "+atk.hitRoll,total:t});
    } else {
      /* Не защитился — переходим в фазу выбора щита */
      update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{dodgeRoll:t,dodgeDetail:det,status:"pending_shield"});
      addLog({who:myChar.name||"???",type:"dodge",label:"Не уклонился от "+atk.attackerName,detail:det+" vs "+atk.hitRoll,total:t});
    }
  }
  function acceptHit(){
    if(isFear){
      update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{fearRoll:-999,fearD:0,fearDetail:"без сопротивления",status:"pending_fear_choice"});
      addLog({who:myChar.name||"???",type:"fear",label:"Не сопротивлялся страху — "+atk.attackerName,detail:"",total:0});
      return;
    }
    update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{dodgeRoll:0,status:"pending_shield"});
  }
  /* Выбор при проигранном броске Страха: Пересилить (−2 Воли, бесплатно на HP<25% с «Хладнокровием») или Поддаться */
  var mx=myChar.hpOv||mHP(fs,myChar);var curHpV=myChar.curHp!==null&&myChar.curHp!==undefined?myChar.curHp:mx;
  var lowHp=mx>0&&(curHpV/mx)<0.25;
  var freeOvercome=lowHp&&hasTraitEffect(myChar,getTraits(),"free_overcome_fear");
  function overcomeFear(){
    var newWill=freeOvercome?myCurWill:myCurWill-2;
    update(ref(db,"rooms/"+pr.room+"/characters/"+myId),{curWill:newWill});
    addLog({who:myChar.name||"???",type:"fear",label:(freeOvercome?"Пересилил страх (бесплатно — «Стержень»)":"Пересилил страх (−2 Воли)")+" — "+atk.attackerName,detail:"Воля: "+myCurWill+"→"+newWill,total:0});
    remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id));
  }
  function giveInFear(){
    var lostBy=atk.hitRoll-(atk.fearRoll||0);
    var broken=lostBy>=5||atk.fearD===1;
    var wLoss=2+Math.floor(Math.random()*2);
    var newWill=myCurWill-wLoss;
    var patch={curWill:newWill};
    if(broken){
      patch.broken=true;
      update(ref(db,"rooms/"+pr.room+"/characters/"+myId),patch);
      addLog({who:myChar.name||"???",type:"fear",label:"Сломлен от страха перед "+atk.attackerName,detail:"Пропуск хода / вынужденное отступление в этот раунд | Воля: "+myCurWill+"→"+newWill+" (−"+wLoss+")",total:0});
    } else {
      patch.shakenPenalty=2;
      update(ref(db,"rooms/"+pr.room+"/characters/"+myId),patch);
      addLog({who:myChar.name||"???",type:"fear",label:"Потрясён перед "+atk.attackerName,detail:"−2 к следующему броску | Воля: "+myCurWill+"→"+newWill+" (−"+wLoss+")",total:0});
    }
    remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id));
  }
  if(isFear){
    var accentF="#6b2f4a";
    return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:998,animation:"fadeIn 0.2s"}}>
      <div style={{background:"#ebe3d1",border:"3px solid "+accentF,borderRadius:0,padding:"18px 22px",textAlign:"center",minWidth:270,maxWidth:350,boxShadow:"0 20px 60px rgba(0,0,0,0.5)",animation:"popIn 0.3s"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <div style={{fontSize:11,color:"#6a6052"}}>{pending.length>1?"Событие 1 из "+pending.length:""}</div>
          {waiting&&<button onClick={function(){update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{status:"done"}).then(function(){remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id));})}} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:"#6a6052",lineHeight:1}} title="Закрыть">✕</button>}
        </div>
        <div style={{fontSize:24,marginBottom:4}}></div>
        <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:15,color:accentF,marginBottom:8}}>{atk.attackerName+" пытается устрашить "+myChar.name+"!"}</div>
        <div style={{background:"#e2d8c3",border:"1px solid #c6bba3",borderRadius:0,padding:"8px 12px",marginBottom:10}}>
          <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>Бросок Устрашения</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexWrap:"wrap",marginBottom:6}}>
            <span style={{fontFamily:"var(--f-body)",fontSize:20,fontWeight:700,color:"#4f5b2a"}}>{"d10: "+(atkD||atk.hitRoll)}</span>
            {atkREF>0&&<span style={{color:"#6a6052"}}>+</span>}
            {atkREF>0&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>{atk.atkStatName||"Характер"}</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkREF}</span></span>}
            {atkSkill>0&&<span style={{color:"#6a6052"}}>+</span>}
            {atkSkill>0&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>{atkSkillName}</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkSkill}</span></span>}
            {!!atk.atkPenalty&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>Штраф</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700,color:"#8a3b22"}}>{atk.atkPenalty}</span></span>}
          </div>
          <div style={{fontFamily:"var(--f-body)",fontSize:32,fontWeight:700,color:accentF}}>{"= "+atk.hitRoll}</div>
        </div>
        <div style={{background:"#e2d8c3",border:"1px solid "+accentF+"40",borderRadius:0,padding:"8px 12px"}}>
          <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>Твоя Выдержка</div>
          {waiting
            ?<div>
              <div style={{fontSize:11,color:"#6a6052",marginBottom:8}}>{"d10 + Воля("+(fs.volya||0)+") + Выдержка("+(es["Выдержка"]||0)+")"+(rPen?" "+rPen:"")}</div>
              <button onClick={doDodge} style={{width:"100%",padding:"10px",borderRadius:0,border:"none",background:accentF,color:"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:6}}>Бросить Выдержку!</button>
              <button onClick={acceptHit} style={{width:"100%",padding:6,borderRadius:0,border:"2px solid #8a3b2240",background:"none",color:"#8a3b22",fontWeight:700,fontSize:10,cursor:"pointer"}}>Не сопротивляться</button>
            </div>
            :<div>
              {atk.fearDetail&&<div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>{atk.fearDetail}</div>}
              <div style={{fontFamily:"var(--f-body)",fontSize:28,fontWeight:700,color:"#8a3b22"}}>{(atk.fearRoll||0)+" vs "+atk.hitRoll}</div>
              <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:13,color:"#8a3b22",marginTop:4,marginBottom:8}}>Не устоял! Выбери реакцию:</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <button onClick={overcomeFear} style={{width:"100%",padding:10,borderRadius:0,border:"none",background:"#4f5b2a",color:"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:12,cursor:"pointer"}}>{freeOvercome?"Пересилить (бесплатно — «Стержень»)":"Пересилить (−2 Воли)"}</button>
                <button onClick={giveInFear} style={{width:"100%",padding:10,borderRadius:0,border:"2px solid #8a3b2240",background:"none",color:"#8a3b22",fontFamily:"var(--f-body)",fontWeight:700,fontSize:12,cursor:"pointer"}}>Поддаться (−2/3 Воли)</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>);
  }
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:998,animation:"fadeIn 0.2s"}}>
    <div style={{background:"#ebe3d1",border:"3px solid "+(waiting?"#8a3b22":dodged?"#3f6b34":"#8a3b22"),borderRadius:0,padding:"18px 22px",textAlign:"center",minWidth:270,maxWidth:350,boxShadow:"0 20px 60px rgba(0,0,0,0.5)",animation:"popIn 0.3s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={{fontSize:11,color:"#6a6052"}}>{pending.length>1?"Атака 1 из "+pending.length:""}</div>
        <button onClick={function(){update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{status:"done"}).then(function(){remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id));})}} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:"#6a6052",lineHeight:1}} title="Отменить атаку">✕</button>
      </div>
      <div style={{fontSize:24,marginBottom:4}}>{waiting?"":dodged?"":shieldPhase?"":""}</div>
      <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:15,color:"#8a3b22",marginBottom:8}}>{atk.attackerName+" атакует "+myChar.name+"!"}</div>
      {/* Бросок атаки с деталями */}
      <div style={{background:"#e2d8c3",border:"1px solid #c6bba3",borderRadius:0,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>Бросок на попадание</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexWrap:"wrap",marginBottom:6}}>
          <span style={{fontFamily:"var(--f-body)",fontSize:20,fontWeight:700,color:atkD===10?"#8a6200":atkD===1?"#8a3b22":"#4f5b2a"}}>{"d10: "+(atkD||atk.hitRoll)}</span>
          {atkREF>0&&<span style={{color:"#6a6052"}}>+</span>}
          {atkREF>0&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>{atk.atkStatName||"Реакция"}</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkREF}</span></span>}
          {atkSkill>0&&<span style={{color:"#6a6052"}}>+</span>}
          {atkSkill>0&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>{atkSkillName}</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkSkill}</span></span>}
          {atkBonus!==0&&<span style={{color:"#6a6052"}}>+</span>}
          {atkBonus!==0&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>Бнс</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkBonus}</span></span>}
          {!!atk.atkPenalty&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>Штраф</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700,color:"#8a3b22"}}>{atk.atkPenalty}</span></span>}
        </div>
        <div style={{fontFamily:"var(--f-body)",fontSize:32,fontWeight:700,color:"#8a3b22"}}>{"= "+atk.hitRoll}</div>
        {atk.atkCrit&&<div style={{fontSize:11,color:"#8a6200",fontWeight:700}}>КРИТ ×1.5</div>}{atk.atkFumble&&<div style={{fontSize:11,color:"#8a3b22",fontWeight:700}}>СРЫВ</div>}
        {atk.weaponName&&<div style={{fontSize:11,color:"#6a6052",marginTop:2}}>{atk.weaponName+" · "+atk.dmgType}</div>}
      </div>
      {/* Уклонение — кнопка или результат */}
      <div style={{background:"#e2d8c3",border:"1px solid "+(waiting?"#c6bba3":shieldPhase?"#4f5b2a40":"#3f6b3440"),borderRadius:0,padding:"8px 12px",marginBottom:waiting?10:0}}>
        <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>Твоё уклонение</div>
        {waiting
          ?<div>
            <div style={{fontSize:11,color:"#6a6052",marginBottom:8}}>{"d10 + Реакция("+(fs.reak||0)+") + Уклонение("+(es["Уклонение"]||0)+")"}</div>
            <button onClick={doDodge} style={{width:"100%",padding:"10px",borderRadius:0,border:"none",background:"#3f6b34",color:"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:6}}>Уклониться!</button>
            <button onClick={acceptHit} style={{width:"100%",padding:6,borderRadius:0,border:"2px solid #8a3b2240",background:"none",color:"#8a3b22",fontWeight:700,fontSize:10,cursor:"pointer"}}>Принять удар</button>
          </div>
          :<div>
            {dodgeDetail&&<div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>{dodgeDetail}</div>}
            <div style={{fontFamily:"var(--f-body)",fontSize:32,fontWeight:700,color:dodged?"#3f6b34":"#8a3b22"}}>{atk.dodgeRoll||0}</div>
            <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:13,color:dodged?"#3f6b34":"#8a3b22",marginTop:4}}>
              {dodged?"Уклонился!":shieldPhase?"Попало! Выбери защиту:":"Попало!"}
            </div>
            {shieldPhase&&(function(){
              var shieldId=myChar.equippedShield;
              var shObj=shieldId?(myChar.shields||[]).find(function(s){return s.id===shieldId}):null;
              var equippedW=(myChar.weapons||[]).find(function(w){return w.id===myChar.equippedWeapon});
              var is2h=equippedW&&(equippedW.hands===2||(equippedW.hands===1.5&&(myChar.weaponMode||"1h")==="2h"));
              var canShield=shObj&&shObj.hp>0&&(!is2h||shObj.freeHands);
              return(<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                {canShield&&<button onClick={function(){update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{status:"pending_dmg",shieldUsed:true,shieldAbsorb:shObj.absorb,shieldName:shObj.name,shieldId:shObj.id});}} style={{width:"100%",padding:10,borderRadius:0,border:"none",background:"#4f5b2a",color:"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Выставить {shObj.name} ({shObj.absorb*100}% поглощения)</button>}
                {canShield&&<div style={{fontSize:11,color:"#6a6052",textAlign:"center"}}>HP щита: {shObj.hp}/{shObj.maxHp}</div>}
                {!canShield&&shObj&&shObj.hp<=0&&<div style={{fontSize:11,color:"#8a3b22",textAlign:"center",fontWeight:700}}>Щит сломан</div>}
                {!shObj&&<div style={{fontSize:11,color:"#6a6052",textAlign:"center",fontStyle:"italic"}}>Нет щита</div>}
                <button onClick={function(){update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{status:"pending_dmg",shieldUsed:false});}} style={{width:"100%",padding:10,borderRadius:0,border:"2px solid #8a3b2240",background:"none",color:"#8a3b22",fontWeight:700,fontSize:12,cursor:"pointer"}}>Принять удар без щита</button>
              </div>);
            })()}
            {!shieldPhase&&!dodged&&<div style={{fontSize:10,color:"#6a6052",marginTop:6,fontStyle:"italic"}}>ГМ наносит урон...</div>}
          </div>
        }
      </div>
    </div>
  </div>)}

/* ── GMAttackPanel: ГМ видит сцену NPC→Игрок ── */

export default PendingAttackPopup;
