(()=>{
const C=window.CONFIG, CR=window.CREATURES, $=s=>document.querySelector(s);
const app=$('#app'), ov=$('#overlay');
const KEY='echo-proto-v1';
let S=load(), sess={feeds:0,games:0,naps:0,chats:0};
const rnd=(seed)=>()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s)purgeFeelings(s);return s}catch(e){return null}}
// Privacy: never persist the child's feelings. Remove any legacy data of that kind.
function purgeFeelings(s){let ch=false;if('feelings' in s){delete s.feelings;ch=true}
  const bad=/you had a really good day|felt not great|bright thing for gray days|how you feel|you felt/i;
  if(Array.isArray(s.memories)){const n=s.memories.length;s.memories=s.memories.filter(m=>!bad.test(m));if(s.memories.length!==n)ch=true}
  if(Array.isArray(s.memTags)){const n=s.memTags.length;s.memTags=s.memTags.filter(t=>!['good_day','sat_sad','bright','feelings'].includes(t));if(s.memTags.length!==n)ch=true}
  if(Array.isArray(s.checkins))s.checkins.forEach(k=>{if(bad.test(k.text)){k.text=k.text.replace(/I still think about [^.]*\. It makes me [^.]*\./,'I found a glimmery leaf today.');ch=true}});
  if(Array.isArray(s.postcards)){const p=s.postcards.map(x=>bad.test(x)?x.replace(/I still think about [^.]*\. It makes me [^.]*\./,'I found a glimmery leaf today.'):x);if(p.join()!==s.postcards.join()){s.postcards=p;ch=true}}
  if(ch)try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
function save(){if(S&&!window.__wiped){S.last=now();localStorage.setItem(KEY,JSON.stringify(S))}}
function E(){return CR[S.kind]}
// Echoes have no voices: they speak in musical chirps (sound comes later). Text-to-speech is off.
function say(t,expr){try{if(S&&S.voice&&window.Chirp)Chirp.play(t,S.kind,expr)}catch(e){}}
const SFX=(n,o)=>{try{window.Sound&&Sound.play(n,o)}catch(e){}};
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),2200)}
function h(html){app.innerHTML=html;app.querySelectorAll('.scene').forEach(sc=>{const k=sc.classList.contains('dusk')?'dusk':sc.classList.contains('owl-bg')?'night':sc.classList.contains('fox-bg')?'day':null;if(k)sc.insertAdjacentHTML('afterbegin',ART.bg(k))});app.classList.remove('enter');void app.offsetWidth;app.classList.add('enter')}
const PET_KEYS=new Set(['hello','fed_fav','game_end','pairs_done','gift_got','reveal_reply']);
const B=(k,x)=>{const l=Dialogue.bark(k,x);return PET_KEYS.has(k)?Dialogue.withPet(l):l};
function stage(){return [0,20,70,140,210,290,370,440,500].filter(b=>S.bond>=b).length}
function tod(){const hr=new Date(now()).getHours();return hr<11?'morning':hr<17?'day':hr<20?'evening':'night'}
function remember(t,tag){S.memories.push(t);if(tag){S.memTags=S.memTags||[];if(!S.memTags.includes(tag))S.memTags.push(tag);(S.memTagAt=S.memTagAt||{})[tag]=S.memTagAt[tag]||now()}save()}
// callbacks (Overhaul B8): memory >= callbackMinAgeHours old, each memory <= 3 callbacks, <= 1 per session moment
function callbackLine(){const at=S.memTagAt||{},cnt=S.cbCount||{};
  const ok=l=>{const tags=[];(function walk(c){if(!c)return;if(c.hasMemory)tags.push(c.hasMemory);(c.any||[]).forEach(walk)})(l.cond);
    return tags.every(t=>at[t]!=null&&now()-at[t]>=C.callbackMinAgeHours*36e5&&(cnt[t]||0)<3)};
  const b=Dialogue.bark('callback',null,ok);if(!b)return null;
  (function walk(c){if(!c)return;if(c.hasMemory){(S.cbCount=S.cbCount||{})[c.hasMemory]=(S.cbCount[c.hasMemory]||0)+1}(c.any||[]).forEach(walk)})(b.src.cond);save();return b}
// ambient chatter (B11): every ambientMin–ambientMax s when nothing else is happening on Home
let ambT=null;function scheduleAmbient(){clearTimeout(ambT);const C2=C;ambT=setTimeout(()=>{
  const b=$('#b');const busy=!document.getElementById('feed')||document.querySelector('.full')||ov.innerHTML.trim()||(b&&b.style.display!=='none')||mood()==='sleep';
  if(!busy){const fc=FWC();let l=null;if(S.bond>=fc.restlessBond&&!sess.restless&&Math.random()<1/6&&!S.released){sess.restless=1;l=B('restless')}
    else if(S.bond>=fc.glanceFromBond&&!sess.glance&&Math.random()<1/6&&!S.released){sess.glance=1;l=B('wild_glance');const px=document.querySelector('#cr .px-echo');if(px){px.classList.add('fwglance');setTimeout(()=>px.classList.remove('fwglance'),1200)}}
    const cb=!l&&Math.random()<.25?callbackLine():null;if(cb)fwTick('memory');talk(l||cb||B('ambient'));sess.ambient=(sess.ambient||0)+1}
  scheduleAmbient()},(C2.ambientMin+Math.random()*(C2.ambientMax-C2.ambientMin))*1000)}
Dialogue.ctx=()=>S&&S.kind?({mood:mood(),bond:S.bond,stage:stage(),memTags:S.memTags||[],talents:S.talents,time:tod(),vars:S.vars||(S.vars={}),seen:S.seen||[],
  fill:{name:S.g.name,child:S.child,fav:(S.g.fav||'').split(' ').slice(1).join(' '),treasure:E().treasure,place:E().place,release:E().release,trust:E().trust,quirk:S.g.quirk,token:E().token,gift:S.gift||'',memory:(S.memories[Math.floor(Math.random()*S.memories.length)]||'the day we met').replace(/\.$/,'')}}):{};
const SCR=()=>document.getElementById('screen')||document.body;
const PI=(e,intent)=>window.PIXEL?PIXEL.icon(PIXEL.iconName(e,intent)):e;
function full(html){const d=document.createElement('div');d.className='full';d.innerHTML=html;SCR().appendChild(d);try{lvModal()}catch(e){}return d}
const now=()=>Date.now()+((S&&S.clockOffset)||0);
const clamp=v=>Math.max(0,Math.min(100,v));

// ---------- unique creature generation (§7) ----------
function genEcho(kind){
  const seed=Math.floor(Math.random()*2e9)+1, r=rnd(seed), pick=a=>a[Math.floor(r()*a.length)];
  const cr=CR[kind];
  const coats=kind==='fox'?['#e8772e','#d9622b','#c9853f','#b5533a','#e39a52']:['#8a6f5a','#a08670','#6f6a80','#b49a7a','#7d6150'];
  return {seed, coat:pick(coats), accent:pick(['#fff4e0','#ffe9c7','#f3efe6']), eye:pick(['#3a2a1a','#2b5d3a','#e0a020','#3b4fa0']),
    marking:pick(['star','stripe','spot','none']), quirk:pick(cr.quirks), fav:pick(cr.foods),
    playful:+(0.5+r()*0.5).toFixed(2), name:null};
}
function svg(kind,g,m){const ex=m==='sleep'?'sleepy':m==='sad'?'neutral':m==='happy'?'happy':(m||'neutral');return ART.creature(kind,g).replace('data-expr="neutral"',`data-expr="${ex}"`)}
function mood(){const n=S.needs;const m=Math.min(n.food,n.play,n.rest,n.comfort);return S.napUntil>now()?'sleep':m>60?'happy':m<25?'sad':'ok'}
function want(){const n=S.needs;const e=[['food','🍎'],['play','⚽'],['rest','🛏️'],['comfort','💗']].sort((a,b)=>n[a[0]]-n[b[0]])[0];return n[e[0]]<60?e[1]:null}

// ---------- time model (§5.1) ----------
function simulate(){
  if(!S||!S.last)return; let hrs=(now()-S.last)/36e5; if(hrs<0)hrs=0; hrs=Math.min(hrs,C.maxDecayHours);
  for(const k in C.decayPerHour)S.needs[k]=clamp(S.needs[k]-C.decayPerHour[k]*hrs);
  const today=new Date(now()).toDateString(); if(S.lastHello!==today){S.lastHello=today;addBond(C.bond.hello,true);S.days=(S.days||0)+1}
}
function addBond(n,silent){
  const before=S.bond; S.bond=Math.min(500,S.bond+Math.round(n*C.demoSpeed));
  if(S.badges===undefined)S.badges=[];
  for(const m of C.milestones){ if(before<m.bond&&S.bond>=m.bond&&!S.badges.includes(m.id)){S.badges.push(m.id);queueMilestone(m)} }
  save(); if(!silent)renderBadge();
}
let mq=[];function queueMilestone(m){mq.push(m)}
function flushMilestones(){
  if(!mq.length||document.querySelector('.full')||!document.getElementById('feed'))return; const m=mq.shift(), e=E(); let title='',line='';
  if(m.id==='ready')return flushMilestones();   // farewell arc: the Ready moment is the almost-ready conversation + list (fwCalm)
  const ti=['talent1','talent2','talent3','talent4'].indexOf(m.id);
  if(ti>=0){const t=e.talents[ti];S.talents.push(t);title=`Talent: ${t}!`;line=B('talent_'+t);}
  else if(m.id==='name'){title='A new friend!';line=B('first_gift');S.treasures.push(e.treasure)}
  else if(m.id==='place'){title='Favorite place!';line=B('favplace')}
  else if(m.id==='trust'){title='Trust gesture';line=B('trust')}
  else if(m.id==='ready'){title='Ready for the wild';line=B('ready_hint')}
  S.stickers.push(title);save();
  const d=full(`<div class="mcard"><div class="mtop">${PI(ti>=0?'✨':'🌟')}<span class="mt">${title}</span>${PI(ti>=0?'✨':'🌟')}</div><div class="mstage">${svg(S.kind,S.g,line.expr||'happy')}</div><p class="mline">${line.text}</p><p class="mnote">${PI('🌟')}<span>Sticker added to your Memory Book</span></p><button class="btn">Yay!</button></div>`);d.classList.add('milestone');
  say(line.text); d.querySelector('button').onclick=()=>{d.remove();home();setTimeout(flushMilestones,300)};
}
function talentLine(t){return B('talent_'+t).text}
function start(){
  if(!S)return setup();
  Dialogue.load(S.kind==='fox'?'slyte':'whimber').then(()=>{initDialogue();fwMigrate();if(S.released){migrateCheckins();if(S.fw&&!S.fw.closed&&S.fw.step===9){afterHome();return closure()}return afterHome()}if(S.fw&&S.fw.state==='ceremony'){simulate();save();return fwCeremony(S.fw.path,true)}window.__awayMin=S.last?(now()-S.last)/6e4:0;if(window.__awayMin>=FWC().longAbsenceDays*1440)sess.welcomeBack=1;if(!S.scene)S.scene=scHome().id;if(window.__awayMin>=(C.foundMinAwayMinutes||20)&&!S.graceUntil)window.__foundScene=scPickSession();simulate();save();home(true)}).catch(e=>{console.error(e);h('<p style="padding:20px">Could not load dialogue. Please reload.</p>')});
}
function setup(){
  const fox=window.PIXEL?PIXEL.slyte({seed:7},1):'',owl=window.PIXEL?PIXEL.whimber({seed:4},1):'';
  h(`<div class="scene title"><div class="bg pxbg pxbg-night"></div><div class="tcard"><div class="tlogo">${PI('✨')}<span>Project Echo</span>${PI('✨')}</div>
     <div class="tpair"><div class="tslot">${fox}</div><div class="tslot owl">${owl}</div></div>
     <p>Prototype for playtesting. A grown-up sets this up.</p>
     <input id="nick" maxlength="12" placeholder="Child's nickname" aria-label="Child's nickname"><label class="tchk"><input type="checkbox" id="voice" checked> Chirp sounds</label>
     <button class="btn" id="go">${PI('▶')}<span class="lbl">Start</span></button></div></div>`);
  $('#go').onclick=()=>{S={child:($('#nick').value||'friend').slice(0,12),voice:$('#voice').checked};discover()};
}
function discover(){
  h(`<div class="scene dusk"><div class="bg pxbg pxbg-discover"></div><div class="bubble">The meadow at dusk. Something is moving… Tap one!</div>
   <button class="propbtn rustle" id="bush" aria-label="Rustling bush" style="left:2px;bottom:76px;width:66px;height:42px"><i class="leafbit a"></i><i class="leafbit b"></i></button>
   <button class="propbtn" id="tree" aria-label="Tree with glowing eyes" style="right:8px;bottom:80px;width:72px;height:150px"><i class="treeeyes"></i></button>
   <p class="dnote">Card scan is deferred in this web prototype</p></div>`);
  $('#bush').onclick=()=>reveal('fox');$('#tree').onclick=()=>reveal('owl');
}
async function reveal(kind){
  Object.assign(S,{kind,g:genEcho(kind),needs:{food:60,play:50,rest:80,comfort:60},bond:0,badges:[],talents:[],stickers:[],treasures:[],memories:[],memTags:[],vars:{},seen:[],foods:[],met:now(),days:1,lastHello:new Date(now()).toDateString()});
  S.g.name=E().name; await Dialogue.load(kind==='fox'?'slyte':'whimber');initDialogue();
  const e=E();
  const px=!!window.PIXEL;
  h(`<div class="scene ${e.bg}"><div class="creature" id="cr" ${px?'':'style="opacity:0;bottom:-40%;transition:all 1.2s cubic-bezier(.2,1.4,.4,1)"'}>${svg(kind,S.g,px?'neutral':'surprised')}</div><div class="bubble" id="b" style="display:none"></div></div>`);
  // Arrival (guide 9.2, P0): falling star -> sparkles spiral in -> forms heart-out in light form -> blink open -> hop (~2 s)
  SFX(kind==='fox'?'slyte_arrival':'whimber_arrival');if(px){const el=$('#cr .px-echo');el.dataset.stage=1;PIXEL.event(el,'arrival')}
  else setTimeout(()=>{const c=$('#cr');c.style.opacity=1;c.style.bottom='10%'},300);
  setTimeout(()=>{talk(B('reveal'),60000);
    setTimeout(()=>{choices([['👋','Hi!',null],['🤗','Welcome',null],['🤫','Just smile',null]],(i)=>{
        save();talk(B('reveal_reply'));remember('The day we met in the dusk meadow','met');
        setTimeout(()=>{home();const tip=()=>toast('Tip: tap the buttons below to care for '+S.g.name);
          if(localStorage.getItem('echo-nosetup'))return tip();sess.fwBusy=1;setTimeout(()=>runConv(kind==='fox'?'slyte_where_from':'whimber_where_from',()=>{sess.fwBusy=0;tip()}),600)},2400);
      })},1800)},1700);
}
function renderBadge(){const el=$('#bond');if(!el)return;if(renderBadge.b!=null&&S.bond>renderBadge.b)SFX('bond_meter_tick',{gap:800,vol:.5});renderBadge.b=S.bond;const f=S.bond/500;el.setAttribute('aria-label','Bond '+S.bond+' of 500');el.innerHTML=`<i class="pxheart"></i>`+[0,1,2,3,4].map(i=>`<i class="seg${f>i/5+.001?' on':''}"></i>`).join('')}
function home(greet){
  ov.innerHTML='';
  const e=E(), m=mood(), w=want(), ready=fwShowPath();
  h(`<div class="top"><button class="badge" id="bond" style="border:0;color:#fff"></button><b>${S.g.name}</b><div class="row">${ready?`<button class="btn small ico" id="fwl" aria-label="Farewell list">${PI('📜')}</button>`:''}<button class="btn small ico" id="book" aria-label="Memory Book">${PI('📖')}</button><button class="btn small ico" id="how" aria-label="How am I?">${PI('🤔')}</button></div></div>
   <div class="scene ${e.bg} pxscene" id="sc" style="${scStyle()}">${fwHomeBits()}
   ${curScene()===scHome()?fortProp():''}<div class="creature idle" id="cr">${svg(S.kind,S.g,m)}</div>${w&&m!=='sleep'?`<div class="thought">${window.PIXEL?PIXEL.icon({'🍎':'feed','⚽':'play','🛏️':'sleep','💗':'pet'}[w]||'talk'):w}</div>`:''}
   <div class="bubble" id="b" style="display:none"></div>
   ${ready?`<button class="btn rel" id="rel">${PI('🌲')}<span class="lbl">${fwUI('ui_path_button',S.kind==='fox'?0:1)}</span></button>`:''}</div>
   <div class="dock"><button class="btn" id="feed">${window.PIXEL?PIXEL.icon('feed'):'🍎'}Feed</button><button class="btn" id="play">${window.PIXEL?PIXEL.icon('play'):'🎲'}Play</button><button class="btn" id="comfort">${window.PIXEL?PIXEL.icon('pet'):'💗'}Hug</button><button class="btn" id="rest">${window.PIXEL?PIXEL.icon('sleep'):'🛏️'}Rest</button></div>
   <div class="dbg"><button class="btn small" id="dbg" style="min-height:28px">dev</button></div>`);
  renderBadge();
  $('#feed').onclick=feed;$('#play').onclick=play;$('#comfort').onclick=comfort;$('#rest').onclick=rest;$('#book').onclick=book;$('#how').onclick=how;$('#dbg').onclick=dev;
  if(ready){$('#rel').onclick=fwStartByChild;if($('#path'))$('#path').onclick=fwStartByChild;$('#fwl').onclick=fwList}
  if($('#fwstar')&&S.kind!=='fox'&&ready)$('#fwstar').onclick=fwStartByChild;
  // stroke to pet
  let strokes=0;$('#cr').addEventListener('pointermove',ev=>{if(ev.buttons||ev.pointerType==='touch'){strokes++;if(strokes%25===0)pet()}});
  $('#cr').addEventListener('click',pet);
  if(m==='sleep'){talk(B('napping'));setTimeout(()=>{if(S.napUntil<=now())home()},Math.max(500,S.napUntil-now()+200));return}
  if(greet)fwSession();
  if(greet&&fwGreet()){}
  else if(greet&&window.__foundScene!==undefined&&!ready){const fs=window.__foundScene;window.__foundScene=undefined;lvStart(true,!!fs)}
  else if(greet){talk(B('hello'));setTimeout(()=>{const b=$('#b');if(document.getElementById('feed')&&!ov.innerHTML.trim()&&!document.querySelector('.full')&&b)talk(B('time_'+tod()))},4200)}
  if(LIVE.st!=='found')lvStart(false);
  if(window.Music)Music.home(S.kind);
  setTimeout(()=>{if(!maybeBondUp())flushMilestones()},400);scheduleAmbient();
}

