#!/usr/bin/env node
// Echo It Back (Batch F) pure tests: matchTune, degrees -> notes per family key, tier data limits, pads, Song v1 pack, Songbook schema, copy keys.
// Usage: node tools/test-echoback.js [repoDir]
const fs=require('fs'),path=require('path');const R=process.argv[2]||path.join(__dirname,'..');
const EB=require(path.resolve(R,'echoback.js'));const T=JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'),'utf8')),E=T.echo_it_back;
const I=JSON.parse(fs.readFileSync(path.join(R,'music/instruments.json'),'utf8'));EB.setData(E,I);
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const M=EB.matchTune,s=a=>a;   // steps: do 0 re 1 mi 2 sol 4 la 5 do' 7
// same / close / new (decision 3); timing never matters
ok(M([4,2],[4,2])==='same','same 2');ok(M([[5,0,18],[3,0,6]],[[5,0,12],[3,0,12]])==='same','timing ignored');
ok(M([4,2,5],[4,2,4])==='close','one note off');ok(M([4,2],[5,4])==='close','T1 same contour (down) = close');
ok(M([4,2,5],[5,4,7])==='close','same shape, shifted');ok(M([4,2,5],[4,2,2,5])==='close','repeated note');ok(M([4,2,5],[4,2,5,1])==='close','one extra note');
ok(M([4,2],[2,4])==='new','opposite T1 = new');ok(M([0,1,2,4],[4,2,1,0])==='new','reversed = new');ok(M([4,2],[4])==='new','too short = new');ok(M([4,2],[])==='new','empty = new');
ok(M([0,1,2,4],[0,1,2,4,5,7])==='new','2 extra = new (copied back)');ok(['same','close','new'].includes(M([4,2],[9,9,9])),'always one of 3');
// key mapping
const nm=(f,st)=>EB.nameOf(f,st);
ok(nm('slyte',0)==='d4'&&nm('slyte',2)==='f#4'&&nm('slyte',9)==='f#5','slyte D: do d4, mi f#4, mi\' f#5');
ok(nm('whimber',0)==='bb4'&&nm('whimber',-3)==='f4'&&nm('whimber',7)==='bb5','whimber Bb: do bb4, low sol f4, do\' bb5');
ok(nm('twitchel',0)==='f4'&&nm('twitchel',4)==='c5'&&nm('twitchel',9)==='a5','twitchel F: do f4, sol c5, mi\' a5');
ok(EB.fileOf('slyte',2)==='fs4','file name f#->fs');ok(EB.colOf('f#4')===7&&EB.colOf('bb4')===8&&EB.colOf('c5')===0&&EB.colOf('b4')===6,'sprite columns');
// pads + unlocks (decision 5)
const P=(f,t)=>EB.padsFor(f,t).map(x=>nm(f,x)).join(' ');
ok(P('slyte',1)==='d4 f#4 a4','slyte T1 do mi sol');ok(P('slyte',2)==='d4 e4 f#4 a4 b4','slyte T2 + re la');ok(P('slyte',3)==='d4 e4 f#4 a4 b4 d5','T3 + do\'');
ok(P('slyte',4)==='d4 e4 f#4 a4 b4 d5 e5 f#5','T4 + re\' mi\'');ok(P('whimber',4)==='f4 g4 bb4 c5 d5 f5 g5 bb5','whimber T4 + low sol la (C6 top)');ok(P('twitchel',9)===P('twitchel',4),'tier 5 = 4');
const notes=fs.readdirSync(path.join(R,'music/notes')).map(f=>f.replace(/\.(ogg|wav)$/,''));
for(const f of ['slyte','whimber','twitchel'])for(let t=1;t<=4;t++){const pads=EB.padsFor(f,t);
  ok(pads.every(x=>{const m=EB.midiOf(f,x);return m>=60&&m<=84&&notes.includes(f+'_'+EB.fileOf(f,x))}),`${f} T${t} pads in C4-C6 with samples`);
  for(const u of EB.tunesFor(f,t)){const st=u.n.map(EB.step),d=new Set(st).size,L=st.length;
    ok(d<=4,`${f} ${u.id} <=4 distinct`);ok(t===1?L===2:t===2?L===3:t===3?L===4:L>=4&&L<=5,`${f} ${u.id} length ${L} fits T${t}`);ok(st.every(x=>pads.includes(x)),`${f} ${u.id} only unlocked pads`);ok(EB.Song.valid(u),`${f} ${u.id} is a valid Song v1`)}}
