// Batch C (sound & song Echoes): pixel music-note effects. Sheets px/fx/notes_<slyte|whimber>.png: 12x12 cells,
// col = glyph*3 + fade (glyphs: 0 eighth, 1 beamed, 2 clef, 3 sparkle-note; fades: 0 full, 1 dither50, 2 dither25), row = tint 0-3.
// burst(): the bond-up note burst (every bond-up, no fail state). release(): the ending, the Echo dissolves into a cloud of
// notes that drifts off toward the wild. All motion in integer pixels at the app's 12 fps (83 ms), deterministic per seed.
(function(root){
const CELL=12,FPS_MS=83,BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const FAMS=root.FAMILIES,TINT={},ROW0={},SHEET={};   // per family from the manifests (families/<id>.json aura.notes {sheet,tints,row0})
if(FAMS)for(const f of FAMS.order){const n=FAMS[f].notes;if(n){TINT[f]=n.tints;ROW0[f]=n.row0;SHEET[f]=n.sheet}}
const imgs={};
const FAM=f=>TINT[f]?f:Object.keys(TINT)[0];   // unknown family -> the first family's notes
function sheet(fam){fam=FAM(fam);if(!imgs[fam]&&typeof Image!=='undefined'){const i=new Image();i.src=SHEET[fam]||('px/fx/notes_'+fam+'.png');imgs[fam]=i}return imgs[fam]}
function rng(seed){let a=(seed|0)||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pick(R,w){let r=R()*w.reduce((a,b)=>a+b,0);for(let i=0;i<w.length;i++){if((r-=w[i])<0)return i}return 0}
function stamp(cx,img,g,fade,tint,x,y){if(img&&img.complete!==false&&(img.naturalWidth||img.width))cx.drawImage(img,(g*3+fade)*CELL,tint*CELL,CELL,CELL,Math.round(x)-6,Math.round(y)-6,CELL,CELL)}
// ---- Batch C v1.1: each Echo's OWN colours (Daniel, Oct 18) ----------------------------------------------------------------
// colours({pal, img, sx, sy} | {pal, data}): 4 tints = [aura glow, body, glow lightened, body lightened]. The aura glow comes from
// px/aura.json roles[pal].glow (PIXEL.AURA, the same role glow v1 draws; pal = the sprite's data-pal, i.e. the look/colour choice).
// The body colour is the most common coat pixel of the Echo's own 48x48 frame (plum ink, whites and cream skipped). Dark coats are
// lifted toward cream until they read on the night sky (never pure black). tinted(fam, cols): the family sheet's row 0 palette-swapped
// into those 4 rows (base -> tint, shade -> tint mixed 35 % toward plum ink); 11 colours + transparent, cached per colour set.
const INK=[0x3B,0x2A,0x5C],CRM=[0xFF,0xF1,0xC4],WH=[255,255,255];
const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t)),lum=c=>(.2126*c[0]+.7152*c[1]+.0722*c[2])/255;
function lift(c){for(let k=0;k<6&&lum(c)<.42;k++)c=mix(c,CRM,.2);return c.map(v=>Math.max(8,v))}
function bodyOf(d){if(!d)return null;const n={};let best=null,bn=0;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<255)continue;const r=d[i],g=d[i+1],b=d[i+2];
    if(Math.abs(r-INK[0])+Math.abs(g-INK[1])+Math.abs(b-INK[2])<40||Math.min(r,g,b)>225)continue;const k=r<<16|g<<8|b;n[k]=(n[k]||0)+1;if(n[k]>bn){bn=n[k];best=k}}
  return best==null?null:[best>>16&255,best>>8&255,best&255]}
function frameData(img,sx,sy){try{if(!img||!(img.naturalWidth||img.width))return null;const c=document.createElement('canvas');c.width=48;c.height=48;
  const k=c.getContext('2d');k.drawImage(img,sx||0,sy||0,48,48,0,0,48,48);return k.getImageData(0,0,48,48).data}catch(e){return null}}
