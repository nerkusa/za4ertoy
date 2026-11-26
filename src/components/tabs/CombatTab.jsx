import React, { useState } from 'react';
import { db, ref, set } from '../../firebase';
import { ZONES, ARMOR_T, aimPen, weapDur, weaponWear, armorPenaltyOf, woundDmgPenalty } from '../../data/combat';
import { getProfs } from '../../utils/profStore';
import { DT, WS, WT, wStat, wtLabel, stName } from '../../data/stats';
import { fumbleFx, inCombat } from '../../utils/gearFx';
import { getScene } from '../../utils/sceneStore';
import { movingPen } from '../../utils/vehicles';
import { hasDepo, twoIronArms } from '../../data/traits';
import { PROSTHETIC_TELO } from '../../data/gear';
import { cF, mHP, willPenalty } from '../../utils/character';
import { applyDmgToNpc } from '../../utils/combat';
import { tryPay } from '../../utils/currency';
import { grantPatch } from '../../utils/grant';
import { hasTraitEffect } from '../../data/traits';
import { getTraits } from '../../utils/traitStore';
import { r1, rN, sm, uid, rollHit } from '../../utils/dice';
import ArmorSection from './ArmorSection';
import CritsCard from '../CritsCard';
import { critsAfterRest } from '../../utils/crits';
import { diseaseFlag } from '../../data/gear';
import ShopPicker from '../ShopPicker';
import InitiativeBar from '../combat/InitiativeBar';
import CondBar from '../CondBar';
import { condsOf, condByKey, removeCond } from '../../utils/conditions';

function Lbl(pr){return <div style={{fontSize:11,fontWeight:700,letterSpacing:.06,textTransform:"uppercase",color:"var(--color-text-muted)"}}>{pr.children}</div>}
function Bar(pr){return(<div style={{height:pr.h||8,borderRadius:0,background:"var(--color-sunken)",overflow:"hidden"}}><div style={{height:"100%",width:pr.pct+"%",background:pr.color,transition:"width 0.3s"}}/></div>)}

function CombatTab(pr){
var c=pr.char;var sv=pr.save;var oR=pr.onRoll;var inf=cF(c);var fs=inf.fs;var es=inf.eSk;
var pf=getProfs().find(function(p){return p.id===c.profession})||getProfs()[0];
var hasDualWield=hasTraitEffect(c,getTraits(),"dual_wield");
var _sa=useState(false);var sa=_sa[0];var sSA=_sa[1];
var _wn=useState("");var wn=_wn[0];var sWN=_wn[1];
var _wt=useState("Battle");var wt=_wt[0];var sWT=_wt[1];
var _wdt=useState("Р");var wdt=_wdt[0];var sWDT=_wdt[1];
var _wb=useState(0);var wb=_wb[0];var sWB=_wb[1];
var _wdi=useState("1d6");var wdi=_wdi[0];var sWDI=_wdi[1];
var _wh=useState(1);var wh=_wh[0];var sWH=_wh[1];
var _wdi2=useState("2d6");var wdi2=_wdi2[0];var sWDI2=_wdi2[1];var _wb2=useState(0);var wb2=_wb2[0];var sWB2=_wb2[1];
var _wcl=useState(1);var wcl=_wcl[0];var sWCL=_wcl[1];
var _wam=useState("Стрела");var wam=_wam[0];var sWAM=_wam[1];
var _tgt=useState(null);var tgtId=_tgt[0];var sTgt=_tgt[1];
var _zone=useState("Торс");var selZone=_zone[0];var sZone=_zone[1];
var _aim=useState(false);var aim=_aim[0];var sAim=_aim[1];
var spawned=pr.spawned||{};var saveSpawned=pr.saveSpawned;
var spawnedArr=Object.entries(spawned).filter(function(e){var hp=e[1].hp!==undefined?e[1].hp:e[1].maxHp;return hp>0});
var tgtNpc=tgtId?spawned[tgtId]:null;
var mx=c.hpOv||mHP(fs,c);var curHp=c.curHp!==null&&c.curHp!==undefined?c.curHp:mx;
var mxW=c.willOv||fs.volya||1;var curW=c.curWill!==null&&c.curWill!==undefined?c.curWill:mxW;
var willPen=willPenalty(curW);var shakenPen=c.shakenPenalty?-c.shakenPenalty:0;var dosePen=inf.pen.dose;
/* rollPen — общий штраф (Воля, потрясение, Доза); penOf(stat) — он же плюс болезни и криты
   для броска от этой характеристики; атака ещё учитывает штраф к атаке (рёбра). */
var rollPen=willPen+shakenPen+dosePen;function penOf(k){return rollPen+inf.pen.of(k)}var physPen=penOf("reak");var disPen=physPen-rollPen;
var fighting=inCombat(pr.initiative,c._fbId);var depoOn=!!c.combatDepoUsed;
/* Срыв: шум кассеты, износ насадки — патч персонажа и строки в лог */
function gearAfter(skill,R,patch){var fx=fumbleFx(c,inf,skill,R);Object.assign(patch,fx.patch);fx.logs.filter(function(l){return !l.gmOnly}).forEach(function(l,i){setTimeout(function(){pr.addLog(Object.assign({who:c.name||"???"},l))},5+i)});return fx.notes}
function clearShaken(){if(c.shakenPenalty)sv(Object.assign({},c,{shakenPenalty:0}))}
var atkPen=armorPenaltyOf(c,fs).atk;var woundPen=depoOn?0:woundDmgPenalty(curHp,mx);var aimBonus=inf.effects.filter(function(e){return e.type==="aim_bonus"}).reduce(function(a,e){return a+(e.amount||0)},0);
/* Удар протезом бьёт так, будто Тело 7 (глава 10) */
function telOf(w,statKey){return (w&&w.prosthetic&&statKey==="telo")?PROSTHETIC_TELO:(fs[statKey]||0)}
/* Стрельба на ходу (сцена «На ходу»): −2, водитель −4 */
var isDriver=(c.garage||[]).some(function(v){return v.driverId===c._fbId})||Object.values(pr.vehicles||{}).some(function(v){return v&&v.driverId===c._fbId});var movePen=getScene().moving?movingPen(isDriver,false):0;
function aimP2(zone){return Math.max(0,aimPen(zone)-aimBonus+inf.pen.aim)}
var hpP=mx>0?(curHp/mx)*100:0;
var isGM=pr.isGM;
var visibleLogs=(pr.logs||[]).filter(function(l){return isGM||(l.type!=="dmg_npc"&&l.type!=="spawn"&&l.type!=="gm_roll")});

/* Выпутаться из сети: Тело + Атлетика + d10 против СЛ */
function escapeCond(d){var R=rollHit();var tv=fs.telo||0;var at=es["Атлетика"]||0;var pen=inf.rollPen("telo");var t=R.d+tv+at+pen.total;var ok=t>=d.escape.dc;
  if(ok)sv(Object.assign({},c,{conds:removeCond(c,d.key)}));
  pr.addLog({who:c.name||"???",type:"skill",label:(c.name||"???")+": выпутаться ("+d.name+") — "+(ok?"вышло":"не вышло"),detail:"d10("+R.d+") + Тело("+tv+") + Атлетика("+at+")"+(pen.total?" + штраф("+pen.total+")":"")+" = "+t+" против СЛ "+d.escape.dc,total:t});
  if(oR)oR({label:"Выпутаться · СЛ "+d.escape.dc,d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:"Тело",value:tv},{label:"Атлетика",value:at}].concat(pen.parts),total:t,subtext:ok?"Свободен":"Сеть держит"})}

