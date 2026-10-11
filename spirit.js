// Spirit creatures: layered SVG puppets shared by the game, style tests and showcase.
// SPIRIT.fox(variant) / SPIRIT.owl(variant) return an <svg class="echo-svg sp ..."> string.
// data-expr on the root picks a face (13 Overhaul expressions + legacy + 'silly').
// Motion: SPIRIT.motion(svgEl,'walk'|'pounce'|'swish'|'flap'|'hop'|'swivel'|'bounce'|'curl',ms).
// Reduced effects: <html class="lowfx">, chosen automatically (low-end / reduced-motion / low FPS) or by SPIRIT.fx.set().
(function(){
const W=window;
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hx=c=>c.replace('#','').match(/../g).map(x=>parseInt(x,16));
const mix=(a,b,t)=>'#'+hx(a).map((v,i)=>Math.round(v+(hx(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
let GRAIN='';function grain(){if(GRAIN)return GRAIN;try{const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d'),d=x.createImageData(96,96),r=rng(7);for(let i=0;i<d.data.length;i+=4){const v=r()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0);GRAIN=c.toDataURL()}catch(e){GRAIN='data:,'}return GRAIN}
const FOXPAL=[{n:'teal-violet',f:['#5fe3d0','#2fa6c8','#6a4fd0'],g:'#a8fff4',e:'#2ad0c0'},{n:'violet-rose',f:['#c9a0ff','#9a5ae0','#e0609a'],g:'#ffd0ff',e:'#b45af0'},
  {n:'gold-rose',f:['#ffe08a','#f2a24a','#d8508a'],g:'#fff4b0',e:'#f0a020'},{n:'rose-sapphire',f:['#ffb0cf','#e0609a','#4a6ae0'],g:'#ffe0f2',e:'#e0508a'},
  {n:'teal-gold',f:['#a8f0c0','#2fbf9a','#c8901a'],g:'#f4ffb8',e:'#20b088'}];
const OWLPAL=[{n:'midnight-violet',f:['#b8b0ff','#6a5ad8','#2a2a7a'],g:'#e0e8ff',e:'#ffc840'},{n:'sapphire-teal',f:['#a8e8ff','#3a8ad8','#1f4a8a'],g:'#d8fff8',e:'#ffb030'},
  {n:'plum-rose',f:['#f0b8e8','#a050b0','#4a2a6a'],g:'#ffe0f4',e:'#ffd060'},{n:'aurora',f:['#b8ffd8','#40b0a8','#3a3a8a'],g:'#e8fff0',e:'#f8a030'},
  {n:'dusk-gold',f:['#ffe0a8','#d08a5a','#5a3a7a'],g:'#fff4d0',e:'#60d0ff'}];
function variant(kind,seed){const r=rng((seed>>>0)||1),pick=a=>a[Math.floor(r()*a.length)],span=(a,b)=>a+(b-a)*r();
  if(kind==='owl')return {kind,seed,pal:pick(OWLPAL),mark:pick(['stars','constellation','moonbands']),moongem:r()<.55,crest:pick(['tufts','plume','none']),accent:pick(['leaf','flower','none']),
    head:span(.95,1.07),body:span(.93,1.08),wing:span(.9,1.12),eyeSize:span(.95,1.08)};
  return {kind,seed,pal:pick(FOXPAL),rune:pick(['swirl','chevron','dots']),horns:r()<.5,gem:r()<.5,accent:pick(['leaf','flower','none']),
    ear:span(.88,1.16),tail:span(.88,1.15),head:span(.96,1.06),leg:span(.92,1.1),body:span(.92,1.06),eyeSize:span(.95,1.08)}}
const describe=v=>v.kind==='owl'?[v.pal.n,v.mark,v.moongem&&'moon gem',v.crest!=='none'&&v.crest+' crest',v.accent!=='none'&&v.accent].filter(Boolean).join(' · ')
  :[v.pal.n,v.rune+' runes',v.horns&&'crystal horns',v.gem&&'forehead gem',v.accent!=='none'&&v.accent].filter(Boolean).join(' · ');
const star=(x,y,s,f)=>`<path d="M${x} ${y-s} Q${x+s*.18} ${y-s*.18} ${x+s} ${y} Q${x+s*.18} ${y+s*.18} ${x} ${y+s} Q${x-s*.18} ${y+s*.18} ${x-s} ${y} Q${x-s*.18} ${y-s*.18} ${x} ${y-s}Z" fill="${f}"/>`;
const S=(cx,cy,s)=>`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`,SX=(cx,cy,sx,sy)=>`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`;
const L=(d,c,w,cls,op)=>`<path class="${cls||''}" d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${op!=null?` opacity="${op}"`:''}/>`;
// ---- shared face: eyes, brows, mouths, extras. ex=centre-x of eyes, ey=eye y, R=eye radius, my=mouth y
function face(o){const {id,ink,lidFill,R,ex1,ex2,ey,my,bx}=o;
  const eye=(cx,side)=>`<g class="sp-eye sp-eye${side}">
    <g class="fp p-eye-open p-eye${side}-open"><g class="sp-eyeball"><ellipse cx="${cx}" cy="${ey}" rx="${R}" ry="${R*1.1}" fill="#fffaff" stroke="${ink}" stroke-width="2.6"/>
     <g class="sp-pupils"><ellipse cx="${cx}" cy="${ey+2}" rx="${R*.8}" ry="${R*.9}" fill="url(#iris${id})"/><ellipse class="sp-pupil" cx="${cx}" cy="${ey+3}" rx="${R*.44}" ry="${R*.54}" fill="#140a24"/>
      ${star(cx-R*.32,ey-R*.36,R*.34,'#fff')}<circle cx="${cx+R*.34}" cy="${ey+R*.3}" r="${R*.12}" fill="#fff"/>${star(cx+R*.2,ey-R*.52,R*.12,'#fff')}</g>
     <rect class="fp p-half sp-halflid" x="${cx-R-2}" y="${ey-R*1.25}" width="${2*R+4}" height="${R*1.05}" fill="${lidFill}"/><path class="fp p-half" d="M${cx-R} ${ey-R*.2} Q${cx} ${ey-R*.32} ${cx+R} ${ey-R*.2}" stroke="${ink}" stroke-width="2.6" fill="none"/>
     <rect class="sp-lid" x="${cx-R-2}" y="${ey-R*1.2}" width="${2*R+4}" height="${R*2.3}" fill="${lidFill}"/></g></g>
    ${L(`M${cx-R} ${ey+4} Q${cx} ${ey-16} ${cx+R} ${ey+4}`,ink,4.2,`fp p-eye-happy p-eye${side}-happy`)}
    ${L(`M${cx-R} ${ey+2} Q${cx} ${ey+12} ${cx+R} ${ey+2}`,ink,4.2,'fp p-eye-sleepy')}</g>`;
  const b=(l,r,cls)=>`<g class="fp ${cls}">${L(l,ink,3)}${L(r,ink,3)}</g>`,y=ey-30,a=ex1,c=ex2;
  return eye(ex1,'L')+eye(ex2,'R')
   +b(`M${a-16} ${y+2} Q${a-2} ${y-5} ${a+12} ${y}`,`M${c-12} ${y} Q${c+2} ${y-5} ${c+16} ${y+2}`,'p-b-n')
   +b(`M${a-16} ${y-6} Q${a-2} ${y-15} ${a+12} ${y-9}`,`M${c-12} ${y-9} Q${c+2} ${y-15} ${c+16} ${y-6}`,'p-b-up')
   +b(`M${a-16} ${y-6} Q${a-2} ${y-15} ${a+12} ${y-9}`,`M${c-12} ${y} Q${c+2} ${y-5} ${c+16} ${y+2}`,'p-b-curious')
   +b(`M${a-14} ${y+2} Q${a} ${y-2} ${a+12} ${y-6}`,`M${c-12} ${y-6} Q${c} ${y-2} ${c+14} ${y+2}`,'p-b-sad')
   +b(`M${a-14} ${y-4} Q${a} ${y-2} ${a+12} ${y+4}`,`M${c-12} ${y+4} Q${c} ${y-2} ${c+14} ${y-4}`,'p-b-furrow')
   +b(`M${a-14} ${y-4} Q${a} ${y-2} ${a+12} ${y+4}`,`M${c-12} ${y-9} Q${c+2} ${y-15} ${c+16} ${y-6}`,'p-b-think')
   +b(`M${a-16} ${y+6} Q${a-2} ${y+2} ${a+14} ${y+8}`,`M${c-12} ${y} Q${c+2} ${y-5} ${c+16} ${y+2}`,'p-b-wink')
   +`<g class="fp p-blush"><ellipse cx="${a-18}" cy="${ey+38}" rx="13" ry="7" fill="#ff8fb8" opacity=".55"/><ellipse cx="${c+18}" cy="${ey+38}" rx="13" ry="7" fill="#ff8fb8" opacity=".55"/></g>
    <g class="fp p-blushx"><ellipse cx="${a-18}" cy="${ey+38}" rx="15" ry="8" fill="#ff7fa8" opacity=".75"/><ellipse cx="${c+18}" cy="${ey+38}" rx="15" ry="8" fill="#ff7fa8" opacity=".75"/>${L(`M${a-26} ${ey+32} l6 6 M${a-18} ${ey+30} l6 6 M${c+12} ${ey+30} l6 6 M${c+20} ${ey+32} l6 6`,'#e85a8a',2,'',.7)}</g>
    <g class="fp p-hearts"><path class="sp-float" d="M${c+40} ${ey-40} c-6 -8 -16 0 -8 8 l8 8 8 -8 c8 -8 -2 -16 -8 -8z" fill="#ff6f9a"/><path class="sp-float sp-d2" d="M${a-44} ${ey-30} c-4 -6 -12 0 -6 6 l6 6 6 -6 c6 -6 -2 -12 -6 -6z" fill="#ff8fb0"/></g>
    <g class="fp p-tear"><path class="sp-tear" d="M${c+6} ${ey+18} q-5 9 0 12 q5 -3 0 -12z" fill="#9fd8ff"/></g>
    <g class="fp p-zz"><text class="sp-zz" x="${c+30}" y="${ey-50}" font-size="22" fill="#fff" font-weight="700">z</text><text class="sp-zz sp-d2" x="${c+46}" y="${ey-70}" font-size="15" fill="#fff" font-weight="700">z</text></g>
    <g class="fp p-dots" fill="#fff"><circle class="sp-dot" cx="${c+36}" cy="${ey-46}" r="4"/><circle class="sp-dot sp-d2" cx="${c+48}" cy="${ey-62}" r="5.5"/><circle class="sp-dot sp-d3" cx="${c+64}" cy="${ey-80}" r="7.5"/></g>`
   +mouths(o);}
function mouths({ink,mx,my,beak}){const m=mx,y=my,red='#6a2440';
  if(beak)return `<g class="sp-beak">
    <path class="fp p-m-neutral p-m-small p-m-smug p-m-wistful p-m-side p-m-tip p-m-frown" d="M${m-10} ${y-10} Q${m} ${y-14} ${m+10} ${y-10} L${m} ${y+6}Z" fill="${beak}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
    <g class="fp p-m-smile p-m-big p-m-o p-m-obig p-m-yawn p-m-tongue p-m-chew"><path d="M${m-10} ${y-12} Q${m} ${y-16} ${m+10} ${y-12} L${m} ${y-2}Z" fill="${beak}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
      <path class="sp-beaklow" d="M${m-7} ${y} Q${m} ${y+12} ${m+7} ${y}Z" fill="${mix(beak,'#5a2a10',.25)}" stroke="${ink}" stroke-width="2.2"/><path class="fp p-m-tongue" d="M${m-3} ${y+2} q3 10 6 0z" fill="#ff7fa0"/></g>
    ${L(`M${m-14} ${y+6} Q${m-18} ${y+2} ${m-20} ${y-2}`,ink,2,'fp p-m-smug p-m-smile p-m-big')}${L(`M${m+14} ${y+6} Q${m+18} ${y+2} ${m+20} ${y-2}`,ink,2,'fp p-m-smile p-m-big')}
    ${L(`M${m-14} ${y+8} Q${m-18} ${y+12} ${m-22} ${y+12} M${m+14} ${y+8} Q${m+18} ${y+12} ${m+22} ${y+12}`,ink,2,'fp p-m-frown')}</g>`;
  return `<path d="M${m-10} ${y-20} Q${m} ${y-26} ${m+10} ${y-20} Q${m+7} ${y-10} ${m} ${y-9} Q${m-7} ${y-10} ${m-10} ${y-20}Z" fill="#2a1830"/><ellipse cx="${m-4}" cy="${y-19}" rx="3.6" ry="1.8" fill="#fff" opacity=".7"/>
   ${L(`M${m-12} ${y-2} Q${m-6} ${y+4} ${m} ${y-2} Q${m+6} ${y+4} ${m+12} ${y-2}`,ink,2.8,'fp p-m-neutral')}
   <path class="fp p-m-smile" d="M${m-14} ${y-4} Q${m} ${y+18} ${m+14} ${y-4}Z" fill="${red}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
   <g class="fp p-m-big"><path d="M${m-17} ${y-6} Q${m} ${y+26} ${m+17} ${y-6}Z" fill="${red}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/><path d="M${m-8} ${y+8} Q${m} ${y+3} ${m+8} ${y+8} Q${m+4} ${y+16} ${m} ${y+16} Q${m-4} ${y+16} ${m-8} ${y+8}Z" fill="#ff8fae"/></g>
   <ellipse class="fp p-m-o" cx="${m}" cy="${y+2}" rx="5.5" ry="6.5" fill="${red}" stroke="${ink}" stroke-width="2.4"/>
   <ellipse class="fp p-m-obig" cx="${m}" cy="${y+4}" rx="8" ry="10" fill="${red}" stroke="${ink}" stroke-width="2.4"/>
   <ellipse class="fp p-m-yawn sp-yawn" cx="${m}" cy="${y+2}" rx="8" ry="6" fill="${red}" stroke="${ink}" stroke-width="2.4"/>
   <g class="fp p-m-tongue">${L(`M${m-14} ${y-2} Q${m} ${y+10} ${m+14} ${y-2}`,ink,2.8)}<path d="M${m-4} ${y+4} Q${m-4} ${y+20} ${m+4} ${y+20} Q${m+11} ${y+19} ${m+10} ${y+4}Z" fill="#ff7fa0" stroke="${ink}" stroke-width="2.2"/></g>
   ${L(`M${m-8} ${y} Q${m} ${y+4} ${m+8} ${y}`,ink,2.6,'fp p-m-small')}
   ${L(`M${m-12} ${y+6} Q${m} ${y-4} ${m+12} ${y+6}`,ink,2.8,'fp p-m-frown')}
   ${L(`M${m-12} ${y} Q${m} ${y+8} ${m+14} ${y-6}`,ink,2.8,'fp p-m-smug')}
   ${L(`M${m-8} ${y+2} Q${m} ${y+6} ${m+8} ${y+1}`,ink,2.4,'fp p-m-wistful')}
   ${L(`M${m-2} ${y+2} Q${m+8} ${y+4} ${m+14} ${y-2}`,ink,2.6,'fp p-m-side')}
   <g class="fp p-m-tip">${L(`M${m-10} ${y} Q${m} ${y+3} ${m+10} ${y}`,ink,2.6)}<path d="M${m+3} ${y+1} q2 7 7 3 q-1 -3 -2 -4z" fill="#ff7fa0" stroke="${ink}" stroke-width="1.6"/></g>
   <ellipse class="fp p-m-chew sp-chew" cx="${m}" cy="${y+2}" rx="9" ry="5" fill="${red}" stroke="${ink}" stroke-width="2.4"/>`}
// expression → visible face parts
const EX={neutral:'eye-open m-neutral b-n',happy:'eye-happy m-smile b-n blush',delighted:'eye-happy m-big b-up blush',excited:'eye-open m-big b-up blush',eating:'eye-happy m-chew b-n',
  love:'eye-happy m-smile b-n blush hearts',curious:'eye-open m-o b-curious',thinking:'eye-open half m-side b-think dots',surprised:'eye-open m-obig b-up',giggling:'eye-happy m-big b-n blush',
  proud:'eye-open half m-smug b-n',shy:'eye-open m-small b-n blushx',sleepy:'eye-sleepy m-yawn zz',wistful:'eye-open half m-wistful b-sad',sad:'eye-open m-frown b-sad tear',
  concentrating:'eye-open half m-tip b-furrow',silly:'eyeL-happy eyeR-open m-tongue b-wink'};
const EXPRS=Object.keys(EX);
let css=`.sp{overflow:visible}.sp *{transform-box:view-box}.sp .fp{opacity:0;transition:opacity .18s}
${EXPRS.map(e=>`.sp[data-expr=${e}] :is(${EX[e].split(' ').map(p=>'.p-'+p).join(',')}){opacity:1}`).join('\n')}
.sp:not([data-expr]) :is(.p-eye-open,.p-m-neutral,.p-b-n),.sp[data-expr=""] :is(.p-eye-open,.p-m-neutral,.p-b-n){opacity:1}
.sp .sp-lid{transform:scaleY(0);transform-box:fill-box;transform-origin:center top;transition:transform .07s ease-in}.sp.blink .sp-lid{transform:scaleY(1)}
.sp .sp-pupils,.sp .sp-eyeball{transition:transform .35s ease;transform-box:fill-box;transform-origin:center}
.sp[data-expr=shy] .sp-pupils{transform:translate(5px,5px)}.sp[data-expr=curious] .sp-pupils{transform:translate(-3px,-3px)}
.sp[data-expr=thinking] .sp-pupils{transform:translate(5px,-4px)}.sp[data-expr=wistful] .sp-pupils{transform:translate(-5px,-3px)}.sp[data-expr=concentrating] .sp-pupils{transform:translate(0,3px) scale(.92)}
.sp[data-expr=surprised] .sp-eyeball{transform:scale(1.12)}.sp[data-expr=surprised] .sp-pupil{transform:scale(.7);transform-box:fill-box;transform-origin:center}
.sp[data-expr=excited] .sp-eyeball{transform:scale(1.08)}
.sp .sp-zz{opacity:0;animation:spzz 3s ease-in-out infinite}.sp .sp-d2{animation-delay:-1.2s}.sp .sp-d3{animation-delay:-2s}
@keyframes spzz{0%{opacity:0;transform:translate(0,0)}30%{opacity:1}100%{opacity:0;transform:translate(16px,-30px)}}
.sp .sp-float{animation:spfloat 2s ease-in-out infinite}@keyframes spfloat{0%{transform:translateY(4px);opacity:.3}50%{opacity:1}100%{transform:translateY(-14px);opacity:0}}
.sp .sp-tear{animation:sptear 2s ease-in infinite}@keyframes sptear{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(22px);opacity:0}}
.sp .sp-dot{animation:spdot 1.8s ease-in-out infinite}@keyframes spdot{0%,100%{opacity:.35}50%{opacity:1}}
.sp .sp-yawn{animation:spyawn 5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes spyawn{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1.3)}}
.sp .sp-chew,.sp .sp-beaklow{transform-box:fill-box;transform-origin:center top}.sp[data-expr=eating] :is(.sp-chew,.sp-beaklow){animation:spchew .35s infinite}@keyframes spchew{50%{transform:scaleY(.4)}}
.sp .sp-breath{animation:spbreath 3.4s ease-in-out infinite;transform-origin:150px 300px}@keyframes spbreath{50%{transform:scale(1.02,.984)}}
.sp .sp-headbob{animation:spheadbob 3.4s ease-in-out infinite;transform-origin:150px 196px}@keyframes spheadbob{50%{transform:translateY(2.5px) rotate(.6deg)}}
.sp .sp-headpose{transition:transform .5s cubic-bezier(.3,1.4,.5,1);transform-origin:150px 196px}
.sp[data-expr=curious] .sp-headpose{transform:rotate(-11deg)}.sp[data-expr=silly] .sp-headpose{transform:rotate(9deg) translateY(-2px)}
.sp[data-expr=sleepy] .sp-headpose{transform:translateY(7px) rotate(4deg)}.sp[data-expr=shy] .sp-headpose{transform:translateY(8px) rotate(6deg)}
.sp:is([data-expr=happy],[data-expr=delighted]) .sp-headpose{transform:translateY(-3px)}.sp[data-expr=proud] .sp-headpose{transform:translateY(-5px) rotate(-3deg)}
.sp[data-expr=thinking] .sp-headpose{transform:rotate(7deg)}.sp[data-expr=sad] .sp-headpose{transform:translateY(7px) rotate(-3deg)}.sp[data-expr=wistful] .sp-headpose{transform:rotate(-5deg) translateY(2px)}
.sp[data-expr=surprised] .sp-headpose{transform:translateY(-6px)}.sp[data-expr=concentrating] .sp-headpose{transform:translateY(3px)}
.sp[data-expr=giggling] .sp-headpose{animation:spgiggle .5s ease-in-out infinite}@keyframes spgiggle{50%{transform:rotate(4deg) translateY(-2px)}}
.sp .sp-pulse{animation:sppulse 3s ease-in-out infinite}@keyframes sppulse{0%,100%{opacity:.55}50%{opacity:1}}
.sp .sp-wisp{animation:spwisp 1.6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:30% 95%}.sp .sp-w2{animation-duration:2.1s;animation-delay:-.7s}.sp .sp-w3{animation-duration:1.3s;animation-delay:-.3s}
@keyframes spwisp{to{transform:skewX(-9deg) scale(1.05,.94)}}
.sp .sp-spark{animation:spspark 2.4s ease-in infinite;transform-box:fill-box;transform-origin:center;opacity:0}
@keyframes spspark{0%{opacity:0;transform:translate(0,0) scale(.4)}30%{opacity:1;transform:translate(-4px,-10px) scale(1)}100%{opacity:0;transform:translate(-14px,-40px) scale(.3)}}
.sp .sp-dir{transition:transform .3s;transform-origin:160px 0}.sp.face-left .sp-dir{transform:scaleX(-1)}
html.lowfx .sp .fx-glow{filter:none!important}html.lowfx .sp .sp-aura,html.lowfx .sp .sp-spark.sp-x{display:none}
html.lowfx .sp :is(.sp-pulse,.sp-wisp,.sp-spark){animation:none!important}html.lowfx .sp .sp-spark{opacity:.8}html.lowfx .sp .sp-grain{display:none}
@media (prefers-reduced-motion:reduce){.sp *{animation-duration:0s!important;animation-iteration-count:1!important}}
`;
// ---------- Slyte: spirit fox ----------
let uid=0;
function common(id,P,c){const [c1,c2,c3]=c;return `
   <linearGradient id="fur${id}" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
   <linearGradient id="leg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
   <linearGradient id="flame${id}" x1="0" y1="1" x2=".8" y2="0"><stop offset="0" stop-color="${c3}"/><stop offset=".5" stop-color="${c2}"/><stop offset=".85" stop-color="${c1}"/><stop offset="1" stop-color="${P.g}"/></linearGradient>
   <linearGradient id="wispg${id}" x1="0" y1="1" x2=".3" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset=".6" stop-color="${P.g}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
   <linearGradient id="crys${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${P.g}"/><stop offset="1" stop-color="${P.e}"/></linearGradient>
   <radialGradient id="iris${id}" cx=".5" cy=".65"><stop offset="0" stop-color="${mix(P.e,'#fff8c0',.6)}"/><stop offset=".6" stop-color="${P.e}"/><stop offset="1" stop-color="${mix(P.e,'#140a24',.5)}"/></radialGradient>
   <radialGradient id="shadow${id}"><stop offset="0" stop-color="#140a24" stop-opacity=".4"/><stop offset="1" stop-color="#140a24" stop-opacity="0"/></radialGradient>
   <radialGradient id="aura${id}"><stop offset="0" stop-color="${P.g}" stop-opacity=".32"/><stop offset="1" stop-color="${P.g}" stop-opacity="0"/></radialGradient>
   <pattern id="grain${id}" width="96" height="96" patternUnits="userSpaceOnUse"><image href="${grain()}" width="96" height="96"/></pattern>
   <filter id="glow${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`}
function furStrokes(r,n,x0,x1,y0,y1,col,w){let o='';for(let i=0;i<n;i++){const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0);o+=`<path d="M${x.toFixed(1)} ${y.toFixed(1)} q${(2+r()*3).toFixed(1)} ${(5+r()*4).toFixed(1)} ${(r()*6-1).toFixed(1)} ${(9+r()*6).toFixed(1)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${(.35+r()*.35).toFixed(2)}"/>`}return o}
function fox(v){if(typeof v==='number')v=variant('fox',v);const id='sf'+(++uid),P=v.pal,[c1,c2,c3]=P.f,G=P.g,ink=mix(c3,'#140a24',.62),sh=mix(c3,'#1a0a38',.35),rim='#fff6d8',cr=mix('#fdf8ff',c1,.12),r=rng(v.seed+5);
  const ear=(cls,x,d)=>`<g class="${cls}"><g class="sp-earpose"><g transform="${S(x,118,v.ear)}">
    <path d="M${x-22*d} 128 C${x-26*d} 92 ${x-14*d} 52 ${x-4*d} 38 C${x+10*d} 56 ${x+28*d} 84 ${x+34*d} 112 Z" fill="url(#fur${id})" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M${x-12*d} 118 C${x-14*d} 92 ${x-8*d} 70 ${x-3*d} 60 C${x+8*d} 74 ${x+18*d} 92 ${x+22*d} 110 Z" fill="${sh}" opacity=".7"/>
    <path d="M${x-8*d} 112 C${x-8*d} 94 ${x-5*d} 82 ${x-2*d} 74 C${x+5*d} 84 ${x+11*d} 96 ${x+14*d} 108 Z" fill="${mix(cr,'#ffb0d0',.4)}" opacity=".85"/>
    <path class="sp-pulse fx-glow" d="M${x-14*d} 66 C${x-10*d} 54 ${x-6*d} 44 ${x-4*d} 38 C${x+4*d} 48 ${x+10*d} 56 ${x+14*d} 66 Q${x} 60 ${x-14*d} 66Z" fill="${G}" filter="url(#glow${id})"/>
    ${L(`M${x-4*d} 40 C${x+8*d} 58 ${x+24*d} 82 ${x+31*d} 106`,rim,2.6,'',d>0?.85:.35)}</g></g></g>`;
  const leg=(x,front,cls)=>`<g class="sp-leg ${cls}" style="transform-origin:${x}px 240px"><g transform="${SX(x,236,1,v.leg)}"><path d="M${x-10} 236 C${x-11} 258 ${x-9} 276 ${x-8} 290 Q${x-13} 298 ${x-12} 303 Q${x} 309 ${x+12} 303 Q${x+13} 298 ${x+8} 290 C${x+9} 276 ${x+11} 258 ${x+10} 236Z" fill="${front?`url(#leg${id})`:mix(c3,'#1a0a38',.25)}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
    ${front?`${L(`M${x-4} 302 v-5 M${x+4} 302 v-5`,ink,1.6)}${L(`M${x+7} 244 C${x+8} 260 ${x+7} 276 ${x+5} 288`,rim,2,'',.75)}<ellipse class="sp-pulse" cx="${x}" cy="302" rx="9" ry="3" fill="${G}" opacity=".55"/>`:''}</g></g>`;
  const rune=v.rune==='swirl'?L('M168 214 q14 4 14 16 q0 10 -10 10 q-7 0 -7 -7 q0 -5 5 -5',G,3)+L('M124 250 q-8 6 -4 16',G,3)
    :v.rune==='chevron'?L('M164 214 l12 10 -12 10 M174 214 l12 10 -12 10',G,3)+L('M118 252 l-6 8 6 8',G,3)
    :`<g fill="${G}"><circle cx="170" cy="218" r="3.4"/><circle cx="180" cy="228" r="2.6"/><circle cx="172" cy="238" r="3"/><circle cx="120" cy="254" r="3"/><circle cx="116" cy="266" r="2.4"/></g>`;
  const brow=v.gem?'':`<g class="sp-pulse fx-glow" filter="url(#glow${id})"><path d="M150 128 l6 9 -6 9 -6 -9z" fill="none" stroke="${G}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="136" cy="140" r="2" fill="${G}"/><circle cx="164" cy="140" r="2" fill="${G}"/></g>`;
  // wispy flame tip: several thin tongues that flicker independently, fading to white at the tips
  const tip=`<g class="sp-tip">
    <path class="sp-wisp" d="M258 170 C256 146 266 126 284 112 C280 128 282 142 276 160Z" fill="url(#wispg${id})"/>
    <path class="sp-wisp sp-w2" d="M266 178 C276 156 296 144 314 142 C300 152 292 166 280 184Z" fill="url(#wispg${id})" opacity=".85"/>
    <path class="sp-wisp sp-w3" d="M250 160 C244 134 248 108 260 88 C260 110 266 130 262 156Z" fill="url(#wispg${id})" opacity=".9"/>
    <path class="sp-wisp sp-w2" d="M272 196 C288 186 306 186 318 192 C304 196 294 204 282 214Z" fill="url(#wispg${id})" opacity=".7"/>
    <path class="sp-wisp" d="M262 150 C266 128 276 112 290 100 C286 116 284 132 272 150Z" fill="#fff" opacity=".55"/>
    <path class="sp-pulse fx-glow" d="M256 164 C258 142 270 124 286 114 C280 134 278 150 266 170Z" fill="${G}" filter="url(#glow${id})" opacity=".8"/></g>`;
  const sparks=[[288,128,0],[300,160,.5],[266,104,1],[310,196,1.5],[282,150,2]].map(([x,y,dl],i)=>`<g class="sp-spark${i>1?' sp-x':''}" style="animation-delay:-${dl}s">${star(x,y,5,'#fff')}</g>`).join('');
  const flameTail=`<path d="M186 278 C236 292 276 262 272 214 C270 190 276 176 282 164 C268 168 258 160 254 146 C248 162 244 176 240 190 C236 218 216 240 186 250Z" fill="url(#flame${id})" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
    ${tip}${L('M206 262 C244 258 262 228 262 194',sh,9,'',.35)}${L('M226 252 C250 238 262 214 264 186 C266 176 270 168 276 162',"#fff",2.4,'',.45)}${sparks}`;
  const extras=(v.horns?`<g class="sp-horns"><path d="M124 122 L128 76 L146 116Z" fill="url(#crys${id})" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="M128 76 L134 118" stroke="${ink}" stroke-width="1.4" opacity=".5"/>
     <path d="M176 122 L172 76 L154 116Z" fill="url(#crys${id})" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="M172 76 L166 118" stroke="${ink}" stroke-width="1.4" opacity=".5"/>
     ${L('M127 108 l2 -22',"#fff",2,'',.9)}${L('M171 86 l2 18',"#fff",1.6,'',.6)}<g class="sp-pulse fx-glow" filter="url(#glow${id})"><circle cx="128" cy="78" r="2.6" fill="#fff"/><circle cx="172" cy="78" r="2.6" fill="#fff"/></g></g>`:'')
   +(v.gem?`<g><path d="M150 124 l9 12 -9 13 -9 -13z" fill="url(#crys${id})" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><path class="sp-pulse fx-glow" d="M150 124 l9 12 -9 13 -9 -13z" fill="${G}" opacity=".5" filter="url(#glow${id})"/>${L('M146 132 l3 -4','#fff',2)}</g>`:'')
   +(v.accent==='leaf'?`<g transform="translate(198 122) rotate(28)"><path d="M0 0 C10 -10 24 -8 30 0 C24 8 10 10 0 0Z" fill="#6ad08a" stroke="${ink}" stroke-width="1.8"/><path d="M2 0 H26" stroke="#2f8a5a" stroke-width="1.2"/><path d="M6 6 C14 14 24 14 28 10 C22 4 12 4 6 6Z" fill="#9ae0a0" stroke="${ink}" stroke-width="1.5"/></g>`
    :v.accent==='flower'?`<g transform="translate(200 124)">${[0,72,144,216,288].map(a=>`<ellipse rx="5.5" ry="8.5" cy="-7" fill="#ffd0ea" stroke="${ink}" stroke-width="1.4" transform="rotate(${a})"/>`).join('')}<circle r="4.5" fill="#ffe27a" stroke="${ink}" stroke-width="1.4"/></g>`:'');
  const headP='M150 108 C200 108 226 140 224 172 L236 182 L226 188 L234 198 L218 202 C206 226 180 238 150 238 C120 238 94 226 82 202 L66 198 L74 188 L64 182 L76 172 C74 140 100 108 150 108Z';
  return `<svg viewBox="0 0 320 330" class="echo-svg sp sp-fox fox" data-expr="neutral" role="img" aria-label="Slyte">
  <defs>${common(id,P,P.f)}<linearGradient id="cream${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdff"/><stop offset="1" stop-color="${mix(cr,c2,.25)}"/></linearGradient>
   <clipPath id="bodyclip${id}"><path d="M150 186 C198 186 214 236 206 290 L94 290 C86 236 102 186 150 186Z"/></clipPath><clipPath id="headclip${id}"><path d="${headP}"/></clipPath></defs>
  <g class="sp-move"><g class="sp-dir"><g class="sp-curl">
  <ellipse class="sp-aura sp-pulse" cx="150" cy="210" rx="140" ry="130" fill="url(#aura${id})"/>
  <ellipse class="sp-shadow" cx="150" cy="306" rx="92" ry="12" fill="url(#shadow${id})"/>
  <g class="sp-tail sp-tailBack"><g class="sp-tailInner"><g transform="${S(196,262,v.tail)}">${flameTail}</g></g></g>
  <g class="sp-breath">
    ${leg(120,false,'sp-legBL')}${leg(180,false,'sp-legBR')}
    <g transform="${SX(150,290,v.body,1)}">
      <path d="M150 186 C198 186 214 236 206 290 L94 290 C86 236 102 186 150 186Z" fill="url(#fur${id})" stroke="${ink}" stroke-width="3"/>
      <g clip-path="url(#bodyclip${id})"><path d="M176 186 C210 210 216 260 206 300 L232 300 L232 180Z" fill="${sh}" opacity=".45"/>
        <path d="M126 196 C136 214 164 214 174 196 C180 232 172 268 150 282 C128 268 120 232 126 196Z" fill="url(#cream${id})"/>
        ${furStrokes(r,18,128,172,206,270,mix(cr,c2,.4),1.6)}${furStrokes(r,14,98,124,210,284,c3,1.8)}${furStrokes(r,14,178,204,210,284,sh,1.8)}
        <rect class="sp-grain" x="80" y="180" width="140" height="120" fill="url(#grain${id})" opacity=".09" style="mix-blend-mode:multiply"/></g>
      <g class="sp-pulse fx-glow" filter="url(#glow${id})">${rune}</g>
      ${L('M170 190 C196 200 208 236 206 270',rim,3,'',.85)}
    </g>
    ${leg(130,true,'sp-legFL')}${leg(170,true,'sp-legFR')}
  </g>
  <g class="sp-tailFront"><path d="M196 282 C238 300 168 324 104 308 C84 302 82 290 96 290 C130 300 170 296 196 274Z" fill="url(#flame${id})" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
    ${L('M190 290 C160 304 120 304 100 298','#fff',2,'',.5)}<path class="sp-wisp" d="M98 296 C86 290 76 280 70 268 C80 274 90 278 100 286Z" fill="url(#wispg${id})"/><path class="sp-wisp sp-w2" d="M96 300 C82 300 70 296 62 288 C74 290 86 292 98 294Z" fill="url(#wispg${id})"/>
    <ellipse class="sp-pulse fx-glow" cx="94" cy="296" rx="10" ry="6" fill="${G}" filter="url(#glow${id})"/><g class="sp-spark">${star(84,286,5,'#fff')}</g></g>
  <g class="sp-headbob"><g class="sp-headpose"><g class="sp-swivel"><g transform="${S(150,196,v.head)}">
    ${ear('sp-earL',112,-1)}${ear('sp-earR',188,1)}
    <path d="${headP}" fill="url(#fur${id})" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <g clip-path="url(#headclip${id})">
      <path d="M196 116 C222 140 230 182 220 206 C206 226 184 236 164 238 L240 238 L240 100Z" fill="${sh}" opacity=".4"/>
      <path d="M70 188 C92 180 112 182 126 196 C136 214 142 226 150 230 C158 226 164 214 174 196 C188 182 208 180 230 188 C214 222 186 240 150 240 C114 240 86 222 70 188Z" fill="url(#cream${id})"/>
      ${furStrokes(r,10,120,180,112,150,mix(c1,'#fff',.4),1.4)}${furStrokes(r,8,190,222,150,200,sh,1.6)}
      <rect class="sp-grain" x="60" y="100" width="180" height="140" fill="url(#grain${id})" opacity=".08" style="mix-blend-mode:multiply"/></g>
    ${L('M118 116 C134 110 150 108 166 110',rim,3.6,'',.7)}${L('M196 120 C216 134 226 156 224 172',rim,3.2,'',.85)}
    ${brow}${extras}
    <g class="sp-pulse fx-glow" filter="url(#glow${id})">${L('M80 186 l12 4 M80 194 l10 2 M220 186 l-12 4 M220 194 l-10 2',G,2.4)}</g>
    ${face({id,ink,lidFill:`url(#fur${id})`,R:19*v.eyeSize,ex1:110,ex2:190,ey:170,mx:150,my:226})}
  </g></g></g></g>
  </g></g></g></svg>`;
}
css+=`
.sp-fox .sp-tail{animation:sptailsway 3s ease-in-out infinite;transform-origin:196px 262px}@keyframes sptailsway{0%,100%{transform:rotate(0)}45%{transform:rotate(-6deg)}75%{transform:rotate(3deg)}}
.sp-fox .sp-tailInner{transform-origin:196px 262px}.sp-fox.tflick .sp-tailInner{animation:sptflick .7s ease-out}@keyframes sptflick{30%{transform:rotate(-14deg)}65%{transform:rotate(6deg)}}
.sp-fox .sp-earL,.sp-fox .sp-earL .sp-earpose{transform-origin:112px 118px}.sp-fox .sp-earR,.sp-fox .sp-earR .sp-earpose{transform-origin:188px 118px}
.sp-fox.flickL .sp-earL{animation:spflickL .5s ease-out}.sp-fox.flickR .sp-earR{animation:spflickR .5s ease-out}
@keyframes spflickL{25%{transform:rotate(-16deg)}55%{transform:rotate(7deg)}}@keyframes spflickR{25%{transform:rotate(16deg)}55%{transform:rotate(-7deg)}}
.sp-fox .sp-earpose{transition:transform .45s ease}
.sp-fox:is([data-expr=curious],[data-expr=surprised]) .sp-earL .sp-earpose{transform:rotate(-10deg)}.sp-fox:is([data-expr=curious],[data-expr=surprised]) .sp-earR .sp-earpose{transform:rotate(6deg)}
.sp-fox:is([data-expr=sleepy],[data-expr=wistful]) .sp-earL .sp-earpose{transform:rotate(-20deg)}.sp-fox:is([data-expr=sleepy],[data-expr=wistful]) .sp-earR .sp-earpose{transform:rotate(20deg)}
.sp-fox:is([data-expr=shy],[data-expr=sad]) .sp-earL .sp-earpose{transform:rotate(-34deg) translateY(6px)}.sp-fox:is([data-expr=shy],[data-expr=sad]) .sp-earR .sp-earpose{transform:rotate(34deg) translateY(6px)}
.sp-fox[data-expr=silly] .sp-earL .sp-earpose{transform:rotate(-24deg)}.sp-fox[data-expr=thinking] .sp-earR .sp-earpose{transform:rotate(14deg)}
.sp-fox:is([data-expr=happy],[data-expr=excited],[data-expr=delighted],[data-expr=giggling]) .sp-tail{animation-duration:.7s}.sp-fox[data-expr=silly] .sp-tail{animation-duration:1s}.sp-fox[data-expr=sleepy] .sp-tail{animation-duration:6s}
.sp-fox .sp-tailBack{transition:opacity .35s}.sp-fox .sp-tailFront{opacity:0;transition:opacity .35s;transform-origin:190px 280px}
.sp-fox:is([data-expr=shy],[data-expr=sad],.m-curl) .sp-tailBack{opacity:0}.sp-fox:is([data-expr=shy],[data-expr=sad],.m-curl) .sp-tailFront{opacity:1}
.sp[data-expr=sleepy] .sp-breath{animation-duration:5.5s}
.sp .sp-legBL,.sp .sp-legBR,.sp .sp-legFL,.sp .sp-legFR{transform-box:view-box}
`;
// ---------- life: blinks / ear & tail flicks, reduced effects ----------
function life(root){const t=performance.now();(root||document).querySelectorAll('svg.sp').forEach(s=>{if(!s.isConnected)return;
  if(!s._nb||t>s._nb){s.classList.add('blink');setTimeout(()=>s.classList.remove('blink'),130);if(Math.random()<.2)setTimeout(()=>{s.classList.add('blink');setTimeout(()=>s.classList.remove('blink'),120)},260);s._nb=t+2200+Math.random()*3500}
  if(!s._ne||t>s._ne){const k=Math.random()<.5?'flickL':'flickR';s.classList.add(k);setTimeout(()=>s.classList.remove(k),520);s._ne=t+3000+Math.random()*5000}
  if(!s._nt||t>s._nt){s.classList.add('tflick');setTimeout(()=>s.classList.remove('tflick'),720);s._nt=t+4000+Math.random()*6000}})}
const fx={mode:'auto',low:false,reason:'',listeners:[],
  apply(low,reason){this.low=low;this.reason=reason;document.documentElement.classList.toggle('lowfx',low);this.listeners.forEach(f=>f(low,reason))},
  set(m){this.mode=m;try{m==='auto'?localStorage.removeItem('echo.lowfx'):localStorage.setItem('echo.lowfx',m==='low'?'1':'0')}catch(e){}this.decide()},
  toggle(){this.set(this.low?'full':'low')},
  decide(){let s=null;try{s=localStorage.getItem('echo.lowfx')}catch(e){}
    if(s==='1')return this.apply(true,'manual');if(s==='0')return this.apply(false,'manual');
    if(W.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return this.apply(true,'reduced-motion');
    const n=navigator,cores=n.hardwareConcurrency||8,mem=n.deviceMemory||8;if(cores<=2||mem<=2)return this.apply(true,'low-end device');
    this.apply(false,'auto');this.measure()},
  measure(){if(this._m)return;this._m=1;let f=0,t0=0;const tick=t=>{if(!t0)t0=t;f++;if(t-t0<3000)return requestAnimationFrame(tick);
    const fps=f*1000/(t-t0);this.fps=Math.round(fps);if(fps<40&&this.mode==='auto'&&!localStorage.getItem('echo.lowfx'))this.apply(true,'low FPS ('+this.fps+')')};setTimeout(()=>requestAnimationFrame(tick),1200)}};
function injectCSS(){if(document.getElementById('spirit-css'))return;const st=document.createElement('style');st.id='spirit-css';st.textContent=css;document.head.appendChild(st)}
function setExpr(el,e){el.setAttribute('data-expr',EX[e]?e:'neutral')}
W.SPIRIT={variant,describe,fox,EXPRS,EX,setExpr,fx,life,rng,mix,star,_css:()=>css,_add:c=>{css+=c;const st=document.getElementById('spirit-css');if(st)st.textContent=css},_parts:{face,common,furStrokes,L,S,SX,uid:()=>++uid,OWLPAL}};
injectCSS();fx.decide();setInterval(life,250);
})();
