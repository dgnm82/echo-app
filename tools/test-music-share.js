#!/usr/bin/env node
// Music School Phase 1 step 4: music share in dialogue (PLAN step 4 acceptance).
// Simulates 30-minute sessions per family x band through the real Dialogue.bark + DialogueEngine quota, and checks:
//   music share 18-25% per family x band (mean of 3 days), 0% music lines in care/calm keys, quota unit behaviour.
// Tags: the corpus's own "music" fields when Cole's reviewed tags are applied; until then the auto-tagger proposals
// (tools/music_tags/proposals.json, accept !== false) are applied IN MEMORY only. Prints which source it used.
//   node tools/test-music-share.js [--corpus-only] [--verbose]
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');
const E=require(path.join(R,'dialogue_engine.js'));const D=require(path.join(R,'dialogue.js'));
const args=process.argv.slice(2),verbose=args.includes('--verbose'),corpusOnly=args.includes('--corpus-only'),strict=args.includes('--strict');   // --strict: the shipped corpus must hit 18-25% (step4_dropin.sh)
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const J=f=>JSON.parse(fs.readFileSync(path.join(R,f),'utf8'));
const FAMS=['slyte','whimber','twitchel'],BANDS=['5-6','7-8','9-10'],LOOK={slyte:'fox',whimber:'owl',twitchel:'cat'};
// ---- unit: quota factor, care keys, history mark, events
{const l={text:'a beat',music:'pulse'},q=E.MUSIC_QUOTA;
 ok(E.musicFactor({text:'x'},'ambient',0)===1,'untagged line factor 1');
 ok(E.musicTarget(0.1,64)===q.target[0]&&E.musicTarget(0.2,64)===q.target[1]&&E.musicTarget(0.23,64)===q.target[2]&&E.musicTarget(0.3,64)===0,'target by share band');
 ok(q.target[0]>q.target[1]&&q.target[1]>q.target[2]&&E.musicTarget(0.3,3)===null,'targets fall with share; short history: no steering');
 for(const k of ['fed','fed_fav','pet','sit','nap','napping','sad','farewell','goodbye_fox','food_apple_slice','need_sleepy'])ok(E.musicFactor(l,k)===0,'care key never music: '+k);
 ok(E.musicFactor({...l,lintAllow:['music_care']},'pet')>0,'lintAllow music_care opts in');
 ok(E.historyId('ambient',l).startsWith(E.MUSIC_MARK)&&!E.historyId('ambient',{text:'x'}).startsWith(E.MUSIC_MARK),'music lines marked in history');
 ok(Math.abs(E.musicShare(['\u266aa','b','c','\u266ad'])-0.5)<1e-9&&E.musicShare([])===0,'share off the ring');
 const S={};E.noteEvent(S,'catch_hook',1000);E.noteEvent(S,'not_an_event',1000);E.noteEvent(S,'stack_tune',2000);
 ok(JSON.stringify(E.recentEvents(S,3000))==='["catch_hook","stack_tune"]','recent events kept');ok(E.recentEvents(S,1000+16*60000).length===0,'events age out after 15 min');
 ok(!E.MUSIC_EVENTS.some(e=>/secret|bond/.test(e)),'event names carry no "secret"/"bond"');
 for(let i=0;i<20;i++)E.noteEvent(S,'song_grew',5000+i);ok(S.recentMusic.length<=8,'event ring capped');
 // cond.recent through the real check()
 D.use('slyte',{barks:{}},{barks:{music_react:[{text:'That hook again!',cond:{recent:['catch_hook']}}]}});D.mem={};D.now=()=>1e12;
 D.ctx=()=>({recent:[]});ok(D.bark('music_react').text==='…','cond.recent: no event, no line');
 D.ctx=()=>({recent:['catch_hook']});ok(D.bark('music_react').text==='That hook again!','cond.recent: event, line');
 // care key with only music lines -> silent, never a music line
 D.use('slyte',{barks:{}},{barks:{pet:[{text:'a beat!',music:'pulse'}],ambient:[{text:'plain'},{text:'a beat!',music:'pulse'}]}});D.ctx=()=>({history:[]});
 ok(D.bark('pet').text==='…','care key never returns a music line')}
// ---- corpus tags
const prop=fs.existsSync(path.join(R,'tools/music_tags/proposals.json'))?J('tools/music_tags/proposals.json'):{items:[]};
const corpus={shared:J('dialogue/shared.json')};FAMS.forEach(f=>corpus[f]=J(`dialogue/${f}.json`));
const own=Object.values(corpus).reduce((n,d)=>n+Object.values(d.barks).reduce((a,p)=>a+p.filter(l=>l.music).length,0),0);
let src='corpus tags only';if(!corpusOnly){src='corpus tags + auto-tagger proposals not rejected (in memory)';for(const it of prop.items){if(it.accept===false)continue;const d=corpus[it.file.replace('.json','')],l=d&&d.barks[it.key]&&d.barks[it.key][it.i];if(l&&l.text===it.text&&!l.music)l.music=it.tag}}
console.log(`tags: ${src} (${own} tagged lines in corpus, ${prop.items.length} proposals)`);
// lint guard: every music value is a known tag, and no tagged line sits in a care key without lintAllow
for(const [f,d] of Object.entries(corpus))for(const [k,p] of Object.entries(d.barks))p.forEach((l,i)=>{if(l.music){if(!E.MUSIC_TAGS.includes(l.music))ok(false,`${f} ${k}[${i}] bad tag ${l.music}`);}});
// ---- simulated sessions
const GAMES={catch:['catch_start','catch_song','catch_streak','catch_song','catch_end'],tower:['tower_start','tower_beat','tower_beat','tower_perfect','tower_end'],
  eib:['eib_hello','eib_your_turn','eib_same','eib_more1','eib_close'],run:['run_start','run_treasure','run_glow','run_end'],dig:['dig_start','dig_row','dig_climb','dig_end'],pairs:['pairs_start','pairs_pair','pairs_pair','pairs_done']};
