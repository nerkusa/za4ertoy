import { cF, mHP, nC, dosePenalty, diseasePenalty, levelUpReward, rndCore, xpForLevel } from '../utils/character';
import { wStat, WS, ALL_SKILLS, npcAtk } from '../data/stats';
import { calcAE, applyDmgToNpc } from '../utils/combat';
import { nestInfo, canInsert, canRead, activeTraitEffects, ironSteps, gearWeapons, fineBlocked } from '../data/traits';
import { GEAR_DEFAULTS as CAT } from '../data/gear';
import { fumbleFx, slepCheck, slepDC, fakeOutcome, syncGearWeapons } from '../utils/gearFx';
import { giveSolution, setTip, addCassette } from '../utils/gearOps';
import { tryPay, fmtMoney } from '../utils/currency';
import { PROFS } from '../data/professions';

function ch(patch){return Object.assign(nC("Гайка"),{hpRoll:5},patch||{})}
function cass(key,kind,extra){return Object.assign({id:key+"_"+kind,key:key,kind:kind,inNest:true,imprint:0},extra||{})}
var FUMBLE={d:-3,base:1,crit:false,fumble:true};var PLAIN={d:6,base:6,crit:false,fumble:false};var TWO={d:2,base:2,crit:false,fumble:false};

describe('схема и производные', function(){
  test('новый персонаж: 6 характеристик, 19 навыков, без рас и черт', function(){
    var c=nC("x");
    expect(Object.keys(c.stats).sort()).toEqual(['har','razum','reak','telo','volya','vosp']);
    expect(ALL_SKILLS.length).toBe(19);expect(Object.keys(c.skills).length).toBe(19);
    expect(c.raceId).toBeUndefined();expect(c.traits).toBeUndefined();expect(c.currency).toBeUndefined();expect(c.money).toBe(0);
  });
  test('Здоровье = (Тело + Реакция) × 2 + hpRoll; довоенный −5', function(){
    var c=ch({stats:{telo:5,reak:6,vosp:1,razum:1,har:1,volya:4}});
    expect(mHP(cF(c).fs,c)).toBe(27);
    expect(mHP(cF(Object.assign({},c,{origin:"pre"})).fs,Object.assign({},c,{origin:"pre"}))).toBe(22);
  });
  test('награда за уровень — только очки навыков', function(){
    for(var l=2;l<=12;l++){var r=levelUpReward(l);expect(r.stat).toBeUndefined();expect(typeof r.skill).toBe('number')}
    expect(xpForLevel(3)).toBe(300);
  });
  test('генератор: 6 характеристик, ограничения происхождения', function(){
    for(var i=0;i<30;i++){
      var pre=rndCore(PROFS[1],"pre");expect(pre.stats.telo).toBeLessThanOrEqual(7);expect(pre.stats.reak).toBeLessThanOrEqual(7);
      var post=rndCore(PROFS[3],"post");expect(post.skills["Знания"]).toBeLessThanOrEqual(3);expect(post.skills["Техника"]).toBeLessThanOrEqual(3);
      expect(Object.keys(post.stats).length).toBe(6);
    }
  });
  test('валюта — одно число в ер.', function(){
    expect(fmtMoney(15)).toBe("15 ер.");
    expect(tryPay({money:100},60)).toEqual({money:40});expect(tryPay({money:5},0)).toEqual({});
  });
});