// ---------- Bond-up scene (bond_up.md v0.1): plays on the next Home, before any milestone card; once per transition per Echo ----------
// ---------- Per-Echo scenes (echo/scenes/scenes.md v0.2) ----------
const SC_OY=57;   // phone bg (180x320) is bottom-anchored in the 263 px scene: scene y = bg y - 57
function scList(){return SCENES[S.kind==='fox'?'slyte':'whimber']}
function scHome(){return scList()[0]}
function scUnlocked(){return scList().filter((s,i)=>S.bond>=SCENES.unlock[i])}
function curScene(){const L=scList();return L.find(s=>s.id===S.scene)||L[0]}
function scVariant(){return ['evening','night'].includes(tod())?'twi':'day'}
function scBand(){return ['morning','day','evening','night'].indexOf(tod())}
function scReq(r){if(!r)return true;const f=fortState();let m;
  if(r==='badge:place')return S.badges.includes('place');
  if((m=r.match(/^talent:(.+)$/)))return S.talents.includes(m[1]);
  if((m=r.match(/^(fort|hollow)_(stage|decor)>=(\d+)$/)))return (m[2]==='stage'?f.stage:f.decor)>=+m[3];return false}
// pick the scene for a new session (>= 20 min away): a newly unlocked scene first (as a found-moment), else by time-of-day weight, last scene halved
function scPickSession(){const L=scUnlocked(),seen=S.scenesSeen=S.scenesSeen||[scHome().id];let first=null;
  const bondPending=S.bondShown!=null&&bondTarget()>S.bondShown;
  const fresh=L.find(s=>!seen.includes(s.id));
  if(fresh&&!bondPending){first=fresh.id;seen.push(fresh.id);S.scene=fresh.id;remember(`We found the ${fresh.title.toLowerCase()}`,'scene_'+fresh.id);return first}
  const W=SCENES.weights[S.kind==='fox'?'slyte':'whimber'],b=scBand();let opts=[];
  L.forEach(s=>{let w=W[s.id][b];if(s.id===S.scene)w*=.5;if(w>0)opts.push([s.id,w])});
  if(!opts.length){S.scene=scHome().id;return null}
  let t=Math.random()*opts.reduce((a,o)=>a+o[1],0);for(const [id,w] of opts){t-=w;if(t<=0){S.scene=id;break}}if(t>0)S.scene=opts[0][0];return null}
function scWp(id){const w=curScene().wp.find(x=>x.id===id);return w?[w.xy[0],Math.max(52,w.xy[1]-SC_OY)]:null}
function scStyle(){const s=curScene();return `background:url(px/scenes/${s.id}_${scVariant()}.png) center bottom/180px 320px no-repeat !important`}
function scPicker(){   // 'Our places' (bond 140, the place badge): thumbnails of unlocked scenes; picking one travels there
  const L=scUnlocked();const d=full(`<div class="mcard places"><div class="mtop">${PI('🌲')}<span class="mt">Our places</span></div><div class="plist">${L.map((s,i)=>`<button class="btn place${s.id===curScene().id?' on':''}" data-i="${i}"><i style="background-image:url(px/scenes/${s.id}_${scVariant()}.png)"></i><span>${s.title}</span></button>`).join('')}</div><button class="btn small" id="pclose">Close</button></div>`);
  d.style.zIndex=95;d.querySelector('#pclose').onclick=()=>d.remove();
  d.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const s=L[+b.dataset.i];d.remove();document.querySelectorAll('.book').forEach(x=>x.remove());if(s.id===curScene().id)return;
    S.scene=s.id;(S.scenesSeen=S.scenesSeen||[]).includes(s.id)||S.scenesSeen.push(s.id);save();const scr=SCR(),w=document.createElement('div');w.className='scwipe';scr.appendChild(w);setTimeout(()=>{home();setTimeout(()=>w.remove(),400)},300)})}

// ---------- Living Echo (living_echo/living_echo.md v0.1): Present / Wander / Routine / Found on Home ----------
// Guardrail: the Echo never "waits for you". Every return opens on a happy activity already in progress; no lines about time away.
// behaviour names in scenes.json -> the P0 behaviours below (reusing existing frames)
const LV_IMPL={leaf_pounce:'leaf_pounce',leaf_toss:'leaf_pounce',sniff:'sniff',sniff_flowers:'sniff',sneeze:'giggle',trinket_play:'trinket',curl_nap:'curl_nap',nap_inside:'nap',go_inside:'nap',midday_nap:'nap',
  moon_yip:'moon_yip',fort_flag:'fort_flag',flag_wave:'fort_flag',fort_peek:'peek',peek_from_log:'peek',peek_from_grass:'peek',disguise_hide:'peek',stack_peek:'peek',sunrise_greet:'sunrise',good_morning_sun:'sunrise',
  riddle_think:'think',read_sign:'think',read_book:'read',page_turn:'read',jump_up:'hop',tail_dangle:'giggle',warm_paws:'warm',sunbathe:'warm',butterfly_chase:'excited',preen:'preen',feather_tidy:'preen',
  head_tilt:'tilt',listen:'tilt',stargaze:'stargaze',stargaze_lie_back:'stargaze',moon_watch:'stargaze',lantern_share:'lantern',story_hum:'lullaby',lullaby_hum:'lullaby',sit_and_sway:'warm',cloud_shapes:'think',silent_flight_loop:'hop'};
const LV_BAND={moon_yip:['night'],stargaze:['evening','night'],stargaze_lie_back:['evening','night'],moon_watch:['evening','night'],sunrise_greet:['morning'],good_morning_sun:['morning'],curl_nap:['evening'],midday_nap:['day'],nap_inside:['evening','night'],butterfly_chase:['morning','day'],sunbathe:['morning','day']};
const LV_FOUND={leaf_pounce:'found_leaves',trinket:'found_trinket',moon_yip:'found_moon',sunrise:'found_sunrise',curl_nap:'found_curl',fort_flag:'found_fort',lullaby:'found_lullaby',stargaze:'found_stars',read:'found_book',nap:'found_nap',lantern:'found_lantern'};
const SC_FOUND={clearing:{fort_door:'found_clearing_door','moon_rock:moon_yip':'found_clearing_moon'},grove:{log_peek:'found_grove_log',leaf_pile:'found_grove_pile'},meadow:{sun_rock:'found_meadow_rock',flowers:'found_meadow_butterfly'},
  branch:{hollow_door:'found_branch_door',branch_tip:'found_branch_tip'},library:{reading_nook:'found_library_nook',window_sill:'found_library_sill'},hilltop:{tree_branch:'found_hilltop_branch',blanket:'found_hilltop_blanket'}};
function lvDef(){const sc=curScene(),wp={};sc.wp.forEach(w=>{wp[w.id]=scWp(w.id)});return {wp,scene:sc}}
function lvOptions(band){const out=[];curScene().wp.forEach(w=>{if(['stage'].includes(w.id)||/exit/.test(w.kind)||!scReq(w.requires))return;
    w.acts.forEach(a=>{if(!LV_IMPL[a])return;if(LV_BAND[a]&&!LV_BAND[a].includes(band))return;if(band==='night'&&S.kind==='fox'&&!LV_BAND[a])return;out.push({wp:w.id,act:a,impl:LV_IMPL[a]})})});return out}
const LIVE={st:'present',pos:null,act:null,timer:null,lastTouch:0,nextIdle:0,band:null,busy:false,log:[]};
function lvEl(){return document.getElementById('cr')}
function lvPlace(x,y,face){const c=lvEl();if(!c)return;LIVE.pos=[x,y];const sc=$('#sc');const H=sc?sc.clientHeight:263;
  c.style.setProperty('left',x+'px','important');c.style.setProperty('bottom',(H-y)+'px','important');c.style.zIndex=String(10+Math.round(y/10));
  const px=c.querySelector('.px-echo');if(px&&face!=null)px.classList.toggle('lvflip',face<0)}
function lvIdleDelay(){const fox=S.kind==='fox';return ((fox?8:10)+Math.random()*(fox?12:15))*1000*(C.livingSpeed||1)}
function lvClear(){clearInterval(LIVE.timer);LIVE.timer=null;clearTimeout(LIVE.actT);clearTimeout(LIVE.noticeT);document.querySelectorAll('#sc .lvfx').forEach(e=>e.remove());const px=document.querySelector('#cr .px-echo');if(px)px.classList.remove('lvtilt');const c=lvEl();if(c)c.classList.remove('lvmoving')}
function lvMove(to,done,fast){   // Slyte trots on the ground (2 px/tick, 3 when called over); Whimber flies a quadratic arc (3 px/tick, apex 12-20 px)
  lvClear();const [x0,y0]=LIVE.pos||lvDef().wp.stage,[x1,y1]=to,fox=S.kind==='fox',d=Math.hypot(x1-x0,y1-y0);
  if(d<1){done&&done();return}
  const sp=fast?Math.max(3,d/22):(fox?2:3),n=Math.max(1,Math.ceil(d/sp)),apex=fox?0:Math.min(24,12+d/12),hopUp=fox&&y1<y0-20,step=lowFx()?2:1;let i=0;
  const c=lvEl();if(c)c.classList.add('lvmoving');if(!fox)setExpr('excited');
  LIVE.timer=setInterval(()=>{i=Math.min(n,i+step);const t=i/n;let x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;
    if(!fox||hopUp)y-=4*(hopUp?10:apex)*t*(1-t);                 // flight arc / the fort hop chain
    else if(!lowFx()&&i<n)y-=(i>>1)%2;                                   // 1 px trot bob
    lvPlace(Math.round(x),Math.round(y),x1<x0?-1:1);
    if(i>=n){clearInterval(LIVE.timer);LIVE.timer=null;if(c)c.classList.remove('lvmoving');if(!fox)setExpr(baseExpr());done&&done()}},83)}
function lvFx(src,x,y,cls,ms){const sc=$('#sc');if(!sc)return;const e=document.createElement('i');e.className='lvfx '+(cls||'');e.style.cssText=`left:${x}px;top:${y}px;background-image:url(${src})`;sc.appendChild(e);setTimeout(()=>e.remove(),ms||1500)}
function lvDo(name,dur){   // run a behaviour at the current spot for dur ms
  const fox=S.kind==='fox',[x,y]=LIVE.pos,top=y-48;LIVE.act=name;LIVE.log.push(name);const fx=lowFx()?0:1;
  const z=()=>{if(fx)lvFx('px/living/z.png',x+12,top-4,'rise',1500)};
  const A={
    leaf_pounce:()=>{react('excited');for(let k=0;k<(fx?4:1);k++)lvFx(`px/trail/f_slyte_${k%3}.png`,x-20+k*10,y-14,'scatter s'+k,900);LIVE.actT=setTimeout(()=>{react('excited');for(let k=0;k<(fx?3:0);k++)lvFx(`px/trail/f_slyte_${k%3}.png`,x-14+k*10,y-14,'scatter s'+k,900)},1500)},
    sniff:()=>setExpr('curious'),
    trinket:()=>{setExpr('giggling');lvFx('px/living/trinket.png',x+18,y-16,'roll',dur)},
    curl_nap:()=>{let k=0;const turn=setInterval(()=>{const px=document.querySelector('#cr .px-echo');if(px)px.classList.toggle('lvflip');if(++k>=6){clearInterval(turn);setExpr('sleepy');z();LIVE.zT=setInterval(z,1600)}},166)},
    moon_yip:()=>{setExpr('excited');say('Yip!','excited');LIVE.actT=setTimeout(()=>say('Yip!','excited'),1000)},
    fort_flag:()=>setExpr('proud'),
    sunrise:()=>{setExpr('happy');react('happy');if(fx)lvFx('px/i_sparkle.png',x+16,top,'rise',1200)},
    lullaby:()=>{setExpr('happy');say('Hoo…','happy');let k=0;LIVE.zT=setInterval(()=>{if(fx||k%3===0)lvFx('px/living/note.png',x+8+(k%3)*8,top+4,'rise',1500);k++},500)},
    stargaze:()=>{setExpr('thinking');const px=document.querySelector('#cr .px-echo');if(px)px.classList.add('lvtilt')},
    nap:()=>{setExpr('sleepy');z();LIVE.zT=setInterval(z,1600)},
    read:()=>{setExpr('thinking');if(S.kind!=='fox')lvFx('px/i_book.png',x+14,y-18,'',dur)},
    lantern:()=>setExpr('curious'),preen:()=>setExpr('shy'),hop:()=>react('happy'),
    giggle:()=>{setExpr('giggling');react('happy')},peek:()=>setExpr('shy'),think:()=>setExpr('thinking'),warm:()=>setExpr('happy'),excited:()=>{setExpr('excited');react('excited')},
    tilt:()=>{setExpr('curious');const px=document.querySelector('#cr .px-echo');if(px)px.classList.add('lvtilt')}};
  clearInterval(LIVE.zT);(A[name]||(()=>{}))()}
function lvStop(){clearInterval(LIVE.zT);lvClear();LIVE.act=null}
function lvPick(band,found){const last=(S.lvLast||[]).slice(-2);let opts=lvOptions(band).filter(o=>!last.includes(o.wp+':'+o.act));
  if(found)opts=opts.filter(o=>LV_FOUND[o.impl]||(SC_FOUND[curScene().id]||{})[o.wp]);
  if(!opts.length)opts=lvOptions(band);if(!opts.length)return null;
  const mem=(S.memories||[]).slice(-6).join(' ').toLowerCase();const W=opts.flatMap(o=>{let w=1;if(o.impl==='fort_flag'&&/fort|hollow/.test(mem))w+=3;if(o.impl==='leaf_pounce'&&/lea(f|ves)/.test(mem))w+=2;return Array(w).fill(o)});
  return W[Math.floor(Math.random()*W.length)]}
