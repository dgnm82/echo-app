#!/usr/bin/env node
// Music School Phase 1 step 4: listening missions (missions.js pure core + music/missions.json + the per-child store).
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');
const mem={};globalThis.localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}};
globalThis.MusicLevel=require(path.join(R,'musiclevel.js'));const EB=require(path.join(R,'echoback.js'));const M=require(path.join(R,'missions.js'));
const data=JSON.parse(fs.readFileSync(path.join(R,'music/missions.json'),'utf8')),man=JSON.parse(fs.readFileSync(path.join(R,'px/missions/manifest.json'),'utf8'));
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
// ---- data
ok(data.missions.length===6&&data.missions.map(m=>m.id).join()===man.missions.map(m=>m.id).join(),'6 missions in Pixal order');
const dlg={};['slyte','whimber','twitchel'].forEach(f=>dlg[f]=JSON.parse(fs.readFileSync(path.join(R,`dialogue/${f}.json`),'utf8')).barks);
for(const m of data.missions){ok(m.answers.length===4&&m.answers[3].id==='other','4 answers ending in other: '+m.id);
  ok(JSON.stringify(m.answers.map(a=>a.id))===JSON.stringify(man.missions.find(x=>x.id===m.id).answers),'answers = approved set: '+m.id);
  for(const a of m.answers){ok(fs.existsSync(path.join(R,a.icon)),'icon exists '+a.icon);ok(a.snd&&(a.snd.home||(a.snd.notes||[]).length),'every answer has a sound '+m.id+'/'+a.id)}
  for(const p of [m.card,m.mini,...m.icon_paths])ok(fs.existsSync(path.join(R,p)),'art exists '+p);
  for(const f in dlg)for(const k of [m.give,m.ask])for(const b of ['5-6','7-8','9-10'])ok((dlg[f][k]||[]).some(l=>l.cond&&l.cond.var&&l.cond.var.eib_band===b),`${f} ${k} has a ${b} line`)}
for(const f in dlg)ok((dlg[f].mission_back||[]).length===3,f+' mission_back lines');
ok(data.missions.find(m=>m.id==='song_back').min_ml===2,'song_back needs ML2');
// real notes only: every planned note is on the family ladder
const tunes=JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'),'utf8')).families;
for(const f in tunes)for(const m of data.missions)for(const a of m.answers)for(const e of M.plan(a.snd,tunes[f].dig_ladder,data.bpm))ok(e.kind==='home'?tunes&&true:tunes[f].dig_ladder.includes(e.n),`real note ${f} ${m.id}/${a.id}`);
// ---- offer rules
const DAY=864e5,t0=new Date(2026,10,2,16,0).getTime();let st=M.norm({});
ok(!M.canOffer(data,st,2,{now:t0,sessions:1}),'never in the first session');
ok(!M.canOffer(data,st,2,{now:t0,sessions:3,care:true}),'never during care');
ok(M.canOffer(data,st,2,{now:t0,sessions:2}).id==='high_sound','first offer: high_sound');
M.give(st,'high_sound',t0);
ok(!M.canOffer(data,st,2,{now:t0+60000,sessions:2}),'not twice in a day');
ok(!M.canOffer(data,st,2,{now:t0+DAY,sessions:3}),'not while a card is out');
ok(!M.canOffer(data,st,2,{now:t0+DAY,sessions:3,offered:true}),'once per session');
// ---- ask rules
ok(!M.canAsk(st,{now:t0+1000,sessStart:t0-1000}),'not asked in the session it was given');
const s2=t0+DAY;ok(M.canAsk(st,{now:s2,sessStart:s2})==='high_sound','asked on the next session');
ok(!M.canAsk(st,{now:s2,sessStart:s2,asked:true}),'asked once per session');
M.notYet(st,'high_sound',s2);ok(M.outstanding(st).join()==='high_sound','Not yet keeps the card');
ok(!M.canAsk(st,{now:s2+3600e3,sessStart:s2+3600e3}),'no reminder the same day after Not yet');
const s60=t0+60*DAY;ok(M.canAsk(st,{now:s60,sessStart:s60})==='high_sound','nothing expires: still asked 60 days on');
ok(M.rows(data,st).rows[0].found===null&&!M.rows(data,st).next,'page: card still out, no next row');
M.answer(st,'high_sound','bird',s60);ok(st.back.high_sound.pick==='bird'&&!M.outstanding(st).length,'answer brings the card home');
ok(M.rows(data,st).rows[0].found===data.missions[0].answers[0].icon&&M.rows(data,st).next,'page: found bubble + one next row');
ok(M.canOffer(data,st,1,{now:s60,sessions:9}).id==='low_sound','after the answer the next card is low_sound');
// ML order: at ML1 song_back never comes
let s=M.norm({}),t=t0;for(let i=0;i<8;i++){t+=DAY;const m=M.canOffer(data,s,1,{now:t,sessions:5});if(m){M.give(s,m.id,t);M.answer(s,m.id,'other',t+DAY/2)}}
ok(Object.keys(s.given).length===5&&!s.given.song_back,'ML1: five missions, song_back waits for ML2');
t+=DAY;ok(M.canOffer(data,s,2,{now:t,sessions:9}).id==='song_back','ML2: song_back next');
ok(JSON.stringify(M.rows(data,s)).match(/"found"/g).length===5&&!/count|total|score/.test(JSON.stringify(M.rows(data,s))),'page rows carry no counts');
EB.setData(JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'),'utf8')).echo_it_back);
// ---- per-child store: survives a new Echo (same kid, new Echo state)
EB.seedMl('kidA','7-8');EB.withMl('kidA',m=>{m.missions=M.give(M.norm(m.missions),'low_sound',t0)},'7-8');
const again=EB.mlFor('kidA','7-8');ok(again.missions&&again.missions.given.low_sound===t0,'missions live in progress[kid].ml and survive a new Echo');
console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
