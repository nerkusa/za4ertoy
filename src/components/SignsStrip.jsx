import React from 'react';
import { cardById, skillsText } from '../data/tarot';
import { freshRoll, signFits, rerollTotal, burnSign, MAX_SIGNS } from '../utils/signs';
import { rollHit } from '../utils/dice';

/* Одна карта Таро: номер, название, текст. back — рубашка. */
function TarotCard(pr){
  if(pr.back)return <div className="tcard back"><span className="tnum">✶</span><b>Твоя карта</b><span className="tt">Мастер откроет её в финале</span></div>;
  var cd=pr.card;if(!cd)return null;
  return <div className={"tcard"+(cd.kind==="outcome"?" outcome":"")}><span className="tnum">{cd.num}</span><b>{cd.name}</b><span className="tm">{cd.meaning}</span>{pr.showSign!==false&&<span className="tt">{cd.kind==="outcome"?"Карта исхода":cd.sign}</span>}{pr.children}</div>;
}

/* Знаки и карта героя на листе (п.14.2, 14.4) */
function SignsStrip(pr){
  var c=pr.char;var signs=c.signs||[];var gm=!!pr.isGM;
  var roll=freshRoll(c,pr.initiative);
  var hero=c.heroCard;var heroCard=hero&&hero.cardId!=null?cardById(hero.cardId):null;
  if(!signs.length&&!hero&&!pr.always)return null;
  function log(e){if(pr.addLog)pr.addLog(Object.assign({who:c.name||"???",total:0,detail:""},e))}
  function use(i){
    var card=cardById(signs[i].cardId);if(!card)return;
    var patch=burnSign(c,i);
    if(card.skills.length){
      if(!roll||!signFits(card,roll)){alert("Знак «"+card.name+"» — только сразу после броска: "+skillsText(card));return}
      var R=rollHit();var nt=rerollTotal(roll,R.d);
      patch.lastRoll=Object.assign({},roll,{used:true,d:R.d,total:nt});
      pr.save(Object.assign({},c,patch));
      log({type:"skill",label:"Знак «"+card.name+"»: переброс «"+(roll.label||roll.skill||"броска")+"», было "+roll.total+", стало "+nt,total:nt});
      if(pr.onRoll)pr.onRoll({label:"Знак «"+card.name+"»",d10:R.d,crit:R.crit,fumble:R.fumble,parts:[{label:"без кубика",value:(roll.total||0)-(roll.d||0)}],total:nt,subtext:"Было "+roll.total+(card.id===10?" · второй результат обязателен":"")});
    } else {
      pr.save(Object.assign({},c,patch));
      log({type:"gear",label:"Знак «"+card.name+"» использован",detail:card.sign});
    }
    setTimeout(function(){log({type:"gear",label:"Знак «"+card.name+"» сгорел"})},10);
  }
  return(<div className="sec">
    <div className="row" style={{justifyContent:"space-between"}}><h3>{"Знаки "+signs.length+"/"+MAX_SIGNS}</h3>{roll&&<span className="hint" style={{fontSize:12}}>{"последний бросок: "+(roll.label||roll.skill||"—")+" = "+roll.total}</span>}</div>
    <div className="tcards">
      {signs.map(function(s,i){var card=cardById(s.cardId);if(!card)return null;var fits=!card.skills.length||signFits(card,roll);
        return <TarotCard key={i} card={card}>{card.skills.length>0&&<span className="tm">{"Переброс: "+skillsText(card)}</span>}
          <button className="btn sm" disabled={!fits} title={fits?"":"Только сразу после броска: "+skillsText(card)} onClick={function(){use(i)}}>{card.skills.length?"Переброс":"Использовать"}</button>
          {gm&&<button className="btn sm" onClick={function(){pr.save(Object.assign({},c,burnSign(c,i)))}}>Забрать</button>}
        </TarotCard>})}
      {hero&&(gm||hero.revealed)&&heroCard&&<TarotCard card={heroCard} showSign={false}><span className="tt">{"Карта героя"+(gm&&!hero.revealed?" · скрыта от игрока":"")}</span></TarotCard>}
      {hero&&!gm&&!hero.revealed&&<TarotCard back={true}/>}
    </div>
    {!signs.length&&<p className="hint">Знаков нет. Их выдаёт мастер.</p>}
  </div>);
}
export { TarotCard };
export default SignsStrip;
