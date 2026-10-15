// Generated from the Direct view CSS of examples/dashboard.yaml (vh/vw -> cqh/cqw),
// then edited: this file is now the source of truth for the card.
import { css } from 'lit';

export const directStyles = css`
:host{display:block}
ha-card{overflow:hidden;border-radius:var(--ha-card-border-radius,12px);background:#020617}
/* The box is the size container: everything inside is sized in cqh/cqw, so the card
   looks the same full screen (panel view) and scaled down in a section (16:9). */
.rl-box{container-type:size;width:100%;aspect-ratio:16/9}
/* Full screen: the 16:9 board is letterboxed (tablet, 4:3 or portrait screen), so names,
   logos and scores keep the proportions they have on a TV instead of being squeezed. */
.rl-panelcard{min-height:calc(100vh - var(--header-height,56px));display:flex;align-items:center;justify-content:center}
.rl-box.rl-panel{width:min(100%,calc((100vh - var(--header-height,56px)) * 16 / 9))}
.rl-wrap{position:relative;height:100%;overflow:hidden;font-family:var(--ha-font-family-body,system-ui,sans-serif);
  background:radial-gradient(circle at 50% 30%,#1e293b,#020617);color:#fff;display:flex;flex-direction:column}
.rl-tick{height:5cqh;min-height:34px;background:#0b1220;border-bottom:3px solid #dc2626;overflow:hidden;
  white-space:nowrap;display:flex;align-items:center;font-size:2.4cqh}
.rl-tick-in{display:inline-block;padding-left:100%;animation:rl-marq linear infinite}
@keyframes rl-marq{from{transform:translateX(0)}to{transform:translateX(-100%)}}
.rl-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5cqh}
.rl-comp{font-size:2.4cqh;letter-spacing:.4em;color:#94a3b8}
.rl-row{display:flex;align-items:center;justify-content:center;gap:4cqw;width:100%}
.rl-team{display:flex;flex-direction:column;align-items:center;gap:1.5cqh;width:28cqw}
.rl-logo{height:24cqh;width:24cqh;object-fit:contain;filter:drop-shadow(0 6px 18px rgba(0,0,0,.7))}
.rl-init{height:24cqh;width:24cqh;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:8cqh;font-weight:900}
.rl-name{font-size:4cqh;font-weight:800;text-align:center;text-transform:uppercase}
.rl-score{font-size:18cqh;font-weight:900;font-variant-numeric:tabular-nums;line-height:1;white-space:nowrap}
.rl-state{font-size:3.2cqh;font-weight:700}
.rl-live{background:#dc2626;border-radius:999px;padding:.4cqh 1.6cqh;margin-right:1.2cqh;animation:rl-pulse 1.4s infinite}
@keyframes rl-pulse{50%{opacity:.45}}
.rl-last{font-size:3cqh;color:#cbd5e1}
.rl-chan{font-size:2.4cqh;color:#4ade80;font-weight:700}
.rl-wm{position:absolute;inset:0;margin:auto;height:72cqh;max-width:80cqw;object-fit:contain;opacity:.06;filter:grayscale(1) brightness(2);pointer-events:none;z-index:0}
.rl-tick,.rl-main{position:relative;z-index:1}
.rl-prov{color:#fde68a}
.rl-bar{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:2cqw;min-height:7cqh;padding:1cqh 2cqw;background:rgba(2,6,23,.85);border-top:3px solid #c8102e;font-size:2.4cqh}
.rl-bar img{height:4.5cqh;width:4.5cqh;object-fit:contain}
.rl-bar small{color:#94a3b8;letter-spacing:.3em;font-size:1.6cqh}
.rl-bar b{font-size:2.8cqh}
.rl-provtag{font-size:1.8cqh;color:#fbbf24;letter-spacing:.2em}
.rl-sb{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto minmax(0,1fr);grid-template-rows:20cqh auto;row-gap:2.5cqh;align-items:center;width:98cqw;margin-top:3cqh}
.rl-sbt{position:relative;z-index:0;height:100%;display:flex;align-items:center;gap:1.5cqw;padding:0 1.5cqw;font-size:3.4cqh;font-weight:900;text-transform:uppercase;letter-spacing:.02em;min-width:0}
.rl-sbt::before{content:'';position:absolute;inset:0;z-index:-1}
.rl-sbh::before{background:linear-gradient(90deg,transparent,var(--hc) 35%);clip-path:polygon(5% 0,100% 0,100% 100%,0 100%)}
.rl-sba::before{background:linear-gradient(270deg,transparent,var(--ac) 35%);clip-path:polygon(0 0,95% 0,100% 100%,0 100%)}
.rl-sbt span{flex:1;min-width:0;overflow:hidden;line-height:1.1;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;text-shadow:0 3px 0 rgba(0,0,0,.5)}
.rl-sbh span{text-align:right}
.rl-sbt.rl-dark span{color:#0b1220;text-shadow:none}
.rl-sbt img{flex:none;height:23cqh;width:23cqh;object-fit:contain;filter:drop-shadow(0 1cqh 2cqh rgba(0,0,0,.6))}
.rl-sbt .rl-init{flex:none;height:18cqh;width:18cqh;font-size:6cqh}
.rl-sbs{height:100%;min-width:15cqh;padding:0 2cqh;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#0b1220;font-size:14cqh;font-weight:900;font-variant-numeric:tabular-nums;line-height:1}
.rl-sbsh{box-shadow:inset 0 1cqh 0 var(--hc)}.rl-sbsa{box-shadow:inset 0 1cqh 0 var(--ac)}
.rl-clock{height:100%;min-width:18cqh;padding:0 2cqh;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1cqh;background:#f8fafc;color:#0f172a}
.rl-clock b{font-size:6.5cqh;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}
.rl-clock small{font-size:2.2cqh;font-weight:800;letter-spacing:.2em;color:#475569}
.rl-clock .rl-live{font-size:1.8cqh;color:#fff;margin:0}
.rl-bump{animation:rl-bump 1.4s ease}
@keyframes rl-bump{20%{transform:scale(1.35);color:#fde047}40%{transform:scale(.95)}60%{transform:scale(1.15);color:#fde047}}
.rl-sbd{display:flex;flex-direction:column;gap:1.4cqh;font-size:2.8cqh;color:#cbd5e1;padding:0 1.5cqw}
.rl-sbd>div{display:flex;flex-wrap:wrap;gap:.6cqh 1.5cqw}
.rl-sbd b{color:#fff;font-size:3.4cqh}
.rl-sbdh{grid-column:1;align-items:flex-end}.rl-sbdh>div{justify-content:flex-end}.rl-sbda{grid-column:5;align-items:flex-start}
.rl-bon{padding:.5cqh 1.4cqh;border-radius:.8cqh;background:#fbbf24;color:#111;font-size:2cqh;font-weight:900;letter-spacing:.12em;white-space:nowrap}
.rl-bon.rl-on{background:transparent;color:#fbbf24;outline:2px dashed #fbbf24;outline-offset:-2px}
.rl-next{margin-top:2cqh;padding:1.6cqh 3cqh;border:1px solid #334155;border-radius:2cqh;background:rgba(15,23,42,.7);text-align:center;font-size:2.8cqh}
.rl-next b{color:#fff}.rl-next small{display:block;color:#94a3b8;letter-spacing:.3em;font-size:1.8cqh}
.rl-ov{--t0:0s;position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  overflow:hidden;background:radial-gradient(circle,var(--c) 0%,rgba(0,0,0,.94) 72%);
  animation:rl-ov 20s linear forwards;z-index:5}
.rl-ov.rl-iscard{--t0:1.3s}
@keyframes rl-ov{0%{opacity:0;transform:scale(1.3)}3%{opacity:1;transform:scale(1)}95%{opacity:1}
  100%{opacity:0;visibility:hidden}}
.rl-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rl-burst{position:absolute;width:160cqmax;height:160cqmax;
  background:repeating-conic-gradient(rgba(255,255,255,.13) 0deg 8deg,transparent 8deg 22deg);
  animation:rl-spin 20s linear;animation-delay:calc(0s - var(--age))}
@keyframes rl-spin{to{transform:rotate(400deg)}}
.rl-rays2{position:absolute;width:160cqmax;height:160cqmax;opacity:.45;
  background:repeating-conic-gradient(rgba(255,255,255,.25) 0deg 3deg,transparent 3deg 17deg);
  background:repeating-conic-gradient(color-mix(in srgb,var(--c) 60%,#fff) 0deg 3deg,transparent 3deg 17deg);
  animation:rl-spin2 26s linear infinite;animation-delay:calc(0s - var(--age))}
@keyframes rl-spin2{to{transform:rotate(-360deg)}}
.rl-ring{position:absolute;inset:0;margin:auto;width:30cqmin;height:30cqmin;border-radius:50%;
  border:.8cqmin solid rgba(255,255,255,.75);box-shadow:0 0 4cqmin var(--c),inset 0 0 4cqmin var(--c);
  animation:rl-ring 2.4s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes rl-ring{from{transform:scale(.1);opacity:1}to{transform:scale(5);opacity:0}}
.rl-beam{position:absolute;bottom:-5cqh;width:22cqw;height:130cqh;transform-origin:50% 100%;
  background:linear-gradient(to top,rgba(255,255,255,.4),rgba(255,255,255,0) 85%);
  clip-path:polygon(42% 100%,58% 100%,100% 0,0 0);
  animation:rl-beam 3.2s ease-in-out infinite alternate;animation-delay:calc(0s - var(--age))}
.rl-beam.rl-l{left:2cqw}.rl-beam.rl-r{right:2cqw;animation-name:rl-beam-r}
@keyframes rl-beam{from{transform:rotate(-35deg)}to{transform:rotate(25deg)}}
@keyframes rl-beam-r{from{transform:rotate(35deg)}to{transform:rotate(-25deg)}}
.rl-cf{position:absolute;top:0;height:1.4cqw;border-radius:2px;z-index:2;animation:rl-fall 4s linear infinite}
@keyframes rl-fall{from{transform:translateY(-8cqh) rotate(0) rotateX(0)}
  to{transform:translateY(108cqh) rotate(540deg) rotateX(720deg)}}
.rl-strobe{position:absolute;inset:0;background:radial-gradient(circle,transparent 25%,var(--c) 110%);
  animation:rl-strobe .9s ease-in-out infinite alternate;animation-delay:calc(0s - var(--age))}
@keyframes rl-strobe{from{opacity:.15}to{opacity:.75}}
.rl-whistle{position:absolute;width:46cqh;z-index:3;filter:drop-shadow(0 1cqh 2cqh rgba(0,0,0,.7));
  animation:rl-whistle 1.5s ease both;animation-delay:calc(0s - var(--age))}
@keyframes rl-whistle{0%{opacity:0;transform:scale(0) rotate(-40deg)}14%{opacity:1;transform:scale(1.15) rotate(8deg)}
  24%,44%,64%{transform:scale(1) rotate(-7deg)}34%,54%,74%{transform:scale(1.06) rotate(7deg)}
  85%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.8)}}
.rl-wave{animation:rl-wave .45s ease-in-out infinite}
@keyframes rl-wave{0%,100%{opacity:0}50%{opacity:1}}
.rl-ovlogo{position:relative;height:26cqh;animation:rl-pop 1s ease both;animation-delay:calc(var(--t0) - var(--age))}
@keyframes rl-pop{0%{transform:scale(0) rotate(-200deg)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
.rl-ovtxt{position:relative;white-space:nowrap;font-weight:900;letter-spacing:.04em;text-align:center;
  font-size:min(17cqh,calc(84cqw / var(--n) / .72));text-shadow:0 0 40px var(--c),0 8px 0 #000;
  animation:rl-fade .4s ease both,rl-shake .45s ease 6,rl-beat 1.2s ease infinite;
  animation-delay:calc(var(--t0) - var(--age)),calc(var(--t0) - var(--age)),calc(var(--t0) + 2.7s - var(--age))}
@keyframes rl-beat{50%{transform:scale(1.06)}}
@keyframes rl-shake{25%{transform:rotate(-3deg) scale(1.08)}75%{transform:rotate(3deg) scale(1.08)}}
@keyframes rl-fade{from{opacity:0;transform:translateY(2cqh)}}
.rl-ovsub{position:relative;font-size:4.5cqh;font-weight:800;margin-top:2cqh;text-shadow:0 3px 0 #000;
  animation:rl-fade .5s ease both;animation-delay:calc(var(--t0) + .6s - var(--age))}
.rl-ov.rl-hasph{flex-direction:row;justify-content:center;gap:2cqw}
.rl-phw{position:relative;align-self:flex-end;margin-bottom:-2cqh}
.rl-ph{display:block;height:92cqh;filter:drop-shadow(0 0 3cqh var(--c)) drop-shadow(0 2cqh 3cqh rgba(0,0,0,.85));
  animation:rl-in 1s cubic-bezier(.2,.9,.3,1.15) both;animation-delay:calc(var(--t0) + .25s - var(--age))}
@keyframes rl-in{0%{opacity:0;transform:translateX(-35cqw) scale(.85)}100%{opacity:1;transform:none}}
.rl-col{position:relative;display:flex;flex-direction:column;align-items:flex-start;max-width:52cqw}
.rl-hasph .rl-ovlogo{height:15cqh}
.rl-hasph .rl-ovtxt{font-size:min(14cqh,calc(46cqw / var(--n) / .72));text-align:left;transform-origin:left center}
.rl-band{position:relative;margin-top:2cqh;padding:1.2cqh 5cqh 1.2cqh 3cqh;background:var(--c);color:var(--fg);white-space:nowrap;
  font-size:min(6cqh,calc(44cqw / var(--n) / .7));font-weight:900;text-transform:uppercase;letter-spacing:.02em;
  clip-path:polygon(0 0,100% 0,94% 100%,0 100%);
  animation:rl-band .7s ease both;animation-delay:calc(var(--t0) + .9s - var(--age))}
@keyframes rl-band{from{clip-path:polygon(0 0,0 0,0 100%,0 100%)}}
.rl-hasph .rl-ovsub{margin-top:1.5cqh;animation-delay:calc(var(--t0) + 1.4s - var(--age))}
.rl-card{position:relative;width:20cqh;height:28cqh;margin-bottom:3cqh;border-radius:1.4cqh;
  border:.5cqh solid rgba(255,255,255,.35);overflow:hidden;background:var(--c);
  background:linear-gradient(150deg,color-mix(in srgb,var(--c) 55%,#fff),var(--c) 45%,color-mix(in srgb,var(--c) 70%,#000));
  box-shadow:0 0 5cqh var(--c),0 2cqh 4cqh rgba(0,0,0,.6);
  animation:rl-card-in .8s cubic-bezier(.2,1.3,.4,1) both,rl-card-glow 1s ease-in-out infinite alternate;
  animation-delay:calc(var(--t0) + .6s - var(--age)),calc(var(--t0) + 1.4s - var(--age))}
.rl-card::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.5) 45%,transparent 55%)}
.rl-phw .rl-card{position:absolute;top:3cqh;right:2cqh;margin:0}
@keyframes rl-card-in{from{opacity:0;transform:translate(30cqw,-70cqh) rotate(-80deg) rotateY(180deg) scale(1.8)}
  to{opacity:1;transform:rotate(12deg)}}
@keyframes rl-card-glow{from{transform:rotate(12deg)}
  to{transform:rotate(12deg) scale(1.05);box-shadow:0 0 10cqh 2cqh var(--c),0 2cqh 4cqh rgba(0,0,0,.6)}}
/* .rl-calm: the card honours the device "reduce motion" setting (option force_motion off). */
@media (prefers-reduced-motion:reduce){.rl-calm :is(.rl-tick-in,.rl-live,.rl-bump,.rl-burst,.rl-rays2,.rl-ovtxt,
  .rl-ovlogo,.rl-ph,.rl-band,.rl-beam,.rl-card,.rl-strobe,.rl-ovsub){animation:none}
  .rl-calm :is(.rl-ring,.rl-cf,.rl-whistle){display:none}}
`;
