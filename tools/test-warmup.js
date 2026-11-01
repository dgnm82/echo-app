#!/usr/bin/env node
// Music School Phase 1, step 1: the hatching-song warm-up (warmup.js) - timing plan, Cole's first-song rule, motifs data, lines.
// Usage: node tools/test-warmup.js
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..');
const W=require(path.join(R,'warmup.js'));
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const MOT=JSON.parse(fs.readFileSync(path.join(R,'music/wu_motifs.json'),'utf8'));
ok(JSON.stringify(W.DEF)===JSON.stringify(MOT),'warmup.js DEF == music/wu_motifs.json');
// timing (worst case: the child taps nothing; every wait auto-advances)
const P=W.plan();
for(const k of ['intro','copy','beat','rhythm','song'])ok(P[k]<20000,`${k} moment under 20 s (${Math.round(P[k])} ms)`);
ok(P.pitch<25000,`pitch moment (2 listen-only trials, each replayed low->high) under 25 s (${Math.round(P.pitch)} ms)`);
ok(P.total<150000,`whole warm-up under 2.5 min with no taps (${Math.round(P.total)} ms)`);
// first song (Cole's rule)
const def=W.firstSong();ok(JSON.stringify(def.n)===JSON.stringify([[5,0,12],[3,0,6],[5,0,6],[3,0,12],[5,0,12],[3,0,6],[2,0,6],[1,0,24]]),'default first song = sol mi sol mi / sol mi re do (long do)');
ok(def.bpm===88,'default tempo 88');
const fsg=(a,b,c)=>W.firstSong(a,b,c);
for(const [notes,ticks,bpm] of [[[4,2],[12,6,6,12],88],[[0],[6,6,12],80],[[6,6,1],[12,12,6,6,12,12],104],[[],null,null],[[3,1],[6,12,12],70],[[2,4],[12,6,6,12],140]]){
  const s=fsg(notes,ticks,bpm),N=s.n;
  ok(N[N.length-1][0]===1&&N[N.length-2][0]===2,`ends re -> do (${notes})`);
  ok(N[N.length-1][2]===2*(s.ticks[s.ticks.length-1]),`final do held twice as long (${notes})`);
  ok(s.bpm>=76&&s.bpm<=104,`tempo clamped 76-104 (${bpm} -> ${s.bpm})`);
  ok(N.every(x=>Number.isInteger(x[0])&&x[0]>=1&&x[0]<=7&&[0,1,-1].includes(x[1])&&x[2]>0&&x[2]%6===0),'real scale notes, ticks on the 6-grid');
  ok(new Set(N.map(x=>x[0]+'.'+x[1])).size<=4,'at most 4 pitches (EIB rule)')}
ok(JSON.stringify(W.quantize([0,500,750,1000]))==='[12,6,6,12]','quantize: ta ti-ti ta');ok(W.quantize([0,500])===null||!W.quantize([0,500]),'quantize: <3 pats -> null (Echo rhythm)');
ok(W.tempoOf([0,600,1200,1800,2400])===100&&W.tempoOf([])===88&&W.tempoOf([0,2000,4000,6000,8000])===76,'tempoOf: median gap, clamped, default 88');
// motifs are real notes (degrees) and every family is there
for(const k of ['copy','beat','high','clap','yay'])ok((o=>o&&o.by_family&&['slyte','whimber','twitchel'].every(f=>Array.isArray(o.by_family[f])&&o.by_family[f].every(x=>Array.isArray(x)?Number.isInteger(x[0])&&x[0]>=1&&x[0]<=7&&x[2]>0:(Number.isInteger(x.low)||Array.isArray(x.low)))))(MOT.motifs[k]),`motif ${k}: degrees for all families`);
// lines: every key the warm-up uses exists for every family in every band; kid-safe words
const used=new Set();for(const f of ['warmup.js','game.js'])for(const m of fs.readFileSync(path.join(R,f),'utf8').matchAll(/'(wu_[a-z_]+)'/g))used.add(m[1]);
const sh=JSON.parse(fs.readFileSync(path.join(R,'dialogue/shared.json'),'utf8')).barks;
for(const fam of ['slyte','whimber','twitchel']){const B=JSON.parse(fs.readFileSync(path.join(R,`dialogue/${fam}.json`),'utf8')).barks;
  for(const k of used){const L=B[k]||sh[k];ok(L&&L.length,`${fam}: ${k} exists`);if(!L)continue;
    if(!sh[k])for(const b of ['5-6','7-8','9-10'])ok(L.some(l=>l.context&&l.context.age_band===b),`${fam}: ${k} has a ${b} line`);
    for(const l of L){const t=(l.text+' '+(l.short||''));ok(!/\d/.test(t),`${fam} ${k}: no digits`);ok(!/secret song/i.test(t),`${fam} ${k}: never "secret song"`);
      ok(!/\bbond/i.test(t),`${fam} ${k}: no "bond"`);ok(!/\b(wrong|correct|mistake|fail|score|points|stars?)\b|\bright\b(?!\?)/i.test(t),`${fam} ${k}: no right/wrong/score words ("${l.text}")`)}}}
// offline + no mic + no narrator in the new files
for(const f of ['warmup.js','press.js','musiclevel.js']){const s=fs.readFileSync(path.join(R,f),'utf8');
  ok(!/https?:\/\//.test(s.replace(/\/\/[^\n]*/g,'')),`${f}: no URLs`);ok(!/getUserMedia|speechSynthesis|SpeechSynthesis|XMLHttpRequest|sendBeacon|WebSocket/.test(s),`${f}: no mic / narrator / network beacons`)}
ok(!/fetch\((?!'music\/(levels|wu_motifs)\.json'|'px\/warmup\/manifest\.json')/.test(fs.readFileSync(path.join(R,'warmup.js'),'utf8')+fs.readFileSync(path.join(R,'musiclevel.js'),'utf8')),'only local data files are fetched');
// Cole's audio previews do not ship
ok(!fs.existsSync(path.join(R,'music/wu_audio'))&&!fs.readdirSync(path.join(R,'music')).some(f=>/^wu_.*\.(ogg|wav)$/.test(f)),'no warm-up audio previews in the app');
console.log(`warmup: ${n} checks, ${bad} failed`);process.exit(bad?1:0)
