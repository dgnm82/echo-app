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
ok(EB.Songbook.KEY==='echo-songbook-v1'&&EB.Songbook.empty().v===1&&EB.Songbook.empty().slots===6,'songbook store schema v1, own key');
const src=fs.readFileSync(path.join(R,'game.js'),'utf8');ok(src.split("removeItem('echo-songbook-v1')").length-1===2,'erase-all (both) clears the songbook');
ok(!/S\.songbook|songbook:S\./.test(src),'songbook is not in the Echo save');
ok(I.instruments[I.default].sample&&Object.keys(I.instruments).length===5&&Object.values(I.instruments).every(x=>x.chip&&x.chip.wave),'instruments are data (chip timbres)');
// copy (3 families)
const KEYS=['eib_invite','eib_hello','eib_my_turn','eib_your_turn','eib_same','eib_close','eib_new','eib_again','eib_rest','eib_new_note'];
for(const f of ['slyte','whimber','twitchel']){const d=JSON.parse(fs.readFileSync(path.join(R,'dialogue',f+'.json'),'utf8'));for(const k of KEYS)ok((d.barks[k]||[]).length>0,`${f} has ${k}`);
  ok(d.barks.eib_new.every(l=>/new|your song/i.test(l.text)),`${f} copy-back lines say it is a new song`);ok(d.barks.eib_close.every(l=>/like this:$/i.test(l.text)),`${f} close lines end 'Like this:'`);
  ok(!KEYS.some(k=>(d.barks[k]||[]).some(l=>/\b(wrong|oops|try again|no{1,2}pe|miss(ed)?|fail)\b/i.test(l.text))),`${f} no fail words`)}
// multi-finger PadInput exists and voices are capped by data
ok(typeof EB.PadInput==='function'&&I.voices===3,'PadInput + 3 voices');
console.log(`echoback: ${n} checks, ${bad} failed`);process.exit(bad?1:0);