describe('cF: эффекты кассет и насадок', function(){
  test('копия «Медведь» даёт +2 Ближний бой и +1 Запугивание в eSk', function(){
    var c=ch({bracelet:{model:"Military"},cassettes:[cass("medved","copy")],skills:Object.assign(nC().skills,{"Ближний бой":3})});
    var inf=cF(c);expect(inf.eSk["Ближний бой"]).toBe(5);expect(inf.eSk["Запугивание"]).toBe(1);
  });
  test('слепок даёт +3 вместо +2', function(){
    var c=ch({bracelet:{model:"Military"},cassettes:[cass("tishina","slep")]});
    expect(cF(c).eSk["Скрытность"]).toBe(3);
  });
  test('кассета вне гнезда и кассета чужого класса не работают', function(){
    expect(cF(ch({bracelet:{model:"Military"},cassettes:[cass("medved","copy",{inNest:false})]})).eSk["Ближний бой"]).toBe(0);
    expect(cF(ch({bracelet:{model:"Civil"},cassettes:[cass("medved","copy")]})).eSk["Ближний бой"]).toBe(0);
    expect(cF(ch({bracelet:null,cassettes:[cass("torgash","copy")]})).eSk["Торг"]).toBe(0);
  });
  test('одна и та же кассета дважды не складывается', function(){
    var c=ch({bracelet:{model:"Military"},cassettes:[cass("torgash","copy"),Object.assign(cass("torgash","orig"),{id:"t2"})]});
    expect(cF(c).eSk["Торг"]).toBe(2);
  });
  test('кассета на характеристику: +1, итог не выше 10', function(){
    var base={telo:5,reak:5,vosp:5,razum:5,har:5,volya:5};
    expect(cF(ch({stats:base,bracelet:{model:"Military"},cassettes:[cass("zhila","orig")]})).fs.telo).toBe(6);
    expect(cF(ch({stats:Object.assign({},base,{telo:10}),bracelet:{model:"Military"},cassettes:[cass("zhila","orig")]})).fs.telo).toBe(10);
  });
  test('палёнка: молчит или работает как копия', function(){
    expect(cF(ch({bracelet:{model:"Civil"},cassettes:[cass("torgash","fake",{fakeState:"silent"})]})).eSk["Торг"]).toBe(0);
    expect(cF(ch({bracelet:{model:"Civil"},cassettes:[cass("torgash","fake",{fakeState:"copy"})]})).eSk["Торг"]).toBe(2);
    expect(fakeOutcome(1)).toBe("silent");expect(fakeOutcome(4)).toBe("silent");expect(fakeOutcome(5)).toBe("copy");expect(fakeOutcome(8)).toBe("copy");expect(fakeOutcome(9)).toBe("stuck");expect(fakeOutcome(10)).toBe("stuck");
  });
  test('насадка даёт бонус, сломанная — нет', function(){
    var c=ch({});c=Object.assign(c,giveSolution(c,CAT,{t:"arm"}));c=Object.assign(c,giveSolution(c,CAT,{t:"tip",key:"kleshnya"}));c=Object.assign(c,setTip(c,CAT,"kleshnya"));
    expect(cF(c).eSk["Ближний бой"]).toBe(2);
    expect(fineBlocked(c,CAT,"Медицина")).toBe(true);expect(fineBlocked(c,CAT,"Атлетика")).toBe(false);
    var broken=Object.assign({},c,{solutions:Object.assign({},c.solutions,{arm:Object.assign({},c.solutions.arm,{broken:true})})});
    expect(cF(broken).eSk["Ближний бой"]).toBe(0);
  });
  test('«Хватка»: −2 к тонкой работе, без гнезда', function(){
    var c=ch({bracelet:{model:"Civil"}});c=Object.assign(c,giveSolution(c,CAT,{t:"hvatka"}));
    expect(cF(c).eSk["Медицина"]).toBe(-2);expect(nestInfo(c,CAT).free).toBe(3);expect(ironSteps(c,CAT)).toBe(0);
  });
  test('вживляемое «Прицел»: +1 Огнестрел', function(){
    var c=ch({});c=Object.assign(c,giveSolution(c,CAT,{t:"implant",key:"pricel"}));
    expect(cF(c).eSk["Огнестрел"]).toBe(1);
  });
});

