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
// ---------------- Music School step 3: songbook hooks (Catch / Dig floor / growing song), Stack ladder, beat gates, art
{const SB=T.songbook,FX=JSON.parse(fs.readFileSync(path.join(R,'tools/fixtures/songbook_fixture.json'))),all=['slyte','whimber','twitchel'].flatMap(f=>SB[f].map(t=>Object.assign({fam:f},t)));
 const ms=(t,n)=>n.reduce((a,x)=>a+x[2]*60000/t.echo.bpm/12,0);
 // B (short excerpts): ONE helper, cutAtPhrase. Cut only between notes, on the tune's own phrase ends (phrase_ends.json, counted from the
 // first note so a pickup is inside) or a source bar line, never a grid from tick 0; an Echo version that fits plays whole (no float drift).
 // Pinned cuts [hook 8 s, dig 2.6 s] = /workspace/echo/phone_app_review/ancient19/cut_points.md (Kai reviews these before Daniel hears them).
 const CUT={blue_danube:[288,72],can_can:[216,72],eine_kleine_nachtmusik:[180,36],hall_mountain_king:[192,48],ride_valkyries:[222,54],william_tell:[168,48],
   hallelujah:[138,48],morning_mood:[138,36],ode_to_joy:[192,48],spring:[192,48],swan_lake:[168,48],toreador:[138,48],
   fur_elise:[105,33],hungarian_dance_5:[126,48],nutcracker_march:[186,42],rondo_alla_turca:[192,48],stars_and_stripes:[168,96],sugar_plum_fairy:[84,36],the_entertainer:[96,27]};
 ok(all.length===19&&all.every(t=>CUT[t.id]),'every one of the 19 tunes has a pinned cut');
 for(const t of all){const N=t.echo.n,E=[];N.reduce((a,x)=>(E.push(a+x[2]),a+x[2]),0);const full=E[E.length-1];
   for(const [j,max] of [[0,8000],[1,2600]]){const c=P.cutAtPhrase(t,max),w=t.id+(j?' dig':' hook');
     ok(c.ticks===CUT[t.id][j],`${w} cut at ${c.ticks} (pinned ${CUT[t.id][j]}, ${c.by})`);
     ok(c.n.every((x,i)=>x===N[i])&&c.ticks===c.n.reduce((a,x)=>a+x[2],0)&&E.includes(c.ticks),w+' = the start of the Echo version, cut between two notes (never mid-note)');
     ok(c.n.length&&c.n[c.n.length-1][0]>0,w+' ends on a sounding note');ok(ms(t,c.n)<=max+1e-6,w+` <= ${max/1000} s`);
     ok(c.by==='end'?c.ticks===full:c.by==='phrase'?t.phrases.includes(c.ticks):c.by==='bar'?t.bars.includes(c.ticks):c.by==='note','by '+c.by+' is what it says');
     if(c.by!=='end')ok(!(t.phrases||[]).some(e=>e>c.ticks&&e*60000/t.echo.bpm/12<=max+1e-6),w+': no later phrase end fits');
     const bar=t.bar_ticks||t.meter*12,pu=t.bars[0]<bar?t.bars[0]:0;if(pu)ok(c.ticks>pu,w+` (pickup ${pu}) keeps more than the pickup`)}
   ok((t.phrases||[]).every(e=>E.includes(e)),t.id+' phrase ends all fall between notes');
   const h=P.hookNotes(t);ok(h.length>=3&&h.every(x=>x[0]>0),t.id+' hook = real notes, no rests');
   ok(JSON.stringify(h)===JSON.stringify(P.cutAtPhrase(t,8000).n.filter(x=>x[0])),t.id+' Catch hook = the 8 s phrase cut, rests dropped');
   const o=P.openingNotes(t);ok(o.length>=1&&o.length<=h.length&&o.every((x,i)=>x===h[i]),t.id+' dig opening = the hook\'s first notes');
   if(full*60000/t.echo.bpm/12<=8000+1e-6)ok(P.cutAtPhrase(t,8000).by==='end'&&h.length===N.filter(x=>x[0]).length,t.id+' fits in 8 s: the hook is the whole Echo version (last note kept)');
   for(let st=2;st<=5;st++){const g=P.growPlan(t,st);if(st===5){ok(g&&g.full&&g.n===N,t.id+' growing song stage 5 = the whole approved phrase (A)');continue}
     const want=Math.min(st-1,t.child.length);ok(g&&!g.full&&g.phrases===want,t.id+` stage ${st} plays ${want} phrase(s)`);ok(g.n.filter(x=>x[0]).length===t.child.slice(0,want).reduce((a,p)=>a+p.n.length,0),t.id+' phrases are the child phrases, unchanged')}
   ok(P.growPlan(t,1)===null,'stage 1: no growing song')}
 {// pickups + ties (synthetic, 120 bpm, 2/4 = 24 ticks): the cut uses the source bar lines, never bar lines counted from tick 0, and never splits a note
  const pk={echo:{bpm:120,n:[[5,0,6],[1,1,6],[2,1,6],[3,1,6],[5,0,6],[1,1,18],[5,0,6],[2,1,6],[3,1,12]]},bars:[6,30,54],meter:2};   // pickup 6
  ok(P.cutAtPhrase(pk,2000).ticks===30&&P.cutAtPhrase(pk,2000).by==='bar','pickup tune: the bar line after the pickup (30), not tick 24 (mid-phrase)');
  ok(P.cutAtPhrase(Object.assign({phrases:[48]},pk),2400).ticks===48,'pickup tune: a phrase end wins over a later bar line');
  const tie={echo:{bpm:120,n:[[1,0,6],[2,0,6],[3,0,30],[5,0,6]]},bars:[24],meter:2};   // bar 24 falls inside the held mi
  const c=P.cutAtPhrase(tie,1500);ok(c.ticks===12&&c.by==='note','a bar line inside a held note is never a cut: the cut falls back to the last note end');
  const fl={echo:{bpm:120,n:[[1,0,48],[2,0,48],[3,0,96]]}};ok(P.cutAtPhrase(fl,8000).by==='end'&&P.hookNotes(fl,8000).length===3,'exactly maxMs (8.000 s): plays whole, no float drift')}
 ok(P.growPlan(null,3)===null&&P.hookNotes(null).length===0&&P.catchOrder([],[],3).length===0,'zero tunes: nothing to play (the game keeps today\'s sound)');
 const sl=SB.slyte;if(sl.length>=3){const o=P.catchOrder(sl,[{id:sl[2].id},{id:sl[1].id}],1);ok(o[0].id===sl[2].id&&o[1].id===sl[1].id,'Catch: met tunes first, in heard order');
   ok(o.slice(2).every(t=>(t.min_ml||1)<=1),'Catch: then only tunes at the child\'s level');ok(P.catchOrder(sl,[],5).length===sl.length,'Catch: every tune at a high level')}
 if(sl.length>=2){ok(P.growChoice(sl,[{id:sl[1].id,heard:{h:3}},{id:sl[0].id,heard:{h:1}}]).id===sl[1].id,'growing song: the most-met tune');ok(P.growChoice(sl,[]).id===sl[0].id,'growing song: else the first ok tune');
   ok(P.growChoice(sl,[{id:sl[1].id,heard:{h:3}}],sl[0].id).id===sl[0].id,"growing song: Cole's grow pick wins")}
 ok(!SB.grow||Object.entries(SB.grow).every(([f,id])=>SB[f].some(t=>t.id===id)),'grow picks are shipped tunes')}
