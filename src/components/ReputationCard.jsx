import React from 'react';
import { FACTIONS, REP_LABEL } from '../data/factions';

/* «Репутация» на листе игрока: отношение партии к фракциям (ставит мастер) */
function ReputationCard(pr){
  var st=pr.factions||{};
  return <div className="sec">
    <h3>Репутация</h3>
    <p className="hint">Как к партии относятся фракции за трактом. Ставит мастер.</p>
    <div className="log">{FACTIONS.map(function(f){var rep=(st[f.id]&&st[f.id].rep)||0;
      return <div key={f.id} className="logrow" style={{gridTemplateColumns:"1fr auto"}}><span><b>{f.name}</b>{rep<=-3?<span className="hint">{" · нападают сразу"}</span>:null}{rep>=3?<span className="hint">{" · можно торговать по их ценам"+(f.trade?": "+f.trade:"")}</span>:null}</span>
        <span className="mono" style={{color:rep<0?"var(--rust)":rep>0?"var(--ok)":"var(--muted)"}}>{(rep>0?"+":"")+rep+" "+REP_LABEL[String(rep)]}</span></div>})}</div>
  </div>;
}
export default ReputationCard;
