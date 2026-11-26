import React, { useRef, useState } from 'react';
import { gmBackup, gmRestore } from '../../firebase';

/* Резервная копия мира: скачать файл и восстановить из файла */
export default function BackupBox(pr) {
  const fileRef = useRef(null); const [msg, setMsg] = useState('');
  function download() {
    setMsg('Собираю копию…');
    gmBackup().then(function (r) {
      if (!r.ok) { setMsg(r.error || 'Не вышло'); return; }
      const d = new Date(); const pad = function (n) { return (n < 10 ? '0' : '') + n; };
      const name = 'za4ertoy-mir-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
      const blob = new Blob([JSON.stringify(r.data)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      setMsg('Скачано: ' + name);
    });
  }
  function upload(e) {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = function () {
      let data; try { data = JSON.parse(rd.result); } catch (x) { alert('Файл не читается — это не копия мира'); return; }
      if (!data || data.app !== 'zachertoy') { alert('Это не копия мира «За Чертой»'); return; }
      const when = data.ts ? new Date(data.ts).toLocaleString('ru-RU') : '?';
      const n = Object.keys(((data.tree || {}).rooms || {}).world ? data.tree.rooms.world.characters || {} : {}).length;
      if (!window.confirm('Восстановить мир из копии от ' + when + ' (персонажей: ' + n + ')?\nТекущий мир будет ЗАМЕНЁН. Сначала лучше скачать копию нынешнего.')) return;
      setMsg('Восстанавливаю…');
      gmRestore(data).then(function (r) { setMsg(r.ok ? 'Мир восстановлен из копии от ' + when : (r.error || 'Не вышло')); });
    };
    rd.readAsText(f);
  }
  return (
    <div className="sec">
      <h3>Резервная копия мира</h3>
      <p className="hint">Файл с персонажами, логами, бестиарием, машинами и аккаунтами игроков (пароли в нём зашифрованы). Храни его в надёжном месте. Через него же мир переносится между компьютером и VPS.</p>
      <div className="row">
        <button className="btn main" onClick={download}>Скачать копию</button>
        <button className="btn" onClick={function () { fileRef.current && fileRef.current.click(); }}>Восстановить из файла…</button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={upload} />
        {msg && <span className="hint">{msg}</span>}
      </div>
    </div>
  );
}