return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
{(condsOf(c).length>0||isGM)&&<CondBar target={c} self={!isGM} edit={!!isGM} onEscape={escapeCond} onChange={function(conds,label){sv(Object.assign({},c,{conds:conds}));pr.addLog({who:isGM?"ГМ":(c.name||"???"),type:"crit",label:(c.name||"???")+": "+label,detail:"",total:0})}}/>}

<div style={{display:"flex",gap:8}}>
<div className="n-card" style={{flex:1,display:"flex",flexDirection:"column",gap:2,padding:"8px 14px"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<Lbl>Воля</Lbl>
<div style={{display:"flex",alignItems:"center",gap:5}}><button onClick={function(){sv(Object.assign({},c,{curWill:Math.max(0,curW-1)}))}} className="n-btn n-btn-secondary" style={{width:20,height:20,padding:0,fontSize:11}}>−</button><span style={{fontWeight:700,fontSize:13,color:willPen?"#8a3b22":"var(--color-accent)"}}>{curW+"/"+mxW}</span><button onClick={function(){sv(Object.assign({},c,{curWill:Math.min(mxW,curW+1)}))}} className="n-btn n-btn-secondary" style={{width:20,height:20,padding:0,fontSize:11}}>+</button></div>
</div>
{willPen!==0&&<div style={{fontSize:10,color:"#8a3b22",textAlign:"right"}}>{willPen+" ко всем броскам"}</div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<button onClick={function(){var healHp=sm(rN(2,6));var healWill=r1(10);var noHeal=(c.dose||0)>=4;if(noHeal)healHp=0;if(diseaseFlag(c,"restHalf"))healHp=Math.floor(healHp/2);var newHp=Math.min(mx,curHp+healHp);var newWill=Math.min(mxW,curW+healWill);sv(Object.assign({},c,{curHp:newHp,curWill:newWill,crits:critsAfterRest(c),conds:[],shakenPenalty:0,broken:false,repairUsed:false,combatDepoUsed:false}));pr.addLog({who:c.name||"???",type:"rest",label:"Короткий отдых — способности восстановлены",detail:(noHeal?"Доза 4+ — Здоровье не восстанавливается":"Здоровье +"+healHp+" (2d6)")+", Воля +"+healWill+" (1d10)",total:0})}} title="2d6 Здоровья + 1d10 Воли" className="n-btn n-btn-secondary" style={{color:"#3f6b34",padding:"5px 14px",fontSize:12}}>Короткий отдых</button>
<button onClick={function(){var noHeal2=(c.dose||0)>=4;if(!window.confirm(noHeal2?"Доза 4+ — Здоровье не восстановится, только Воля. Отдыхать?":"Полноценный отдых — полностью восстановить Здоровье и Волю?"))return;sv(Object.assign({},c,{curHp:noHeal2?curHp:(diseaseFlag(c,"restHalf")?Math.min(mx,curHp+Math.floor((mx-curHp)/2)):mx),curWill:mxW,depoCharge:1,crits:critsAfterRest(c),conds:[],cassettes:(c.cassettes||[]).map(function(x){return x.stuck?Object.assign({},x,{stuck:false}):x}),shakenPenalty:0,broken:false,repairUsed:false,combatDepoUsed:false}));pr.addLog({who:c.name||"???",type:"rest",label:"Полноценный отдых — всё восстановлено",detail:(noHeal2?"Доза 4+ — Здоровье не восстановлено":"Здоровье "+mx+"/"+mx)+", Воля "+mxW+"/"+mxW,total:0})}} title="Полностью восстанавливает Здоровье и Волю" className="n-btn n-btn-secondary" style={{color:"#4f5b2a",padding:"5px 14px",fontSize:12}}>Полноценный отдых</button>
</div>
</div>

<div className="n-combat-grid">
<div style={{display:"flex",flexDirection:"column",gap:14}}>

{/* Оружие */}
<div className="n-card">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Lbl>Оружие</Lbl><div style={{display:"flex",gap:6}}><button onClick={function(){if((c.weapons||[]).some(function(x){return x.type==="Brawl"&&x.name==="Кулаки"})){alert("Кулаки уже добавлены");return}sv(Object.assign({},c,{weapons:(c.weapons||[]).concat([{id:uid(),name:"Кулаки",type:"Brawl",dmgType:"Д",bonus:0,dmgDice:"1d4",hands:1}])}))}} title="Добавить рукопашную атаку (1d4, Тело + Ближний бой)" className="n-btn n-btn-secondary" style={{padding:"3px 9px",fontSize:10,color:"#8a3b22"}}>Кулаки</button><button onClick={function(){sSA(!sa)}} title="Добавить своё оружие вручную" className="n-btn n-btn-secondary" style={{width:26,height:26,padding:0,fontSize:14,color:"#4f5b2a"}}>{sa?"✕":"✎"}</button></div></div>
<ShopPicker color="#8a3b22" label="Добавить оружие" items={(pr.shop||[]).filter(function(i){return i.cat==="weapon"})} subOf={function(it){return it.wtype}} suborder={["Battle","Simple","Guns","Archery","Thrown","Brawl"]} sublabels={{Battle:"Боевое оружие",Simple:"Ближний бой",Guns:"Огнестрел",Archery:"Лук",Thrown:"Метательное",Brawl:"Рукопашное"}} sub={function(it){var h=it.hands===2?"двуруч.":it.hands===1.5?"полуторн.":"одноруч.";return wtLabel(it.wtype)+" · "+it.dmgDice+(it.bonus?"+"+it.bonus:"")+" · "+it.dmgType+" · "+h+(it.desc?" · "+it.desc:"")}} onPick={function(it){var pay=tryPay(c,it.price);if(pay===null)return;sv(Object.assign({},c,pay,grantPatch(c,getTraits(),it)))}}/>
{sa&&<div style={{background:"var(--color-sunken)",borderRadius:0,padding:10,marginBottom:8,display:"flex",flexDirection:"column",gap:6}}>
<input className="n-input" value={wn} onChange={function(e){sWN(e.target.value)}} placeholder="Название"/>
<div style={{display:"flex",gap:6}}>
<select className="n-input" value={wt} onChange={function(e){sWT(e.target.value)}} style={{flex:1,padding:"6px 8px",minHeight:34,cursor:"pointer"}}>{WT.map(function(t){return <option key={t} value={t}>{wtLabel(t)}</option>})}</select>
<select className="n-input" value={wdt} onChange={function(e){sWDT(e.target.value)}} style={{width:60,padding:"6px 8px",minHeight:34,cursor:"pointer"}}>{DT.map(function(t){return <option key={t} value={t}>{t}</option>})}</select>
</div>
<div style={{display:"flex",gap:6}}>{[1,1.5,2].map(function(h){return<button key={h} onClick={function(){sWH(h)}} className="n-btn n-btn-secondary" style={{flex:1,fontSize:11,padding:"5px 0",borderColor:wh===h?"#4f5b2a":"var(--color-divider)",color:wh===h?"#4f5b2a":"var(--color-text-muted)"}}>{h===1?"Одноручное":h===1.5?"Полуторное":"Двуручное"}</button>})}</div>
{wh!==1.5
?<div style={{display:"flex",gap:6}}><input className="n-input" style={{flex:1,padding:"6px 8px",minHeight:34}} value={wdi} onChange={function(e){sWDI(e.target.value)}} placeholder="1d6"/><input className="n-input" style={{width:56,padding:"6px 8px",minHeight:34}} type="number" value={wb} onChange={function(e){sWB(parseInt(e.target.value)||0)}} placeholder="Бнс"/></div>
:<div style={{display:"flex",flexDirection:"column",gap:6}}>
<div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:11,color:"var(--color-text-muted)",width:50}}>1 рука:</span><input className="n-input" style={{flex:1,padding:"6px 8px",minHeight:34}} value={wdi} onChange={function(e){sWDI(e.target.value)}} placeholder="1d8"/><input className="n-input" style={{width:50,padding:"6px 8px",minHeight:34}} type="number" value={wb} onChange={function(e){sWB(parseInt(e.target.value)||0)}} placeholder="Бнс"/></div>
<div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:11,color:"var(--color-text-muted)",width:50}}>2 руки:</span><input className="n-input" style={{flex:1,padding:"6px 8px",minHeight:34}} value={wdi2} onChange={function(e){sWDI2(e.target.value)}} placeholder="2d8"/><input className="n-input" style={{width:50,padding:"6px 8px",minHeight:34}} type="number" value={wb2} onChange={function(e){sWB2(parseInt(e.target.value)||0)}} placeholder="Бнс"/></div>
</div>}
{(wdt==="П"||wt==="Archery")&&<div style={{display:"flex",gap:6,alignItems:"center"}}>{wdt==="П"&&<React.Fragment><span style={{fontSize:11,color:"#8a6200",width:70}}>Обойма:</span><input className="n-input" style={{width:56,padding:"6px 8px",minHeight:34}} type="number" value={wcl} onChange={function(e){sWCL(parseInt(e.target.value)||1)}} placeholder="1"/></React.Fragment>}<span style={{fontSize:11,color:"var(--color-text-muted)"}}>снаряд:</span><select className="n-input" value={wam} onChange={function(e){sWAM(e.target.value)}} style={{flex:1,padding:"6px 8px",minHeight:34,cursor:"pointer"}}>{["Стрела","Болт","Пуля"].map(function(a){return <option key={a} value={a}>{a}</option>})}</select></div>}
<button onClick={function(){if(!wn.trim())return;var newW={id:uid(),name:wn.trim(),type:wt,dmgType:wdt,bonus:wb,dmgDice:wdi,hands:wh};if(wh===1.5){newW.dmgDice2h=wdi2;newW.bonus2h=wb2;}if(wdt==="П"){newW.clip=wcl;newW.ammo=wcl;newW.ammoType=wam;}else if(wt==="Archery"){newW.ammoType=wam;}sv(Object.assign({},c,{weapons:(c.weapons||[]).concat([newW])}));sWN("");sSA(false);sWH(1);sWDI("1d6");sWDI2("2d6");sWB2(0);sWCL(1);}} className="n-btn n-btn-primary" style={{alignSelf:"flex-start"}}>Добавить</button>
</div>}
{(c.weapons||[]).length===0&&!sa&&<div style={{textAlign:"center",padding:"16px 8px",color:"var(--color-text-muted)",fontStyle:"italic",fontSize:12,border:"1px dashed var(--color-divider)",borderRadius:0}}>Нет оружия — добавь его из каталога выше</div>}
{(c.weapons||[]).map(function(w,wIdx){var sk=WS[w.type]||"Ближний бой";var statKey=wStat(w.type);var isEq=c.equippedWeapon===w.id;var isEqOff=c.equippedWeaponOff===w.id;
/* Лук/арбалет раньше тоже гонялись через "магазин" (isGun), из-за чего
   перед КАЖДЫМ выстрелом надо было жать «Перезарядить» — для лука это
   не имеет смысла (не мушкет). Теперь у лука своя ветка: выстрел просто
   сразу списывает 1 стрелу/болт из инвентаря, без промежуточного шага. */
var isGun=w.dmgType==="П"||w.type==="Guns";var isBow=w.type==="Archery";var clip=w.clip||(isGun?1:0);var ammo=(w.ammo!==undefined&&w.ammo!==null)?w.ammo:clip;
var wMaxDur=(w.maxDur!==undefined&&w.maxDur!==null)?w.maxDur:weapDur(w.type);var wDur=(w.dur!==undefined&&w.dur!==null)?w.dur:wMaxDur;var broken=wMaxDur>0&&wDur<=0;
var durPct=wMaxDur>0?(wDur/wMaxDur):1;var durPen=wMaxDur>0?(durPct<=0.30?10:(durPct<=0.50?5:0)):0;
var atype=w.ammoType||(w.type==="Archery"?"Стрела":(w.dmgType==="П"?"Пуля":null));
var projLeft=atype?(c.inventory||[]).filter(function(i){return i.proj&&i.ptype===atype}).reduce(function(s,i){return s+(i.qty||0)},0):0;var curMode=c.weaponMode||"1h";var activeDice=(w.hands===1.5&&curMode==="2h")?(w.dmgDice2h||w.dmgDice):w.dmgDice;var activeBon=(w.hands===1.5&&curMode==="2h")?(w.bonus2h!==undefined?w.bonus2h:w.bonus||0):(w.bonus||0);var handsLabel=w.hands===2?"двуручное":w.hands===1.5?"полуторное":"одноручное";
return(<div key={(w.id!=null?w.id:"w")+"_"+wIdx} style={{background:isEq?"rgba(63,107,52,.08)":isEqOff?"rgba(79,91,42,.08)":"var(--color-sunken)",border:"1px solid "+(isEq?"rgba(63,107,52,.3)":isEqOff?"rgba(79,91,42,.3)":"var(--color-divider)"),borderRadius:0,padding:"9px 10px",marginBottom:6}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
<div style={{fontWeight:700,fontSize:13}}>{w.name}</div>
<div style={{fontSize:11,color:"var(--color-text-muted)",fontWeight:600}}>{activeDice+(activeBon?"+"+activeBon:"")}</div>
</div>
<div style={{fontSize:11,color:"var(--color-text-muted)",marginBottom:6}}>{wtLabel(w.type)+" · тип урона "+w.dmgType+" · "+handsLabel+(w.prosthetic?" · протез: бьёт с Телом 7":"")+(w.charges!=null?" · заряды: "+w.charges:"")+(w.consumable?" · одноразовое":"")+(w.desc?" · "+w.desc:"")+(w.note?" · "+w.note:"")}</div>
{wMaxDur>0&&<Bar pct={wMaxDur>0?(wDur/wMaxDur)*100:0} color={broken?"#8a3b22":(wDur/wMaxDur<0.34?"#8a6200":"linear-gradient(90deg,var(--color-accent-2),var(--color-accent))")} h={4}/>}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
{wMaxDur>0&&<span style={{fontSize:10,color:broken?"#8a3b22":"var(--color-text-muted)"}}>{(broken?"сломано":wDur+"/"+wMaxDur)+(!broken&&durPen>0?" (−"+durPen+" урон)":"")}</span>}
{isGun&&<span style={{fontSize:10,fontWeight:700,color:ammo<=0?"#8a3b22":"#8a6200"}}>{ammo+"/"+clip}{atype?" · "+atype+": "+projLeft:""}</span>}
{isBow&&atype&&<span style={{fontSize:10,fontWeight:700,color:projLeft<=0?"#8a3b22":"#8a6200"}}>{atype+": "+projLeft}</span>}
</div>
<div style={{display:"flex",gap:4}}>
<button onClick={function(){var newEq=isEq?null:w.id;var upd={equippedWeapon:newEq};if(w.hands===2&&c.equippedShield&&!((c.shields||[]).find(function(x){return x.id===c.equippedShield})||{}).freeHands)upd.equippedShield=null;if(newEq&&c.equippedWeaponOff===w.id)upd.equippedWeaponOff=null;sv(Object.assign({},c,upd));}} className="n-btn n-btn-secondary" style={{padding:"3px 8px",fontSize:10,color:isEq?"#3f6b34":"var(--color-text-muted)",borderColor:isEq?"rgba(63,107,52,.4)":"var(--color-divider)"}}>{isEq?"Снаряжено":"Снарядить"}</button>
{hasDualWield&&w.hands===1&&<button onClick={function(){var newEq=isEqOff?null:w.id;var upd={equippedWeaponOff:newEq};if(newEq&&c.equippedWeapon===w.id)upd.equippedWeapon=null;sv(Object.assign({},c,upd));}} title="Во вторую руку: двойная атака, вторая рука −2" className="n-btn n-btn-secondary" style={{padding:"3px 8px",fontSize:10,color:isEqOff?"#4f5b2a":"var(--color-text-muted)",borderColor:isEqOff?"rgba(79,91,42,.4)":"var(--color-divider)"}}>{isEqOff?"Во 2-й руке":"Во 2-ю руку"}</button>}
{!w.gearKey&&<button onClick={function(){if(!window.confirm("Удалить "+w.name+"?"))return;var upd={weapons:(c.weapons||[]).filter(function(x,j){return j!==wIdx})};if(isEq)upd.equippedWeapon=null;if(isEqOff)upd.equippedWeaponOff=null;sv(Object.assign({},c,upd))}} title={isEq?"Удалить (снимется с руки)":"Удалить"} style={{background:"none",border:"none",color:"#8a3b22",fontSize:13,cursor:"pointer"}}>✕</button>}
</div>
</div>
{w.hands===1.5&&<div style={{display:"flex",gap:4,marginTop:6}}>
<button onClick={function(){sv(Object.assign({},c,{weaponMode:"1h"}))}} className="n-btn n-btn-secondary" style={{flex:1,fontSize:10,padding:"3px 0",borderColor:curMode==="1h"?"#4f5b2a":"var(--color-divider)",color:curMode==="1h"?"#4f5b2a":"var(--color-text-muted)"}}>{"1 рука · "+w.dmgDice+(w.bonus?" +"+w.bonus:"")}</button>
<button onClick={function(){var upd={weaponMode:"2h"};if(c.equippedShield)upd.equippedShield=null;sv(Object.assign({},c,upd));}} className="n-btn n-btn-secondary" style={{flex:1,fontSize:10,padding:"3px 0",borderColor:curMode==="2h"?"#4f5b2a":"var(--color-divider)",color:curMode==="2h"?"#4f5b2a":"var(--color-text-muted)"}}>{"2 руки · "+(w.dmgDice2h||w.dmgDice)+(w.bonus2h!==undefined?" +"+w.bonus2h:"")}</button>
</div>}
{isGun&&<button onClick={function(){
  var need=clip-ammo;if(need<=0)need=clip;
  if(atype){
    if(projLeft<=0){alert("Нет боеприпасов: "+atype);return}
    var take=Math.min(need,projLeft);var left=take;
    var inv=(c.inventory||[]).map(function(i){if(left>0&&i.proj&&i.ptype===atype){var t=Math.min(i.qty||0,left);left-=t;return Object.assign({},i,{qty:(i.qty||0)-t})}return i}).filter(function(i){return !i.proj||(i.qty||0)>0});
    sv(Object.assign({},c,{weapons:(c.weapons||[]).map(function(x){return x.id===w.id?Object.assign({},x,{clip:clip,ammo:ammo+take}):x}),inventory:inv}));
    if(pr.addLog)pr.addLog({who:c.name||"???",type:"rest",label:w.name+": +"+take+" "+atype,detail:"осталось "+(projLeft-take),total:0});
  } else {
    sv(Object.assign({},c,{weapons:(c.weapons||[]).map(function(x){return x.id===w.id?Object.assign({},x,{clip:clip,ammo:clip}):x})}));
    if(pr.addLog)pr.addLog({who:c.name||"???",type:"rest",label:w.name+" — перезарядка ("+clip+")",detail:"",total:0});
  }
}} className="n-btn n-btn-secondary" style={{marginTop:6,fontSize:10,color:"#8a6200"}}>{"Перезарядить"+(ammo<=0?" · пусто":"")}</button>}
<div style={{display:"flex",gap:6,marginTop:6}}>
<button onClick={function(){if(broken){alert(w.name+" сломано — почини набором инструментов!");return}if(w.charges!=null&&w.charges<=0){alert(w.name+": заряды кончились");return}if(isGun&&ammo<=0){alert("Нет боеприпасов — перезаряди!");return}if(isBow&&atype&&projLeft<=0){alert("Нет боеприпасов: "+atype);return}var R=rollHit();var d=R.d;var rv=telOf(w,statKey);var sv2=es[sk]||0;var warBon=0;var _patch={};var gNotes=gearAfter(sk,R,_patch);var wP=null;if(isGun)wP=Object.assign(wP||{},{clip:clip,ammo:Math.max(0,ammo-1)});if(wMaxDur>0){wP=Object.assign(wP||{},{maxDur:wMaxDur,dur:Math.max(0,wDur-weaponWear(R.fumble))});}if(w.charges!=null)wP=Object.assign(wP||{},{charges:Math.max(0,w.charges-1)});if(wP)_patch.weapons=(c.weapons||[]).map(function(x){return x.id===w.id?Object.assign({},x,wP):x});if(w.consumable){_patch.weapons=(_patch.weapons||c.weapons||[]).filter(function(x){return x.id!==w.id});if(c.equippedWeapon===w.id)_patch.equippedWeapon=null}if(isBow&&atype){var bLeft=1;_patch.inventory=(c.inventory||[]).map(function(i){if(bLeft>0&&i.proj&&i.ptype===atype){var t=Math.min(i.qty||0,bLeft);bLeft-=t;return Object.assign({},i,{qty:(i.qty||0)-t})}return i}).filter(function(i){return !i.proj||(i.qty||0)>0});}if(shakenPen)_patch.shakenPenalty=0;if(Object.keys(_patch).length)sv(Object.assign({},c,_patch));var aimP=(aim&&tgtNpc)?Math.max(0,aimP2(selZone)-(w.aimBonus||0)):0;var aPen=penOf(statKey)+inf.pen.attack+movePen;var t=d+rv+sv2+(w.bonus||0)+warBon-aimP+atkPen+aPen;pr.addLog({who:c.name||"???",type:"hit",label:w.name+(tgtNpc?" → "+tgtNpc.name:"")+(aimP?" · "+selZone+"(−"+aimP+")":"")+(warBon?" · +5":"")+(R.crit?" · крит":R.fumble?" · срыв":""),detail:"d10("+d+") + "+stName(statKey)+"("+rv+") + "+sk+"("+sv2+") + бонус("+(w.bonus||0)+")"+(aimP?" − прицел("+aimP+")":"")+(atkPen?" − шлем("+Math.abs(atkPen)+")":"")+(willPen?" − деморализован("+Math.abs(willPen)+")":"")+(shakenPen?" − потрясён("+Math.abs(shakenPen)+")":"")+(dosePen?" − Доза("+Math.abs(dosePen)+")":"")+(movePen?" − на ходу("+Math.abs(movePen)+")":"")+(disPen?" − болезнь("+Math.abs(disPen)+")":"")+" = "+t,total:t});
if(tgtNpc&&tgtId&&pr.savePendingAttack){pr.savePendingAttack({id:"atk_"+Date.now(),fromPlayer:true,attackerId:c._fbId,attackerName:c.name||"???",npcId:tgtId,npcName:tgtNpc.name,hitRoll:t,atkD:d,atkREF:rv,atkStatName:stName(statKey),atkSkill:sv2,atkSkillName:sk,atkBonus:w.bonus||0,atkPenalty:aPen,atkCrit:R.crit,atkFumble:R.fumble,weaponName:w.name,dmgDice:activeDice||"1d6",dmgType:w.dmgType||"Р",dmgBonus:activeBon-durPen-woundPen,zone:selZone,aimedZone:aimP?selZone:null,status:"pending_dodge",ts:Date.now()});}
else{oR({label:w.name+" Попад."+(aimP?" · "+selZone:""),d10:d,crit:R.crit,fumble:R.fumble,parts:[{label:stName(statKey),value:rv},{label:sk,value:sv2},{label:"Бнс",value:w.bonus||0}].concat(aimP?[{label:"Прицел",value:-aimP}]:[]).concat(atkPen?[{label:"Шлем",value:atkPen}]:[]).concat(aPen?[{label:"Штраф",value:aPen}]:[]),total:t,subtext:gNotes.join("\n")});}}}
 className="n-btn n-btn-secondary" style={{flex:1,fontSize:11,color:"#4f5b2a"}}>{"Попадание"+(tgtNpc?" → "+tgtNpc.name.slice(0,10):"")}</button>
<button onClick={function(){
  var m=activeDice.match(/(\d+)d(\d+)/);if(!m)return;
  var dice=rN(parseInt(m[1]),parseInt(m[2]));
  var warDmgBon=0;
  var rawDmg=Math.max(0,sm(dice)+activeBon+warDmgBon-durPen-woundPen);
  if(tgtNpc&&tgtId&&saveSpawned){
    applyDmgToNpc(tgtNpc,rawDmg,w.dmgType,selZone,saveSpawned,spawned,tgtId,pr.addLog,c.name||"???",function(ev){
      var xpGain=tgtNpc.xpReward!=null?tgtNpc.xpReward:(tgtNpc.maxHp||0);
      if(xpGain>0){
        var recipients=(pr.characters||[]).filter(function(x){return x.active});
        if(!recipients.some(function(x){return x._fbId===c._fbId}))recipients=recipients.concat([c]);
        recipients.forEach(function(rc){
          if(rc._fbId===c._fbId){sv(Object.assign({},c,{xp:(c.xp||0)+xpGain}));}
          else if(pr.room){set(ref(db,"rooms/"+pr.room+"/characters/"+rc._fbId+"/xp"),(rc.xp||0)+xpGain);}
        });
        pr.addLog({who:c.name||"???",type:"xp",label:"Опыт за "+tgtNpc.name,detail:"+"+xpGain+" XP"+(recipients.length>1?" всем активным игрокам ("+recipients.length+")":""),total:0});
      }
      if(pr.onNpcDeath)pr.onNpcDeath(ev);
    },w.name,pr.saveNpcHit);
  } else {
    pr.addLog({who:c.name||"???",type:"dmg",label:w.name+" ("+w.dmgType+")"+(warDmgBon?" · +5":""),detail:activeDice+"["+dice.join(",")+"]"+(w.bonus?("+бнс("+w.bonus+")"):"")+(warDmgBon?"+5":"")+(woundPen?" −раны("+woundPen+")":"")+" = "+rawDmg,total:rawDmg});
  }
  oR({label:w.name+" Урон",d10:null,parts:[{label:activeDice,value:sm(dice)},{label:"Бнс",value:activeBon+warDmgBon}],total:rawDmg,subtext:"Тип: "+w.dmgType+(warDmgBon?" · +5":"")+(tgtNpc?" → "+tgtNpc.name+"\nЗона: "+selZone:" (нет цели)")});
}} className="n-btn n-btn-secondary" style={{flex:1,fontSize:11,color:"#8a3b22"}}>{"Урон"+(tgtNpc?" → "+tgtNpc.name.slice(0,10):"")}</button>
</div>
</div>)})}
{hasDualWield&&(function(){
  var mainW=(c.weapons||[]).find(function(w){return w.id===c.equippedWeapon&&w.hands===1});
  var offW=(c.weapons||[]).find(function(w){return w.id===c.equippedWeaponOff&&w.hands===1});
  if(!mainW||!offW||mainW.id===offW.id)return null;
  function rollOne(w,penalty){var R=rollHit();var d=R.d;var statKey=wStat(w.type);var sk=WS[w.type]||"Ближний бой";var rv=telOf(w,statKey);var sv2=es[sk]||0;var wMax=weapDur(w.type);var wD=(w.dur!==undefined&&w.dur!==null)?w.dur:wMax;var t=d+rv+sv2+(w.bonus||0)-penalty+atkPen+penOf(statKey)+inf.pen.attack;var m=w.dmgDice.match(/(\d+)d(\d+)/);var dice=m?rN(parseInt(m[1]),parseInt(m[2])):[0];var dmg=Math.max(0,sm(dice)+(w.bonus||0)-woundPen);var wP=wMax>0?{maxDur:wMax,dur:Math.max(0,wD-weaponWear(R.fumble))}:null;return{hit:t,dmg:dmg,d:d,rv:rv,sv2:sv2,statKey:stName(statKey),sk:sk,fumble:R.fumble,R:R,wP:wP}}
  return(<button onClick={function(){
    /* Две железные руки бьют двумя насадками без −2 */
    var offPen=(mainW.prosthetic&&offW.prosthetic&&twoIronArms(c))?0:2;var res1=rollOne(mainW,0);var res2=rollOne(offW,offPen);
    var newWeapons=(c.weapons||[]).map(function(x){if(x.id===mainW.id&&res1.wP)return Object.assign({},x,res1.wP);if(x.id===offW.id&&res2.wP)return Object.assign({},x,res2.wP);return x});
    var dwPatch={weapons:newWeapons};if(shakenPen)dwPatch.shakenPenalty=0;gearAfter(res1.sk,res1.R,dwPatch);gearAfter(res2.sk,res2.R,dwPatch);
    sv(Object.assign({},c,dwPatch));
    pr.addLog({who:c.name||"???",type:"hit",label:"Двойная атака: "+mainW.name+" + "+offW.name+(tgtNpc?" → "+tgtNpc.name:""),detail:mainW.name+": d10("+res1.d+")+"+res1.statKey+"("+res1.rv+")+"+res1.sk+"("+res1.sv2+")"+(atkPen?"−шлем("+Math.abs(atkPen)+")":"")+"="+res1.hit+"\n"+offW.name+(offPen?" (−2 вторая рука)":" (железные руки, без −2)")+": d10("+res2.d+")+"+res2.statKey+"("+res2.rv+")+"+res2.sk+"("+res2.sv2+")"+(offPen?"−2":"")+(atkPen?"−шлем("+Math.abs(atkPen)+")":"")+"="+res2.hit,total:0});
    oR({label:"Двойная атака",d10:null,parts:[{label:mainW.name+" попад.",value:res1.hit},{label:offW.name+" попад."+(offPen?" (−2)":""),value:res2.hit}],total:res1.hit+res2.hit,subtext:mainW.name+" урон: "+res1.dmg+"\n"+offW.name+" урон: "+res2.dmg+(tgtNpc?"\n→ "+tgtNpc.name:"")});
  }} className="n-btn n-btn-primary" style={{width:"100%",marginTop:6}}>{"Двойная атака: "+mainW.name+" + "+offW.name}</button>);
})()}
</div>

{/* Броня игрока */}
<ArmorSection char={c} save={sv} finalStats={fs} finalSkills={es} shop={pr.shop} characters={pr.characters} room={pr.room} addLog={pr.addLog} onRoll={oR}/>

<CritsCard char={c} save={sv} isGM={isGM} addLog={pr.addLog} onRoll={oR}/>
{pr.initiative&&<InitiativeBar initiative={pr.initiative}/>}
{woundPen>0&&<div className="warnbox">{"Раны: −"+woundPen+" к урону"}</div>}

{hasDepo(c,getTraits())&&<div className="n-card">
<Lbl>Депо</Lbl>
<div style={{fontSize:12,color:"var(--color-text-muted)",margin:"6px 0"}}>{depoOn?"Работает: штраф от ран не действует до конца боя.":"Раз за бой: до конца боя штраф от ран не действует. Заряд: "+(c.depoCharge!=null?c.depoCharge:1)}</div>
<button disabled={depoOn||!fighting||(c.depoCharge!=null&&c.depoCharge<1)} title={!fighting?"Только в бою":""} onClick={function(){sv(Object.assign({},c,{combatDepoUsed:true,depoCharge:Math.max(0,(c.depoCharge!=null?c.depoCharge:1)-1)}));pr.addLog({who:c.name||"???",type:"stance",label:(c.name||"???")+" включает «Депо»",detail:"штраф от ран не действует до конца боя",total:0})}} className="n-btn n-btn-primary" style={{width:"100%"}}>{depoOn?"Депо включено":"Включить Депо"}</button>
</div>}

{/* Ход: передать ход */}
{(function(){
  var init=pr.initiative;var myTurn=!!(init&&Array.isArray(init.list)&&init.list.length&&init.list[init.turn||0]&&init.list[init.turn||0].id===c._fbId);
  function announce(a){pr.addLog({who:c.name||"???",type:"stance",label:(c.name||"???")+" объявляет: "+a,detail:"",total:0})}
  function passTurn(){
    if(!init||!Array.isArray(init.list)||!init.list.length){announce("Передать ход");return}
    var next=((init.turn||0)+1)%init.list.length;var round=(init.round||1)+(next===0?1:0);
    if(pr.saveInitiative)pr.saveInitiative(Object.assign({},init,{turn:next,round:round}));
    pr.addLog({who:c.name||"???",type:"stance",label:(c.name||"???")+" передаёт ход",detail:"",total:0});
  }
  return(<div className="n-card">
    <Lbl>Ход</Lbl>
    <div style={{marginTop:8}}>
      <button onClick={passTurn} disabled={!!init&&!myTurn} title={init&&!myTurn?"Сейчас не твой ход":"Передать ход следующему"} className="n-btn" style={{width:"100%",fontSize:12,padding:"8px 4px",border:"1.5px solid "+(init&&!myTurn?"var(--color-divider)":"#8a6200"),color:init&&!myTurn?"var(--color-text-muted)":"#8a6200"}}>Передать ход</button>
    </div>
  </div>);
})()}

<div style={{display:"flex",gap:6}}>
<button onClick={function(){var d=r1(6);var z=ZONES[d-1];sZone(z.name);pr.addLog({who:c.name||"???",type:"zone",label:z.name+" ×"+z.mult,detail:"1d6="+d,total:d});oR({label:"Зона",d10:d,parts:[],total:d,subtext:z.name+" ×"+z.mult+(z.ignoreArmor?" (игнор брони)":"")})}} className="n-btn n-btn-secondary" style={{flex:1,color:"#8a6200"}}>Зона</button>
<button onClick={function(){var R=rollHit();var d=R.d;var dv=fs.reak||0;var dg=es["Уклонение"]||0;var t=d+dv+dg+physPen;var dP={};if(c.shakenPenalty)dP.shakenPenalty=0;var dN=gearAfter("Уклонение",R,dP);if(Object.keys(dP).length)sv(Object.assign({},c,dP));pr.addLog({who:c.name||"???",type:"dodge",label:"Уклонение"+(R.crit?" · крит":R.fumble?" · срыв":""),detail:"d10("+d+") + Реакция("+dv+") + Уклонение("+dg+")"+(physPen?" + штраф("+physPen+")":"")+" = "+t,total:t});oR({label:"Уклонение",d10:d,crit:R.crit,fumble:R.fumble,parts:[{label:"Реакция",value:dv},{label:"Уклонение",value:dg}].concat(physPen?[{label:"Штраф",value:physPen}]:[]),total:t,subtext:dN.join("\n")})}} className="n-btn n-btn-secondary" style={{flex:1,color:"#3f6b34"}}>Уклонение</button>
</div>

{/* Страх/Мораль: контест EMP+Запугивание vs WILL+Выдержка, тот же принцип, что и атака — выбор цели сверху в карте "Цель" */}
<button onClick={function(){
  if(!tgtNpc||!tgtId){alert("Выбери цель в карточке «Цель» ниже");return}
  var R=rollHit();var d=R.d;var ev=fs.har||0;var isk=es["Запугивание"]||0;var t=d+ev+isk+penOf("har");
  var fP={};if(shakenPen)fP.shakenPenalty=0;gearAfter("Запугивание",R,fP);if(Object.keys(fP).length)sv(Object.assign({},c,fP));
  pr.addLog({who:c.name||"???",type:"fear",label:"Устрашение → "+tgtNpc.name+(R.crit?" · крит":R.fumble?" · срыв":""),detail:"d10("+d+") + Характер("+ev+") + Запугивание("+isk+")"+(rollPen?" + штраф("+rollPen+")":"")+" = "+t,total:t});
  if(pr.savePendingAttack)pr.savePendingAttack({id:"atk_"+Date.now(),fromPlayer:true,fear:true,attackerId:c._fbId,attackerName:c.name||"???",npcId:tgtId,npcName:tgtNpc.name,hitRoll:t,atkD:d,atkREF:ev,atkStatName:"Характер",atkSkill:isk,atkSkillName:"Запугивание",atkBonus:0,atkPenalty:rollPen,atkCrit:R.crit,atkFumble:R.fumble,weaponName:"Устрашение",status:"pending_dodge",ts:Date.now()});
}} className="n-btn n-btn-secondary" style={{width:"100%",color:"#6b2f4a"}}>{"Устрашение"+(tgtNpc?" → "+tgtNpc.name:"")}</button>

{(c.shakenPenalty>0||c.broken)&&<div className="n-card" style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:6,borderColor:c.broken?"#8a3b22":"#8a6200"}}>
{c.shakenPenalty>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#8a6200"}}>{"Потрясён — −"+c.shakenPenalty+" к следующему броску"}</span><button onClick={function(){sv(Object.assign({},c,{shakenPenalty:0}))}} className="n-btn n-btn-secondary" style={{padding:"2px 8px",fontSize:10}}>Снять</button></div>}
{c.broken&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#8a3b22",fontWeight:700}}>Сломлен — пропуск хода / вынужденное отступление в этот раунд</span><button onClick={function(){sv(Object.assign({},c,{broken:false}))}} className="n-btn n-btn-secondary" style={{padding:"2px 8px",fontSize:10}}>Оправился</button></div>}
</div>}


</div>
<div style={{display:"flex",flexDirection:"column",gap:14}}>

{/* Цель + прицельный удар — один блок, открыт по умолчанию */}
<div className="n-card">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<Lbl>Цель</Lbl>
<button onClick={function(){sAim(!aim)}} title="Прицельный удар: бьёшь по выбранной зоне со штрафом к попаданию" style={{padding:"6px 14px",borderRadius:0,border:"none",fontWeight:800,fontSize:12,letterSpacing:.02,cursor:"pointer",background:aim?"linear-gradient(90deg,#8a6200,#8a6200)":"var(--color-sunken)",color:aim?"#ebe3d1":"var(--color-text-muted)",boxShadow:aim?"0 0 0 1.5px #8a6200, 0 2px 8px rgba(233,177,43,.35)":"0 0 0 1.5px var(--color-divider)",transition:"all .15s"}}>{aim?("Прицельный удар (−"+aimP2(selZone)+")"):"Прицельный удар"}</button>
</div>
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
{spawnedArr.length===0&&<div style={{fontSize:12,color:"var(--color-text-muted)",fontStyle:"italic"}}>На поле боя пока никого нет</div>}
{spawnedArr.map(function(e){var nid=e[0];var n=e[1];var nHp=n.hp!==undefined?n.hp:n.maxHp;var hpPct=n.maxHp>0?(nHp/n.maxHp)*100:0;var isSel=tgtId===nid;
return <button key={nid} onClick={function(){sTgt(isSel?null:nid)}} style={{padding:"8px 12px",borderRadius:0,border:"1.5px solid "+(isSel?"#8a3b22":"var(--color-divider)"),background:isSel?"rgba(138,59,34,.12)":"var(--color-sunken)",cursor:"pointer",display:"flex",flexDirection:"column",gap:4,minWidth:90,textAlign:"left"}}>
<span style={{fontWeight:700,fontSize:13}}>{n.name}</span>
<div style={{width:66,height:5,background:"var(--color-bg)",borderRadius:0,overflow:"hidden"}}><div style={{height:"100%",width:hpPct+"%",background:hpPct<=25?"#8a3b22":hpPct<=50?"#8a6200":"#3f6b34"}}/></div>
<span style={{fontSize:10,color:"var(--color-text-muted)"}}>{nHp+"/"+n.maxHp+" HP"}</span>{condsOf(n).length>0&&<span style={{fontSize:10,color:"#8a3b22",fontWeight:700}}>{condsOf(n).map(function(x){var d=condByKey(x.key);return d.icon+" "+d.name}).join(", ")}</span>}
</button>})}
</div>
{tgtNpc&&(function(){var atD=ARMOR_T.find(function(a){return a.id===(tgtNpc.armorBody||"none")})||ARMOR_T[0];var nHp=tgtNpc.hp!==undefined?tgtNpc.hp:tgtNpc.maxHp;var hpPct=tgtNpc.maxHp>0?(nHp/tgtNpc.maxHp)*100:0;
return(<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--color-divider)"}}>
<div style={{fontWeight:700,fontSize:14}}>{tgtNpc.name}</div>
<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:2}}>{atD.name+" броня"}</div>
<div style={{marginTop:8}}>
<div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--color-text-muted)",marginBottom:3}}><span>HP</span><span style={{fontWeight:700,color:"var(--color-text)"}}>{nHp+" / "+tgtNpc.maxHp}</span></div>
<Bar pct={hpPct} color="linear-gradient(90deg,var(--color-accent),var(--color-accent-2))" h={7}/>
</div>
</div>);
})()}
{tgtNpc&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--color-divider)"}}>
<div style={{fontSize:10,fontWeight:700,letterSpacing:.05,textTransform:"uppercase",color:"var(--color-text-muted)",marginBottom:6}}>Зона удара</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
{ZONES.map(function(z){var isSel=selZone===z.name;return <button key={z.name} onClick={function(){sZone(z.name)}} style={{padding:"8px 6px",borderRadius:0,border:"1.5px solid "+(isSel?"#8a6200":"var(--color-divider)"),background:isSel?"rgba(233,177,43,.12)":"var(--color-sunken)",cursor:"pointer",opacity:aim&&!isSel?0.5:1,textAlign:"left"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><span style={{fontSize:12,fontWeight:700}}>{z.name}</span><span style={{fontSize:10,color:"var(--color-text-muted)"}}>{"×"+z.mult}</span></div>
<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:2}}>{aim?"штраф к попаданию −"+aimP2(z.name):(z.ignoreArmor?"игнор брони":"")}</div>
</button>})}
</div>
{aim&&<div style={{fontSize:11,color:"#8a6200",marginTop:6,fontStyle:"italic"}}>{"Прицельно в «"+selZone+"»: −"+aimP2(selZone)+" к попаданию, урон точно по этой зоне."}</div>}
</div>}
{!tgtNpc&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--color-divider)",opacity:.45}}>
<div style={{fontSize:10,fontWeight:700,letterSpacing:.05,textTransform:"uppercase",color:"var(--color-text-muted)",marginBottom:6}}>Зона удара</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
{ZONES.map(function(z){var isSel=selZone===z.name;return <button key={z.name} disabled onClick={function(){sZone(z.name)}} style={{padding:"8px 6px",borderRadius:0,border:"1.5px solid "+(isSel?"#8a6200":"var(--color-divider)"),background:isSel?"rgba(233,177,43,.12)":"var(--color-sunken)",cursor:"not-allowed",textAlign:"left"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><span style={{fontSize:12,fontWeight:700}}>{z.name}</span><span style={{fontSize:10,color:"var(--color-text-muted)"}}>{"×"+z.mult}</span></div>
<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:2}}>{z.ignoreArmor?"игнор брони":""}</div>
</button>})}
</div>
<div style={{fontSize:10,color:"var(--color-text-muted)",marginTop:6,fontStyle:"italic"}}>Выбери цель выше, чтобы бить по зонам</div>
</div>}
</div>

{/* Лог урона */}
<div className="n-card">
<Lbl>Лог урона</Lbl>
<div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
{visibleLogs.length===0&&<div style={{textAlign:"center",padding:10,color:"var(--color-text-muted)",fontSize:12,fontStyle:"italic"}}>Пусто</div>}
{visibleLogs.map(function(l,i){return <div key={i} style={{background:"var(--color-sunken)",borderRadius:0,padding:"6px 8px",fontSize:12}}><b>{(l.who||"")+": "+l.label}</b>{l.detail&&<div style={{fontSize:11,color:"var(--color-text-muted)",marginTop:1}}>{l.detail}</div>}{l.total>0&&<div style={{fontWeight:700,fontSize:14,marginTop:1}}>{"= "+l.total}</div>}</div>})}
</div>
</div>

</div>
</div>

</div>)}

export default CombatTab;
