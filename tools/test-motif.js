// Nov 4: the family motif in hums and jingles only (pm/ancient_accuracy/PLAN_MOTIF_HUMS_JINGLES.md). Deterministic: data, shapes, guards, placement.
// Usage: node tools/test-motif.js
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..');const P=require(path.join(R,'musicfx.js'))._pure,EB=require(path.join(R,'echoback.js'));
const T=JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'),'utf8'));EB.setData(T.echo_it_back);const M=JSON.parse(fs.readFileSync(path.join(R,'music/motif.json'),'utf8'));
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};const F=['slyte','whimber','twitchel'],rd=f=>fs.readFileSync(path.join(R,f),'utf8');
// data: the three approved motifs, no weave / quote / home sections, no new audio
const deg=f=>M.families[f].motif.n.map(x=>x[0]).join(' ');
ok(deg('slyte')==='5 6 5 2'&&deg('whimber')==='5 3 2 1'&&deg('twitchel')==='3 5 6 5','motifs: Howlings sol-la-sol-re, Wingsongs sol-mi-re-do, Purrlings mi-sol-la-sol');
ok(F.every(f=>M.families[f].do_midi===T.echo_it_back.do_midi[f])&&T.echo_it_back.do_midi.slyte===62&&T.echo_it_back.do_midi.whimber===70&&T.echo_it_back.do_midi.twitchel===65,'keys D / Bb / F (same do as Echo It Back)');
ok(!('home' in M)&&!('quotes' in M)&&!('woven' in M)&&!('quote_at_tier' in M.levelup)&&!/quote|weave|woven/i.test(JSON.stringify(Object.keys(M))),'motif.json: no home / quotes / woven sections');
ok(!fs.existsSync(path.join(R,'music/weave.json'))&&!fs.existsSync(path.join(R,'weave.js')),'no weave data or runtime in the tree');
ok(!fs.readdirSync(path.join(R,'music')).concat(fs.readdirSync(path.join(R,'sfx'))).some(x=>/motif|weave/i.test(x)&&/\.(ogg|mp3|wav)$/.test(x)&&!/_pet_motif\.mp3$/.test(x)),'no rendered motif audio (built at runtime from note samples)');
// every shape uses only existing note samples, real notes, no rests
const SH=['full','fragment_tail','rhythm_flip','full_do'];
for(const f of F)for(const s of SH)for(const mult of [1,M.jingles.ticks_mult]){const q=P.motifShape(M.families[f].motif,s,mult);
  ok(q.length>=4&&q.every(x=>x[0]>=1&&x[0]<=7&&x[2]>=1&&fs.existsSync(path.join(R,'music/notes',f+'_'+EB.fileOfMidi(f,EB.midiOfNote(f,x))+'.ogg'))),`${f} ${s} x${mult}: real notes with samples`)}
const m0=M.families.slyte.motif;
ok(JSON.stringify(P.motifShape(m0,'fragment_tail').map(x=>x[0]))==='[5,6,5,1]','fragment_tail = first 3 notes + do');
ok(JSON.stringify(P.motifShape(m0,'rhythm_flip').map(x=>x[2]))===JSON.stringify(m0.n.map(x=>x[2]).reverse()),'rhythm_flip = ticks reversed');
ok(F.every(f=>{const q=P.motifShape(M.families[f].motif,'full_do');const z=q[q.length-1];return z[0]===1&&z[1]===0&&q.slice(0,4).every((x,i)=>x[0]===M.families[f].motif.n[i][0])}),'grow-up sting: the full motif, ending on do');
ok(JSON.stringify(P.motifShape(m0,'full',.5).map(x=>x[2]))===JSON.stringify(m0.n.map(x=>x[2]/2)),'jingle pre-roll at half the ticks');
// hums rotate, never the same shape twice in a row
{const s=[];for(let k=0;k<12;k++)s.push(P.humShape(M,k));ok(new Set(s).size===3&&s.every((x,i)=>!i||x!==s[i-1]),'hum rotation: full / fragment_tail / rhythm_flip, no back-to-back repeat')}
// placement: only hum, jingle, sting; never a loop, a quote, a weave, Echo It Back, a game hook
for(const f of F){for(const w of ['hum','jingle','sting'])ok(P.motifOk(M,f,w,[]),`${f}: plays in a ${w}`);
  for(const w of ['loop','home','quote','weave','eib','catch','warmup','farewell',undefined])ok(!P.motifOk(M,f,w,[]),`${f}: never in "${w}"`)}
