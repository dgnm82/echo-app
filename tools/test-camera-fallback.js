#!/usr/bin/env node
// H1 (conservative gate): synthetic Magic Window scans through CamMatch.decide() (same steps as the live loop).
// Reports how often a scan falls back to the picker, per scenario. Rule: any scan with a person / skin in doubt must fall back
// (never a match); clean toy scans may match or fall back, but a match must be the right species family.
// Usage: node tools/test-camera-fallback.js
const fs=require('fs'),path=require('path'),vm=require('vm');const R=path.join(__dirname,'..');
const W={console,Math,Date,JSON};W.window=W;vm.createContext(W);for(const f of ['families.js','camera_match.js'])vm.runInContext(fs.readFileSync(path.join(R,f),'utf8'),W,{filename:f});
const C=W.CamMatch,F=W.FAMILIES;let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function frame(o){const w=90,h=90,px=new Uint8ClampedArray(w*h*4);const j=o.jitter||0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;let c=o.bg;const B=o.box;
    if(B&&x>=B[0]&&x<B[2]&&y>=B[1]&&y<B[3])c=o.stripe&&((x>>2)%2)?o.stripe:o.spot&&((x>>2)%2)&&((y>>2)%2)?o.spot:o.fg;
    if(o.skin&&x>=o.skin[0]&&x<o.skin[2]&&y>=o.skin[1]&&y<o.skin[3])c=[224,172,140];
    const d=j?Math.round((rnd()-.5)*j):0;px[i]=c[0]+d;px[i+1]=c[1]+d;px[i+2]=c[2]+d;px[i+3]=255}
  return {f:C.features(px,w,h),faces:o.faces||0}}
const BG=[[60,140,70],[70,80,120],[200,200,190]];
const TOYS=[['tiger',{fg:hx('#E8772E'),stripe:hx('#1E1A26'),box:[10,30,82,64]}],['fox',{fg:[232,119,46],box:[15,30,80,65]}],['crow',{fg:hx('#1E1A26'),box:[25,20,65,70]}],
  ['dove',{fg:hx('#FFFFFF'),box:[25,22,65,68]}],['duck',{fg:hx('#2E7D4F'),box:[25,22,65,68]}],['lion',{fg:hx('#D8A458'),box:[8,30,84,62]}]];
const SC={clean:[],hand:[],person:[],face:[],empty:[]};
for(const [want,t] of TOYS)for(const bg of BG){
  SC.clean.push({want,frames:Array.from({length:12},()=>frame({...t,bg,jitter:10}))});
  SC.hand.push({want,frames:Array.from({length:12},(_,i)=>frame({...t,bg,jitter:10,skin:i%3===0?[30,40,60,70]:null}))});     // a hand in 1 of 3 frames
  SC.person.push({want:null,frames:Array.from({length:12},()=>frame({bg,fg:[224,172,140],box:[15,10,75,85],jitter:10}))});
  SC.face.push({want:null,frames:Array.from({length:12},()=>frame({...t,bg,jitter:10,faces:1}))});
  SC.empty.push({want:null,frames:Array.from({length:12},()=>frame({bg,jitter:6}))})}
const fam=a=>a&&F.animals[a]&&F.animals[a].family;let tot=0,fb=0;const rows=[];
for(const [k,L] of Object.entries(SC)){let f=0,m=0,wrong=0;for(const s of L){const r=C.decide(s.frames);if(!r.animal)f++;else{m++;if(!s.want||fam(r.animal)!==fam(s.want))wrong++}}
  tot+=L.length;fb+=f;rows.push(`${k}: ${f}/${L.length} fell back to the picker (${Math.round(100*f/L.length)}%), ${m} matched, ${wrong} wrong`);
  if(k!=='clean')ok(m===0,`H1: ${k} scans never match (person/doubt/empty -> picker)`);else ok(wrong===0,'H1: clean toy matches are the right family')}
ok(C.SKIN_GATE<=0.30&&C.DOUBT_SKIN<C.SKIN_GATE&&C.CONF_MIN>=0.7&&C.STREAK>=4,'H1: conservative thresholds');
console.log(rows.join('\n'));console.log(`fallback overall: ${fb}/${tot} (${Math.round(100*fb/tot)}%)`);
console.log(bad?`camera fallback: ${n} checks, ${bad} failed`:`camera fallback: ${n} checks, 0 failed`);process.exit(bad?1:0);