function lvRemember(k){S.lvLast=[...(S.lvLast||[]),k].slice(-4)}
function lvCanWander(){const b=$('#b');return document.getElementById('feed')&&!document.querySelector('.full,.book,.bondup')&&!ov.innerHTML.trim()&&!(b&&b.style.display!=='none')&&!((S.napUntil||0)>now())&&!window.__bondup&&!S.released}
function lvWander(){const band=tod();const o=lvPick(band);if(!o){LIVE.nextIdle=now()+lvIdleDelay();return}
  const k=o.impl;LIVE.st='wander';lvRemember(o.wp+':'+o.act);$('#sc')&&$('#sc').classList.add('lvaway');
  lvMove(scWp(o.wp),()=>{lvDo(k,4000+Math.random()*8000);LIVE.actT2=setTimeout(()=>{if(LIVE.st!=='wander')return;lvStop();LIVE.nextIdle=now()+lvIdleDelay();
    if(Math.random()<.4)lvHome()},4000+Math.random()*8000)})}
function lvHome(fast,done){LIVE.st='present';lvStop();lvMove(lvDef().wp.stage,()=>{$('#sc')&&$('#sc').classList.remove('lvaway');setExpr(baseExpr());const px=document.querySelector('#cr .px-echo');if(px)px.classList.remove('lvflip');done&&done()},fast)}
function lvPresent(){   // the child is interacting: come to the stage spot (<= 2 s) and stay
  LIVE.lastTouch=now();LIVE.nextIdle=now()+3000+lvIdleDelay();clearTimeout(LIVE.actT2);
  if(LIVE.st!=='present'||(LIVE.pos&&Math.hypot(LIVE.pos[0]-scWp('stage')[0],LIVE.pos[1]-scWp('stage')[1])>1)){if(LIVE.st==='found')return lvNotice();lvHome(true)}}
function lvFound(firstScene){   // opens mid-activity at a waypoint; notices the child after 1.5 s or the first tap
  const band=tod();let o=null;
  if(band==='morning'&&S.sunriseDay!==new Date(now()).toDateString()){o=lvOptions(band).find(x=>x.impl==='sunrise');if(o)S.sunriseDay=new Date(now()).toDateString()}
  if(!o)o=lvPick(band,true);if(!o){lvPresent();return}
  lvRemember(o.wp+':'+o.act);const sf=SC_FOUND[curScene().id]||{};
  LIVE.foundKey=firstScene?`found_${curScene().id}_first`:(sf[o.wp+':'+o.act]||(o.wp!=='moon_rock'&&sf[o.wp])||LV_FOUND[o.impl]||'hello');
  LIVE.st='found';LIVE.foundAct=o.impl;$('#sc')&&$('#sc').classList.add('lvaway');lvPlace(...scWp(o.wp),1);lvDo(o.impl,60000);
  LIVE.noticeT=setTimeout(lvNotice,1500)}
function lvNotice(){if(LIVE.st!=='found')return;clearTimeout(LIVE.noticeT);lvStop();LIVE.st='noticed';
  setExpr('happy');react('happy');const [x,y]=LIVE.pos;if(!lowFx())for(let i=0;i<3;i++)lvFx('px/heart_full.png',x-8+i*8,y-56,'rise',1200);
  talk(B(LIVE.foundKey)||B('hello'),3200);
  setTimeout(()=>{if(LIVE.st==='noticed')lvHome(false)},1600)}
function lvRoutine(band){   // band changed while open: play that band's routine where this scene allows it
  if(!lvCanWander())return;const fox=S.kind==='fox';const hm=new Date(now());const mins=hm.getHours()*60+hm.getMinutes();
  const want=band==='evening'?(fox?(mins>=18*60+30?['curl_nap']:['leaf_pounce']):['lantern','stargaze']):band==='night'?(fox?['moon_yip']:['stargaze','lullaby']):band==='morning'?['sunrise']:(fox?['trinket','leaf_pounce']:['nap','preen']);
  const opts=lvOptions(band);const o=opts.find(x=>want.includes(x.impl))||opts[0];if(!o)return;const line=(band==='evening'&&(o.impl==='curl_nap'||!fox))?'routine_sunset':null;
  LIVE.st='wander';lvRemember(o.wp+':'+o.act);$('#sc')&&$('#sc').classList.add('lvaway');lvMove(scWp(o.wp),()=>{lvDo(o.impl,8000);if(line)talk(B(line),3000);LIVE.actT2=setTimeout(()=>{if(LIVE.st==='wander'){lvStop();LIVE.nextIdle=now()+lvIdleDelay()}},8000)})}
// any modal (cards, bond-up, postcards, Memory Book, How am I?, picker, Our places, list): pause wandering and hide the away sprite
function lvModal(){const sc=document.getElementById('sc');if(!sc)return false;const m=!!document.querySelector('.full,.book,.panel,.bondup');
  if(m){if(LIVE.timer){clearInterval(LIVE.timer);LIVE.timer=null}if(LIVE.st==='wander'){lvStop();LIVE.st='paused'}sc.classList.add('lvmodal');return true}
  sc.classList.remove('lvmodal');if(LIVE.st==='paused'){LIVE.st='present';lvHome()}return false}
function lvTick(){if(!S||!S.kind||!document.getElementById('cr')||!document.getElementById('feed'))return;
  if(lvModal())return;
  if(!LIVE.pos)lvPlace(...lvDef().wp.stage);
  const band=tod();if(LIVE.band&&band!==LIVE.band){LIVE.band=band;lvRoutine(band);return}LIVE.band=band;
  if(ov.innerHTML.trim()&&LIVE.st!=='present'&&LIVE.st!=='found')return lvPresent();   // a conversation started: come over
  if(LIVE.st==='present'&&!LIVE.timer&&now()>LIVE.nextIdle&&now()-LIVE.lastTouch>3000&&lvCanWander())lvWander()}
function lvStart(found,firstScene){LIVE.pos=null;LIVE.st='present';LIVE.band=tod();LIVE.lastTouch=now();LIVE.nextIdle=now()+lvIdleDelay();lvStop();
  lvPlace(...lvDef().wp.stage,1);
  if(found)lvFound(firstScene);
  clearInterval(LIVE.tickT);LIVE.tickT=setInterval(lvTick,500);
  const scr=SCR();if(!scr._lv){scr._lv=1;scr.addEventListener('pointerdown',e=>{if(!S||!document.getElementById('feed'))return;if(e.target.closest('.dock,#cr,.choices,#b,.thought'))lvPresent();else if(LIVE.st==='found')lvNotice()},true)}}

function lowFx(){return !!(S&&S.lowfx)||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}
function bondTarget(){return S.bond>=500?5:PIXEL.stageFromBond(S.bond)}
function maybeBondUp(){
  if(!S||!S.kind||S.released||S.releasePath||!window.BondUp||!document.getElementById('feed')||document.querySelector('.full,.book,.bondup')||ov.innerHTML.trim())return false;
  if(S.bondShown==null)S.bondShown=PIXEL.stageFromBond(S.bond);
  if((S.napUntil||0)>now()||bondTarget()<=S.bondShown)return false;
  playBondUp(S.bondShown,S.bondShown+1,true);return true}