describe('браслет и гнёзда', function(){
  test('класс кассеты против браслета', function(){
    expect(canRead(ch({bracelet:{model:"Civil"}}),"CIVIL")).toBe(true);expect(canRead(ch({bracelet:{model:"Civil"}}),"UTIL")).toBe(false);
    expect(canRead(ch({bracelet:{model:"Utilitary"}}),"UTIL")).toBe(true);expect(canRead(ch({bracelet:{model:"Utilitary"}}),"MIL")).toBe(false);
    expect(canRead(ch({bracelet:{model:"Military"}}),"MIL")).toBe(true);expect(canRead(ch({}),"CIVIL")).toBe(false);
    var r=canInsert(ch({bracelet:{model:"Utilitary"}}),cass("medved","copy",{inNest:false}),CAT);
    expect(r.ok).toBe(false);expect(r.reason).toMatch(/Military/);expect(r.reason).toMatch(/Техника СЛ 18/);
  });
  test('подсчёт гнёзд с солюшнами: свободно = гнёзда − солюшны − кассеты', function(){
    var c=ch({bracelet:{model:"Utilitary"},cassettes:[cass("torgash","copy"),cass("efir","copy")]});
    c=Object.assign(c,giveSolution(c,CAT,{t:"arm"}));c=Object.assign(c,giveSolution(c,CAT,{t:"leg"}));c=Object.assign(c,giveSolution(c,CAT,{t:"implant",key:"nasos"}));c=Object.assign(c,giveSolution(c,CAT,{t:"implant",key:"depo"}));
    var ni=nestInfo(c,CAT);expect(ni.total).toBe(5);expect(ni.solutions).toBe(3);expect(ni.cassettes).toBe(2);expect(ni.free).toBe(0);
    expect(ironSteps(c,CAT)).toBe(3);
    expect(canInsert(c,cass("baranka","copy",{inNest:false}),CAT).ok).toBe(false);
  });
  test('вторую такую же кассету вставить нельзя', function(){
    var c=ch({bracelet:{model:"Military"},cassettes:[cass("torgash","copy")]});
    expect(canInsert(c,{id:"z",key:"torgash",kind:"orig",inNest:false},CAT).ok).toBe(false);
  });
  test('насадка «Ствол» появляется в оружии, пока надета', function(){
    var c=ch({});c=Object.assign(c,giveSolution(c,CAT,{t:"arm"}));c=Object.assign(c,giveSolution(c,CAT,{t:"tip",key:"stvol"}));
    expect(c.weapons.length).toBe(0);
    c=Object.assign(c,setTip(c,CAT,"stvol"));
    expect(c.weapons.length).toBe(1);expect(c.weapons[0].dmgDice).toBe("3d6");expect(c.weapons[0].type).toBe("Guns");
    c=Object.assign(c,setTip(c,CAT,"kist"));expect(c.weapons.length).toBe(0);
    expect(gearWeapons(c,CAT).length).toBe(0);expect(syncGearWeapons(c,CAT,gearWeapons).weapons.length).toBe(0);
  });
});

describe('штрафы Дозы и болезни', function(){
  test('Доза 4–6: −1, 7–9: −2', function(){
    expect(dosePenalty(0)).toBe(0);expect(dosePenalty(3)).toBe(0);expect(dosePenalty(4)).toBe(-1);expect(dosePenalty(6)).toBe(-1);expect(dosePenalty(7)).toBe(-2);expect(dosePenalty(9)).toBe(-2);
  });
  test('болезнь: −1 только к броскам от Тела и Реакции', function(){
    var c=ch({diseases:["Цинга"]});
    expect(diseasePenalty(c,"telo")).toBe(-1);expect(diseasePenalty(c,"reak")).toBe(-1);expect(diseasePenalty(c,"razum")).toBe(0);expect(diseasePenalty(ch({}),"telo")).toBe(0);
  });
  test('общий rollPen складывает Дозу, болезнь, Волю и потрясение', function(){
    var c=ch({dose:7,diseases:["Клещ"],shakenPenalty:2,curWill:-1});var inf=cF(c);
    expect(inf.rollPen("telo").total).toBe(-2-1-2-1);expect(inf.rollPen("har").total).toBe(-2-2-1);
  });
});

