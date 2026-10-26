// H1: Magic Window, the on-device closest-Echo matcher (phone/web). 100% offline, RAM only: frames are sampled into one reusable
// 360x360 canvas and overwritten. Nothing is ever uploaded, stored or saved (no toDataURL, no Blob, no storage, no network).
//  Stage 0  person/face drop gate: FaceDetector (Shape Detection API, on-device) when present, plus a skin-tone gate on the
//           centre crop. Any hit drops the frame and shows the wordless "animals & toys only" badge.
//  Stage 1  closest Echo species: a native/bundled classifier via window.ECHO_VISION (iOS Vision/CoreML through Capacitor) mapped
//           through the taxonomy matrix. Without one, the web testbed uses dominant colour + shape/texture features against
//           per-species prototypes. A low-confidence result means unmatched (H2: the picker is the fallback).
//  Stage 2  OKLab colour snap: the subject's dominant coat colour snaps to the nearest chip in that Echo's family (f.chips).
//  Stage 3  is UI (game.js orCamera): freeze 120 ms, 24-note dissolve within 450 ms, home sound, then straight to orInvite().
(function(){'use strict';const W=typeof window!=='undefined'?window:globalThis;
// ---------- colour
function hex2rgb(h){h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return [(n>>16)&255,(n>>8)&255,n&255]}
function lin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
function oklab(r,g,b){const R=lin(r),G=lin(g),B=lin(b);
  const l=Math.cbrt(0.4122214708*R+0.5363325363*G+0.0514459929*B),m=Math.cbrt(0.2119034982*R+0.6806995451*G+0.1073969566*B),s=Math.cbrt(0.0883024619*R+0.2817188376*G+0.6299787005*B);
  return [0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.8086757660*s]}
const okHex=h=>oklab(...hex2rgb(h));
const dE=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// ---------- taxonomy matrix (any recognised label -> closest Echo species), for native/bundled classifiers
const TAXONOMY={
  dog:['dog'],puppy:['dog'],hound:['dog'],retriever:['dog'],terrier:['dog'],poodle:['dog'],canine:['dog','fox','wolf','coyote'],
  fox:['fox'],'red fox':['fox'],'arctic fox':['fox'],wolf:['wolf'],'grey wolf':['wolf'],husky:['wolf','dog'],coyote:['coyote'],jackal:['coyote'],dingo:['coyote'],
  bird:['bird'],songbird:['bird'],sparrow:['bird'],robin:['bird'],finch:['bird'],parrot:['bird'],owl:['owl'],duck:['duck'],goose:['duck'],swan:['duck'],
  dove:['dove'],pigeon:['pigeon'],crow:['crow'],raven:['crow'],magpie:['crow'],eagle:['eagle'],hawk:['eagle'],falcon:['eagle'],chicken:['chicken'],hen:['chicken'],rooster:['chicken'],chick:['chicken'],gull:['gull'],seagull:['gull'],penguin:['gull','duck'],
  cat:['cat'],kitten:['cat'],kitty:['cat'],feline:['cat','lion','tiger','leopard','cheetah','snowleopard','lynx'],lion:['lion'],lioness:['lion'],tiger:['tiger'],leopard:['leopard'],jaguar:['leopard'],panther:['leopard'],
  cheetah:['cheetah'],'snow leopard':['snowleopard'],lynx:['lynx'],bobcat:['lynx'],caracal:['lynx'],
  // nearest semantic neighbour for other animals and plushies
  bear:['dog'],'teddy bear':['dog'],raccoon:['fox'],squirrel:['fox'],rabbit:['cat'],bunny:['cat'],mouse:['cat'],hamster:['cat'],
  bat:['owl'],butterfly:['bird'],horse:['dog'],deer:['fox'],cow:['dog'],sheep:['dog'],pig:['dog'],
  'stuffed animal':[],plush:[],toy:[]};
function mapLabels(labels,animals){const score={};for(const L of labels||[]){const k=String(L.id||L.label||'').toLowerCase().trim(),c=+L.conf||+L.confidence||0;
    const to=TAXONOMY[k]||(animals&&animals[k]?[k]:null);if(!to||!to.length)continue;to.forEach((a,i)=>{score[a]=(score[a]||0)+c*(i===0?1:0.6)/to.length*(to.length>1?1.5:1)})}
  const r=Object.entries(score).sort((a,b)=>b[1]-a[1]);if(!r.length)return null;return {animal:r[0][0],conf:Math.min(1,r[0][1]),second:r[1]?r[1][1]:0}}
// ---------- web testbed prototypes: typical coats (hex), pattern, silhouette
const PROTO={
  dog:{coat:['#8A5A3C','#E8B860','#3B2A5C','#FFF6E6'],pattern:'solid',shape:'wide'},
  fox:{coat:['#E8772E','#D9622B'],pattern:'mask',shape:'wide'},
  wolf:{coat:['#B8B4C8','#8C8C96'],pattern:'mask',shape:'wide'},
  coyote:{coat:['#C8A070','#A88660'],pattern:'solid',shape:'wide'},
  owl:{coat:['#8A6A4C','#C8A882'],pattern:'spots',shape:'tall'},
  bird:{coat:['#4A90E2','#E84A4A','#F2D23C'],pattern:'solid',shape:'round'},
  duck:{coat:['#2E7D4F','#F2D23C','#FFF6E6'],pattern:'solid',shape:'round'},
  dove:{coat:['#FFFFFF','#EDEAF2'],pattern:'solid',shape:'round'},
  pigeon:{coat:['#8C8CA0','#6E7A8C'],pattern:'solid',shape:'round'},
  crow:{coat:['#1E1A26','#24162C'],pattern:'solid',shape:'round'},
  eagle:{coat:['#5A3C28','#FFFFFF'],pattern:'mask',shape:'tall'},
  chicken:{coat:['#FFFFFF','#C8642E','#E84A3C'],pattern:'solid',shape:'round'},
  gull:{coat:['#FFFFFF','#C8CCD4'],pattern:'mask',shape:'round'},
  cat:{coat:['#3B2A5C','#E8A060','#B8B4C8','#FFF6E6'],pattern:'solid',shape:'round'},
  lion:{coat:['#D8A458','#C88C40'],pattern:'solid',shape:'wide'},
  tiger:{coat:['#E8772E','#1E1A26'],pattern:'stripes',shape:'wide'},
  leopard:{coat:['#E8B860','#3B2A22'],pattern:'spots',shape:'wide'},
  cheetah:{coat:['#E8C078','#2A2018'],pattern:'spots',shape:'wide'},
  snowleopard:{coat:['#E8E4DC','#7A7680'],pattern:'spots',shape:'wide'},
  lynx:{coat:['#B89878','#8C7058'],pattern:'mask',shape:'round'}};
const PROTO_LAB={};for(const k in PROTO)PROTO_LAB[k]=PROTO[k].coat.map(okHex);
// ---------- features from an RGBA frame (w*h*4). Pure: testable in node with synthetic frames.
function features(px,w,h){
  // border mean = background estimate; foreground = pixels far from it in OKLab
  let br=0,bg=0,bb=0,bn=0;const step=Math.max(1,Math.floor(w/60));
  for(let x=0;x<w;x+=step){for(const y of [0,1,h-2,h-1]){const i=(y*w+x)*4;br+=px[i];bg+=px[i+1];bb+=px[i+2];bn++}}
  for(let y=0;y<h;y+=step){for(const x of [0,1,w-2,w-1]){const i=(y*w+x)*4;br+=px[i];bg+=px[i+1];bb+=px[i+2];bn++}}
  const bgLab=oklab(br/bn,bg/bn,bb/bn);
  let minX=w,minY=h,maxX=0,maxY=0,fg=0,tot=0;const fgLabs=[];let lumPrev=null,edges=0,edgeN=0,skin=0,center=0;
  const s2=Math.max(1,Math.floor(w/90));
  for(let y=0;y<h;y+=s2){lumPrev=null;for(let x=0;x<w;x+=s2){const i=(y*w+x)*4,r=px[i],g=px[i+1],b=px[i+2],L=oklab(r,g,b);tot++;
      const inC=x>w*.25&&x<w*.75&&y>h*.2&&y<h*.8;if(inC){center++;const Y=.299*r+.587*g+.114*b,Cb=128-.168736*r-.331264*g+.5*b,Cr=128+.5*r-.418688*g-.081312*b;if(Y>60&&Cb>=77&&Cb<=127&&Cr>=133&&Cr<=173)skin++}
      if(dE(L,bgLab)>0.09){fg++;fgLabs.push(L);if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
        if(lumPrev!=null){edgeN++;if(Math.abs(L[0]-lumPrev)>0.12)edges++}lumPrev=L[0]}else lumPrev=null}}
  const fgFrac=fg/Math.max(1,tot);
  // 2-means on foreground lightness/colour -> dominant + secondary coat
  let c1=fgLabs[0]||bgLab,c2=fgLabs[Math.floor(fgLabs.length/2)]||bgLab;
  for(let it=0;it<6&&fgLabs.length;it++){let a=[0,0,0,0],b=[0,0,0,0];for(const L of fgLabs){const t=dE(L,c1)<=dE(L,c2)?a:b;t[0]+=L[0];t[1]+=L[1];t[2]+=L[2];t[3]++}
    if(a[3])c1=[a[0]/a[3],a[1]/a[3],a[2]/a[3]];if(b[3])c2=[b[0]/b[3],b[1]/b[3],b[2]/b[3]];if(it===5){c1.n=a[3];c2.n=b[3]}}
  let dom=c1,sec=c2;if((c2.n||0)>(c1.n||0)){dom=c2;sec=c1}
  const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY);
  return {fgFrac,aspect:bw/bh,dom,sec,secFrac:(sec.n||0)/Math.max(1,fgLabs.length),texture:edges/Math.max(1,edgeN),skinFrac:skin/Math.max(1,center),contrast:dE(dom,sec)}}
function patternOf(f){if(f.contrast<0.12||f.secFrac<0.12)return 'solid';if(f.texture>0.18)return f.aspect>1.15?'stripes':'spots';return 'mask'}
function shapeOf(f){return f.aspect<0.8?'tall':f.aspect>1.3?'wide':'round'}
function classify(f,opts){opts=opts||{};if(!f||f.fgFrac<0.08||f.fgFrac>0.92)return {animal:null,conf:0,reason:'no_subject'};
  const pat=patternOf(f),shp=shapeOf(f),out=[];
  for(const k in PROTO){const P=PROTO[k],coat=Math.min(...PROTO_LAB[k].map(c=>dE(c,f.dom)));
    let s=-coat*6;if(P.pattern===pat)s+=0.6;else if(P.pattern!=='solid'&&pat!=='solid')s+=0.2;if(P.shape===shp)s+=0.45;out.push([k,s])}
  out.sort((a,b)=>b[1]-a[1]);const margin=out[0][1]-out[1][1];const conf=Math.max(0,Math.min(1,0.35+margin*1.2));
  return {animal:out[0][0],conf,second:out[1][0],pattern:pat,shape:shp,ranked:out.slice(0,5)}}
// Stage 2: OKLab snap to the family's chips (real chips first; toy chips only if clearly closer)
function snapChip(fam,lab){const chips=(fam&&fam.chips)||[];let best=null,bd=1e9;for(const c of chips){const d=dE(okHex(c.hex),lab)+(c.real?0:0.05);if(d<bd){bd=d;best=c}}return best?{chip:best,dE:+bd.toFixed(4)}:null}
// Stage 0: person gate on one frame (FaceDetector result count + skin fraction)
// H1 (conservative, PM Oct 25): when in doubt, show the picker rather than mis-match.
//  - SKIN_GATE: frames with more skin tone than this in the centre are dropped as "person" (badge shows).
//  - DOUBT_SKIN: frames between DOUBT_SKIN and SKIN_GATE are "doubtful": never analysed, never vote, and they break a streak.
//  - a match needs STREAK consecutive frames >= CONF_MIN on the same species AND a clean session (person+doubt frames <= 15% of the scan).
const SKIN_GATE=0.30,DOUBT_SKIN=0.14,DOUBT_MAX=0.15;
function personGate(f,faces){return (faces||0)>0||(f&&f.skinFrac>SKIN_GATE)}
function doubtful(f){return !!f&&f.skinFrac>DOUBT_SKIN}
// streak voting: a match needs STREAK consecutive confident frames agreeing on the species
const CONF_MIN=0.70,STREAK=4,SCAN_TIMEOUT_MS=12000,FPS=2.5,SIZE=360;
function voter(){let last=null,n=0;return {push(r){if(!r||!r.animal||r.conf<CONF_MIN){last=null;n=0;return null}if(r.animal===last)n++;else{last=r.animal;n=1}return n>=STREAK?last:null},reset(){last=null;n=0}}}
// one scan decision over a sequence of frames (pure; the live loop uses the same steps). frame: {f:features, faces, r?:classify result}
// returns {animal,frames} on a match or {animal:null,reason:'person'|'doubt'|'timeout',frames}
function decide(frames,maxFrames){const V=voter();let n=0,person=0,doubt=0;const cap=maxFrames||Math.round(SCAN_TIMEOUT_MS/1000*FPS);
  for(const fr of frames){if(n>=cap)break;n++;
    if(personGate(fr.f,fr.faces)){person++;V.reset();continue}
    if(doubtful(fr.f)){doubt++;V.reset();continue}
    const hit=V.push(fr.r||classify(fr.f));if(hit){if((person+doubt)/n>DOUBT_MAX)return {animal:null,reason:person?'person':'doubt',frames:n};return {animal:hit,frames:n}}}
  return {animal:null,reason:person>n/2?'person':doubt>n/2?'doubt':'timeout',frames:n}}
// ---------- live session (browser only). cb: {onState(s), onMatch({animal,family,chip,conf}), onUnmatched(reason), onPerson(bool)}
function supported(){return !!(W.navigator&&W.navigator.mediaDevices&&W.navigator.mediaDevices.getUserMedia)}
function start(video,families,cb){cb=cb||{};let stream=null,timer=null,dead=false,t0=Date.now(),nFr=0,nDoubt=0;const V=voter();
  const cv=W.document.createElement('canvas');cv.width=SIZE;cv.height=SIZE;const cx=cv.getContext('2d',{willReadFrequently:true});
  const FD=W.FaceDetector?new W.FaceDetector({fastMode:true,maxDetectedFaces:1}):null;
  function stop(){dead=true;clearInterval(timer);if(stream)stream.getTracks().forEach(t=>{try{t.stop()}catch(e){}});stream=null;if(video){try{video.srcObject=null}catch(e){}}try{cx.clearRect(0,0,SIZE,SIZE)}catch(e){}}
  async function tick(){if(dead||!video||video.readyState<2)return;
    const vw=video.videoWidth,vh=video.videoHeight,s=Math.min(vw,vh);cx.drawImage(video,(vw-s)/2,(vh-s)/2,s,s,0,0,SIZE,SIZE);
    let faces=0;if(FD){try{faces=(await FD.detect(cv)).length}catch(e){}}
    const img=cx.getImageData(0,0,SIZE,SIZE),f=features(img.data,SIZE,SIZE);
    if(personGate(f,faces)){nFr++;nDoubt++;cx.clearRect(0,0,SIZE,SIZE);V.reset();cb.onPerson&&cb.onPerson(true);return}   // dropped immediately, never analysed further
    cb.onPerson&&cb.onPerson(false);nFr++;if(doubtful(f)){nDoubt++;cx.clearRect(0,0,SIZE,SIZE);V.reset();return}   // H1: in doubt -> no vote
    let r=null;if(W.ECHO_VISION&&W.ECHO_VISION.classify){try{const out=await W.ECHO_VISION.classify(img);r=mapLabels(out&&out.labels,families.animals)}catch(e){r=null}}
    if(!r)r=classify(f);cx.clearRect(0,0,SIZE,SIZE);
    const hit=V.push(r);if(hit&&nDoubt/Math.max(1,nFr)>DOUBT_MAX){stop();cb.onUnmatched&&cb.onUnmatched('doubt');return}if(hit){const A=families.animals[hit],fam=families[A.family],sn=snapChip(fam,f.dom);stop();cb.onMatch&&cb.onMatch({animal:hit,family:A.family,chip:sn&&sn.chip,conf:r.conf});return}
    if(Date.now()-t0>SCAN_TIMEOUT_MS){stop();cb.onUnmatched&&cb.onUnmatched('timeout')}}
  W.navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:640}},audio:false}).then(s=>{if(dead){s.getTracks().forEach(t=>t.stop());return}stream=s;video.srcObject=s;video.setAttribute('playsinline','');video.muted=true;
    const p=video.play();if(p&&p.catch)p.catch(()=>{});cb.onState&&cb.onState('scanning');timer=setInterval(tick,Math.round(1000/FPS))})
   .catch(e=>{dead=true;cb.onUnmatched&&cb.onUnmatched(e&&e.name==='NotAllowedError'?'denied':'no_camera')});
  return {stop,get live(){return !dead}}}
const API={oklab,okHex,dE,hex2rgb,TAXONOMY,mapLabels,PROTO,features,classify,patternOf,shapeOf,snapChip,personGate,voter,supported,start,
  CONF_MIN,STREAK,SCAN_TIMEOUT_MS,FPS,SIZE,SKIN_GATE,DOUBT_SKIN,DOUBT_MAX,doubtful,decide};
W.CamMatch=API;if(typeof module!=='undefined')module.exports=API;
})();
