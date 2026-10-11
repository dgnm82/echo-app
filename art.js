// Echo art: layered, cel-shaded SVG creatures + painterly backgrounds. All animation is CSS transforms (GPU-friendly).
(()=>{
let uid=0;
const hex=c=>c.replace('#','').match(/../g).map(x=>parseInt(x,16));
const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const dk=(c,t)=>mix(c,'#1a1030',t), lt=(c,t)=>mix(c,'#fff8e8',t);

// eyes shared: groups toggled by [data-expr] in CSS
function eyes(cx1,cx2,cy,r,iris,ol,big){
  const one=(cx,flip)=>`
   <g class="eye-open"><g class="blink" style="transform-origin:${cx}px ${cy}px">
     <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r*1.12}" fill="#fffdf6" stroke="${ol}" stroke-width="2.2"/>
     <g class="look"><ellipse class="iris" cx="${cx+(flip?-1:1)}" cy="${cy+1}" rx="${r*.72}" ry="${r*.82}" fill="${iris}"/>
     <ellipse cx="${cx+(flip?-1:1)}" cy="${cy+2}" rx="${r*.42}" ry="${r*.5}" fill="#160d1e"/>
     <ellipse cx="${cx+(flip?-1:1)}" cy="${cy+r*.45}" rx="${r*.5}" ry="${r*.18}" fill="${lt(iris,.45)}" opacity=".7"/>
     <circle cx="${cx-r*.3}" cy="${cy-r*.38}" r="${r*.26}" fill="#fff"/><circle cx="${cx+r*.32}" cy="${cy+r*.2}" r="${r*.1}" fill="#fff"/></g>
     <path class="lid" d="M${cx-r*1.15} ${cy-r*1.3} L${cx+r*1.15} ${cy-r*1.3} L${cx+r*1.15} ${cy-r*.15} Q${cx} ${cy+r*.25} ${cx-r*1.15} ${cy-r*.15}Z" fill="var(--lid,#8a5a3a)"/>
     <path class="lidline" d="M${cx-r*1.05} ${cy-r*.12} Q${cx} ${cy+r*.28} ${cx+r*1.05} ${cy-r*.12}" stroke="${ol}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
   </g></g>
   <path class="eye-happy" d="M${cx-r} ${cy+2} Q${cx} ${cy-r*1.1} ${cx+r} ${cy+2}" stroke="${ol}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
   <path class="eye-sleepy" d="M${cx-r} ${cy} Q${cx} ${cy+r*.7} ${cx+r} ${cy}" stroke="${ol}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
   <g class="eye-sad"><ellipse cx="${cx}" cy="${cy+2}" rx="${r*.8}" ry="${r*.9}" fill="#160d1e"/><circle cx="${cx-r*.25}" cy="${cy-r*.2}" r="${r*.25}" fill="#fff"/>
     <path d="M${cx+(flip?r:-r)*1.1} ${cy-r*.85} Q${cx} ${cy-r*1.1} ${cx+(flip?-r:r)*.7} ${cy-r*1.5}" stroke="${ol}" stroke-width="3" stroke-linecap="round"/></g>
   <g class="eye-wide"><circle cx="${cx}" cy="${cy}" r="${r*1.15}" fill="#fffdf6" stroke="${ol}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="${r*.45}" fill="#160d1e"/><circle cx="${cx-r*.2}" cy="${cy-r*.25}" r="${r*.18}" fill="#fff"/></g>`;
  return `<g class="eyes">${one(cx1,false)}${one(cx2,true)}</g>`;
}
function defs(id,coat,accent){return `<defs>
  <radialGradient id="body${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${lt(coat,.18)}"/><stop offset=".6" stop-color="${coat}"/><stop offset="1" stop-color="${dk(coat,.18)}"/></radialGradient>
  <radialGradient id="acc${id}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="${mix(accent,coat,.15)}"/></radialGradient>
  <radialGradient id="shadow${id}"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`}

function fox(g){
  const id=++uid, c=g.coat, a=g.accent, ol=dk(c,.62), sh=dk(c,.28), hi=lt(c,.35);
  const mk=g.marking==='star'?`<path d="M120 62l3.5 7.5 8 1-6 5.5 1.6 8-7.1-4-7.1 4 1.6-8-6-5.5 8-1z" fill="${a}" opacity=".95"/>`
    :g.marking==='stripe'?`<path d="M114 56q6-4 12 0l-2 26q-4 3-8 0z" fill="${a}" opacity=".9"/>`
    :g.marking==='spot'?`<ellipse cx="88" cy="196" rx="9" ry="6" fill="${a}" opacity=".9"/><ellipse cx="152" cy="200" rx="6" ry="4" fill="${a}" opacity=".9"/>`:'';
  return `<svg class="echo-svg fox" viewBox="0 0 240 260" data-expr="neutral" style="--lid:${c}">${defs(id,c,a)}
  <ellipse cx="120" cy="244" rx="78" ry="12" fill="url(#shadow${id})"/>
  <g class="tail" style="transform-origin:160px 214px">
    <path d="M150 220 C200 230 238 196 226 140 C220 112 196 98 186 112 C204 140 196 176 150 196 Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M186 112 C196 98 220 112 226 140 C228 152 226 160 224 166 C214 150 204 132 186 112Z" fill="${a}" stroke="${ol}" stroke-width="2.5"/>
    <path d="M160 206 C196 204 214 182 216 156" stroke="${sh}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>
  </g>
  <g class="body breathe" style="transform-origin:120px 240px">
    <path d="M70 236 C62 196 74 150 120 146 C166 150 178 196 170 236 Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M150 160 C170 180 172 214 166 236 L152 236 C160 208 158 180 150 160Z" fill="${sh}" opacity=".45"/>
    <path d="M98 160 C108 176 132 176 142 160 C146 192 138 222 120 230 C102 222 94 192 98 160Z" fill="url(#acc${id})"/>
    ${g.marking==='spot'?mk:''}
    <g class="paws"><ellipse cx="98" cy="236" rx="15" ry="9" fill="${dk(c,.35)}" stroke="${ol}" stroke-width="2.5"/><ellipse cx="142" cy="236" rx="15" ry="9" fill="${dk(c,.35)}" stroke="${ol}" stroke-width="2.5"/></g>
  </g>
  <g class="head" style="transform-origin:120px 150px">
    <g class="ear earL" style="transform-origin:82px 74px"><path d="M66 82 L62 18 Q64 12 70 16 L106 60 Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/><path d="M72 70 L70 32 L94 60Z" fill="${dk(c,.55)}"/><path d="M74 66 L73 42 L88 60Z" fill="${mix(a,'#f0a0a0',.4)}" opacity=".7"/></g>
    <g class="ear earR" style="transform-origin:158px 74px"><path d="M174 82 L178 18 Q176 12 170 16 L134 60 Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/><path d="M168 70 L170 32 L146 60Z" fill="${dk(c,.55)}"/><path d="M166 66 L167 42 L152 60Z" fill="${mix(a,'#f0a0a0',.4)}" opacity=".7"/></g>
    <path d="M120 50 C164 50 188 80 186 112 C196 122 196 132 184 136 C172 160 146 170 120 170 C94 170 68 160 56 136 C44 132 44 122 54 112 C52 80 76 50 120 50Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M172 76 C186 92 188 116 184 132 C176 150 160 160 144 166 C166 146 176 118 172 76Z" fill="${sh}" opacity=".4"/>
    <path d="M86 62 C96 56 110 54 122 55" stroke="${hi}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
    ${mk.includes('120 62')||mk.includes('114 56')?mk:''}
    <path d="M58 128 C72 120 88 122 100 132 C108 148 114 158 120 162 C126 158 132 148 140 132 C152 122 168 120 182 128 C176 150 150 168 120 168 C90 168 64 150 58 128Z" fill="url(#acc${id})"/>
    <g class="brows"><path class="brow browL" d="M78 86 Q88 80 98 84" stroke="${ol}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path class="brow browR" d="M142 84 Q152 80 162 86" stroke="${ol}" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>
    ${eyes(90,150,106,13,g.eye,ol)}
    <ellipse class="blush" cx="72" cy="132" rx="10" ry="6" fill="#ff8a8a" opacity=".0"/><ellipse class="blush" cx="168" cy="132" rx="10" ry="6" fill="#ff8a8a" opacity="0"/>
    <path d="M112 136 Q120 132 128 136 Q126 144 120 145 Q114 144 112 136Z" fill="#2a1a22"/><ellipse cx="117" cy="137" rx="3" ry="1.6" fill="#fff" opacity=".7"/>
    <g class="mouths">
      <path class="m-neutral" d="M110 150 Q115 155 120 150 Q125 155 130 150" stroke="${ol}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <g class="m-happy"><path d="M106 148 Q120 170 134 148 Z" fill="#7a2a36" stroke="${ol}" stroke-width="2.4" stroke-linejoin="round"/><path d="M113 158 Q120 154 127 158 Q122 166 120 166 Q116 165 113 158Z" fill="#ff8f9a"/></g>
      <path class="m-sad" d="M110 156 Q120 148 130 156" stroke="${ol}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <ellipse class="m-o" cx="120" cy="154" rx="5" ry="6" fill="#7a2a36" stroke="${ol}" stroke-width="2.2"/>
      <g class="m-chew"><ellipse cx="120" cy="153" rx="9" ry="5" fill="#7a2a36" stroke="${ol}" stroke-width="2.2"/></g>
    </g>
    <g class="paw-mouth"><ellipse cx="128" cy="156" rx="15" ry="11" fill="${dk(c,.3)}" stroke="${ol}" stroke-width="2.5"/><path d="M120 150 v8 M127 148 v9 M134 150 v8" stroke="${ol}" stroke-width="1.6" opacity=".6"/></g>
  </g>
  <g class="fx"><text class="z" x="170" y="60" font-size="22" fill="#fff">z</text><text class="z z2" x="186" y="40" font-size="16" fill="#fff">z</text>
   <path class="heart" d="M190 70 c-6-10-20-4-14 6 l14 12 14-12 c6-10-8-16-14-6z" fill="#ff7088"/><path class="tear" d="M156 118 q-5 8 0 12 q5-4 0-12z" fill="#9fd8ff"/></g>
  </svg>`;
}
function owl(g){
  const id=++uid, c=g.coat, a=g.accent, ol=dk(c,.62), sh=dk(c,.28), hi=lt(c,.3);
  const scal=[];for(let r=0;r<4;r++)for(let i=0;i<4-(r>2?1:0);i++){const x=96+i*16+(r%2?8:0)-(r>2?-8:0),y=168+r*16;scal.push(`<path d="M${x-7} ${y} q7 8 14 0" stroke="${dk(a,.35)}" stroke-width="2" fill="none" opacity=".55"/>`)}
  const mk=g.marking==='star'?`<path d="M120 56l3 6.5 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7-5.2-4.8 7-.8z" fill="${a}"/>`
    :g.marking==='stripe'?`<path d="M116 50 q4-3 8 0 l-1 22 q-3 2-6 0z" fill="${a}"/>`:g.marking==='spot'?`<circle cx="76" cy="186" r="6" fill="${a}"/><circle cx="164" cy="196" r="5" fill="${a}"/>`:'';
  return `<svg class="echo-svg owl" viewBox="0 0 240 260" data-expr="neutral" style="--lid:${a}">${defs(id,c,a)}
  <ellipse cx="120" cy="246" rx="70" ry="11" fill="url(#shadow${id})"/>
  <g class="body breathe" style="transform-origin:120px 244px">
    <path d="M120 64 C178 64 194 128 186 180 C180 222 156 240 120 240 C84 240 60 222 54 180 C46 128 62 64 120 64Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3"/>
    <path d="M176 110 C190 150 186 206 156 232 C176 196 180 150 176 110Z" fill="${sh}" opacity=".45"/>
    <g class="belly ruffle" style="transform-origin:120px 190px"><path d="M120 140 C150 140 160 170 156 200 C152 226 138 236 120 236 C102 236 88 226 84 200 C80 170 90 140 120 140Z" fill="url(#acc${id})"/>${scal.join('')}</g>
    ${mk.includes('186')?mk:''}
    <g class="feet"><path d="M100 238 l-6 8 M106 239 l0 9 M112 238 l6 8" stroke="#e0a030" stroke-width="5" stroke-linecap="round"/><path d="M128 238 l-6 8 M134 239 l0 9 M140 238 l6 8" stroke="#e0a030" stroke-width="5" stroke-linecap="round"/></g>
  </g>
  <g class="wing wingL" style="transform-origin:66px 130px"><path d="M66 124 C40 140 36 190 56 222 C70 214 80 180 78 140Z" fill="${dk(c,.15)}" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/><path d="M52 170 q10 4 18 -2 M50 190 q10 4 18 -2 M54 208 q8 3 14 -2" stroke="${ol}" stroke-width="2" fill="none" opacity=".45"/></g>
  <g class="wing wingR" style="transform-origin:174px 130px"><path d="M174 124 C200 140 204 190 184 222 C170 214 160 180 162 140Z" fill="${dk(c,.22)}" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/><path d="M188 170 q-10 4 -18 -2 M190 190 q-10 4 -18 -2 M186 208 q-8 3 -14 -2" stroke="${ol}" stroke-width="2" fill="none" opacity=".45"/></g>
  <g class="head" style="transform-origin:120px 140px">
    <g class="ear earL" style="transform-origin:76px 60px"><path d="M64 70 L52 26 Q58 24 92 54Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/></g>
    <g class="ear earR" style="transform-origin:164px 60px"><path d="M176 70 L188 26 Q182 24 148 54Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3" stroke-linejoin="round"/></g>
    <path d="M120 40 C172 40 192 76 188 106 C184 140 156 156 120 156 C84 156 56 140 52 106 C48 76 68 40 120 40Z" fill="url(#body${id})" stroke="${ol}" stroke-width="3"/>
    <path d="M90 50 C102 44 116 43 128 44" stroke="${hi}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
    ${mk.includes('186')?'':mk}
    <path d="M120 70 C112 60 96 58 84 62 C64 70 60 100 70 120 C80 140 108 142 120 128 C132 142 160 140 170 120 C180 100 176 70 156 62 C144 58 128 60 120 70Z" fill="url(#acc${id})" stroke="${dk(a,.3)}" stroke-width="2"/>
    <g class="brows"><path class="brow browL" d="M74 74 Q88 66 104 74" stroke="${ol}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path class="brow browR" d="M136 74 Q152 66 166 74" stroke="${ol}" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>
    <g class="glow"><circle cx="94" cy="98" r="25" fill="none" stroke="#ffd84a" stroke-width="5" opacity=".8"/><circle cx="146" cy="98" r="25" fill="none" stroke="#ffd84a" stroke-width="5" opacity=".8"/></g>
    ${eyes(94,146,98,17,g.eye,ol,true)}
    <ellipse class="blush" cx="72" cy="124" rx="9" ry="5" fill="#ff8a8a" opacity="0"/><ellipse class="blush" cx="168" cy="124" rx="9" ry="5" fill="#ff8a8a" opacity="0"/>
    <g class="mouths">
      <path class="m-neutral m-sad m-o" d="M112 118 L120 136 L128 118 Q120 114 112 118Z" fill="#e6a531" stroke="${dk('#e6a531',.5)}" stroke-width="2" stroke-linejoin="round"/>
      <g class="m-happy m-chew"><path d="M112 116 L120 128 L128 116 Q120 112 112 116Z" fill="#e6a531" stroke="${dk('#e6a531',.5)}" stroke-width="2"/><path class="beak-low" d="M114 130 L120 140 L126 130Z" fill="#c98a1e" stroke="${dk('#e6a531',.5)}" stroke-width="2"/></g>
    </g>
  </g>
  <g class="fx"><text class="z" x="170" y="60" font-size="22" fill="#fff">z</text><text class="z z2" x="186" y="40" font-size="16" fill="#fff">z</text>
   <path class="heart" d="M190 70 c-6-10-20-4-14 6 l14 12 14-12 c6-10-8-16-14-6z" fill="#ff7088"/><path class="tear" d="M152 112 q-5 8 0 12 q5-4 0-12z" fill="#9fd8ff"/></g>
  </svg>`;
}
// ---------- backgrounds ----------
function grass(n,y0,y1,cols,seed){let s=seed,o='';const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<n;i++){const x=r()*400,y=y0+r()*(y1-y0),h=8+r()*16*(y/y1),c=cols[Math.floor(r()*cols.length)];o+=`<path d="M${x} ${y} q${2+r()*4} ${-h*.6} ${(r()-.3)*8} ${-h}" stroke="${c}" stroke-width="${1.5+r()*2}" fill="none" stroke-linecap="round"/>`}return o}
function flowers(n,y0,y1,cols,seed){let s=seed,o='';const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<n;i++){const x=r()*400,y=y0+r()*(y1-y0),sz=1.5+3*(y-y0)/(y1-y0),c=cols[Math.floor(r()*cols.length)];o+=`<g class="sway" style="transform-origin:${x}px ${y+6}px;animation-delay:${-r()*4}s"><path d="M${x} ${y+sz*3} L${x} ${y}" stroke="#4d7a3a" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="${sz}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${sz*.4}" fill="#fff3b0"/></g>`}return o}
const BG={
 day:()=>`<svg class="bg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice"><defs>
  <linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ec3e8"/><stop offset=".55" stop-color="#cfe9e6"/><stop offset="1" stop-color="#ffe3b3"/></linearGradient>
  <radialGradient id="sunD" cx="78%" cy="16%" r="40%"><stop offset="0" stop-color="#fffbe0" stop-opacity=".95"/><stop offset=".25" stop-color="#fff2b8" stop-opacity=".5"/><stop offset="1" stop-color="#fff2b8" stop-opacity="0"/></radialGradient>
  <linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc7b9"/><stop offset="1" stop-color="#b9d8c0"/></linearGradient>
  <linearGradient id="h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8dbb68"/><stop offset="1" stop-color="#6e9f4c"/></linearGradient>
  <linearGradient id="h3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fcb5e"/><stop offset=".4" stop-color="#7fb04a"/><stop offset="1" stop-color="#4f8536"/></linearGradient></defs>
  <rect width="400" height="700" fill="url(#skyD)"/><rect width="400" height="700" fill="url(#sunD)"/>
  <g class="cloud" style="animation-duration:70s"><path d="M40 120 q10-26 40-18 q16-22 44-6 q30-4 30 20 q-4 12-24 12 h-80 q-20-2-10-8z" fill="#fff" opacity=".85"/></g>
  <g class="cloud" style="animation-duration:95s;animation-delay:-40s"><path d="M220 70 q8-18 30-12 q14-16 34-4 q22-2 22 16 q-4 8-18 8 h-60 q-14-2-8-8z" fill="#fff" opacity=".7"/></g>
  <path d="M0 380 Q60 330 130 352 T260 340 T400 350 V700 H0Z" fill="url(#h1)"/>
  <path d="M0 360 l20-40 18 34 14-28 22 44z M300 350 l16-46 18 40 12-24 20 40z" fill="#7aa896" opacity=".7"/>
  <g transform="translate(300 300)"><rect x="-6" y="20" width="12" height="70" fill="#7a5a3a"/><circle cx="0" cy="10" r="36" fill="#6f9a52"/><circle cx="-18" cy="22" r="22" fill="#5d8a44"/><circle cx="16" cy="-4" r="20" fill="#84b062"/>
   <path d="M-22 40 h40 l-6 -16 h-28z" fill="#a0764a"/><path d="M-26 40 l22 -14 22 14z" fill="#c4553a"/></g>
  <path d="M0 440 Q100 400 210 424 T400 420 V700 H0Z" fill="url(#h2)"/>
  <path d="M0 500 Q120 470 240 488 T400 480 V700 H0Z" fill="url(#h3)"/>
  ${grass(140,480,700,['#5f9440','#7fb04a','#a4cf62','#4d7d33'],7)}${flowers(40,470,690,['#ffd166','#ff8fab','#fff','#c9a0ff'],11)}
  <g class="leaf-fall"><path d="M60 -20 q8-6 12 4 q-6 8-12-4z" fill="#e8913a"/></g><g class="leaf-fall" style="animation-delay:-5s;left:0"><path d="M250 -20 q8-6 12 4 q-6 8-12-4z" fill="#d4612e"/></g></svg>`,
 night:()=>{let st='';for(let i=0;i<40;i++){const x=(i*97)%400,y=(i*53)%300,r=.6+(i%3)*.5;st+=`<circle class="tw" cx="${x}" cy="${y}" r="${r}" fill="#fff" style="animation-delay:${-(i%7)}s"/>`}
  let ff='';for(let i=0;i<8;i++)ff+=`<circle class="firefly" cx="${40+i*45}" cy="${470+(i%3)*50}" r="2.4" fill="#fff6a0" style="animation-delay:${-i*1.3}s"/>`;
  return `<svg class="bg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice"><defs>
  <linearGradient id="skyN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141a46"/><stop offset=".55" stop-color="#3d3a86"/><stop offset="1" stop-color="#8a6aa8"/></linearGradient>
  <radialGradient id="moonG" cx="22%" cy="14%" r="30%"><stop offset="0" stop-color="#fff8dc" stop-opacity=".5"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="700" fill="url(#skyN)"/><rect width="400" height="700" fill="url(#moonG)"/>${st}
  <circle cx="88" cy="96" r="26" fill="#fff6d8"/><circle cx="98" cy="90" r="24" fill="#f0e6c0" opacity=".35"/>
  <path d="M0 390 Q80 350 170 372 T400 360 V700 H0Z" fill="#2c3a6a"/>
  <g transform="translate(60 330)"><path d="M-14 120 C-10 60 -20 20 -8 -10 L8 -10 C14 30 10 70 18 120Z" fill="#3a2e3a"/><ellipse cx="2" cy="-20" rx="70" ry="44" fill="#253a3e"/><ellipse cx="-30" cy="-4" rx="36" ry="26" fill="#1f3236"/><ellipse cx="2" cy="40" rx="7" ry="10" fill="#120c18"/></g>
  <path d="M0 450 Q120 420 230 440 T400 432 V700 H0Z" fill="#24433e"/>
  <path d="M0 510 Q140 486 260 502 T400 496 V700 H0Z" fill="#1d3a30"/>
  ${grass(110,500,700,['#2f5a44','#3d6e50','#1e3e2e'],5)}${flowers(18,490,690,['#b7b3ff','#9fe3ff'],3)}${ff}</svg>`},
 dusk:()=>`<svg class="bg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice"><defs>
  <linearGradient id="skyK" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b3f8c"/><stop offset=".45" stop-color="#c46c8a"/><stop offset=".75" stop-color="#f6a66e"/><stop offset="1" stop-color="#ffd59a"/></linearGradient></defs>
  <rect width="400" height="700" fill="url(#skyK)"/><circle cx="200" cy="370" r="60" fill="#ffe0a0" opacity=".6"/>
  <g class="cloud" style="animation-duration:90s"><path d="M30 150 q10-20 36-14 q14-18 38-4 q26-2 26 16 q-4 10-20 10 h-70 q-16-2-10-8z" fill="#f7c2b0" opacity=".7"/></g>
  <path d="M0 400 Q90 360 190 384 T400 372 V700 H0Z" fill="#7a6a9a"/>
  <path d="M0 460 Q110 430 230 450 T400 440 V700 H0Z" fill="#4f7a58"/>
  <path d="M0 520 Q140 494 260 512 T400 504 V700 H0Z" fill="#3c6a46"/>
  ${grass(120,510,700,['#2f5a3a','#4f8a52','#6aa060'],9)}${flowers(30,500,690,['#ffd166','#ff8fab','#e0c0ff'],4)}</svg>`
};
// bush & tree props for discovery
const PROPS={
 bush:`<svg viewBox="0 0 200 160" class="prop"><ellipse cx="100" cy="150" rx="90" ry="10" fill="#0003"/><g class="rustle" style="transform-origin:100px 150px">
   <circle cx="60" cy="100" r="46" fill="#3f7a3e"/><circle cx="140" cy="100" r="44" fill="#376e36"/><circle cx="100" cy="70" r="52" fill="#4f8d48"/><circle cx="84" cy="56" r="20" fill="#6aa65c" opacity=".7"/>
   <path d="M150 120 q30 -8 36 -34 q-14 4 -22 10z" fill="#e8772e" class="peek-tail"/><circle cx="70" cy="90" r="4" fill="#ff8fab"/><circle cx="128" cy="76" r="4" fill="#ffd166"/></g></svg>`,
 tree:`<svg viewBox="0 0 200 260" class="prop"><ellipse cx="100" cy="252" rx="80" ry="9" fill="#0003"/><path d="M76 252 C80 180 70 130 84 80 L116 80 C126 130 120 180 126 252Z" fill="#5a4038"/>
   <path d="M90 100 C96 150 92 200 98 250" stroke="#3e2c28" stroke-width="4" fill="none"/><ellipse cx="100" cy="60" rx="92" ry="58" fill="#2d5a44"/><ellipse cx="60" cy="74" rx="44" ry="30" fill="#264d3a"/><ellipse cx="120" cy="40" rx="40" ry="24" fill="#3c7258" opacity=".8"/>
   <ellipse cx="102" cy="150" rx="18" ry="24" fill="#1a1018"/><g class="glow-eyes"><circle cx="95" cy="148" r="4.5" fill="#ffe27a"/><circle cx="109" cy="148" r="4.5" fill="#ffe27a"/></g></svg>`
};
// Pixel milestone 1: Slyte and all scene backgrounds are pixel art (pixel.js / px/). Whimber keeps its old
// vector art for now, shown in the same 48 px slot, until its pixel milestone.
window.ART={creature:(k,g)=>k==='fox'?PIXEL.slyte(g):owl(g), bg:k=>PIXEL.bg(k==='night'?'night':'dusk'), props:{bush:'',tree:''}, vectorBG:k=>BG[k]()};
// expression + reaction controller
window.setExpr=(expr,el)=>{(el?[el]:document.querySelectorAll('.echo-svg')).forEach(s=>s.setAttribute('data-expr',expr||'neutral'))};
window.react=(kind,el)=>{const c=el||document.getElementById('cr');if(!c)return;if(window.PIXEL){const px=c.querySelector('.px-echo');if(px)PIXEL.react(px,kind)}c.classList.remove('r-eat','r-happy','r-pet','r-excited','r-sad','r-sleepy');void c.offsetWidth;c.classList.add('r-'+kind);clearTimeout(c._rt);c._rt=setTimeout(()=>c.classList.remove('r-'+kind),1600)};
})();