describe('wStat и навыки оружия', function(){
  test('холодное и рукопашное от Тела, огнестрел и метание от Реакции', function(){
    expect(wStat("Brawl")).toBe("telo");expect(wStat("Battle")).toBe("telo");expect(wStat("Simple")).toBe("telo");
    expect(wStat("Guns")).toBe("reak");expect(wStat("Archery")).toBe("reak");expect(wStat("Thrown")).toBe("reak");
    expect(WS.Battle).toBe("Ближний бой");expect(WS.Simple).toBe("Ближний бой");expect(WS.Brawl).toBe("Ближний бой");expect(WS.Guns).toBe("Огнестрел");expect(WS.Archery).toBe("Огнестрел");expect(WS.Thrown).toBe("Метание");
  });
  test('атака NPC: навык и характеристика по типу оружия', function(){
    var st={telo:6,reak:4};var sk={melee:5,guns:3,thrown:1};
    expect(npcAtk(st,sk,{type:"Battle"})).toMatchObject({rv:6,skVal:5,skNm:"Ближний бой",atName:"Тело"});
    expect(npcAtk(st,sk,{type:"Guns"})).toMatchObject({rv:4,skVal:3,skNm:"Огнестрел",atName:"Реакция"});
    expect(npcAtk(st,sk,{type:"Thrown"})).toMatchObject({rv:4,skVal:1});
  });
});

describe('calcAE и applyDmgToNpc — поведение базы', function(){
  test('calcAE по типам урона и брони', function(){
    expect(calcAE("none","П",10)).toMatchObject({ad:0,hd:10});
    expect(calcAE("light","К",10)).toMatchObject({ad:2,hd:5});
    expect(calcAE("heavy","Р",11)).toMatchObject({ad:5,hd:5});
    expect(calcAE("medium","Д",9)).toMatchObject({ad:9,hd:9});
    expect(calcAE("light","С",8)).toMatchObject({ad:8,hd:8});
    expect(calcAE("medium","С",9)).toMatchObject({ad:9,hd:4});
    expect(calcAE("heavy","С",9)).toMatchObject({ad:4,hd:0});
    expect(calcAE("heavy","П",7)).toMatchObject({ad:7,hd:7});
  });
  function run(npc,dmg,type,zone){var saved=null,logs=[],died=null;applyDmgToNpc(npc,dmg,type,zone,function(sp){saved=sp},{a:npc},"a",function(l){logs.push(l)},"Гайка",function(e){died=e},"Пила",null);return{npc:saved.a,logs:logs,died:died}}
  test('торс: режущий делится между бронёй и Здоровьем', function(){
    var r=run({name:"Наёмник",hp:30,maxHp:30,armorBody:"light",armorBodyHp:12,armorBodyMaxHp:12},10,"Р","Торс");
    expect(r.npc.hp).toBe(25);expect(r.npc.armorBodyHp).toBe(7);expect(r.logs[0].total).toBe(5);expect(r.died).toBeNull();
  });
  test('голова ×3 считается через шлем; пах ×2 мимо брони', function(){
    var n={name:"N",hp:40,maxHp:40,armorHead:"medium",armorHeadHp:12,armorBody:"heavy",armorBodyHp:30};
    var h=run(n,4,"Д","Голова");expect(h.npc.hp).toBe(28);expect(h.npc.armorHeadHp).toBe(0);
    var g=run(n,5,"К","Пах");expect(g.npc.hp).toBe(30);expect(g.npc.armorBodyHp).toBe(30);
  });
  test('сломанная броня не держит; смерть вызывает onNpcDeath', function(){
    var r=run({name:"N",hp:6,maxHp:20,armorBody:"heavy",armorBodyHp:0},8,"К","Торс");
    expect(r.npc.hp).toBe(0);expect(r.died).toEqual({npcName:"N"});
  });
});