ok(E.tiers.find(x=>x.tier===4).tunes.some(u=>u.n.some(x=>x[2]===18)&&u.n.some(x=>x[2]===6)),'T4 shows long-short rhythm');
// Song v1 (lock 1) + songbook (lock 2) + instruments (lock 4)
const so=EB.Song.make(92,[[5,0,18],[3,0,6],[1,1,24],[5,-1,12],[0,0,12]]);const b=EB.Song.pack(so);
ok(b.length===4+2*5,'2 bytes a note + 4 header');ok(JSON.stringify(EB.Song.unpack(b))===JSON.stringify(so),'pack/unpack round trip');ok(so.v===1&&so.tpb===12,'version + 12 ticks a beat');
ok(EB.Songbook.KEY==='echo-songbook-v1'&&EB.Songbook.empty().v===2&&EB.Songbook.empty().slots===6&&typeof EB.Songbook.empty().progress==='object','songbook store schema v2 (Batch G), own key kept');
const src=fs.readFileSync(path.join(R,'game.js'),'utf8');ok(src.split("removeItem('echo-songbook-v1')").length-1===2,'erase-all (both) clears the songbook');
ok(!/S\.songbook|songbook:S\./.test(src),'songbook is not in the Echo save');
ok(I.instruments[I.default].sample&&Object.keys(I.instruments).length===5&&Object.values(I.instruments).every(x=>x.chip&&x.chip.wave),'instruments are data (chip timbres)');
// copy (3 families)
const KEYS=['eib_invite','eib_hello','eib_my_turn','eib_your_turn','eib_same','eib_close','eib_new','eib_again','eib_rest','eib_new_note',
  'eib_more1','eib_more2','eib_breath','eib_comes_back','eib_five','eib_sticker','eib_sixteen','eib_zippy','eib_rest_ears','eib_little'];
for(const f of ['slyte','whimber','twitchel']){const d=JSON.parse(fs.readFileSync(path.join(R,'dialogue',f+'.json'),'utf8'));for(const k of KEYS)ok((d.barks[k]||[]).length>0,`${f} has ${k}`);
  ok(d.barks.eib_new.every(l=>/new|your song/i.test(l.text)),`${f} copy-back lines say it is a new song`);ok(d.barks.eib_close.every(l=>/like this:$/i.test(l.text)),`${f} close lines end 'Like this:'`);
  const PFX={slyte:'Awoo',whimber:'Hoo-hoo',twitchel:'Mrrp'}[f];ok(d.barks.eib_five.every(l=>l.text.startsWith(PFX+'!')&&/Five! We sang five!/.test(l.text)),`${f} round end has its own prefix (${PFX})`);
  ok(!KEYS.some(k=>(d.barks[k]||[]).some(l=>/\b(streak|in a row|\d+)\b/i.test(l.text))),`${f} no streak wording or digits`);
  ok(!KEYS.some(k=>(d.barks[k]||[]).some(l=>/\b(wrong|oops|try again|no{1,2}pe|miss(ed)?|fail)\b/i.test(l.text))),`${f} no fail words`)}
