#!/usr/bin/env node
// Batch H final verification (Jay, Oct 25): runtime checks that the regex/source checks in test-batch-h.js do not cover.
//  H9  weather 'off' (Grown-Ups override or weatherOn:false) -> no weather line, chat, engine line or reaction; a fixed state plays only its own lines;
//      the merged corpus matches WEATHER_CTX.md (6 pools, 444 barks, 36 chats, 198 chips, context keys, ask-chat shape)
//  H13 every in-game pairs callout carries its key (2.5 s callout, not a 6.5 s+ blocking bubble); no hard-coded non-owl "hoo"
//  H10 prop waypoints (lantern / bell / chime / lantern_share) have a hotspot in EVERY runtime scene list, Purrlings included
//  H1  Cole's camera copy is merged verbatim (text / expr / short per band); pick is aliased to the identical line
// Usage: node tools/test-batch-h-final.js
const fs=require('fs'),path=require('path'),vm=require('vm');const R=path.join(__dirname,'..');const rd=f=>fs.readFileSync(path.join(R,f),'utf8');
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const W={console,Date,Math,JSON,addEventListener(){},removeEventListener(){},innerWidth:400,innerHeight:800,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},matchMedia:()=>({matches:false}),performance:{now:()=>0}};W.window=W;W.globalThis=W;
W.document={createElement:()=>({style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},remove(){}}),getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
vm.createContext(W);for(const f of ['families.js','scenes.js','pixel.js','weather_engine.js','dialogue.js','dialogue_engine.js','need_tags.js','need_select.js'])vm.runInContext(rd(f),W,{filename:f});
const game=rd('game.js'),X=W.WEATHER,D=W.Dialogue,NS=W.NeedSelect,E=W.DialogueEngine;const sh=JSON.parse(rd('dialogue/shared.json'));
const STATES=['clear','cloudy','rain','snow','fog','storm'];
// ---------------- H9 runtime: weather off -> nothing weather-ish plays
const isWx=l=>!!(l&&l.cond&&l.cond.weather);
function run(fam,S){const sp=JSON.parse(rd('dialogue/'+fam+'.json'));D.use(fam,sh,sp);D.mem={};let t=Date.UTC(2026,0,10,12);D.now=()=>t;
  const wx=X.dialogueCtx(S,new Date(2026,0,10,12));   // January: snow season, so the legacy weather_snow lines would be reachable if anything leaked
  D.ctx=()=>({mood:'happy',bond:200,stage:2,memTags:[],talents:[],time:'day',vars:{season:'snow'},weather:wx,seen:[]});
  let rs=0;const seq=[0.01,0.2,0.4,0.6,0.8,0.99];D.rand=()=>seq[(rs++)%seq.length];
  const r={wx,convWx:0,barkWx:0,slotWx:0,slotN:0,engWx:0,convIds:new Set(),slotKeys:new Set()};
  for(const tr of new Set(D.lib.conversations.map(c=>c.trigger||'idle')))for(const c of D.eligible(tr)){if(isWx(c)||/_weather_/.test(c.id))r.convWx++;r.convIds.add(c.id)}
  for(const k of Object.keys(D.lib.barks))for(let i=0;i<6;i++){const l=D.bark(k);if(l&&isWx(l.src))r.barkWx++}
  NS.tags=(W.NEED_TAGS||{})[fam]||{barks:{},convs:{}};NS.now=()=>t;NS.session();NS.mem.start=t-1e9;NS.mem.any=-1e15;NS.mem.at={};NS.mem.n={};
  let k2=0;const sq2=[0.97,0.05,0.5,0.3,0.8,0.15,0.65,0.42];NS.rand=()=>sq2[(k2++)%sq2.length];
  for(let i=0;i<400;i++){t+=10*60e3;const s=NS.slot({needs:{food:90,play:90,comfort:90,rest:90},species:fam,band:'day',weather:wx||'clear'});r.slotN++;r.slotKeys.add(s.key);
    const tags=s.line&&s.line.src?(NS.tags.barks[s.key+':'+NS.h(s.line.src.text)]||[]):[];if(/^weather_/.test(s.key)||isWx(s.line&&s.line.src)||tags.some(x=>x.startsWith('w_')&&x!=='w_'+(wx||'clear')))r.slotWx++}
  for(let i=0;i<20;i++){const c=E.pick({state:{...S,chatHistory:[]},look:{slyte:'fox',whimber:'owl',twitchel:'cat'}[fam],family:fam,ageBand:'7-8'},{forceWeather:true,record:false});if(c&&(c.weather||/^weather_/.test(c.id||'')))r.engWx++}
  return r}
for(const fam of ['slyte','whimber','twitchel'])for(const [nm,S] of [['override off',{weatherOverride:'off'}],['weatherOn:false',{weatherOn:false}]]){const r=run(fam,S);
  ok(r.wx===undefined,`H9 ${fam} ${nm}: ctx.weather undefined`);ok(r.convWx===0,`H9 ${fam} ${nm}: no weather chat eligible (${r.convWx})`);ok(r.barkWx===0,`H9 ${fam} ${nm}: no cond.weather bark from any pool (${r.barkWx})`);
  ok(r.slotWx===0&&r.slotN===400,`H9 ${fam} ${nm}: 400 need/ambient slots, none weather (${r.slotWx}; keys ${[...r.slotKeys]})`);ok(r.engWx===0,`H9 ${fam} ${nm}: dialogue engine never voices weather, even forced (${r.engWx})`)}