function colours(o){o=o||{};const A=root.PIXEL&&PIXEL.AURA,role=A&&A.roles&&A.roles[o.pal],glow=role&&role.glow?hx(role.glow):null;
  const body=bodyOf(o.data||frameData(o.img,o.sx,o.sy)),fb=hx(TINT[FAM(o.fam)][0]);
  const g=lift(glow||body||fb),b=lift(body||glow||fb);return [g,b,mix(g,WH,.4),mix(b,CRM,.45)]}
const TCACHE={};
function tinted(fam,cols){fam=FAM(fam);const base=sheet(fam);if(!cols||!base||!base.complete||!base.naturalWidth)return null;
  const key=fam+cols.join('|');if(TCACHE[key])return TCACHE[key];
  const c=document.createElement('canvas');c.width=base.naturalWidth;c.height=base.naturalHeight;const k=c.getContext('2d');
  const [b0,s0]=ROW0[fam].map(hx);k.drawImage(base,0,0,c.width,CELL,0,0,c.width,CELL);const row=k.getImageData(0,0,c.width,CELL);
  cols.forEach((t,r)=>{const sh=mix(t,INK,.35),out=new ImageData(new Uint8ClampedArray(row.data),c.width,CELL),d=out.data;
    for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const m=(q)=>d[i]===q[0]&&d[i+1]===q[1]&&d[i+2]===q[2];
      if(m(b0)){d[i]=t[0];d[i+1]=t[1];d[i+2]=t[2]}else if(m(s0)){d[i]=sh[0];d[i+1]=sh[1];d[i+2]=sh[2]}}
    k.putImageData(out,0,r*CELL)});
  return TCACHE[key]=c}
// ---- C1 bond-up burst -------------------------------------------------------------------------------------------------
// Spec: 18 notes (8 in reduced effects) in 2 waves: 12 at frame 0 evenly round 360 deg (+-10 deg jitter), 6 at frame 2 on the
// gaps. Launch 6.5-8.5 world px/frame (wave 2: 5-7; reduced 4-6), drag x0.82 per frame (reach ~35-47 world px = x3 on screen under
// the bond-up zoom, i.e. clear of the zoomed Echo), lift -0.14 px/frame^2 (notes float up as they slow),
// spawn on a 10 px ring round the face centre; arc: heading turns 0.03-0.06 rad/frame (alternating sign) + 1 px sine bob. Life 12-15 frames; dither50 for frames 5-3 before the end,
// dither25 for the last 2. Whole burst <= 17 frames = 1.42 s. Glyph mix 40 % eighth, 25 % beamed, 25 % sparkle,
// 10 % clef (max 2 clefs); tints cycle 0-3 so every family colour shows.
function burst(o){o=o||{};const R=rng(o.seed||7),n=o.n||(o.lowfx?8:18),w1=o.lowfx?n:Math.round(n*2/3),P=[];let clefs=0;
  for(let i=0;i<n;i++){const wave=i<w1?0:1,k=wave?i-w1:i,m=wave?n-w1:w1;
    let g=pick(R,[40,25,10,25]);if(g===2&&++clefs>2)g=0;
    P.push({a:(k+(wave?.5:0))/m*Math.PI*2+(R()-.5)*.35,sp:(o.lowfx?4:wave?5:6.5)+R()*2,turn:(i%2?1:-1)*(.03+R()*.03),
      ph:R()*6.28,g,t:i%4,d:wave?2:0,life:12+(R()*4|0)})}
  return {P,x:o.x||0,y:o.y||0,fam:o.fam,cols:o.cols||(o.pal||o.img||o.data?colours(o):null),len:Math.max(...P.map(p=>p.d+p.life))}}
function pos(p,k,x0,y0){let x=x0+Math.cos(p.a)*10,y=y0+Math.sin(p.a)*10,v=p.sp,a=p.a;for(let j=0;j<k;j++){x+=Math.cos(a)*v;y+=Math.sin(a)*v-.14*j;v*=.82;a+=p.turn}
  return [x+Math.sin(k*.9+p.ph),y]}
