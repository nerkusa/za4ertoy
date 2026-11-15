import React from 'react';
import { db, ref, update, remove } from '../../firebase';
import { ZONES, SHIELD_T, zoneByName } from '../../data/combat';
import { calcAE } from '../../utils/combat';
import { npcZoneMult, npcRaw, npcCritPatch } from '../../utils/hits';
import { npcCritPen } from '../../utils/crits';
import { willPenalty } from '../../utils/character';
import { r1, rN, sm, rollHit } from '../../utils/dice';
import DamagePopup from './DamagePopup';
import PlayerAttackStatus from './PlayerAttackStatus';

function PlayerAttackNotif(pr){
  var attacks=pr.attacks||{};
  var spawned=pr.spawned||{};var saveSpawned=pr.saveSpawned;
  var addLog=pr.addLog;var onRoll=pr.onRoll;
  /* Сначала pending_dodge — нужно уклонение */
  var needDodge=Object.entries(attacks).filter(function(e){return e[1].fromPlayer&&e[1].status==="pending_dodge";});
  /* pending_dmg — показываем ГМу кнопку урона (не авто) */
  var needDmg=Object.entries(attacks).filter(function(e){return e[1].fromPlayer&&e[1].status==="pending_dmg";});
  if(needDodge.length===0&&needDmg.length===0)return null;
  /* Если только pending_dmg — показываем попап с кнопкой урона */
  if(needDodge.length===0&&needDmg.length>0){
    var dmgEntry=needDmg[0];var dmgId=dmgEntry[0];var dmgAtk=dmgEntry[1];
    var dmgNpc=spawned[dmgAtk.npcId];
    var dodgedNpc=(dmgAtk.dodgeRoll||0)>=(dmgAtk.hitRoll||0);
    function doNpcDmg(){
      if(!dmgNpc)return;
      var aimed=!!dmgAtk.aimedZone;var zoneD=aimed?0:r1(6);var zoneObj=aimed?zoneByName(dmgAtk.aimedZone):ZONES[zoneD-1];var zoneRoll=aimed?"прицел":"1d6="+zoneD;
      var m=(dmgAtk.dmgDice||"1d6").match(/(\d+)d(\d+)/);if(!m)return;
      var dice=rN(parseInt(m[1]),parseInt(m[2]));
      var critM=dmgAtk.atkCrit?1.5:1;
      var rawDmg=Math.floor((sm(dice)+(dmgAtk.dmgBonus||0))*critM);
      var multiplied=Math.floor(npcRaw(dmgNpc,rawDmg,dmgAtk.dmgType)*npcZoneMult(dmgNpc,zoneObj));
      var npcArmorType=zoneObj.slot==="head"?(dmgNpc.armorHead||"none"):(dmgNpc.armorBody||"none");
      var npcArmorHp=zoneObj.slot==="head"?(dmgNpc.armorHeadHp||0):(dmgNpc.armorBodyHp||0);
      if(npcArmorHp<=0)npcArmorType="none";
      var ae=zoneObj.ignoreArmor?{ad:0,hd:multiplied,desc:"мимо брони: "+zoneObj.name+"×"+zoneObj.mult}:calcAE(npcArmorType,dmgAtk.dmgType||"Р",multiplied);
      var shieldDmg=0,shieldDesc="";
      if(dmgNpc.shieldType&&dmgNpc.shieldType!=="none"&&(dmgNpc.shieldHp||0)>0){var shObj=SHIELD_T.find(function(t){return t.id===dmgNpc.shieldType});var absorb=shObj?shObj.absorb:0;shieldDmg=Math.floor(ae.hd*absorb);ae=Object.assign({},ae,{hd:Math.max(0,ae.hd-shieldDmg)});shieldDesc=" щит "+(dmgNpc.shieldName||(shObj?shObj.name:dmgNpc.shieldType))+" −"+shieldDmg;}
      var newNpcHp=Math.max(0,(dmgNpc.hp||0)-ae.hd);
      var updNpc=Object.assign({},dmgNpc,{hp:newNpcHp});
      if(shieldDmg>0)updNpc.shieldHp=Math.max(0,(dmgNpc.shieldHp||0)-shieldDmg);
      if(ae.ad>0){if(zoneObj.slot==="head")updNpc.armorHeadHp=Math.max(0,(dmgNpc.armorHeadHp||0)-ae.ad);else updNpc.armorBodyHp=Math.max(0,(dmgNpc.armorBodyHp||0)-ae.ad);}
                var _cr=npcCritPatch(dmgNpc,zoneObj.name,ae.hd);Object.assign(updNpc,_cr.patch);if(_cr.label)setTimeout(function(){addLog({who:dmgAtk.attackerName,type:"crit",label:dmgAtk.npcName+": "+_cr.label,detail:"удар на "+ae.hd+" Здоровья",total:0})},5);
      var spAll=Object.assign({},spawned);spAll[dmgAtk.npcId]=updNpc;saveSpawned(spAll);
      addLog({who:dmgAtk.attackerName,type:"dmg",label:""+dmgAtk.weaponName+" → "+dmgAtk.npcName+" ["+zoneObj.e+zoneObj.name+"] "+ae.hd+" HP",detail:zoneRoll+" "+zoneObj.name+" | "+ae.desc+shieldDesc+" | Здоровье "+(dmgNpc.hp||0)+"→"+newNpcHp,total:ae.hd});
      onRoll&&onRoll({label:dmgAtk.attackerName+" Урон",d10:null,parts:[{label:dmgAtk.dmgDice||"1d6",value:sm(dice)},{label:"Бнс",value:dmgAtk.dmgBonus||0}],total:rawDmg,subtext:zoneObj.e+" "+zoneObj.name+" ×"+zoneObj.mult+(zoneObj.ignoreArmor?" (мимо брони)":"")+"\n"+ae.desc+"\n→ "+dmgAtk.npcName+": "+(dmgNpc.hp||0)+"→"+newNpcHp+" HP"});
      remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+dmgId));
    }
    function skipNpcDmg(){remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+dmgId));}
    return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:998,animation:"fadeIn 0.2s"}}>
      <div style={{background:"#ebe3d1",border:"3px solid "+(dodgedNpc?"#3f6b34":"#8a3b22"),borderRadius:0,padding:"18px 22px",textAlign:"center",minWidth:270,maxWidth:350,boxShadow:"0 20px 60px rgba(0,0,0,0.5)",animation:"popIn 0.3s"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><button onClick={skipNpcDmg} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#6a6052"}}>✕</button></div>
        <div style={{fontSize:24,marginBottom:4}}>{dodgedNpc?"":""}</div>
        <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:14,color:dodgedNpc?"#3f6b34":"#8a3b22",marginBottom:8}}>{dmgAtk.attackerName+" vs "+dmgAtk.npcName}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:10}}>
          <div style={{textAlign:"center",background:"#efe2d6",borderRadius:0,padding:"6px 14px"}}><div style={{fontSize:11,color:"#6a6052",marginBottom:1}}>Атака</div><div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:26,color:"#8a3b22"}}>{dmgAtk.hitRoll}</div></div>
          <div style={{fontSize:15,color:"#6a6052",fontWeight:700,alignSelf:"center"}}>vs</div>
          <div style={{textAlign:"center",background:"#e5e4cc",borderRadius:0,padding:"6px 14px"}}><div style={{fontSize:11,color:"#6a6052",marginBottom:1}}>Уклонение</div><div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:26,color:"#3f6b34"}}>{dmgAtk.dodgeRoll||0}</div></div>
        </div>
        <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:13,color:dodgedNpc?"#3f6b34":"#8a3b22",marginBottom:10}}>{dodgedNpc?"NPC уклонился!":"Попало!"}</div>
        {dodgedNpc
          ?<button onClick={skipNpcDmg} style={{width:"100%",padding:8,borderRadius:0,border:"none",background:"#3f6b34",color:"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Закрыть</button>
          :<div style={{marginTop:4,padding:"8px",background:"#efe2d6",borderRadius:0,fontSize:10,color:"#6a6052",fontStyle:"italic",textAlign:"center"}}>Игрок бросает урон...</div>
        }
      </div>
    </div>);
  }
  if(needDodge.length===0)return null;
  var entry=needDodge[0];var id=entry[0];var atk=entry[1];
  var npc=spawned[atk.npcId];
  var isFear=!!atk.fear;
  function npcCurWill(){return npc?(npc.curWill!=null?npc.curWill:((npc.stats||{}).volya||0)):0}
  function resolveFear(t,det){
    var lost=t<atk.hitRoll;
    if(lost){
      var wLoss=2+Math.floor(Math.random()*2);var cw=npcCurWill();var newWill=cw-wLoss;
      var spAll=Object.assign({},spawned);spAll[atk.npcId]=Object.assign({},npc,{curWill:newWill});saveSpawned(spAll);
      addLog({who:npc.name,type:"fear",label:""+npc.name+" не устоял перед "+atk.attackerName+" — теряет Волю",detail:det+" vs "+atk.hitRoll+" | Воля "+cw+"→"+newWill,total:t});
      onRoll&&onRoll({label:atk.attackerName+" Устрашение",d10:null,parts:[],total:t,subtext:npc.name+" не устоял!\nВоля: "+cw+" → "+newWill+" (−"+wLoss+")"});
    } else {
      addLog({who:npc.name,type:"fear",label:""+npc.name+" устоял перед "+atk.attackerName,detail:det+" vs "+atk.hitRoll,total:t});
      onRoll&&onRoll({label:atk.attackerName+" Устрашение",d10:null,parts:[],total:t,subtext:npc.name+" устоял!"});
    }
    remove(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id));
  }
  function doDodge(){
    if(!npc)return;
    var st=npc.stats||{};var sk=npc.skills||{};var exsk=npc.extraSkills||{};
    var wp=willPenalty(npcCurWill())+npcCritPen(npc,"all");
    var R=rollHit();var d=R.d;
    if(isFear){
      var wv0=st.volya||0;var sc0=exsk["Выдержка"]||0;var t0=d+wv0+sc0+wp;
      var det0="d10("+d+")+Воля("+wv0+")+Выдержка("+sc0+")"+(wp?" "+wp+"(деморализован)":"")+"="+t0;
      resolveFear(t0,det0);
      return;
    }
    var dv=st.reak||0;
    var dg=sk.dodge||0;
    var t=d+dv+dg+wp+npcCritPen(npc,"dodge");
    var det="d10("+d+")+Реакция("+dv+")+Уклонение("+dg+")"+(wp?" "+wp+"(деморализован)":"")+"="+t;
    var dodged=t>=atk.hitRoll;
    update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{dodgeRoll:t,status:dodged?"done":"pending_dmg",dodgeDetail:det});
    addLog({who:npc.name,type:"dodge",label:(dodged?"Уклонился от ":"Не уклонился от ")+atk.attackerName,detail:det+" vs "+atk.hitRoll,total:t});
    /* onRoll убран — результат показывается в PlayerAttackStatus у игрока */
  }
  function acceptHit(){
    if(isFear){resolveFear(-999,"без сопротивления");return;}
    update(ref(db,"rooms/"+pr.room+"/pendingAttacks/"+id),{dodgeRoll:0,status:"pending_dmg"});
  }
  var atkD2=atk.atkD||"?";var atkREF2=atk.atkREF||0;var atkStat2=atk.atkStatName||"Реакция";var atkSkill2=atk.atkSkill||0;var atkBonus2=atk.atkBonus||0;var atkSkillName2=atk.atkSkillName||"Навык";
  var npcDex=npc?(npc.stats||{}).reak||0:0;var npcDodge=npc?(npc.skills||{}).dodge||0:0;
  var npcWill=npc?(npc.stats||{}).volya||0:0;
  var accent=isFear?"#6b2f4a":"#4f5b2a";
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:998,animation:"fadeIn 0.2s"}}>
    <div style={{background:"#ebe3d1",border:"3px solid "+accent,borderRadius:0,padding:"18px 22px",textAlign:"center",minWidth:270,maxWidth:350,boxShadow:"0 20px 60px rgba(0,0,0,0.5)",animation:"popIn 0.3s"}}>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}><button onClick={acceptHit} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#6a6052",lineHeight:1}}>✕</button></div>
      {needDodge.length>1&&<div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>{"Атака 1 из "+needDodge.length}</div>}
      <div style={{fontSize:24,marginBottom:4}}>{isFear?"":""}</div>
      <div style={{fontFamily:"var(--f-body)",fontWeight:700,fontSize:15,color:isFear?"#6b2f4a":"#4f5b2a",marginBottom:8}}>{atk.attackerName+(isFear?" пытается устрашить ":" атакует ")+atk.npcName+"!"}</div>
      {/* Бросок атаки с деталями */}
      <div style={{background:"#e2d8c3",border:"1px solid #c6bba3",borderRadius:0,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>Бросок на попадание</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexWrap:"wrap",marginBottom:6}}>
          <span style={{fontFamily:"var(--f-body)",fontSize:20,fontWeight:700,color:atkD2===10?"#8a6200":atkD2===1?"#8a3b22":"#4f5b2a"}}>{"d10: "+atkD2}</span>
          <span style={{color:"#6a6052"}}>+</span>
          <span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>{atkStat2}</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkREF2}</span></span>
          <span style={{color:"#6a6052"}}>+</span>
          <span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>{atkSkillName2}</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkSkill2}</span></span>
          {atkBonus2!==0&&<span style={{color:"#6a6052"}}>+</span>}
          {atkBonus2!==0&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>Бнс</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700}}>{atkBonus2}</span></span>}
          {!!atk.atkPenalty&&<span style={{background:"#d8cdb4",borderRadius:0,padding:"2px 6px",textAlign:"center"}}><span style={{color:"#6a6052",fontSize:10,display:"block"}}>Штраф</span><span style={{fontFamily:"var(--f-body)",fontSize:13,fontWeight:700,color:"#8a3b22"}}>{atk.atkPenalty}</span></span>}
        </div>
        <div style={{fontFamily:"var(--f-body)",fontSize:32,fontWeight:700,color:"#4f5b2a"}}>{"= "+atk.hitRoll}</div>
        {atk.atkCrit&&<div style={{fontSize:11,color:"#8a6200",fontWeight:700}}>КРИТ ×1.5</div>}{atk.atkFumble&&<div style={{fontSize:11,color:"#8a3b22",fontWeight:700}}>СРЫВ</div>}
        <div style={{fontSize:11,color:"#6a6052",marginTop:2}}>{(atk.weaponName||"")+(atk.dmgType?" · "+atk.dmgType:"")}</div>
      </div>
      {/* Защита NPC */}
      <div style={{background:"#e2d8c3",border:"1px solid "+(isFear?"#6b2f4a40":"#c6bba3"),borderRadius:0,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontSize:11,color:"#6a6052",marginBottom:4}}>{isFear?("Выдержка "+atk.npcName):("Уклонение "+atk.npcName)}</div>
        <div style={{fontSize:11,color:"#6a6052",marginBottom:6}}>{isFear?("d10 + Воля("+npcWill+") + Выдержка("+((npc&&(npc.extraSkills||{})["Выдержка"])||0)+")"):("d10 + Реакция("+npcDex+") + Уклонение("+npcDodge+")")}</div>
        <button onClick={doDodge} style={{width:"100%",padding:"10px",borderRadius:0,border:"none",background:isFear?"#6b2f4a":"#3f6b34",color:"#fff",fontFamily:"var(--f-body)",fontWeight:700,fontSize:14,cursor:"pointer"}}>{isFear?"Бросить Выдержку!":"Бросить уклонение!"}</button>
      </div>
      <button onClick={acceptHit} style={{width:"100%",padding:6,borderRadius:0,border:"2px solid "+accent+"40",background:"none",color:"#6a6052",fontWeight:700,fontSize:10,cursor:"pointer"}}>{isFear?"Не сопротивляться страху":"Принять удар без уклонения"}</button>
    </div>
  </div>)}

/* ── DamagePopup — показывается игроку при получении урона ── */

export default PlayerAttackNotif;
