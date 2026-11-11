#!/usr/bin/env node
// Regression for the live-video SCAN_TIMEOUT bug (Daniel, Nov 4).
// Core A/B failed on d4d6dcfe (timeout check sat behind tick() early returns).
// After the fix, a single timer armed in start() and cleared in stop() fires
// timeout even when frames are person/doubt or readyState stays <2.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let now = 1_000_000;
const intervals = new Map();
const timeouts = new Map();
let nextId = 1;
const timers = {
  Date: {now: () => now},
  setInterval(fn, ms){const id=nextId++; intervals.set(id,{fn,ms,next:now+ms}); return id},
  clearInterval(id){intervals.delete(id)},
  setTimeout(fn, ms){const id=nextId++; timeouts.set(id,{fn,at:now+Math.max(0,ms|0)}); return id},
  clearTimeout(id){timeouts.delete(id)}
};
function fill(w,h,rgb){
  const p=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<p.length;i+=4){p[i]=rgb[0];p[i+1]=rgb[1];p[i+2]=rgb[2];p[i+3]=255}
  return p;
}
function loadCam({pixels, readyState, hangGetUserMedia, vision, families}={}){
  const SIZE=360;
  const px=pixels||fill(SIZE,SIZE,[40,140,50]);
  const ctx2d={drawImage(){}, clearRect(){}, getImageData(){return {data:px,width:SIZE,height:SIZE}}};
  const document={createElement(tag){if(tag!=='canvas')return {};return {width:SIZE,height:SIZE,getContext(){return ctx2d}}}};
  const stream={getTracks(){return [{stop(){},readyState:'live'}]}};
  const navigator={mediaDevices:{getUserMedia(){return hangGetUserMedia?new Promise(()=>{}):Promise.resolve(stream)}}};
  const sandbox={
    window:{document,navigator,FaceDetector:undefined,ECHO_VISION:vision||undefined},
    document, navigator,
    module:{exports:{}}, Date:timers.Date, Math, console,
    setInterval:timers.setInterval, clearInterval:timers.clearInterval,
    setTimeout:timers.setTimeout, clearTimeout:timers.clearTimeout,
    Uint8ClampedArray, Promise
  };
  sandbox.globalThis=sandbox.window;
  sandbox.window.navigator=navigator;
  sandbox.window.document=document;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'camera_match.js'),'utf8'), sandbox);
  const Cam=sandbox.module.exports;
  const video={
    readyState: readyState==null?4:readyState,
    videoWidth:640, videoHeight:480, srcObject:null, muted:true,
    setAttribute(){}, play(){return Promise.resolve()}
  };
  return {Cam, video, families:families||{animals:{fox:{family:'slyte'}},slyte:{chips:[{id:'c',hex:'#E8772E',real:1}]}}};
}
async function flush(){for(let i=0;i<12;i++)await Promise.resolve()}
async function advance(ms){
  const end=now+ms;
  while(now<end){
    now+=50;
    for(const [id,it] of [...timeouts]){
      if(now>=it.at){timeouts.delete(id); const r=it.fn(); if(r&&typeof r.then==='function')await r}
    }
    for(const it of intervals.values()){
      if(now>=it.next){it.next+=it.ms; const r=it.fn(); if(r&&typeof r.then==='function')await r}
    }
    await flush();
  }
}
function track(){
  const ev=[];
  return {
    ev,
    cb:{onUnmatched:r=>{ev.push(['unmatched',r])}, onMatch:m=>{ev.push(['match',m&&m.animal])}, onState(){}, onPerson(){}},
    unmatched:()=>ev.filter(e=>e[0]==='unmatched').map(e=>e[1]),
    matches:()=>ev.filter(e=>e[0]==='match').map(e=>e[1])
  };
}
async function runScan(opts){
  const {Cam,video,families}=loadCam(opts);
  const t=track();
  const sess=Cam.start(video,families,t.cb);
  await flush(); await advance(50); await flush();
  await advance((opts.ms!=null?opts.ms:Cam.SCAN_TIMEOUT_MS+1500));
  if(!opts.leaveRunning)sess.stop();
  return {Cam, sess, t, video};
}

