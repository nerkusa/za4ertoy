import React from 'react';

/* Простые линейные иконки в стиле книги — вместо эмодзи. */
function I(d,extra){return function(pr){var s=(pr&&pr.size)||16;return <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" style={pr&&pr.style}>{d.map(function(p,i){return <path key={i} d={p}/>})}{extra||null}</svg>}}

var IconChar=I(["M4 21v-3l4-3h8l4 3v3","M8 4h8v7H8z"]);
var IconBattle=I(["M4 4l11 11","M4 4v4","M4 4h4","M13 17l4-4","M16 16l4 4"]);
var IconInv=I(["M4 8h16v12H4z","M8 8V4h8v4","M4 13h16"]);
var IconLib=I(["M5 3h14v18H5z","M9 3v18","M12 8h4","M12 12h4"]);
var IconParty=I(["M3 21v-3l3-2h6l3 2v3","M6 5h6v6H6z","M16 8h4v5h-4z","M17 16l4 2v3"]);
var IconChat=I(["M3 4h18v12H9l-5 5v-5H3z"]);
var IconScroll=I(["M6 3h12v18H6z","M9 8h6","M9 12h6","M9 16h4"]);
var IconSkills=I(["M4 20V10","M10 20V4","M16 20v-7","M22 20H2"]);
var IconBracelet=I(["M5 7h14v10H5z","M9 7V3h6v4","M9 17v4h6v-4","M9 11h6","M9 14h3"]);
var IconBody=I(["M9 3h6v5H9z","M6 10h12v6h-3v5H9v-5H6z"]);
var IconSkull=I(["M5 11a7 7 0 0 1 14 0v5h-3v4H8v-4H5z","M9 12h1","M14 12h1"]);
var IconShield=I(["M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"]);
var IconGear=I(["M12 8h0a4 4 0 0 1 0 8a4 4 0 0 1 0-8","M12 2v4","M12 18v4","M2 12h4","M18 12h4","M5 5l3 3","M16 16l3 3","M19 5l-3 3","M8 16l-3 3"]);
var IconShop=I(["M3 9l2-5h14l2 5","M4 9v11h16V9","M9 20v-6h6v6"]);
var IconHistory=I(["M12 7v6l4 2","M4 12a8 8 0 1 0 3-6","M3 4v4h4"]);
var IconGive=I(["M12 4v12","M7 11l5 5 5-5","M4 20h16"]);
var IconCar=I(["M3 15h18v-4l-3-5H6l-3 5z","M3 15v3h3v-3","M18 15v3h3v-3","M7 13h2","M15 13h2"]);
var IconFlag=I(["M5 21V3","M5 4h12l-3 4 3 4H5"]);
var IconMap=I(["M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z","M9 4v14","M15 6v14"]);

/* d10 — силуэт десятигранника с ребром посередине */
var IconD10=function(pr){var s=(pr&&pr.size)||16;var st=(pr&&pr.style)||{};return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" style={st}><path d="M12 2 L20 8.5 L15.5 21 L8.5 21 L4 8.5 Z"/><path d="M4 8.5 L20 8.5"/></svg>};

export { IconCar, IconFlag, IconChar, IconBattle, IconInv, IconLib, IconParty, IconChat, IconScroll, IconD10, IconSkills, IconBracelet, IconBody, IconSkull, IconShield, IconGear, IconShop, IconHistory, IconGive, IconMap };