// Stack ladder: layer k = ladder note k (rising), wraps after the top; the sparkle column follows the note (COLS c d e f g a b f# bb)
for(const [f,F] of Object.entries(T.families)){const L=F.dig_ladder;const ks=[0,1,2,3,4,5,6,7].map(k=>P.stackStep(k,L.length).i);ok(ks.join()==='0,1,2,3,4,5,0,1',f+' stack ladder rises and wraps');
  L.forEach(n=>{const c=P.noteCol(n);ok(c>=0&&c<=8,f+' sparkle column for '+n)})}
ok(P.noteCol('f#4')===7&&P.noteCol('bb4')===8&&P.noteCol('d5')===1&&P.noteCol('a4')===5,'COLS order');
// beat gates: day = every beat (2 ticks), twilight = beat 1 of each bar only; sway alternates f1/f2
{const d=k=>P.beatAt(k*.625+.05,96,4,64),w=k=>P.beatAt(k*.75+.05,80,3,48);ok([0,1,2,3].every(k=>P.beatOn(d(k),false)),'day: every beat');ok(!P.beatOn(P.beatAt(.3,96,4,64),false),'day: off after 2 ticks');
 ok(P.beatOn(w(0),true)&&!P.beatOn(w(1),true)&&!P.beatOn(w(2),true)&&P.beatOn(w(3),true),'twilight: beat 1 of the bar only');
 ok(P.swayFrame(d(0),false)===1&&P.swayFrame(d(1),false)===2&&P.swayFrame(P.beatAt(.3,96,4,64),false)===0,'day sway f1, f2, rest f0');ok(P.swayFrame(w(0),true)===1&&P.swayFrame(w(3),true)===2&&P.swayFrame(w(1),true)===0,'twilight sway on downbeats, alternating bars');ok(!P.beatOn(null),'no loop: no beat')}
