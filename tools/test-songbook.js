#!/usr/bin/env node
// Music School step 2 gate: the Ancient Echoes songbook (music/tunes.json "songbook") + Song v2 + the once-a-round picker.
// Fails the build on: a shipped tune still marked edition_check, a child note off the family pads / not pentatonic / > 4 different notes,
// a note outside c4-c6, a missing note sample, missing/long provenance, a lyrics field, a non-canonical id, a missing icon.
// Usage: node tools/test-songbook.js [--tunes FILE.json]  (FILE = a built songbook block, e.g. tools/fixtures/songbook_fixture.json)
const fs=require('fs'),path=require('path'),cp=require('child_process'),R=path.join(__dirname,'..');
const ML=require(path.join(R,'musiclevel.js')),EB=require(path.join(R,'echoback.js'));
const TJ=JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'),'utf8')),E=TJ.echo_it_back;EB.setData(E);const Q=EB._pure;
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const FAMS=['slyte','whimber','twitchel'],MAN=JSON.parse(fs.readFileSync(path.join(R,'px/songbook/manifest.json'),'utf8'));
const CANON={};MAN.tunes.filter(t=>t.canonical).forEach(t=>CANON[t.id]=t.family);
const KEYS=new Set(['id','title','composer','home','meter','bpm','mood','skills','echo','child','min_ml','icon','prov','prov_status','fixture','_echo_seconds','bar_ticks','bars','phrases','spoken']);
const MAJ=[0,2,4,5,7,9,11],midi=(f,x)=>E.do_midi[f]+MAJ[x[0]-1]+12*x[1]+(x[3]||0),NOTES=path.join(R,'music/notes'),sampleIn=d=>f=>m=>path.join(d,`${f}_${EB._pure.spell(f,m).replace('#','s')}.ogg`);
// validate a built songbook block; returns the error list (so the fixture can prove the gate catches things)
function validate(sb,o){o=o||{};const errs=[],e=(t,m)=>errs.push(`${t&&t.id}: ${m}`),sample=sampleIn(o.notes||NOTES);   // o.notes: a samples dir (the fixture uses a temp copy)
  if(!sb||sb.v!==1)errs.push('songbook block missing or not v1');
  for(const f of FAMS){const L=(sb&&sb[f])||[];if(!Array.isArray(L)){errs.push(f+' not a list');continue}const pads=new Set(Q.padsFor(f,4,E)),seen=new Set();
    for(const t of L){if(seen.has(t.id))e(t,'duplicate id');seen.add(t.id);
      Object.keys(t).forEach(k=>{if(!KEYS.has(k))e(t,`unexpected field "${k}"`+(/lyric|word|text/i.test(k)?' (no lyrics)':''))});
      if(!(t.fixture&&o.fixture)&&CANON[t.id]!==f)e(t,`not a canonical ${f} id`);
      if(t.prov_status!=='ok')e(t,`prov_status ${t.prov_status}: must not ship (edition check pending)`);
      if(!t.prov||t.prov.length>=200)e(t,'prov missing or >= 200 chars');
      if(!t.icon||!fs.existsSync(path.join(R,t.icon)))e(t,'icon missing');
      if(!EB.Song.valid(t.echo)||t.echo.v!==2)e(t,'echo is not a valid Song v2');
      if(!Array.isArray(t.child)||!t.child.length)e(t,'no child phrases');
      for(const x of (t.echo&&t.echo.n)||[])if(x[0]){const m=midi(f,x);if(m<60||m>84)e(t,`echo note ${x} outside c4-c6`);if(!fs.existsSync(sample(f)(m)))e(t,`no sample for echo note ${x} (${path.basename(sample(f)(m))}): run tools/render_songbook_notes.py`)}
      (t.child||[]).forEach((ph,j)=>{if(!EB.Song.valid(ph)||ph.v!==1)e(t,`child ${j+1} not Song v1`);const N=(ph&&ph.n)||[];
        if(N.length<3||N.length>8)e(t,`child ${j+1}: ${N.length} notes (3-8)`);
        N.forEach(x=>{const s=Q.step(x);if(x.length>3)e(t,`child ${j+1}: a half-step`);if([4,7].includes(x[0]))e(t,`child ${j+1}: fa/ti (pentatonic only)`);else if(!pads.has(s))e(t,`child ${j+1}: ${x} off the ${f} pads`);
          if(!fs.existsSync(sample(f)(midi(f,x))))e(t,`child ${j+1}: no sample for ${x}`)});
        if(new Set(N.map(Q.step)).size>4)e(t,`child ${j+1}: > 4 different notes`)});
      const sec=(t.echo&&t.echo.n||[]).reduce((a,x)=>a+x[2],0)*60/(t.echo&&t.echo.bpm||96)/12;if(sec<2)e(t,'echo version under 2 s')}}
  return errs}
