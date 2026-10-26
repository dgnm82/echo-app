#!/usr/bin/env node
// Batch H code-only items (Jay): H1 camera matcher, H2/H3 origin flow, H5 sky taps, H6 den default, H8 solar clock, H9 visual-only
// weather, H10/H11 hotspots + bubble z-index, H12 icon, H13 reading pace + tap-to-advance, H17 hum, H18 airborne bird.
// (H16 lives in tools/test-echoback.js.)  Usage: node tools/test-batch-h.js
const fs=require('fs'),path=require('path'),vm=require('vm');const R=path.join(__dirname,'..');const rd=f=>fs.readFileSync(path.join(R,f),'utf8');
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
// ---- minimal browser-ish context for pixel.js / scenes.js
const W={console,Date,Math,JSON,addEventListener(){},removeEventListener(){},innerWidth:400,innerHeight:800,setTimeout:(f)=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},matchMedia:()=>({matches:false}),performance:{now:()=>0}};W.window=W;W.globalThis=W;
const els=[];function El(tag){return {tag,children:[],style:{cssText:'',setProperty(){}},dataset:{},classList:{add(){},remove(){},toggle(){}},className:'',textContent:'',
  appendChild(c){this.children.push(c);els.push(c);return c},remove(){},querySelector:()=>null,querySelectorAll:()=>[],insertAdjacentHTML(){},addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:180,height:263})}}
W.document={createElement:El,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};W.Music={oneShot:(s,o)=>{(W.__shots=W.__shots||[]).push(s)}};
vm.createContext(W);for(const f of ['families.js','scenes.js','pixel.js','camera_match.js','weather_engine.js','dialogue.js','dialogue_engine.js'])vm.runInContext(rd(f),W,{filename:f});
const game=rd('game.js'),css=rd('pixel.css'),pix=rd('pixel.js');
// ---------------- H1 camera matcher
{const C=W.CamMatch;ok(!!C,'CamMatch loaded');const w=C.oklab(255,255,255);ok(Math.abs(w[0]-1)<1e-3&&Math.abs(w[1])<1e-3,'OKLab white L=1');
  const F=W.FAMILIES,sn=C.snapChip(F.slyte,C.okHex('#E07030'));ok(sn&&sn.chip.id==='ginger','orange coat snaps to the Howling ginger chip ('+(sn&&sn.chip.id)+')');
  ok(C.snapChip(F.twitchel,C.okHex('#2A2030')).chip.real,'dark coat snaps to a real chip');
  const mk=(w,h,bg,fg,box,stripe)=>{const px=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;let c=bg;
      if(x>=box[0]&&x<box[2]&&y>=box[1]&&y<box[3])c=stripe&&((x>>2)%2)?stripe:fg;px[i]=c[0];px[i+1]=c[1];px[i+2]=c[2];px[i+3]=255}return px};
  const fox=C.features(mk(90,90,[60,140,70],[232,119,46],[15,30,80,65]),90,90);const r=C.classify(fox);
  ok(['fox','tiger','cat','lion','dog','coyote'].includes(r.animal),'orange wide blob -> warm canine/feline ('+r.animal+')');ok(fox.aspect>1.3,'wide silhouette');
  const tig=C.features(mk(90,90,[60,140,70],[232,119,46],[10,30,82,64],[30,26,38]),90,90);ok(C.classify(tig).pattern==='stripes','striped coat -> stripes pattern');
  const skin=C.features(mk(90,90,[40,40,60],[224,172,140],[10,10,80,80]),90,90);ok(C.personGate(skin,0),'skin-tone frame is dropped by the person gate');ok(C.personGate(fox,1),'a detected face always drops the frame');ok(!C.personGate(fox,0),'orange fur is not a person');
  const empty=C.features(mk(90,90,[60,140,70],[60,140,70],[0,0,0,0]),90,90);ok(C.classify(empty).animal===null,'empty frame -> unmatched (no subject)');
  ok(C.mapLabels([{id:'kitten',conf:.9}],F.animals).animal==='cat'&&C.mapLabels([{id:'Snow Leopard',conf:.8}],F.animals).animal==='snowleopard'&&C.mapLabels([{id:'canine',conf:.9}],F.animals).animal==='dog','taxonomy matrix');
  ok(C.mapLabels([{id:'person',conf:.99}],F.animals)===null,'non-animal labels never match');
  const v=C.voter();ok(v.push({animal:'fox',conf:.9})===null&&v.push({animal:'fox',conf:.9})===null&&v.push({animal:'fox',conf:.9})===null&&v.push({animal:'fox',conf:.9})==='fox','4 agreeing confident frames match (conservative streak)');
  const v2=C.voter();v2.push({animal:'fox',conf:.9});v2.push({animal:'fox',conf:.3});ok(v2.push({animal:'fox',conf:.9})===null,'a low-confidence frame resets the streak');
  const src=rd('camera_match.js').replace(/\/\/.*$/gm,'');ok(!/toDataURL|toBlob|localStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|WebSocket|geolocation/.test(src),'H1: RAM only: no frame export, storage or network in camera_match.js');
  ok(/clearRect\(0,0,SIZE,SIZE\)/.test(src)&&/getTracks\(\)\.forEach/.test(src),'frames are cleared and the camera stops');ok(C.SIZE===360&&C.FPS>=2&&C.FPS<=3,'360x360 at 2-3 fps')}
// ---------------- H2 / H3 origin flow
ok(/function orSeen\(\)\{[\s\S]{0,300}CamMatch\.supported\(\)[^\n]*orCamera\(\)/.test(game),'H2: Origin opens the Magic Window first');
ok(/why==='denied'\|\|why==='no_camera'\)return orSeenPicker\(\)/.test(game),'H2: no camera / declined -> picker');
ok(/id="orretry"/.test(game)&&/id="orpick"/.test(game),'H2: unmatched scan -> retry + Pick an Echo');
// ---------------- H1 camera copy (Cole, dialogue/shared.json ui_or_cam_*)
{const sh=JSON.parse(rd('dialogue/shared.json')).barks,K=['ui_or_cam_ask','ui_or_cam_hint','ui_or_cam_found','ui_or_cam_miss','ui_or_cam_retry','ui_or_cam_pick'],BANDS=['5-6','7-8','9-10'];
  const AL={ui_or_cam_pick:'ui_or_seen_ask'},bo=v=>v.band||(v.context&&v.context.age_band);ok(/const OR_ALIAS=\{ui_or_cam_pick:'ui_or_seen_ask'\}/.test(game),'H1 copy: pick aliases the identical ui_or_seen_ask line');
  const ub=(k,b)=>{const L=(sh[k]&&sh[k].length?sh[k]:sh[AL[k]])||[];const l=L.find(v=>bo(v)===b)||L.find(v=>bo(v)==='all')||L[BANDS.indexOf(b)]||L[1]||L[0];return l&&l.text};   // same rule as game.js UB()
  for(const k of K)for(const b of BANDS)ok(!!ub(k,b),`H1 copy: ${k} resolves for ${b}`);
  ok(K.every(k=>(sh[k]||sh[AL[k]]||[]).every(l=>!/\b(photos?|pictures?|pics?|save[sd]?|saving|snap(shot)?)\b/i.test(l.text+' '+(l.short||'')))),'H1 copy: no photo / picture / save wording');
  ok(K.slice(0,4).every(k=>BANDS.every(b=>(sh[k]||[]).some(l=>bo(l)===b))),'H1 copy: ask/hint/found/miss have one variant per age band');
  ok(game.includes("L.find(v=>bandOf(v)===b)||L.find(v=>bandOf(v)==='all')||L[OR_BANDS.indexOf(b)]||L[1]||L[0]"),'H1 copy: UB() picks by age band, else [1]');
  const oc=game.slice(game.indexOf('function orCamera()'),game.indexOf('// Stage 3: freeze'));for(const k of K.filter(k=>k!=='ui_or_cam_found'))ok(oc.includes(`UB('${k}')`),`H1 copy: Magic Window uses ${k}`);
  ok(!/Show me an animal!|'Try again'|'Pick an Echo'/.test(oc),'H1 copy: no hard-coded camera strings left');
  ok(/id="orcamhint"/.test(oc)&&/class="orcamctl"[^>]*hidden><p class="orcammiss"[^`]*id="orretry"[^`]*id="orpick"/.test(oc),'H1 copy: hint under the window; miss shown with retry + pick');
  ok(/UB\('ui_or_cam_found'\)/.test(game.slice(game.indexOf('function orCamMatched'),game.indexOf('function orCamMatched')+1400)),"H1 copy: 'found' at the shimmer");
  ok(/<div class="orbadge" id="orbadge" hidden aria-hidden="true">🐾 \+ 🧸<\/div>/.test(oc),'H1: person badge stays wordless (🐾 + 🧸)')}