function bondBg(){   // freeze the Home scene (background layers + props, without the Echo) onto a 180x320 canvas
  const c=document.createElement('canvas');c.width=180;c.height=320;const k=c.getContext('2d');k.imageSmoothingEnabled=false;
  const scr=SCR(),R=scr.getBoundingClientRect(),z=R.width/180;
  const els=[scr.querySelector('#sc'),...scr.querySelectorAll('#sc .bg,#sc .fortprop,#sc .pxpath')].filter(Boolean);
  const jobs=[];els.forEach(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);if(!r.width||!r.height)return;   // hidden layers (scene art replaces .bg)
    if(el.id==='sc'&&el.classList.contains('pxscene')){const u=(cs.backgroundImage.match(/url\("?([^")]+)"?\)/)||[])[1];if(u)jobs.push({u,x:(r.left-R.left)/z,y:(r.bottom-R.top)/z-320,w:180,h:320});return}if(cs.backgroundColor&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'){k.fillStyle=cs.backgroundColor;k.fillRect((r.left-R.left)/z,(r.top-R.top)/z,r.width/z,r.height/z)}
    const urls=[...cs.backgroundImage.matchAll(/url\("?([^")]+)"?\)/g)].map(m=>m[1]).reverse();urls.forEach(u=>jobs.push({u,x:(r.left-R.left)/z,y:(r.top-R.top)/z,w:r.width/z,h:r.height/z}))});
  return Promise.all(jobs.map(j=>new Promise(res=>{const im=new Image();im.onload=()=>res([j,im]);im.onerror=()=>res(null);im.src=j.u}))).then(L=>{
    L.forEach(x=>{if(!x)return;const [j,im]=x;k.drawImage(im,Math.round(j.x),Math.round(j.y),Math.min(im.width,Math.round(j.w))||im.width,Math.min(im.height,Math.round(j.h))||im.height)});return c})}
function playBondUp(from,to,live,done){
  const scr=SCR(),cr=document.querySelector('#cr .px-echo')||document.querySelector('.px-echo');if(!cr){done&&done();return}
  const R=scr.getBoundingClientRect(),z=R.width/180,r=cr.getBoundingClientRect(),echo={x:Math.round((r.left-R.left)/z),y:Math.round((r.top-R.top)/z)};
  const sheet=new Image();sheet.src=PIXEL.sheet(S.kind==='fox'?'slyte':'whimber',S.g);
  const line=B('bond_up_'+to)||{text:'BOND UP!'};const lineObj=typeof line==='string'?{text:line}:line;
  if(live){S.bondShown=to;(S.bondMoments=S.bondMoments||[]).push({from,to,day:S.days});save()}   // the bond and the Memory Book entry are saved even if skipped
  clearTimeout(talk.t);const b=$('#b');if(b)b.style.display='none';
  Promise.all([bondBg(),new Promise(res=>{if(sheet.complete)res();else{sheet.onload=res;sheet.onerror=res}})]).then(([bg])=>{
    cr.style.visibility='hidden';if(window.Music)Music.duck(true);SFX('bondup_sting_'+(S.kind==='fox'?'slyte':'whimber'),{vol:.9});
    window.__bondup=BondUp.play({parent:scr,sheet,bg,echo,from,to,line:lineObj,lowfx:lowFx(),short:!!S.shortBondUp,
      onLine:o=>{say(o.text,o.expr);if(o.react)setTimeout(()=>react(o.react),50)},
      onDone:()=>{window.__bondup=null;if(window.Music)Music.duck(false);cr.style.visibility='';if(live){renderBadge();SFX('bond_meter_tick');home();if(to>=3&&to<=5)setTimeout(()=>{if(document.getElementById('feed')&&!document.querySelector('.full,.bondup')){const px=document.querySelector('#cr .px-echo');if(px){px.classList.add('fwglance');setTimeout(()=>px.classList.remove('fwglance'),1200)}talk(B('bondup_after_'+to),3600)}},2000)}done&&done()}})})}
function talk(t,ms){const b=$('#b');if(!b)return;let o=typeof t==='string'?{text:t}:t;if(o.expr)setExpr(o.expr);if(o.react)react(o.react);
  b.style.display='block';b.textContent=o.text;b.style.animation='none';void b.offsetWidth;b.style.animation='';say(o.text,o.expr);clearTimeout(talk.t);
  talk.t=setTimeout(()=>{if(b)b.style.display='none';if(o.expr&&S&&S.kind&&$('#cr'))setExpr(baseExpr())},ms||Math.max(3000,o.text.length*70))}
function baseExpr(){const m=mood();return m==='sleep'?'sleepy':m==='happy'?'happy':'neutral'}
function hop(){react('happy')}
function asleep(){if(S.napUntil>now()){toast('Shh… napping');return true}}
// two-tap reply choices (S9)
function choices(list,cb,opts){
  let sel=-1;opts=opts||{};ov.innerHTML=`<div class="choices">${list.map((c,i)=>`<button class="btn" data-i="${i}">${PI(c[0],c[2])}<span class="lbl">${c[1]}</span></button>`).join('')}<div class="hint">Tap to hear · tap again to choose</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;SFX('ui_tap');opts.onTap&&opts.onTap(i);if(sel===i){ov.innerHTML='';cb(i);return}sel=i;ov.querySelectorAll('button').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');say(list[i][1])});
}
function maybeChat(){
  const n=S.needs;
  if(fwCalm())return;
  if(sess.chats>=C.maxConversationsPerSession||Math.random()<.35)return;
  if(!sess.cb&&Math.random()<.3){const cb=callbackLine();if(cb){sess.cb=1;fwTick('memory');sess.chats++;return setTimeout(()=>{if(document.getElementById('feed')&&!document.querySelector('.full'))talk(cb)},1800)}}
  const conv=Dialogue.pickConversation('idle'); if(!conv)return; sess.chats++;
  setTimeout(()=>{if(!document.getElementById('feed')||document.querySelector('.full'))return;runConv(conv)},1800);
}
function initDialogue(){Dialogue.now=now;S.dlg=S.dlg||{};Dialogue.mem=S.dlg;Dialogue.cfg.carryOnMs=C.carryOnSeconds*1000;Dialogue.setPersona(S.g.seed);Dialogue.prune()}
function runConv(conv,done,depth){depth=depth||0;if(typeof conv==='string')conv=Dialogue.lib.conversations.find(c=>c.id===conv);if(!conv)return done&&done();
  Dialogue.run(conv,{cancelChoices:()=>{ov.innerHTML=''},tangent:()=>B('tangent'),tangentRate:0.10+0.20*Math.max(0,Math.min(1,((S.g.playful||.75)-.5)/.5)),say:(l,ms)=>talk(l,ms),choose:(list,cb,o)=>choices(list,cb,o),setVar:(k,v)=>{(S.vars=S.vars||{})[k]=v;save()},
    remember:(t,tag)=>remember(t,tag),bond:n=>addBond(n),react:k=>react(k),seen:id=>{(S.seen=S.seen||[]).push(id);save()}},(info)=>{addBond(C.bond.reply);save();
    // drift to a linked topic or lose the thought (Overhaul B7); session limit still applies
    const onHome=()=>document.getElementById('feed')&&!document.querySelector('.full');
    const nx=info&&info.carriedOn?null:Dialogue.afterConversation(conv,depth);
    if(nx&&nx.type==='lost'&&onHome()){talk(nx.line);sess.lost=(sess.lost||0)+1}
    else if(nx&&nx.type==='drift'&&sess.chats<C.maxConversationsPerSession&&onHome()){sess.chats++;sess.drift=(sess.drift||0)+1;talk(nx.line);
      return setTimeout(()=>{if(onHome())runConv(nx.conv,done,depth+1)},2600)}
    done&&done()},depth);
}
function feed(){
  if(asleep())return; const e=E();
  if(sess.feeds>=C.sessionLimits.feeds||S.needs.food>=95)return talk(B('full'));
  const pool=[...e.foods].sort(()=>Math.random()-.5).slice(0,2); if(!pool.includes(S.g.fav))pool[0]=S.g.fav; pool.push(e.neutral[0]); pool.sort(()=>Math.random()-.5);
  ov.innerHTML=`<div class="choices">${pool.map((f,i)=>`<button class="btn" data-i="${i}">${PI(f.split(' ')[0])}<span class="lbl">${f.split(' ').slice(1).join(' ')}</span></button>`).join('')}<div class="hint">Tap a food to feed</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{ov.innerHTML='';const f=pool[+b.dataset.i],fav=f===S.g.fav;sess.feeds++;
    S.needs.food=clamp(S.needs.food+(fav?C.restore.foodFav:C.restore.food));if(!S.foods.includes(f))S.foods.push(f);
    addBond(fav?C.bond.feedFav:C.bond.feed);SFX('care_feed_eat');hop();setExpr('eating');setTimeout(()=>talk(B(fav?'fed_fav':'fed')),fav?900:0);if(fav)fwTick('food');if(fav&&!(S.memTags||[]).includes('favfood'))remember(`You found my favorite food: ${f}`,'favfood');save();maybeChat()});
}
function comfort(){
  if(asleep())return; const e=E();
  choices([['✋','Pet',null],['🌙','Sit together',null]],i=>{
    if(i===0){pet();return}
    const sc=$('#sc');sc.style.filter='brightness(.75) saturate(1.2)';talk(B('sit'),C.sitSeconds*1000);ov.innerHTML='<div class="choices"><div class="hint">…sitting together…</div></div>';
    setTimeout(()=>{ov.innerHTML='';sc.style.filter='';S.needs.comfort=clamp(S.needs.comfort+C.restore.sit);addBond(C.bond.sit);S.sits=(S.sits||0)+1;fwTick('cozy');SFX('care_pet_sparkle');hop();maybeChat()},C.sitSeconds*1000);
  });
}
function pet(){if(asleep())return;SFX('care_pet_sparkle',{gap:400});S.needs.comfort=clamp(S.needs.comfort+C.restore.pet);addBond(C.bond.pet);hop();talk(B('pet'),1800)}
function rest(){
  const e=E(); if(sess.naps>=C.sessionLimits.naps)return talk(B('not_sleepy'));
  sess.naps++;const fav=S.badges.includes('place');S.needs.rest=clamp(S.needs.rest+(fav?C.restore.restFav:C.restore.rest));S.needs.play=clamp(S.needs.play);
  S.napUntil=now()+C.napSeconds*1000;S.scene=scHome().id;   // bedtime: the Echo goes home (scenes.md §6)
addBond(C.bond.nap);SFX('care_nap_tuck');save();talk(B('nap'));setTimeout(home,1500);
}
function how(){
  const p=document.querySelector('.panel');if(p)return p.remove();const n=S.needs;
  const seg=v=>Array.from({length:10},(_,i)=>`<i class="hs${v>i*10+5?' on':''}"></i>`).join('');
  const rows=[['food','feed','Food'],['play','play','Play'],['rest','sleep','Rest'],['comfort','pet','Hugs']];
  const d=document.createElement('div');d.className='panel howpanel';d.setAttribute('role','dialog');d.setAttribute('aria-label','How am I?');
  d.innerHTML=`<div class="ptitle">How am I?</div>`+rows.map(([k,ic,lb])=>`<div class="hrow">${window.PIXEL?PIXEL.icon(ic):''}<span class="hl">${lb}</span><span class="hbar">${seg(n[k])}</span></div>`).join('')+
   `<div class="hfoot">${window.PIXEL?PIXEL.icon('heart'):''}<span>Bond ${S.bond}/500</span></div><div class="hfoot"><span>Day ${S.days}</span></div><div class="hint2">Tap to close</div>`;
  SFX('ui_panel_open');app.appendChild(d);d.onclick=()=>{SFX('ui_back');d.remove()};
}
function dev(){
  const d=full(`<h1>Playtest tools</h1><p>For trying the whole arc quickly.</p><div class="row">
  <button class="btn" id="b1">+60 bond</button><button class="btn" id="b2">Jump to Ready</button><button class="btn" id="b3">New session</button><button class="btn" id="b7">+1 day</button><button class="btn" id="b9">Calm effects ${S.lowfx?'on':'off'}</button><button class="btn" id="b10">Short bond-ups ${S.shortBondUp?'on':'off'}</button><button class="btn" id="b11">Music ${S.music===false?'off':'on'}</button><button class="btn" id="b4">Sound ${S.voice?'on':'off'}</button><button class="btn" id="b5">Delete everything</button><button class="btn" id="b9">Pairs level: ${S.pairsLevel||'auto'}</button><button class="btn" id="b8">Fort level: ${S.fortLevel||'auto'}</button><button class="btn" id="b6">Close</button></div>`);
  const cl=()=>d.remove();
  d.querySelector('#b9').onclick=()=>{S.lowfx=!S.lowfx;save();cl();dev()};d.querySelector('#b10').onclick=()=>{S.shortBondUp=!S.shortBondUp;save();cl();dev()};
  d.querySelector('#b11').onclick=()=>{S.music=S.music===false;save();if(window.Music)Music.refresh();cl();dev()};
  d.querySelector('#b1').onclick=()=>{cl();addBond(60/C.demoSpeed);home()};
  d.querySelector('#b2').onclick=()=>{cl();addBond(500);S.met=Math.min(S.met||now(),now()-8*864e5);S.days=Math.max(S.days||1,6);sess.t0=now()-36e5;S.bondShown=Math.max(S.bondShown||1,4);home()};
  d.querySelector('#b3').onclick=()=>{cl();sess={feeds:0,games:0,naps:0,chats:0};S.napUntil=0;S.last=now()-6*36e5;simulate();save();home(true)};
  d.querySelector('#b4').onclick=()=>{S.voice=!S.voice;save();if(window.Music)Music.refresh();cl()};
  d.querySelector('#b5').onclick=()=>{if(confirm('Delete the Echo, memories and keepsakes?')&&confirm('Really delete everything?')){window.__wiped=1;localStorage.removeItem(KEY);location.reload()}};
  d.querySelector('#b6').onclick=cl;
  d.querySelector('#b9').onclick=()=>{const L=['auto','easy','standard','bigkid'];S.pairsLevel=L[(L.indexOf(S.pairsLevel||'auto')+1)%4];save();d.querySelector('#b9').textContent='Pairs level: '+S.pairsLevel};
  d.querySelector('#b8').onclick=()=>{const L=['auto','easy','standard','bigkid'];S.fortLevel=L[(L.indexOf(S.fortLevel||'auto')+1)%4];save();d.querySelector('#b8').textContent='Fort level: '+S.fortLevel};
  d.querySelector('#b7').onclick=()=>{cl();S.clockOffset=(S.clockOffset||0)+864e5;sess={feeds:0,games:0,naps:0,chats:0};S.napUntil=0;simulate();save();home(true);toast('A day passes…')};
}
function book(){
  const e=E(),d=document.createElement('div');d.className='book';
  d.innerHTML=`<button class="btn small ico" style="float:right" id="x" aria-label="Close">${PI('✕')}</button><h1 style="margin:0">${PI('📖')} Memory Book</h1>${S.badges.includes('place')&&scUnlocked().length>1?`<button class="btn small" id="places">${PI('🌲')}<span class="lbl">Our places</span></button>`:''}
  <div class="bkportrait">${svg(S.kind,S.g,'happy')}</div><b>${S.g.name}</b> — ${e.name}, ${e.title}<br><small>Quirk: ${S.g.quirk} · ${S.days} day(s) together</small>
  ${S.keepsake?`<h2>Keepsakes</h2><span class="chip">${PI(S.keepsake.type==='glowleaf'?'🍂':'💫')}${S.keepsake.name}</span>`:''}
  <h2>Stickers</h2>${S.stickers.map(s=>`<span class="chip">${PI('🌟')}${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Talents</h2>${S.talents.map(s=>`<span class="chip">${PI('✨')}${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Foods discovered</h2>${S.foods.map(s=>`<span class="chip">${PI(s.split(' ')[0])}${s.split(' ').slice(1).join(' ')}${s===S.g.fav?PI('❤️'):''}</span>`).join('')||'<i>none yet</i>'}
  ${S.kind?`<h2>Our ${S.kind==='fox'?'treehouse fort':'tree hollow'}</h2><div class="fortbook">${fortProp()}<span>Homes built: ${fortState().homes}${fortState().decor?' · decorations: '+fortState().decor:''}</span></div>`:''}
  ${(S.bondMoments||[]).length?`<h2>${PI('✨')} Bond moments</h2>`+S.bondMoments.map((m,i)=>`<div class="chip bmom">Bond up! ${BondUp.NAMES[m.to]} · day ${m.day||1} <button class="btn small" data-replay="${i}">Replay</button></div>`).join(''):''}
  <h2>Treasures</h2>${S.treasures.map(s=>`<span class="chip">${PI('💎')}${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Things we figured out</h2>${S.memories.slice(-12).map(s=>`<div class="chip">${s}</div>`).join('')||'<i>none yet</i>'}
  ${S.checkins&&S.checkins.some(k=>k.delivered)?`<h2>${PI('🖼️')} Letters from the wild</h2>`+S.checkins.filter(k=>k.delivered).map((k,i)=>postcardHTML(k,i,true)).join(''):S.postcards&&S.postcards.length?'<h2>Letters from the wild</h2>'+S.postcards.map(p=>`<div class="postcard">${p}</div>`).join(''):''}`;
  SFX('ui_panel_open');SCR().appendChild(d);try{lvModal()}catch(e){}d.querySelector('#x').onclick=()=>{SFX('ui_back');d.remove();setTimeout(lvModal,50)};
  const pl=d.querySelector('#places');if(pl)pl.onclick=scPicker;
  d.querySelectorAll('[data-replay]').forEach(btn=>btn.onclick=()=>{const m=S.bondMoments[+btn.dataset.replay];d.remove();playBondUp(m.from,m.to,false)});
}

// ---------- mini-games (§6.3) ----------
function play(){
  if(asleep())return; if(sess.games>=C.sessionLimits.games)return talk(B('game_tired'));
  SFX('ui_panel_open');const start=g=>{sess.games++;S.needs.rest=clamp(S.needs.rest-5);g(0)};
  // Play picker (spec v0.3 §0; Night Sky cut): signature Pairs game (daily +3) + Builder on day 1, Trail at bond 70, Connect at bond 140
  const G=gamesFor();choices(G.map(x=>[x[0],x[1],null]),i=>start(G[i][2]));
}
let GT=0;   // game token: a pending next-round timer is dropped if the child left the game
function gamesFor(){const fox=S.kind==='fox',L=[[ '⭐',fox?'Shiny Pairs':'Starlight Pairs',memoryGame],[fox?'🏠':'🏡',fox?'Fort Builder':'Hollow Builder',fortBuilder]];
  if(S.bond>=C.unlock.trail)L.push([fox?'🍂':'✨',fox?'Leaf Trail':'Firefly Parade',trailGame]);
  if(S.bond>=C.unlock.connect&&window.connectGame)L.push([fox?'🫐':'🌙',fox?'Berry Connect':'Moonlight Connect',window.connectGame]);return L}
function gameShell(title){GT++;{const t=title.toLowerCase();curGame=/pairs/.test(t)?'pairs':/builder|hollow|fort/.test(t)?'builder':/trail|parade/.test(t)?'trail':'connect';(S.gameCounts=S.gameCounts||{})[curGame]=(S.gameCounts[curGame]||0)+1}if(window.Music){const t=title.toLowerCase(),fox=S.kind==='fox';Music.game(/pairs/.test(t)?(fox?'shiny_pairs':'starlight_pairs'):/builder/.test(t)?(fox?'fort_builder':'hollow_builder'):/trail|parade/.test(t)?(fox?'leaf_trail':'firefly_parade'):(fox?'berry_connect':'moonlight_connect'))}const _t=document.getElementById('toast');if(_t)_t.classList.remove('on');h(`<div class="top"><b>${title}</b><button class="btn small" id="quit">Done</button></div><div class="scene ${E().bg}" id="gs"><div class="bubble" id="b" style="top:3%"></div></div>`);$('#quit').onclick=()=>{endGame(false)}}
let curGame=null;
function endGame(finished){GT++;if(finished)fwTick(null,curGame);if(sess.afterOneMore){sess.afterOneMore=0;save();home();return setTimeout(()=>{talk(B('after_one_more'),2600);setTimeout(fwTimeToGo,2700)},500)}if(finished){S.needs.play=clamp(S.needs.play+C.restore.playFinish)}save();home();if(finished)talk(B('game_end'));maybeChat()}
function roundDone(round,next){S.needs.play=clamp(S.needs.play+C.restore.play);addBond(C.bond.round,true);
  // signature-only daily bonus (spec §0/§4): first signature round of the day
  if(next&&next.signature&&S.sigDay!==new Date(now()).toDateString()){S.sigDay=new Date(now()).toDateString();addBond(C.bond.signatureDaily,true)}
  const t=GT;if(round>=2)setTimeout(()=>{if(t===GT)endGame(true)},2200);else setTimeout(()=>{if(t===GT)next(round+1)},2200)}

// ---------- Fort Builder (game spec v0.2 §3): falling blocks that build the treehouse fort ----------
function fortState(){return S.fort=S.fort||{stage:0,decor:0,homes:0,rounds:0,slow:0,best:0}}
function fortLevel(){const f=fortState(),set=S.fortLevel||'auto';
  if(f.rounds<2)return 'easy';                 // the first 2 rounds ever are forced to Easy
  if(set!=='auto')return set;                  // grown-up toggle (dev tools)
  return f.slow>=2?'easy':'standard'}          // automatic Easy after 2 slow rounds; drops back after a quick one
function fortProp(){const f=fortState(),open=S.badges.includes('place')?'_open':'',fox=S.kind==='fox',b=fox?'fort':'hollow';
  const nm=f.stage>=3&&f.decor?`${b}_3_d${f.decor}`:`${b}_${f.stage}`;
  return `<div class="fortprop ${b}${open?' open':''}" aria-label="${fox?'Treehouse fort':'Tree hollow'}" style="background-image:url(px/${b}/${nm}${open}.png)"></div>`}
function fortBuilder(round){
  const f=fortState(),level=fortLevel(),hh=/[?&]board=hh/.test(location.search),t0=now();
  const fox=S.kind==='fox',DIR=fox?'fort':'hollow',HOME=fox?'treehouse fort':'tree hollow',quiet=!fox&&S.talents.includes('Silent Flight');
  const g=FortEngine.create({level,seed:(S.g.seed||1)*31+f.rounds*7+round,w:hh?5:8,h:hh?6:12,disguise:fox&&S.talents.includes('Master of Disguise'),round});
  const W=g.w*16,H=g.h*16,lvlName={easy:'Easy',standard:'',bigkid:'Big-kid'}[level];
  gameShell(`${fox?'Fort':'Hollow'} · floor ${round+1}/3`);const gs=$('#gs');gs.classList.add('fortgame');
  gs.insertAdjacentHTML('beforeend',`<canvas id="fb" class="fb" width="${W}" height="${H}" style="width:${W}px;height:${H}px" aria-label="Fort board"></canvas>
    <div class="fbside"><div class="fbnext"><span>next</span><canvas id="fbn" width="32" height="32"></canvas></div>
      <div class="fbrows" id="fbrows"></div>${lvlName?`<div class="fblvl">${lvlName}</div>`:''}<div class="fbstars" id="fbstars"></div></div>
    <div class="fbecho creature" id="cr">${svg(S.kind,S.g,'happy')}</div>
    <canvas id="fbs" class="fbstrip" width="${W}" height="24" style="width:${W}px" aria-label="Home so far"></canvas>
    <div class="fbpad"><button class="btn" id="kL" aria-label="Left">◀</button><button class="btn" id="kR" aria-label="Right">▶</button><button class="btn" id="kA" aria-label="Turn"><b>A</b>turn</button><button class="btn" id="kB" aria-label="Drop"><b>B</b>drop</button></div>`);
  const cv=$('#fb'),cx=cv.getContext('2d'),nx=$('#fbn').getContext('2d'),sx=$('#fbs').getContext('2d');
  const IM={};['plank','window','leafroof','door','lantern','flag','slyte'].forEach(k=>{IM[k]=new Image();IM[k].src=`px/${DIR}/b_${k}.png`;IM['m_'+k]=new Image();IM['m_'+k].src=`px/${DIR}/m_${k==='slyte'?'plank':k}.png`});
  IM.ghost=new Image();IM.ghost.src='px/fort/ghost.png';[0,1,2].forEach(i=>{IM['glow'+i]=new Image();IM['glow'+i].src=`px/fort/glow${i}.png`});
  let glowRows=0,glowT=0,alive=true,rowsSaid=0;
  function draw(){if(!alive)return;cx.fillStyle='#2E2452';cx.fillRect(0,0,W,H);cx.fillStyle='#3B2A5C';
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if((x+y)%2)cx.fillRect(x*16,y*16,16,16);
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){const c=g.grid[y][x];if(c)cx.drawImage(IM[c],x*16,y*16)}
    const p=g.piece;if(p){const gy=FortEngine.ghostY(g);if(gy!==p.y)p.cells.forEach(([a,b])=>cx.drawImage(IM.ghost,(p.x+a)*16,(gy+b)*16));
      p.cells.forEach(([a,b],i)=>{if(p.y+b>=0)cx.drawImage(IM[p.mats[i]],(p.x+a)*16,(p.y+b)*16)})}
    nx.clearRect(0,0,32,32);const q=g.next;if(q){const s=q.cells.length>3||Math.max(...q.cells.map(c=>c[0]))>1?8:16;q.cells.forEach(([a,b],i)=>nx.drawImage(IM[q.mats[i]],a*s,b*s,s,s))}
    sx.fillStyle='#1f1838';sx.fillRect(0,0,W,24);const rows=g.strip.slice(-3);
    rows.forEach((r,j)=>r.forEach((c,x)=>sx.drawImage(IM['m_'+(c==='slyte'?'plank':c)],x*8+(W-g.w*8)/2,24-8*(rows.length-j))));
    if(glowRows>0){sx.drawImage(IM['glow'+(glowT%3)],0,24-8*Math.min(3,glowRows),W,8*Math.min(3,glowRows));glowT++;if(glowT>8){glowRows=0;glowT=0}}
    $('#fbrows').innerHTML=Array.from({length:g.goal},(_,i)=>`<i class="${i<g.rows?'on':''}"></i>`).join('');
    if(g.L.stars)$('#fbstars').innerHTML=Array.from({length:3},(_,i)=>window.PIXEL?PIXEL.icon(i<FortEngine.stars(g)?'sticker':'talk').replace('class="pxi"',`class="pxi${i<FortEngine.stars(g)?'':' dim'}"`):'').join('');}
  const loop=setInterval(draw,83);   // 12 fps
  const fall=g.L.fallMs?setInterval(()=>{FortEngine.tick(g);after()},g.L.fallMs):0; // Easy: the piece hovers until B
  function stop(){alive=false;clearInterval(loop);if(fall)clearInterval(fall);document.removeEventListener('keydown',key)}
  function after(){for(const e of FortEngine.take(g)){
      if(e.type==='settle'&&!quiet)SFX('blocks_land',{vol:.6});if(e.type==='floor')SFX('blocks_floor_done');if(e.type==='row'||e.type==='row-auto'){SFX('blocks_row_glow');glowRows=Math.min(3,(glowRows||0)+1);glowT=0;react('happy');rowsSaid++;if(rowsSaid%2===1)talk(B('stack_row'),1800);chirp()}
      if(e.type==='high'){talk(B('stack_high'),1800)}
      if(e.type==='disguise'){react('excited');talk(B('stack_disguise'),2000)}}
    if(g.done&&alive)finish();draw()}
  function chirp(){try{window.Chirp&&Chirp.play('*',S.kind)}catch(e){}}
  function finish(){draw();stop();const secs=(now()-t0)/1000;f.rounds++;
    if(level!=='bigkid'){if(secs>60)f.slow++;else if(secs<35&&f.slow)f.slow=0}
    if(S.talents.includes('Super Jumper'))react('happy');
    if(round<2){banner(`Floor ${round+1} done!`,'');talk(B('stack_floor'),2000);roundDone(round,fortBuilder);save();return}
    // round 3: Slyte places the roof itself and hops; the Home prop grows one step (frame -> 1 -> 2 floors -> roof, then decorations)
    sx.fillStyle='#1f1838';sx.fillRect(0,0,W,24);for(let x=0;x<g.w;x++)sx.drawImage(IM.m_leafroof,x*8+(W-g.w*8)/2,16);
    setExpr('happy');react('happy');talk(B('stack_done'),2200);
    const roofBefore=f.stage>=3;if(f.stage<3)f.stage++;else f.decor=Math.min(3,f.decor+1);
    if(f.stage>=3&&!roofBefore){f.homes++;remember(fox?'We built the fort three floors high':'We made the tree hollow cozy, three floors high','fort_home')}
    else remember(f.stage<3?`We built floor ${f.stage} of the ${HOME}`:`We added a decoration to the ${HOME}`,'fort_'+f.stage+'_'+f.decor);
    if(f.stage>=3)(S.homesBuilt=S.homesBuilt||[]).push({day:S.days,decor:f.decor});
    banner(f.stage>=3&&!roofBefore?(fox?'Fort built!':'Hollow built!'):roofBefore?'New decoration!':`${fox?'Fort':'Hollow'} floor ${f.stage} built!`,fortProp());
    save();roundDone(round,fortBuilder);lullaby()}
  function banner(t,img){gs.insertAdjacentHTML('beforeend',`<div class="fbdone">${PI('✨')}<span>${t}</span>${PI('✨')}${img?`<div class="fbdprop">${img}</div>`:''}${g.L.stars?`<div>${Array.from({length:FortEngine.stars(g)},()=>PI('🌟')).join('')}</div>`:''}</div>`)}
  // touch: drag the piece sideways, tap it to turn, swipe down to drop
  let pd=null;cv.addEventListener('pointerdown',e=>{const r=cv.getBoundingClientRect(),k=r.width/W;pd={x:e.clientX,y:e.clientY,t:Date.now(),k,r,moved:false,off:g.piece?Math.floor((e.clientX-r.left)/k/16)-g.piece.x:0};cv.setPointerCapture&&cv.setPointerCapture(e.pointerId)});
  cv.addEventListener('pointermove',e=>{if(!pd||!g.piece)return;const col=Math.floor((e.clientX-pd.r.left)/pd.k/16)-pd.off;if(Math.abs(e.clientX-pd.x)>pd.k*6)pd.moved=true;if(col!==g.piece.x){FortEngine.moveTo(g,col);draw()}});
  cv.addEventListener('pointerup',e=>{if(!pd)return;const dy=(e.clientY-pd.y)/pd.k,dt=Date.now()-pd.t;if(dy>36&&dt<600){FortEngine.drop(g);after()}else if(!pd.moved&&Math.abs(dy)<8){FortEngine.rotate(g);draw()}pd=null});
  $('#kL').onclick=()=>{if(FortEngine.move(g,-1)&&!quiet)SFX('blocks_move',{vol:.5});draw()};$('#kR').onclick=()=>{if(FortEngine.move(g,1)&&!quiet)SFX('blocks_move',{vol:.5});draw()};$('#kA').onclick=()=>{if(FortEngine.rotate(g)&&!quiet)SFX('blocks_rotate',{vol:.6});draw()};$('#kB').onclick=()=>{FortEngine.drop(g);after()};
  // handheld scheme (spec §0, confirmed): ◀ ▶ move, A turn, B drop (hold = faster fall)
  function key(e){const k=e.key.toLowerCase();if(!document.getElementById('fb')){stop();return}
    if(k==='arrowleft'){FortEngine.move(g,-1)}else if(k==='arrowright'){FortEngine.move(g,1)}
    else if(k==='a'||k==='z'||k==='arrowup'||k===' '){FortEngine.rotate(g)}
    else if(k==='b'||k==='x'||k==='enter'){if(e.repeat){FortEngine.soft(g)}else FortEngine.drop(g)}
    else if(k==='arrowdown'){FortEngine.soft(g)}else return;e.preventDefault();after()}
  document.addEventListener('keydown',key);
  $('#quit').onclick=()=>{stop();endGame(false)};
  window.__fort=g;window.__fortAfter=after;
  talk(round===0?B('stack_start'):B('stack_floor_next'),2400);draw();
}
// ---------- Shiny Pairs (Memory card game, game spec v0.3 §1): Slyte's signature game, replaces Shiny Search ----------
const PAIR_NAMES={star:'stars',moon:'moons',leaf_green:'green leaves',comet:'comets',feather:'feathers',dewdrop:'dewdrops',firefly:'fireflies',lantern:'lanterns',cloud:'clouds',book:'books',whimber_token:'Whimbers',blackberry:'blackberries',honey_cake:'honey cakes',trinket:'shiny trinkets',leaf:'leaves',nut:'nuts',apple:'apples',daisy:'daisies',pinecone:'pinecones',mushroom:'mushrooms',ball:'balls',slyte_token:'Slytes'};
function pairsState(){return S.pairs=S.pairs||{games:0,slow:0,boards:0}}
function pairsLevel(){const p=pairsState(),set=S.pairsLevel||'auto';if(p.games===0)return 'easy';if(set!=='auto')return set;return p.slow>=2?'easy':'standard'}
function memoryGame(){
  const fox=S.kind==='fox',SP=fox?'slyte':'whimber',TITLE=fox?'Shiny Pairs':'Starlight Pairs',NEXT=MEM_NEXT;
  const p=pairsState(),level=pairsLevel(),g=MemoryEngine.create({species:SP,level,seed:(S.g.seed||1)*17+p.games*13+1,disguise:fox&&S.talents.includes('Master of Disguise')});
  const total=g.L.pairs,img=it=>`px/mem/${SP}_${it}`;let nightVision=!fox&&S.talents.includes('Night Vision');let misses=0,pairsSaid=0,alive=true,kbd=false,backT=null;
  gameShell(`${TITLE} · 0/${total}`);const gs=$('#gs');gs.classList.add('memgame');$('#toast').classList.remove('on');
  gs.insertAdjacentHTML('beforeend',`<div class="memgrid c${g.cols}" id="mg" role="grid" aria-label="Cards">${g.cards.map((c,i)=>`<button class="mcardbtn" data-i="${i}" aria-label="Card ${i+1}"></button>`).join('')}</div>
    <div class="memecho creature" id="cr">${svg(S.kind,S.g,'happy')}</div><div class="memside"><span id="mcount">0/${total}</span><div id="mstars"></div>${level==='standard'?'':`<div class="fblvl">${level==='easy'?'Easy':'Big-kid'}</div>`}</div>`);
  const B_=[...gs.querySelectorAll('.mcardbtn')];
  function face(i){const c=g.cards[i],el=B_[i];el.style.backgroundImage=`url(${c.up||c.paired?img(c.item)+(c.paired?'_glow':''):img('back')}.png)`;el.classList.toggle('paired',c.paired);el.classList.toggle('cur',g.cursor===i&&kbd);
    el.setAttribute('aria-label',c.up||c.paired?(PAIR_NAMES[c.item]||c.item):'Face-down card')}
  function flipAnim(i){const el=B_[i],c=g.cards[i];el.style.backgroundImage=`url(${img('flip_back')}.png)`;setTimeout(()=>{el.style.backgroundImage=`url(${img(c.item)}_flip.png)`;setTimeout(()=>face(i),83)},83)}
  const all=()=>B_.forEach((_,i)=>face(i));all();
  function tap(i){if(!alive)return;MemoryEngine.flip(g,i);handle()}
  function handle(){for(const e of MemoryEngine.take(g)){
    if(e.type==='flip'){SFX('memory_card_flip',{gap:20,vol:fox?.7:.45,rate:fox?1:.85});flipAnim(e.i);if(g.cards[e.i].item==='slyte_token'){react('excited');talk(B('pairs_disguise'),1800)}
      // Night Vision (spec v0.3 §1): the partner of the first flipped card shimmers faintly once (once per board, default)
      if(nightVision&&g.open.length===1){nightVision=false;const pi=MemoryEngine.partner(g,e.i);if(pi>=0){SFX('whimber_night_vision_glint',{vol:.5});B_[pi].classList.add('shimmer');setTimeout(()=>B_[pi].classList.remove('shimmer'),1200)}}}
    if(e.type==='back'){clearTimeout(backT);SFX('memory_card_flip',{gap:20,vol:.4,rate:.8});e.cards.forEach(i=>face(i))}
    if(e.type==='pair'){SFX('memory_pair_found');react('happy');pairsSaid++;setTimeout(()=>{face(e.a);face(e.b)},200);
      if(pairsSaid%2===0)talk(Math.random()<.5?(S.kind==='fox'?{text:`Two ${PAIR_NAMES[e.item]||e.item}!`,expr:'delighted'}:{text:`Two ${PAIR_NAMES[e.item]||e.item}… hoo.`,expr:'happy'}):B('pairs_pair'),1800);else say('*')}
    if(e.type==='miss'){misses++;react('curious');setExpr('curious');backT=setTimeout(()=>{if(alive){MemoryEngine.resolve(g);handle()}},2000);
      if(misses%3===0)talk(B('pairs_miss'),1800);
      // Radar Ears (moved here from Shiny Search, spec v0.3): the hint jingle plays from the side where the partner card lies
      if(S.talents.includes('Radar Ears')&&e.partnerOfFirst>=0){const col=e.partnerOfFirst%g.cols;SFX('slyte_radar_ears_twinkle',{pan:(col/(g.cols-1))*2-1,vol:.6})}
      // Super Radar Hearing (spec v0.4 §1, Whimber): after a miss, a soft B♭ chime from the side where the partner card lies
      if(S.kind!=='fox'&&S.talents.includes('Super Radar Hearing')&&e.partnerOfFirst>=0){const col=e.partnerOfFirst%g.cols;SFX('trail_pickup_1',{pan:(col/(g.cols-1))*2-1,vol:.5})}}
    if(e.type==='hint'){const el=B_[e.i];el.classList.remove('wiggle');void el.offsetWidth;el.classList.add('wiggle');react('curious');talk(B('pairs_hint'),1600)}
    if(e.type==='round'&&e.round<2){react('happy');roundDone(e.round,NEXT)}
    if(e.type==='done')finish()}
    $('#mcount').textContent=`${g.pairs}/${total}`;const tb=$('.top b');if(tb)tb.textContent=`${TITLE} · ${g.pairs}/${total}`;
    if(g.L.stars)$('#mstars').innerHTML=Array.from({length:MemoryEngine.stars(g)},()=>PI('🌟')).join('');}
  function finish(){alive=false;p.games++;p.boards++;if(level!=='bigkid'){if(MemoryEngine.slow(g))p.slow++;else p.slow=0}
    SFX('memory_all_cleared');setExpr('delighted');react('excited');talk(B('pairs_done'),2400);remember(`We found all ${total} pairs`,'pairs_'+total);save();
    gs.insertAdjacentHTML('beforeend',`<div class="fbdone memdone">${PI('✨')}<span>All ${total} pairs!</span>${PI('✨')}${g.L.stars?`<div>${Array.from({length:MemoryEngine.stars(g)},()=>PI('🌟')).join('')}</div>`:''}</div>`);
    setTimeout(()=>{roundDone(2,NEXT);lullaby()},600);document.removeEventListener('keydown',key)}
  B_.forEach((b,i)=>b.onclick=()=>{kbd=false;if(g.pending){MemoryEngine.resolve(g);handle();return}tap(i)});
  // handheld (◀ ▶ A B): ◀ ▶ reading order skipping paired cards, B jumps down a row, A flips; after a miss any button turns cards back
  function key(e){if(!document.getElementById('mg')){document.removeEventListener('keydown',key);return}const k=e.key.toLowerCase();
    const known=['arrowleft','arrowright','arrowdown','a','z',' ','enter','b','x'];if(!known.includes(k))return;e.preventDefault();kbd=true;
    if(g.pending){MemoryEngine.resolve(g);handle();all();return}
    if(k==='arrowleft')MemoryEngine.cursorMove(g,-1);else if(k==='arrowright')MemoryEngine.cursorMove(g,1);else if(k==='b'||k==='x'||k==='arrowdown')MemoryEngine.cursorDown(g);
    else tap(g.cursor);all()}
  document.addEventListener('keydown',key);
  $('#quit').onclick=()=>{alive=false;clearTimeout(backT);document.removeEventListener('keydown',key);endGame(false)};
  window.__mem=g;window.__memTap=i=>B_[i].click();
  talk(B('pairs_start'),2400);
}
const MEM_NEXT=Object.assign(()=>{},{signature:true}),MEM_PLAIN=()=>{};   // (Night Sky was cut: Starlight Pairs is now Whimber's signature too)
// Sweet-Dream Lullaby (spec v0.3 §1/§2): in the evening, a finished board/build ends with a yawn and leads into a nap
function lullaby(){if(S.kind==='fox'||!S.talents.includes('Sweet-Dream Lullaby')||!['evening','night'].includes(tod()))return;setExpr('sleepy');react('sleepy');setTimeout(()=>{try{if(!asleep())rest()}catch(e){}},2600)}   // one board spans the 3 rounds; roundDone() only books each round
// ---------- Sparkle trail (game spec v0.3 §3): Leaf Trail (Slyte) / Firefly Parade (Whimber), unlocks at bond 70 ----------
function trailState(){return S.trail=S.trail||{games:0}}
function trailLevel(){const t=trailState(),set=S.trailLevel||'auto';if(t.games===0)return 'easy';return set==='auto'?'standard':set}
function trailGame(){
  const fox=S.kind==='fox',SP=fox?'slyte':'whimber',ts=trailState(),level=trailLevel(),TITLE=fox?'Leaf Trail':'Firefly Parade';
  const silent=!fox&&S.talents.includes('Silent Flight'),nv=!fox&&S.talents.includes('Night Vision'),radar=fox&&S.talents.includes('Radar Ears');
  const g=TrailEngine.create({level,seed:(S.g.seed||1)*23+ts.games*5+1,jumper:fox&&S.talents.includes('Super Jumper')});
  const W=g.w*16,H=g.h*16,ms=g.L.ms*(silent?2:1),v=PIXEL.variant(S.g.seed,SP),stepMode=g.L.step;
  gameShell(`${TITLE} · 0/${g.goal}`);const gs=$('#gs');gs.classList.add('trailgame');if(nv)gs.classList.add('nv');
  gs.insertAdjacentHTML('beforeend',`<canvas id="tc" class="tc" width="${W}" height="${H}" style="width:${W}px;height:${H}px" aria-label="Trail board"></canvas>
    <div class="trside"><i class="pxi" style="background-image:url(px/trail/f_${SP}_0.png);background-size:32px 16px"></i><span id="tcount">0/${g.goal}</span><span id="textra"></span>${level==='standard'?'':`<span class="fblvl">${level==='easy'?'Easy':'Big-kid'}</span>`}</div>
    ${stepMode?'<div class="trhint">Hold to walk</div>':''}<div class="trecho creature" id="cr">${svg(S.kind,S.g,'happy')}</div>`);
  const cv=$('#tc'),cx=cv.getContext('2d'),IM={};const ld=(k,s)=>{IM[k]=new Image();IM[k].src=s};
  ld('tok',`px/trail/tok_${SP}_${v.pal}.png`);[0,1,2].forEach(i=>ld('f'+i,`px/trail/f_${SP}_${i}.png`));ld('rare',`px/trail/rare_${SP}.png`);ld('obs',`px/trail/obs_${SP}.png`);
  ld('ta',`px/trail/tile_${SP}_a.png`);ld('tb',`px/trail/tile_${SP}_b.png`);
  let t=0,alive=true,held=false,happyT=0,paused=false,pickups=0,finale=null;
  function draw(){if(!alive)return;t++;for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)cx.drawImage((x*7+y*3)%5?IM.ta:IM.tb,x*16,y*16);
    if(nv){cx.fillStyle='rgba(20,14,40,.55)';cx.fillRect(0,0,W,H)}
    g.obs.forEach(k=>{const [x,y]=k.split(',').map(Number);cx.drawImage(IM.obs,x*16,y*16)});
    const p=g.pickup;if(p&&!g.done){const im=p.rare?IM.rare:IM.f0;if(p.rare)cx.drawImage(im,p.x*16,p.y*16-(t>>2)%2);else cx.drawImage(im,((t>>2)%2)*16,0,16,16,p.x*16,p.y*16,16,16)}
    const F=TrailEngine.followers(g);
    F.forEach((q,i)=>{if(nv){cx.fillStyle='rgba(255,227,154,.35)';cx.fillRect(q.x*16-2,q.y*16-2,20,20)}cx.drawImage(IM['f'+(i%3)],(((t>>2)+i)%2)*16,0,16,16,q.x*16,q.y*16,16,16)});
    if(finale)finale();
    const fr=(happyT>0?2:0)+((t>>2)%2);if(happyT>0)happyT--;cx.save();const hx=g.head.x*16,hy=g.head.y*16;
    if(g.dir===3){cx.translate(hx+16,hy);cx.scale(-1,1);cx.drawImage(IM.tok,fr*16,0,16,16,0,0,16,16)}else cx.drawImage(IM.tok,fr*16,0,16,16,hx,hy,16,16);cx.restore()}
  const loop=setInterval(draw,83);
  const mover=setInterval(()=>{if(!alive||paused||g.done)return;if(stepMode&&!held)return;TrailEngine.step(g);after()},ms);
  function after(){for(const e of TrailEngine.take(g)){
      if(e.type==='pickup'&&e.rare)talk(B('trail_rare'),1500);
      if(e.type==='pickup'){pickups++;happyT=8;SFX(pickups%5===0?'trail_pickup_5':'trail_pickup_1',{vol:.6});if(pickups%4===0)talk(B('trail_pickup'),1500);else say('*')}
      if(e.type==='bump'){if(!silent)SFX('trail_bump_boop',{gap:400,vol:.5});if(Math.random()<.35)talk(B('trail_bump'),1500)}
      if(e.type==='hop')happyT=6;
      if(e.type==='spawn'&&radar)SFX('slyte_radar_ears_twinkle',{pan:(e.x/(g.w-1))*2-1,vol:.5,gap:300});   // Radar Ears: a twinkle from the side the next leaf is on
      if(e.type==='long')talk(B('trail_long'),1800);
      if(e.type==='round'&&e.round<2)roundDone(e.round,TR_NEXT);
      if(e.type==='done')finish()}
    $('#tcount').textContent=`${g.count}/${g.goal}`;$('#textra').textContent=TrailEngine.extra(g)?`+${TrailEngine.extra(g)}`:'';const tb=$('.top b');if(tb)tb.textContent=`${TITLE} · ${g.count}/${g.goal}`}
  function finish(){ts.games++;const F=TrailEngine.followers(g).slice(0,6);
    if(fox){finale=()=>{F.forEach((q,i)=>{cx.drawImage(IM['f'+(i%3)],0,0,16,16,g.head.x*16+((i*5)%9)-4,g.head.y*16+((i*3)%5)-2,16,16)})};remember(`We made a trail of ${g.goal} leaves and pounced in the pile`,'trail_'+g.goal)}
    else{finale=()=>{cx.fillStyle='#FFD27A';for(let i=1;i<F.length;i++){const a=F[i-1],b=F[i];const n=12;for(let k=0;k<=n;k+=2)cx.fillRect(Math.round(a.x*16+8+(b.x-a.x)*16*k/n),Math.round(a.y*16+8+(b.y-a.y)*16*k/n),1,1)}};
      remember('Our firefly parade made a little constellation','trail_parade')}
    const c=$('#cr');c.classList.add('show');setExpr('delighted');react('excited');talk(B('trail_done'),2400);save();
    gs.insertAdjacentHTML('beforeend',`<div class="fbdone">${PI('✨')}<span>${fox?'Leaf pile pounce!':'A little constellation!'}</span>${PI('✨')}</div>`);
    setTimeout(()=>{stop();roundDone(2,TR_NEXT)},1800)}
  function stop(){alive=false;clearInterval(loop);clearInterval(mover);document.removeEventListener('keydown',key);document.removeEventListener('keyup',keyup)}
  // phone: drag and the Echo follows the finger (easy: walks only while the finger is down)
  const cell=e=>{const r=cv.getBoundingClientRect(),k=r.width/W;return [Math.floor((e.clientX-r.left)/k/16),Math.floor((e.clientY-r.top)/k/16)]};
  cv.addEventListener('pointerdown',e=>{held=true;const [x,y]=cell(e);TrailEngine.steer(g,x,y);cv.setPointerCapture&&cv.setPointerCapture(e.pointerId)});
  cv.addEventListener('pointermove',e=>{if(!held)return;const [x,y]=cell(e);TrailEngine.steer(g,x,y)});
  ['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>held=false));
  // handheld (spec §3): ◀ ▶ turn left/right, A = little dash (easy: hold A to walk), B = pause
  function key(e){if(!document.getElementById('tc')){stop();return}const k=e.key.toLowerCase();
    if(k==='arrowleft')TrailEngine.turn(g,-1);else if(k==='arrowright')TrailEngine.turn(g,1);
    else if(k==='a'||k==='z'||k===' '){if(stepMode)held=true;else if(!e.repeat){TrailEngine.step(g,true);after()}}
    else if(k==='b'||k==='x'){paused=!paused;toast(paused?'Paused':'Go!')}else return;e.preventDefault()}
  function keyup(e){const k=e.key.toLowerCase();if(stepMode&&(k==='a'||k==='z'||k===' '))held=false}
  document.addEventListener('keydown',key);document.addEventListener('keyup',keyup);
  $('#quit').onclick=()=>{stop();endGame(false)};
  window.__trail=g;window.__trailAfter=after;window.__trailHold=v=>held=v;
  talk(B('trail_start'),2400);
}
const TR_NEXT=()=>{};   // one trail spans the 3 rounds (ends at 1/3, 2/3 and the goal)

// ---------- Connect (game spec v0.3 §4): Berry Connect (Slyte) / Moonlight Connect (Whimber), unlocks at bond 140 ----------
function conState(){return S.connect=S.connect||{games:0}}
function conLevel(){const c=conState(),set=S.connectLevel||'auto';if(c.games===0)return 'easy';return set==='auto'?'standard':set}
function connectGame(){
  const fox=S.kind==='fox',SP=fox?'slyte':'whimber',cs=conState(),level=conLevel(),TITLE=fox?'Berry Connect':'Moonlight Connect';
  const nv=!fox&&S.talents.includes('Night Vision'),jumper=fox&&S.talents.includes('Super Jumper'),lull=!fox&&S.talents.includes('Sweet-Dream Lullaby')&&['evening','night'].includes(tod());
  const g=ConnectEngine.create({species:SP,level,seed:(S.g.seed||1)*29+cs.games*3+1,shapes:fox&&S.talents.includes('Riddle Solver')});
  (S.vars=S.vars||{}).connect5=g.kinds.length>=5;   // gates the apple/firefly lines (trail_connect_barks.md §6.1)
  const Z=24,W=g.w*Z,H=g.h*Z,NAME={blackberry:'blackberries',honey_cake:'honey cakes',nut:'nuts',leaf:'leaves',apple:'apples',star:'stars',moon:'moons',dewdrop:'dewdrops',comet:'comets',firefly:'fireflies'};
  gameShell(`${TITLE} · round 1/3`);const gs=$('#gs');gs.classList.add('congame');if(!fox)gs.classList.add('night');
  gs.insertAdjacentHTML('beforeend',`<div class="cgoal" id="cgoal"></div><canvas id="cc" class="cc" width="${W}" height="${H}" style="width:${W}px;height:${H}px;left:${(180-W)/2}px" aria-label="Connect board"></canvas>
    <div class="conecho creature" id="cr">${svg(S.kind,S.g,'happy')}</div><div class="conside">${jumper?'<button class="btn small" id="hop">Hop!</button>':''}<span id="cstars"></span>${level==='standard'?'':`<span class="fblvl">${level==='easy'?'Easy':'Big-kid'}</span>`}</div>`);
  const cv=$('#cc'),cx=cv.getContext('2d'),IM={},ld=(k,s)=>{IM[k]=new Image();IM[k].src=s};
  [...g.kinds,g.fav].forEach(k=>ld(k,`px/connect/${k}.png`));ld('*','px/connect/sparkle.png');ld('ring','px/connect/favring.png');[0,1,2,3].forEach(i=>ld('b'+i,`px/connect/burst${i}.png`));
  let path=[],alive=true,t=0,burst=[],idle=0,hint=null,mode='pick',pickI=0,cursor=0,hopUsed=false;
  const GOLD=fox?'#FFD27A':'#FFF1C4';
  function goalBar(){$('#cgoal').innerHTML=`<span>Gather</span><i class="pxi" aria-label="${NAME[g.goal]||g.goal}" style="background-image:url(px/connect/${g.goal}.png)"></i><span>${g.got}/${g.L.goal}</span>`;
    const tb=$('.top b');if(tb)tb.textContent=`${TITLE} · round ${Math.min(3,g.round+1)}/3`;if(g.L.stars)$('#cstars').innerHTML=Array.from({length:ConnectEngine.stars(g)},()=>PI('🌟')).join('')}
  function cxy(i){return [(i%g.w)*Z,Math.floor(i/g.w)*Z]}
  function draw(){if(!alive)return;t++;idle+=83;
    for(let i=0;i<g.cells.length;i++){const [x,y]=cxy(i);cx.fillStyle=((i%g.w)+Math.floor(i/g.w))%2?(fox?'#C99A6A':'#3B2A5C'):(fox?'#B58457':'#2E2452');cx.fillRect(x,y,Z,Z)}
    const B_=ConnectEngine.bunches(g);
    if(nv&&B_[0]){cx.fillStyle='rgba(255,241,196,.22)';B_[0].cells.forEach(i=>{const [x,y]=cxy(i);cx.fillRect(x,y,Z,Z)})}           // Night Vision: the biggest bunch glows softly
    if(hint&&(t>>2)%2){cx.fillStyle='rgba(255,210,122,.35)';hint.forEach(i=>{const [x,y]=cxy(i);cx.fillRect(x,y,Z,Z)})}
    if(kbd&&mode==='pick'&&B_.length){const b=B_[pickI%B_.length];cx.strokeStyle='#FFD27A';cx.lineWidth=1;b.cells.forEach(i=>{const [x,y]=cxy(i);cx.strokeRect(x+.5,y+.5,Z-1,Z-1)})}
    if(kbd&&mode==='free'){const [x,y]=cxy(cursor);cx.strokeStyle=(t>>2)%2?'#FFD27A':'#FFFFFF';cx.strokeRect(x+1.5,y+1.5,Z-3,Z-3)}
    for(let i=0;i<g.cells.length;i++){const c=g.cells[i],[x,y]=cxy(i);if(!c)continue;const im=c==='*'?IM['*']:c==='!'?IM[g.fav]:IM[c];const lift=path.includes(i)?1:0;
      if(im)cx.drawImage(im,x+4,y+4-lift);if(c==='!')cx.drawImage(IM.ring,x+2,y+2)}
    // thread: 2px gold with an ink edge, through item centres
    if(path.length>1){for(const [w,col] of [[4,'#3B2A5C'],[2,GOLD]]){cx.strokeStyle=col;cx.lineWidth=w;cx.beginPath();path.forEach((i,j)=>{const [x,y]=cxy(i);j?cx.lineTo(x+12,y+12):cx.moveTo(x+12,y+12)});cx.stroke()}}
    burst=burst.filter(b=>{if(b.f<4){const [x,y]=cxy(b.i);cx.drawImage(IM['b'+b.f],x+4,y+4);b.f++;return true}return false});
    if(idle>(g.L.hintMs||1e9)&&!hint&&B_[0]){hint=B_[0].cells;react('curious');if(Math.random()<.5)talk(B('connect_hint'),1500)}}
  const loop=setInterval(draw,83);let kbd=false;
  function link(i){if(i==null||i<0)return;if(path.length>1&&path[path.length-2]===i){path.pop();return}if(ConnectEngine.canAdd(g,path,i)){path.push(i);SFX('ui_tap',{gap:30,vol:.35,rate:fox?1+path.length*.08:.8+path.length*.05})}}
  function letGo(){const p=path.slice();path=[];if(!ConnectEngine.gather(g,p)){return}idle=0;hint=null;after()}
  function after(){for(const e of ConnectEngine.take(g)){
      if(e.type==='gather'){e.cells.forEach(i=>burst.push({i,f:0}));SFX(e.big?'connect_big_group':'connect_group_3',{vol:.7});react('happy');if(e.big)talk(B('connect_big'),1800);else say('*')}
      if(e.type==='special'&&e.special==='!'){SFX('connect_special_trinket');setExpr('delighted');talk(B('connect_special'),2000)}
      if(e.type==='shape')toast('Shape goal! +2');
      if(e.type==='shuffle'){react('excited');talk(B('connect_shuffle'),1800)}
      if(e.type==='goal'&&e.round>0)talk(B('connect_round',{goal:NAME[e.kind]||e.kind}),1800);
      if(e.type==='round'&&e.round<2)roundDone(e.round,CN_NEXT);
      if(e.type==='done')finish()}
    goalBar()}
  function finish(){cs.games++;setExpr('delighted');react('excited');remember(fox?'We gathered big bunches of berries together':'We gathered moonlight together, bunch by bunch','connect_'+SP);save();
    gs.insertAdjacentHTML('beforeend',`<div class="fbdone">${PI('✨')}<span>All gathered!</span>${PI('✨')}${g.L.stars?`<div>${Array.from({length:ConnectEngine.stars(g)},()=>PI('🌟')).join('')}</div>`:''}</div>`);
    setTimeout(()=>{stop();roundDone(2,CN_NEXT);lullaby()},1600)}
  function stop(){alive=false;clearInterval(loop);document.removeEventListener('keydown',key)}
  // phone: drag through touching same items and lift to gather; tap mode: tap items one by one, tap the last again to gather
  const cellAt=e=>{const r=cv.getBoundingClientRect(),k=r.width/W,x=Math.floor((e.clientX-r.left)/k/Z),y=Math.floor((e.clientY-r.top)/k/Z);return x<0||y<0||x>=g.w||y>=g.h?-1:y*g.w+x};
  let down=null,moved=false;
  cv.addEventListener('pointerdown',e=>{kbd=false;idle=0;const i=cellAt(e);down=i;moved=false;if(path.length&&path[path.length-1]===i)return;if(path.length&&!ConnectEngine.canAdd(g,path,i))path=[];link(i);cv.setPointerCapture&&cv.setPointerCapture(e.pointerId)});
  cv.addEventListener('pointermove',e=>{if(down==null)return;const i=cellAt(e);if(i!==down&&i>=0){moved=true;down=i;link(i)}});
  cv.addEventListener('pointerup',e=>{const i=cellAt(e),was=down;down=null;
    if(moved){letGo();return}
    if(path.length&&path[path.length-1]===i&&(path.length>=3||g.cells[i]==='!')&&was===i&&path._tapped){letGo();return}
    path._tapped=true;if(path.length===1&&g.cells[i]!=='!')path._tapped=true});
  if(jumper)$('#hop').onclick=()=>{if(hopUsed)return;hopUsed=true;$('#hop').disabled=true;react('excited');ConnectEngine.reshuffle(g);after()};   // Super Jumper: once per round, a free reshuffle
  // handheld (spec §4): ◀ ▶ cycle bunches (biggest first), A gathers; B toggles free threading (◀ ▶ cursor, A link, B gather)
  function key(e){if(!document.getElementById('cc')){stop();return}const k=e.key.toLowerCase();const A=k==='a'||k==='z'||k===' '||k==='enter',Bk=k==='b'||k==='x';
    if(!['arrowleft','arrowright'].includes(k)&&!A&&!Bk)return;e.preventDefault();kbd=true;idle=0;const B_=ConnectEngine.bunches(g);
    if(mode==='pick'){if(k==='arrowright')pickI=(pickI+1)%Math.max(1,B_.length);else if(k==='arrowleft')pickI=(pickI-1+B_.length)%Math.max(1,B_.length);
      else if(A&&B_.length){ConnectEngine.gatherSet(g,B_[pickI%B_.length].cells);pickI=0;after()}else if(Bk){mode='free';path=[];toast('Free threading')}return}
    if(!path.length){if(k==='arrowright')cursor=(cursor+1)%g.cells.length;else if(k==='arrowleft')cursor=(cursor-1+g.cells.length)%g.cells.length;else if(A)link(cursor);else if(Bk){mode='pick';toast('Bunch picker')}return}
    const nb=g.cells.map((_,j)=>j).filter(j=>ConnectEngine.canAdd(g,path,j));
    if(k==='arrowright'||k==='arrowleft'){if(nb.length){const ci=nb.indexOf(cursor);cursor=nb[(ci+(k==='arrowright'?1:nb.length-1)+(ci<0?1:0))%nb.length]}}
    else if(A&&nb.includes(cursor))link(cursor);else if(Bk){if(ConnectEngine.valid(g,path))letGo();else path=[]}}
  document.addEventListener('keydown',key);
  $('#quit').onclick=()=>{stop();endGame(false)};
  window.__con=g;window.__conAfter=after;window.__conGather=p=>{path=[];if(ConnectEngine.gather(g,p))after()};
  goalBar();talk(B('connect_start'),2400);
}
const CN_NEXT=()=>{};   // one board, a new goal item each round; roundDone() books each round
window.connectGame=connectGame;

// ---------- Farewell arc (echo/farewell/farewell_arc.md v0.2, Cole's defaults) ----------
// active -> almost_ready (Ready rule, spec §5.7) -> [grace: 3 session-days] -> walking -> ceremony (C0-C10, step saved) -> released
const FWC=()=>Object.assign({glanceFromBond:140,restlessBond:440,readyBond:500,readyDays:7,readySessionDays:6,altDay:14,altBond:350,almostMin:2,almostMax:3,
  graceDays:C.graceDays||3,longAbsenceDays:14,calmAfterMs:60000,lineMs:0,thanksWindowMs:5000},C.farewell||{});
function fw(){return S.fw=S.fw||{state:'active',almostDays:[],graceDays:[],list:[],step:null}}
function fwToday(){return new Date(now()).toDateString()}
function fwReady(){const c=FWC(),d=(now()-(S.met||now()))/864e5;if(fw().grandfather&&S.bond>=c.readyBond)return true;
  return (S.bond>=c.readyBond&&d>=c.readyDays&&(S.days||1)>=c.readySessionDays)||(d>=c.altDay&&S.bond>=c.altBond)}
function fwShowPath(){return ['almost_ready','grace','walking'].includes(fw().state)}
function fwLib(k){return (Dialogue.lib&&Dialogue.lib.barks[k])||[]}
function fwUI(k,i){const l=fwLib(k)[i||0];return l?Dialogue.fill(l.text):''}
function fwLine(k,i,extra){const l=fwLib(k)[i];return l?{text:Dialogue.fill(l.text,extra),expr:l.expr||'happy',react:l.react}:B(k,extra)}
function fwPickDone(k){const L=fwLib(k),done=fw().list.length&&fw().list.every(x=>x.done);const i=L.findIndex(l=>done?!!l.cond:!l.cond);return fwLine(k,Math.max(0,i))}
// migrate saves from the old release flow (wall-clock grace, bond-only Ready, a half-done walk)
function fwMigrate(){if(!S||!S.kind||S.released||S.fw)return;const f=fw();
  if(S.graceUntil){const start=S.graceUntil-(C.graceDays||3)*864e5,used=Math.max(0,Math.min(FWC().graceDays,Math.floor((now()-start)/864e5)));
    f.state='grace';f.askedDay='migrated';f.graceDays=Array.from({length:used},(_,i)=>'migrated-'+i);f.list=fwBuildList();delete S.graceUntil}
  else if(S.releasePath){f.state='walking';f.list=fwBuildList();S.releasePath=null}
  else if(S.badges.includes('ready'))f.grandfather=1;   // already Ready under the old rule: the almost-ready news plays at the next calm moment
  save()}
// session-days: called once per new session (home(true))
function fwSession(){const f=fw(),t=fwToday();
  if(f.state==='almost_ready'&&!f.almostDays.includes(t))f.almostDays.push(t);
  if(f.state==='grace'&&t!==f.askedDay&&!f.graceDays.includes(t)){f.graceDays.push(t);if(f.graceDays.length>FWC().graceDays){f.state='walking';f.walkDay=t}}
  save()}
function fwGreet(){const f=fw(),t=fwToday();
  if(f.state==='almost_ready'){talk(B('almost_hello'));return true}
  if(f.state==='grace'){if(f.graceDays.length===FWC().graceDays&&f.lastDay!==t){f.lastDay=t;save();talk(B('last_day'))}else talk(B('grace_hello'));return true}
  return false}
function fwBuildList(){const fox=S.kind==='fox',gc=S.gameCounts||{};const top=Object.keys(gc).sort((a,b)=>gc[b]-gc[a])[0]||'pairs';
  const GN={pairs:fox?'Shiny Pairs':'Starlight Pairs',builder:fox?'Fort Builder':'Hollow Builder',trail:fox?'Leaf Trail':'Firefly Parade',connect:fox?'Berry Connect':'Moonlight Connect'};
  (S.vars=S.vars||{}).listGame=GN[top];const cb=Object.values(S.cbCount||{}).reduce((a,b)=>a+b,0);
  return [{id:top==='builder'?'place':top==='trail'?'trail':'play',game:top,done:false},{id:'food',done:false},{id:(S.sits||0)>cb?'cozy':'memory',done:false}]}
const FW_ITEM={play:0,food:1,place:2,trail:3,memory:4,cozy:5};
function fwTick(id,game){const f=fw();if(!fwShowPath())return;const it=f.list.find(x=>x.id===id||(game&&x.game===game&&['play','place','trail'].includes(x.id)));if(!it||it.done)return;
  it.done=true;save();const all=f.list.every(x=>x.done);
  setTimeout(()=>{if(document.getElementById('feed'))talk(B(all?'list_complete':'list_'+it.id+'_done'),3200)},1600)}
function fwListIcon(it){return it.id==='food'?PI(S.g.fav.split(' ')[0]):PI({play:'🎲',place:'🏡',trail:'🍃',memory:'📖',cozy:'🌙'}[it.id])}
function fwList(){const f=fw(),fox=S.kind==='fox';
  const d=full(`<div class="mcard fwlist"><div class="mtop">${PI('📜')}<span class="mt">${fwUI('ui_list_title')}</span></div>
    ${f.list.map(it=>`<div class="fwrow${it.done?' done':''}">${fwListIcon(it)}<span>${fwUI('ui_list_items',FW_ITEM[it.id])}</span>${it.done?`<i class="fwstamp" style="background-image:url(px/i_stamp_${fox?'paw':'feather'}.png)"></i>`:''}</div>`).join('')}
    <p class="mline">${B('list_nudge').text}</p><button class="btn" id="fwx">Okay!</button></div>`);d.style.zIndex=95;d.classList.add('milestone');
  d.querySelector('#fwx').onclick=()=>d.remove();return d}
function fwStarLevel(){const s=S.bondShown||PIXEL.stageFromBond(S.bond);return s>=5?3:s>=4?2:s>=3?1:0}
function fwStarXY(){return S.kind==='fox'?[118,108]:[104,105]}   // Slyte: low over the meadow's edge; Whimber: its star low over the far trees (phone (104,162) bg)
function fwStarHTML(lvl,id){if(!lvl)return '';const [x,y]=fwStarXY();return `<button class="fwstar l${lvl}" id="${id||'fwstar'}" aria-label="${S.g.name}'s home star" style="left:${x-6}px;top:${y-6}px;background-image:url(px/fw/star_${lvl}.png)"></button>`}
function fwTrailHTML(n){if(S.kind==='fox')return '';const [sx,sy]=fwStarXY(),ax=58,ay=150;let o='';
  for(let i=1;i<=Math.min(6,n);i++){const t=i/7,x=Math.round(ax+(sx-ax)*t),y=Math.round(ay+(sy-ay)*t-18*Math.sin(Math.PI*t));o+=`<i class="fwtr" style="left:${x-1}px;top:${y-1}px"></i>`}return o}
function fwHomeBits(){   // home star + path / star trail for the Home scene
  const f=fw(),outdoor=!(S.kind!=='fox'&&curScene().id==='library');let h='';
  if(outdoor)h+=fwStarHTML(fwStarLevel());
  if(fwShowPath()){const n=f.state==='almost_ready'?Math.max(1,f.almostDays.length):f.state==='grace'?3+f.graceDays.length:6;
    if(S.kind==='fox')h+=`<button class="pxpath" id="path" aria-label="Glowing path" style="background-image:url(px/path_${Math.min(3,n)}.png)"></button>`;
    else if(outdoor)h+=`<div class="fwtrail">${fwTrailHTML(n*(f.state==='almost_ready'?1:2))}</div>`}
  return h}
// calm moments (after a care action): the almost-ready news, the ask, the Echo-led walking / flying day
function fwCalm(){const f=fw(),c=FWC(),n=S.needs;sess.t0=sess.t0||now();
  if(sess.welcomeBack||sess.fwBusy||!document.getElementById('feed')||document.querySelector('.full,.book,.bondup'))return false;
  if(Math.min(n.food,n.play,n.rest,n.comfort)<40||now()-sess.t0<c.calmAfterMs||tod()==='night'||(S.napUntil||0)>now())return false;
  if(f.state==='active'&&fwReady()){if(bondTarget()>(S.bondShown||1))return false;   // bond-up 5 plays first (on Home)
    sess.fwBusy=1;f.state='almost_ready';f.readyAt=now();f.almostDays=[fwToday()];f.list=fwBuildList();if(!S.badges.includes('ready'))S.badges.push('ready');S.stickers.push('Ready for the wild');save();
    setTimeout(()=>runConv(S.kind==='fox'?'slyte_almost_ready':'whimber_almost_ready',()=>{sess.fwBusy=0;home();setTimeout(fwList,300)}),1200);return true}
  if(f.state==='almost_ready'&&!sess.asked){const k=f.almostDays.length,done=f.list.filter(x=>x.done).length;
    if(k>=c.almostMax||(k>=c.almostMin&&done>=2)){sess.asked=1;setTimeout(()=>fwAsk(),1200);return true}}
  if(f.state==='walking'&&!sess.walkOffered){sess.walkOffered=1;setTimeout(()=>fwTimeToGo(),1200);return true}
  return false}
function fwAsk(){if(!document.getElementById('feed'))return;const f=fw();f.askedAt=now();save();talk(fwPickDone('ask_ready'),600000);
  choices([['🌲',fwUI('ui_choice_ask',0),null],['🤗',fwUI('ui_choice_ask',1),null]],i=>{
    if(i===0)return fwCeremony('echo_asked_go');
    f.state='grace';f.askedDay=fwToday();f.graceDays=[];f.answer='not_yet';save();talk(B('stay_more'))})}
function fwTimeToGo(){if(!document.getElementById('feed'))return;const f=fw();talk(B('time_to_go'),600000);
  const opts=[['🌲',fwUI('ui_choice_time',0),null],['🤗',fwUI('ui_choice_time',1),null]];if(f.oneMoreGameUsed!==fwToday())opts.push(['🎲',fwUI('ui_choice_time',2),null]);
  choices(opts,i=>{if(i===0)return fwCeremony('grace_ended');
    if(i===1){hop();talk(B('hug_more'),2600);return setTimeout(fwTimeToGo,2700)}
    f.oneMoreGameUsed=fwToday();sess.afterOneMore=1;save();talk(B('one_more_game'),2400);setTimeout(play,1200)})}
function fwStartByChild(){const f=fw();
  if(f.state==='almost_ready'&&f.almostDays.length<=1&&!sess.tapEarly){sess.tapEarly=1;talk(B('path_tap_early'),3000)}
  setTimeout(()=>choices([['🌲',fwUI('ui_choice_ask',0),null],['🤗',fwUI('ui_choice_ask',1),null]],i=>{if(i===0)fwCeremony('child')}),sess.tapEarly===1?1500:0);if(sess.tapEarly===1)sess.tapEarly=2}
// ---- the ceremony: Slyte walks to the meadow's edge; Whimber sits on the twilight branch, then flies as light to its star ----
function fwSay(l){return new Promise(res=>{if(!$('#b'))return res();if(typeof l==='string')l={text:l};talk(l,600000);const ms=FWC().lineMs||Math.max(2600,l.text.length*62);
  const sc=$('#sc');let done=false;const fin=()=>{if(done)return;done=true;clearTimeout(t);sc&&sc.removeEventListener('click',fin);res()};const t=setTimeout(fin,ms);setTimeout(()=>sc&&sc.addEventListener('click',fin),350)})}
function fwChoose(list){return new Promise(res=>choices(list.map(x=>[x[0],x[1],null]),res))}
const fwWait=ms=>new Promise(r=>setTimeout(r,ms));
function fwBg(id,v){const sc=$('#sc');if(sc)sc.style.background=`url(px/scenes/${id}_${v}.png) center bottom/180px 320px no-repeat`}
function fwMoveTo(x,y,ms){const c=$('#cr');if(!c)return fwWait(0);return new Promise(res=>{const L0=parseFloat(c.style.left)||90,B0=parseFloat(c.style.bottom)||64,n=Math.max(1,Math.round(ms/83));let i=0;
  const t=setInterval(()=>{i++;const k=i/n;c.style.left=Math.round(L0+(x-L0)*k)+'px';c.style.bottom=Math.round(B0+(y-B0)*k)+'px';if(i>=n){clearInterval(t);res()}},83)})}
function fwSparkles(){const sc=$('#sc'),c=$('#cr .px-echo');if(!sc||!c)return;const R=sc.getBoundingClientRect(),z=R.width/180||1,r=c.getBoundingClientRect(),[sx,sy]=fwStarXY();
  const x0=(r.left-R.left)/z+24,y0=(r.top-R.top)/z+20,n=lowFx()?8:14;
  for(let i=0;i<n;i++){const s=document.createElement('i');s.className='fwspark';s.style.left=Math.round(x0+(Math.random()*16-8))+'px';s.style.top=Math.round(y0+(Math.random()*16-8))+'px';sc.appendChild(s);
    setTimeout(()=>{s.style.left=sx+'px';s.style.top=sy+'px';s.style.opacity=0},60+i*70);setTimeout(()=>s.remove(),2400+i*70)}}
function fwStep(n){const f=fw();f.step=n;save()}
async function fwCeremony(path,resume){
  const f=fw(),fox=S.kind==='fox',e=E();if(!resume){f.path=path;f.step=0;f.gift=null}f.state='ceremony';S.releasePath=f.path;save();
  try{lvStop();clearTimeout(LIVE.noticeT);clearInterval(LIVE.timer)}catch(x){}clearTimeout(ambT);if(window.Music)Music.home(S.kind);
  ov.innerHTML='';document.querySelectorAll('.full').forEach(x=>x.remove());
  h(`<div class="scene fwscene ${fox?'fox':'owl'}" id="sc"><div class="fwsky"></div>${fwStarHTML(fox?2:2,'fwstar')}<div class="fwtrail" id="fwtrail"></div>
    <div class="creature" id="cr" style="left:90px;bottom:64px">${svg(S.kind,S.g,'happy')}</div>${fox?'<div class="fwgrass"></div>':''}<div class="fwglow" id="fwglow"></div><div class="bubble" id="b" style="display:none"></div></div>`);
  const px=$('#cr .px-echo');if(px)px.dataset.stage=4;   // bonded until the departure; stage 5 plays as the release event
  const star=l=>{const s=$('#fwstar');if(s){s.className='fwstar l'+l;s.style.backgroundImage=`url(px/fw/star_${l}.png)`}};
  const mems=Postcards.memories(S.memories).slice(-3);
  if(fox)fwBg(resume?'meadow':scHome().id,resume?'twi':'day');else fwBg('branch','twi');   // Whimber: the branch's warm twilight, whatever the clock says
  if(resume&&f.step>=1){if(!fox)await fwMoveTo(58,64,400);await fwSay(B('resume_edge'))}
  else{
    // C0 start
    await fwSay(B('walk_start'));fwStep(1);
    // C1 walk (Slyte: three cuts home -> meadow -> edge, trotting) / along the branch (Whimber: each memory lights a star)
    if(fox){const c=$('#cr');c.classList.add('pxwalk');await fwSay(fwPickDone('walk_list'));const sc=$('#sc');sc.classList.add('fwcut');fwBg('meadow','day');await fwWait(350);sc.classList.remove('fwcut');
      for(const m of mems.slice(0,2))await fwSay(B('walk_memory',{memory:m}));sc.classList.add('fwcut');fwBg('meadow','twi');await fwWait(350);sc.classList.remove('fwcut');c.classList.remove('pxwalk')}
    else{await fwMoveTo(74,64,700);await fwSay(fwPickDone('walk_list'));let k=0;
      for(const m of mems){k++;$('#fwtrail').innerHTML=fwTrailHTML(k*2);await fwSay(B('walk_memory',{memory:m}))}await fwMoveTo(58,64,600)}
    fwStep(2);
    // C2 arrive
    star(3);await fwSay(B('edge_arrive'));fwStep(3)}
  // C3 setup callback, chest glow x3
  const gl=$('#fwglow');if(gl){gl.classList.add('on');setTimeout(()=>gl.classList.remove('on'),1600)}
  star(3);await fwSay(fwLine('edge_explain',0));await fwSay(fwLine('edge_explain',1));fwStep(4);
  // C4 gift: the child gives
  if(!f.gift){await fwSay(B('gift_ask'));const fav=S.g.fav.split(' ');
    const opts=[['💎',S.treasures[0]||e.treasure],[fav[0],fav.slice(1).join(' ')],fox?['🌸','a flower']:['🪨','a smooth pebble']];
    const i=await fwChoose(opts);f.gift=opts[i][1];S.gift=f.gift;save();hop()}
  await fwSay(B('gift_got',{gift:f.gift}));fwStep(5);
  // C5 gift: the Echo gives its keepsake (tap to keep)
  await fwSay(fwLine('keepsake_give',0));
  await new Promise(res=>{const sc=$('#sc'),b=document.createElement('button');b.className='fwkeep glim';b.id='fwkeep';b.setAttribute('aria-label',fwUI('ui_keepsake',fox?0:1));
    b.style.backgroundImage=`url(px/fw/${fox?'glowleaf':'starfeather'}.png)`;sc.appendChild(b);ov.innerHTML=`<div class="choices"><div class="hint">Tap the ${fox?'glow-leaf':'starlight feather'} to keep it</div></div>`;
    b.onclick=()=>{ov.innerHTML='';S.keepsake={type:fox?'glowleaf':'starfeather',name:fwUI('ui_keepsake',fox?0:1),day:S.days};SFX('care_pet_sparkle');save();b.classList.add('kept');res()}});
  await fwSay(fwLine('keepsake_give',1));fwStep(6);
  // C6 thank-you, both ways (a second, different goodbye within 5 s plays two_goodbyes)
  await fwSay(fwLine('thanks',0));await fwSay(fwLine('thanks',1));
  const TH=[['🤗',fwUI('ui_choice_thanks',0),'thanks_hug'],['👋',fwUI('ui_choice_thanks',1),'thanks_wave'],['👃',fwUI('ui_choice_thanks',2),'thanks_nose'],['❤️',fwUI('ui_choice_thanks',3),'thanks_words']];
  const t1=await fwChoose(TH);hop();await fwSay(B(TH[t1][2]));
  const rest=TH.filter((_,i)=>i!==t1);const t2=await Promise.race([fwChoose(rest),fwWait(FWC().thanksWindowMs).then(()=>-1)]);ov.innerHTML='';
  if(t2>=0){hop();await fwSay(B(rest[t2][2]));await fwSay(B('two_goodbyes'))}fwStep(7);
  // C7 what comes next: postcards explained before leaving
  const pv=document.createElement('div');pv.className='fwpost';pv.innerHTML=`<i style="background-image:url(px/i_postcard.png)"></i><i style="background-image:url(px/i_mail_closed.png)"></i>`;$('#sc').appendChild(pv);
  for(let i=0;i<4;i++)await fwSay(fwLine('next_postcards',i));
  const n=await fwChoose([['✨',fwUI('ui_choice_next',0)],['✉️',fwUI('ui_choice_next',1)],['🤗',fwUI('ui_choice_next',2)]]);
  if(n===1)await fwSay(B('write_a_lot'));if(n===2){hop();await fwSay(B('hug_more'))}pv.remove();fwStep(8);
  // C8 farewell + trust gesture
  react('pet');await fwSay(B('farewell'));
  // C9 departure: counts as done from here (S.released), so a closed app shows the closure next time
  fwStep(9);fwRelease();
  const c=$('#cr'),pxe=$('#cr .px-echo');
  if(fox){c.classList.add('pxwalk');await fwMoveTo(150,58,1600);c.classList.remove('pxwalk');c.classList.add('fwback');await fwSay(B('look_back'));c.classList.remove('fwback')}
  else{react('excited');c.classList.add('fwback');await fwSay(B('look_back'));c.classList.remove('fwback')}
  $('#b').style.display='none';SFX(fox?'slyte_release':'whimber_release');
  await new Promise(res=>{if(!pxe)return res();PIXEL.event(pxe,'release',res);setTimeout(fwSparkles,900);
    if(!fox){const [sx,sy]=fwStarXY();const x0=parseFloat(c.style.left)||58,b0=parseFloat(c.style.bottom)||64,tx=sx,tb=263-sy-24,n=26;let i=0;   // forward glide arc toward its star, never straight up
      const t=setInterval(()=>{i++;const k=i/n;c.style.left=Math.round(x0+(tx-x0)*k)+'px';c.style.bottom=Math.round(b0+(tb-b0)*k+10*Math.sin(Math.PI*k))+'px';if(i>=n)clearInterval(t)},83)}});
  const s=$('#fwstar');if(s)s.classList.add('answer');await fwSay(B('last_call'));closure()}
function fwRelease(){const f=fw();S.released=now();f.state='released';S.postcards=[];S.checkins=buildCheckins();S.pcv=Postcards.VERSION;save()}
function fwResumeCheck(){const f=S.fw;if(!f||S.released)return false;   // closed mid-ceremony before C9: resume at the edge / on the branch
  if(f.state==='ceremony'){fwCeremony(f.path,true);return true}return false}
function closure(){
  const g=S.g,f=fw();if(!S.released)fwRelease();f.step=9;save();ov.innerHTML='';
  const d=full(`<div class="mcard closure"><div class="mtop">${PI('⭐')}<span class="mt">${g.name} is home</span>${PI('⭐')}</div><div class="cstar"><i></i></div><p class="mline">${fwUI('ui_closure',0)}</p><p class="mline">${fwUI('ui_closure',1)}</p><p class="mline">${PI('✉️')} ${fwUI('ui_closure',2)}</p><div id="cont" style="height:24px"></div></div>`);d.classList.add('milestone');
  setTimeout(()=>{d.querySelector('#cont').innerHTML='<button class="btn">Continue</button>';d.querySelector('button').onclick=()=>{d.remove();f.closed=1;save();feelings()}},FWC().lineMs?600:5000);
}
function feelings(){
  const f=[['😊','Happy'],['😌','Proud'],['😢','Sad'],['😮','Surprised'],['🙂','Okay']],sel=new Set();
  // nothing chosen here is saved (privacy rule); the screen only answers in the moment
  const d=full(`<div class="mcard feel"><div class="mtop"><span class="mt">How do you feel?</span></div><p class="mline">You can pick more than one.</p><div class="fgrid">${f.map((x,i)=>`<button class="btn" data-i="${i}">${PI(x[0])}<span class="lbl">${x[1]}</span></button>`).join('')}</div><button class="btn" id="ok">Done</button></div>`);d.classList.add('milestone');
  d.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;sel.has(i)?sel.delete(i):sel.add(i);b.classList.toggle('sel');say(f[i][1])});
  d.querySelector('#ok').onclick=()=>{d.remove();const d2=full(`<div class="mcard"><div class="mtop">${PI('❤️')}</div><p class="mline">It's okay to feel more than one thing.</p><button class="btn">${PI('📖')}<span class="lbl">Memory Book</span></button></div>`);d2.classList.add('milestone');say("It's okay to feel more than one thing.");d2.querySelector('button').onclick=()=>{d2.remove();afterHome();book()}};
}
function buildCheckins(){ // Echo_Postcards.docx v0.5: six postcards (days 1, 3, 7, 14, 30, 60)
  return Postcards.build({kind:S.kind,child:S.child,gift:S.gift,memories:S.memories,constellation:(S.constellations||[])[0]})}
// migrate a v0.3 check-in schedule (postcards, notes, signs) to the v0.5 postcards; keep how far the child has got
function migrateCheckins(){if(!S||!S.released||S.pcv===Postcards.VERSION)return;const old=S.checkins||[];
  const upTo=Math.max(0,...old.filter(k=>k.delivered).map(k=>k.day));S.checkins=buildCheckins();S.checkins.forEach(k=>{if(k.day<=upTo)k.delivered=true});
  S.postcards=S.checkins.filter(k=>k.delivered).map(k=>`<b>Day +${k.day} · postcard</b><br>${k.text}`);S.pcv=Postcards.VERSION;save()}
function deliverCheckins(){
  const sleep1=(()=>{const d=new Date(S.released);d.setDate(d.getDate()+1);d.setHours(4,0,0,0);return d.getTime()})();   // farewell arc §7: postcard 1 after one sleep (next day, after 04:00)
  const due=(S.checkins||[]).filter(k=>!k.delivered&&(k.day===1?sleep1<=now():S.released+k.day*864e5<=now()));
  if(!due.length||S.lastCheckinDate===new Date(now()).toDateString())return null;
  due.forEach(k=>k.delivered=true);S.lastCheckinDate=new Date(now()).toDateString();
  S.postcards=S.checkins.filter(k=>k.delivered).map(k=>`<b>Day +${k.day} · ${k.type==='sign'?'small sign':k.type}</b><br>${k.text}`);save();return due[due.length-1];
}
function pcScene(k,i){return k.scene||(S.kind==='fox'?'meadow':'night')}
function postcardHTML(k,i,mini){const e=E(),g=S.g,scene=pcScene(k,i),tok=e.token==='leaf'?'🍃':'🪶';
  const front=k.type==='postcard'?`<div class="pcfront" style="background-image:url(px/pc_${scene}.png)"><div class="pcecho pose-${k.pose||'tall'}">${svg(S.kind,g,'happy')}</div><i class="pcstamp">${PI(tok)}</i></div>`
    :k.type==='sign'?`<div class="pcfront sign" style="background-image:url(px/pc_${scene}.png)"><i class="pcsign">${PI(e.sign.split(' ')[0])}</i></div>`
    :`<div class="pcfront note"><i class="pcstamp">${PI('✉️')}</i><span>a note from ${g.name}</span></div>`;
  return `<div class="pcard${mini?' mini':''}">${front}<div class="pcback"><b>Day +${k.day} · ${k.type==='sign'?'small sign':k.type}</b><p>${k.text}</p></div></div>`}
function afterHome(){
  const e=E(),g=S.g;ov.innerHTML='';const fresh=deliverCheckins(),sign=fresh&&fresh.type==='sign',days=Math.floor((now()-S.released)/864e5),ic=e.sign.split(' ')[0];
  const fox=S.kind==='fox',ks=S.keepsake,cap=fwUI(days<1&&!(S.checkins||[]).some(k=>k.delivered)?'ui_after_day0':'ui_after_later');
  h(`<div class="top"><b>${fox?'The meadow':'Our branch'} · day +${days}</b><button class="btn small ico" id="book" aria-label="Memory Book">${PI('📖')}</button></div><div class="scene ${e.bg} after pxscene" style="background:url(px/scenes/${fox?'meadow_day':'branch_twi'}.png) center bottom/180px 320px no-repeat !important"><div class="bubble">${cap}${fresh?(sign?' Something was left here… tap it!':' There\'s something in the mailbox!'):''}</div>
  ${fwStarHTML(3,'fwstar')}${ks?`<div class="fwkeep after${fresh?' glim':''}" aria-label="${ks.name}" style="background-image:url(px/fw/${ks.type}.png)"></div>`:''}
  <button class="spot mailbox${fresh&&!sign?' full':''}" id="mail" aria-label="Mailbox">${PI(fresh&&!sign?'📬':'📪')}</button>
  ${sign?`<button class="spot signspot" id="sign" aria-label="Something left for you">${PI(ic)}</button>`:''}</div>
  <div class="dock two"><button class="btn" id="pc">${PI('⏩')}<span class="lbl">Skip a day (demo)</span></button><button class="btn" id="again">${PI('🌿')}<span class="lbl">New Echo</span></button></div>`);
  const i=(S.checkins||[]).filter(k=>k.delivered).length-1;
  const show=()=>{const d=full(`<div class="pcwrap">${postcardHTML(fresh,i)}<button class="btn">${PI('📖')}<span class="lbl">Keep it in my Memory Book</span></button></div>`);d.classList.add('milestone');say(fresh.text);d.querySelector('button').onclick=()=>{d.remove();const m=$('#mail');m.classList.remove('full');m.innerHTML=PI('📪')}};
  $('#book').onclick=book;$('#mail').onclick=()=>fresh&&!sign?show():book();if(sign)$('#sign').onclick=()=>{$('#sign').remove();show()};
  $('#pc').onclick=()=>{S.clockOffset=(S.clockOffset||0)+864e5;save();afterHome();const nx=(S.checkins||[]).find(k=>!k.delivered);if(nx)toast('Next letter around day +'+nx.day)};
  $('#again').onclick=()=>{if(confirm('Start with a new Echo? (This prototype keeps one save, so the old Memory Book will be cleared.)')){S={child:S.child,voice:S.voice};discover()}};
}
window.addEventListener('visibilitychange',()=>{if(document.hidden)save();else if(S&&S.last&&now()-S.last>10*60e3){sess={feeds:0,games:0,naps:0,chats:0};simulate();save();if(!S.released)home(true)}});
window.__echo={get state(){return S},milestone:id=>{mq.push({id});flushMilestones()},scene:{get cur(){return curScene().id},unlocked:()=>scUnlocked().map(s=>s.id),pick:()=>scPickSession(),picker:()=>scPicker()},living:{get st(){return LIVE.st},get pos(){return LIVE.pos},get act(){return LIVE.act},get log(){return LIVE.log},get foundAct(){return LIVE.foundAct},dbg:()=>({can:!!lvCanWander(),feed:!!document.getElementById('feed'),full:!!document.querySelector('.full,.book,.bondup'),ov:ov.innerHTML.trim().slice(0,60),b:($('#b')||{}).style&&$('#b').style.display,nap:S.napUntil>now(),next:LIVE.nextIdle-now(),timer:!!LIVE.timer,st:LIVE.st}),wander:()=>lvWander(),routine:b=>lvRoutine(b),found:()=>lvFound(),present:()=>lvPresent(),start:f=>lvStart(f)},home:g=>home(g),maybeBondUp:()=>maybeBondUp(),playBondUp:(a,b)=>playBondUp(a,b,false),trailGame:()=>trailGame(),connectGame:()=>connectGame(),gamesFor:()=>gamesFor().map(x=>x[1]),migrateCheckins:()=>migrateCheckins(),buildCheckins:()=>buildCheckins(),pairsLevel:()=>pairsLevel(),memoryGame:()=>memoryGame(),fortLevel:()=>fortLevel(),fortBuilder:r=>fortBuilder(r||0),initDialogue:()=>initDialogue(),runConv:(id,d)=>runConv(id,d),callbackLine:()=>callbackLine(),bark:(k)=>B(k)};
start();
})();