// exclusions (clash check): Wingsongs never in farewell / goodbye / release / playoff; Purrlings never in a warm-up or right after its yay
for(const c of ['farewell','goodbye','release','playoff'])for(const w of ['hum','jingle','sting']){ok(!P.motifOk(M,'whimber',w,[c]),`Wingsongs ${w}: none in ${c}`);ok(P.motifOk(M,'slyte',w,[c])&&P.motifOk(M,'twitchel',w,[c]),`Howlings / Purrlings ${w} unaffected by ${c}`)}
for(const c of ['warmup','after_yay'])for(const w of ['hum','jingle','sting']){ok(!P.motifOk(M,'twitchel',w,[c]),`Purrlings ${w}: none in ${c}`);ok(P.motifOk(M,'slyte',w,[c])&&P.motifOk(M,'whimber',w,[c]),`Howlings / Wingsongs ${w} unaffected by ${c}`)}
// placement in the code: the only callers
const gj=rd('game.js'),al=rd('alive.js'),mf=rd('musicfx.js');
const gjNoDef=gj.replace(/function SFXm\(n,o\)\{[^\n]*/,''),pre=[...gjNoDef.matchAll(/SFXm\((FAMD\(\)\.music\.bondup_sting|'[a-z_0-9]+')/g)].map(m=>m[1]);
ok(pre.length===(gjNoDef.match(/SFXm\(/g)||[]).length&&pre.length===7&&pre.every(x=>/^'(run_finale|memory_all_cleared|run_treasure_5)'$/.test(x)||x==='FAMD().music.bondup_sting'),'game.js: the motif pre-roll is only on the 3 jingles + the grow-up sting ('+pre.join(' | ')+')');
ok(/\(treN%5===0\?SFXm:SFX\)/.test(gj),'run_treasure_1 keeps its plain sfx');
ok(/const pre=SFXm\(FAMD\(\)\.music\.bondup_sting[^\n]*\n[^\n]*dl=pre\+/.test(gj),'the growing song waits for motif + sting');
ok(!/MusicFX\.(hum|preroll|motif(?!Stop))/.test(gjNoDef),'game.js calls the motif only through SFXm');
ok((al.match(/MusicFX\.hum/g)||[]).length===2&&/if\(g==='hum'\)\{[^\n]*W\.MusicFX\.hum\(\)/.test(al),'alive.js: the hum gesture is the only hum caller');
const fwBody=gj.slice(gj.indexOf('// ---------- Farewell arc'),gj.indexOf('// ---------- Farewell arc')+20000);ok(!/SFXm|preroll|MusicFX\.hum/.test(fwBody),'no motif call written in the farewell arc');
ok(!/preroll|motifPlay|MusicFX\.hum/.test(rd('sound.js'))&&!/preroll|motifPlay|MusicFX\.hum/.test(rd('warmup.js')),'home loops (sound.js) and the warm-up never call the motif');
ok(/MFX\.playoff=function\(o\)\{PLAYOFF=1;/.test(mf)&&/\.then\(v=>\{PLAYOFF=0;return v\}\)/.test(mf),'the play-off marks its context');
ok(/function gameShell\(title\)\{GT\+\+;if\(window\.MusicFX&&MusicFX\.motifStop\)MusicFX\.motifStop\(\);/.test(gj)&&(mf.match(/timers:MT\}/g)||[]).length===2,'opening a game stops a pending motif, pre-rolled sfx and growing song (no tail into the game)');
console.log(`motif: ${n} checks, ${bad} failed`);process.exit(bad?1:0)
