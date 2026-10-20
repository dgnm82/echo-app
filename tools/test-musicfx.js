// Batch D: node unit test for musicfx.js pure helpers + music/tunes.json + music/tempo.json. Usage: node tools/test-musicfx.js
const fs=require('fs'),path=require('path'),assert=require('assert');const R=path.join(__dirname,'..');
const MFX=require(path.join(R,'musicfx.js')),P=MFX._pure;
const T=JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'))),TP=JSON.parse(fs.readFileSync(path.join(R,'music/tempo.json')));
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++};
// beat clock
let b=P.beatAt(0,120,4,64);ok(b.beat===0&&b.phase===0,'beat 0');b=P.beatAt(1.25,120,4,64);ok(b.beat===2&&Math.abs(b.phase-.5)<1e-9&&b.bar===0,'beat 2.5');
b=P.beatAt(32.1,120,4,64);ok(b.beat===0,'wraps at beats');
ok(P.nearBeat(0.5+0.05,120)&&P.nearBeat(0.5-0.05,120)&&!P.nearBeat(0.75,120),'on-beat window 120 bpm');
ok(P.nearBeat(1.0+0.11,60)&&!P.nearBeat(1.0+0.2,60),'window = 12% of a slow beat');
// Snack Catch: steps through, wraps, counts songs; a miss never calls catchStep
const st=P.catchState();let r;for(let i=0;i<12;i++)r=P.catchStep(st,12);ok(r.done&&r.songs===1&&st.i===0,'catch 12 = 1 song');r=P.catchStep(st,12);ok(r.i===0&&!r.done,'catch restarts');
// ladder: 1 row = 1 step, 4 rows = 4 steps, top resets
const L={i:0};r=P.ladderStep(L,6,1);ok(r.steps.join()==='0'&&!r.top,'ladder 1');r=P.ladderStep(L,6,4);ok(r.steps.join()==='1,2,3,4','ladder combo');r=P.ladderStep(L,6,3);ok(r.steps.join()==='5'&&r.top&&L.i===0,'ladder top');
// hum: no target pitch, bounded
ok(P.hummRate(0)===.89&&P.hummRate(1e6)===1.12&&P.hummRate(450)>.89&&P.hummRate(450)<1.12,'hum rate bounds');
// tunes: C4..C6, pentatonic in the family key, whole beats, 2 voices max (pairs dyad), required sets
const NM={c:0,d:2,e:4,f:5,g:7,a:9,b:11},mid=s=>{const m=/^([a-g])(#|b)?(\d)$/.exec(s.replace('bb','b'));return 12*(+m[3]+1)+NM[m[1]]+(m[2]==='#'?1:s.startsWith('bb')?-1:0)};
const KEY={slyte:2,whimber:10,twitchel:5},PEN=[0,2,4,7,9];
const DECK={slyte:'blackberry honey_cake trinket leaf nut apple daisy pinecone mushroom ball',whimber:'star moon leaf_green comet feather dewdrop firefly lantern cloud book',twitchel:'yarn fish bell ribbon button pebble leaf daisy ball box'};
for(const [f,F] of Object.entries(T.families)){const all=[];
  const chk=(t,lbl)=>{ok(t.notes.length===t.beats.length,lbl+' notes/beats');t.notes.forEach((s,i)=>{const m=mid(s);all.push(s);ok(m>=60&&m<=84,`${lbl} ${s} in C4-C6`);ok(PEN.includes(((m-KEY[f])%12+12)%12),`${lbl} ${s} pentatonic in key`);if(t.midi)ok(t.midi[i]===m,lbl+' midi')});t.beats.forEach(x=>ok(x>0&&x*2===Math.round(x*2),lbl+' beat grid'))};
  chk(F.catch,f+' catch');ok(F.catch.notes.length>=8,f+' catch long enough');chk(F.playoff,f+' playoff');ok(F.playoff.notes.length===4,f+' playoff = 4 steps');
  for(const [s,t] of Object.entries(F.postcards)){chk(t,`${f} pc ${s}`);ok(t.notes.length>=3&&t.notes.length<=4,'3-4 note postcard')}
  ok(Object.keys(F.postcards).length===15,f+' 15 postcard scenes');
  for(const it of DECK[f].split(' ').concat('token')){const d=F.pairs[it];ok(d&&d.length===2,`${f} pair ${it}`);d.forEach(s=>{all.push(s);ok(mid(s)>=60&&mid(s)<=84,'pair range')})}
  ok(new Set(DECK[f].split(' ').map(i=>F.pairs[i].join())).size===10,f+' every pair chime differs');
  ok(F.dig_ladder.length===6&&F.dig_ladder.every((s,i,a)=>i===0||mid(s)>mid(a[i-1])),f+' ladder climbs');F.dig_ladder.forEach(s=>all.push(s));
  for(const s of new Set(all)){ok(F.samples.includes(s),`${f} sample for ${s}`);ok(fs.existsSync(path.join(R,'music/notes',`${f}_${s.replace('#','s')}.ogg`))&&fs.existsSync(path.join(R,'music/notes',`${f}_${s.replace('#','s')}.wav`)),`${f} note file ${s}`)}}
// tempo grid for every home + game loop (incl. tiers), and the title
for(const [k,v] of Object.entries(TP)){if(k[0]==='_')continue;ok(v.bpm>=56&&v.bpm<=132&&[3,4].includes(v.beatsPerBar)&&v.beats%v.beatsPerBar===0,'tempo '+k)}
for(const f of ['slyte','whimber','twitchel'])for(const band of ['day','twilight'])for(const t of ['','_t1','_t2','_t3'])ok(TP[`bg_${f}_${band}${t}_loop`],`tempo bg_${f}_${band}${t}`);
ok(TP.title_welcome_loop&&TP.title_welcome_loop.bpm===72&&TP.title_welcome_loop.beatsPerBar===3,'title 72/3');
ok(T.home_sounds.length===20&&T.home_sounds.every(a=>fs.existsSync(path.join(R,'music',`home_${a}.ogg`))),'home sounds');
console.log(`musicfx OK (${n} checks)`);