const tp=process.argv.indexOf('--tunes');
const SHIP=tp>0?JSON.parse(fs.readFileSync(process.argv[tp+1],'utf8')):TJ.songbook;
const errs=validate(SHIP,{fixture:tp>0});errs.forEach(x=>console.log('SONGBOOK',x));ok(!errs.length,`shipped songbook valid (${errs.length} problem(s))`);
const shipped=FAMS.reduce((a,f)=>a+((SHIP&&SHIP[f])||[]).length,0);console.log(`shipped Ancient Echoes: ${shipped} (${FAMS.map(f=>f+' '+((SHIP&&SHIP[f])||[]).length).join(', ')}); held back: ${((SHIP&&SHIP.held)||[]).length}`);
// the gate catches what it must (fixture, built with --include-held)
const FX=JSON.parse(fs.readFileSync(path.join(R,'tools/fixtures/songbook_fixture.json'),'utf8'));
// the missing-sample case never depends on what has been rendered: a temp copy of music/notes without fixture_held's fa/ti samples
const FXN=fs.mkdtempSync(path.join(require('os').tmpdir(),'sbnotes_'));fs.readdirSync(NOTES).forEach(x=>fs.copyFileSync(path.join(NOTES,x),path.join(FXN,x)));
{const used=new Set(),gone=new Set(),fn=(f,x)=>path.basename(sampleIn(FXN)(f)(midi(f,x)));
 for(const f of FAMS)for(const t of FX[f]||[])for(const x of [...t.echo.n,...t.child.flatMap(p=>p.n)])if(x[0])(t.id==='fixture_held'&&[4,7].includes(x[0])?gone:used).add(f+'/'+fn(f,x));
 [...gone].filter(k=>!used.has(k)).forEach(k=>{const q=path.join(FXN,k.split('/')[1]);if(fs.existsSync(q))fs.unlinkSync(q)});ok([...gone].some(k=>!used.has(k)),'fixture: fixture_held has a fa/ti sample to remove')}
const fe=validate(FX,{fixture:true,notes:FXN});fs.rmSync(FXN,{recursive:true,force:true});ok(fe.some(x=>/fixture_held: prov_status edition_check/.test(x)),'gate blocks an edition_check tune');
ok(fe.some(x=>/fixture_held: no sample/.test(x)),'gate catches a missing fa/ti sample');ok(!fe.some(x=>/^fixture_steps/.test(x)),'the ok fixture passes');
ok(validate(FX).some(x=>/not a canonical/.test(x)),'non-canonical ids are rejected outside fixtures');
{const bad=JSON.parse(JSON.stringify(FX)),bt=bad.slyte.find(t=>t.id==='fixture_steps');bt.lyrics='la la';bt.child[0].n[0]=[4,0,12];bt.child[1].n.push([6,0,12],[1,1,12],[2,1,12],[3,1,12],[5,1,12]);
  const be=validate(bad,{fixture:true});ok(be.some(x=>/no lyrics/.test(x)),'lyrics field rejected');ok(be.some(x=>/fa\/ti/.test(x)),'fa in a child phrase rejected');ok(be.some(x=>/3-8|> 4 different/.test(x)),'long / wide child phrase rejected')}
