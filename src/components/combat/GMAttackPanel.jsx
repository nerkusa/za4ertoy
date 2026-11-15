import React from 'react';
import { db, ref, set, update, remove } from '../../firebase';
import { ZONES, zoneByName } from '../../data/combat';
import { resolvePlayerHit } from '../../utils/hits';
import { r1, rN, sm } from '../../utils/dice';
import PlayerAttackNotif from './PlayerAttackNotif';

function GMAttackPanel(pr){
  var attacks=pr.attacks||{};
  var addLog=pr.addLog;var onRoll=pr.onRoll;var characters=pr.characters||[];
  var active=Object.entries(attacks).filter(function(e){
    return !e[1].fromPlayer&&(e[1].status==="pending_dodge"||e[1].status==="pending_shield"||e[1].status==="pending_dmg"||e[1].status==="dodged"||(!e[1].status&&!e[1].fromPlayer&&e[1].targetId));
  });
  if(active.length===0)return null;
  var entry=active[0];var id=entry[0];var atk=entry[1];
  var waiting=atk.status==="pending_dodge";var shieldPhaseGM=atk.status==="pending_shield";
  var dodged=atk.status==="dodged";
  var tgtChar=characters.find(function(x){return x._fbId===atk.targetId;});
  /* Детали броска атаки */
  var atkD=atk.atkD||"?";
  var atkREF=atk.atkREF||0;
  var atkSkill=atk.atkSkill||0;
  var atkBonus=atk.atkBonus||0;
  var atkSkillName=atk.atkSkillName||"Skill";
  /* Детали уклонения (если пришли) */
  var dodgeDetail=atk.dodgeDetail||"";

  function doRollDmg(){
    if(!tgtChar)return;
    var aimed=!!atk.aimedZone;var zoneD=aimed?0:r1(6);var zoneObj=aimed?zoneByName(atk.aimedZone):ZONES[zoneD-1];var zoneRoll=aimed?"прицел":"1d6="+zoneD;
    var m=(atk.dmgDice||"1d6").match(/(\d+)d(\d+)/);if(!m)return;
    var dice=rN(parseInt(m[1]),parseInt(m[2]));
    var critM=atk.atkCrit?1.5:1;
    var rawDmg=Math.floor((sm(dice)+(atk.dmgBonus||0))*critM);
    /* Зона, броня, щит, железо и крит — одной функцией (utils/hits) */
    var shield=atk.shieldUsed&&atk.shieldAbsorb?{absorb:atk.shieldAbsorb,name:atk.shieldName,id:atk.shieldId}:null;
    var h=resolvePlayerHit(tgtChar,rawDmg,atk.dmgType||"Р",zoneObj,shield);
    update(ref(db,"rooms/"+pr.room+"/characters/"+tgtChar._fbId),h.patch);
    if(h.hd>0){set(ref(db,"rooms/"+pr.room+"/dmgEvents/"+tgtChar._fbId),{attackerName:atk.attackerName,dmg:h.hd,oldHp:h.oldHp,newHp:h.newHp,maxHp:h.maxHp,crit:h.crit?h.crit.label:"",ts:Date.now()});}
    addLog({who:atk.attackerName,type:"dmg_npc",label:atk.weaponName+" → "+atk.targetName+" ["+zoneObj.name+"] "+h.hd+" Здоровья",detail:zoneRoll+" | "+h.desc+" | Здоровье "+h.oldHp+"→"+h.newHp,total:h.hd});
    if(h.crit)setTimeout(function(){addLog({who:atk.targetName,type:"crit",label:h.crit.label,detail:"удар на "+h.hd+" Здоровья",total:0})},5);
    onRoll({label:atk.attackerName+" Урон",d10:null,parts:[{label:atk.dmgDice||"1d6",value:sm(dice)},{label:"Бнс",value:atk.dmgBonus||0}],total:rawDmg,subtext:zoneObj.name+" ×"+h.mult+(zoneObj.ignoreArmor?" (мимо брони)":"")+"\n"+h.desc+"\n→ "+atk.targetName+": "+h.oldHp+"→"+h.newHp+(h.crit?"\n"+h.crit.label:"")});
    remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id));
  }
  function skipDmg(){remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id));}

  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:997,animation:"fadeIn 0.2s"}}>
    <div style={{background:"#ebe3d1",border:"3px solid "+(waiting?"#8a6200":dodged?"#3f6b34":shieldPhaseGM?"#4f5b2a":"#8a3b22"),borderRadius:0,padding:"18px 22px",textAlign:"center",minWidth:270,maxWidth:350,boxShadow:"0 20px 60px rgba(0,0,0,0.5)",animation:"popIn 0.3s"}}>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><button onClick={skipDmg} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#6a6052",lineHeight:1}}>✕</button></div>
      {active.length>1&&<div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>{"Сцена 1 из "+active.length}</div>}
      <div style={{fontSize:24,marginBottom:4}}>{waiting?"":dodged?"":shieldPhaseGM?"":""}</div>
      <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:15,color:"#8a3b22",marginBottom:8}}>{shieldPhaseGM?(atk.attackerName+" → "+atk.targetName+" — щит?"):(atk.attackerName+" атакует "+atk.targetName+"!")}</div>

      {/* Бросок атаки с деталями */}
      <div style={{background:"#e2d8c3",border:"1px solid #c6bba3",borderRadius:0,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>Бросок на попадание</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexWrap:"wrap",marginBottom:6}}>
          <span style={{fontFamily:"var(--f-body)",fontSize:20,fontWeight:700,color:atkD===10?"#8a6200":atkD===1?"#8a3b22":"#4f5b2a"}}>{"d10: "+atkD}</span>
          <span style={{color:"#6a6052"}}>+</span>
          <span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}>
            <span style={{color:"#6a6052",fontSize:10,display:"block"}}>{atk.atkStatName||"Реакция"}</span>
            <span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkREF}</span>
          </span>
          <span style={{color:"#6a6052"}}>+</span>
          <span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}>
            <span style={{color:"#6a6052",fontSize:10,display:"block"}}>{atkSkillName}</span>
            <span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkSkill}</span>
          </span>
          {atkBonus!==0&&<span style={{color:"#6a6052"}}>+</span>}
          {atkBonus!==0&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}>
            <span style={{color:"#6a6052",fontSize:10,display:"block"}}>Бнс</span>
            <span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkBonus}</span>
          </span>}
          {!!atk.atkPenalty&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}>
            <span style={{color:"#6a6052",fontSize:10,display:"block"}}>Штраф</span>
            <span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700,color:"#8a3b22"}}>{atk.atkPenalty}</span>
          </span>}
        </div>
        <div style={{fontFamily:"var(--f-body)",fontSize:32,fontWeight:700,color:"#8a3b22"}}>{"= "+atk.hitRoll}</div>
        {atk.atkCrit&&<div style={{fontSize:11,color:"#8a6200",fontWeight:700}}>КРИТ ×1.5</div>}{atk.atkFumble&&<div style={{fontSize:11,color:"#8a3b22",fontWeight:700}}>СРЫВ</div>}
        <div style={{fontSize:11,color:"#6a6052",marginTop:2}}>{atk.weaponName+" · "+atk.dmgDice+" · "+atk.dmgType}</div>
      </div>

      {/* Уклонение — ждём или показываем */}
      <div style={{background:"#e2d8c3",border:"1px solid "+(waiting?"#c6bba3":shieldPhaseGM?"#4f5b2a40":"#3f6b3440"),borderRadius:0,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>Уклонение {atk.targetName}</div>
        {waiting
          ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"6px 0"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#8a6200",animation:"fadeIn 0.5s infinite alternate"}}/>
            <span style={{fontSize:12,color:"#6a6052",fontStyle:"italic"}}>ждём броска игрока...</span>
          </div>
          :<div>
            <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>{dodgeDetail}</div>
            <div style={{fontFamily:"var(--f-body)",fontSize:32,fontWeight:700,color:dodged?"#3f6b34":"#8a3b22"}}>{atk.dodgeRoll||0}</div>
            <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:13,color:dodged?"#3f6b34":shieldPhaseGM?"#4f5b2a":"#8a3b22",marginTop:4}}>
              {dodged?"Уклонился!":shieldPhaseGM?"Попало! Игрок выбирает щит...": "Попало!"}
            </div>
            {shieldPhaseGM&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:4,padding:"4px 0",background:"#0e2236",borderRadius:0}}><div style={{width:6,height:6,borderRadius:"50%",background:"#4f5b2a"}}/><span style={{fontSize:10,color:"#4f5b2a",fontStyle:"italic"}}>ждём решения...</span></div>}
          </div>
        }
      </div>

      {/* Кнопки */}
      {(waiting||shieldPhaseGM)&&<div style={{fontSize:11,color:"#6a6052",fontStyle:"italic"}}>{shieldPhaseGM?"Игрок выбирает защиту...": "Ожидаем действия игрока..."}</div>}
      {!waiting&&!shieldPhaseGM&&(dodged
        ?<button onClick={skipDmg} style={{width:"100%",padding:8,borderRadius:0,border:"none",background:"#3f6b34",color:"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Закрыть</button>
        :<button onClick={doRollDmg} style={{width:"100%",padding:10,borderRadius:0,border:"none",background:"#8a3b22",color:"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:14,cursor:"pointer"}}>Бросить урон + зону!</button>
      )}
    </div>
  </div>)}

/* ── PlayerAttackNotif: ГМ видит сцену Игрок→NPC (кидает уклонение / авто-урон) ── */

export default GMAttackPanel;