for(const fam of ['slyte','whimber','twitchel'])for(const st of ['rain','snow','storm']){const r=run(fam,{weatherOverride:st});
  const sp=JSON.parse(rd('dialogue/'+fam+'.json'));D.use(fam,sh,sp);const own=D.lib.conversations.filter(c=>isWx(c)).map(c=>c.id);
  ok(r.wx===st&&[...r.convIds].filter(id=>/_weather_/.test(id)).every(id=>id.startsWith(`${fam}_weather_${st}`))&&[...r.convIds].some(id=>id===`${fam}_weather_${st}_ask`),`H9 ${fam} ${st}: only its own weather chats are eligible, the ask-chat included`);
  ok(r.engWx>0,`H9 ${fam} ${st}: the engine can voice the Echo's own ${st} line`);ok(own.length===12,`${fam}: 12 weather chats in the corpus`)}
{let reacted=0;const save=X.react;for(const S of [{weatherOverride:'off'},{weatherOn:false}])if(X.reactionFor(X.dialogueCtx(S)))reacted++;ok(reacted===0,'H9: no Echo weather reaction when weather is off');
  ok(STATES.filter(s=>X.reactionFor(s)).join()==='rain,snow,fog,storm','H9: reactions on for rain / snow / fog / storm (clear + cloudy: the den motes)')}