// multi-finger PadInput exists and voices are capped by data
ok(typeof EB.PadInput==='function'&&I.voices===3,'PadInput + 3 voices');
// ---------------- v2 (Batch G)
{const Q=EB._pure,V=E.v2;
ok(Q.startLen('5-6')===3&&Q.startLen('7-8')===4&&Q.startLen('9-10')===6,'band starts 3 / 4 / 6 notes');
const walkR=(b,from)=>{const o=[from];let l=from;for(let i=0;i<20;i++){l=Q.rampLen(l,b);o.push(l)}return o};
ok(walkR('5-6',3).slice(0,14).join()==='3,4,5,6,7,8,9,10,11,12,13,14,15,16','5-6 ramp +1 a round');
ok(walkR('7-8',4).slice(0,12).join()==='4,6,8,9,10,11,12,13,14,15,16,16','7-8 ramp +2 until 8, then +1');
ok(walkR('9-10',6).slice(0,11).join()==='6,8,9,10,11,12,13,14,15,16,16','9-10 ramp +2 until 8, then +1');
ok(Q.rampLen(7,'7-8')===8,'a +2 jump stops at 8');ok(['5-6','7-8','9-10'].every(b=>walkR(b,3).every(x=>x<=16)),'cap 16 for every band');
for(let L=9;L<=16;L++){const ph=Q.phrasesFor(L);ok(ph&&ph.sizes.reduce((a,b)=>a+b,0)===L&&ph.sizes.every(x=>x>=2&&x<=4),`len ${L}: phrases of up to 4 add up`);
  ok(ph.shape===(L<=12?'ABA':'AABA'),`len ${L}: ${ph.shape}`)}
ok(Q.phrasesFor(8)===null,'8 notes or fewer: one whole tune');
for(const f of ['slyte','whimber','twitchel'])for(let t=1;t<=4;t++)for(let L=3;L<=16;L++)for(let sd=1;sd<=6;sd++){const g=Q.gen(f,t,L,sd*31+L,E),st=g.n.map(EB.step),pads=EB.padsFor(f,t);
  const okv=st.length===L&&new Set(st).size<=4&&st.every(x=>pads.includes(x))&&st[L-1]===0&&EB.Song.valid(g)&&(pads.length<2||new Set(st).size>=2);
  if(!okv){ok(false,`${f} T${t} len ${L} seed ${sd}: ${st}`);continue}
  if(g.phrases){const parts=g.phrases.map(([a,b])=>st.slice(a,b).join());g.labels.forEach((l,i)=>{const j=g.labels.indexOf(l);if(j<i&&parts[j]!==parts[i])ok(false,`${f} len ${L}: repeated phrase differs`)});
    if(t>1&&parts[g.labels.indexOf('A')]===parts[g.labels.indexOf('B')])ok(false,`${f} T${t} len ${L}: B = A`)}
  if(L>V.rhythm_shown_to&&g.n.some(x=>x[2]!==12))ok(false,'no long-short past 8 notes')}
ok(true,'generator: exact length, <= 4 distinct, tier pads only, ends on do, valid Song v1, phrases repeat (3 families x 4 tiers x 3-16)');
ok(JSON.stringify(Q.gen('slyte',3,10,77,E))===JSON.stringify(Q.gen('slyte',3,10,77,E)),'generator is seeded (same seed, same tune)');
ok(Q.bpmAt(0,88)===88&&Q.bpmAt(1,88)===92&&Q.bpmAt(6,88)===114&&Q.bpmAt(99,88)===114&&Q.bpmAt(6,140)===150,'tempo +5% a step, cap +30% / 150 bpm');
ok(Q.noteMs(6,150)>=120&&Q.noteMs(1,150)===120,'notes never under 120 ms');
ok(Q.matchPhrased(['same','same','same'])==='same'&&Q.matchPhrased(['same','close','same'])==='close'&&Q.matchPhrased(['close','new'])==='new','per-phrase matching');
// progress: ramp only after a perfect round at the saved length; soft stop = 1 speed step back; age change = that band's start, up or down (Kai)
let b={v:2,slots:6,songs:[],star:null,progress:{}};const p=Q.Progress.get(b,'k1','7-8');ok(p.len===4&&p.band==='7-8','new child starts at the band length');
Q.Progress.finish(p,{perfect:false,played:4},'7-8');ok(p.len===4&&p.roundsDone===1,'a round with a miss does not step up');
Q.Progress.finish(p,{perfect:true,played:2},'7-8');ok(p.len===4,'a "little one" round does not step up');
Q.Progress.finish(p,{perfect:true,played:4},'7-8');ok(p.len===6&&p.grew===2,'a perfect round steps up (+2)');
Q.Progress.get(b,'k1','9-10');ok(p.len===6&&p.band==='9-10','age up: set to the 9-10 start');p.len=12;Q.Progress.get(b,'k1','5-6');ok(p.len===3&&p.band==='5-6','age down: set to the 5-6 start (no "never move down")');
Q.Progress.get(b,'k1','5-6');ok(p.len===3,'same band: no change');p.len=11;Q.Progress.get(b,'k1','5-6');ok(p.len===11,'same band keeps progress');
p.len=16;p.tempoStep=0;for(let i=0;i<8;i++)Q.Progress.finish(p,{perfect:true,played:16},'5-6');ok(p.len===16&&p.tempoStep===6,'past 16: tempo steps, capped');
ok(p.speedRounds===7,'speed rounds counted');Q.Progress.finish(p,{soft:true},'5-6');ok(p.tempoStep===5&&p.roundsDone===11,'soft stop: one speed step back, not a finished step');
ok(Q.Progress.reset(b,'k1','9-10').len===6&&b.progress.k1.tempoStep===0,'grown-ups reset to the band start');
ok(Q.Progress.get(b,'k2','7-8').len===4&&b.progress.k1.len===6,'progress is per child');
// stickers: the lowest missing length sticker up to the round's length (so a 9-10 child at 6 notes gets the 4-note one first)
const has=t=>false;ok(Q.stickersFor(6,0,has).join()==='First Echo Tune','9-10 first round (6 notes) -> First Echo Tune');
ok(Q.stickersFor(3,0,has).length===0,'3 notes: no sticker yet');ok(Q.stickersFor(16,0,t=>t!=='Big Tune').join()==='Big Tune','one length sticker at a time, lowest missing');
ok(Q.stickersFor(16,3,t=>t!=='Zippy Tune').join()==='Zippy Tune','3rd speed round -> Zippy Tune');
// store migration v1 -> v2 (silent; songs kept)
const v1={v:1,slots:6,songs:[{id:'a',made:1,fam:'slyte',inst:'kalimba',song:EB.Song.make(88,[[1,0,12]])}],star:'a'};
const m=EB.Songbook.migrate(JSON.parse(JSON.stringify(v1)));ok(m.v===2&&m.songs.length===1&&m.star==='a'&&JSON.stringify(m.progress)==='{}','v1 migrates to v2, songs + star kept');
ok(EB.Songbook.migrate({v:2,songs:[]}).progress&&EB.Songbook.migrate({v:9,songs:[]})===null&&EB.Songbook.migrate(null)===null,'v2 passes, unknown versions rejected');
const LS={};globalThis.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)},removeItem:k=>{delete LS[k]}};
LS['echo-songbook-v1']=JSON.stringify(v1);const L1=EB.Songbook.load();ok(L1.v===2&&JSON.parse(LS['echo-songbook-v1']).v===2,'load() migrates and saves silently');
LS['echo-songbook-v1']='{bad json';ok(EB.Songbook.load().v===2,'a broken store loads as empty v2');
delete LS['echo-songbook-v1'];ok(EB.setBand('kx','9-10').len===6&&EB.bandOf('kx')==='9-10'&&EB.setBand('kx','5-6').len===3,'age kept in the per-child store; setBand up and down');
ok(['round','soft_stop_tunes','start','ramp','stickers','tempo'].every(k=>k in V)&&V.round===5&&V.soft_stop_tunes===10&&V.min_len===3,'v2 numbers live in tunes.json');}
console.log(`echoback: ${n} checks, ${bad} failed`);process.exit(bad?1:0);