// ---------------- H1 conservative person gate
{const C=W.CamMatch;ok(C.SKIN_GATE<=0.30&&C.DOUBT_SKIN<C.SKIN_GATE&&C.CONF_MIN>=0.7&&C.STREAK>=4&&C.DOUBT_MAX<=0.15,'H1: conservative thresholds');
  const fr=(skin,faces,animal)=>({f:{skinFrac:skin,fgFrac:.4},faces:faces||0,r:{animal:animal||'fox',conf:.9}});
  ok(C.decide([fr(0,0),fr(0,0),fr(0,0),fr(0,0)]).animal==='fox','clean frames match');
  ok(C.decide([fr(0,0),fr(.2,0),fr(0,0),fr(0,0),fr(0,0)]).animal===null||C.decide([fr(0,0),fr(.2,0),fr(0,0),fr(0,0),fr(0,0)]).frames>=5,'a doubtful frame breaks the streak');
  ok(C.decide([fr(.5,0),fr(0,0),fr(0,0),fr(0,0),fr(0,0)]).animal===null,'1 person frame in 5 -> picker (doubt share > 15%)');
  ok(C.decide(Array.from({length:30},()=>fr(.5,0))).reason==='person','a person-only scan -> picker');
  ok(/nDoubt\/Math\.max\(1,nFr\)>DOUBT_MAX\)\{stop\(\);cb\.onUnmatched&&cb\.onUnmatched\('doubt'\)/.test(rd('camera_match.js')),'live loop: doubt -> unmatched (picker)')}
ok(/orCamMatched[\s\S]{0,900}src:'camera'[\s\S]{0,700}orInvite\(\)/.test(game),'H2: a match goes straight to orInvite with animal + ramp');
ok(/function orSeenFamily\(\)/.test(game)&&/function orSeenAnimal\(fid\)/.test(game)&&/id="orback"/.test(game),'H3: family first, then the Echo within the family, with Back');
{const F=W.FAMILIES;ok(F.order.length===3&&F.animalOrder.filter(a=>F.animals[a].family==='twitchel').length===7,'H3: Purrlings step shows exactly the 7 Purrlings')}
ok(!/No camera on this version/.test(game),'privacy note updated for the live camera');
// ---------------- H5 sky taps
{const H=W.ENV_HOTSPOTS,day={phase:'afternoon',sunUp:true,sun:{x:90,y:30},moon:null},night={phase:'night',sunUp:false,sun:null,moon:{x:40,y:40}};
  ok(H.skyKind(92,32,day)==='sun'&&H.skyKind(150,90,day)==='cloud'&&H.skyKind(41,39,night)==='moon'&&H.skyKind(150,20,night)==='star','sun / cloud / moon / star');
  const sc=El('div');const r1=H.skyTap(90,30,sc,'slyte',{solar:day,force:true});ok(r1&&r1.kind==='sun'&&r1.notes.length===2,'sun: 2-note chime');
  const sc2=W.ENV_HOTSPOTS.scales.slyte;ok(r1.notes.every(x=>sc2.slice(-4).includes(x)),'sun chime is high in the scene scale ('+r1.notes+')');
  const r2=H.skyTap(150,20,sc,'whimber',{solar:night,force:true});ok(r2.kind==='star'&&r2.notes.length===1&&r2.spawned>=2,'star: twinkle + floating note');
  ok(H.skyTap(90,150,sc,'slyte',{solar:day,force:true})===null,'below the sky line: not a sky tap');
  ok(H.brushAt(40,57+60,sc,'slyte','clearing')===null,'brushing the sky never chimes a flower');
  ok(r1.spotId==='sky_sun'&&!/flower/.test(r2.spotId),'sky taps never trigger flowers')}
// ---------------- H10 / H11 hotspots
{const files=[['scenes_hotspots.json',JSON.parse(rd('scenes_hotspots.json'))],['scenes.js',W.SCENE_HOTSPOTS],['pixel.js',W.ENV_HOTSPOTS.schema]];
  for(const [nm,T] of files){let lant=0,fl=0,flBad=[],ovBad=[];const walk=o=>{for(const [k,v] of Object.entries(o))if(Array.isArray(v))v.forEach(h=>{if(!h||typeof h!=='object')return;if(h.id==='branch_lantern'||h.id==='roof_1')lant++;
        if(h.kind==='flower'||h.kind==='mushroom'){fl++;if(h.y<268||h.y>304)flBad.push(h.id+':'+h.y)}else if(h.y<264&&h.overlay!==false&&!h.draw_at)ovBad.push(h.id)});else if(k==='scenes'&&v&&typeof v==='object')walk(v)};walk(T);
    ok(lant===0,`H11: ${nm}: hanging branch orb removed`);ok(fl>20&&!flBad.length,`H10: ${nm}: every flower/mushroom on the turf y268-304 (${flBad.join(' ')})`);ok(!ovBad.length,`H10: ${nm}: no floating prop sprites (${ovBad.join(' ')})`)}
  const h=W.ENV_HOTSPOTS.html('branch','whimber');ok(!/branch_lantern/.test(h)&&/data-overlay="0"[^>]*background-size/.test(h)&&!/data-spot-id="branch_bough"[^>]*background-image/.test(h),'H10: tree props render as hitbox only (no sprite)')}
