var CSS = `
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:ital,wght@0,400;0,500;0,700;1,400&family=PT+Mono&family=Russo+One&display=swap");
:root{
  --desk:#1a1712; --paper:#ebe3d1; --paper2:#e2d8c3; --ink:#211d18; --muted:#6a6052; --line:#c6bba3;
  --tape:#e9b12b; --swamp:#4f5b2a; --rust:#8a3b22; --ok:#3f6b34; --bad:#8a3b22;
  --f-display:"Russo One","Arial Black",Impact,sans-serif;
  --f-body:"IBM Plex Sans Condensed","Arial Narrow","Roboto Condensed",sans-serif;
  --f-mono:"PT Mono","Courier New",monospace;
  
}
*{box-sizing:border-box}
button{font:inherit;cursor:pointer;color:var(--ink)}
body{margin:0;background:var(--desk);color:var(--ink);font-family:var(--f-body);font-size:15px;line-height:1.45}
[hidden]{display:none!important}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--tape);outline-offset:2px}
.app{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#cfc6b2;font-family:var(--f-mono);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;flex-wrap:wrap}
.topbar b{color:var(--tape);font-weight:400}
.topbar .tb{display:flex;gap:8px;flex-wrap:wrap}
.chip{border:1px solid #4a4236;background:transparent;color:#cfc6b2;padding:5px 10px;font-family:var(--f-mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.chip.on{background:var(--rust);border-color:var(--rust);color:var(--paper)}

/* dossier header */
.dossier{background:var(--paper);display:grid;grid-template-columns:150px 1fr;gap:16px;padding:14px;position:relative}
.portrait{width:150px;aspect-ratio:336/420;background:#2a251e center/cover no-repeat;border:3px solid var(--ink);position:relative;max-width:100%}
.portrait span{position:absolute;left:0;right:0;bottom:0;background:var(--ink);color:var(--tape);font-family:var(--f-mono);font-size:10.5px;letter-spacing:.1em;text-align:center;padding:3px 0}
.idblock{display:flex;flex-direction:column;gap:8px;min-width:0}
.nameRow{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.nameInput{font-family:var(--f-display);font-size:30px;text-transform:uppercase;background:transparent;border:none;border-bottom:2px dashed transparent;color:var(--ink);padding:0;width:min(100%,320px)}
.nameInput:hover{border-bottom-color:var(--line)}
.meta{font-family:var(--f-mono);font-size:11.5px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.badges{display:flex;gap:6px;flex-wrap:wrap}
.badge{font-family:var(--f-mono);font-size:10.5px;border:1px solid var(--ink);padding:1px 7px;text-transform:uppercase;letter-spacing:.06em}
.badge.dark{background:var(--ink);color:var(--paper)}
.badge.rust{border-color:var(--rust);color:var(--rust)}
.trackers{display:grid;grid-template-columns:2fr 1.4fr 1fr 1fr;gap:10px;margin-top:4px}
.trk{background:var(--paper2);border-top:3px solid var(--swamp);padding:7px 10px;display:flex;flex-direction:column;gap:5px;min-width:0}
.trk.hp{border-top-color:var(--rust)}
.trk .lbl{font-family:var(--f-mono);font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;display:flex;justify-content:space-between;gap:6px}
.trk .val{font-family:var(--f-display);font-size:22px;line-height:1;display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}
.trk .val small{font-family:var(--f-mono);font-size:12px;color:var(--muted)}
.pm{display:inline-flex;gap:4px;margin-left:auto}
.pm button{width:28px;height:26px;border:1px solid var(--ink);background:var(--paper);font-family:var(--f-mono);font-size:15px;line-height:1;padding:0}
.pm button:hover{background:var(--ink);color:var(--paper)}
.bar{height:8px;background:#cfc4ab;position:relative}
.bar i{position:absolute;left:0;top:0;bottom:0;background:var(--ok)}
.bar i.warn{background:var(--rust)}
.bar b{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink)}
.pips{display:flex;gap:3px}
.burnp{display:inline-flex;gap:2px;margin-left:6px;vertical-align:middle}.burnp i{width:7px;height:11px;border:1px solid var(--ink);background:var(--ink)}.burnp i.x{border-color:var(--rust);background:linear-gradient(to top right,transparent 42%,var(--rust) 42%,var(--rust) 58%,transparent 58%)}
.pips button{flex:1;height:16px;border:1px solid var(--ink);background:var(--paper);padding:0;min-width:0}
.pips button.on{background:var(--rust)}
.pips button.on.lo{background:#b7963d}
.state{font-size:12px;color:var(--rust);font-weight:700;min-height:1em}

/* tabs */
.tabs{display:flex;gap:2px;overflow-x:auto;background:var(--ink);padding:4px 4px 0}
.tabs button{flex:1 0 auto;background:transparent;border:none;color:#cfc6b2!important;font-family:var(--f-display);font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:9px 14px}
.tabs button[aria-selected="true"]{background:var(--paper);color:var(--ink)!important}
.panel{background:var(--paper);padding:16px;min-height:420px;display:flex;flex-direction:column;gap:14px}
h2{font-family:var(--f-display);font-weight:400;font-size:20px;text-transform:uppercase;margin:0;text-wrap:balance}
h3{font-family:var(--f-display);font-weight:400;font-size:14px;text-transform:uppercase;letter-spacing:.04em;margin:0}
.hint{font-size:13px;color:var(--muted);margin:0;max-width:72ch}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.slbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-family:var(--f-mono);font-size:11.5px}
.slbar button{border:1px solid var(--ink);background:var(--paper);padding:3px 9px;font-family:var(--f-mono);font-size:12px}
.slbar button.on{background:var(--ink);color:var(--tape)}
.zones button.on{color:var(--paper)}

/* stats & skills */
.statgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.stat{background:var(--paper2);border-top:4px solid var(--swamp);display:flex;flex-direction:column;min-width:0}
.stat .sh{display:flex;align-items:center;gap:10px;padding:8px 10px;border:none;background:transparent;text-align:left;width:100%}
.stat .sh:hover{background:#d8cdb4}
.stat .sv{font-family:var(--f-display);font-size:28px;line-height:1;width:34px;text-align:center}
.stat .sn{font-family:var(--f-display);font-size:14px;text-transform:uppercase;flex:1}
.stat .sn small{display:block;font-family:var(--f-mono);font-size:10px;color:var(--muted);text-transform:none;letter-spacing:0}
.skl{display:flex;flex-direction:column;border-top:1px dashed var(--line)}
.sk{display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;padding:5px 10px;border:none;background:transparent;text-align:left;width:100%;font-size:14px}
.sk:hover{background:#d8cdb4}
.sk .bon{font-family:var(--f-mono);font-size:10.5px;color:var(--swamp)}
.sk .tot{font-family:var(--f-mono);font-size:14px;min-width:46px;text-align:right;font-variant-numeric:tabular-nums}
.sk .tot em{font-style:normal;color:var(--muted);font-size:11px}
.dice-ico{width:14px;height:14px;display:inline-block;vertical-align:-2px}

/* cards & tables */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.card{border:2px solid var(--ink);display:flex;flex-direction:column;min-width:0;background:var(--paper)}
.card .ch{background:var(--ink);color:var(--paper);padding:7px 10px;display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap}
.card .ch b{font-family:var(--f-display);font-weight:400;font-size:15px;text-transform:uppercase}
.card .ch span{font-family:var(--f-mono);font-size:10.5px;color:var(--tape)}
.card .cb{padding:9px 10px;display:flex;flex-direction:column;gap:7px;font-size:13.5px;flex:1}
.card .cb p{margin:0}
.kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:13px}
.kv dt{font-family:var(--f-mono);font-size:10.5px;color:var(--swamp);text-transform:uppercase;letter-spacing:.06em;padding-top:2px}
.kv dd{margin:0}
.btn{border:2px solid var(--ink);background:var(--paper);padding:6px 12px;font-family:var(--f-display);font-size:12.5px;text-transform:uppercase;letter-spacing:.04em}
.btn:hover:not(:disabled){background:var(--ink);color:var(--paper)}
.btn.main{background:var(--ink);color:var(--tape)}
.btn.main:hover:not(:disabled){background:var(--rust);color:var(--paper);border-color:var(--rust)}
.btn.sm{padding:3px 8px;font-size:11px}
.btn:disabled{opacity:.45;cursor:not-allowed}
select,input[type=number],input[type=text]{font:inherit;font-size:14px;background:var(--paper);border:1px solid var(--ink);padding:4px 6px;color:var(--ink);border-radius:0}
.zones{display:flex;gap:4px;flex-wrap:wrap}
.zones button{border:1px solid var(--ink);background:var(--paper);padding:3px 8px;font-size:12.5px}
.zones button.on{background:var(--rust);color:var(--paper);border-color:var(--rust)}
.tw{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13.5px;font-variant-numeric:tabular-nums}
th{background:var(--ink);color:var(--paper);font-family:var(--f-display);font-weight:400;font-size:11px;letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:7px 8px}
td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
tr:nth-child(even) td{background:#e4dac6}
td.num{font-family:var(--f-mono);text-align:right;white-space:nowrap}
.warnbox{border-left:5px solid var(--rust);background:#efe2d6;padding:8px 12px;font-size:13.5px}
.tcards{display:flex;gap:8px;flex-wrap:wrap}
.tcard{width:150px;min-height:200px;border:2px solid var(--ink);background:#f3ead2;padding:8px;display:flex;flex-direction:column;gap:5px;box-shadow:3px 3px 0 var(--ink)}
.tcard .tnum{font-family:var(--f-mono);font-size:18px;color:var(--rust);text-align:center}
.tcard b{font-family:var(--f-head);text-transform:uppercase;text-align:center;font-size:14px}
.tcard .tm{font-size:12px;color:var(--muted);font-style:italic}
.tcard .tt{font-size:12.5px}
.tcard.outcome{background:#2a251e;color:#efe2c6}.tcard.outcome .tm{color:#cfc6b2}
.tcard.back{background:repeating-linear-gradient(45deg,#2a251e 0 8px,#3a3226 8px 16px);color:#efe2c6;align-items:center;justify-content:center;text-align:center}
.tcard.back .tnum{font-size:32px;color:#f0d79a}
.tshow{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:1001;display:flex;align-items:center;justify-content:center;animation:fadeIn .3s}
.tshow .tcard{width:260px;min-height:360px;transform:scale(1);font-size:15px}.tshow .tcard b{font-size:22px}.tshow .tcard .tnum{font-size:30px}.tshow .tcard .tt,.tshow .tcard .tm{font-size:15px}
.condbar{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.cond{display:inline-flex;align-items:center;gap:5px;border:1.5px solid var(--rust);background:#efe2d6;color:var(--ink);padding:2px 7px;font-size:12.5px;font-weight:600}
.cond b{color:var(--rust);font-size:13px}.cond.c-fire{border-color:#c45a1c;background:#f5dcc4}.cond.c-deaf,.cond.c-stun{border-color:#8a6200}
.cond button{border:1px solid currentColor;background:transparent;font-size:11px;padding:0 5px;cursor:pointer;color:inherit}
.condbar select{font-size:12px;padding:2px 4px}
.okbox{border-left:5px solid var(--swamp);background:#e5e4cc;padding:8px 12px;font-size:13.5px}

/* bracelet */
.bracelet{background:#d9cfb7;border:3px solid var(--ink);padding:12px;display:flex;flex-direction:column;gap:10px}
.bhead{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center}
.bscreen{background:#17201a;color:#9fd19a;font-family:var(--f-mono);padding:6px 12px;font-size:13px;letter-spacing:.06em;border:2px solid var(--ink)}
.nests{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.nest{background:#2a251e;color:#e8dfc8;min-height:118px;padding:8px;display:flex;flex-direction:column;gap:5px;border:2px solid var(--ink);position:relative;min-width:0}
.nest.empty{background:repeating-linear-gradient(135deg,#cfc4ab 0 8px,#d8cdb4 8px 16px);color:var(--muted);align-items:center;justify-content:center;font-family:var(--f-mono);font-size:11px;text-align:center}
.nest.limb{background:#4a3c2c}
.nest .n{font-family:var(--f-mono);font-size:10px;color:var(--tape)}
.nest b{font-family:var(--f-display);font-weight:400;font-size:13px;text-transform:uppercase;line-height:1.15}
.nest .t{font-family:var(--f-mono);font-size:10px;color:#bfb49c}
.nest .e{font-size:12px;line-height:1.3}
.nest .btn{margin-top:auto;background:transparent;color:#e8dfc8;border-color:#8c806a}
.nest .btn:hover:not(:disabled){background:var(--paper);color:var(--ink)}
.chipcass{display:inline-flex;align-items:center;gap:6px;font-family:var(--f-mono);font-size:10px;background:var(--ink);color:var(--tape);padding:1px 6px}
.kind{font-family:var(--f-mono);font-size:10px;padding:0 5px;border:1px solid currentColor}
.kind.copy{color:#d8a14a}.kind.orig{color:#9fd19a}.kind.slep{color:#e07a5a}
.imp{display:flex;gap:3px}
.imp i{width:12px;height:8px;border:1px solid #e07a5a;display:block}
.imp i.on{background:#e07a5a}

/* log & tray */
.log{display:flex;flex-direction:column;gap:6px;font-size:13.5px}
.logrow{display:grid;grid-template-columns:62px 1fr auto;gap:10px;align-items:baseline;border-bottom:1px solid var(--line);padding:5px 0}
.logrow .tm{font-family:var(--f-mono);font-size:11px;color:var(--muted)}
.logrow .tt{font-family:var(--f-display);font-size:16px;font-variant-numeric:tabular-nums}
.tray{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));width:340px;max-width:calc(100vw - 28px);background:var(--ink);color:var(--paper);border:2px solid var(--tape);box-shadow:0 14px 40px rgba(0,0,0,.6);padding:12px 14px;display:flex;flex-direction:column;gap:6px;z-index:20}
.tray .tl{font-family:var(--f-mono);font-size:11px;color:var(--tape);letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between;gap:10px}
.tray .tl button{background:transparent;border:none;color:#cfc6b2;font-size:16px;line-height:1;padding:0 2px}
.tray .big{display:flex;align-items:center;gap:14px}
.die{width:58px;height:58px;flex:none;background:var(--tape);color:var(--ink);font-family:var(--f-display);font-size:26px;display:flex;align-items:center;justify-content:center;clip-path:polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)}
.die.crit{background:#9fd19a}.die.fumb{background:#e07a5a}
@media (prefers-reduced-motion:no-preference){.die.spin{animation:spin .45s ease-out}@keyframes spin{from{transform:rotate(-200deg) scale(.6)}to{transform:none}}}
.tray .tot{font-family:var(--f-display);font-size:38px;line-height:1}
.tray .res{font-family:var(--f-display);font-size:14px;letter-spacing:.06em;text-transform:uppercase}
.tray .res.ok{color:#9fd19a}.tray .res.bad{color:#e07a5a}
.tray .parts{font-family:var(--f-mono);font-size:12px;color:#d6ccb8;line-height:1.5}
.tray .note{font-size:12.5px;color:#f0d79a;border-top:1px dashed #4a4236;padding-top:5px}
.foot{color:#8f8573;font-family:var(--f-mono);font-size:11px;text-align:center;letter-spacing:.06em}

@media (max-width:760px){
  .dossier{grid-template-columns:96px 1fr;gap:12px;padding:12px}
  .portrait{width:96px}
  .nameInput{font-size:22px}
  .trackers{grid-template-columns:1fr 1fr}
  .trk.hp{grid-column:1/-1}
  .dossier{grid-template-columns:84px 1fr}
  .portrait{width:84px}
  .statgrid{grid-template-columns:1fr}
  .nests{grid-template-columns:repeat(2,1fr)}
  .tray{left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));width:auto;max-width:none;bottom:max(10px,env(safe-area-inset-bottom,0px))}
  .panel{padding:12px}
  .tabs button{padding:9px 10px;font-size:12px}
}
/* ── Оболочка приложения ── */
html,body,#root{height:100%}
.zc-app{height:100vh;height:100dvh;width:100%;display:flex;flex-direction:column;overflow:hidden;background:var(--desk);color:var(--ink);font-family:var(--f-body)}
.zc-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;color:#cfc6b2;font-family:var(--f-mono);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;flex-shrink:0}
.zc-top b{color:var(--tape);font-weight:400}
.zc-main{flex:1;min-height:0;display:flex;flex-direction:column;width:100%;max-width:1180px;margin:0 auto}
.zc-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0 10px 14px;display:flex;flex-direction:column;gap:10px}
.zc-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
.zc-wide-only{display:block}
.pill{font-family:var(--f-mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--ink);padding:1px 7px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.ico{width:16px;height:16px;display:inline-block;vertical-align:-3px;flex:none}
.sec{background:var(--paper2);border-top:3px solid var(--swamp);padding:10px 12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.sec.rust{border-top-color:var(--rust)}
.mono{font-family:var(--f-mono)}
.lblm{font-family:var(--f-mono);font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase}
.gm-shell{flex:1;min-height:0;display:flex;width:100%}
.gm-nav{width:190px;flex-shrink:0;background:var(--ink);display:flex;flex-direction:column;padding:8px 6px;gap:2px;overflow-y:auto}
.gm-nav button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:9px 10px;border:none;background:transparent;color:#cfc6b2;font-family:var(--f-display);font-size:12px;letter-spacing:.05em;text-transform:uppercase}
.gm-nav button.on{background:var(--paper);color:var(--ink)}
.gm-body{flex:1;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding:12px;background:var(--paper)}
.gm-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.tabs button .ico{margin-right:6px}
@media (max-width:760px){
  .zc-two{grid-template-columns:1fr}
  .zc-wide-only{display:none!important}
  .zc-scroll{padding:0 6px 12px}
  .gm-shell{flex-direction:column}
  .gm-nav{width:100%;flex-direction:row;overflow-x:auto;overflow-y:hidden;padding:4px 4px 0;flex-shrink:0}
  .gm-nav button{flex:0 0 auto;width:auto;padding:8px 10px;font-size:11px}
  .gm-body{padding:8px}
  .gm-cards{grid-template-columns:1fr}
  .tabs button .ico{display:none}
}

/* ── Классы базы (n-*) в стиле книги ── */
:root{
  --color-bg:var(--paper); --color-surface:var(--paper2); --color-sunken:#f1ead9;
  --color-text:var(--ink); --color-text-muted:var(--muted);
  --color-accent:var(--rust); --color-accent-2:#b0633f; --color-divider:var(--line);
  --space-1:4px; --space-2:6px; --space-3:10px; --space-4:14px; --space-6:20px; --space-8:28px;
  --radius-sm:0; --radius-md:0; --radius-lg:0;
  --shadow-sm:none; --shadow-md:0 6px 18px rgba(0,0,0,.35); --shadow-lg:0 16px 40px rgba(0,0,0,.55);
}
input,textarea,select{color:var(--ink);font-family:inherit;max-width:100%}
textarea{font:inherit;font-size:14px;background:var(--paper);border:1px solid var(--ink);padding:6px;border-radius:0}
@keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes diceSpin{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(200deg) scale(1.12)}100%{transform:rotate(360deg) scale(1)}}
@keyframes critPop{0%{opacity:0;transform:scale(.8)}60%{transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}
@keyframes critFlash{from{opacity:1}to{opacity:0}}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-thumb{background:#8c806a}
.n-card{background:var(--paper2);border-top:3px solid var(--swamp);padding:10px 12px;min-width:0}
.n-field label{display:block;font-family:var(--f-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.n-input{width:100%;min-height:36px;padding:6px 8px;font:14px/1.3 var(--f-body);color:var(--ink);background:var(--paper);border:1px solid var(--ink);border-radius:0;outline:none}
.n-input::placeholder{color:#8c806a}
.n-input:focus{outline:2px solid var(--tape);outline-offset:1px}
.n-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:var(--f-display);font-size:12px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;padding:7px 12px;border:2px solid var(--ink);background:var(--paper);color:var(--ink);border-radius:0}
.n-btn:disabled{opacity:.45;cursor:not-allowed}
.n-btn:hover:not(:disabled){background:var(--ink);color:var(--paper)!important}
.n-btn-primary{background:var(--ink);color:var(--tape);border-color:var(--ink)}
.n-btn-primary:hover:not(:disabled){background:var(--rust);border-color:var(--rust);color:var(--paper)!important}
.n-btn-secondary{border-width:1px}
.n-btn-block{width:100%}
.n-tag{display:inline-flex;align-items:center;font-family:var(--f-mono);font-size:10.5px;padding:1px 7px;letter-spacing:.04em;border:1px solid currentColor}
.n-combat-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
@media (max-width:820px){.n-combat-grid{grid-template-columns:1fr}}
.n-msg{max-width:86%;padding:8px 11px;font-size:14px;line-height:1.45}
.n-msg-other{align-self:flex-start;background:var(--paper2);border-left:3px solid var(--swamp)}
.n-msg-self{align-self:flex-end;background:#e4dac6;border-right:3px solid var(--rust)}
.n-msg-who{display:block;font-family:var(--f-mono);font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:3px}
.n-roll-card{align-self:flex-start;max-width:86%;padding:8px 11px;border:1px solid var(--ink);background:var(--paper)}
`;

export { CSS };