describe('шум кассет, износ насадки, слепки', function(){
  test('срыв на навыке с копией — шум в лог; без срыва и с оригиналом — тихо', function(){
    var c=ch({bracelet:{model:"Military"},cassettes:[cass("medved","copy")]});var inf=cF(c);
    var fx=fumbleFx(c,inf,"Ближний бой",FUMBLE,7);
    expect(fx.logs.length).toBe(1);expect(fx.logs[0].label).toMatch(/Шум кассеты «Медведь» \(7\)/);expect(fx.logs[0].detail).toMatch(/Перемотка/);
    expect(fumbleFx(c,inf,"Ближний бой",PLAIN,7).logs.length).toBe(0);
    expect(fumbleFx(c,inf,"Огнестрел",FUMBLE,7).logs.length).toBe(0);
    var o=ch({bracelet:{model:"Military"},cassettes:[cass("medved","orig")]});
    expect(fumbleFx(o,cF(o),"Ближний бой",FUMBLE,7).logs.length).toBe(0);
  });
  test('срыв на навыке слепка — Отпечаток +1 сразу', function(){
    var c=ch({bracelet:{model:"Military"},cassettes:[cass("tishina","slep",{imprint:2})]});
    var fx=fumbleFx(c,cF(c),"Скрытность",FUMBLE,3);
    expect(fx.patch.cassettes[0].imprint).toBe(3);
  });
  test('срыв с бонусом насадки ломает её; перебранный протез — ещё и на базовой 2', function(){
    var c=ch({});c=Object.assign(c,giveSolution(c,CAT,{t:"arm"}));c=Object.assign(c,giveSolution(c,CAT,{t:"tip",key:"instrument"}));c=Object.assign(c,setTip(c,CAT,"instrument"));
    expect(fumbleFx(c,cF(c),"Механика",FUMBLE).patch.solutions.arm.broken).toBe(true);
    expect(fumbleFx(c,cF(c),"Механика",TWO).patch.solutions).toBeUndefined();
    expect(fumbleFx(c,cF(c),"Медицина",FUMBLE).patch.solutions).toBeUndefined();
    var rb=Object.assign({},c,{solutions:Object.assign({},c.solutions,{arm:Object.assign({},c.solutions.arm,{grade:"rebuilt"})})});
    expect(fumbleFx(rb,cF(rb),"Механика",TWO).patch.solutions.arm.broken).toBe(true);
  });
  test('стойкость слепка: СЛ 12 + 2 × Отпечаток, −2 за каждый другой слепок', function(){
    expect(slepDC(0)).toBe(12);expect(slepDC(3)).toBe(18);
    var c=ch({stats:{telo:1,reak:1,vosp:1,razum:1,har:1,volya:6},skills:Object.assign(nC().skills,{"Выдержка":3}),bracelet:{model:"Military"},cassettes:[cass("tishina","slep",{imprint:1})]});
    var inf=cF(c);
    var ok=slepCheck(c,inf,"tishina_slep",5);expect(ok.dc).toBe(14);expect(ok.total).toBe(14);expect(ok.ok).toBe(true);expect(ok.imprint).toBe(1);
    var bad=slepCheck(c,inf,"tishina_slep",4);expect(bad.ok).toBe(false);expect(bad.imprint).toBe(2);
    var two=Object.assign({},c,{cassettes:c.cassettes.concat([cass("medved","slep")])});
    var r=slepCheck(two,cF(two),"tishina_slep",5);expect(r.others).toBe(1);expect(r.total).toBe(12);expect(r.ok).toBe(false);
  });
  test('выдача кассеты кладёт её в кассетницу', function(){
    var p=addCassette(ch({}),CAT,"torgash","fake");expect(p.cassettes[0]).toMatchObject({key:"torgash",kind:"fake",inNest:false});
    expect(activeTraitEffects(ch(p),CAT).filter(function(e){return e.type==="skill_bonus"}).length).toBe(0);
  });
});