ok(/#sc>#b,#sc \.bubble,#sc \.thought[^{]*\{z-index:(4\d|5\d)\}/.test(css),'H11: bubbles z-index >= 40');
{const m=/\.env-hotspots[^{]*\{[^}]*z-index:(\d+)/.exec(css)||/\.env-spot[^{]*\{[^}]*z-index:(\d+)/.exec(css);ok(!m||+m[1]<40,'hotspots stay below bubbles')}
// ---------------- H12 icon
ok(W.PIXEL.iconName('🎵')==='echoback'&&W.PIXEL.iconName('💬')==='talk','H12: 🎵 -> echoback icon, never talk');ok(/i_echoback\.png/.test(W.PIXEL.icon('echoback')),'H12: px/i_echoback.png');
// ---------------- H13 reading pace + tap-to-advance
{const D=W.Dialogue;D.band='5-6';const a=D.readMs('Hi!');D.band='7-8';const b=D.readMs('Hi!');D.band='9-10';const c=D.readMs('Hi!'),long=D.readMs('x'.repeat(80));
  ok(a===Math.round(6500*1.35)&&b===Math.round(6500*1.15)&&c===6500,'H13: >= 6.5 s x band (1.35 / 1.15 / 1.0)');ok(long===9600,'H13: 120 ms a character for long lines');
  D.band='7-8';ok(D.readMs('A typical line for a young reader, about fifty chars.')>=7000&&D.readMs('A typical line for a young reader, about fifty chars.')<=11000,'H13: a typical line stays 7-11 s');
  let q=[];D.timers={set:(f,ms)=>{const t={f,ms};q.push(t);return t},clear:t=>{q=q.filter(x=>x!==t)}};let ran=0;D.wait(()=>ran++,9000);ok(D.waiting(),'a turn is waiting');ok(D.advance()===true&&ran===1&&!D.waiting()&&q.length===0,'tap advances now and cancels the timer');ok(D.advance()===false,'nothing to advance')}
ok(/function readMs\(t\)\{[^\n]*Math\.max\(6500,n\*120\)\*f/.test(game)&&/now\(\)-\(talk\.at\|\|0\)<450/.test(game),'H13: talk() uses the same pace + a 450 ms accidental-tap guard');
ok(/#sc>#b\{pointer-events:auto;cursor:pointer\}/.test(css)&&/#sc>#b\.tapnext::before/.test(css),'H13: tappable bubble with a corner cue');
ok(!/Math\.max\(1800,|Math\.min\(wait,2500\)/.test(rd('dialogue.js')),'H13: no 1.8 s / 2.5 s conversation timers left');
// ---------------- H6 den on by default
ok(/function denOn\(\)\{return S\.parallaxDen!==false&&!lowFx\(\)\}/.test(game)&&/if\(denOn\(\)\)DEN\.mount/.test(game),'H6: 5-layer den mounts unless turned off / low-fx');
ok(/function live\(scEl\)/.test(pix)&&/deviceorientation/.test(pix)&&/requestPermission/.test(pix),'H6: gyro + spring + motes loop');
// ---------------- H8 solar clock (no location; season shift from date + clock + time zone)
{const S=W.SOLAR,EQ=(h,m)=>S.at(new Date(2026,2,20,h,m||0),'America/Los_Angeles');   // equinox: the base table exactly
  ok(EQ(6,0).phase==='dawn'&&EQ(7,30).phase==='morning'&&EQ(11,29).phase==='morning'&&EQ(11,30).phase==='afternoon'&&EQ(16,30).phase==='dusk'&&EQ(19,30).phase==='night'&&EQ(5,29).phase==='night','H8: base boundaries at the equinox');
  ok(EQ(9).tod==='morning'&&EQ(13).tod==='day'&&EQ(18).tod==='evening'&&EQ(23).tod==='night','H8: phases -> game tod bands');
  ok(EQ(12).sun&&EQ(12).sun.y<EQ(8).sun.y&&!EQ(23).sun&&EQ(23).moon,'H8: sun arc peaks at midday; moon at night');ok(EQ(18).variant==='twi'&&EQ(10).variant==='day','H8: _day/_twi follows the phase');
  const jun=S.at(new Date(2026,5,21,12),'America/Los_Angeles'),dec=S.at(new Date(2026,11,21,12),'America/Los_Angeles'),eq=EQ(12);
  ok(jun.dusk>eq.dusk&&dec.dusk<eq.dusk&&jun.night>eq.night&&dec.night<eq.night,'H8: dusk later in summer, earlier in winter ('+dec.dusk+' < '+eq.dusk+' < '+jun.dusk+')');
  ok(jun.sunrise<eq.sunrise&&dec.sunrise>eq.sunrise,'H8: dawn earlier in summer, later in winter');
  ok(Math.abs(jun.shift-1)<0.01&&Math.abs(dec.shift+1)<0.01&&Math.abs(eq.shift)<0.05,'H8: +/-1 h at the solstices, ~0 at the equinox');
  const at=(d,h,m)=>S.at(new Date(2026,d[0],d[1],h,m||0),'America/Los_Angeles');
  ok(at([5,21],19,45).phase==='dusk'&&at([11,21],19,0).phase==='night'&&at([11,21],15,45).phase==='dusk'&&at([5,21],16,0).phase==='afternoon','H8: 19:45 is still dusk in June; 19:00 is night and 15:45 is dusk in December');
  const syd=S.at(new Date(2026,5,21,12),'Australia/Sydney');ok(syd.shift<-0.99,'H8: southern-hemisphere time zone flips the season');
  ok(S.at(new Date(2026,9,23,12)).src==='clock'&&S.at.length<=2,'H8: SOLAR.at(date, tz) only: no lat/lon input');
  ok(!/geolocation|getCurrentPosition|latitude|longitude/.test(pix),'H8: pixel.js never asks for location');
  ok(/function tod\(\)\{[^\n]*solarNow\(\)/.test(game)&&/function todTick\(\)/.test(game),'H8: tod() + 60 s real-time tick')}
// ---------------- H9 weather (offline season cycle; ctx.weather + Echo reactions)
{const X=W.WEATHER;const d=new Date(2026,0,15,10);ok(JSON.stringify(X.seasonal(d))===JSON.stringify(X.seasonal(new Date(2026,0,15,11))),'H9: deterministic per 6-hour block');
  let snowOff=0;for(let m=0;m<12;m++)for(let day=1;day<=28;day++)for(let h=0;h<24;h+=6){const s=X.seasonal(new Date(2026,m,day,h));if(s.state==='snow'&&!(m===11||m<=1))snowOff++}ok(snowOff===0,'H9: snow only Dec-Feb');
  const seen=new Set();for(let m=0;m<12;m++)for(let day=1;day<=28;day++)seen.add(X.seasonal(new Date(2026,m,day,12)).state);ok(seen.size===6,'H9: all 6 states occur over a year ('+[...seen]+')');
  ok(JSON.stringify(X.STATES)===JSON.stringify(['clear','cloudy','rain','snow','fog','storm']),'H9: state names match WEATHER_CTX.md');
  ok(X.current({weatherOverride:'rain'}).state==='rain'&&X.current({weatherOverride:'off'}).state==='off'&&X.current({}).src==='season','H9: grown-ups override');
  ok(X.dialogueCtx({weatherOverride:'snow'})==='snow'&&X.dialogueCtx({weatherOverride:'off'})===undefined,"H9: ctx.weather = WEATHER.current(S).state; 'off' -> undefined");
  ok(X.reactionFor('snow')==='catch_flake'&&X.reactionFor('rain')==='shake_off'&&X.reactionFor('storm')==='cozy_up'&&X.reactionFor('clear')===null,'H9: Echo reactions: catch flakes / shake off water / cozy up');
  ok(typeof X.react==='function'&&X.react('clear')===null&&X.react('rain')==='shake_off','H9: WEATHER.react plays in the Echo\'s own world');
  const src=rd('weather_engine.js');ok(!/navigator\.geolocation|getCurrentPosition|fetch\(|XMLHttpRequest|open-meteo|WeatherKit|provider/i.test(src),'H9: no geolocation, network or provider hook (comments included)');
  ok(/function wxNow\(\)\{try\{return window\.WEATHER&&WEATHER\.dialogueCtx\?WEATHER\.dialogueCtx\(S,new Date\(now\(\)\)\):undefined/.test(game),'H9: game.js wxNow() reads window.WEATHER');
  {const line=(game.split('\n').find(l=>l.startsWith('Dialogue.ctx='))||'');ok(/weather:wxNow\(\)/.test(line),'H9: Dialogue.ctx supplies ctx.weather')}
  ok(/function needCtx\(\)\{return \{needs:S\.needs,species:CID\(\),band:tod\(\),weather:wxNow\(\)\|\|'clear'\}\}/.test(game),'H9: needCtx uses the same weather');
  ok(/t\.startsWith\('w_'\)&&t!=='w_'\+wx/.test(game),'H9: w_<state> chats only with the matching weather');
  ok(/function wxReactSched\(\)/.test(game)&&/wxReactSched\(\)\}\}/.test(game)&&/WX_REACT_MAX=3/.test(game),'H9: reactions scheduled on home (max 3 a session)');
  ok(/pcwx/.test(game),'H9: Grown-Ups weather row');
  const D=W.Dialogue;if(D.check){ok(D.check({weather:['rain']},{vars:{},weather:'rain'})===true&&D.check({weather:['rain']},{vars:{},weather:'snow'})===false&&D.check({weather:['rain']},{vars:{}})===false,'H9: cond.weather passes only for the matching ctx.weather (absent/off -> no weather lines)')}
  const E=W.DialogueEngine;ok(E&&E.resolveContext({state:{weatherOverride:'fog'}}).weather==='fog'&&E.resolveContext({state:{weatherOverride:'off'}}).weather===undefined,'H9: dialogue engine ctx.weather from window.WEATHER');
  // once Cole merges the weather lines (dialogue_v2/weather -> dialogue/*.json): every weather bark is cond.weather-gated with a valid state
  {let lines=0,badc=0;for(const f of ['slyte','whimber','twitchel']){const dj=JSON.parse(rd('dialogue/'+f+'.json'));for(const [k,v] of Object.entries(dj.barks))if(/^weather_(clear|cloudy|rain|fog|storm)$/.test(k))for(const l of v){lines++;const c=(l.cond||{}).weather;if(!Array.isArray(c)||!c.every(x=>X.STATES.includes(x)))badc++}}
   ok(badc===0,`H9: merged weather lines are cond.weather-gated (${lines} lines in the app corpus${lines?'':'; Cole\'s 444 are still in the sidecar'})`)}}
// ---------------- H17 hum
ok(/if\(id==='hum'\)return humSong\(\)/.test(game)&&/EchoBack\.playSong\(FID\(\),song\)/.test(game)&&/MusicFX\.sing\(FID\(\)\)/.test(game)&&/function humSong[\s\S]{0,1200}react\('sing'\)[\s\S]{0,200}humNotes\(\)/.test(game),'H17: Hum a song plays the starred / sticker song or MusicFX.sing, sing pose + notes');
ok(/EB\.Songbook|Songbook,PadInput/.test(rd('echoback.js')),'H17: Songbook reachable as EchoBack.Songbook');
// ---------------- H18 bird flies
{const m=/const BIRD_TOP=(\d+)/.exec(game),top=m&&+m[1];ok(top&&top+24-3>=188&&top+24+3<=204&&top+48<236,'H18: bird body centre 188..204, clear of the ground line ('+top+')');
  const cg=game.slice(game.indexOf('function catchGame'),game.indexOf('function stackGame'));ok(!/nest\.png/.test(cg)&&!/IM\.car,Math\.round\(g\.x-11\),A\.LINE-2/.test(cg),'H18: no nest / ground chunk under the bird');
  ok(/if\(PIXEL\.flipFor\(curLook\(\),face\)\)\{cx\.translate\(bx\*2\+48,0\);cx\.scale\(-1,1\)\}/.test(cg)&&/Math\.sin\(F\/9\)\*3/.test(cg)&&/fly_happy/.test(cg),'H18: facing flip, hover bob, glide_happy on a catch')}
// ---------------- H14 hoo for owls only (runtime swap)
{const D=W.Dialogue;ok(D.speciesCalls('Hoo. Hello!','duck')==='Quack. Hello!'&&D.speciesCalls('hoo hoo, yes','crow')==='caw-caw, yes'&&D.speciesCalls('A hoo-hum flutter.','dove')==='A soft-coo flutter.','duck / crow / dove calls');
  ok(D.speciesCalls('Hoo-hoo!','owl')==='Hoo-hoo!'&&D.speciesCalls('Hoo!','fox')==='Hoo!','owls keep hoo; other families untouched');
  ok(D.lookOf({vars:{origin_animal:'songbird'}})==='bird'&&D.speciesCalls('Hoo!','bird')==='Chirp!','songbird -> chirp')}
// ---------------- H13 mini-game callouts (>= 2.5 s, never block play, tap-dismissable); pre-game + summaries keep full pace
{const grab=re=>{const m=re.exec(game);return m?m[0]:''};
  const src=[grab(/const GAME_CALL_MIN=[^\n]*/),grab(/function callKind\(o\)\{[^\n]*/),grab(/function bubMs\(o,ms\)\{[^\n]*/)].join('\n');
  const ctx={Math,S:{ageBand:'7-8'}};vm.createContext(ctx);vm.runInContext(grab(/function readMs\(t\)\{[^\n]*/)+'\n'+src+'\nthis.callKind=callKind;this.bubMs=bubMs;this.MIN=GAME_CALL_MIN;',ctx);
  const K=k=>({key:k,text:'Nice one, that was a great catch there!'});
  ok(ctx.MIN===2500,'H13: in-game callout minimum 2.5 s');
  for(const k of ['dig_row','dig_level','dig_climb','dig_big','dig_disguise','tower_perfect','tower_beat','pairs_miss','pairs_hint','pairs_disguise','eib_same','eib_close','eib_your_turn','eib_new','eib_again'])ok(ctx.callKind(K(k))==='call'&&ctx.bubMs(K(k),1800)===2500&&ctx.bubMs(K(k),4000)===4000,`H13: ${k} is an in-game callout (2.5 s floor, not reading pace)`);
  for(const k of ['dig_start','catch_start','tower_start','pairs_start','eib_hello','dig_end','dig_end_best','run_end_best','catch_best','tower_best','pairs_done','game_end','eib_five','eib_rest'])ok(ctx.callKind(K(k))==='full'&&ctx.bubMs(K(k),2200)===ctx.readMs(K(k)),`H13: ${k} keeps full reading time`);
  ok(ctx.callKind({key:'ambient',text:'x'})==='talk'&&ctx.callKind({text:'hi'})==='talk','H13: conversation / comfort / story bubbles keep reading pace');
  ok(/b\.classList\.toggle\('gamecall',gc\);if\(gc\)document\.addEventListener\('pointerdown',gcDismiss,true\)/.test(game)&&/#sc>#b\.gamecall\{pointer-events:none/.test(css),'H13: callouts let taps through to the game');
  ok(/function gcDismiss\(e\)\{[^\n]*\n[^\n]*getBoundingClientRect\(\)[^\n]*b\.style\.display='none'/.test(game)&&!/function gcDismiss[^\n]*\n[^\n]*(stopPropagation|preventDefault)/.test(game),'H13: a tap on the callout dismisses it without eating the game tap')}
// ---------------- H10 waypoints + indoor sky (Pixal verify, Oct 25)
{const H=W.ENV_HOTSPOTS,T=JSON.parse(rd('scenes_hotspots.json')),SS=T.scenes||T,box=id=>{for(const v of Object.values(SS))if(Array.isArray(v)){const h=v.find(x=>x.id===id);if(h)return [h.x,h.y,h.w,h.h].join(',')}};
  ok(box('clearing_mushroom')==='117,292,16,12'&&box('tw_garden_flower_2')==='92,293,20,16'&&box('meadow_bell')==='152,214,16,18'&&box('tw_meadow_bell')==='150,214,16,26','H10: Pixal coords applied');
  ok(box('library_bell')==='120,122,16,16'&&!box('tw_clearing_bell')&&!box('cushion_3'),'H10: library_bell kept; tw_clearing_bell + cushion_3 replaced by the den bell-vine');
  for(const [nm,TT] of [['scenes.js',W.SCENE_HOTSPOTS],['pixel.js',H.schema]]){const S2=TT.scenes||TT;const h=(S2.clearing||[]).find(x=>x.id==='clearing_mushroom');ok(h&&h.x===117&&h.y===292,`H10: ${nm} copy in sync`)}
  let miss=[];for(const [fam,list] of Object.entries(W.SCENES))if(Array.isArray(list))for(const sc of list.filter(x=>x&&Array.isArray(x.wp)))for(const w of sc.wp){const prop=/lantern|bell|chime/.test(w.id)||(w.acts||[]).includes('lantern_share');if(prop&&!H.wpTarget(w.id,sc.id,fam))miss.push(fam+'/'+sc.id+'/'+w.id)}
  ok(!miss.length,'H10: every prop waypoint target exists ('+miss.join(' ')+')');
  let dang=[];for(const [k,v] of Object.entries(SS))if(Array.isArray(v))for(const h of v)if(h.wp){const fam=k.startsWith('twitchel_')?'twitchel':(W.SCENES.whimber||[]).some(s=>s.id===k)?'whimber':'slyte';const sc=(W.SCENES[fam]||[]).find(s=>s.id===k.replace(/^twitchel_/,''));if(sc&&!sc.wp.some(w=>w.id===h.wp))dang.push(k+'/'+h.id+'->'+h.wp)}
  ok(dang.length<=40,'H10: hotspot wp names (informational: '+dang.length+' point at waypoints the scene does not have; they are only reached by taps)');
  ok(H.triggerWaypoint('lantern',El('div'),'whimber','branch')===null&&!H.wpTarget('lantern','branch','whimber'),'H10: branch lantern_share waypoint retargeted (no stand-in hotspot)');
  ok(!(W.SCENES.whimber.find(s=>s.id==='branch').wp.some(w=>w.id==='lantern')),'H11: branch lantern waypoint removed');
  ok(/function wpOk\(w\)/.test(game)&&/!scReq\(w\.requires\)\|\|!wpOk\(w\)/.test(game),'H10: idle auto-triggers skip prop waypoints without a target');
  ok(H.forScene('no_such_scene','slyte').length===0,'H10: unknown scene has no hotspots (never borrows clearing)');
  ok(!fs.existsSync(path.join(R,'scene_hotspots.json')),'H10: stale scene_hotspots.json (singular, nothing loads it) removed');
  // indoor: no sky band; sky-type taps only on the window
  const day={phase:'afternoon',sunUp:true,sun:{x:90,y:30},moon:null},night={phase:'night',sunUp:false,sun:null,moon:{x:40,y:40}},sc=El('div');
  ok(H.isIndoor('library','whimber')&&H.isIndoor('twitchel_sunbeam_room','twitchel')&&!H.isIndoor('clearing','slyte'),'H10: library + Sunbeam room are indoor');
  ok(H.skyTap(30,20,sc,'whimber',{solar:day,force:true,sceneId:'library'})===null,'H10: library shelf/wall in the sky band: no sky tap');
  const wn=H.skyTap(90,20,sc,'whimber',{solar:day,force:true,sceneId:'library'}),mn=H.skyTap(90,20,sc,'whimber',{solar:night,force:true,sceneId:'library'});
  ok(wn&&wn.spotId==='window_sunbeam'&&mn&&mn.spotId==='window_moonglint','H10: library window: sunbeam by day, moon glint by night');
  ok(H.skyTap(128,65,sc,'whimber',{solar:day,force:true,sceneId:'library'})===null,'H10: library_bell area never flares');
  {H.reset&&H.reset();const lb=H.brushAt(128,130,sc,'whimber','library');ok(lb&&lb.spotId==='library_bell','H10: library_bell is tappable (indoor: no sky band)')}
  ok(H.skyTap(40,60,sc,'twitchel',{solar:day,force:true,sceneId:'twitchel_sunbeam_room'})&&H.skyTap(150,60,sc,'twitchel',{solar:day,force:true,sceneId:'twitchel_sunbeam_room'})===null,'H10: Sunbeam room: window only');
  let indoorSky=0;for(const k of ['library','twitchel_library','twitchel_sunbeam_room'])for(const h of (SS[k]||[]))if(/^sky/.test(h.id)||h.kind==='sky')indoorSky++;ok(indoorSky===0,'H10: indoor scenes have no sky hotspots')}
// ---------------- sprite facing (chicken / dove / pigeon / duck face LEFT natively)
{const P=W.PIXEL;ok(['chicken','dove','pigeon','duck'].every(l=>P.nativeDir(l)===-1)&&['owl','bird','eagle','crow','gull','fox','cat'].every(l=>P.nativeDir(l)===1),'facing: native directions');
  ok(['chicken','dove','pigeon','duck'].every(l=>P.flipFor(l,1)===true&&P.flipFor(l,-1)===false),'facing: left-native birds flip when moving right');
  ok(['owl','fox','eagle'].every(l=>P.flipFor(l,-1)===true&&P.flipFor(l,1)===false),'facing: right-native sprites flip when moving left');
  ok(/PIXEL\.flipFor\(curLook\(\),face\)/.test(game.slice(game.indexOf('function catchGame'),game.indexOf('function stackGame'))),'facing: Starfall Catch uses flipFor');
  ok(/classList\.toggle\('flip',PIXEL\.flipFor\(a\.st\.look,a\.dir\)\)/.test(game)&&/\.ttl \.ttspr\.flip\{transform:scaleX\(-1\)\}/.test(css),'facing: title diorama sprites face their motion')}
// ---------------- H4 / H7 / H12 art hooks (Cole ART_HANDOFF + Pixal) with fallbacks
{const ex=f=>fs.existsSync(path.join(R,f)),hj=JSON.parse(rd('px/home/homes.json'));
  ok(['basket_room','basket_room_hh','den','den_hh'].every(k=>hj[k]&&hj[k].mouth),'H4: homes_batchH.json anchors merged into homes.json');
  ok(/H4_WILD=\['lion','tiger','leopard','cheetah','snowleopard','lynx'\]/.test(game)&&/sid==='wild_clearing'[^\n]*k:'den_wild',x:108,y:218/.test(game)&&/sid==='sunbeam_room'[^\n]*k:'basket_room',x:118,y:230/.test(game),'H4: wild cats -> den_wild in the wild clearing; house cat -> basket_room in the Sunbeam room');
  ok(/sleeper_twitchel_cat_\$\{v\.pal\}\.png/.test(game)&&/denpeek_twitchel_\$\{lk\|\|curLook\(\)\}_\$\{v\.pal\}\.png/.test(game)&&(game.match(/im\.onerror=/g)||[]).length>=2,'H4: sleeper + den tail-peek with onerror fallbacks');
  ok(ex('px/home/den_back.png')&&ex('px/home/basket_room_back.png')&&ex('px/home/sleeper_twitchel_cat_tan-sand.png')&&ex('px/home/denpeek_twitchel_lion_tan-sand.png'),'H4: art on disk');
  ok(ex('px/title/title_frames.json')&&ex('px/title/title_biomes.json')&&/function titleDio\(\)/.test(game)&&/tagline_ink/.test(game)&&/\.ttl\.biome \.tthill/.test(css),'H7: title diorama hook (biome, ink, sprites; old title stays if anything is missing)');
  ok(ex('px/i_echoback.png'),'H12: i_echoback.png on disk')}
// ---------------- Pixal follow-up: den bell-vine, twitchel_wild_clearing, Sunbeam room props, indoor window/shelf
{const H=W.ENV_HOTSPOTS,T=JSON.parse(rd('scenes_hotspots.json')),SS=T.scenes,ex=f=>fs.existsSync(path.join(R,f));
  const bv=(SS.twitchel_wild_clearing||[]).find(h=>h.id==='tw_wild_den_bellvine');
  ok(bv&&[bv.x,bv.y,bv.w,bv.h].join()==='124,231,18,18'&&bv.hh.x===40&&bv.hh_120x160.x===94&&bv.draw_at.phone.join()==='125,232'&&bv.notes.join()==='c5,f5'&&bv.overlay!==false,'bell-vine: hitbox, hh, 120x160, draw_at, C5+F5');
  {const h=H.html('wild_clearing','twitchel');ok(/data-spot-id="tw_wild_den_bellvine"[^>]*background-image:url\(px\/scenes\/fx\/den_bellvine_(day|twi)\.png\);padding:1px 0 0 1px/.test(h),'bell-vine: strip drawn at 125,232 over the baked frame 0')}
  const want={tw_wild_flower_1:['42,276,18,18','f4,a4'],tw_wild_flower_2:['76,292,16,16','g4,c5'],tw_wild_mushroom:['24,276,16,16','a4,d5']};
  for(const [id,[b,n]] of Object.entries(want)){const h=(SS.twitchel_wild_clearing||[]).find(x=>x.id===id);ok(h&&[h.x,h.y,h.w,h.h].join()===b&&h.notes.join()===n&&h.hh&&h.hh_120x160,`wild clearing: ${id}`)}
  const room={tw_room_yarn:['28,288,14,12','a4,d5'],tw_room_toy:['152,296,10,8','g4,c5'],tw_room_plant:['2,220,14,18','f4,a4'],tw_room_purr_bell:['156,231,12,10','c5,f5']},F5=W.ENV_HOTSPOTS.scales.twitchel||[];
  for(const [id,[b,n]] of Object.entries(room)){const h=(SS.twitchel_sunbeam_room||[]).find(x=>x.id===id);ok(h&&[h.x,h.y,h.w,h.h].join()===b&&h.notes.join()===n&&h.overlay===false&&h.notes.every(x=>['f4','g4','a4','c5','d5','f5','f3','g3','a3','c4','d4'].includes(x)),`sunbeam room prop: ${id} (${n}, twitchel pentatonic)`)}
  {H.reset&&H.reset();const sc=El('div'),r=H.brushAt(160,236,sc,'twitchel','sunbeam_room');ok(r&&r.spotId==='tw_room_purr_bell'&&r.notes.join()==='c5,f5','sunbeam room: purr-bell is a musical tap')}
  for(const [nm,TT] of [['scenes.js',W.SCENE_HOTSPOTS],['pixel.js',H.schema]]){const S2=TT.scenes||TT;ok((S2.twitchel_wild_clearing||[]).length===4&&(S2.twitchel_sunbeam_room||[]).length===4&&!(S2.twitchel_clearing||[]).some(h=>h.id==='tw_clearing_bell'),`follow-up: ${nm} copy in sync`)}
  // every hotspot's asset exists or falls back
  let miss=[];for(const [k,v] of Object.entries(SS))if(Array.isArray(v))for(const h of v){if(h.overlay===false)continue;const u=h.sprite||(h.draw_at?(h.fx_strip_day||h.fx_strip):null)||'px/scenes/fx/flower_bloom.png';if(!ex(u))miss.push(k+'/'+h.id+':'+u);for(const f of [h.fx_strip_day,h.fx_strip_twi,h.fx_strip_hh_day,h.fx_strip_hh_twi].filter(Boolean))if(!ex(f)&&h.draw_at)miss.push(k+'/'+h.id+':'+f)}
  ok(!miss.length,'every drawn hotspot has its sprite/strip on disk ('+miss.slice(0,6).join(' ')+')');
  ok(ex('px/scenes/fx/flower_bloom.png'),'default bloom sprite (fallback) exists');
  ok(['day','twi','dawn','dusk','hh_day','hh_twi'].every(v=>ex(`px/scenes/twitchel_wild_clearing_${v}.png`))&&['back','front','glow_in','glow_out'].every(n=>ex(`px/home/den_wild_${n}.png`)&&ex(`px/home/den_wild_hh_${n}.png`)),'wild clearing scene + den_wild home art on disk');
  ok(['window_glint_sun','window_glint_moon','window_glint_sun_hh','window_glint_moon_hh'].every(n=>ex(`px/scenes/fx/${n}.png`))&&/window_glint_\$\{kind\}\.png/.test(pix),'window glint art used (CSS flare kept as fallback)');
  const hj=JSON.parse(rd('px/home/homes.json'));ok(JSON.stringify(hj.den_wild)===JSON.stringify(hj.den)&&JSON.stringify(hj.den_wild_hh)===JSON.stringify(hj.den_hh),'den_wild anchors = den');
  // routing: wild cats -> twitchel_wild_clearing, house cat -> twitchel_sunbeam_room (run the real scList/h4Scene/h4Home from game.js)
  {const grab=re=>{const m=re.exec(game);return m?m[0]:''};const ctx={JSON,console,SCENES:{cat:[{id:'clearing',title:'The clearing',wp:[{id:'stage',xy:[90,256],acts:[]}]},{id:'grove',title:'g',wp:[]}]},HOMES_J:{den:{},den_wild:{},basket_room:{}}};
   vm.createContext(ctx);vm.runInContext(['let S;',grab(/const H4_WILD=[^\n]*/),grab(/function curLook\(\)\{[^\n]*/),grab(/function h4Home\(base\)\{[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*/),grab(/const H4_SCENE=\{\};function h4Scene\(sc\)\{[^\n]*\n[^\n]*/),
     "function CID(){return 'cat'}",grab(/function scList\(\)\{[^\n]*/),'function curScene(){const L=scList();return L.find(s=>s.id===S.scene)||L[0]}',"this.set=v=>{S=v;for(const k in H4_SCENE)delete H4_SCENE[k]};this.run=()=>({id:curScene().id,home:h4Home({k:'basket',x:1,y:2}).k});"].join('\n'),ctx);
   for(const lk of ['lion','tiger','leopard','cheetah','snowleopard','lynx']){ctx.set({kind:'cat',origin:{animal:lk},scene:'clearing'});const r=ctx.run();ok(r.id==='wild_clearing'&&r.home==='den_wild',`routing: ${lk} -> twitchel_wild_clearing + den_wild (${r.id}/${r.home})`)}
   ctx.set({kind:'cat',origin:{animal:'cat'},scene:'clearing'});const hc=ctx.run();ok(hc.id==='sunbeam_room'&&hc.home==='basket_room','routing: house cat -> twitchel_sunbeam_room + basket_room ('+hc.id+'/'+hc.home+')');
   ok(H.forScene('wild_clearing','twitchel')===(H.schema.scenes||H.schema).twitchel_wild_clearing||H.forScene('wild_clearing','twitchel').length===4,'routing: wild_clearing reads twitchel_wild_clearing hotspots');
   ok(H.forScene('sunbeam_room','twitchel').length===4,'routing: sunbeam_room reads twitchel_sunbeam_room hotspots')}
  // indoor (incl. window + shelf aliases): no sky taps; shelves inert; prop -> window -> nothing
  const day={phase:'day',sunUp:true,sun:{x:90,y:30},moon:null},dawn={phase:'dawn',sunUp:true,sun:{x:20,y:80},moon:null},dusk={phase:'dusk',sunUp:false,sun:null,moon:{x:40,y:40}},sc=El('div');
  for(const [id,fam] of [['library','whimber'],['window','whimber'],['shelf','whimber'],['library','twitchel'],['window','twitchel'],['shelf','twitchel'],['sunbeam_room','twitchel'],['twitchel_sunbeam_room','twitchel']]){
    ok(H.isIndoor(id,fam),`indoor: ${fam}/${id}`);let sky=0;for(let x=2;x<180;x+=12)for(let y=0;y<145;y+=12){const r=H.skyTap(x,y,sc,fam,{solar:day,force:true,sceneId:id});if(r&&!/^window_/.test(r.spotId))sky++}ok(sky===0,`indoor ${fam}/${id}: no sky taps (only window glints)`)}
  for(const r of [{x:0,y:44,w:74,h:48},{x:106,y:44,w:74,h:48},{x:0,y:156,w:74,h:64},{x:106,y:156,w:74,h:64}])ok(H.skyTap(r.x+r.w/2,r.y+r.h/2-57,sc,'whimber',{solar:day,force:true,sceneId:'library'})===null&&H.onShelf(r.x+r.w/2,r.y+r.h/2-57,'library','whimber'),`library shelf ${r.x},${r.y} is inert`);
  ok(H.skyTap(148,132-57,sc,'twitchel',{solar:day,force:true,sceneId:'sunbeam_room'})===null&&H.onShelf(148,132-57,'sunbeam_room','twitchel'),'sunbeam room shelf is inert');
  const g1=H.skyTap(40,120-57,sc,'twitchel',{solar:dawn,force:true,sceneId:'sunbeam_room'}),g2=H.skyTap(40,120-57,sc,'twitchel',{solar:dusk,force:true,sceneId:'sunbeam_room'});
  ok(g1&&g1.spotId==='window_sunbeam'&&g2&&g2.spotId==='window_moonglint','indoor: sun glint at dawn/day, moon glint at dusk/night');
  let indoorSky=0;for(const k of ['window','shelf','twitchel_sunbeam_room'])for(const h of (SS[k]||[]))if(/^sky/.test(h.id)||h.kind==='sky')indoorSky++;ok(indoorSky===0,'window/shelf/sunbeam room have no sky hotspots')}
// ---------------- H7 title reads title_biomes.json (brumlo/finli dropped; pasture chicken+duck, cove gull+duck stand-ins)
{const B=JSON.parse(rd('px/title/title_biomes.json')),ex=f=>fs.existsSync(path.join(R,f));ok(!/brumlo|finli/.test(JSON.stringify(B.biomes)),'title: brumlo/finli gone from the biomes');
  for(const [bio,mem] of [['pasture',['chicken','duck']],['cove',['gull','duck']]]){const A=B.biomes[bio].anchors,ic=A.cast.interim;ok(JSON.stringify(ic.members)===JSON.stringify(mem)&&A.fly_lanes&&A.fly_lanes[0].y.length===2,`title: ${bio} interim cast ${mem} + fly lane`);
    const im=ic.members.find(m=>(ic.sprites[m].present||[]).includes('_fly'));const pal={chicken:'peach-dusk-solid',duck:'sky-teal',gull:'lilac-night'}[im];ok(ex(`px/whimber_${im}_${pal}_f1_fly.png`),`title: ${bio} stand-in ${im} fly strip on disk`);
    ok(W.PIXEL.flipFor(im,1)===(im!=='gull')&&W.PIXEL.flipFor(im,-1)===(im==='gull'),`title: ${im} faces its motion (${im==='gull'?'right':'left'}-native)`)}
  for(const bio of Object.keys(B.biomes))for(const t of B.tods){const v=B.biomes[bio].variants[t];ok(v&&ex(v.bg)&&ex(v.fg)&&v.alive.every(ex)&&/^#[0-9A-F]{6}$/i.test(v.tagline_ink),`title: ${bio}/${t} layers + ink`)}
  ok(/const TITLE_J=\{\},TITLE_PAL=\{chicken:'peach-dusk-solid',duck:'sky-teal',gull:'lilac-night'\}/.test(game)&&/const A=b\.anchors\|\|b/.test(game),'title code reads anchors / interim cast')}
// ---------------- Pixal follow-up 2 (section 5): twitchel_clearing retired, save migration
{const T=JSON.parse(rd('scenes_hotspots.json')),H=W.ENV_HOTSPOTS;
  for(const [nm,TT] of [['scenes_hotspots.json',T],['scenes.js',W.SCENE_HOTSPOTS],['pixel.js',H.schema]]){const S2=TT.scenes||TT;ok(!('twitchel_clearing' in S2)&&!('cushion' in S2)&&!('twitchel_clearing' in TT)&&!('cushion' in TT)&&S2.window&&S2.shelf,`retired: ${nm} has no twitchel_clearing / cushion (window + shelf kept)`)}
  const den=/const SCENE_TO_DEN=\{[\s\S]*?\};/.exec(pix)[0];ok(!/twitchel_clearing|cushion:/.test(den)&&/twitchel_wild_clearing:'sunbeam_attic'/.test(den)&&/twitchel_sunbeam_room:'sunbeam_attic'/.test(den),'retired: SCENE_TO_DEN maps the new twitchel scenes, not the old clearing');
  ok(!/'twitchel_'\+\(sceneId\|\|'clearing'\)/.test(pix),'retired: pixel.js forScene has no twitchel_clearing default');
  const hj=JSON.parse(rd('px/home/homes.json'));ok(!JSON.stringify(hj).includes('twitchel_clearing')&&hj._batchH.placement['lion|tiger|leopard|cheetah|snowleopard|lynx'].scene==='twitchel_wild_clearing'&&hj._batchH.placement['lion|tiger|leopard|cheetah|snowleopard|lynx'].home.k==='den_wild','retired: homes.json wild cats -> twitchel_wild_clearing / den_wild');
  ok(!rd('families.js').includes('basket clearing')&&!rd('families/twitchel.json').includes('basket clearing'),'retired: families copy no longer names the basket clearing');
  const SO=W.DialogueEngine&&W.DialogueEngine.SCENE_OBS||(W.DIALOGUE_ENGINE||{}).SCENE_OBS;ok(SO&&!SO.twitchel_clearing&&['twitchel_wild_clearing','twitchel_sunbeam_room','wild_clearing','sunbeam_room'].every(k=>SO[k]&&SO[k]['5-6']&&SO[k]['7-8']&&SO[k]['9-10']),'retired: dialogue scene phrases for the wild clearing + sunbeam room (all 3 bands)');
  ok(!/S\.h4Homes!==false|S\.h4Homes===false\)/.test(game),'retired: the cat clearing is always re-routed (no h4Homes opt-out back to the old art)');
  // migration
  const grab=re=>{const m=re.exec(game);return m?m[0]:''};const mc={JSON,Set};vm.createContext(mc);vm.runInContext(grab(/const TW_RETIRED=[^\n]*/)+'\n'+grab(/function twClearingMigrate\(s\)\{[^\n]*\n[^\n]*/)+'\nthis.m=twClearingMigrate;',mc);
  for(const [lk,sc,to] of [['lion','clearing','wild_clearing'],['snowleopard','twitchel_clearing','wild_clearing'],['lynx','grove','grove'],['cat','clearing','sunbeam_room'],['cat','twitchel_clearing','sunbeam_room']]){
    const sv={kind:'cat',origin:{animal:lk},g:{look:lk},scene:sc,scenesSeen:['clearing','grove','twitchel_clearing'],h4Homes:false};const o=mc.m(JSON.parse(JSON.stringify(sv)));
    ok(o.scene===to&&!o.scenesSeen.includes('clearing')&&!o.scenesSeen.includes('twitchel_clearing')&&o.scenesSeen.includes('grove')&&new Set(o.scenesSeen).size===o.scenesSeen.length&&!('h4Homes' in o),`migration: ${lk} save on ${sc} -> ${o.scene} (seen ${o.scenesSeen})`)}
  {const o=mc.m({kind:'fox',scene:'clearing',scenesSeen:['clearing']});ok(o.scene==='clearing'&&o.scenesSeen[0]==='clearing','migration: other families keep their own clearing')}
  {const o=mc.m({kind:'cat',origin:{animal:'tiger'},scene:'clearing'});ok(o.scene==='wild_clearing','migration: an old save without scenesSeen migrates cleanly');const o2=mc.m(JSON.parse(JSON.stringify(o)));ok(JSON.stringify(o2)===JSON.stringify(o),'migration is idempotent')}
  ok(/if\(s\)\{twClearingMigrate\(s\);purgeFeelings/.test(game),'migration runs in load()');
  // the old ids resolve by look for anyone still asking for them
  W.__echo={state:{kind:'cat',origin:{animal:'lion'}}};ok(H.forScene('twitchel_clearing','twitchel').some(h=>h.id==='tw_wild_den_bellvine')&&H.forScene('clearing','cat').length===4,'old twitchel clearing id -> wild clearing hotspots for a lion');
  W.__echo={state:{kind:'cat',origin:{animal:'cat'}}};ok(H.forScene('twitchel_clearing','twitchel').some(h=>h.id==='tw_room_purr_bell'),'old twitchel clearing id -> sunbeam room hotspots for the house cat');
  ok(H.forScene('clearing','slyte').some(h=>/^clearing_/.test(h.id)),'slyte clearing unchanged');delete W.__echo}
// ---------------- follow-up 2 (section 1): the den bell-vine plays the vine only
{const H=W.ENV_HOTSPOTS;H.reset();W.__shots=[];let ev=null;const odisp=W.document.dispatchEvent;W.CustomEvent=function(t,o){this.type=t;this.detail=o&&o.detail};W.document.dispatchEvent=e=>{ev=e};
  const px={classList:{t:0,add(){this.t++},remove(){},toggle(){this.t++}},style:{},dataset:{}};const cr={querySelector:()=>px,style:{left:'90px'}};
  const sc=El('div');sc.querySelector=q=>q==='#cr'?cr:null;
  const r=H.trigger('tw_wild_den_bellvine',{scEl:sc,fam:'twitchel',sceneId:'wild_clearing',force:true});
  ok(r&&r.vineOnly&&r.echoReacted===false&&px.classList.t===0,'bell-vine: the Echo does not turn, perk or react');
  ok(r.notes.join()==='c5,f5'&&W.__shots[0]==='notes/twitchel_c5','bell-vine: C5 then F5 (real twitchel samples)');
  ok(ev&&ev.type==='denpeek_twitch','bell-vine: sends denpeek_twitch (tail-peek only)');
  H.reset();const r2=H.trigger('tw_wild_den_bellvine',{scEl:sc,fam:'twitchel',sceneId:'wild_clearing',force:true}),r3=H.trigger('tw_wild_den_bellvine',{scEl:sc,fam:'twitchel',sceneId:'wild_clearing',force:true});ok(r3&&r3.notes.join()==='c5,f5'&&!r3.hummed,'bell-vine: repeat taps never re-pitch or hum');
  ok(/\[1,2,1,0\];let i=0;[^\n]*setTimeout\(step,110\)/.test(pix),'bell-vine: strip frames 1,2,1,0 at 110 ms');
  const vt=/function vineTap[\s\S]*?\n  \}\n/.exec(pix)[0];ok(!/lvMove|homeIn|wakeUp|lvNotice|lvPresent|react\(|lvflip|napUntil/.test(vt),'bell-vine: vineTap never wakes, moves or calls the Echo');
  ok(/closest\('\.env-spot\[data-spot-id="tw_wild_den_bellvine"\]'\)\)return;else if\(LIVE\.st==='found'\)lvNotice\(\)/.test(game),'bell-vine: a vine tap is not a "notice me" tap');
  const dt=/function denTwitch\(\)\{[^\n]*/.exec(game)[0];ok(/#home \.htail\.denpeek\.on/.test(dt)&&!/napUntil|homeIn|wake|lvMove/.test(dt)&&/addEventListener\('denpeek_twitch',denTwitch\)/.test(game),'bell-vine: only the visible tail-peek twitches (nap untouched)');
  ok(/#home \.htail\.denpeek\.twitch\{animation:denpeek 1s steps\(4\) infinite,denTwitch 120ms steps\(1\) 2\}/.test(css)&&/prefers-reduced-motion:reduce\)\{#home \.htail\.denpeek\.twitch\{animation:none\}/.test(css),'bell-vine: CSS 1px nudge fallback (2 x 120 ms), off for reduced motion');
  W.document.dispatchEvent=odisp;delete W.CustomEvent}
// ---------------- follow-up 2 (section 6): cloverkin / tidelings scales + ocean hotspots (data only), every note has a sample
{const T=JSON.parse(rd('scenes_hotspots.json')),H=W.ENV_HOTSPOTS,ex=f=>fs.existsSync(path.join(R,f)),P=JSON.parse(fs.readFileSync('/workspace/echo/ios_design/batch_h/h_followup_hotspots_for_jay.json','utf8'))['6_scales'];
  for(const [nm,TT] of [['scenes_hotspots.json',T],['scenes.js',W.SCENE_HOTSPOTS],['pixel.js',H.schema]])ok(JSON.stringify(TT.scales)===JSON.stringify(P.paste_scales.replace_with)&&!TT.scales.brumlo&&!TT.scales.finli,`scales: ${nm} = slyte/whimber/twitchel/cloverkin/tidelings`);
  for(const id of ['tidepool_cove','kelp_reef','lighthouse_pier']){const want=JSON.stringify(P.paste_ocean_hotspots.replace_with[id]);ok(JSON.stringify(T.scenes[id])===want&&JSON.stringify(T[id])===want,`ocean: ${id} = Pixal D major list (both copies)`);
    ok(T.scenes[id].every(h=>h.notes.every(n=>T.scales.tidelings.includes(n))),`ocean: ${id} notes in tidelings D major pentatonic`)}
  ok(['barn_hayloft','apple_orchard','windmill_pasture'].every(id=>T.scenes[id].every(h=>h.notes.every(n=>T.scales.cloverkin.includes(n)))),'farm: cloverkin G major pentatonic (unchanged)');
  const FAM=id=>['tidepool_cove','kelp_reef','lighthouse_pier'].includes(id)?'tidelings':['barn_hayloft','apple_orchard','windmill_pasture'].includes(id)?'cloverkin':null;   // other scenes (incl. firmware-only garden/stream/stone/roof/cloud/top/yarn): the family whose scale holds every note
  const famOf=id=>FAM(id)||['slyte','whimber','twitchel'].find(f=>T.scenes[id].every(h=>(h.notes||[]).every(n=>T.scales[f].includes(n))))||'slyte';
  let miss=[],cnt=0;for(const [id,L] of Object.entries(T.scenes))if(Array.isArray(L))for(const h of L)for(const n of (h.notes||[])){cnt++;const f=famOf(id),sp=H.closestSample(f,n),file='music/'+sp.sample;
    if(!(ex(file+'.ogg')&&ex(file+'.wav'))||sp.rate!==1||!T.scales[f].includes(n))miss.push(`${id}/${h.id}:${n}->${sp.sample}@${sp.rate}`)}
  ok(!miss.length&&cnt>100,`every hotspot note (${cnt}) resolves to an existing same-pitch sample file (${miss.slice(0,5).join(' ')})`);
  for(const f of ['cloverkin','tidelings'])for(const n of T.scales[f]){const sp=H.closestSample(f,n),m=/notes\/(slyte|whimber|twitchel)_([a-g]s?\d)$/.exec(sp.sample);ok(m&&m[2]===n.replace('#','s')&&sp.rate===1&&sp.alias,`${f} ${n} aliases to ${sp.sample} (same pitch, no 404)`)}}
// ---------------- PM: Tidelings is inert - no route, waypoint, home mapping or picker entry reaches its scenes
{const OCEAN=['tidepool_cove','kelp_reef','lighthouse_pier'],T=JSON.parse(rd('scenes_hotspots.json')),bad2=x=>OCEAN.some(o=>String(x).includes(o));
  const grab=re=>{const m=re.exec(game);return m?m[0]:''};const ctx={JSON,console,SCENES:JSON.parse(JSON.stringify(W.SCENES)),FAMILIES:JSON.parse(JSON.stringify(W.FAMILIES))};ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(['let S,CURF;',grab(/function famScenes\(\)\{[^\n]*\n[^\n]*\n[^\n]*/),'famScenes();',grab(/const H4_WILD=[^\n]*/),grab(/function curLook\(\)\{[^\n]*/),grab(/const H4_SCENE=\{\};function h4Scene\(sc\)\{[^\n]*\n[^\n]*/),'function CID(){return CURF}',grab(/function scList\(\)\{[^\n]*/),'this.go=(f,kind,lk)=>{CURF=f;S={kind,origin:{animal:lk}};return scList()};'].join('\n'),ctx);
  const ids=new Set(),wps=new Set();for(const f of W.FAMILIES.order){const kind={slyte:'fox',whimber:'owl',twitchel:'cat'}[f]||f;for(const lk of Object.keys(W.FAMILIES.animals))for(const sc of ctx.go(f,kind,lk)){ids.add(sc.id);(sc.wp||[]).forEach(w=>wps.add(w.id))}}
  ok(ids.size>=8&&![...ids].some(bad2)&&!ids.has('twitchel_clearing'),'inert: no family/look scene list reaches a Tidelings scene ('+[...ids].join(',')+')');
  const ow=new Set(OCEAN.flatMap(o=>T.scenes[o].map(h=>h.wp)));ok(![...wps].some(w=>ow.has(w)),'inert: no runtime waypoint names a Tidelings hotspot waypoint');
  ok(!/tidepool_cove|kelp_reef|lighthouse_pier/.test(/const SCENE_TO_DEN=\{[\s\S]*?\};/.exec(pix)[0])&&!/tidelings|finli/.test(/const FAM_TO_DEN=\{[^\n]*/.exec(pix)[0]),'inert: no den mapping for Tidelings scenes');
  ok(!bad2(rd('px/home/homes.json'))&&!/tidelings|finli/i.test(rd('px/home/homes.json')),'inert: no home mapping');
  ok(!W.FAMILIES.order.some(f=>/tidelings|finli|cloverkin|brumlo/i.test(f))&&!/tidelings|finli|cloverkin|brumlo/i.test(rd('families.js')),'inert: not in the family picker / families.js');
  ok(!/tidelings|finli|cloverkin|brumlo/i.test(rd('camera_match.js'))&&!/tidelings|finli|cloverkin|brumlo/i.test(rd('index.html')+rd('handheld.html')),'inert: not in the camera matcher or the picker markup');
  ok(!/tidelings|finli|cloverkin|brumlo|tidepool_cove|kelp_reef|lighthouse_pier/i.test(rd('dialogue_engine.js')+rd('dialogue.js'))&&!fs.readdirSync(path.join(R,'dialogue')).some(f=>/tidelings|finli|cloverkin|brumlo/i.test(f)),'inert: no dialogue');
  const code=s=>s.replace(/const DEFAULT_HOTSPOTS=\{.*?\};\n/,'').replace(/const DEN_CFG=\{.*?\};\n/,'').replace(/window\.SCENE_HOTSPOTS=\{.*?\};\n/,'');
  ok(!/tidepool_cove|kelp_reef|lighthouse_pier/.test(code(game)+code(pix)+code(rd('scenes.js'))+rd('alive.js')+rd('need_select.js')),'inert: no runtime code names a Tidelings scene (data tables only)');
  ok(!OCEAN.some(o=>o in W.SCENE_HOTSPOTS||o in (W.SCENE_HOTSPOTS.scenes||{}))&&!OCEAN.some(o=>o in (W.ENV_HOTSPOTS.schema.scenes||W.ENV_HOTSPOTS.schema)),'inert: the embedded runtime tables carry no ocean lists (json data only)')}
// ---------------- Oct 25 roster update (Daniel via Cole/Kai): Tidelings = exactly these 8, manatee out, hermit_crab in - every data roster agrees, still inert
{const TL=['sea_otter','seal','dolphin','sea_turtle','penguin','octopus','seahorse','hermit_crab'],same=a=>JSON.stringify(a)===JSON.stringify(TL),ex=f=>fs.existsSync(path.join(R,f));
  const B=JSON.parse(rd('px/title/title_biomes.json')),C=B.biomes.cove.anchors.cast,D=JSON.parse(rd('px/dens/parallax_dens_config.json')).dens.glowing_tidepool_cove,M=JSON.parse(rd('px/title/preview_ocean/PREVIEW_manifest.json'));
  ok(C.family==='tidelings'&&same(Object.keys(C.roster)),'tidelings roster: title_biomes cove cast roster is exactly the 8 ('+Object.keys(C.roster)+')');
  ok(D.family_id==='tidelings'&&same(D.animals),'tidelings roster: den config animals are exactly the 8 ('+D.animals+')');
  ok(same(M.roster),'tidelings roster: ocean preview manifest roster is exactly the 8');
  const bk=/^TIDELINGS = (\[[^\]]*\])/m.exec(rd('tools/bake_batch_h.py'));ok(bk&&same(JSON.parse(bk[1].replace(/'/g,'"'))),'tidelings roster: bake_batch_h.py TIDELINGS is exactly the 8');
  ok(same(C.movement.games.swim)&&C.movement.games.hermit_crab==='drift_on_current'&&JSON.stringify(C.movement.home)==='{"walk":["sea_otter","seal","penguin"],"scuttle":["hermit_crab"]}','tidelings movement: all 8 swim in games (hermit crab drifts on a current); otter/seal/penguin walk + hermit crab scuttles at home');
  const pv=fs.readdirSync(path.join(R,'px/title/preview_ocean'));
  const bs=rd('tools/bake_batch_h.py'),pal=/^OCEAN_PAL = \{[\s\S]*?^\}/m.exec(bs),oc=/^OCEAN = \[[^\]]*\]/m.exec(bs);
  ok(pal&&oc&&!/manatee/i.test(JSON.stringify([Object.keys(C.roster),C.movement,D.animals,M.roster,M.strips])+pv.join(' ')+pal[0]+oc[0]+(/elif look == 'manatee'/.test(bs)?'manatee':'')),'tidelings roster: no manatee in any roster list, movement table, preview file/strip, OCEAN_PAL, OCEAN or draw branch');
  ok(M.strips.every(s=>ex(s.file)&&TL.includes(s.look))&&pv.filter(f=>f.endsWith('.png')).length===M.strips.length&&M.strips.some(s=>s.look==='hermit_crab'&&s.anim==='drift'&&/PREVIEW_hermit_crab_drift\.png$/.test(s.file)),'ocean preview: every strip exists, is a roster look, and hermit_crab is a drift cycle');
  const RT=['families.js','camera_match.js','game.js','pixel.js','scenes.js','alive.js','need_select.js','dialogue.js','dialogue_engine.js','index.html','handheld.html'].map(rd).join('\n')+fs.readdirSync(path.join(R,'dialogue')).map(f=>rd('dialogue/'+f)).join('\n');
  ok(!/hermit|manatee|sea_?otter|sea_?turtle|seahorse|octopus/i.test(RT),'inert: no Tidelings-only roster member is named by runtime code, the picker, matcher or dialogue');
  ok(!Object.keys(W.FAMILIES.animals).some(a=>TL.includes(a))&&!JSON.parse(rd('px/title/title_frames.json')).strips.some(s=>TL.includes(s.look)||/preview_ocean/.test(s.file)),'inert: no roster member is a family animal or a title strip (previews stay unreferenced)')}
{const m='/workspace/echo/ios_design/scene_hotspots.json';if(fs.existsSync(m))ok(fs.readFileSync(m,'utf8')===rd('scenes_hotspots.json'),'ios_design/scene_hotspots.json mirrors scenes_hotspots.json (Zane builder input)')}
{const hj=JSON.parse(rd('px/home/homes.json'));for(const k of ['log','hollow','basket','basket_room','den','den_wild']){const sz=hj[k]&&hj[k].size,re=new RegExp('\\.home-'+k+'(?:,[^{]*)?\\{width:'+(sz&&sz[0])+'px;height:'+(sz&&sz[1])+'px\\}');ok(sz&&re.test(css),`home ${k}: CSS box = homes.json size ${sz}`)}
  ok(/\.home-den_wild \.htail\.denpeek/.test(css),'den_wild gets the tail-peek strip CSS');ok(/k==='den'\|\|k==='den_wild'\?'Our mossy den'/.test(game),'den homes are labelled as a den, not a basket')}
console.log(bad?`batch H: ${n} checks, ${bad} failed`:`batch H: ${n} checks, 0 failed`);process.exit(bad?1:0);