ok(/const go=\(\)=>\{if\(\(sess\.wxReact\|\|0\)>=WX_REACT_MAX\|\|!window\.WEATHER\|\|!WEATHER\.react\)return;const w=wxNow\(\);if\(!w\|\|/.test(game),'H9: the reaction scheduler bails out when wxNow() is undefined (off)');
{const f=(/function wxReactOk\(\)\{[^\n]*/.exec(game)||[''])[0];ok(f&&!/fwCalm\(|maybeChat\(|runConv\(|talk\(/.test(f.replace(/\/\/.*$/,"")),'H9: the reaction gate is side-effect free (never calls fwCalm, which starts the farewell news)')}
// ---------------- H9 corpus shape = WEATHER_CTX.md
{const want={slyte:22,whimber:27,twitchel:25};let tot=0,convs=0,chips=0,badShape=[];
  for(const fam of Object.keys(want)){const d=JSON.parse(rd('dialogue/'+fam+'.json'));
    for(const st of STATES){const L=(d.barks['weather_'+st]||[]).filter(isWx);tot+=L.length;if(L.length!==want[fam])badShape.push(`${fam}/${st}: ${L.length} lines`);
      for(const l of L){if(JSON.stringify(l.cond.weather)!==JSON.stringify([st])||(l.context||{}).weather!==st)badShape.push(`${fam}/${st}: cond/context mismatch ${l.text}`);
        if(Object.keys(l.context||{}).some(k=>!['weather','age_band','look','kind'].includes(k)))badShape.push('context key');if(Object.keys(l.cond).some(k=>!['weather','time','var'].includes(k)))badShape.push('cond key')}}
    for(const c of d.conversations.filter(isWx)){convs++;const ask=/_ask$/.test(c.id),st=c.id.replace(fam+'_weather_','').replace('_ask','');
      if(c.topic!=='weather_'+st+(ask?'_ask':''))badShape.push(c.id+' topic');Object.values(c.nodes).forEach(nd=>{chips+=(nd.choices||[]).length;if((nd.choices||[]).length>4)badShape.push(c.id+' >4 chips')});
      if(ask){if(c.trigger!=='idle'||c.weight!==3||!c.nodes.a||!c.nodes.b||!c.nodes.c||(c.context||{}).kind!=='ask_child')badShape.push(c.id+' ask shape');
        if(!/where you are\?$/.test(c.nodes.a.say)||!/\b(my|here)\b/i.test(c.nodes.a.say))badShape.push(c.id+': node a is not "my world + ask"')}}
    ok(((d.topicGroups||{}).weather_chats||[]).length===12,`${fam}: topicGroups.weather_chats lists 12 topics`)}
  ok(tot===444&&convs===36&&chips===198,`H9 corpus = WEATHER_CTX.md counts (444 barks / 36 chats / 198 chips: ${tot} / ${convs} / ${chips})`);ok(!badShape.length,'H9 corpus shape: '+badShape.slice(0,6).join('; '));
  ok(JSON.stringify(X.STATES)===JSON.stringify(STATES),'H9: WEATHER.STATES = WEATHER_CTX.md states');
  {let s=0;for(const se of Object.keys(X.SEASON_W))s+=Math.abs(Object.values(X.SEASON_W[se]).reduce((a,b)=>a+b,0)-1);ok(s<1e-9,'H9: each season\'s weights sum to 1')}}
// ---------------- H13 / H14 pairs callout
{const line=game.split('\n').find(l=>l.includes('Two ${PAIR_NAMES[e.item]||e.item}'))||'';ok((line.match(/key:'pairs_pair'/g)||[]).length===2,'H13: both hard-coded pairs callouts carry key pairs_pair (2.5 s in-game callout)');
  ok(/Dialogue\.speciesCalls\(`Two \$\{PAIR_NAMES\[e\.item\]\|\|e\.item\}… hoo\.`,Dialogue\.lookOf\(Dialogue\.ctx\(\)\)\)/.test(line),'H14: the bird pairs callout swaps hoo for the look\'s own call');
  ok(D.speciesCalls('Two acorns… hoo.','duck')==='Two acorns… quack.'||!/hoo/i.test(D.speciesCalls('Two acorns… hoo.','duck')),'H14: duck pairs callout has no hoo');
  let raw=0;for(const m of game.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g)){const t=m[2];if(/\bhoo\b|\bhoo-/i.test(t)){const ln=game.slice(game.lastIndexOf('\n',m.index)+1,game.indexOf('\n',m.index));if(!/speciesCalls|owl/.test(ln))raw++}}
  ok(raw===0,'H14: no hard-coded hoo string in game.js outside speciesCalls / owl-only code ('+raw+')')}
// ---------------- H10 prop waypoints in every runtime scene list (incl. the borrowed Purrling scenes)
{const H=W.ENV_HOTSPOTS,grab=re=>{const m=re.exec(game);return m?m[0]:''};const ctx={JSON,console,SCENES:JSON.parse(JSON.stringify(W.SCENES)),FAMILIES:JSON.parse(JSON.stringify(W.FAMILIES))};ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(['let S,CURF;',grab(/function famScenes\(\)\{[^\n]*\n[^\n]*\n[^\n]*/),'famScenes();',grab(/const H4_WILD=[^\n]*/),grab(/function curLook\(\)\{[^\n]*/),grab(/const H4_SCENE=\{\};function h4Scene\(sc\)\{[^\n]*\n[^\n]*/),'function CID(){return CURF}',grab(/function scList\(\)\{[^\n]*/),'this.go=(f,kind,lk)=>{CURF=f;S={kind,origin:{animal:lk}};return scList()};'].join('\n'),ctx);
  const need=w=>/lantern|bell|chime/.test(w.id)||(w.acts||[]).includes('lantern_share');const dead=new Set();let scenes=0;
  for(const f of W.FAMILIES.order){const kind={slyte:'fox',whimber:'owl',twitchel:'cat'}[f];for(const lk of Object.keys(W.FAMILIES.animals).filter(a=>W.FAMILIES.animals[a].family===f))for(const sc of ctx.go(f,kind,lk)){scenes++;for(const w of sc.wp||[])if(need(w)&&!H.wpTarget(w.id,sc.id,f))dead.add(`${f}/${lk}/${sc.id}/${w.id}`)}}
  ok(scenes>=40&&!dead.size,`H10: no dead prop waypoint in any family/look scene list (${scenes} scene lists; ${[...dead].join(' ')})`);
  ok(!JSON.stringify(W.SCENES).includes('lantern_share')||W.SCENES.whimber.find(s=>s.id==='library').wp.some(w=>w.id==='lantern'&&H.wpTarget('lantern','library','whimber')),'H10: the only lantern_share left (library) has its library_lantern hotspot');
  const vine=H.forScene('wild_clearing','twitchel').find(h=>h.id==='tw_wild_den_bellvine');ok(vine&&!ctx.go('twitchel','cat','lion').find(s=>s.id==='wild_clearing').wp.some(w=>w.id===vine.wp),'H10: no waypoint targets the bell-vine, so idle wandering never walks the Echo to it')}
// ---------------- H1 camera copy merged verbatim
{const C=JSON.parse(fs.readFileSync('/workspace/echo/batch_H/H1_camera_copy.json','utf8')),B=sh.barks,AL={ui_or_cam_pick:'ui_or_seen_ask'};
  for(const k of ['ui_or_cam_ask','ui_or_cam_hint','ui_or_cam_found','ui_or_cam_miss','ui_or_cam_retry','ui_or_cam_pick']){const src=C[k],dst=B[k]||B[AL[k]];
    ok(src&&dst&&(B[k]?src.length===dst.length&&src.every((l,i)=>l.text===dst[i].text&&l.expr===dst[i].expr&&l.short===dst[i].short&&(l.band||'all')===(dst[i].context||{}).age_band):src.every(l=>dst.some(x=>x.text.toLowerCase()===l.text.toLowerCase()))),`H1: ${k} = Cole's copy${B[k]?'':' (aliased to '+AL[k]+')'}`)}}
// ---------------- phone-suite regressions found in Batch H (both real app bugs, not test drift)
{const m=game.match(/memory:(\(m=>String\(\(m&&m\.text\)\|\|m\|\|'the day we met'\)\))\(S\.memories\[/);ok(!!m,'ctx.memory tolerates object memories ({text,tag,t}) instead of throwing in Dialogue.ctx');
  if(m){const f=eval(m[1]);ok(f({text:'We gathered berries.',tag:'x'})==='We gathered berries.'&&f('the snow day')==='the snow day'&&f(undefined)==='the day we met','ctx.memory: object, string and empty forms')}
  ok(/PIXEL\.variant\(g\.seed,f\.sprite,g\.pal,o\.fluff!=null\?o\.fluff:undefined\)/.test(game)&&!/o\.fluff!=null\?o\.fluff:g\.fluff/.test(game),'origin finish: home fluff comes from the origin seed (same sprite as the invite), not genEcho\'s throwaway seed')}
// ---------------- H1 Grown-Ups privacy note (PM, Oct 25). camera_match.js does grab frames into a 360x360 RAM canvas (drawImage/getImageData), overwritten every tick and cleared on stop; never encoded or stored
{const cm=rd('camera_match.js').replace(/^\s*\/\/.*$/mg,'');ok(game.includes('<div class="pcnote">${U(\'ui_pc_privacy\')} The camera only looks for a moment, right on this device. No photo is ever saved or sent anywhere.'),'H1: Grown-Ups privacy note is the PM\'s exact camera text');
  ok(!/no photo is ever taken/.test(game),'H1: old "no photo is ever taken" note is gone');
  ok(/cx\.drawImage\(video/.test(cm)&&/cx\.clearRect\(0,0,SIZE,SIZE\)/.test(cm)&&!/toDataURL|toBlob|localStorage|indexedDB|fetch\(|XMLHttpRequest|ImageCapture|takePhoto/.test(cm),'H1: frames are only sampled in RAM and cleared on stop; never encoded, stored or sent')}
// ---------------- H5 sky taps (PM re-verify, Oct 25): every sky body answers with its own fx + real notes, never flowers, nothing indoors except the window
{const H=W.ENV_HOTSPOTS,calls=[],st0=W.setTimeout;W.Music={oneShot:(s,o)=>calls.push({s,o})};W.setTimeout=f=>{try{f()}catch(e){}return 0};
  const mk=()=>{const kids=[];return {kids,appendChild:e=>kids.push(e),querySelector:()=>null}},NOTE=/^[a-g](#|b)?[3-6]$/,
    m2hz=n=>{const B={c:0,d:2,e:4,f:5,g:7,a:9,b:11}[n[0]]+(n[1]==='#'?1:n[1]==='b'&&n.length===3?-1:0),o=+n[n.length-1];return 440*Math.pow(2,(B+12*(o+1)-69)/12)};
  W.document.createElement=()=>({style:{},dataset:{},classList:{add(){},remove(){}},remove(){}});
  const day={phase:'afternoon',sunUp:true,sun:{x:90,y:30},moon:null},night={phase:'night',sunUp:false,sun:null,moon:{x:40,y:40}},dawn={phase:'dawn',sunUp:true,sun:{x:20,y:120},moon:null};
  for(const fam of ['slyte','whimber','twitchel'])for(const [nm,x,y,sol,kind,fx] of [['sun',90,30,day,'sun','env-sky-flare'],['moon',41,39,night,'moon','env-sky-flare'],['star',150,20,night,'star','env-sky-star'],['cloud',150,90,day,'cloud','env-sky-cloud'],['cloud (dawn)',150,60,dawn,'cloud','env-sky-cloud']]){
    const sc=mk();calls.length=0;const r=H.skyTap(x,y,sc,fam,{solar:sol,force:true}),cls=sc.kids.map(e=>e.className||'');
    ok(r&&r.kind===kind&&r.sky&&!r.indoor,`H5 ${fam} ${nm}: tap is a ${kind}`);
    ok(cls.some(c=>c.startsWith(fx)),`H5 ${fam} ${nm}: ${fx.replace('env-sky-','')} fx spawned (${[...new Set(cls.map(c=>c.split(' ')[0]))].join(',')})`);
    ok(kind==='sun'||kind==='moon'?cls.filter(c=>c.startsWith('env-spark')).length>=3:true,`H5 ${fam} ${nm}: sparkle burst on sun/moon`);
    ok(cls.some(c=>c.startsWith('env-note')),`H5 ${fam} ${nm}: floating note`);
    ok(r&&r.notes.length===(kind==='sun'||kind==='moon'?2:1)&&r.notes.every(n=>NOTE.test(n))&&r.hz.every((h,i)=>Math.abs(h/m2hz(r.notes[i])-1)<0.003),`H5 ${fam} ${nm}: real notes ${r&&r.notes} @ ${r&&r.hz.map(h=>h.toFixed(1))}`);
    ok(calls.length===r.notes.length&&calls.every((c,i)=>String(c.s)===`notes/${fam}_${r.notes[i].replace('#','s')}`&&fs.existsSync(path.join(R,'music',c.s+'.ogg'))&&Math.abs((c.o.rate||1)-1)<1e-9),`H5 ${fam} ${nm}: each note is its own family sample, unpitched (${calls.map(c=>c.s)})`);
    ok(!/flower|mushroom/.test(r.spotId)&&H.brushAt(x,y+57,sc,fam,'clearing')===null,`H5 ${fam} ${nm}: never triggers a flower`)}
  // indoors: nothing outside the window; shelves inert; the window gives a glint (never stars / clouds)
  for(const [sid,fam,win,shelf,wall] of [['library','slyte',[80,10],[10,0],[90,120]],['twitchel_sunbeam_room','twitchel',[30,50],[140,60],[100,10]],['window','whimber',[80,10],[120,0],[90,130]],['shelf','slyte',[80,10],[30,110],[90,130]]]){
    ok(H.skyTap(shelf[0],shelf[1],mk(),fam,{solar:day,force:true,sceneId:sid})===null,`H5 indoors ${sid}: shelf tap does nothing`);
    ok(H.skyTap(wall[0],wall[1],mk(),fam,{solar:night,force:true,sceneId:sid})===null,`H5 indoors ${sid}: sky-height wall tap does nothing (no star)`);
    const sc=mk(),r=H.skyTap(win[0],win[1],sc,fam,{solar:day,force:true,sceneId:sid});ok(r&&r.indoor&&r.spotId==='window_sunbeam'&&!sc.kids.some(e=>/env-sky-(star|cloud)/.test(e.className)),`H5 indoors ${sid}: only the window answers (sunbeam glint)`)}
  W.setTimeout=st0;delete W.Music}
// ---------------- H6 den parallax (PM re-verify): on by default; off under lowFx, prefers-reduced-motion, or the Grown-Ups toggle
{const src=(game.match(/function lowFx\(\)\{[^\n]*?\}(?=\n)/)||[''])[0],dn=(game.match(/function denOn\(\)\{return [^}]*\}/)||[''])[0];ok(src&&dn,'H6: lowFx + denOn found');
  const run=(S,rm)=>{const f=new Function('S','window','matchMedia',src+';'+dn+';return denOn()');const mm=q=>({matches:!!rm&&/reduce/.test(q)});return f(S,{matchMedia:mm},mm)};
  ok(run({})===true,'H6: den on by default (fresh save, parallaxDen unset)');ok(run({parallaxDen:true})===true,'H6: den on when toggled on');
  ok(run({lowfx:true})===false,'H6: off under lowFx');ok(run({},true)===false,'H6: off under prefers-reduced-motion');ok(run({parallaxDen:false})===false,'H6: off via the Grown-Ups toggle');
  ok(/tog\('pcden','Moving 3D den',!\(S&&S\.parallaxDen===false\)\)/.test(game)&&/#pcden'\)\.onclick=\(\)=>\{need\(\);S\.parallaxDen=S\.parallaxDen===false\?true:false;save\(\);re\(\)\}/.test(game),'H6: Grown-Ups "Moving 3D den" toggle flips parallaxDen and shows on by default');
  ok(/if\(denOn\(\)\)DEN\.mount/.test(game),'H6: DEN.mount only when denOn()')}
// ---------------- H17 hum a song (PM re-verify): starred Songbook song > latest sticker (EIB) song > family song; real notes; sing pose + floating notes
{const fsrc=(game.match(/function humSong\(\)\{[\s\S]*?return played\}/)||[''])[0];ok(!!fsrc,'H17: humSong found');
  const T=JSON.parse(rd('music/tunes.json')).families,NOTE=/^[a-g](#|b)?[3-6]$/;
  const run=(sb,eib)=>{const log=[];const EchoBack={Songbook:{load:()=>sb},playSong:(f,s)=>{log.push(['song',f,s]);return 1000}},MusicFX={sing:f=>{log.push(['sing',f,T[f].catch.notes]);return 1}};
    const AL={act:a=>log.push(['alive',a])};const f=new Function('window','Alive','EchoBack','MusicFX','S','asleep','kind','FID','react','humNotes',fsrc+';const r=humSong();return [r,humSong.last]');
    const r=f({EchoBack,MusicFX,Alive:AL},AL,EchoBack,MusicFX,{eibSongs:eib||{}},()=>false,()=>{},()=>'twitchel',p=>log.push(['react',p]),()=>log.push(['notes']));return {r,log}};
  const star={bpm:100,n:[[1,0,4]]},stk={bpm:100,n:[[2,0,4]]};
  let o=run({star:'s2',songs:[{id:'s1',song:{x:1}},{id:'s2',song:star}]},{eib_1:{song:stk}});ok(o.r[0]==='song'&&o.log[0][0]==='song'&&o.log[0][2]===star,'H17: starred Songbook song wins');
  o=run({songs:[]},{eib_1:{song:stk}});ok(o.r[0]==='song'&&o.log[0][2]===stk,'H17: no star -> the sticker (Echo It Back) song');
  o=run(null,{});ok(o.r[0]==='sing'&&o.log[0][0]==='sing'&&o.log[0][1]==='twitchel','H17: nothing saved -> the family song (MusicFX.sing)');
  ok(['react','sing']+''===o.log.find(x=>x[0]==='react')+''&&o.log.some(x=>x[0]==='alive'&&x[1]==='sing')&&o.log.some(x=>x[0]==='notes'),'H17: sing pose (react + Alive) and floating notes');
  const mid=n=>{const B={c:0,d:2,e:4,f:5,g:7,a:9,b:11}[n[0]]+(n[1]==='#'?1:n[1]==='b'&&n.length===3?-1:0);return B+12*(+n[n.length-1]+1)};
  ok(Object.values(T).every(f=>f.catch&&f.catch.notes.length>=8&&f.catch.notes.every((n,i)=>NOTE.test(n)&&(!f.catch.midi||f.catch.midi[i]===mid(n)))),'H17: every family song is real note names (midi agrees)');
  {const miss=[];for(const [k,f] of Object.entries(T))for(const n of f.catch.notes)if(!fs.existsSync(path.join(R,'music/notes',`${k}_${n.replace('#','s')}.ogg`)))miss.push(k+'_'+n);ok(!miss.length,'H17: every family-song note has its own family sample '+miss.join(' '))}
  ok(/MFX\.sing=function\(f\)\{const F=fam\(f\),T=F&&F\.catch;[\s\S]{0,80}T\.notes\.forEach\(\(n,k\)=>\{setTimeout\(\(\)=>note\(f,n/.test(rd('musicfx.js')),'H17: MusicFX.sing plays the family catch tune note by note')}
// ---------------- H1 camera copy keys survive a dialogue rebuild (Cole regenerates dialogue/*.json; merge_h1_camera_copy.py re-adds them)
{const B=sh.barks||{},K=['ui_or_cam_ask','ui_or_cam_hint','ui_or_cam_found','ui_or_cam_miss','ui_or_cam_retry'];
  for(const k of K)ok(Array.isArray(B[k])&&B[k].length>0,`shared.json has ${k} (rerun tools/merge_h1_camera_copy.py if a rebuild dropped it)`);
  ok(Array.isArray(B.ui_or_seen_ask)&&B.ui_or_seen_ask.length>0&&!('ui_or_cam_pick' in B),'the 6th key, ui_or_cam_pick, is served by its approved alias ui_or_seen_ask')}
// ---------------- H6 x item 7: the den parallax never paints its (outdoor) layers over an indoor room (found in the Batch H screenshots)
{const DEN=W.DEN,mk=()=>{const html=[];return {className:'',html,querySelector:()=>null,insertAdjacentHTML:(w,h)=>html.push(h),style:{setProperty(){}}}};
  for(const [sid,fam] of [['sunbeam_room','cat'],['sunbeam_room','twitchel'],['twitchel_sunbeam_room','twitchel'],['basket_room','twitchel'],['library','slyte'],['window','whimber'],['shelf','twitchel']]){
    const e=mk();let r;try{r=DEN.mount(e,{fam,sceneId:sid})}catch(x){r='threw '+x.message}ok(r===null&&!e.html.length,`H6: no den layers over indoor ${sid} (${fam})`)}
  for(const [sid,fam] of [['clearing','slyte'],['branch','whimber'],['wild_clearing','twitchel']]){const e=mk();try{DEN.mount(e,{fam,sceneId:sid})}catch(x){}ok(e.html.some(h=>/den-wrap/.test(h)),`H6: den parallax still mounts outdoors (${sid}, ${fam})`)}}
// ---------------- PM (Oct 25): the tappable sun / moon and its flare sit on the disc PAINTED in the mounted den's L0 sky art
{const H=W.ENV_HOTSPOTS,B=H.DEN_SKY_BODY,art=JSON.parse(require('child_process').execFileSync('python3',[path.join(R,'tools/den_sky_bodies.py')]).toString());
  const TIDE=/tidepool_cove|kelp_reef|lighthouse_pier/;   // Tidelings are data-only: no runtime table names their scenes
  ok(!Object.keys(B).some(k=>TIDE.test(k)),'sky body table has no Tidelings entries');
  for(const [den,a] of Object.entries(art)){if(TIDE.test(den))continue;const b=B[den];ok(a&&b,`sky body: ${den} has a painted disc and a hotspot`);if(!a||!b)continue;
    const P=new Set(a.px.map(q=>q+''));ok(a.center_painted&&P.has([b.x,b.y]+''),`sky body: ${den} hotspot centre (${b.x},${b.y}) is a painted disc pixel`);
    let hit=0;for(const q of a.px)if(Math.hypot(q[0]-b.x,q[1]-b.y)<=b.r)hit++;ok(hit/a.px.length>=0.6,`sky body: ${den} hotspot circle covers the painted disc (${hit}/${a.px.length})`);
    ok(Math.abs(a.sc.x-b.x)<=1&&Math.abs(a.sc.y-b.y)<=1,`sky body: ${den} table matches the art (${a.sc.x},${a.sc.y})`)}
  const st0=W.setTimeout;W.setTimeout=()=>0;W.document.createElement=()=>({style:{},dataset:{},classList:{add(){},remove(){}},remove(){}});
  const mk=den=>{const kids=[],wrap={dataset:{den}};return {kids,appendChild:e=>kids.push(e),querySelector:q=>q==='.den-wrap'?wrap:null}};
  const day={phase:'afternoon',sunUp:true,sun:{x:84,y:23},moon:null},night={phase:'night',sunUp:false,sun:null,moon:{x:40,y:40}};
  for(const [den,b] of Object.entries(B)){for(const [nm,sol] of [['day',day],['night',night]]){
    const sc=mk(den),r=H.skyTap(b.x+2,b.y-1,sc,'slyte',{solar:sol,force:true}),want=b.body==='moon'||nm==='night'?'moon':'sun',fl=sc.kids.find(e=>/env-sky-flare/.test(e.className||''));
    ok(r&&r.kind===want,`sky tap on ${den}'s painted disc (${nm}) is the ${want} (${r&&r.kind})`);
    const m=fl&&/left:(-?\d+)px;top:(-?\d+)px/.exec(fl.style.cssText);ok(m&&Math.abs(+m[1]+12-b.x)<=1&&Math.abs(+m[2]+12-b.y)<=1,`flare origin on ${den}'s painted disc (${nm})`)}}
  {const r=H.skyTap(84,23,mk('moss_hollow'),'slyte',{solar:day,force:true});ok(r&&r.kind==='cloud','the old computed sun spot (84,23) is plain sky while the moss_hollow den is mounted')}
  {const r=H.skyTap(84,23,{kids:[],appendChild(){},querySelector:()=>null},'slyte',{solar:day,force:true});ok(r&&r.kind==='sun','no den mounted (lowFx / toggle off): the computed solar sun still answers')}
  W.setTimeout=st0}
// ---------------- PM (Oct 25) H7: every title Echo's feet (lowest opaque sprite row, every frame) sit on a defined surface line within 1 px
{const src=(game.match(/function titleCast\(b,Fm,day,opt\)\{[\s\S]*?\n  return cast\}/)||[''])[0],cst=(game.match(/const TITLE_TAG=[^\n]*/)||[''])[0];ok(!!src&&!!cst,'H7: titleCast found');
  const titleCast=new Function(cst+';'+src+';return titleCast')(),B=JSON.parse(rd('px/title/title_biomes.json')),Fm=JSON.parse(rd('px/title/title_frames.json')),
    feet=JSON.parse(require('child_process').execFileSync('python3',[path.join(R,'tools/title_feet.py')]).toString());
  ok(/const actors=titleCast\(b,Fm,Math\.floor\(Date\.now\(\)\/864e5\),\{box,keep:titleKeep\(sc\)/.test(game)&&!/pick\('glide','sky'\)|perch_idle','sky'\)\)/.test(game),'H7: the title runs titleCast (no gliding / hovering cast left)');
  ok(/\.ttl\.biome \.ttecho\{display:none\}/.test(rd('pixel.css')),'H7: the floating legacy title Echoes are hidden once the biome diorama is up');
  for(const [bio,b] of Object.entries(B.biomes)){const A=b.anchors||b,lines=new Set([...(A.ground_paths||[]).map(g=>g.y),...(A.perches||[]).map(q=>q.xy[1])]);let slots=0;
    const BOXES={};for(const [f,v] of Object.entries(feet))if(v&&v.bbox)BOXES[f]=v.bbox;
    for(let day=0;day<12;day++){const C=titleCast(b,Fm,day,{box:BOXES});
      if(bio==='woodland')ok(C.length===3&&C.some(a=>a.kind==='perch')&&C.filter(a=>a.kind==='ground'||a.kind==='seat').length===2,`H7 woodland day ${day}: 3 Echoes (walker, seated, perched bird)`);
      for(const a of C){slots++;const f=feet[a.st.file];ok(f&&f.feet.every(r=>r!=null),`H7 ${bio}: ${a.st.file} art exists`);if(!f)continue;
        ok(['ground','seat','perch','water'].includes(a.kind)&&lines.has(a.surf),`H7 ${bio} day ${day}: ${a.st.look} ${a.kind} on a defined surface line y=${a.surf}`);
        const off=f.feet.map(r=>a.y+r-a.surf-(a.sink||0));ok(off.every(d=>Math.abs(d)<=1),`H7 ${bio} day ${day}: ${a.st.look} ${a.st.anim} feet on y=${a.surf} within 1 px every frame (${[...new Set(off)]})`)}}
    ok(slots>0,`H7 ${bio}: has a cast`)}}
// ---------------- PM round 2 (Kai): no title sprite clipped by the screen or over the tagline; bird below the tagline; returning player's own Echo
{const src=(game.match(/function titleCast\(b,Fm,day,opt\)\{[\s\S]*?\n  return cast\}/)||[''])[0],cst=(game.match(/const TITLE_TAG=[^\n]*/)||[''])[0];
  const titleCast=new Function(cst+';'+src+';return titleCast')(),TAG=new Function(cst+';return TITLE_TAG')(),B=JSON.parse(rd('px/title/title_biomes.json')),Fm=JSON.parse(rd('px/title/title_frames.json')),
    feet=JSON.parse(require('child_process').execFileSync('python3',[path.join(R,'tools/title_feet.py')]).toString()),BOXES={};for(const [f,v] of Object.entries(feet))if(v&&v.bbox)BOXES[f]=v.bbox;
  const inter=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1],both=(q,left,top)=>[left+Math.min(q[0],48-q[2]),top+q[1],left+Math.max(q[2],48-q[0]),top+q[3]];
  ok(TAG.length===3&&TAG[2][3]>=125,'title: fallback tagline boxes cover the 3 rendered lines (ink ends at y 125, measured in the browser)');
  for(const [bio,b] of Object.entries(B.biomes)){const A=b.anchors||b,path=(A.ground_paths||[]).find(g=>(g.kinds||[]).includes('ground'));
    for(const own of [null,{box:[2,4,46,48]}])for(let day=0;day<12;day++){const C=titleCast(b,Fm,day,{box:BOXES,own}),tag=`${bio} day ${day}${own?' (returning)':''}`;
      for(const a of C){const q=a.own?own.box:BOXES[a.st.file];if(!q){ok(false,`${tag}: bbox for ${a.st.file}`);continue}
        const xs=a.moving?[a.x0,a.x1]:[a.left+24];
        for(const x of xs){const r=both(q,x-24,a.y);ok(r[0]>=2&&r[2]<=178,`${tag}: ${a.st.look||'own'} ${a.kind} inside the screen at x=${x} (${r})`);ok(!TAG.some(t=>inter(r,t)),`${tag}: ${a.st.look||'own'} ${a.kind} clear of the tagline (${r})`)}}
      const per=C.find(a=>a.kind==='perch');
      if(bio==='woodland')ok(per&&per.perch==='oak_branch',`${tag}: woodland bird on the left tree's oak_branch, below the tagline (${per&&per.perch})`);
      if(bio==='pasture')ok(per&&/^fence_post_/.test(per.perch),`${tag}: pasture bird on a fence post, not an apple tree under the tagline (${per&&per.perch})`);
      if(bio==='cove')ok(!per&&C.some(a=>a.kind==='water'&&a.sink===3),`${tag}: cove: rock_ledge (under the tagline) left empty, the duck floats 3 px into the water`);
      const o=C.filter(a=>a.own);
      if(own&&path)ok(o.length===1&&o[0].y+own.box[3]-1===path.y&&C.indexOf(o[0])===C.length-1&&C.length>=2,`${tag}: own Echo grounded on ${path.id} (feet y ${o[0]&&o[0].y+own.box[3]-1}) with wild Echoes around it`);
      if(!own)ok(o.length===0,`${tag}: new player: wild Echoes only`);
      if(own&&!path)ok(o.length===0,`${tag}: no dry ground path here, so titleDio picks the next biome for a returning player`)}}
  ok(/if\(own\)\{for\(let k=0;k<ord\.length;k\+\+\)\{const n=ord\[\(d0\+k\)%ord\.length\];if\(titleGroundPath\(B\.biomes\[n\]\)\)/.test(game),'title: a returning player gets the next biome with dry ground (never the cove)')}
// ---------------- PM round 2 (Kai): home grounding Option A, den mounted at #sc top -57 (the scene-art crop)
{const px=rd('pixel.js');ok(/const DEN_OY=57;/.test(px)&&/left:0;top:\$\{-DEN_OY\}px;width:180px;height:320px/.test(px)&&/\.den-wrap\{position:absolute;left:0;top:-57px/.test(rd('pixel.css')),'Option A: the den wrap is mounted at #sc top -57 (inline + css)');
  ok(/const SC_OY=57;/.test(game),'Option A: the den offset equals the scene crop SC_OY');
  ok(/function chipLift\(\)/.test(game)&&/#sc\.pxscene\.chiplift\{transform:translateY\(var\(--chip-lift/.test(rd('pixel.css')),'reply chips lift the home scene so the feet and the home prop stay on visible lawn');
  ok(/function markTap\(scEl,r\)/.test(px)&&/sc\._tapAvoid/.test(game),'sky / hotspot taps leave their rect for the speech bubble to avoid')}
// Whimber found bubble (Round 2): an Echo found napping (asleep since load, so step() never built _s) is woken by lvNotice, then react('happy');
// react/queue used to throw on el._s.q and talk() never ran (found_nap bubble missing). Every found act must reach the bubble.
{const P=W.PIXEL,mk=()=>({style:{backgroundImage:'url("px/whimber_a_f0.png")'},dataset:{},classList:{contains:()=>true,add(){},remove(){},toggle(){}},getAttribute:()=>null});
  for(const k of ['sleep_wake','sleep','fly']){const el=mk();if(k!=='fly')P.sleep(el,true);else P.fly(el,true);if(k==='sleep_wake')P.wake(el);let e=null;try{P.react(el,'happy');P.queue(el,[[0,2]],true)}catch(x){e=x}ok(!e,'react/queue never throw on a sprite '+k+' since load: '+(e&&e.message))}
  const lv=game.match(/function lvNotice\(\)\{[\s\S]*?\n  setTimeout/)||[''];ok(/lvStop\(\)[\s\S]*react\('happy'\)[\s\S]*talk\(B\(LIVE\.foundKey\)\|\|B\('hello'\)/.test(lv[0]),'lvNotice: wake -> react -> found bubble');
  const LVF=JSON.parse('{'+((game.match(/const LV_FOUND=\{([^}]*)\}/)||['',''])[1]).replace(/(\w+):'/g,'"$1":"').replace(/'/g,'"')+'}'),wb=JSON.parse(rd('dialogue/whimber.json')).barks;
  for(const a of ['nap','stargaze','lullaby','read','lantern'])ok((wb[LVF[a]]||[]).some(l=>l.text),'Whimber found_* line for '+a)}
console.log(bad?`batch H final: ${n} checks, ${bad} failed`:`batch H final: ${n} checks, 0 failed`);process.exit(bad?1:0);