function drawBurst(cx,b,t,ox,oy){const img=tinted(b.fam,b.cols)||sheet(b.fam);let live=0;   // t = frames since the burst started
  for(const p of b.P){const k=t-p.d;if(k<0||k>=p.life)continue;live++;const [x,y]=pos(p,k,ox==null?b.x:ox,oy==null?b.y:oy),left=p.life-k;
    stamp(cx,img,p.g,left<=2?2:left<=5?1:0,p.t,x,y)}return live}
// ---- C2 release: dissolve into notes, drift to the wild -------------------------------------------------------------------
// o: {parent (scene el, 180x320 space), el (.px-echo), fam, to:[x,y] the wild (off-screen point), seed, lowfx, onDone, manual}
// Beats (12 fps): S sing f0-5 (hop + 3 notes pop from the head) | D dissolve f6-19 (top-down dithered, each 8x8 cell spawns notes
// as it empties, emptied pixels flash cream for 1 frame) | F drift f6-~46 (notes rise, then steer to the wild with a sine bob,
// 1.4 -> 4.4 px/frame, dither out near the edge) | A answer: the last note twinkles 3x at the treeline, done ~f54 (4.5 s).
function release(o){o=o||{};const R=rng(o.seed||11),low=!!o.lowfx,fam=FAM(o.fam);let img=sheet(fam),cols=null;
  const cv=document.createElement('canvas');cv.width=180;cv.height=320;cv.className='notefx';
  cv.style.cssText='position:absolute;left:0;top:0;width:180px;height:320px;pointer-events:none;z-index:40;image-rendering:pixelated';
  const par=o.parent;par.appendChild(cv);const cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
  // the Echo's current 48x48 frame, read from its sprite sheet at its current background-position
  const el=o.el,PR=par.getBoundingClientRect(),z=PR.width/180||1,ER=el.getBoundingClientRect();
  const ex=Math.round((ER.left-PR.left)/z),ey=Math.round((ER.top-PR.top)/z),src=document.createElement('canvas');src.width=48;src.height=48;
  const sx=src.getContext('2d'),m=/url\("?([^")]+)"?\)/.exec(el.style.backgroundImage||getComputedStyle(el).backgroundImage||''),bp=(el.style.backgroundPosition||'0px 0px').split(' ').map(v=>-parseInt(v)||0);
  let pix=null;const si=new Image();si.onload=()=>{sx.drawImage(si,bp[0],bp[1],48,48,0,0,48,48);pix=sx.getImageData(0,0,48,48);
    cols=o.cols||colours({fam,pal:o.pal||el.dataset.pal,data:pix.data});img=tinted(fam,cols)||img};if(m)si.src=m[1];
  const to=o.to||[200,ey-20],N=[],thr=new Float32Array(48*48),gone=new Uint8Array(48*48),cellLeft={};
  for(let y=0;y<48;y++)for(let x=0;x<48;x++)thr[y*48+x]=.6*(y/48)+.4*BAYER[y&3][x&3]/16;   // head first, paws last
  const tintOf=(r,g,b)=>{let best=0,bd=1e9;(cols||TINT[fam].map(hx)).forEach((c,i)=>{const d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<bd){bd=d;best=i}});return best};   // nearest of the Echo's own 4 tints
  const MAX=low?12:30;let f=0,done=false,timer=null;
  function spawn(x,y,tint,delay,up){if(N.length>=MAX)return;N.push({x,y,vx:(R()-.5)*4,vy:-(up||1.6)-R()*1.6,g:pick(R,[40,25,10,25]),t:tint,
    ph:R()*6.28,ty:to[1]+(R()-.5)*120,k:.6+R()*.8,s0:5+R()*8,d:delay||0,age:0,out:0})}
  function step(){if(done)return;cx.clearRect(0,0,180,320);if(cols&&img===imgs[fam])img=tinted(fam,cols)||img;
    if(f===0)el.style.visibility='hidden';
    if(pix){const d=pix.data,hop=f>=1&&f<=4?[1,2,2,1][f-1]:0;
      if(f<6){if(f===2)for(let i=0;i<3;i++)spawn(ex+18+i*6,ey+8,i%4,0,2.2);}
      const p=low?Math.min(1,Math.max(0,(f-6)/4)):Math.max(0,(f-6)/13),im=cx.createImageData(48,48),od=im.data;
      for(let i=0;i<48*48;i++){if(!d[i*4+3])continue;const x=i%48,y=i/48|0,t=low?BAYER[y&3][x&3]/16:thr[i];
        if(p>t){if(!gone[i]){gone[i]=1;const c=(y>>3)*6+(x>>3);cellLeft[c]=(cellLeft[c]||0)+1;
            if(!low&&cellLeft[c]%14===7)spawn(ex+x,ey+y,tintOf(d[i*4],d[i*4+1],d[i*4+2]),0);
            if(!low){od[i*4]=0xFF;od[i*4+1]=0xF1;od[i*4+2]=0xC4;od[i*4+3]=255}}continue}
        od[i*4]=d[i*4];od[i*4+1]=d[i*4+1];od[i*4+2]=d[i*4+2];od[i*4+3]=255}
      if(low&&f===6)for(let i=0;i<10;i++)spawn(ex+10+R()*28,ey+8+R()*30,i%4,i);
      const tmp=document.createElement('canvas');tmp.width=48;tmp.height=48;tmp.getContext('2d').putImageData(im,0,0);cx.drawImage(tmp,ex,ey-hop)}
    let live=0;
    for(const n of N){if(n.d>0){n.d--;live++;continue}if(n.out>=3)continue;live++;n.age++;
      const dx=to[0]-n.x,dy=n.ty-n.y,dl=Math.hypot(dx,dy)||1,sp=Math.min(4.4,(low?1:1.4)+n.age*.13)*n.k,steer=Math.min(1,Math.max(0,(n.age-n.s0)/12));
      n.vx=n.vx*.9*(1-steer*.3)+dx/dl*sp*steer*.3;n.vy=n.vy*.9*(1-steer*.3)+dy/dl*sp*steer*.3;
      n.x+=n.vx;n.y+=n.vy;const off=n.x<-6||n.x>186||n.y<-6||n.y>326;if(off||dl<24||n.age>40)n.out++;
      stamp(cx,img,n.g,n.out?Math.min(2,n.out):0,n.t,n.x,n.y+Math.sin(n.age*.6+n.ph)*2)}
    const allOut=f>20&&!live;   // A: the answer twinkle at the treeline, on-screen point nearest the wild
    if(allOut){const k=f-(A0=A0||f),ax=Math.max(8,Math.min(172,to[0])),ay=Math.max(8,Math.min(312,to[1]));if(k<8){if((k>>1)%2===0)stamp(cx,img,3,k<6?0:1,0,ax-6,ay)}else return finish()}
    f++;if(f>90)return finish();if(!o.manual)timer=setTimeout(step,FPS_MS)}
  let A0=0;
  function finish(){if(done)return;done=true;clearTimeout(timer);cv.remove();o.onDone&&o.onDone()}
  if(!o.manual)si.decode?si.decode().then(()=>step(),()=>step()):setTimeout(step,0);
  return {step,finish,get frame(){return f},canvas:cv,get ready(){return !!pix}}}