const bad=[]; let n=0;
function check(c,m){n++; if(!c){bad.push(m); console.log('FAIL',m)} else console.log('ok  ',m)}

(async()=>{
  const {Cam:CamOnly}=loadCam({pixels:fill(90,90,[40,140,50]),readyState:4});
  const skinF=CamOnly.features(fill(90,90,[224,172,142]),90,90);
  const dec=CamOnly.decide(Array.from({length:40},()=>({f:skinF,faces:0})));
  check(dec.animal==null && (dec.reason==='person'||dec.reason==='doubt'||dec.reason==='timeout'),
    `decide() on 40 skin frames ends without a match (reason=${dec.reason}, frames=${dec.frames})`);

  // ---- core A/B/C (2/4 on d4d6dcfe; 4/4 after the always-on timer) ----
  let coreOk=1; // decide already counted; we'll tally A/B/C against a snapshot
  const before=n, beforeBad=bad.length;

  const A=await runScan({pixels:fill(360,360,[224,172,142]), readyState:4});
  check(A.t.unmatched().length===1 && A.t.unmatched()[0]==='timeout' && A.t.matches().length===0,
    `A live doubt/person frames (skin): onUnmatched('timeout') within 12000+1.5s (got ${JSON.stringify(A.t.ev)})`);

  const B=await runScan({pixels:fill(360,360,[40,140,50]), readyState:0});
  check(B.t.unmatched().length===1 && B.t.unmatched()[0]==='timeout' && B.t.matches().length===0,
    `B live video never reaches readyState>=2: onUnmatched('timeout') within 12000+1.5s (got ${JSON.stringify(B.t.ev)})`);

  const C=await runScan({pixels:fill(360,360,[40,140,50]), readyState:4});
  check(C.t.unmatched().length===1 && C.t.unmatched()[0]==='timeout' && C.t.matches().length===0,
    `C live low-confidence frames (uniform green, no subject): onUnmatched('timeout') within 12000+1.5s (got ${JSON.stringify(C.t.ev)})`);

  const coreN=n-before+1; // +decide
  const corePass=coreN-(bad.length-beforeBad);
  console.log(`core A/B/C + decide: ${corePass}/${coreN} passed`);

  // ---- extra cases ----
  // Hung getUserMedia: interval never arms; the start() timer must still fire.
  const H=await runScan({hangGetUserMedia:true, readyState:0});
  check(H.t.unmatched().join()==='timeout' && H.t.matches().length===0,
    `hung getUserMedia still times out (got ${JSON.stringify(H.t.ev)})`);

  // No double-fire: hold skin frames well past 12s.
  const D=await runScan({pixels:fill(360,360,[224,172,142]), readyState:4, ms:20000});
  check(D.t.unmatched().length===1 && D.t.unmatched()[0]==='timeout' && D.t.matches().length===0,
    `no double-fire of onUnmatched past 20s (got ${JSON.stringify(D.t.ev)})`);

  // No fire after a match: ECHO_VISION fox, then wait past the original deadline.
  const vis={classify:async()=>({labels:[{id:'fox',conf:0.97}]})};
  const {Cam:CM,video:vv,families:ff}=loadCam({pixels:fill(360,360,[40,140,50]), readyState:4, vision:vis});
  const tM=track();
  const sM=CM.start(vv,ff,tM.cb);
  await flush(); await advance(50); await flush();
  await advance(2000); // 4+ frames at 2.5 fps
  const matchedEarly=tM.matches()[0]==='fox' && tM.unmatched().length===0;
  await advance(CM.SCAN_TIMEOUT_MS+1500);
  check(matchedEarly && tM.matches().join()==='fox' && tM.unmatched().length===0,
    `no fire after a match (early match=${matchedEarly}, later ${JSON.stringify(tM.ev)})`);
  sM.stop();

  // No fire after leaving / stop, and no leaked timer: stop at 2s, wait past 12s.
  const leaksBefore=timeouts.size+intervals.size;
  const {Cam:C2,video:v2,families:f2}=loadCam({pixels:fill(360,360,[224,172,142]), readyState:4});
  const tS=track();
  const sS=C2.start(v2,f2,tS.cb);
  await flush(); await advance(50); await flush();
  await advance(2000);
  sS.stop();
  const leaksMid=timeouts.size+intervals.size;
  await advance(C2.SCAN_TIMEOUT_MS+1500);
  check(tS.ev.length===0 && leaksMid<=leaksBefore,
    `no fire after stop/leave and no leaked timers (ev=${JSON.stringify(tS.ev)}, timers after stop=${leaksMid})`);

  // Timer reset on retry: stop at 6s, start a new session, must not fire at the old deadline.
  const {Cam:C3,video:v3,families:f3}=loadCam({pixels:fill(360,360,[224,172,142]), readyState:4});
  const t1=track();
  const s1=C3.start(v3,f3,t1.cb);
  await flush(); await advance(50); await flush();
  await advance(6000);
  s1.stop();
  const {Cam:C4,video:v4,families:f4}=loadCam({pixels:fill(360,360,[224,172,142]), readyState:4});
  const t2=track();
  const s2=C4.start(v4,f4,t2.cb);
  await flush(); await advance(50); await flush();
  await advance(C4.SCAN_TIMEOUT_MS-2000);
  const early=t1.unmatched().length===0 && t2.unmatched().length===0;
  await advance(3500);
  check(early && t1.unmatched().length===0 && t2.unmatched().join()==='timeout',
    `timer resets on retry (first session silent, second times out after its own 12s; ev1=${JSON.stringify(t1.ev)} ev2=${JSON.stringify(t2.ev)})`);
  s2.stop();

  // Button visible at <=1s: parse the orCamera template (game.js). Live visibility is also in phone_camera_origin_test.py.
  const game=fs.readFileSync(path.join(ROOT,'game.js'),'utf8');
  const oc=game.slice(game.indexOf('function orCamera()'), game.indexOf('// Stage 3: freeze'));
  const ctl=oc.match(/<div class="orcamctl" id="orcamctl"([^>]*)>/);
  const miss=oc.match(/<p class="orcammiss" id="orcammiss"([^>]*)>/);
  const retry=oc.match(/<button class="btn" id="orretry"([^>]*)>/);
  const pick=oc.match(/<button class="btn" id="orpick"([^>]*)>/);
  const hasHidden=attrs=>/\bhidden\b/.test(attrs||'');
  check(ctl && !hasHidden(ctl[1]) && miss && hasHidden(miss[1]) && retry && hasHidden(retry[1]) && pick && !hasHidden(pick[1]),
    'Pick your Echo (#orpick) is in a visible #orcamctl from the first second; #orcammiss and #orretry stay hidden until a miss');

  // Matching logic / CONF_MIN unchanged.
  check(CamOnly.CONF_MIN===0.70 && CamOnly.STREAK===4 && CamOnly.SCAN_TIMEOUT_MS===12000,
    `CONF_MIN/STREAK/SCAN_TIMEOUT_MS unchanged (${CamOnly.CONF_MIN}, ${CamOnly.STREAK}, ${CamOnly.SCAN_TIMEOUT_MS})`);

  console.log(`camera scan timeout: ${n-bad.length}/${n} passed`);
  if(bad.length){
    console.log('On d4d6dcfe A and B fail because tick() returned before the timeout check. After a timer armed in start() and cleared in stop(), A and B should pass.');
  }
  process.exit(bad.length?1:0);
})().catch(e=>{console.error(e); process.exit(2)});
