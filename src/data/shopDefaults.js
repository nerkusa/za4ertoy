import { uid } from '../utils/dice';
import { CASSETTES, TIPS, IMPLANTS, ARM_PRICE, LEG_PRICE, HVATKA_PRICE } from './gear';

/* Стартовый каталог «За Чертой · 2035». Цены — в полисных еврорублях.
   notForSale — купить нельзя, выдаёт только мастер. */
function wp(name,wtype,dmgDice,bonus,dmgType,price,extra){return Object.assign({cat:'weapon',name:name,wtype:wtype,dmgDice:dmgDice,bonus:bonus||0,dmgType:dmgType,hands:1,price:price==null?0:price,notForSale:price==null,desc:''},extra||{})}
function ar(name,slot,type,hp,price){return{cat:'armor',name:name,slot:slot,type:type,hp:hp,price:price==null?0:price,notForSale:price==null,desc:''}}

function buildShopDefaults() {
  const items = [
    // ── Оружие ──
    wp('Якутский нож (быһах)','Simple','1d6',0,'К',15),
    wp('Тесак «Пила»','Battle','1d6',1,'Р',15),
    wp('Монтировка','Simple','1d6',0,'Д',10),
    wp('Крюк Орды','Battle','1d6',2,'К',25),
    wp('Двуручный крюк','Battle','4d6',0,'К',120,{hands:2}),
    wp('Скобы на костяшках','Brawl','1d4',1,'Д',20),
    wp('Арбалет из рессоры','Archery','2d6',0,'С',60,{hands:2,ammoType:'Болт'}),
    wp('«Трубач», самопал','Guns','2d6',0,'П',20,{clip:1}),
    wp('«Кум», двуствольный обрез','Guns','3d6',0,'П',45,{clip:2}),
    wp('«Карманник», пистолет','Guns','2d6',0,'П',60,{clip:8}),
    wp('«Жатва», карабин','Guns','3d6',0,'П',120,{clip:10,hands:2}),
    wp('«Сорока», автомат','Guns','3d6',0,'П',200,{clip:30,hands:2}),
    wp('«Регламент», револьвер йегеря','Guns','3d6',0,'П',250,{clip:6}),
    wp('«Устав», самозарядная винтовка','Guns','3d6',2,'П',null,{clip:10,hands:2}),
    wp('«Делегат», револьвер .45','Guns','4d6',0,'П',400,{clip:6}),
    wp('Кольт «Хардскил»','Guns','4d6',0,'П',null,{clip:7}),
    // ── Броня ──
    ar('Кожаная куртка дорожника','body','light',10,80),
    ar('Разгрузка с пластинами','body','light',12,120),
    ar('Бушлат йегеря','body','medium',18,250),
    ar('Сварная сталь','body','heavy',30,600),
    ar('Каска с поста','head','light',8,40),
    ar('Шлем йегеря с окулярами','head','medium',12,null),
    ar('Рогатый шлем Орды','head','medium',12,90),
    // ── Щиты ──
    { cat: 'shield', name: 'Дорожный знак с ручкой', type: 'light', hp: 12, price: 30, desc: '' },
    { cat: 'shield', name: 'Капот', type: 'medium', hp: 18, price: 60, desc: '' },
    { cat: 'shield', name: 'Бронелист', type: 'tower', hp: 28, price: 150, desc: '' },
  ];
  return items.map(function (i) { return Object.assign({ id: uid() }, i); });
}