// ---- C2 arrival (Zane, Oct 18): the release in reverse. Notes in the Echo's own colours converge from a loose ring onto the
// sprite, which resolves from the paws up (each pixel flashes cream for 1 frame as it lands), head last; no light or sparkle.
// o: {el (.px-echo, positioned inside its offsetParent), fam, pal, seed, lowfx, onDone, manual}. ~1.8 s (reduced: 8 notes, ~1 s).
function arrive(o){o=o||{};const R=rng(o.seed||13),low=!!o.lowfx,fam=FAM(o.fam),el=o.el,par=el&&el.offsetParent;let img=sheet(fam),cols=null;
  if(!el||!par){o.onDone&&o.onDone();return null}
  const k=(el.offsetWidth||48)/48,W=144,cv=document.createElement('canvas');cv.width=W;cv.height=W;cv.className='notefx notearrive';
  cv.style.cssText=`position:absolute;left:${el.offsetLeft-48*k}px;top:${el.offsetTop-48*k}px;width:${W*k}px;height:${W*k}px;pointer-events:none;z-index:3;image-rendering:pixelated`;
  par.appendChild(cv);const cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;el.style.visibility='hidden';
  const src=document.createElement('canvas');src.width=48;src.height=48;const sc=src.getContext('2d');
  const m=/url\("?([^")]+)"?\)/.exec(el.style.backgroundImage||getComputedStyle(el).backgroundImage||''),bp=(el.style.backgroundPosition||'0px 0px').split(' ').map(v=>-parseInt(v)||0);
  let pix=null;const si=new Image();si.onload=()=>{sc.drawImage(si,bp[0],bp[1],48,48,0,0,48,48);pix=sc.getImageData(0,0,48,48);
    cols=o.cols||colours({fam,pal:o.pal||el.dataset.pal,data:pix.data});img=tinted(fam,cols)||img};if(m)si.src=m[1];
  const thr=new Float32Array(48*48);for(let y=0;y<48;y++)for(let x=0;x<48;x++)thr[y*48+x]=.6*(1-y/48)+.4*BAYER[y&3][x&3]/16;   // paws first, head last
  const n=low?8:18,N=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2+(R()-.5)*.4,r=52+R()*16,tx=48+8+R()*32,ty=48+6+(i/n)*36;
    N.push({sx:72+Math.cos(a)*r,sy:72+Math.sin(a)*r,tx,ty,g:pick(R,[40,25,10,25]),t:i%4,d:(i%6),life:(low?6:10)+(R()*3|0),ph:R()*6.28})}
  const T0=low?6:9,TD=low?4:12;let f=0,done=false,timer=null;const lit=new Uint8Array(48*48);
  function step(){if(done)return;cx.clearRect(0,0,W,W);if(cols&&img===imgs[fam])img=tinted(fam,cols)||img;
    for(const q of N){const kk=f-q.d;if(kk<0||kk>q.life)continue;const e=kk/q.life,ee=1-(1-e)*(1-e),x=q.sx+(q.tx-q.sx)*ee,y=q.sy+(q.ty-q.sy)*ee+Math.sin(kk*.9+q.ph);
      stamp(cx,img,q.g,kk>=q.life-1?2:kk>=q.life-3?1:0,q.t,x,y)}
    if(pix&&f>=T0){const p=low?Math.min(1,(f-T0)/TD):Math.min(1,(f-T0)/TD),d=pix.data,im=cx.createImageData(48,48),od=im.data;
      for(let i=0;i<48*48;i++){if(!d[i*4+3])continue;const t=low?BAYER[(i/48|0)&3][(i%48)&3]/16:thr[i];if(p<=t&&p<1)continue;
        const fl=!low&&!lit[i];lit[i]=1;od[i*4]=fl?0xFF:d[i*4];od[i*4+1]=fl?0xF1:d[i*4+1];od[i*4+2]=fl?0xC4:d[i*4+2];od[i*4+3]=255}
      const tmp=document.createElement('canvas');tmp.width=48;tmp.height=48;tmp.getContext('2d').putImageData(im,0,0);cx.drawImage(tmp,48,48)}
    f++;if((pix&&f>T0+TD+1&&f>Math.max(...N.map(q=>q.d+q.life))+1)||f>60)return finish();if(!o.manual)timer=setTimeout(step,FPS_MS)}
  function finish(){if(done)return;done=true;clearTimeout(timer);el.style.visibility='';cv.remove();o.onDone&&o.onDone()}
  if(!o.manual)si.decode?si.decode().then(()=>step(),()=>step()):setTimeout(step,0);
  return {step,finish,get frame(){return f},canvas:cv}}
const API={burst,drawBurst,release,arrive,sheet,colours,tinted,CELL,TINT};root.NoteFX=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