// the Python builder agrees (held back by default; errors on a bad source)
{const out=cp.execFileSync('python3',[path.join(R,'tools/build_songbook.py'),'--src',path.join(R,'tools/fixtures/songbook_src'),'--check','--fixture'],{encoding:'utf8'});ok(/1 tune\(s\).*held back \(edition_check\/blocked\): 1; 0 error/.test(out),'build_songbook.py holds edition_check back ('+out.trim()+')')}
{const out=cp.execFileSync('python3',['-c',"import sys;sys.path.insert(0,'tools');import build_songbook as b;print(b.COMMENT.sub('','echo: fa#4:3 sol4:3 # c#5 note').strip())"],{cwd:R,encoding:'utf8'}).trim();ok(out==='echo: fa#4:3 sol4:3','a sharp (fa#4) is a note, not a comment ('+out+')')}
// Song v2
const S=EB.Song,v2=S.make2(96,[[6,0,12],[7,0,6,1],[1,1,12,-1],[0,0,6],[5,-1,24]]);ok(S.valid(v2)&&v2.v===2,'Song v2 valid');
const u=S.unpack(S.pack(v2));ok(JSON.stringify(u.n)===JSON.stringify(v2.n)&&u.v===2&&u.bpm===96,'Song v2 pack/unpack round-trips (acc included)');
ok(S.pack(v2).length===4+2*v2.n.length,'still 2 bytes a note');
const v1=S.make(100,[[1,0,12],[5,0,6],[3,1,24]]),p1=S.pack(v1);ok(S.valid(v1)&&p1[4]===(1|(1<<3))&&p1[6]===(5|(1<<3))&&p1[8]===(3|(2<<3)),'v1 pack bytes unchanged (top 2 bits 0)');
ok(JSON.stringify(S.unpack(p1).n)===JSON.stringify(v1.n),'v1 round-trips');
ok(!S.valid(Object.assign({},v1,{n:[[1,0,12,1]]})),'v1 rejects an acc');ok(!S.valid({v:2,bpm:96,tpb:12,n:[[1,0,12,2]]}),'v2 rejects acc 2');
ok(EB.midiOfNote('slyte',[5,0,12,1])===70&&EB.fileOfMidi('slyte',70)==='as4'&&EB.fileOfMidi('whimber',70)==='bb4','acc -> midi -> sample name');
// picker + slots (pure)
EB.setSongbook(FX);const fx=EB.sbTunes('slyte');ok(fx.length===1&&fx[0].id==='fixture_steps','only ok tunes are playable (held one never plays)');
ok(EB.sbTunes('whimber').length===0&&EB.sbPick({fam:'whimber',len:4,lv:2,seed:1})===null,'no tunes -> no Ancient Echo');
for(let seed=1;seed<=400;seed++){const s1=EB.sbSlots(seed,5,1),s2=EB.sbSlots(seed,5,2);if(s1.length!==1||s1[0]<1||s1[0]>4||s2.length!==2||s2[0]===s2[1]||s2.some(i=>i<1||i>4)){ok(false,'slots seed '+seed);break}}
ok(true,'slot never the first tune; a chosen tune gets 2 distinct slots');
const LV=l=>ML.data.levels[String(l)].songbook;
for(const [len,lv] of [[3,1],[4,2],[6,3],[7,4],[8,5]]){const c=EB.sbChild(fx[0],len,lv,LV(lv));ok(c&&c.n.length===len,`child part = the child's length (${len} at ML${lv})`)}
ok(EB.sbChild(fx[0],10,5,LV(5)).n.length===10&&EB.sbChild(fx[0],10,5,LV(5)).phrases.length===2,'past 8 notes: phrase by phrase');
ok(EB.sbChild(fx[0],10,3,LV(3)).n.length===6,'ML3 copies phrase 1 only (no repeats invented)');
ok(EB.sbChild(fx[0],4,1,LV(1))===null,'ML1: > 3 different notes -> not yet');
ok(EB.sbChild(Object.assign({},fx[0],{min_ml:3}),4,2,LV(2))===null,'min_ml respected');
// least heard first, never the same tune twice in a row (2-tune book)
const two={v:1,slyte:[fx[0],Object.assign({},fx[0],{id:'fixture_b'})],whimber:[],twitchel:[]};EB.setSongbook(two);
let last=null,rep=0;const met={};for(let i=0;i<40;i++){const t=EB.sbPick({fam:'slyte',len:4,lv:2,lim:LV(2),met,last,seed:i*31+7});if(t.id===last)rep++;last=t.id;met[t.id]=met[t.id]||{h:0};met[t.id].h++}
ok(rep===0&&Math.abs(met.fixture_steps.h-met.fixture_b.h)<=1,'least heard first, never twice in a row');
// heard order + list
EB.setSongbook(FX);const m=ML.fresh();ok(EB.sbHeard(m,fx[0],'slyte')===true&&EB.sbHeard(m,fx[0],'slyte')===false&&m.met.fixture_steps.h===2,'heard: first time flagged, count kept');
ok(EB.sbList(m,'slyte').length===1&&EB.sbList(m,'whimber').length===0,'Ancient Echoes list per family (heard only)');
ok(ML.repair(JSON.parse(JSON.stringify(m))).met.fixture_steps.h===2,'met survives repair / reload');
// shipped game with zero real tunes degrades: nothing playable
EB.setSongbook(TJ.songbook);if(!shipped)ok(FAMS.every(f=>EB.sbPick({fam:f,len:4,lv:2,seed:3})===null),'zero shipped tunes -> no Ancient Echo, no tile');
// dialogue keys + words
for(const f of FAMS){const B=JSON.parse(fs.readFileSync(path.join(R,`dialogue/${f}.json`),'utf8')).barks;for(const k of ['eib_ancient_echo','eib_ancient_collection'])ok(B[k]&&B[k].length,`${f}: ${k}`)}
const corpus=['game.js','echoback.js','echoback.css','dialogue/shared.json','dialogue/slyte.json','dialogue/whimber.json','dialogue/twitchel.json','music/tunes.json'].map(f=>fs.readFileSync(path.join(R,f),'utf8')).join('\n');
ok(!/secret song|secret_song/i.test(corpus),'never "secret song"');
// firmware vectors unchanged (the Ancient Echo slot takes no generator seed)
{const tmp=path.join(require('os').tmpdir(),'eibvec_'+process.pid+'.json');cp.execFileSync('node',[path.join(R,'tools/export_eib_vectors.js'),tmp]);ok(fs.readFileSync(tmp,'utf8')===fs.readFileSync(path.join(R,'host/eib_dedupe_vectors.json'),'utf8'),'host/eib_dedupe_vectors.json unchanged');fs.unlinkSync(tmp)}
{const SBk=JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'))).songbook;const L=['slyte','whimber','twitchel'].flatMap(f=>SBk[f]);ok(L.every(t=>t.spoken&&t.spoken.tune&&!/\d/.test(t.spoken.tune+t.spoken.composer)),'every shipped tune has a spoken title (no digits) for the 7-8 / 9-10 lines');
 ok(L.every(t=>!t.bar_ticks||t.bar_ticks%12===0||t.bar_ticks%6===0),'bar_ticks are whole eighths');ok(!L.some(t=>(SBk.held||[]).some(h=>h.id===t.id)),'held tunes never ship')}