function buildMiscDefaults() {
  const items = [
    // ── Расходники ──
    { cat: 'item', name: 'Бинты', desc: 'Перевязка.', price: 5, heal: '1d6' },
    { cat: 'item', name: 'Синька', desc: 'Выводит дозу.', price: 25, doseHeal: 2 },
    // ── Патроны ──
    { cat: 'ammo', name: 'Патроны (10 шт.)', desc: '', price: 10, ptype: 'Пуля', bundleQty: 10 },
    { cat: 'ammo', name: 'Патроны (30 шт.)', desc: '', price: 28, ptype: 'Пуля', bundleQty: 30 },
    { cat: 'ammo', name: 'Болты (10 шт.)', desc: 'К арбалету.', price: 8, ptype: 'Болт', bundleQty: 10 },
    // ── Ремкомплекты и вещи ──
    { cat: 'item', name: 'Ящик инструментов', desc: 'Чинит броню, щиты и оружие.', price: 40, dice: '1d6' },
    { cat: 'item', name: 'Проволока и изолента', desc: 'Полевой ремонт.', price: 8, dice: '1d4' },
    { cat: 'item', name: 'Планшет', desc: 'Читает браслет: показывает Отпечаток и точное Здоровье.', price: 150 },
    { cat: 'item', name: 'Станок кассетника', desc: 'Перешивка и копирование кассет.', price: 300 },
    { cat: 'item', name: 'Паяльник', desc: '', price: 15 },
    { cat: 'item', name: 'Скальпель', desc: '', price: 10 },
    { cat: 'item', name: 'Жгут', desc: '', price: 4 },
    { cat: 'item', name: 'Спирт (фляга)', desc: '', price: 12 },
    { cat: 'item', name: 'Весы', desc: '', price: 20 },
    { cat: 'item', name: 'Разгрузка', desc: 'Подсумки под магазины.', price: 30 },
    { cat: 'item', name: 'Картридж фильтр-лёгкого', desc: 'Раз в 2 недели.', price: 20 },
    { cat: 'item', name: 'Картридж почечного фильтра', desc: 'Раз в месяц.', price: 30 },
    // ── Браслеты ──
    { cat: 'solution', sol: 'bracelet', gearKey: 'Civil', name: 'Браслет MG+ Civil', desc: '3 гнезда, читает CIVIL.', price: 200 },
    { cat: 'solution', sol: 'bracelet', gearKey: 'Utilitary', name: 'Браслет MG+ Utilitary', desc: '5 гнёзд, читает UTIL и CIVIL.', price: 600 },
    { cat: 'solution', sol: 'bracelet', gearKey: 'Military', name: 'Браслет MG+ Military', desc: '7 гнёзд, читает всё.', price: 0, notForSale: true },
    // ── Солюшны ──
    { cat: 'solution', sol: 'arm', gearKey: 'new', name: 'Протез руки', desc: 'С замком под насадки. Гнездо.', price: ARM_PRICE },
    { cat: 'solution', sol: 'arm', gearKey: 'rebuilt', name: 'Протез руки, перебранный', desc: 'Дешевле, но насадки ломаются чаще.', price: Math.round(ARM_PRICE / 2) },
    { cat: 'solution', sol: 'hvatka', name: '«Хватка»', desc: 'Временный протез без гнезда. −2 к тонкой работе.', price: HVATKA_PRICE },
    { cat: 'solution', sol: 'leg', name: 'Нога «Опора»', desc: 'Гнездо.', price: LEG_PRICE },
  ];
  TIPS.filter(function (t) { return t.key !== 'kist'; }).forEach(function (t) {
    items.push({ cat: 'solution', sol: 'tip', gearKey: t.key, name: 'Насадка «' + t.name + '»', desc: [(t.effects || []).map(function (e) { return '+' + e.amount + ' ' + e.skill; }).join(', '), t.text].filter(Boolean).join(' · '), price: t.price || 60 });
  });
  IMPLANTS.forEach(function (d) {
    items.push({ cat: 'solution', sol: 'implant', kind2: d.kind === 'addon' ? 'addon' : 'implant', gearKey: d.key, name: d.name, desc: [(d.effects || []).filter(function (e) { return e.skill || e.stat; }).map(function (e) { return e.type === 'stat_set' ? 'Тело ' + e.value : '+' + e.amount + ' ' + (e.skill || 'Тело'); }).join(', '), d.text].filter(Boolean).join(' · '), price: d.price || 0, notForSale: d.kind === 'full' });
  });
  // ── Кассеты: копии в продаже, оригиналы MIL — только выдача ──
  CASSETTES.forEach(function (c) {
    const eff = (c.effects || []).filter(function (e) { return e.amount && (e.skill || e.stat); }).map(function (e) { return '+' + e.amount + ' ' + (e.skill || { telo: 'Тело', reak: 'Реакция', vosp: 'Восприятие', razum: 'Разум', har: 'Характер', volya: 'Воля' }[e.stat]); }).join(', ');
    items.push({ cat: 'cassette', gearKey: c.key, kind: c.origOnly ? 'orig' : 'copy', name: 'Кассета «' + c.name + '»' + (c.origOnly ? '' : ', копия'), desc: [c.cls + ' · ' + c.cap, eff, c.text].filter(Boolean).join(' · '), price: c.origOnly ? 0 : c.price, notForSale: !!c.origOnly });
  });
  return items.map(function (i) { return Object.assign({ id: uid() }, i); });
}

export { buildShopDefaults, buildMiscDefaults };
