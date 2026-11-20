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
    expect(ALL_SKILLS.length).toBe(20);expect(Object.keys(c.skills).length).toBe(20);expect(c.skills['Вождение']).toBe(0);
    expect(c.raceId).toBeUndefined();expect(c.traits).toBeUndefined();expect(c.currency).toBeUndefined();expect(c.money).toBe(0);
  });
  test('Здоровье = (Тело + Реакция) × 2 + hpRoll; довоенный −5', function(){
    var c=ch({stats:{telo:5,reak:6,vosp:1,razum:1,har:1,volya:4}});
    expect(mHP(cF(c).fs,c)).toBe(27);
    expect(mHP(cF(Object.assign({},c,{origin:"pre"})).fs,Object.assign({},c,{origin:"pre"}))).toBe(22);
  });
  test('награда за уровень: +1 очко навыка и +2 Здоровья', function(){
    for(var l=2;l<=12;l++){var r=levelUpReward(l);expect(r.stat).toBeUndefined();expect(r.skillPoints).toBe(1);expect(r.maxHp).toBe(2)}
    var c=ch({stats:{telo:5,reak:6,vosp:1,razum:1,har:1,volya:4},level:4,levelHp:6});expect(mHP(cF(c).fs,c)).toBe(33);
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

});

describe('штрафы Дозы и болезни', function(){
  test('Доза 4–6: −1, 7–9: −2', function(){
    expect(dosePenalty(0)).toBe(0);expect(dosePenalty(3)).toBe(0);expect(dosePenalty(4)).toBe(-1);expect(dosePenalty(6)).toBe(-1);expect(dosePenalty(7)).toBe(-2);expect(dosePenalty(9)).toBe(-2);
  });
  test('болезнь: штраф по её эффектам, а не общий −1', function(){
    var c=ch({diseases:[{key:"bolotnaya"}]});
    expect(diseasePenalty(c,"telo")).toBe(-2);expect(diseasePenalty(c,"reak")).toBe(0);expect(diseasePenalty(ch({}),"telo")).toBe(0);
  });
  test('общий rollPen складывает Дозу, болезнь, Волю и потрясение', function(){
    var c=ch({dose:7,diseases:[{key:"goryachka"}],shakenPenalty:2,curWill:-1});var inf=cF(c);
    expect(inf.rollPen("telo").total).toBe(-2-1-2-2);expect(inf.rollPen("har").total).toBe(-2-1-2-2);
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

describe('создание v3', function(){
  var C=require('../utils/creation');var G=require('../data/gear');var S=require('../data/stats');var CH=require('../utils/character');
  function base(o){return Object.assign(C.emptyCreation(),{name:"Гайка",origin:"post",age:"22",postStat:"reak",profession:"montyor",kit:{gun:"",cass:[]}},o||{})}
  test('бюджет 15 / 15, потолок 8, стартовые значения происхождения', function(){
    expect(C.STAT_POINTS).toBe(15);expect(C.SKILL_POINTS).toBe(15);expect(C.START_CAP).toBe(8);
    expect(C.finalStats(base({postStat:""}))).toEqual({telo:3,reak:3,vosp:3,razum:2,har:2,volya:3});
    expect(C.finalStats(base({origin:"pre"}))).toEqual({telo:2,reak:2,vosp:3,razum:3,har:3,volya:3});
    expect(C.statMax(base({origin:"pre"}),"reak")).toBe(7);
  });
  test('пример из книги: Гайка', function(){
    var cr=base({stats:{telo:1,reak:3,vosp:2,razum:5,har:2,volya:2},skills:{"Механика":3,"Техника":1,"Атлетика":1,"Торг":1,"Внимательность":1,"Огнестрел":2,"Вождение":1,"Выживание":1}});
    expect(C.statsLeft(cr)).toBe(0);expect(C.skillsLeft(cr)).toBe(0);
    expect(C.finalStats(cr)).toEqual({telo:4,reak:7,vosp:5,razum:7,har:4,volya:5});
    var sk=C.finalSkills(cr);expect(sk["Механика"]).toBe(5);expect(sk["Техника"]).toBe(3);expect(sk["Внимательность"]).toBe(3);expect(sk["Выживание"]).toBe(3);
    for(var i=0;i<5;i++)expect(C.stepErrors(cr,i)).toEqual([]);
  });
  test('Вождение — навык Реакции, ×2', function(){
    expect(S.skStat("Вождение")).toBe("reak");expect(S.skCost("Вождение")).toBe(2);expect(S.X2_SKILLS.length).toBe(11);
    expect(S.skCost("Торг")).toBe(1);
  });
  test('×2 съедает 2 очка, за последнее 1 не купить', function(){
    var cr=base({skills:{"Огнестрел":4,"Уклонение":3}});
    expect(C.skillsLeft(cr)).toBe(1);expect(C.canSkill(cr,"Вождение")).toBe(false);expect(C.canSkill(cr,"Торг")).toBe(true);
  });
  test('шаги не пропускают без выбора', function(){
    expect(C.stepErrors(base({name:" "}),0).length).toBe(1);
    expect(C.stepErrors(base({age:"40"}),1).length).toBe(1);
    expect(C.stepErrors(base({origin:"pre",age:"50",pre:{"Знания":3}}),1).length).toBe(1);
    expect(C.stepErrors(base({profession:"strelok"}),2).length).toBe(1);
    expect(C.stepErrors(base(),3).length).toBe(1);
  });
  test('Водила: +2 к Вождению, буханка в гараж, канистра, монтировка', function(){
    var cr=base({profession:"vodila"});expect(C.finalSkills(cr)["Вождение"]).toBe(2);
    var r=C.finishPatch(CH.nC("x"),G.GEAR_DEFAULTS,cr);
    expect(r.patch.garage.length).toBe(1);expect(r.patch.garage[0]).toMatchObject({key:"bukhanka",hull:45,maxHull:45,armorType:"light",speed:2,handling:-1,ram:"4d6"});
    expect(r.patch.inventory.some(function(i){return /Канистра/.test(i.name)})).toBe(true);
    expect(r.patch.weapons.map(function(w){return w.name})).toContain("Монтировка");
    expect(C.finishPatch(Object.assign({},CH.nC("x"),r.patch),G.GEAR_DEFAULTS,cr).patch.garage).toBeUndefined();
  });
  test('стрелок и кассетник получают набор', function(){
    var r=C.finishPatch(CH.nC("x"),G.GEAR_DEFAULTS,base({profession:"strelok",kit:{gun:"«Карманник», пистолет",cass:[]}}));
    expect(r.patch.locked).toBe(true);expect(r.patch.weapons[0].name).toMatch(/Карманник/);expect(r.patch.inventory.find(function(i){return i.ptype==="Пуля"}).qty).toBe(30);
    var k=C.finishPatch(CH.nC("x"),G.GEAR_DEFAULTS,base({profession:"kassetnik",kit:{gun:"",cass:["torgash","efir"]}}));
    expect(k.patch.bracelet).toEqual({model:"Utilitary"});expect(k.patch.cassettes.length).toBe(2);
  });
  test('генератор: старт происхождения + 15 очков, бюджет навыков не превышен', function(){
    for(var i=0;i<20;i++){var r=CH.rndCore(PROFS[2],"pre");expect(CH.statSpent(r.stats,"pre")).toBe(15);expect(r.stats.telo).toBeLessThanOrEqual(7);
      var s=CH.skillSpent(r.skills);expect(s).toBeLessThanOrEqual(15);expect(s).toBeGreaterThanOrEqual(14)}
  });
});

describe('криты', function(){
  var K=require('../utils/crits');var H=require('../utils/hits');var CB=require('../data/combat');var CH=require('../utils/character');
  var Z=function(n){return CB.zoneByName(n)};
  function pc(o){return Object.assign(CH.nC("Гайка"),{hpRoll:10,stats:{telo:8,reak:8,vosp:3,razum:3,har:3,volya:3}},o||{})}
  test('меньше 10 — не крит, 10–14 и 15+ по зонам', function(){
    expect(K.critOutcome(pc(),"Голова",9)).toBeNull();
    expect(K.critOutcome(pc(),"Голова",10).status.key).toBe("contusion");
    var ko=K.critOutcome(pc(),"Голова",15,function(n){return n===6?4:1});expect(ko.status.key).toBe("ko");expect(ko.status.roundsLeft).toBe(4);
    expect(K.critOutcome(pc(),"Шея",12).status.bleed).toBe(2);expect(K.critOutcome(pc(),"Шея",16).status.bleed).toBe(4);
    expect(K.critOutcome(pc(),"Пах",11).status.skipLeft).toBe(1);expect(K.critOutcome(pc(),"Пах",20).status.skipLeft).toBe(2);
    expect(K.critOutcome(pc(),"Торс",15).status.effects.some(function(e){return e.type==="attack_bonus"})).toBe(true);
  });
  test('вторая контузия — без сознания', function(){
    var c=pc();c=Object.assign(c,K.critPatch(c,K.critOutcome(c,"Голова",10)));
    expect(K.critOutcome(c,"Голова",11).status.key).toBe("ko");
  });
  test('удар 10+ в голову даёт контузию: −2 ко всем броскам, отдых снимает', function(){
    var c=pc();var h=H.resolvePlayerHit(c,4,"П",Z("Голова"),null);
    expect(h.hd).toBe(12);expect(h.crit.status.key).toBe("contusion");
    var c2=Object.assign({},c,h.patch);expect(CH.cF(c2).rollPen("razum").total).toBe(-2);
    expect(K.critsAfterRest(c2).length).toBe(0);
  });
  test('перелом руки роняет оружие; крит по железной руке ломает протез', function(){
    var c=pc({equippedWeapon:"w1"});var h=H.resolvePlayerHit(c,12,"П",Z("Руки"),null,function(){return 2});
    expect(h.crit.status.key).toBe("arm_fracture");expect(h.patch.equippedWeapon).toBeNull();
    var iron=pc({prostheses:{armR:{grade:"new",tip:"kist",tips:["kist"],broken:false}}});
    var h2=H.resolvePlayerHit(iron,12,"П",Z("Руки"),null,function(){return 2});
    expect(h2.crit.kind).toBe("prosthesis");expect(h2.patch.prostheses.armR.broken).toBe(true);expect(h2.patch.crits).toBeUndefined();
  });
  test('щит и броня считаются до крита', function(){
    var h=H.resolvePlayerHit(pc(),12,"П",Z("Торс"),{absorb:0.5,name:"Капот",id:"s"});expect(h.hd).toBe(6);expect(h.crit).toBeNull();
  });
  test('рёбра 15+ — штраф к атаке, перелом ноги — −3 к Уклонению', function(){
    var c=Object.assign(pc(),{crits:[Object.assign({id:"a"},K.CRITS["Торс"].hi),Object.assign({id:"b"},K.CRITS["Ноги"].lo)]});
    var inf=CH.cF(c);expect(inf.pen.attack).toBe(-2);expect(inf.eSk["Уклонение"]).toBe(-5);expect(inf.eSk["Атлетика"]).toBe(-2);
    expect(K.bleedAmount(Object.assign(pc(),{crits:[Object.assign({id:"z"},K.CRITS["Шея"].hi)]}))).toBe(4);
  });
  test('NPC: крит пишется в npc.crits, железный NPC — голова ×1 и К/Р вдвое', function(){
    var n={name:"Наёмник",hp:30,maxHp:30,armorBody:"none"};var r=H.npcCritPatch(n,"Голова",10);expect(r.patch.crits[0].key).toBe("contusion");
    var lent={zoneMult:{"Голова":1},halfKR:true};expect(H.npcZoneMult(lent,Z("Голова"))).toBe(1);expect(H.npcZoneMult({},Z("Голова"))).toBe(3);
    expect(H.npcRaw(lent,9,"К")).toBe(4);expect(H.npcRaw(lent,9,"П")).toBe(9);
    expect(K.npcCritPen({crits:[Object.assign({id:"q"},K.CRITS["Голова"].lo)]},"all")).toBe(-2);
  });
});

describe('болезни v3', function(){
  var G=require('../data/gear');var CH=require('../utils/character');
  function pc(dis){return Object.assign(CH.nC("x"),{hpRoll:5,stats:{telo:5,reak:5,vosp:5,razum:5,har:5,volya:5},diseases:dis})}
  test('12 болезней-объектов из книги', function(){expect(G.DISEASES.length).toBe(12);G.DISEASES.forEach(function(d){expect(d.cure).toBeTruthy()})});
  test('Клещ: −2 к Огнестрелу и Метанию на листе', function(){
    var inf=CH.cF(pc([{key:"kleshch",name:"Клещ"}]));expect(inf.eSk["Огнестрел"]).toBe(-2);expect(inf.eSk["Метание"]).toBe(-2);expect(inf.eSk["Механика"]).toBe(-2);
  });
  test('старые строки понимаются', function(){expect(CH.cF(pc(["Клещ"])).eSk["Огнестрел"]).toBe(-2)});
  test('болотная лихорадка — только броски от Тела; горячка — все', function(){
    var b=CH.cF(pc([{key:"bolotnaya"}]));expect(b.rollPen("telo").total).toBe(-2);expect(b.rollPen("reak").total).toBe(0);
    var g=CH.cF(pc([{key:"goryachka"}]));expect(g.rollPen("har").total).toBe(-2);
  });
  test('Лентец и Белая кровь режут максимум Здоровья', function(){
    var c=pc([]);var base=CH.mHP(CH.cF(c).fs,c);
    var l=pc([{key:"lentec"},{key:"belaya"}]);expect(CH.mHP(CH.cF(l).fs,l)).toBe(base-8);
  });
  test('Мутный глаз: −3 к Внимательности и +3 к штрафу прицела', function(){var i=CH.cF(pc([{key:"mutny"}]));expect(i.eSk["Внимательность"]).toBe(-3);expect(i.pen.aim).toBe(3)});
  test('общего −1 за любую болезнь больше нет', function(){expect(CH.cF(pc([{key:"sibirka"}])).rollPen("telo").total).toBe(0)});
});

describe('железо v3', function(){
  var CB=require('../data/combat');var H=require('../utils/hits');var T=require('../data/traits');var FX=require('../utils/gearFx');var O=require('../utils/gearOps');var CH=require('../utils/character');var SC=require('../utils/sceneStore');
  function pc(o){return Object.assign(CH.nC("x"),{hpRoll:5,stats:{telo:3,reak:5,vosp:5,razum:5,har:5,volya:5}},o||{})}
  function give(c,w){var p=O.giveSolution(c,CAT,w);if(p.error)throw new Error(p.error);return Object.assign({},c,p)}
  afterEach(function(){SC.setScene({})});
  test('две руки и две ноги, у каждой своя насадка', function(){
    var c=pc({bracelet:{model:"Military"}});c=give(c,{t:"arm"});c=give(c,{t:"arm"});c=give(c,{t:"leg"});c=give(c,{t:"leg"});
    expect(Object.keys(c.prostheses).filter(function(k){return /^(arm|leg)[LR]$/.test(k)&&c.prostheses[k]}).length).toBe(4);
    expect(O.giveSolution(c,CAT,{t:"arm"}).error).toBeTruthy();
    expect(T.nestInfo(c,CAT).solutions).toBe(4);expect(T.ironSteps(c,CAT)).toBe(4);
    c=give(c,{t:"tip",key:"kleshnya"});c=give(c,{t:"tip",key:"instrument"});
    c=Object.assign(c,O.setTip(c,CAT,"armR","kleshnya"));c=Object.assign(c,O.setTip(c,CAT,"armL","instrument"));
    var inf=CH.cF(c);expect(inf.eSk["Ближний бой"]).toBe(2);expect(inf.eSk["Механика"]).toBe(2);
    expect(O.setTip(c,CAT,"armL","kleshnya").error).toBeTruthy();
    c=give(c,{t:"legtip",key:"pedal"});c=Object.assign(c,O.setTip(c,CAT,"legL","pedal"));expect(CH.cF(c).eSk["Вождение"]).toBe(2);
  });
  test('сломанный протез не даёт бонуса; срыв ломает ту руку, где насадка', function(){
    var c=give(pc(),{t:"arm"});c=give(c,{t:"tip",key:"instrument"});c=Object.assign(c,O.setTip(c,CAT,"armR","instrument"));
    var fx=FX.fumbleFx(c,CH.cF(c),"Механика",{d:-3,base:1,fumble:true});expect(fx.patch.prostheses.armR.broken).toBe(true);
    expect(FX.fumbleFx(c,CH.cF(c),"Механика",{d:2,base:2}).patch.prostheses).toBeUndefined();
    var rb=Object.assign({},c,O.setLimb(c,CAT,"armR",{grade:"rebuilt"}));expect(FX.fumbleFx(rb,CH.cF(rb),"Механика",{d:2,base:2}).patch.prostheses.armR.broken).toBe(true);
    var br=Object.assign({},c,fx.patch);expect(CH.cF(br).eSk["Механика"]).toBe(0);
  });
  test('старая схема solutions.arm читается как правая рука', function(){
    var c=pc({prostheses:undefined,solutions:{arm:{grade:"new",tip:"kleshnya",tips:["kist","kleshnya"]},leg:null,implants:[],addons:[]}});
    expect(CH.cF(c).eSk["Ближний бой"]).toBe(2);
  });
  test('насадки-оружие: «Жнец» и кулак протеза бьют как Тело 7, «Ствол» — огнестрел', function(){
    var c=give(pc(),{t:"arm"});expect(T.gearWeapons(c,CAT).map(function(w){return w.name})).toEqual(["Кулак протеза (правый)"]);
    expect(c.weapons.some(function(w){return w.prosthetic})).toBe(true);
    c=give(c,{t:"tip",key:"zhnec"});c=Object.assign(c,O.setTip(c,CAT,"armR","zhnec"));
    expect(c.weapons.map(function(w){return w.name})).toEqual(["Клинок «Жнец»"]);expect(c.weapons[0]).toMatchObject({dmgDice:"2d6",dmgType:"Р",type:"Battle",prosthetic:true});
    c=give(c,{t:"tip",key:"stvol"});c=Object.assign(c,O.setTip(c,CAT,"armR","stvol"));expect(c.weapons[0].type).toBe("Guns");
    expect(require('../data/gear').PROSTHETIC_TELO).toBe(7);
  });
  test('«Заслон» — лёгкий щит 50%, прочность 12, руки свободны; «Молот» −2 к тонкой работе', function(){
    var c=give(pc(),{t:"arm"});c=give(c,{t:"tip",key:"zaslon"});c=Object.assign(c,O.setTip(c,CAT,"armR","zaslon"));
    expect(c.shields.length).toBe(1);expect(c.shields[0]).toMatchObject({type:"light",absorb:0.5,hp:12,freeHands:true});
    c=give(c,{t:"tip",key:"molot"});c=Object.assign(c,O.setTip(c,CAT,"armR","molot"));expect(c.shields.length).toBe(0);
    expect(CH.cF(c).eSk["Механика"]).toBe(-2);expect(c.weapons[0]).toMatchObject({dmgDice:"2d6",bonus:2,dmgType:"Д"});
  });
  test('две железные руки — без −2 на второй атаке', function(){
    var c=give(give(pc(),{t:"arm"}),{t:"arm"});expect(T.twoIronArms(c)).toBe(true);
    var b=Object.assign({},c,O.setLimb(c,CAT,"armL",{broken:true}));expect(T.twoIronArms(b)).toBe(false);
  });
  test('Пластина в черепе: голова ×1 и −1 к Внимательности; Шейные кольца: шея ×1', function(){
    var c=pc();c=Object.assign(c,O.giveSolution(c,CAT,{t:"implant",key:"plastina"}));
    expect(CH.cF(c).eSk["Внимательность"]).toBe(-1);
    var h=H.resolvePlayerHit(c,4,"П",CB.zoneByName("Голова"),null);expect(h.mult).toBe(1);expect(h.hd).toBe(4);
    var n=Object.assign(pc(),O.giveSolution(pc(),CAT,{t:"implant",key:"sheynye"}));expect(H.resolvePlayerHit(n,5,"П",CB.zoneByName("Шея"),null).hd).toBe(5);
    expect(H.resolvePlayerHit(pc(),5,"П",CB.zoneByName("Шея"),null).hd).toBe(10);
  });
  test('Пластинки: по рукам −3; Позвоночная шина: +5 к максимуму Здоровья', function(){
    var c=Object.assign(pc(),O.giveSolution(pc(),CAT,{t:"implant",key:"plastinki"}));expect(H.resolvePlayerHit(c,7,"П",CB.zoneByName("Руки"),null).hd).toBe(4);
    var base=pc();var s=Object.assign(pc(),O.giveSolution(pc(),CAT,{t:"implant",key:"shina"}));
    expect(CH.mHP(CH.cF(s).fs,s)-CH.mHP(CH.cF(base).fs,base)).toBe(5);
  });
  test('топь: всем −2, железной ноге без «Болотохода» ещё −2; с «Болотоходом» штрафа нет', function(){
    SC.setScene({swamp:true});
    expect(CH.cF(pc()).eSk["Уклонение"]).toBe(-2);
    var l=give(pc(),{t:"leg"});expect(CH.cF(l).eSk["Атлетика"]).toBe(-4);
    l=give(l,{t:"legtip",key:"bolotohod"});l=Object.assign(l,O.setTip(l,CAT,"legR","bolotohod"));expect(CH.cF(l).eSk["Атлетика"]).toBe(0);
  });
});

describe('каталог и бестиарий v3', function(){
  var SD=require('../data/shopDefaults');var N=require('../data/npcDefaults');var TR=require('../data/trinkets');var GR=require('../utils/grant');var CH=require('../utils/character');
  var all=SD.buildShopDefaults().concat(SD.buildMiscDefaults());
  function find(n){return all.find(function(i){return i.name===n})}
  test('новое оружие с книжными цифрами', function(){
    expect(find('Топор «Колун»')).toMatchObject({wtype:'Battle',dmgDice:'2d6',hands:1.5,bonus2h:2,price:40});
    expect(find('«Дальнобой»')).toMatchObject({dmgDice:'4d6',bonus:2,clip:5,aimBonus:2,price:900});
    expect(find('«Казённый», пулемёт').notForSale).toBe(true);
    expect(find('«Коктейль»').consumable).toBe(true);expect(find('Шокер «Ёжик»').charges).toBe(3);
    expect(find('Гвозди (50 шт.)')).toMatchObject({ptype:'Гвозди',bundleQty:50,price:5});
    ['Крышка люка','Дверь от буханки','Мотошлем','Сапёрный нагрудник','Шейные кольца','Канистра горючки (20 л)','Сок','Бешенка','Аптечка фельдшера'].forEach(function(n){expect(find(n)).toBeTruthy()});
    expect(find('Насадка на руку: Клинок «Жнец»')).toBeTruthy();expect(find('Насадка на ногу: «Педаль»')).toBeTruthy();
  });
  test('«Гвоздомёт» получает магазин и тянет гвозди', function(){
    var p=GR.grantPatch(CH.nC("x"),CAT,find('«Гвоздомёт»'));expect(p.weapons[0]).toMatchObject({clip:20,ammo:20,ammoType:'Гвозди',type:'Guns'});
  });
  test('безделушка: d30 и цена 1d6', function(){
    expect(TR.TRINKETS.length).toBe(30);
    var t=TR.rollTrinket(function(n){return n===30?7:4});expect(t.roll).toBe(7);expect(t.item.price).toBe(4);expect(t.item.desc).toMatch(/Зуб чучуны/);
  });
  test('фракции в бестиарии: у всех поле faction, вожаки ×2 опыта, Лента железная', function(){
    var b=N.buildNpcDefaults();var all=[];Object.keys(b).forEach(function(cat){Object.keys(b[cat]).forEach(function(k){if(k!=="_created")all.push(b[cat][k])})});
    all.forEach(function(n){expect(n).toHaveProperty('faction')});
    var fr=Object.keys(b['Фракции за трактом']).filter(function(k){return k!=="_created"}).map(function(k){return b['Фракции за трактом'][k]});
    expect(fr.map(function(n){return n.faction}).sort()).toEqual(['bezbash','kult','lenta','pokrov','rodnya','sok']);
    var byName={};all.forEach(function(n){byName[n.name]=n});
    expect(byName['Людоед (Родня)'].xpReward).toBe(26);expect(byName['Накал'].xpReward).toBe(76);expect(byName['Мародёр'].faction).toBeNull();
    expect(byName['Голос'].zoneMult['Голова']).toBe(1);expect(byName['Лентач-сборщик'].halfKR).toBe(true);
  });
});

describe('жизненный путь', function(){
  var L=require('../utils/lifepath');var D=require('../data/lifepath');var CH=require('../utils/character');
  function seq(arr){var i=0;return function(){return arr[i++%arr.length]}}
  test('таблицы по 10 строк, диапазоны покрывают 1–10', function(){
    [D.PRE_ROOTS.parents,D.PRE_ROOTS.where2012,D.PRE_ROOTS.family,D.POST_ROOTS.born,D.POST_ROOTS.raised,D.POST_ROOTS.family,D.INNER.character,D.INNER.values,D.INNER.polis,D.PRE_YEARS.bad,D.PRE_YEARS.good,D.AFTER.bad,D.AFTER.good,D.CHILDHOOD,D.FRIEND.who,D.FRIEND.how,D.ENEMY.who,D.ENEMY.why,D.ENEMY.what,D.LOVE.tragedy,D.LOVE.hard].forEach(function(t){expect(t.length).toBe(10)});
    for(var n=1;n<=10;n++){expect(D.inRange(D.FRIEND.close,n)).toBeTruthy();expect(D.inRange(D.ENEMY.power,n)).toBeTruthy();expect(D.inRange(D.LOVE.how,n)).toBeTruthy()}
  });
  test('число пятилеток по книге', function(){
    expect(L.periods("post",22).map(function(p){return p.table})).toEqual(["child","child","after","after"]);
    expect(L.periods("post",18).length).toBe(3);
    var pre=L.periods("pre",52);expect(pre.filter(function(p){return p.table==="pre"}).length).toBe(Math.floor((2012-1983-15)/5));expect(pre.filter(function(p){return p.table==="after"}).length).toBe(4);
    expect(L.periods("pre",45).filter(function(p){return p.table==="pre"}).length).toBe(1);
  });
  test('ветвление: 1–4 удача/беда по чётности, 5–7 друг/враг, 8–9 любовь, 10 тихие годы', function(){
    var p={from:2023,to:2028,table:"after"};
    expect(L.rollPeriod(p,seq([2,4,1])).t).toMatch(/^Удача: Довоенный тайник/);
    expect(L.rollPeriod(p,seq([2,3,6])).t).toMatch(/^Беда: Долг/);
    expect(L.rollPeriod(p,seq([6,2,1,6,7])).kind).toBe("friend");
    var en=L.rollPeriod(p,seq([5,1,3,5,4,9]));expect(en.kind).toBe("enemy");expect(en.power).toMatch(/С властью/);
    expect(L.rollPeriod(p,seq([9,5,5])).t).toMatch(/трагическая: Переписали кассетами/);
    expect(L.rollPeriod(p,seq([10])).kind).toBe("quiet");
    expect(L.rollPeriod({from:2013,to:2018,table:"child"},seq([9])).t).toMatch(/подавал ключи/);
  });
  test('пример Гайки: +1 к Механике, друг Бублик, контакт для мастера', function(){
    var c=Object.assign(CH.nC("Гайка"),{origin:"post",age:22,profession:"montyor",skills:Object.assign(CH.nC().skills,{"Механика":5})});
    var lp={roots:L.rollRoots("post",seq([1,5,3])),inner:L.rollInner(seq([9,8,3])),years:[]};
    var per=L.periods("post",22);
    lp.years=[L.rollPeriod(per[0],seq([9])),L.rollPeriod(per[1],seq([8])),Object.assign(L.rollPeriod(per[2],seq([6,2,1,6,7])),{nick:"Бублик"}),L.rollPeriod(per[3],seq([9,5,5]))];
    expect(lp.roots[0].t).toBe("В бараке Мирного");expect(lp.inner[2].t).toBe("Бизнес йегерей");
    var r=L.applyLifepath(c,CAT,lp);
    expect(r.patch.skills["Механика"]).toBe(6);expect(r.skillsUsed).toBe(1);
    expect(r.contacts).toHaveLength(1);expect(r.contacts[0]).toMatchObject({kind:"friend",nick:"Бублик"});
    expect(r.patch.bio[0]).toBe("Где родился: В бараке Мирного");expect(r.patch.bio.some(function(l){return /^2028–2033: Любовь, трагическая/.test(l)})).toBe(true);
    expect(r.patch.lifepath.done).toBe(true);
  });
  test('пределы: не больше +2 к навыкам и 100 ер.; сверх — без эффекта', function(){
    var c=Object.assign(CH.nC("x"),{origin:"pre",age:60,profession:"strelok"});
    var ev=function(t,fx){return{label:"x",kind:"good",t:t,fx:fx}};
    var r=L.applyLifepath(c,CAT,{roots:[],inner:[],years:[ev("a",{skill:"Огнестрел",amount:1}),ev("b",{skill:"Знания",amount:1}),ev("c",{skill:"Выживание",amount:1}),ev("d",{money:100}),ev("e",{money:50}),ev("f",{dose:2})]});
    expect(r.skillsUsed).toBe(2);expect(r.patch.skills["Выживание"]).toBe(0);expect(r.patch.money).toBe(100);expect(r.skipped.length).toBe(2);expect(r.patch.dose).toBe(2);
    expect(r.patch.bio.filter(function(l){return /без эффекта/.test(l)}).length).toBe(2);
  });
  test('потеря конечности: «Хватка» или «Опора» и долг хирургу', function(){
    var r=L.applyLifepath(CH.nC("x"),CAT,{roots:[],inner:[],years:[{label:"y",kind:"bad",t:"t",fx:{prosthesis:"roll",debt:200,debtTo:"хирургу"}}]},function(){return 2});
    expect(r.patch.prostheses.legR).toMatchObject({grade:"new",tip:"stopa"});expect(r.patch.debts[0].amount).toBe(200);
  });
});

describe('машины', function(){
  var V=require('../utils/vehicles');var VD=require('../data/vehicles');
  function seq(arr){var i=0;return function(){return arr[i++%arr.length]}}
  var buh=function(o){return Object.assign(VD.newVehicle("bukhanka"),o||{})};
  test('каталог гаража по книге', function(){
    var b=VD.vehicleByKey("bukhanka");expect(b).toMatchObject({hull:45,armorType:"light",armorHp:10,speed:2,handling:-1,seats:"8",tank:3,ram:"4d6",price:900,repairBonus:2,swampFree:true});
    expect(VD.vehicleByKey("truck")).toMatchObject({hull:90,armorType:"heavy",armorHp:30,ram:"6d6",price:null});
    expect(VD.vehicleByKey("moto").moto).toBe(true);expect(VD.vehicleByKey("bezbashennik")).toMatchObject({hull:120,armorHp:40,ram:"8d6"});
  });
  test('бросок водителя: Реакция + Вождение + Управляемость + d10, колесо −2, топь −2 (кроме Буханки)', function(){
    var r=V.driverRoll({reak:6,driving:3},VD.newVehicle("buggy"),{},{d:5});expect(r.total).toBe(15);
    expect(V.driverRoll({reak:6,driving:3},Object.assign(VD.newVehicle("buggy"),{wheelsHit:1}),{swamp:true},{d:5}).total).toBe(11);
    expect(V.driverRoll({reak:6,driving:3},buh(),{swamp:true},{d:5}).total).toBe(13);
  });
  test('погоня: быстрая прибавляет разницу скоростей, 5+ — два очка', function(){
    var a={v:VD.newVehicle("moto"),total:10},b={v:buh(),total:12};
    var r=V.chaseRound(a,b);expect(r.ta).toBe(13);expect(r.winner).toBe("a");expect(r.gain).toBe(1);
    expect(V.chaseRound({v:buh(),total:20},{v:buh(),total:12}).gain).toBe(2);
    expect(V.chaseRound({v:buh(),total:12},{v:buh(),total:12}).winner).toBeNull();
    expect(V.CHASE_GOAL).toBe(3);
  });
  test('таран: атака должна быть больше защиты; таранящему половина', function(){
    expect(V.ramResult(10,10,"4d6").hit).toBe(false);
    var r=V.ramResult(14,10,"4d6",seq([5]));expect(r).toEqual({hit:true,dmg:20,self:10});
  });
  test('попадание d6: водитель, колесо, корпус, мотор, бак', function(){
    var b=buh();
    var d1=V.vehicleHit(b,10,"П",null,{d6:1});expect(d1.driverDmg).toBe(5);expect(d1.v.hull).toBe(40);
    var m1=V.vehicleHit(VD.newVehicle("moto"),10,"П",null,{d6:1});expect(m1.driverDmg).toBe(10);expect(m1.v.hull).toBe(20);
    var d2=V.vehicleHit(b,10,"П",null,{d6:2});expect(d2.v.wheelsHit).toBe(1);expect(V.vehicleHit(d2.v,10,"П",null,{d6:2}).v.stopped).toBe(true);
    var d3=V.vehicleHit(b,8,"К",null,{d6:3});expect(d3.v.hull).toBe(41);expect(d3.v.armorHp).toBe(8);
    expect(V.vehicleHit(b,6,"П",null,{d6:5}).v.speedLoss).toBe(1);
    expect(V.vehicleHit(b,6,"П",null,{d6:6,fire:6}).v.burning).toBe(true);expect(V.vehicleHit(b,6,"П",null,{d6:6,fire:3}).v.burning).toBeFalsy();
  });
  test('корпус 0: встала; от тарана или на скорости 4–5 — переворот 3d6', function(){
    var slow=V.vehicleHit(buh({hull:3,armorHp:0}),10,"П",seq([4]),{d6:3});expect(slow.v.stopped).toBe(true);expect(slow.flip).toBeUndefined();
    var fast=V.vehicleHit(Object.assign(VD.newVehicle("buggy"),{hull:3,armorHp:0}),10,"П",seq([4]),{d6:3});expect(fast.flip).toBe(12);
    var ram=V.zeroHull(buh({hull:5}),buh({hull:0}),true,seq([2]));expect(ram.flip).toBe(6);
  });
  test('ремонт: ящик 1d6, проволока 1d4; мотор и колесо — Механика СЛ 14 (Буханка +2)', function(){
    expect(V.repairHull(buh({hull:10}),"tools",seq([6])).v.hull).toBe(16);expect(V.repairHull(buh({hull:44}),"wire",seq([4])).v.hull).toBe(45);
    expect(V.repairPartBonus(buh())).toBe(2);expect(V.fixPart(buh({speedLoss:1,wheelsHit:2,stopped:true}),"wheel").stopped).toBe(false);
    expect(V.movingPen(true,false)).toBe(-4);expect(V.movingPen(false,true)).toBe(0);expect(V.movingPen(false,false)).toBe(-2);
  });
});

describe('миграция v3', function(){
  var M=require('../utils/migrate');var CH=require('../utils/character');
  var old={name:"Старый",level:4,xp:700,stats:{telo:6,reak:6,vosp:5,razum:4,har:4,volya:5},skills:{"Огнестрел":4,"Торг":2},lockedSkills:{"Огнестрел":4,"Торг":2},locked:true,
    bio:"Жил на 312-м.\nВоевал.",diseases:["Клещ"],solutions:{arm:{grade:"new",tip:"kleshnya",tips:["kist","kleshnya"],broken:false},leg:{grade:"new"},implants:[],addons:[]},hpRoll:6,curHp:20};
  test('добавляет Вождение, crits, prostheses, bio[], reputation; болезни — объекты', function(){
    var m=M.migrateChar(old);
    expect(m.skills["Вождение"]).toBe(0);expect(m.lockedSkills["Вождение"]).toBe(0);expect(m.crits).toEqual([]);expect(m.reputation).toEqual({});
    expect(m.prostheses.armR.tip).toBe("kleshnya");expect(m.prostheses.legR).toMatchObject({grade:"new",tip:"stopa"});expect(m.prostheses.armTips).toEqual(["kleshnya"]);
    expect(m.solutions.arm).toBeNull();expect(m.bio).toEqual(["Жил на 312-м.","Воевал."]);expect(m.diseases).toEqual([{key:"kleshch",name:"Клещ"}]);
  });
  test('характеристики и прошлые уровни не пересчитываются', function(){
    var m=M.migrateChar(old);expect(m.stats).toEqual(old.stats);expect(m.level).toBe(4);expect(m.levelHp).toBeUndefined();
    expect(CH.mHP(CH.cF(m).fs,m)).toBe(CH.mHP(CH.cF(old).fs,old));
    expect(CH.cF(m).eSk["Ближний бой"]).toBe(2);
  });
  test('новый персонаж миграции не требует', function(){expect(M.needsMigration(CH.nC("x"))).toBe(false);expect(M.needsMigration(M.migrateChar(old))).toBe(false)});
});

/* ── v4, п.15: кассеты ── */
import { makeCassette, cassDef, salePrice, cassLabel, endSessionRolls, milOnly } from '../utils/cassettes';
import { cassEffects as cassEff } from '../data/traits';
describe('кассеты v4', function(){
  test('запись на характеристику — только MIL, слепок — 128', function(){
    var x=makeCassette({key:'zhila',kind:'orig',cls:'CIVIL',capacity:16},CAT);
    expect(x.cls).toBe('MIL');
    var s=makeCassette({key:'tishina',kind:'slep',capacity:32,donor:'Тропарь',imprint:'3'},CAT);
    expect(s.capacity).toBe(128);expect(s.imprint).toBe(3);expect(s.donor).toBe('Тропарь');
    expect(milOnly(cassDef({key:'medved'},CAT))).toBe(true);
    expect(milOnly(cassDef({key:'tishina'},CAT))).toBe(false);
  });
  test('затёртая: −1, не ниже +1', function(){
    var d=cassDef({key:'medved'},CAT);
    var e=cassEff({kind:'orig',condition:'worn'},d);
    expect(e.find(function(k){return k.skill==='Ближний бой'}).amount).toBe(1);
    expect(e.find(function(k){return k.skill==='Запугивание'}).amount).toBe(1);
  });
  test('цена продажи', function(){
    var d=cassDef({key:'medved'},CAT);
    expect(salePrice({kind:'orig'},d)).toBe(400);
    expect(salePrice({kind:'copy'},d)).toBe(200);
    expect(salePrice({kind:'fake'},d)).toBe(400);
    expect(salePrice({kind:'fake',revealed:true},d)).toBe(0);
    expect(salePrice({kind:'orig',condition:'worn'},d)).toBe(300);
    expect(salePrice({kind:'orig',condition:'broken'},d)).toBe(200);
    expect(salePrice({kind:'slep'},cassDef({key:'torgash',kind:'slep'},CAT))).toBe(80);
  });
  test('палёнка в общем логе — оригинал', function(){
    var x=makeCassette({key:'tverdaya_ruka',kind:'fake',condition:'worn'},CAT);
    var d=cassDef(x,CAT);
    expect(cassLabel(x,d,false)).toBe('Твёрдая рука (MIL · 64 · оригинал · затёртая)');
    expect(cassLabel(x,d,true)).toContain('палёнка');
  });
  test('своя запись', function(){
    var x=makeCassette({key:'custom',title:'Рыбак',kind:'copy',cls:'CIVIL',capacity:16,skill:'Выживание',amount:2},CAT);
    var d=cassDef(x,CAT);expect(d.name).toBe('Рыбак');expect(d.cap).toBe(16);
    expect(d.effects[0]).toEqual({type:'skill_bonus',skill:'Выживание',amount:2});
  });
  test('конец сессии: битая на 1 — испорчена', function(){
    var c={cassettes:[{id:'a',inNest:true,condition:'broken',title:'А'},{id:'b',inNest:true,condition:'good'},{id:'c',inNest:false,condition:'broken'}]};
    var r=endSessionRolls(c,function(){return 1});
    expect(r.results.length).toBe(1);expect(r.cassettes[0].dead).toBe(true);expect(r.cassettes[2].dead).toBeUndefined();
    expect(endSessionRolls(c,function(){return 2}).cassettes[0].dead).toBeUndefined();
  });
});

/* ── v4, п.20: выгорание Выдержки ── */
import { burnOnFail, slepDecision, vydOf, restoreState, restorePatch } from '../utils/slep';
describe('слепок ест Выдержку', function(){
  var base=function(o){return Object.assign({name:'Тест',level:2,skills:{'Выдержка':4},skillPts:3,cassettes:[{id:'s',kind:'slep',inNest:true,imprint:4,donor:'Тропарь'}]},o||{})};
  test('провал при Отпечатке 4 сжигает очко', function(){
    var c=base();var b=burnOnFail(c,c.cassettes[0],4);
    expect(b.patch.burned).toBe(1);expect(b.text).toBe('Слепок «Тропарь» съел очко Выдержки (осталось 3)');
    expect(burnOnFail(c,c.cassettes[0],3)).toBeNull();
  });
  test('эффект на листе и захват при нуле', function(){
    var c=base({burned:2});expect(cF(c).eSk['Выдержка']).toBe(2);
    expect(slepDecision(c)).toBeNull();
    var z=slepDecision(base({burned:4}));expect(z.type).toBe('zero');expect(z.donor).toBe('Тропарь');
  });
  test('Край: сплав только при Выдержке ≥3', function(){
    var c=base({cassettes:[{id:'s',kind:'slep',inNest:true,imprint:5,donor:'Т'}]});
    expect(slepDecision(c).fusion).toBe(true);
    expect(slepDecision(Object.assign({},c,{burned:2})).fusion).toBe(false);
  });
  test('восстановить — после чистки, раз за уровень', function(){
    var c=base({burned:2});expect(restoreState(c).show).toBe(false);
    var cl=base({burned:2,cassettes:[]});expect(restoreState(cl).ok).toBe(true);
    var p=restorePatch(cl);expect(p).toEqual({burned:1,skillPts:1,vydRestoredAt:2});
    expect(restoreState(Object.assign({},cl,p)).ok).toBe(false);
    expect(vydOf(Object.assign({},cl,p))).toBe(3);
  });
});

/* ── v4, п.18–19 ── */
import { buildShopDefaults as bsd } from '../data/shopDefaults';
import { grantPatch } from '../utils/grant';
import { buildNpcDefaults as bnd, GROUP_HINTS } from '../data/npcDefaults';
describe('новое оружие, броня, бестиарий', function(){
  test('магазин', function(){
    var all=bsd();var f=function(n){return all.find(function(i){return i.name===n})};
    expect(f('«Швейка», пистолет-пулемёт').clip).toBe(30);expect(f('«Швейка», пистолет-пулемёт').mag).toBeUndefined();
    expect(f('Крышка бочки').cat).toBe('shield');expect(f('Крышка бочки').slot).toBeUndefined();
    expect(f('Щит дорожника').notForSale).toBe(true);
    expect(f('Шлем-горшок').slot).toBe('head');expect(f('Химза').desc).toContain('Доза');
    var w=grantPatch({weapons:[]},CAT,f('«Ведро», помповый дробовик'),{}).weapons[0];expect(w.clip).toBe(6);expect(w.hands).toBe(2);
  });
  test('бестиарий', function(){
    var d=bnd();var names=function(g){return Object.values(d[g]).filter(function(x){return x&&x.name}).map(function(x){return x.name})};
    expect(names('Твари')).toEqual(expect.arrayContaining(['Пересмешник','Мошкара','Сохатый','Щука','Гнилой']));
    expect(names('Люди тракта')).toEqual(expect.arrayContaining(['Охотник за головами','Ойуун','Технойуун']));
    var st=Object.values(d['Именные']).find(function(x){return x.name==='Старик (Пересмешник)'});expect(st.xpReward).toBe(180);
    var g=Object.values(d['Твари']).find(function(x){return x.name==='Гнилой'});expect(g.xpReward).toBe(18);
    expect(GROUP_HINTS['Твари']).toContain('юёр');
  });
});

/* ── v4, п.16–17: машины ── */
import { newVehicle as nv4, normalizeVehicle } from '../data/vehicles';
import { installMod, removeMod, refuel, legDone, ramSelfFrac, swampPen, vehicleHit as vh4, modSlots } from '../utils/vehicles';
describe('машины v4', function(){
  test('бронелисты и отвал', function(){
    var b=nv4('buggy');var r=installMod(b,'bronelisty').v;
    expect(r.armorType).toBe('medium');expect(r.armorHp).toBe(20);expect(r.maxArmorHp).toBe(20);expect(r.handling).toBe(0);
    var r2=installMod(r,'otval').v;expect(r2.ram).toBe('5d6');expect(r2.speed).toBe(3);expect(ramSelfFrac(r2)).toBe(0.25);
    var back=removeMod(removeMod(r2,'otval').v,'bronelisty').v;
    expect(back.armorType).toBe('light');expect(back.armorHp).toBe(10);expect(back.ram).toBe('3d6');expect(back.speed).toBe(4);expect(back.mods).toEqual([]);
  });
  test('слоты: мотоцикл — 1', function(){
    var m=nv4('zhuk');expect(modSlots(m)).toBe(1);var a=installMod(m,'setka').v;expect(installMod(a,'zapbak').error).toBeTruthy();
    expect(installMod(installMod(nv4('jeep'),'kletka').v,'kletka').error).toBeTruthy();
    expect(installMod(nv4('bukhanka'),'kletka').v.seats).toBe('6');
  });
  test('бак: перегон и канистра', function(){
    var j=nv4('jeep');expect(j.fuel).toBe(3);
    var x=legDone(legDone(legDone(j).v).v);expect(x.empty).toBe(true);expect(x.v.stopped).toBe(true);
    var f=refuel(x.v);expect(f.v.fuel).toBe(1);expect(f.v.stopped).toBe(false);
    var q=refuel(Object.assign({},nv4('zhuk'),{fuel:0}));expect(q.add).toBe(2);
    expect(installMod(j,'zapbak').v.tank).toBe(4);
  });
  test('местность и миграция', function(){
    expect(swampPen(nv4('kozlik'))).toBe(-1);expect(swampPen(nv4('bukhanka'))).toBe(0);expect(swampPen(nv4('jeep'))).toBe(-2);
    var old={id:'x',key:'jeep',name:'Джип',hull:45,tank:3,armorType:'medium',armorHp:18,wheelsHit:1};
    var n=normalizeVehicle(old,{type:'char',id:'p'});expect(n.fuel).toBe(3);expect(n.mods).toEqual([]);expect(n.damage).toEqual({wheels:1,engine:false,burning:false});expect(n.owner).toEqual({type:'char',id:'p'});
  });
  test('гусеница и цистерна', function(){
    expect(vh4(nv4('utyug'),10,'П',function(){return 3},{d6:2}).v.stopped).toBe(true);
    var t=vh4(nv4('bochka'),10,'П',function(){return 3},{d6:6,fire:4});expect(t.boom).toBe(9*2);
  });
});
