/* Состояния в бою. turns — сколько своих ходов длится (null — пока не
   снимут). effects — те же эффекты, что у критов и болезней: попадают в
   броски сами. Источник — описания оружия и тварей (п.18–19 ТЗ v4). */
var CONDITIONS=[
  {key:"net",name:"Опутан",icon:"⌗",turns:null,effects:[{type:"attack_bonus",amount:-4},{type:"skill_bonus",skill:"Уклонение",amount:-4}],
    text:"−4 к атаке и Уклонению. Выпутаться: Атлетика СЛ 14 (сеть «Невод»).",escape:{stat:"telo",skill:"Атлетика",dc:14}},
  {key:"deaf",name:"Оглох",icon:"◎",turns:2,effects:[{type:"all_roll",amount:-2}],text:"−2 ко всему на 2 хода (шумовая граната «Звонок»)."},
  {key:"fire",name:"Горит",icon:"♨",turns:null,dot:"1d6",effects:[],text:"1d6 урона в начале каждого своего хода, пока не потушат."},
  {key:"stun",name:"Без действий",icon:"✕",turns:1,skip:true,effects:[],text:"Пропускает следующий ход (громкий звук, удар, разбег)."},
  {key:"swarm",name:"Искусан роем",icon:"⁂",turns:null,untilRest:true,effects:[{type:"all_roll",amount:-1}],text:"−1 ко всему до отдыха (Мошкара; провал Тела СЛ 12)."},
  {key:"down",name:"Сбит с ног",icon:"↧",turns:1,effects:[{type:"skill_bonus",skill:"Уклонение",amount:-2}],text:"−2 к Уклонению, пока не поднимется (свой ход)."}
];
function condByKey(k){return CONDITIONS.find(function(c){return c.key===k})||null}
export { CONDITIONS, condByKey };
