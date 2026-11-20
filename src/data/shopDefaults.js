import { uid } from '../utils/dice';
import { VEHICLES } from './vehicles';
import { CASSETTES, TIPS, LEG_TIPS, IMPLANTS, ARM_PRICE, LEG_PRICE, HVATKA_PRICE } from './gear';

/* Стартовый каталог «За Чертой · 2035». Цены — в полисных еврорублях.
   notForSale — купить нельзя, выдаёт только мастер. */
/* extra.mag — ёмкость магазина (= clip) */
function wp(name,wtype,dmgDice,bonus,dmgType,price,extra){var o=Object.assign({cat:'weapon',name:name,wtype:wtype,dmgDice:dmgDice,bonus:bonus||0,dmgType:dmgType,hands:1,price:price==null?0:price,notForSale:price==null,desc:''},extra||{});if(o.mag){o.clip=o.mag;delete o.mag}return o}
/* slot 'shield' — щит (тип light/medium/tower) */
function ar(name,slot,type,hp,price,extra){var o=Object.assign({cat:slot==='shield'?'shield':'armor',name:name,type:type,hp:hp,price:price==null?0:price,notForSale:price==null,desc:''},slot==='shield'?{}:{slot:slot},extra||{});return o}

function buildShopDefaults() {
  const items = [
    // ── ТЗ v4, п.18: только для приложения ──
    // холодное и рукопашное
    wp('Нож-свежевальник «Скорняк»','Simple','1d6',1,'Р',20,{desc:'Снять шкуру или кожу вдвое быстрее'}),
    wp('Кистень «Гирька»','Simple','1d6',2,'Д',25,{desc:'Против щита: щит принимает на четверть меньше'}),
    wp('Пешня «Долбёжка»','Battle','2d6',0,'К',30,{hands:2,desc:'Ломает лёд, двери, черепа. ×2 урона по прочности двери'}),
    wp('Рельса','Battle','3d6',1,'Д',0,{hands:2,desc:'Нужно Тело 8. Валяется у любой насыпи. −2 к Уклонению, пока в руках'}),
    wp('Газовый резак «Сварка»','Battle','2d6',2,'Д',140,{charges:3,desc:'Баллон на 3 удара. Поджигает: 1d6 в раунд. Режет замки и решётки за минуту'}),
    // стрелковое
    wp('«Мелкашка», малокалиберка','Guns','1d6',2,'П',60,{hands:2,mag:10,desc:'Тихая: выстрел не слышно дальше 100 м. Патрон 0,5 ер.'}),
    wp('«Шило», пневматика','Guns','1d6',0,'К',40,{hands:2,mag:20,desc:'Бесшумная. Пульки дешёвые: 100 шт. — 2 ер.'}),
    wp('«Швейка», пистолет-пулемёт','Guns','2d6',1,'П',350,{mag:30,desc:'Очередь: две атаки за ход, каждая с −2. Расход 5 патронов'}),
    wp('«Ведро», помповый дробовик','Guns','3d6',1,'П',300,{hands:2,mag:6,desc:'В упор (до 5 м) +1d6. Дальше 30 м −2'}),
    wp('«Прадед», винтовка-болтовка','Guns','4d6',0,'П',500,{hands:2,mag:5,desc:'Довоенная, вечная. Перезарядка затвора: один выстрел за ход'}),
    // метательное и ловушки
    wp('Сеть «Невод»','Thrown','—',0,'—',15,{consumable:true,desc:'Цель опутана: −4 к атаке и Уклонению. Выпутаться: Атлетика СЛ 14'}),
    wp('Растяжка-самострел','Thrown','2d6',0,'К',20,{consumable:true,desc:'Ставится за минуту. Заметить: Внимательность СЛ 14'}),
    wp('«Звонок», шумовая граната','Thrown','—',0,'—',30,{consumable:true,desc:'Все в 10 м: Тело СЛ 12 или глухота и −2 ко всему на 2 раунда. Глушит Пересмешника на 2 раунда'}),
    // броня тела
    ar('Покрышечный доспех','body','light',10,70,{desc:'Нарезан из шин. Резиновый: удар током не проходит'}),
    ar('Кольчуга из рабицы','body','medium',14,140,{desc:'Р и К по ней — как по средней, а весит как лёгкая: штраф Уклонения −1 вместо −3'}),
    ar('Химза','body','light',4,90,{desc:'Защитный костюм: Доза от пыли, дождя и земли копится вдвое медленнее. С противогазом — втрое'}),
    ar('Довоенный бронежилет','body','medium',24,500,{desc:'Редкость. Продаётся только на барахолке Мирного'}),
    // голова
    ar('Пожарная каска','head','light',10,40,{desc:'Огонь по голове вдвое слабее'}),
    ar('Хоккейная маска','head','light',6,15,{desc:'Лицо закрыто: −2 к попыткам узнать тебя'}),
    ar('Шлем-горшок','head','medium',14,110,{desc:'Глухой, сваренный из газового баллона. −2 к Внимательности'}),
    // щиты
    ar('Крышка бочки','shield','light',8,10),
    ar('Щит дорожника','shield','medium',22,0,{notForSale:true,desc:'Не продаётся. С таким щитом на посту — вопрос к тебе'}),
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
    // ── Холодное (глава 9) ──
    wp('Обрезок трубы','Simple','1d6',0,'Д',5,{desc:'Валяется везде.'}),
    wp('Цепь с мотоцикла','Simple','1d6',1,'Д',12,{desc:'+2 к попытке выбить оружие.'}),
    wp('Лопатка «Копалка»','Simple','1d6',1,'Р',20,{desc:'Копает окоп и могилу.'}),
    wp('Мачете «Тальник»','Battle','1d6',2,'Р',35,{desc:'Рубит кусты и руки.'}),
    wp('Топор «Колун»','Battle','2d6',0,'Р',40,{hands:1.5,dmgDice2h:'2d6',bonus2h:2,desc:'Двумя руками +2 к урону.'}),
    wp('Багор «Рыбак»','Battle','2d6',0,'К',35,{hands:2,desc:'Длинный: против одноручного бьёшь первым.'}),
    wp('Пальма (батыйа)','Battle','2d6',1,'Р',60,{hands:2,desc:'Старый нож на древке. Длинная, как багор.'}),
    wp('Кувалда «Сваебой»','Battle','3d6',0,'Д',70,{hands:2,desc:'Нужно Тело 6. Ломает двери и щиты: ×2 урона по прочности.'}),
    wp('Коса «Сенокос»','Battle','3d6',0,'Р',90,{hands:2,desc:'Бьёт двоих рядом стоящих, обоих с −2.'}),
    wp('Кастет «Подкова»','Brawl','1d4',1,'Д',15,{desc:'Не изнашивается.'}),
    wp('Шокер «Ёжик»','Brawl','1d4',0,'Д',80,{charges:3,desc:'Цель проверяет Тело СЛ 12 или пропускает ход. 3 заряда.'}),
    // ── Метательное: Реакция + Метание ──
    wp('Ножи «Сороконожки» (3)','Thrown','1d6',0,'К',20,{desc:'Можно метнуть два за ход, второй с −2.'}),
    wp('Топорик','Thrown','1d6',1,'Р',15,{desc:'Годится и для рубки.'}),
    wp('Болас «Путы»','Thrown','0',0,'Д',10,{consumable:false,desc:'Без урона. Цель падает. Распутаться: Атлетика СЛ 14.'}),
    wp('«Коктейль»','Thrown','2d6',0,'Д',5,{consumable:true,desc:'Бутылка горючки. Цель горит: 1d6 каждый раунд, пока не потушит. Одноразовый.'}),
    wp('«Дымарь»','Thrown','0',0,'Д',15,{consumable:true,desc:'Без урона. Дымовая шашка: 3 раунда стрельба сквозь дым с −4. Одноразовый.'}),
    wp('«Консерва»','Thrown','4d6',0,'П',60,{consumable:true,desc:'Самодельная граната, бьёт всех в 3 м. На срыве взрывается в руке. Одноразовая.'}),
    // ── Стрелковое ──
    wp('Лук «Тальниковый»','Archery','1d6',1,'С',25,{hands:2,ammoType:'Стрела',desc:'Бесшумный. Стрелы можно собрать после боя.'}),
    wp('Арбалет «Сухарь»','Archery','1d6',2,'С',50,{ammoType:'Болт',desc:'Пистолетный, прячется под плащ.'}),
    wp('Гарпун «Нерпа»','Archery','2d6',0,'К',90,{hands:2,desc:'На тросе: попал — тянешь цель к себе, Тело против Тела. Гарпун возвращается.'}),
    wp('«Гвоздомёт»','Guns','1d6',2,'К',70,{clip:20,ammoType:'Гвозди',desc:'Стройинструмент. Тихий, стреляет гвоздями.'}),
    wp('Ракетница','Guns','1d6',0,'Д',30,{clip:1,desc:'Поджигает. Вспышку видно за 10 км.'}),
    wp('«Батя», двустволка','Guns','3d6',1,'П',80,{clip:2,hands:2,desc:'Длинная охотничья, бьёт дальше «Кума».'}),
    wp('«Шептун»','Guns','2d6',0,'П',150,{clip:5,desc:'Самопал с глушителем: выстрел не слышно за стеной.'}),
    wp('«Дальнобой»','Guns','4d6',2,'П',900,{clip:5,hands:2,aimBonus:2,desc:'Винтовка с прицелом: штраф прицела на 2 меньше.'}),
    wp('«Казённый», пулемёт','Guns','4d6',0,'П',null,{clip:100,hands:2,desc:'Станковый, на грузовиках конвоя. Нужны двое: стрелок и подающий.'}),
    // ── Броня ──
    ar('Кожаная куртка дорожника','body','light',10,80),
    ar('Разгрузка с пластинами','body','light',12,120),
    ar('Бушлат йегеря','body','medium',18,250),
    ar('Сварная сталь','body','heavy',30,600),
    ar('Каска с поста','head','light',8,40),
    ar('Шлем йегеря с окулярами','head','medium',12,null),
    ar('Рогатый шлем Орды','head','medium',12,90),
    ar('Ватник с подкладом','body','light',6,30),
    Object.assign(ar('Плащ «Резинка»','body','light',6,60),{desc:'Прорезиненный, до пят. Чёрный дождь не даёт Дозы.'}),
    Object.assign(ar('Мотокожа йегеря','body','light',12,150),{desc:'Продаётся только снятая с кого-то. Носить её — вопрос к тебе у первого поста.'}),
    Object.assign(ar('«Чешуя» из шайб','body','medium',16,180),{desc:'Тысяча шайб на проволоке. Звенит: −2 к Скрытности.'}),
    Object.assign(ar('Сапёрный нагрудник','body','medium',20,300),{desc:'Взрывы и «Консервы» снимают вдвое меньше.'}),
    ar('Мотошлем','head','light',10,50),
    Object.assign(ar('Сварочная маска','head','light',6,20),{desc:'Вспышки не слепят, но −1 к Внимательности.'}),
    // ── Щиты ──
    { cat: 'shield', name: 'Дорожный знак с ручкой', type: 'light', hp: 12, price: 30, desc: '' },
    { cat: 'shield', name: 'Капот', type: 'medium', hp: 18, price: 60, desc: '' },
    { cat: 'shield', name: 'Бронелист', type: 'tower', hp: 28, price: 150, desc: '' },
    { cat: 'shield', name: 'Крышка люка', type: 'light', hp: 10, price: 15, desc: '' },
    { cat: 'shield', name: 'Дверь от буханки', type: 'medium', hp: 20, price: 80, desc: '' },
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
    { cat: 'ammo', name: 'Стрелы (10 шт.)', desc: 'К луку.', price: 6, ptype: 'Стрела', bundleQty: 10 },
    { cat: 'ammo', name: 'Гвозди (50 шт.)', desc: 'К «Гвоздомёту».', price: 5, ptype: 'Гвозди', bundleQty: 50 },
    { cat: 'item', name: 'Канистра горючки (20 л)', desc: 'Один перегон буханке или джипу, два — мотоциклу. Половина заправок разбавляет: Механика СЛ 12, иначе −1 к Скорости.', price: 15 },
    // ── В дороге ──
    { cat: 'item', name: 'Противогаз «Хобот»', desc: 'Дым, газ и пыль не дают Дозы. Фильтр на 3 дня.', price: 60 },
    { cat: 'item', name: 'Запасной фильтр к противогазу', desc: '', price: 10 },
    { cat: 'item', name: 'Бинокль «Двуглаз»', desc: '+2 к Внимательности на дальнем расстоянии.', price: 40 },
    { cat: 'item', name: 'Фонарь-жужжалка', desc: 'Свет без батареек, крути ручку.', price: 15 },
    { cat: 'item', name: 'Компас', desc: '+1 к Выживанию, когда ищешь дорогу.', price: 20 },
    { cat: 'item', name: 'Карта тракта', desc: '+2 к Выживанию в пределах тракта Полиса.', price: 30 },
    { cat: 'item', name: 'Палатка-скатка', desc: 'Ночёвка в топи и под дождём — полноценный отдых.', price: 40 },
    { cat: 'item', name: 'Котелок и сухой спирт', desc: 'Кипятишь воду: болотная лихорадка не берёт.', price: 10 },
    { cat: 'item', name: 'Удочка и сеть', desc: '+2 к Выживанию, когда ищешь еду у воды.', price: 15 },
    { cat: 'item', name: 'Верёвка, 20 м', desc: 'Лазать, вязать, тянуть.', price: 8 },
    { cat: 'item', name: 'Отмычки', desc: '+2 к Воровству на замках.', price: 30 },
    { cat: 'item', name: 'Капкан', desc: 'Ловушка: 2d6 К, и нога в железе.', price: 20 },
    { cat: 'item', name: 'Растяжка', desc: 'Мина: 4d6 П. Поставить — Техника СЛ 14.', price: 80 },
    // ── Связь и бумаги ──
    { cat: 'item', name: 'Приёмник', desc: 'Ловит Эфир 104,2 и сводки Полиса.', price: 40 },
    { cat: 'item', name: 'Рация «Говорун»', desc: 'Пара раций, связь на 10 км.', price: 250 },
    { cat: 'item', name: 'Свисток дорожника', desc: 'Слышно за километр. Чужой с таким свистком — проблема.', price: 5 },
    { cat: 'item', name: 'Поддельный пропуск', desc: '+3 к Обману на постах, пока не попадёшь на того, кто проверяет печать.', price: 150 },
    // ── Аптека и курево ──
    { cat: 'item', name: 'Аптечка фельдшера', desc: '5 применений, +2 к Медицине.', price: 60, charges: 5 },
    { cat: 'item', name: 'Шприц «Подъём»', desc: 'Поднимает с нуля Здоровья на 1d6. Потом час −2 ко всем броскам.', price: 50, heal: '1d6' },
    { cat: 'item', name: '«Йодка»', desc: 'Таблетки йода: −1 Доза.', price: 15, doseHeal: 1 },
    { cat: 'item', name: 'Самогон', desc: '+2 к Выдержке против страха на сцену, −1 к Реакции.', price: 3 },
    { cat: 'item', name: 'Махорка', desc: '+1 Воли на привале. Валюта для поста.', price: 1 },
    // ── Фракции (глава 11) ──
    { cat: 'item', name: 'Сок', desc: 'Чёрная болотная дурь. +2 к броскам Тела, −2 Воли на сцену. Каждый раз Выдержка СЛ 12, или тянет ещё.', price: 10 },
    { cat: 'item', name: 'Бешенка', desc: 'Боевой стимулятор. 3 раунда +2 к атаке и не бросаешь страх, потом −2 ко всем броскам до отдыха.', price: 40 },
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
    items.push({ cat: 'solution', sol: 'tip', gearKey: t.key, name: 'Насадка на руку: ' + t.name, desc: [(t.effects || []).map(function (e) { return '+' + e.amount + ' ' + e.skill; }).join(', '), t.text].filter(Boolean).join(' · '), price: t.price || 60 });
  });
  LEG_TIPS.filter(function (t) { return t.key !== 'stopa'; }).forEach(function (t) {
    items.push({ cat: 'solution', sol: 'legtip', gearKey: t.key, name: 'Насадка на ногу: ' + t.name, desc: [(t.effects || []).map(function (e) { return '+' + e.amount + ' ' + e.skill; }).join(', '), t.text].filter(Boolean).join(' · '), price: t.price || 60 });
  });
  IMPLANTS.forEach(function (d) {
    items.push({ cat: 'solution', sol: 'implant', kind2: d.kind === 'addon' ? 'addon' : 'implant', gearKey: d.key, name: d.name, desc: [(d.effects || []).filter(function (e) { return e.skill || e.stat; }).map(function (e) { return e.type === 'stat_set' ? 'Тело ' + e.value : '+' + e.amount + ' ' + (e.skill || 'Тело'); }).join(', '), d.text].filter(Boolean).join(' · '), price: d.price || 0, notForSale: d.kind === 'full' });
  });
  // ── Кассеты: копии в продаже, оригиналы MIL — только выдача ──
  CASSETTES.forEach(function (c) {
    const eff = (c.effects || []).filter(function (e) { return e.amount && (e.skill || e.stat); }).map(function (e) { return '+' + e.amount + ' ' + (e.skill || { telo: 'Тело', reak: 'Реакция', vosp: 'Восприятие', razum: 'Разум', har: 'Характер', volya: 'Воля' }[e.stat]); }).join(', ');
    items.push({ cat: 'cassette', gearKey: c.key, kind: c.origOnly ? 'orig' : 'copy', name: 'Кассета «' + c.name + '»' + (c.origOnly ? '' : ', копия'), desc: [c.cls + ' · ' + c.cap, eff, c.text].filter(Boolean).join(' · '), price: c.origOnly ? 0 : c.price, notForSale: !!c.origOnly });
  });
  /* Машины (глава 7, «Гараж») */
  VEHICLES.forEach(function (v) { items.push({ cat: 'vehicle', gearKey: v.key, name: v.name, price: v.price || 0, notForSale: v.price == null, desc: 'Корпус ' + v.hull + ', броня ' + (v.armorType === 'none' ? '—' : v.armorHp) + ', Скорость ' + v.speed + ', Упр. ' + (v.handling > 0 ? '+' : '') + v.handling + ', мест ' + v.seats + ', таран ' + v.ram + (v.note ? '. ' + v.note : '') }); });
  return items.map(function (i) { return Object.assign({ id: uid() }, i); });
}

export { buildShopDefaults, buildMiscDefaults };
