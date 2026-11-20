import React, { useEffect, useRef, useState } from 'react';
import { cardById } from '../data/tarot';
import { TarotCard } from './SignsStrip';

/* «Показать всем»: карта крупно у всех на 10 секунд (п.14.3) */
export default function TarotShow(pr) {
  const v = pr.value; const [shown, setShown] = useState(null); const first = useRef(true); const last = useRef(null);
  useEffect(function () {
    const ts = v && v.ts;
    if (first.current) { first.current = false; last.current = ts; if (!ts || Date.now() - ts > 10000) return; }
    else if (!ts || ts === last.current) return;
    last.current = ts; setShown(v.cardId);
    const t = setTimeout(function () { setShown(null); }, 10000);
    return function () { clearTimeout(t); };
  }, [v && v.ts]);
  if (shown == null) return null;
  const card = cardById(shown); if (!card) return null;
  return <div className="tshow" onClick={function () { setShown(null); }}><TarotCard card={card} /></div>;
}