// Nov 4: tune icons = exactly the shipped tunes (one each, real art from px/songbook/manifest.json), nothing else referenced; icons are never tinted
{const SBk=TJ.songbook,ids=FAMS.flatMap(f=>(SBk[f]||[]).map(t=>t.id)).sort(),L=FAMS.flatMap(f=>SBk[f]||[]),eq=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
 ok(L.every(t=>t.icon===`px/songbook/${t.id}.png`&&fs.existsSync(path.join(R,t.icon))),'every shipped tune has its own icon file');
 const UI=new Set(MAN.files.filter(x=>!x.id).map(x=>path.basename(x.file))),pngs=fs.readdirSync(path.join(R,'px/songbook')).filter(x=>x.endsWith('.png')&&!UI.has(x)).map(x=>x.slice(0,-4));
 ok(eq(pngs,ids),`tune icons in px/songbook = the ${ids.length} shipped tunes (extra: ${pngs.filter(x=>!ids.includes(x))}; missing: ${ids.filter(x=>!pngs.includes(x))})`);
 ok(eq(MAN.files.filter(x=>x.id).map(x=>x.id),ids)&&MAN.files.filter(x=>x.id).every(x=>x.file===`px/songbook/${x.id}.png`),'manifest tune icon files = the shipped tunes');
 ok(MAN.tunes.filter(t=>t.icon).every(t=>ids.includes(t.id)),'no manifest icon for a tune that does not ship');
 const code=['game.js','echoback.js','echoback.css','style.css','index.html'].map(f=>fs.readFileSync(path.join(R,f),'utf8')).join('\n'),refs=[...code.matchAll(/px\/songbook\/(\w+)\.png/g)].map(m=>m[1]+'.png');
 ok(refs.every(x=>UI.has(x)||ids.includes(x.slice(0,-4))),'app code references no other tune icon');
 const css=fs.readFileSync(path.join(R,'echoback.css'),'utf8').split('}').filter(r=>/\.(eibanci|bkancs|bkance)\b/.test(r));ok(css.length&&css.every(r=>!/filter|mix-blend|hue-rotate|tint/.test(r)),'tune icons are never tinted (no filter / blend on the icon rules)')}
// Nov 3 (LIST #11): an Ancient Echo's intro (Echo version + child's part), duet and Memory Book replay share one tempo = the tune's own bpm
{const SBk=JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'))).songbook;const L=['slyte','whimber','twitchel'].flatMap(f=>SBk[f]);const c={n:[[1,0,12]],phrases:null,labels:null};
 ok(L.every(t=>EB.sbBpm(t)===t.bpm&&EB.sbTune(t,c).bpm===t.bpm&&(!t.echo||!t.echo.bpm||t.echo.bpm===t.bpm)),'intro tempo == tune tempo (sbTune/sbBpm, no round speed-up)');
 const src=fs.readFileSync(path.join(R,'echoback.js'),'utf8');ok(!/bpmAt\([^)]*\bt\.bpm\)\s*,\s*ancient/.test(src)&&/return Object\.assign\(sbTune\(t,c\)/.test(src),'the round speed-up (bpmAt) never touches an Ancient Echo')}
console.log(`songbook: ${n} checks, ${bad} failed`);process.exit(bad?1:0)
