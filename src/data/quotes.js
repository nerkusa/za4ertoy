var QUOTES=[
"Дорога кормит того, кто по ней идёт.",
"За Чертой никто не спрашивает, кем ты был.",
"Плёнка помнит дольше, чем человек.",
"Железо не болит. Болит то, что осталось.",
"Синька лечит дозу, но не память.",
];
function randomQuote(){return QUOTES[Math.floor(Math.random()*QUOTES.length)]}

export { QUOTES, randomQuote };