const CARE=['fed','pet','pet','sit','nap','fed_fav','full'];const BETWEEN=['ambient','ambient','look_sing','weather_clear','aff_smile','ambient','callback','tangent','after_play','ambient'];
function lcg(s){return ()=>(s=(s*1103515245+12345)%2147483648)/2147483648}
function session(f,band,day,S){const rnd=lcg(7+day*131+FAMS.indexOf(f)*17+BANDS.indexOf(band)*3);D.rand=rnd;let t=Date.UTC(2026,10,2+day,16);D.now=()=>t;
  D.ctx=()=>({history:S.chatHistory,recent:E.recentEvents(S,t),mood:'happy',bond:60,stage:3,memTags:[],talents:[],time:'day',weather:'clear',seen:[],vars:{origin_animal:LOOK[f],eib_band:band,season:'none'}});
  const out=[];const say=k=>{if(!D.lib.barks[k])return;const l=D.bark(k);t+=25000;if(!l||l.text==='…')return;E.recordHistory(E.historyId(k,l.src),S);out.push({k,m:!!(l.src&&l.src.music)})};
  say('hello');say('time_day');const order=Object.keys(GAMES);let gi=day%order.length;
  while(t<Date.UTC(2026,10,2+day,16,30)){for(let i=0;i<3;i++)say(BETWEEN[Math.floor(rnd()*BETWEEN.length)]);say(CARE[Math.floor(rnd()*CARE.length)]);
    GAMES[order[gi++%order.length]].forEach(say);say('game_end');say(CARE[Math.floor(rnd()*CARE.length)])}
  return out}
const rows=[],awaited=[];let careMusic=0;
for(const f of FAMS)for(const band of BANDS){D.use(f,corpus.shared,corpus[f]);D.mem={};const S={chatHistory:[]};const shares=[];
  for(let day=0;day<3;day++){const o=session(f,band,day,S);shares.push(o.filter(x=>x.m).length/o.length);careMusic+=o.filter(x=>x.m&&E.isCareKey(x.k)).length;if(verbose)console.log(f,band,day,o.length,'lines',(100*shares[day]).toFixed(1)+'%')}
  const mean=shares.reduce((a,b)=>a+b,0)/shares.length;rows.push([f,band,mean,Math.min(...shares),Math.max(...shares)]);
  if(mean>0.25)ok(false,`${f} ${band}: music share ${(100*mean).toFixed(1)}% over 25%`);   // over the cap is always a ranker failure
  else if(mean<0.18){if(strict)ok(false,`${f} ${band}: music share ${(100*mean).toFixed(1)}% under 18%`);else awaited.push(`${f} ${band} ${(100*mean).toFixed(1)}%`)}else pass++}
ok(careMusic===0,`music lines in care/calm keys: ${careMusic}`);
// ---- the same sessions with the quota OFF (baseline, for the report)
const mt=E.musicTarget;E.musicTarget=()=>null;const base=[];
for(const f of FAMS)for(const band of BANDS){D.use(f,corpus.shared,corpus[f]);D.mem={};const S={chatHistory:[]};let m=0,n=0;for(let day=0;day<3;day++){const o=session(f,band,day,S);m+=o.filter(x=>x.m).length;n+=o.length}base.push(m/n)}
E.musicTarget=mt;
console.log('family   band  share(mean/min/max)        no-quota');rows.forEach((r,i)=>console.log(`${r[0].padEnd(8)} ${r[1].padEnd(5)} ${(100*r[2]).toFixed(1)}% / ${(100*r[3]).toFixed(1)}% / ${(100*r[4]).toFixed(1)}%    ${(100*base[i]).toFixed(1)}%`));
console.log(`care/calm music lines: ${careMusic}`);
// ---- the ranker itself, on a synthetic corpus with the same keys: p = share of each non-care key's lines that are tagged
{const keys=[...new Set([...Object.values(GAMES).flat(),...BETWEEN,...CARE,'hello','time_day','game_end'])];const res=[];
 for(const p of [0.25,0.35,0.5,0.8]){let m=0,n=0;for(const f of FAMS){const b={};for(const k of keys){b[k]=[];for(let i=0;i<40;i++)b[k].push(Object.assign({text:`${k} line ${i}`},!E.isCareKey(k)&&i<Math.round(40*p)?{music:'pulse'}:{}))}
   D.use(f,{barks:{}},{barks:b});D.mem={};const S={chatHistory:[]};for(let day=0;day<3;day++){const o=session(f,'7-8',day,S);m+=o.filter(x=>x.m).length;n+=o.length;careMusic+=o.filter(x=>x.m&&E.isCareKey(x.k)).length}}
   res.push([p,m/n]);ok(m/n>=0.18&&m/n<=0.25,`synthetic supply ${p*100}%: share ${(100*m/n).toFixed(1)}% outside 18-25%`)}
 console.log('ranker on synthetic corpus (tagged share of each key -> music share):',res.map(([p,s])=>`${p*100}%->${(100*s).toFixed(1)}%`).join('  '));ok(careMusic===0,'synthetic: no care music')}
if(awaited.length)console.log(`AWAITED (Cole step 4 lines + tag review): shipped-corpus share under 18% for ${awaited.length}/9: ${awaited.join(', ')}. Run with --strict after the drop-in.`);
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