// Pixal's beat art (px/beat): sizes as in the manifest, no pure black
{const png=f=>{const b=fs.readFileSync(path.join(R,'px/beat',f));return [b.readUInt32BE(16),b.readUInt32BE(20)]};const M=JSON.parse(fs.readFileSync(path.join(R,'px/beat/manifest.json')));
 const want={'run_beat_mark.png':[84,6],'stack_note_sparkle.png':[144,48],'stack_note_sparkle_static.png':[144,16]};for(const ty of ['bellflower','sundaisy','starbloom','crocus','windowbox'])for(const tod of ['day','twi'])want[`sway_${ty}_${tod}.png`]=[48,16];
 for(const [f,wh] of Object.entries(want)){ok(fs.existsSync(path.join(R,'px/beat',f))&&png(f).join()===wh.join(),'beat art '+f+' '+wh)}ok(!fs.existsSync(path.join(R,'px/beat/echo_beat_shadow.png')),'no bounce shadow art');
 {const {execFileSync}=require('child_process');const same=execFileSync('python3',['-c',"from PIL import Image\nfor t in ['bellflower','sundaisy','starbloom','crocus','windowbox']:\n for d in ['day','twi']:\n  a=Image.open(f'px/beat/sway_{t}_{d}.png').convert('RGBA').crop((0,0,16,16));b=Image.open(f'px/scenes/fx/flower_{t}_{d}.png').convert('RGBA').crop((0,0,16,16));print(int(a.tobytes()==b.tobytes()),end='')\na=Image.open('px/beat/sway_sundaisy_day.png').convert('RGBA').crop((0,0,16,16));b=Image.open('px/scenes/fx/flower_bloom.png').convert('RGBA').crop((0,0,16,16));print(int(a.tobytes()==b.tobytes()))"],{cwd:R,encoding:'utf8'}).trim();
  ok(same==='11111111111','sway f0 = the art shown today (every strip, and flower_bloom = sundaisy day) '+same)}
 const mf=fs.readFileSync(path.join(R,'musicfx.js'),'utf8');ok(/run_beat_mark\.png/.test(mf)&&!/px\/run\/beat_pulse\.png/.test(mf),'Run uses the new gold dash');
 ok(/MFX\.runPulse=false;/.test(mf),'Nov 3 (LIST #9): the Meadow Dash beat mark (the blinking dash at the Echo\'s feet) is off');
 const gj=fs.readFileSync(path.join(R,'game.js'),'utf8');ok(/drawObs\(\);if\(fox&&window\.MusicFX\)MusicFX\.drawRunPulse\(cx,84,474\)/.test(gj),'the beat mark is drawn after the obstacles at (84,474)');
 const css=fs.readFileSync(path.join(R,'musicfx.css'),'utf8');ok(/#sc #cr\.beat\{transform:translateX\(-50%\) translateY\(-1px\)\}/.test(css)&&/prefers-reduced-motion:reduce\)\{#sc #cr\.beat\{transform:translateX\(-50%\)\}/.test(css),'bounce = 1 px, none in reduced motion')}
// Nov 3 (Daniel via Kai): the run's sky body pulses on the beat (same clock), ~5% scale + a faint halo, easing back over 250 ms; the dash stays off
{const mf=fs.readFileSync(path.join(R,"musicfx.js"),"utf8"),gj=fs.readFileSync(path.join(R,"game.js"),"utf8"),E=P.skyEnv,S=MFX.SKY,bb=(beat,phase,name)=>Object.assign(P.beatAt(0,126,4,64),{beat,phase,name:name||'game_meadow_dash_loop'});
 ok(S.scale===.05&&S.ms===250&&S.glow===.3,'sky pulse: 5% scale, 0.3 halo, 250 ms');
 ok(E(bb(0,0))===1&&E(bb(5,0))===1,'sky pulse: full on every beat (day)');const t=x=>x/1000/(60/126);
 ok(E(bb(0,t(125)))>.2&&E(bb(0,t(125)))<.3&&E(bb(0,t(249)))>0&&E(bb(0,t(250)))===0&&E(bb(0,.9))===0,'sky pulse: eases back to 0 by 250 ms, off-beat = 0');
 ok(E(bb(4,0,'bg_slyte_twilight_loop'))===1&&E(bb(5,0,'bg_slyte_twilight_loop'))===0&&E(null)===0,'sky pulse: twilight = beat 1 of each bar only; no clock = no pulse');
 ok(/MFX\.skyPulse=true;/.test(mf)&&/SKY_BODY=\{meadow_sky:\{x:250,y:90,w:25,h:25,kind:'sun'/.test(mf)&&!/hill_sky:|garden_sky:/.test(mf.split('MFX.SKY_BODY=')[1].split('\n')[0]),'sky body: the meadow sun only (Moonlight Glide / garden skies have none)');
 ok(!/filter|globalCompositeOperation/.test(mf.split('MFX.drawSkyPulse=')[1].split('\n// Step 3 beat-lock')[0]),'sky pulse never tints the sprite (no filter / composite op)');
 ok(/cx\.drawImage\(IM\.meadow_sky,0,0\);if\(window\.MusicFX&&MusicFX\.drawSkyPulse\)MusicFX\.drawSkyPulse\(cx,IM\.meadow_sky\)/.test(gj)&&/MusicFX\.drawSkyPulse\(cx,IM\.hill_sky\)/.test(gj),'both runs call the sky pulse right after the sky')}
console.log(`musicfx OK (${n} checks)`);
