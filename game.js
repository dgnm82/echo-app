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
function save(){if(S&&S.needs){const m=S.metAt=S.metAt||{},p=sess._nv||{};for(const k in S.needs)if(p[k]!=null&&S.needs[k]>p[k])m[k]=now();sess._nv=Object.assign({},S.needs)}if(S&&!window.__wiped){S.last=now();localStorage.setItem(KEY,JSON.stringify(S))}if(S&&S.needs&&document.getElementById('sc'))thoughtRefresh()}
// need thought bubble (playtest fix): re-picked whenever a need changes (every save), hidden when nothing is pressing; follows the Echo as it moves
const thoughtIcon=w=>window.PIXEL?PIXEL.icon({'🍎':'feed','⚽':'play','🛏️':'sleep','💗':'pet'}[w]||'talk'):w;
function thoughtHTML(w){return `<div class="thought" data-w="${w}">${thoughtIcon(w)}</div>`}
let THO=null;   // the bubble's offset from the sprite, taken before the Echo first moves
function thoughtSync(){const t=document.querySelector('#sc .thought'),c=document.getElementById('cr'),sc=document.getElementById('sc');if(!t||!c||!sc)return;if(c.classList.contains('lvmoving')){t.style.visibility='hidden';clearTimeout(thoughtSync._t);return}   // needs v2 P2: hide in flight, show 1 s after landing
  const R=sc.getBoundingClientRect(),k=R.width/(sc.offsetWidth||1),cr=c.getBoundingClientRect(),cx=(cr.left-R.left)/k,cy=(cr.top-R.top)/k;
  if(!c.style.left){const tr=t.getBoundingClientRect();THO=[(tr.left-cr.left)/k,(tr.top-cr.top)/k];return}if(!THO)return;
  t.style.left=Math.round(cx+THO[0])+'px';t.style.top=Math.round(cy+THO[1])+'px';t.style.bottom='auto';if(t.style.visibility==='hidden'){clearTimeout(thoughtSync._t);thoughtSync._t=setTimeout(()=>{const u=document.querySelector('#sc .thought');if(u){u.style.visibility='';thoughtSync()}},1000)}}
// needs v2 §6: corner glows inside #sc (bottom pair sits above the dock); step rises one level per 166 ms, at once under lowFx
const MT_IC={food:'feed',play:'play',comfort:'pet',rest:'sleep'};
function meterHTML(){const m=NeedsV2.meter(S.needs),sl=mood()==='sleep';return `<div class="meters${sl?' off':''}" aria-hidden="true">${Object.keys(MT_IC).map(k=>`<i class="mt mt-${k}" data-s="${m[k].step}" style="background-image:url(px/meter/${k}_s${m[k].step}.png)"></i><b class="mti mti-${k}" style="background-image:url(px/icon_${MT_IC[k]}.png)"></b>`).join('')}</div>`}
function meterRefresh(){const box=document.querySelector('#sc .meters');if(!box)return;box.classList.toggle('off',mood()==='sleep');const m=NeedsV2.meter(S.needs);
  for(const k in MT_IC){const el=box.querySelector('.mt-'+k),to=m[k].step;if(!el)continue;clearInterval(el._t);const set=v=>{el.dataset.s=v;el.style.backgroundImage=`url(px/meter/${k}_s${v}.png)`};
    let cur=+el.dataset.s;if(lowFx()||to<=cur){set(to);continue}el._t=setInterval(()=>{cur++;set(cur);if(cur>=to)clearInterval(el._t)},166)}}
function thoughtRefresh(){meterRefresh();const sc=document.getElementById('sc'),c=document.getElementById('cr');if(!sc||!c)return;let t=sc.querySelector('.thought');const w=want(),show=w&&mood()!=='sleep';
  if(!show){if(t)t.remove();return}
  if(t&&t.dataset.w===w)return;if(t){t.dataset.w=w;t.innerHTML=thoughtIcon(w)}else{c.insertAdjacentHTML('afterend',thoughtHTML(w));thoughtSync()}}
function E(){return CR[S.kind]}
// Echoes have no voices: they speak in musical chirps (sound comes later). Text-to-speech is off.
function say(t,expr,soft){try{if(S&&S.voice&&window.Chirp)Chirp.play(t,S.kind,expr,soft?{vol:.5}:undefined)}catch(e){}}
const SFX=(n,o)=>{try{window.Sound&&Sound.play(n,o)}catch(e){}};
// playtest: on the home scene the tip sits below the top corner glows (57 UI px at the largest step) and below a showing
// speech bubble, and never reaches the bottom glows or the dock. It stays a low-z toast, so modals cover it.
const GLOW_MAX=57;function toastPlace(el){const sc=document.getElementById('sc');el.style.top='';if(!sc||!el)return;const R=sc.getBoundingClientRect(),k=R.width/(sc.offsetWidth||1);
  let y=R.top+(GLOW_MAX+4)*k;const b=document.getElementById('b');if(b&&b.style.display!=='none'&&b.offsetParent){const br=b.getBoundingClientRect();if(br.bottom>y-4*k&&br.top<y+el.getBoundingClientRect().height)y=br.bottom+4*k}
  const h=el.getBoundingClientRect().height;y=Math.min(y,R.bottom-(GLOW_MAX+4)*k-h);
  el.style.top='0px';const t0=el.getBoundingClientRect().top;el.style.top=Math.round((y-t0)/k)+'px'}   // #toast is fixed inside a scaled shell: convert screen y to its own px
function toast(t){const el=$('#toast');el.textContent=t;toastPlace(el);el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),2200)}
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
    const cb=!l&&Math.random()<.25?callbackLine():null;if(cb)fwTick('memory');talk(l||cb||needLine());sess.ambient=(sess.ambient||0)+1}
  scheduleAmbient()},(C2.ambientMin+Math.random()*(C2.ambientMax-C2.ambientMin))*1000*(S&&S.ageBand?obBand().ambientScale:1))}
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
const WANT_IC={food:'🍎',play:'⚽',rest:'🛏️',comfort:'💗'};
function want(){const k=NeedsV2.want(S.needs,S.metAt,sess.wantShown);sess.wantShown=k;return k?WANT_IC[k]:null}   // needs v2 §1: < 50, off at 60, tie = met longest ago

// ---------- time model (§5.1) ----------
function simulate(){
  if(!S||!S.last)return;
  if(S.holiday&&S.holiday.on){S.holiday={on:false,was:S.holiday.since||null};sess.holidayBack=1;S.last=now();}   // holiday (D5): needs, away clock and bond were frozen; it ends on this open
  const hrs=Math.max(0,(now()-S.last)/36e5);NeedsV2.drain(S.needs,S.last,now(),S.quietHours,C.maxDecayHours);
  const st=NeedsV2.awayStage(hrs),fl=NeedsV2.awayFloor[st];if(fl)for(const k in S.needs)S.needs[k]=Math.max(S.needs[k],fl);
  if(st===1)sess.awayTreasure=1;else if(st===2)sess.awayNote=1;
  else if(st===3&&!S.released&&!S.left&&!(fwReady()||fw().state!=='active'))S.left={at:now(),card2:now()+7*864e5};   // kind leave: gone home for the next adventure (no dying, bond frozen)
  const today=new Date(now()).toDateString(); if(S.lastHello!==today&&!S.left){S.lastHello=today;addBond(C.bond.hello,true,'hello');S.days=(S.days||0)+1}
}
function addBond(n,silent,src){   // needs v2 §2: tagged sources go through the day/session caps; a visit = the first care action of a session
  if(S.left||(S.holiday&&S.holiday.on))return;const day=new Date(now()).toDateString();
  const n0=n;if(src){if(NeedsV2.care.includes(src)&&!sess.visited){sess.visited=1;n=NeedsV2.bondGrant(S,sess,'visit',day)}else n=0;n+=NeedsV2.bondGrant(S,sess,src,day,n0)}
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
  if(!S||S.setupDone===0)return setup();
  Dialogue.load(S.kind==='fox'?'slyte':'whimber').then(()=>{initDialogue();famVars();gamesMigrate();fwMigrate();if(S.released){migrateCheckins();if(S.fw&&!S.fw.closed&&S.fw.step===9){afterHome();return closure()}return afterHome()}if(S.fw&&S.fw.state==='ceremony'){simulate();save();return fwCeremony(S.fw.path,true)}window.__awayMin=S.last?(now()-S.last)/6e4:0;if(window.__awayMin>=FWC().longAbsenceDays*1440)sess.welcomeBack=1;if(!S.scene)S.scene=scHome().id;if(window.__awayMin>=(C.foundMinAwayMinutes||20)&&!S.graceUntil)window.__foundScene=scPickSession();simulate();save();if(!localStorage.getItem('echo-nosetup')&&!sess.titled){sess.titled=1;return obReturnTitle(()=>home(true))}home(true)}).catch(e=>{console.error(e);h('<p style="padding:20px">Could not load dialogue. Please reload.</p>')});
}
const TAGLINE="ECHO: Every creature has a story to share. Can you hear it?";   // ui_tagline, /workspace/echo/onboarding/dialogue/shared_onboarding.json (also in dialogue/shared.json)
function legacySetup(){   // test/playtest harness only (localStorage echo-nosetup)
  const fox=window.PIXEL?PIXEL.slyte({seed:7},1):'',owl=window.PIXEL?PIXEL.whimber({seed:4},1):'';
  h(`<div class="scene title"><div class="bg pxbg pxbg-night"></div><div class="tcard"><div class="tlogo">${PI('✨')}<span>${TAGLINE}</span>${PI('✨')}</div>
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
  S.g.name=(window.FAMILIES&&FAMILIES.byKind[kind].default_name)||E().name;if(window.FAMILIES){const f=FAMILIES.byKind[kind];Object.assign(S.vars,{origin_animal:kind,family:f.label,family_plural:f.plural,default_name:f.default_name})} await Dialogue.load(kind==='fox'?'slyte':'whimber');initDialogue();
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
          const ns=localStorage.getItem('echo-nosetup');if(ns&&ns!=='talk')return tip();sess.fwBusy=1;setTimeout(()=>runConv(kind==='fox'?'slyte_where_from_v2':'whimber_where_from_v2',()=>{sess.fwBusy=0;tip()}),600)},2400);
      })},1800)},1700);
}
// ---------- Onboarding v1 (onboarding.md v0.2) + Origin v2 phone v1 (origin_v2.md v0.2) + grown-ups corner (§5) ----------
// Family names/labels come only from families.js (FAMILIES). The legacy quick setup stays behind 'echo-nosetup' for the test harness.
const FAM=()=>window.FAMILIES, OBC={maxLen:10,presets:['Star','Sunny','Pip','Bean','Comet','Pebble'],
  bands:{'5-6':{icon:'sprout',typeCps:14,maxConv:1,ambientScale:1.5,level:'easy'},'7-8':{icon:'flower',typeCps:20,maxConv:2,ambientScale:1,level:'auto'},'9-10':{icon:'tree',typeCps:28,maxConv:2,ambientScale:1,level:'auto'}},
  decline:{rate:.12},gate:{holdMs:3000,tries:3,cooldownMs:60000,idleMs:60000}};   // onboarding_config.json / origin_config.json
let OBL=null;   // shared UI copy (dialogue/shared.json) for screens shown before an Echo exists
async function obLib(){if(!OBL)OBL=(await Dialogue.loader('shared')).barks;return OBL}
function obFill(t,x){x=x||{};const v=Object.assign({},(S&&S.vars)||{},x);const child=S&&S.vars&&('child_named' in S.vars)?S.child:'friend';
  return String(t).replace(/\{var:(\w+)\}/g,(m,k)=>v[k]!=null?v[k]:'').replace(/\{child\}/g,child).replace(/\{name\}/g,(S&&S.g&&S.g.name)||(x.name||''))}
function U(k,i,x){const L=(OBL&&OBL[k])||(Dialogue.lib&&Dialogue.lib.barks[k])||[];const l=L[i||0];return l?obFill(l.text,x):''}
function UA(k,x){const L=(OBL&&OBL[k])||[];return L.map(l=>obFill(l.text,x))}
function famVars(){if(!window.FAMILIES||!S||!S.kind)return;const f=FAMILIES.byKind[S.kind];S.vars=S.vars||{};S.vars.family=f.label;S.vars.family_plural=f.plural;if(!S.vars.default_name)S.vars.default_name=f.default_name}   // family words come from families.js on every load (old saves too)
function obMaxConv(){return S&&S.ageBand?Math.min(C.maxConversationsPerSession,obBand().maxConv):C.maxConversationsPerSession}   // 5-6: 1 per session
function obBand(){return OBC.bands[(S&&S.ageBand)||'7-8']||OBC.bands['7-8']}
// --- name filter (§2.2): 1-10 letters, letters/space/hyphen/apostrophe, <= 2 words, no digits, local blocklist on a folded form
const OB_BLOCK_STRONG=['fuck','shit','cunt','bitch','nigg','fag','whore','slut','penis','vagina','rape','nazi','porn','dick','pussy','cock','twat','wank'],OB_BLOCK_MILD=['ass','poo','poop','pee','butt','fart','crap','damn','hell','sex','boob','willy','idiot','loser','ugly','fatty'];
function obFold(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[013457@$]/g,c=>({0:'o',1:'i',3:'e',4:'a',5:'s',7:'t','@':'a','$':'s'})[c]).replace(/(.)\1+/g,'$1').replace(/[^a-z]/g,'')}
function obNameCheck(raw){const t=String(raw||'').trim().replace(/\s+/g,' ');if(!t)return {ok:false,why:'empty'};
  if(t.length>OBC.maxLen||/\d/.test(t)||!/^[\p{L} '\-]+$/u.test(t)||t.split(' ').length>2)return {ok:false,why:'chars'};
  const f=obFold(t),fw=obFold(t.replace(/\s+/g,''));if(OB_BLOCK_STRONG.some(w=>f.includes(obFold(w))))return {ok:false,why:'block'};
  if(OB_BLOCK_MILD.some(w=>obFold(w)===fw))return {ok:false,why:'block'};
  return {ok:true,name:t.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}}
// --- decline (origin §3): deterministic hash; never first Echo, never for borrowed colours, at most once per origin, always-yes setting
function obHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967296}
function orDeclines(){const o=S.origin;return !!(o&&o.idx>0&&!o.declined&&!S.alwaysYes&&o.src!=='borrowed'&&obHash(`${S.oseed}|${o.idx}|${o.attempt}`)<OBC.decline.rate)}
function obSprite(fid,seed,pal,stage,look){const f=FAM()[fid];return window.PIXEL?PIXEL[f.sprite]({seed,pal,look:look||(S&&S.origin&&S.origin.animal&&S.origin.family===fid?(FAM().animals[S.origin.animal].look||f.look_default):f.look_default)},stage||1):''}
function obScene(cls,inner){h(`<div class="scene ob ${cls||''}${lowFx()?' calm':''}"><div class="bg pxbg pxbg-${cls&&cls.includes('meadow')?'discover':'night'}"></div>${inner}</div>`)}
function obLock(pos){return `<button class="oblock ${pos||'br'}" id="oblock" aria-label="Grown-ups corner: press and hold"><i style="background-image:url(px/origin/lock.png)"></i><svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15"/></svg></button>`}
function obWireLock(back){const b=document.getElementById('oblock');if(!b)return;let t=null,t0=0;
  const down=e=>{e.preventDefault();e.stopPropagation();t0=Date.now();b.classList.add('hold');t=setTimeout(()=>{b.classList.remove('hold');pcGate(back)},OBC.gate.holdMs)};
  const up=e=>{e&&e.stopPropagation();clearTimeout(t);b.classList.remove('hold')};
  b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);b.onclick=e=>e.stopPropagation()}
// P1 first-run title
async function setup(){
  if(localStorage.getItem('echo-nosetup'))return legacySetup();
  await obLib();
  if(S&&S.setupDone===0&&S.child!==undefined)return orSeen();   // closed mid-origin: restart at P1 (a decline already saved stays saved)
  const tg=U('ui_tagline').replace(/^ECHO:\s*/,'');
  obScene('obtitle',`<div class="oblogo">ECHO</div><div class="obtag" aria-label="${U('ui_tagline')}">${tg}</div><button class="obtap" id="obgo">${U('ui_ob_tap_start')}</button>${obLock('br')}`);
  obWireLock(setup);
  $('#obgo').onclick=()=>{SFX('ui_tap');if(window.Music)Music.title();obWelcome()};
}
// welcome: tagline reveal word by word (4 ticks/word), then the origin welcome beat (replaces the listening star)
function obWelcome(){const words=U('ui_tagline').split(' '),beats=UA('ui_or_welcome');
  obScene('obwelcome',`<div class="obpanel big" id="obw"></div><div class="obhint">Tap to go on</div>`);
  const el=$('#obw');let i=0,step=0,tm=null;
  const tick=()=>{el.textContent=words.slice(0,++i).join(' ');if(i<words.length)tm=setTimeout(tick,lowFx()?0:333)};tick();
  $('.scene.ob').onclick=()=>{if(i<words.length){clearTimeout(tm);i=words.length;el.textContent=words.join(' ');return}
    if(step<beats.length){el.textContent=beats[step++];return}obName()}}
function obName(val){
  obScene('obname',`<div class="obpanel"><b>${U('ui_ob_name_ask')}</b><br><small id="obnh">${U('ui_ob_name_hint')}</small></div>
   <div class="obfield"><input id="obnm" maxlength="10" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" inputmode="text" enterkeyhint="next" aria-label="Name or nickname" value="${(val||'').replace(/"/g,'')}"><span id="obct">0/10</span></div>
   <div class="obsmall">${U('ui_ob_name_presets')}</div><div class="obchips">${UA('ui_ob_presets').map(p=>`<button class="btn small obchip" data-n="${p}">${p}</button>`).join('')}</div>
   <div class="row obrow"><button class="btn" id="obskip">${U('ui_ob_skip')}</button><button class="btn" id="obnext">Next &gt;</button></div>`);
  const inp=$('#obnm'),ct=()=>{$('#obct').textContent=inp.value.length+'/10';$('#obnh').textContent=/\s/.test(inp.value.trim())?U('ui_ob_name_short'):U('ui_ob_name_hint')};inp.oninput=ct;ct();
  app.querySelectorAll('.obchip').forEach(b=>b.onclick=()=>{SFX('ui_tap');inp.value=b.dataset.n;ct()});
  $('#obskip').onclick=()=>{SFX('ui_tap');obSetChild(null);obAge()};
  $('#obnext').onclick=()=>{const r=obNameCheck(inp.value);if(!inp.value.trim())return obSetChild(null),obAge();
    if(!r.ok){SFX('ui_back');inp.value='';ct();$('#obnh').textContent=U('ui_ob_name_again');return}obConfirm(r.name)}}
function obConfirm(n){
  obScene('obconfirm',`<div class="obpanel big">${((OBL.ui_ob_name_confirm||[])[0]||{text:'{child}?'}).text.replace('{child}',n)}</div><div class="row obrow"><button class="btn" id="obyes">${U('ui_ob_yes_change',0)}</button><button class="btn" id="obch">${U('ui_ob_yes_change',1)}</button></div>`);
  $('#obyes').onclick=()=>{SFX('bond_meter_tick');obSetChild(n);obAge()};$('#obch').onclick=()=>{SFX('ui_back');obName(n)}}
function obSetChild(n){S=S&&S.setupDone===0?S:{voice:true,music:true,vars:{},setupDone:0,oseed:Math.floor(Math.random()*2e9)+1,originIdx:0,songs:[]};
  if(n){S.child=n;S.vars.child_named=1}else{S.child='friend';delete S.vars.child_named}save()}
function obAge(){const bands=UA('ui_ob_age_bands'),ask=UA('ui_ob_age_ask');
  obScene('obage',`<div class="obpanel"><b>${ask[0]}</b><br><small>${ask[1]||''}</small></div><div class="obages">${bands.map(b=>`<button class="btn obagebtn" data-b="${b}">${PIXEL.icon(OBC.bands[b].icon)}<span class="lbl">${b}</span></button>`).join('')}</div><div class="obsmall">Grown-ups can change this later.</div>`);
  app.querySelectorAll('.obagebtn').forEach(b=>b.onclick=()=>{SFX('ui_tap');obSetBand(b.dataset.b);save();orSeen()})}
function obSetBand(b){S.ageBand=b;if(OBC.bands[b].level==='easy'){S.pairsLevel=S.pairsLevel==null||S.pairsLevel==='auto'?'easy':S.pairsLevel;S.fortLevel=S.fortLevel==null||S.fortLevel==='auto'?'easy':S.fortLevel;['runLevel','catchLevel','stackLevel'].forEach(k=>{if(S[k]==null||S[k]==='auto')S[k]='easy'})}}
// ---- Origin v2. P1 who did you see?
function orStart(src){const o=S.origin;S.origin={idx:S.originIdx||0,attempt:o&&o.idx===(S.originIdx||0)?(o.attempt||0):0,declined:!!(o&&o.idx===(S.originIdx||0)&&o.declined),src:null,animal:null,family:null,ramp:null,accent:null};save()}
function orSeen(){if(!S.origin||S.origin.idx!==(S.originIdx||0))orStart();const F=FAM();let sel=null;
  obScene('orseen',`<div class="obpanel"><b>${U('ui_or_seen_ask')}</b></div><div class="obpanel small">${U('ui_or_seen_hint')}</div>
   <div class="orgrid">${F.animalOrder.map(a=>`<button class="orcard" data-a="${a}" aria-label="${F.animals[a].label}"><i style="background-image:url(px/origin/${a}.png)"></i><span>${F.animals[a].label}</span></button>`).join('')}</div>
   <button class="btn obnextbtn" id="ornext" disabled>&gt; Next</button>`);
  app.querySelectorAll('.orcard').forEach(b=>b.onclick=()=>{SFX('ui_tap');sel=b.dataset.a;app.querySelectorAll('.orcard').forEach(x=>x.classList.toggle('sel',x===b));$('#ornext').disabled=false;say(F.animals[sel].label)});
  $('#ornext').onclick=()=>{if(!sel)return;if(!S.origin||S.origin.idx!==(S.originIdx||0))orStart();const A=F.animals[sel];S.origin.animal=sel;S.vars.origin_animal=A.word;save();
    if(A.family)orColours(A.family,false);else orBorrow()}}
// not built yet (Cat, Bunny, Other): song stamp + borrow colours with one of the v1 families. Never declined.
function orBorrow(){const F=FAM(),A=F.animals[S.origin.animal];obSong();
  obScene('orborrow meadow',`<div class="orstamp">${PIXEL.icon('sparkle')}<span>${U('ui_or_song_heard')} ${/^[aeiou]/i.test(A.word)?'an':'a'} ${A.word}</span></div>
   <div class="obpanel">${U('ui_or_other_family',0,{family_list:F.list().replace(/^a/,'A')})}</div>
   <div class="orfams">${F.order.map(f=>`<button class="orfam" data-f="${f}"><span class="orlight">${obSprite(f,S.oseed,null,1)}</span><span class="lbl">${F[f].label}</span></button>`).join('')}</div>`);
  app.querySelectorAll('.orfam').forEach(b=>b.onclick=()=>{SFX('ui_tap');orColours(b.dataset.f,true)})}
function obSong(){const a=S.origin.animal;S.songs=S.songs||[];if(!S.songs.includes(a))S.songs.push(a);save()}   // song stamps: kind words only, no counts shown
// P2 colours: one chip in v1 (decision 6). "I'm not sure" = seeded pick.
function orColours(fid,borrowed){const F=FAM(),f=F[fid];S.origin.family=fid;S.vars.family=f.label;S.vars.family_plural=f.plural;
  const chipB=c=>`<button class="orchip" data-c="${c.id}" aria-label="${c.label}"><i style="background:${c.hex}"></i><span>${c.label}</span></button>`;
  obScene('orcolours',`<div class="obpanel"><b>${U('ui_or_colours_ask')}</b></div>
   <div class="orchips">${f.chips.filter(c=>c.real).map(chipB).join('')}</div><div class="obsmall ortoy">${U('ui_or_colours_toy')}</div><div class="orchips">${f.chips.filter(c=>!c.real).map(chipB).join('')}</div>
   <button class="btn" id="orunsure">${U('ui_or_not_sure')}</button>`);
  app.querySelectorAll('.orchip').forEach(b=>b.onclick=()=>{SFX('ui_tap');const c=f.chips.find(x=>x.id===b.dataset.c);Object.assign(S.origin,{ramp:c.ramp,accent:null,chip:c.id,src:borrowed?'borrowed':'chips'});save();orInvite()});
  $('#orunsure').onclick=()=>{SFX('ui_tap');const real=f.chips.filter(c=>c.real).slice(0,6),c=real[Math.floor(rnd((S.oseed+S.origin.idx*31)>>>0||1)()*real.length)];Object.assign(S.origin,{ramp:c.ramp,accent:null,chip:c.id,src:borrowed?'borrowed':'unsure'});save();orInvite()}}   // seeded from the 6 real colours
// playtest: origin copy is data-driven from FAMILIES ("I'm a Howling! The Echo of a dog, fox or wolf!")
const artA=w=>(/^[aeiou]/i.test(w)?'an ':'a ')+w;
function orFamVars(fid){const F=FAM(),f=F[fid],A=F.animals||{},ws=(F.animalOrder||Object.keys(A)).filter(k=>A[k]&&A[k].family===fid).map(k=>A[k].word);
  const list=ws.length>1?ws.slice(0,-1).join(', ')+' or '+ws[ws.length-1]:(ws[0]||'');return {family:f.label,family_plural:f.plural,family_a:artA(f.label),family_animals:list?artA(list):''}}
// P3 hum + invite (tap to hear, tap again; never timed)
async function orInvite(){const F=FAM(),o=S.origin,fid=o.family,f=F[fid];await Dialogue.load(f.dialogue);
  const seed=(S.oseed+o.idx*7919+o.attempt*104729)>>>0||1;o.seed=seed;
  obScene('orinvite meadow',`<div class="obpanel small">${U('ui_or_hum')}</div><div class="orlightform" id="orlf">${obSprite(fid,seed,o.ramp,1)}<i class="ornote a">♪</i><i class="ornote b">♫</i></div>
   <div class="obbub" id="obb" style="display:none"></div><div class="obpanel small orask">${U('ui_or_invite_ask')}</div><button class="btn orinv" id="orinv">${U('ui_or_invite_btn')}</button>`);
  setTimeout(()=>{const l=orLine('invite_hum');if(l)obTalk(l)},700);
  let armed=false;$('#orinv').onclick=()=>{SFX('ui_tap');if(!armed){armed=true;$('#orinv').classList.add('sel');say(U('ui_or_invite_btn'));return}
    if(orDeclines())orNotToday();else orYes()}}
function orLine(k){const L=(Dialogue.lib&&Dialogue.lib.barks[k])||[];const ok=L.filter(l=>Dialogue.check(l.cond,{vars:S.vars}));const l=ok[Math.floor(Math.random()*ok.length)];
  if(!l)return null;const short=obBand()===OBC.bands['5-6']&&l.short;return {text:obFill(short||l.text),expr:l.expr||'happy',react:l.react}}
function obTalk(l,ms){const b=$('#obb');if(!b)return;b.textContent=l.text;b.style.display='';say(l.text,l.expr);clearTimeout(obTalk.t);if(ms)obTalk.t=setTimeout(()=>{b.style.display='none'},ms)}
// P4a yes: arrival event, colour motes, keep-colours line, growth strip
function orYes(){const F=FAM(),o=S.origin,fid=o.family,f=F[fid];const el=document.querySelector('#orlf .px-echo');
  $('#orinv').remove();const ask=document.querySelector('.orask');if(ask)ask.remove();
  SFX(f.kind==='fox'?'slyte_arrival':'whimber_arrival');if(el&&window.PIXEL){el.dataset.stage=1;PIXEL.event(el,'arrival')}
  const chip=o.chip&&f.chips.find(c=>c.id===o.chip);const mc=chip?chip.hex:'#ffd27a';
  $('#orlf').insertAdjacentHTML('beforeend',[0,1,2].map(i=>`<i class="ormote m${i}" style="background:${i===1?'#ffd27a':mc}"></i>`).join(''));
  setTimeout(()=>{const l=orLine('invite_yes');if(l)obTalk(l)},900);
  setTimeout(()=>{app.querySelector('.scene.ob').insertAdjacentHTML('beforeend',`<div class="obbub orfamline">${U('ui_or_family',0,orFamVars(fid))}</div><div class="obpanel small orkeep">${U('ui_or_keep_colours')}<div class="orstrip">${[1,2,3,4].map(s=>`<span>${obSprite(fid,o.seed,o.ramp,s)}</span>`).join('')}</div></div><button class="btn obnextbtn" id="ornm">&gt; Next</button>`);
    $('#ornm').onclick=()=>{SFX('ui_tap');orName()}},2600)}
// P4b not today: shy/happy bow, light drifts up as sparkles, ONE bubble, a song stamp, ONE button -> P1 at once
function orNotToday(){const o=S.origin;o.declined=true;o.attempt=(o.attempt||0)+1;obSong();save();   // saved the moment it shows
  $('#orinv').remove();const ask=document.querySelector('.orask');if(ask)ask.remove();const hum=document.querySelector('.orinvite .obpanel');if(hum)hum.remove();
  const el=document.querySelector('#orlf .px-echo');if(el&&window.PIXEL){try{PIXEL.react(el,'happy')}catch(e){}}
  $('#orlf').classList.add('bow');setTimeout(()=>$('#orlf').classList.add('drift'),1400);
  const l=orLine('invite_not_today');if(l)obTalk(l);
  const A=FAM().animals[o.animal];
  app.querySelector('.scene.ob').insertAdjacentHTML('beforeend',`<div class="orstamp">${PIXEL.icon('sparkle')}<span>${U('ui_or_song_heard')} ${/^[aeiou]/i.test(A.word)?'an':'a'} ${A.word}</span></div><button class="btn obnextbtn" id="orff">${U('ui_or_find_friend')}</button>`);
  $('#orff').onclick=()=>{SFX('ui_tap');orSeen()}}
// P5 naming: 6 names (seeded order), More, Type it (onboarding filter), Just "{family}"
function orName(page){const F=FAM(),o=S.origin,f=F[o.family];page=page||0;const dn=F.animals[o.animal].default_name||f.default_name;S.vars.default_name=dn;const r=rnd(o.seed||1),L=f.names.slice();for(let i=L.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[L[i],L[j]]=[L[j],L[i]]}
  const six=L.slice((page*6)%L.length,(page*6)%L.length+6);let sel=null;
  obScene('orname meadow',`<div class="obpanel"><b>${U('ui_or_name_ask')}</b></div><div class="orlightform small">${obSprite(o.family,o.seed,o.ramp,1)}</div>
   <div class="ornames">${six.map(n=>`<button class="btn small ornm" data-n="${n}">${n}</button>`).join('')}</div>
   <div class="row obrow"><button class="btn small" id="ormore">${U('ui_or_name_more')}</button><button class="btn small" id="ortype">${U('ui_or_name_type')}</button></div>
   <button class="btn" id="orkeep">${U('ui_or_name_keep',0,{default_name:dn})}</button><div class="hint">Tap to hear · tap again to choose</div>`);
  app.querySelectorAll('.ornm').forEach(b=>b.onclick=()=>{SFX('ui_tap');if(sel===b.dataset.n)return orFinish(sel,false);sel=b.dataset.n;app.querySelectorAll('.ornm').forEach(x=>x.classList.toggle('sel',x===b));say(sel)});
  $('#ormore').onclick=()=>{SFX('ui_tap');orName(page+1)};
  $('#orkeep').onclick=()=>{SFX('ui_tap');if(sel==='__keep')return orFinish(dn,true);sel='__keep';app.querySelectorAll('.ornm').forEach(x=>x.classList.remove('sel'));$('#orkeep').classList.add('sel');say(dn)};
  $('#ortype').onclick=()=>{SFX('ui_tap');const d=full(`<div class="obpanel"><b>${U('ui_or_name_ask')}</b></div><div class="obfield"><input id="ortn" maxlength="10" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" aria-label="Echo's name"></div><p class="obsmall" id="orth"></p><div class="row"><button class="btn" id="ortok">Next &gt;</button><button class="btn" id="ortx">${U('ui_ob_yes_change',1)}</button></div>`);
    d.querySelector('#ortx').onclick=()=>d.remove();d.querySelector('#ortok').onclick=()=>{const c=obNameCheck(d.querySelector('#ortn').value);if(!c.ok){SFX('ui_back');d.querySelector('#ortn').value='';d.querySelector('#orth').textContent=U('ui_ob_name_again');return}d.remove();orFinish(c.name,false)}}}
// P6: the Echo exists now. named_reply -> Home -> *_where_from_v2 -> tip. S.setupDone = 1.
function orFinish(name,kept){const F=FAM(),o=S.origin,f=F[o.family],kind=f.kind;
  const keep={child:S.child,voice:S.voice,music:S.music,vars:S.vars,ageBand:S.ageBand,oseed:S.oseed,originIdx:S.originIdx||0,songs:S.songs||[],alwaysYes:S.alwaysYes,pairsLevel:S.pairsLevel,fortLevel:S.fortLevel,runLevel:S.runLevel,catchLevel:S.catchLevel,stackLevel:S.stackLevel,fwShared:S.fwShared,lowfx:S.lowfx,wild:S.wild,quietHours:S.quietHours};
  const g=genEcho(kind);g.seed=o.seed;if(o.ramp)g.pal=o.ramp;g.look=F.animals[o.animal].look||f.look_default;g.name=name;g.family=f.label;
  S=Object.assign(keep,{kind,g,needs:keep.wild&&keep.wild.length?{food:80,play:80,rest:80,comfort:80}:{food:60,play:50,rest:80,comfort:60},bond:0,badges:[],talents:[],stickers:[],treasures:[],memories:[],memTags:[],seen:[],foods:[],met:now(),days:1,lastHello:new Date(now()).toDateString(),
    origin:{idx:o.idx,animal:o.animal,family:o.family,ramp:o.ramp||null,accent:null,src:o.src,declined:!!o.declined},setupDone:1});
  S.vars.origin_animal=F.animals[o.animal].word;S.vars.family=f.label;S.vars.family_plural=f.plural;S.vars.default_name=F.animals[o.animal].default_name||f.default_name;S.originIdx=(o.idx||0)+1;
  initDialogue();save();remember('The day we met in the meadow','met');
  home();if(window.Music)Music.home(kind);const l=B(kept?'named_kept':'named_reply');talk(l,3200);
  sess.fwBusy=1;setTimeout(()=>runConv(kind==='fox'?'slyte_where_from_v2':'whimber_where_from_v2',()=>{sess.fwBusy=0;toast('Tip: tap the buttons below to care for '+S.g.name)}),3400)}
// P7 every-session title: logo + tagline + "{name} is playing nearby!", Tap to start, lock top right. Auto-advance after 3 s.
async function obReturnTitle(go){await obLib();const e=E();
  h(`<div class="scene ${e.bg} ob obreturn"><div class="oblogo">ECHO</div><div class="obtag">${U('ui_tagline').replace(/^ECHO:\s*/,'')}</div><div class="obpanel small">${obFill(U('ui_title_hint'))}</div><button class="obtap" id="obgo">${U('ui_ob_tap_start')}</button>${obLock('tr')}</div>`);
  if(window.Music)Music.home(S.kind);obWireLock(()=>obReturnTitle(go));let done=false;const fin=()=>{if(done)return;done=true;clearTimeout(t);sess.nameCall=1;go()};
  const t=setTimeout(()=>{if(!document.querySelector('.full'))fin()},3000);$('.scene.ob').onclick=fin}
function nameCallLine(){if(S.nameChanged&&S.vars&&S.vars.child_named){S.nameChanged=0;save();return B('name_changed')}return B('name_call')}
// ---- Grown-ups corner (§5): hold the lock 3 s -> a x b question -> settings
function pcGate(back){let tries=0;const cool=+(localStorage.getItem('echo-pc-cool')||0);
  const q=()=>{const a=6+Math.floor(Math.random()*4);let b;do{b=13+Math.floor(Math.random()*17)}while(b%5===0||b===20);return [a,b]};
  SFX('ui_panel_open');
  const d=full('');d.classList.add('pcgate');let idle=null;const bump=()=>{clearTimeout(idle);idle=setTimeout(()=>{d.remove()},OBC.gate.idleMs)};
  const show=()=>{bump();if(Date.now()<+(localStorage.getItem('echo-pc-cool')||0)){d.innerHTML=`<div class="obpanel">${U('ui_pc_wrong')}</div><button class="btn" id="pcx">${U('ui_pc_done')}</button>`;d.querySelector('#pcx').onclick=()=>d.remove();return}
    const [a,b]=q();let ent='';d.dataset.a=a;d.dataset.b=b;
    d.innerHTML=`<div class="obpanel">${U('ui_pc_question',0,{gateA:a,gateB:b}).replace(' x ',' × ')}</div><div class="pcent" id="pcent">&nbsp;</div><div class="pcpad">${[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(k=>`<button class="btn pck" data-k="${k}" aria-label="${k==='⌫'?'Delete':k==='✓'?'OK':k}">${k==='⌫'?'Del':k==='✓'?'OK':k}</button>`).join('')}</div><button class="btn small" id="pcx">${U('ui_pc_done')}</button>`;
    d.querySelector('#pcx').onclick=()=>{clearTimeout(idle);SFX('ui_back');d.remove()};
    d.querySelectorAll('.pck').forEach(k=>k.onclick=()=>{bump();const v=k.dataset.k;SFX('ui_tap');if(v==='⌫')ent=ent.slice(0,-1);else if(v==='✓'){if(+ent===a*b){clearTimeout(idle);d.remove();return pcSettings(back)}SFX('ui_back');if(++tries>=OBC.gate.tries){localStorage.setItem('echo-pc-cool',Date.now()+OBC.gate.cooldownMs)}return show()}else if(ent.length<3)ent+=v;d.querySelector('#pcent').textContent=ent||'\u00a0'})};
  if(Date.now()<cool)tries=OBC.gate.tries;show()}
function pcSettings(back){const nm=S&&S.vars&&S.vars.child_named?S.child:'—',has=S&&S.kind,F=FAM();
  const tog=(id,lb,on)=>`<button class="pcrow" id="${id}" role="switch" aria-checked="${on?'true':'false'}"><span>${lb}</span><i class="pctog${on?' on':''}"></i></button>`;
  const d=full(`<div class="pchead"><i style="background-image:url(px/origin/lock.png)"></i>${U('ui_pc_title')}</div>
   <button class="pcrow" id="pcname"><span>Name</span><b>${nm}</b></button>
   ${has?`<button class="pcrow" id="pcecho"><span>Echo's name</span><b>${S.g.name}</b></button>`:''}
   <button class="pcrow" id="pcage"><span>Age range</span><b>${(S&&S.ageBand)||'7-8'}</b></button>
   ${tog('pcmusic','Music',!(S&&S.music===false))}${tog('pcvoice','Chirp sounds',!(S&&S.voice===false))}
   ${tog('pcyes','Echoes always say yes',!!(S&&S.alwaysYes))}
   ${has?tog('pcstay','Stay a while',!!(S.fw&&S.fw.paused)):''}${tog('pcshared','Shared device',!!(S&&S.fwShared))}${has?tog('pcholiday','Holiday mode',!!(S.holiday&&S.holiday.on))+`<div class="pcnote">Going away? Turn this on and ${S.g.name} takes a little holiday too. Needs and the 3-day goodbye timer pause. It ends when ${S.child||'your child'} next opens Echo.</div>`:''}
   <button class="pcrow" id="pcreset"><span>Start over</span><b>›</b></button>
   <div class="pcnote">${U('ui_pc_privacy')} No camera on this version. Echo only remembers the kind of animal and a colour.</div>
   <button class="btn" id="pcdone">${U('ui_pc_done')}</button>`);d.classList.add('pcset');
  const re=()=>{d.remove();pcSettings(back)};const need=()=>{if(!S){S={voice:true,music:true,vars:{},setupDone:0,oseed:Math.floor(Math.random()*2e9)+1,originIdx:0,songs:[]}}};
  d.querySelector('#pcmusic').onclick=()=>{need();S.music=S.music===false;save();if(window.Music)Music.refresh();re()};
  d.querySelector('#pcvoice').onclick=()=>{need();S.voice=S.voice===false;save();re()};
  d.querySelector('#pcyes').onclick=()=>{need();S.alwaysYes=!S.alwaysYes;save();re()};
  d.querySelector('#pcshared').onclick=()=>{need();S.fwShared=!S.fwShared;save();re()};
  const hb=d.querySelector('#pcholiday');if(hb)hb.onclick=()=>{const on=!(S.holiday&&S.holiday.on);holidaySet(on);if(on)sess.holidayStart=1;re()};
  if(has)d.querySelector('#pcstay').onclick=()=>{const f=fw();f.paused=!f.paused;save();re()};
  d.querySelector('#pcage').onclick=()=>{need();const L=Object.keys(OBC.bands);obSetBand(L[(L.indexOf(S.ageBand||'7-8')+1)%L.length]);save();re()};
  d.querySelector('#pcname').onclick=()=>{need();const p=full(`<div class="obpanel"><b>Name or nickname</b></div><div class="obfield"><input id="pcnm" maxlength="10" autocomplete="off" autocorrect="off" spellcheck="false" value="${S.vars.child_named?S.child:''}" aria-label="Name or nickname"></div><p class="obsmall" id="pcnh"></p>
      <div class="row"><button class="btn small" id="pcnok">Save</button><button class="btn small" id="pcnno">Use no name</button><button class="btn small" id="pcnfg">Forget name</button><button class="btn small" id="pcnx">${U('ui_pc_done')}</button></div>`);
    p.classList.add('pcset','pcsub');p.querySelector('#pcnx').onclick=()=>p.remove();
    p.querySelector('#pcnok').onclick=()=>{const c=obNameCheck(p.querySelector('#pcnm').value);if(!c.ok){p.querySelector('#pcnm').value='';p.querySelector('#pcnh').textContent=U('ui_ob_name_again');return}if(c.name!==S.child)S.nameChanged=1;S.child=c.name;S.vars.child_named=1;delete S.childHidden;save();p.remove();re()};
    p.querySelector('#pcnno').onclick=()=>{if(S.vars.child_named)S.childHidden=S.child;S.child='friend';delete S.vars.child_named;save();p.remove();re()};   // keeps it on the device, unused
    p.querySelector('#pcnfg').onclick=()=>{delete S.childHidden;S.child='friend';delete S.vars.child_named;save();p.remove();re()}};   // erased
  if(has)d.querySelector('#pcecho').onclick=()=>{const p=full(`<div class="obpanel"><b>Echo's name</b></div><div class="obfield"><input id="pcen" maxlength="10" autocomplete="off" autocorrect="off" spellcheck="false" value="${S.g.name}" aria-label="Echo's name"></div><p class="obsmall" id="pceh"></p><div class="row"><button class="btn small" id="pceok">Save</button><button class="btn small" id="pcekp">Just "${(S.vars&&S.vars.default_name)||F.byKind[S.kind].default_name}"</button><button class="btn small" id="pcex">${U('ui_pc_done')}</button></div>`);
    p.classList.add('pcset','pcsub');p.querySelector('#pcex').onclick=()=>p.remove();p.querySelector('#pcekp').onclick=()=>{S.g.name=(S.vars&&S.vars.default_name)||F.byKind[S.kind].default_name;save();p.remove();re()};
    p.querySelector('#pceok').onclick=()=>{const c=obNameCheck(p.querySelector('#pcen').value);if(!c.ok){p.querySelector('#pcen').value='';p.querySelector('#pceh').textContent=U('ui_ob_name_again');return}S.g.name=c.name;save();p.remove();re()}};
  d.querySelector('#pcreset').onclick=()=>pcReset(d);
  d.querySelector('#pcdone').onclick=()=>{SFX('ui_panel_close');d.remove();if(S&&S.kind&&document.getElementById('sc'))home();else if(back)back()}}
function pcReset(set){const R=UA('ui_pc_reset');const d=full(`<div class="obpanel">${R[0]}</div><button class="btn pchold" id="pchold"><span>${R[1]}</span><i class="pcbar"></i></button><button class="btn small" id="pcrx">${U('ui_pc_done')}</button>`);d.classList.add('pcreset','pcsub');
  d.querySelector('#pcrx').onclick=()=>d.remove();const b=d.querySelector('#pchold');let t=null;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('hold');t=setTimeout(()=>{window.__wiped=1;localStorage.removeItem(KEY);localStorage.removeItem('echo-pc-cool');d.innerHTML=`<div class="obpanel">${R[2]}</div>`;setTimeout(()=>location.reload(),1600)},OBC.gate.holdMs)});
  const up=()=>{clearTimeout(t);b.classList.remove('hold')};b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up)}
function renderBadge(){const el=$('#bond');if(!el)return;if(renderBadge.b!=null&&S.bond>renderBadge.b)SFX('bond_meter_tick',{gap:800,vol:.5});renderBadge.b=S.bond;const f=S.bond/500;el.setAttribute('aria-label','Bond '+S.bond+' of 500');el.innerHTML=`<i class="pxheart"></i>`+[0,1,2,3,4].map(i=>`<i class="seg${f>i/5+.001?' on':''}"></i>`).join('')}
function home(greet){
  ov.innerHTML='';if(S.left)return leaveScreen();
  const e=E(), m=mood(), w=want(), ready=fwShowPath();
  h(`<div class="top"><button class="badge" id="bond" style="border:0;color:#fff"></button><b>${S.g.name}</b><div class="row">${ready?`<button class="btn small ico" id="fwl" aria-label="Farewell list">${PI('📜')}</button>`:''}<button class="btn small ico" id="book" aria-label="Memory Book">${PI('📖')}</button><button class="btn small ico" id="how" aria-label="How am I?">${PI('🤔')}</button></div></div>
   <div class="scene ${e.bg} pxscene sc-${curScene().id}" id="sc" style="${scStyle()}">${fwHomeBits()}
   ${curScene()===scHome()&&curScene().id!=='branch'?fortProp():''}   ${meterHTML()}<div class="creature idle" id="cr">${svg(S.kind,S.g,m)}</div>${w&&m!=='sleep'?thoughtHTML(w):''}
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
  if(window.Alive)Alive.twinkle();
  if(m==='sleep'){{const b=napBed();if(b&&LIVE.st!=='napgo')lvPlace(b[0],b[1])}talk(B('napping'));setTimeout(()=>{if(S.napUntil<=now()&&!document.getElementById('gs')&&!document.querySelector('.fwscene'))home()},Math.max(500,S.napUntil-now()+200));return}
  if(greet)fwSession();
  if(greet&&fwGreet()){}
  else if(greet&&window.__foundScene!==undefined&&!ready){const fs=window.__foundScene;window.__foundScene=undefined;lvStart(true,!!fs);if(sess.nameCall){sess.nameCall=0;const nc=nameCallLine();setTimeout(()=>talk(nc,1800),200)}}
  else if(greet){talk(sess.nameCall?(sess.nameCall=0,nameCallLine()):B('hello'));setTimeout(()=>{const b=$('#b');if(document.getElementById('feed')&&!ov.innerHTML.trim()&&!document.querySelector('.full')&&b)talk(B('time_'+tod()))},4200)}
  thoughtSync();if(LIVE.st!=='found')lvStart(false);
  if(sess.holidayStart){sess.holidayStart=0;setTimeout(()=>talk(nvB('holidayStart'),3200),600)}else if(greet&&(sess.holidayBack||sess.awayNote||sess.awayTreasure))setTimeout(()=>{if(document.getElementById('feed'))awayOnHome()},3000);
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
  c.style.setProperty('left',x+'px','important');c.style.setProperty('bottom',(H-y)+'px','important');c.style.zIndex=String(10+Math.round(y/10));thoughtSync();
  const px=c.querySelector('.px-echo');if(px&&face!=null&&px.classList.contains('lvflip')!==(face<0)){px.classList.toggle('lvflip',face<0);PIXEL.blink(px)}}   // blink on turn (B1)
function lvIdleDelay(){const fox=S.kind==='fox';return ((fox?8:10)+Math.random()*(fox?12:15))*1000*(C.livingSpeed||1)}
function lvClear(){clearInterval(LIVE.timer);LIVE.timer=null;clearTimeout(LIVE.actT);clearTimeout(LIVE.noticeT);document.querySelectorAll('#sc .lvfx').forEach(e=>e.remove());const px=document.querySelector('#cr .px-echo');if(px)px.classList.remove('lvtilt');if(px&&window.PIXEL&&PIXEL.fly)PIXEL.fly(px,false);const c=lvEl();if(c)c.classList.remove('lvmoving')}
function lvMove(to,done,fast){   // Slyte trots on the ground (2 px/tick, 3 when called over); Whimber flies a quadratic arc (3 px/tick, apex 12-20 px)
  lvClear();const [x0,y0]=LIVE.pos||lvDef().wp.stage,[x1,y1]=to,fox=S.kind==='fox',d=Math.hypot(x1-x0,y1-y0);
  if(d<1){done&&done();return}
  const sp=fast?Math.max(3,d/22):(fox?2:3),n=Math.max(1,Math.ceil(d/sp)),apex=fox?0:Math.min(24,12+d/12),hopUp=fox&&y1<y0-20,step=lowFx()?2:1;let i=0;
  const c=lvEl();if(c)c.classList.add('lvmoving');if(!fox){const p=c&&c.querySelector('.px-echo');if(p&&PIXEL.fly)PIXEL.fly(p,true);else setExpr('excited')}
  LIVE.timer=setInterval(()=>{i=Math.min(n,i+step);const t=i/n;let x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;
    if(!fox||hopUp)y-=4*(hopUp?10:apex)*t*(1-t);                 // flight arc / the fort hop chain
    else if(!lowFx()&&i<n)y-=(i>>1)%2;                                   // 1 px trot bob
    lvPlace(Math.round(x),Math.round(y),x1<x0?-1:1);
    if(i>=n){clearInterval(LIVE.timer);LIVE.timer=null;if(c)c.classList.remove('lvmoving');if(!fox){const p=c&&c.querySelector('.px-echo');if(p&&PIXEL.fly)PIXEL.fly(p,false);setExpr(baseExpr())}thoughtSync();done&&done()}},83)}
function lvFx(src,x,y,cls,ms){const sc=$('#sc');if(!sc)return;const e=document.createElement('i');e.className='lvfx '+(cls||'');e.style.cssText=`left:${x}px;top:${y}px;background-image:url(${src})`;sc.appendChild(e);setTimeout(()=>e.remove(),ms||1500)}
function lvDo(name,dur){   // run a behaviour at the current spot for dur ms
  const fox=S.kind==='fox',[x,y]=LIVE.pos,top=y-48;LIVE.act=name;LIVE.log.push(name);const fx=lowFx()?0:1;
  const z=()=>{if(fx)lvFx('px/living/z.png',x+12,top-4,'rise',1500)};
  const A={
    leaf_pounce:()=>{react('excited');for(let k=0;k<(fx?4:1);k++)lvFx(`px/living/leaf_${k%3}.png`,x-20+k*10,y-14,'scatter s'+k,900);LIVE.actT=setTimeout(()=>{react('excited');for(let k=0;k<(fx?3:0);k++)lvFx(`px/living/leaf_${k%3}.png`,x-14+k*10,y-14,'scatter s'+k,900)},1500)},
    sniff:()=>setExpr('curious'),
    trinket:()=>{setExpr('giggling');lvFx('px/living/trinket.png',x+18,y-16,'roll',dur)},
    curl_nap:()=>{let k=0;const turn=setInterval(()=>{const px=document.querySelector('#cr .px-echo');if(px)px.classList.toggle('lvflip');if(++k>=6){clearInterval(turn);setExpr('sleepy');z();LIVE.zT=setInterval(z,1600)}},166)},
    moon_yip:()=>{setExpr('excited');say('Yip!','excited');LIVE.actT=setTimeout(()=>say('Yip!','excited'),1000)},
    fort_flag:()=>setExpr('proud'),
    sunrise:()=>{setExpr('happy');react('happy');if(fx)lvFx('px/i_sparkle.png',x+16,top,'rise',1200)},
    lullaby:()=>{setExpr('happy');say('Hoo…','happy');let k=0;LIVE.zT=setInterval(()=>{if(fx||k%3===0)lvFx('px/living/note.png',x+8+(k%3)*8,top+4,'rise',1500);k++},500)},
    stargaze:()=>{setExpr('thinking')},
    nap:()=>{setExpr('sleepy');z();LIVE.zT=setInterval(z,1600)},
    read:()=>{setExpr('thinking');if(S.kind!=='fox')lvFx('px/i_book.png',x+14,y-18,'',dur)},
    lantern:()=>setExpr('curious'),preen:()=>setExpr('shy'),hop:()=>react('happy'),
    giggle:()=>{setExpr('giggling');react('happy')},peek:()=>setExpr('shy'),think:()=>setExpr('thinking'),warm:()=>setExpr('happy'),excited:()=>{setExpr('excited');react('excited')},
    tilt:()=>{setExpr('curious')}};
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
function lvModal(){const sc=document.getElementById('sc');if(!sc)return false;const m=!!document.querySelector('.full,.book,.panel,.bondup');if(m){const t=document.getElementById('toast');if(t)t.classList.remove('on')}
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
      onDone:()=>{window.__bondup=null;if(window.Music)Music.duck(false);cr.style.visibility='';if(live&&!document.getElementById('gs')){renderBadge();SFX('bond_meter_tick');home();if(to>=3&&to<=5)setTimeout(()=>{if(document.getElementById('feed')&&!document.querySelector('.full,.bondup')){const px=document.querySelector('#cr .px-echo');if(px){px.classList.add('fwglance');setTimeout(()=>px.classList.remove('fwglance'),1200)}talk(B('bondup_after_'+to),3600)}},2000)}done&&done()}})})}
function talk(t,ms){const b=$('#b');if(!b||!t)return;let o=typeof t==='string'?{text:t}:t;if(o.expr)setExpr(o.expr);if(o.react)react(o.react);
  if(!o.text){if(o.gesture&&window.Alive)Alive.act(o.gesture);return}   // P5 act-out only: no bubble, the gesture plays
  if(window.Alive)Alive.onTalk(o);   // D1 say-do + B1 slow blink on love lines
  b.style.display='block';b.textContent=o.text;b.classList.toggle('soft',o.voice==='soft');if(o.caption){const c=document.createElement('small');c.className='cap';c.textContent=o.caption;b.appendChild(c)}b.style.animation='none';void b.offsetWidth;b.style.animation='';say(o.text,o.expr,o.voice==='soft');clearTimeout(talk.t);
  talk.t=setTimeout(()=>{if(b)b.style.display='none';if(o.expr&&S&&S.kind&&$('#cr'))setExpr(baseExpr())},ms||Math.max(3000,o.text.length*70))}
function baseExpr(){const m=mood();return m==='sleep'?'sleepy':m==='happy'?'happy':'neutral'}
function hop(){react('happy')}
function asleep(){if(S.napUntil>now()){toast('Shh… napping');return true}}
// two-tap reply choices (S9)
function choices(list,cb,opts){
  let sel=-1;opts=opts||{};ov.innerHTML=`<div class="choices">${list.map((c,i)=>`<button class="btn" data-i="${i}">${PI(c[0],c[2])}<span class="lbl">${c[1]}</span></button>`).join('')}<div class="hint">Tap to hear · tap again to choose</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;SFX('ui_tap');opts.onTap&&opts.onTap(i);if(sel===i){ov.innerHTML='';cb(i);return}sel=i;ov.querySelectorAll('button').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');say(list[i][1])});
}
// H1 need-aware selection (aliveness/selection/need_select.js). Weather: no weather system in v1, so lines tagged with
// rain/wind/fog stay out; snow lines only in Dec-Feb by device month (Daniel's default).
function snowSeason(){const m=new Date(now()).getMonth();return m===11||m<=1}
function needCtx(){return {needs:S.needs,species:S.kind==='fox'?'slyte':'whimber',band:tod(),weather:snowSeason()?'snow':'clear'}}
function needLine(){if(!window.NeedSelect)return B('ambient');const r=NeedSelect.slot(needCtx());return (r&&r.line)||B('ambient')}
function needInit(){if(!window.NeedSelect)return;const sp=S.kind==='fox'?'slyte':'whimber';NeedSelect.now=now;NeedSelect.tags=(window.NEED_TAGS||{})[sp]||{barks:{},convs:{}};
  if(!needInit.done){needInit.done=1;NeedSelect.session();
    const ok=v=>{const tg=NeedSelect.tags.convs[v.id]||[];return !tg.some(t=>t.startsWith('w_')&&!(t==='w_snow'&&snowSeason()))};   // weather chats follow the same rule
    const pc=NeedSelect.pickConversation;NeedSelect.pickConversation=ctx=>{const D=Dialogue,el=D.eligible;D.eligible=(tr,f)=>el(tr,v=>ok(v)&&(!f||f(v)));try{return pc(ctx)}finally{D.eligible=el}}}
  NeedSelect.cfg.weatherP=0}
function maybeChat(){
  const n=S.needs;
  if(fwCalm())return;
  if(sess.chats>=obMaxConv()||Math.random()<.35)return;
  if(!sess.cb&&Math.random()<.3){const cb=callbackLine();if(cb){sess.cb=1;fwTick('memory');sess.chats++;return setTimeout(()=>{if(document.getElementById('feed')&&!document.querySelector('.full'))talk(cb)},1800)}}
  const conv=window.NeedSelect?NeedSelect.pickConversation(needCtx()):Dialogue.pickConversation('idle'); if(!conv)return; sess.chats++;
  setTimeout(()=>{if(!document.getElementById('feed')||document.querySelector('.full'))return;runConv(conv)},1800);
}
function initDialogue(){needInit();Dialogue.now=now;S.dlg=S.dlg||{};Dialogue.mem=S.dlg;Dialogue.cfg.carryOnMs=C.carryOnSeconds*1000;Dialogue.setPersona(S.g.seed);Dialogue.prune()}
function runConv(conv,done,depth){depth=depth||0;if(typeof conv==='string')conv=Dialogue.lib.conversations.find(c=>c.id===conv);if(!conv)return done&&done();
  Dialogue.run(conv,{cancelChoices:()=>{ov.innerHTML=''},tangent:()=>B('tangent'),tangentRate:0.10+0.20*Math.max(0,Math.min(1,((S.g.playful||.75)-.5)/.5)),say:(l,ms)=>{if(!document.getElementById('gs'))talk(l,ms)},choose:(list,cb,o)=>{if(!document.getElementById('gs'))choices(list,cb,o)},   // a game opened mid-talk: the talk just ends
    setVar:(k,v)=>{(S.vars=S.vars||{})[k]=v;save()},
    remember:(t,tag)=>remember(t,tag),bond:n=>addBond(n,false,'choice'),react:k=>react(k),seen:id=>{(S.seen=S.seen||[]).push(id);save()}},(info)=>{addBond(0,false,'reply');save();
    // drift to a linked topic or lose the thought (Overhaul B7); session limit still applies
    const onHome=()=>document.getElementById('feed')&&!document.querySelector('.full');
    const nx=info&&info.carriedOn?null:Dialogue.afterConversation(conv,depth);
    if(nx&&nx.type==='lost'&&onHome()){talk(nx.line);sess.lost=(sess.lost||0)+1}
    else if(nx&&nx.type==='drift'&&sess.chats<obMaxConv()&&onHome()){sess.chats++;sess.drift=(sess.drift||0)+1;talk(nx.line);
      return setTimeout(()=>{if(onHome())runConv(nx.conv,done,depth+1)},2600)}
    done&&done()},depth);
}
// F2: bigger food list (foods.js from aliveness/foods.json), seeded likes and gentle dislikes. F1: the food arrives and is eaten.
function fhash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function foodList(){return ((window.FOODS||{})[S.kind==='fox'?'slyte':'whimber'])||[]}
function foodLabel(f){return f.emoji+' '+f.name}
function foodTaste(f){const favName=(S.g.fav||'').split(' ').slice(1).join(' ');if(f.name===favName||foodLabel(f)===S.g.fav)return 'favorite';
  const r=fhash((S.g.seed||1)+':'+f.id)%100;
  if(f.taste==='not_for_me')return r<34?'not_for_me':'okay';                 // ~2 of 6 not-for-me foods per Echo; the rest are just okay
  if(f.taste==='like')return r<15?'love':'like';                              // a couple of surprise loves
  if(f.taste==='favorite_pool')return 'like';return f.taste}
function foodByLabel(l){return foodList().find(f=>foodLabel(f)===l)||foodList().find(f=>f.name===(l||'').split(' ').slice(1).join(' '))}
function foodMenu(){const L=foodList(),tried=new Set(S.foods),pick=a=>a.length?a[Math.floor(Math.random()*a.length)]:null;
  const fav=L.find(f=>foodTaste(f)==='favorite')||L[0];const loved=L.filter(f=>['love','favorite'].includes(foodTaste(f))&&tried.has(foodLabel(f)));
  const a=Math.random()<.5||!loved.length?fav:pick(loved);
  const b=pick(L.filter(f=>f!==a&&['like','okay'].includes(foodTaste(f))&&tried.has(foodLabel(f))))||pick(L.filter(f=>f!==a&&['like','okay','love'].includes(foodTaste(f))));
  sess.dmenu=(sess.dmenu||0)+1;const dOK=!sess.lastDislikeMenu||sess.dmenu-sess.lastDislikeMenu>=4;   // at most 1 possible dislike, at most 1 dislike menu in 4
  let fresh=L.filter(f=>f!==a&&f!==b&&!tried.has(foodLabel(f)));if(!dOK)fresh=fresh.filter(f=>foodTaste(f)!=='not_for_me');
  const c=pick(fresh)||pick(L.filter(f=>f!==a&&f!==b&&foodTaste(f)!=='not_for_me'));if(c&&foodTaste(c)==='not_for_me')sess.lastDislikeMenu=sess.dmenu;
  return [a,b,c].filter(Boolean).sort(()=>Math.random()-.5)}
function foodIcon(f){return `<i class="pxi" data-icon="${f.icon.slice(2)}" style="background-image:url(px/${f.icon}.png)"></i>`}
function feed(){
  if(asleep())return;
  if(S.needs.food>=NeedsV2.full)return talk(B('food_decline'));if(sess.feeds>=C.sessionLimits.feeds)return talk(B('full'));   // needs v2: full (>= 90) politely declines, no bond
  if(!foodList().length)return feedOld();
  const pool=foodMenu();
  ov.innerHTML=`<div class="choices">${pool.map((f,i)=>`<button class="btn" data-i="${i}">${foodIcon(f)}<span class="lbl">${f.name}</span></button>`).join('')}<div class="hint">Tap a food to feed</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{ov.innerHTML='';const f=pool[+b.dataset.i],tier=foodTaste(f),T=FOODS.tiers[tier],lbl=foodLabel(f),fav=tier==='favorite',first=!S.foods.includes(lbl);sess.feeds++;
    if(window.NeedSelect){NeedSelect.pressures(S.needs,S.kind==='fox'?'slyte':'whimber',tod());needMet('hungry')}
    S.needs.food=clamp(S.needs.food+T.food);if(first)S.foods.push(lbl);(S.foodTiers=S.foodTiers||{})[lbl]=tier;   // a disliked food still restores +15
    addBond(0,false,fav?'feedFav':'feed');SFX('care_feed_eat');if(fav)fwTick('food');save();
    if(fav&&!(S.memTags||[]).includes('favfood'))remember(`You found my favorite food: ${lbl}`,'favfood');
    if(tier==='not_for_me'&&first)remember(FOODS.tiers.not_for_me.memory.replace('{food}',f.name),'food_'+f.id);
    const line=()=>{const own=Dialogue.bark('food_'+f.id);talk(fav?B('fed_fav'):tier==='not_for_me'?(own||B('fed')):(Math.random()<.6&&own)||B('fed'))};
    if(window.Alive)Alive.food(f,tier,()=>{if(document.getElementById('feed'))line();maybeChat()});else{hop();setExpr('eating');line();maybeChat()}});
}
function feedOld(){const e=E();
  const pool=[...e.foods].sort(()=>Math.random()-.5).slice(0,2); if(!pool.includes(S.g.fav))pool[0]=S.g.fav; pool.push(e.neutral[0]); pool.sort(()=>Math.random()-.5);
  ov.innerHTML=`<div class="choices">${pool.map((f,i)=>`<button class="btn" data-i="${i}">${PI(f.split(' ')[0])}<span class="lbl">${f.split(' ').slice(1).join(' ')}</span></button>`).join('')}<div class="hint">Tap a food to feed</div></div>`;
  ov.querySelectorAll('button').forEach(b=>b.onclick=()=>{ov.innerHTML='';const f=pool[+b.dataset.i],fav=f===S.g.fav;sess.feeds++;
    S.needs.food=clamp(S.needs.food+(fav?C.restore.foodFav:C.restore.food));if(!S.foods.includes(f))S.foods.push(f);
    addBond(0,false,fav?'feedFav':'feed');SFX('care_feed_eat');hop();setExpr('eating');setTimeout(()=>talk(B(fav?'fed_fav':'fed')),fav?900:0);if(fav)fwTick('food');if(fav&&!(S.memTags||[]).includes('favfood'))remember(`You found my favorite food: ${f}`,'favfood');save();maybeChat()});
}
function comfort(){
  if(asleep())return; const e=E();
  choices([['✋','Pet',null],['🌙','Sit together',null]],i=>{
    if(i===0){pet();return}
    const sc=$('#sc');sc.style.filter='brightness(.75) saturate(1.2)';if(window.Alive)Alive.sit(true);talk(B('sit'),C.sitSeconds*1000);ov.innerHTML='<div class="choices"><div class="hint">…sitting together…</div></div>';
    setTimeout(()=>{ov.innerHTML='';sc.style.filter='';if(window.Alive)Alive.sit(false);needMetComfort();S.needs.comfort=clamp(S.needs.comfort+C.restore.sit);addBond(0,false,'sit');S.sits=(S.sits||0)+1;fwTick('cozy');SFX('care_pet_sparkle');hop();maybeChat()},C.sitSeconds*1000);
  });
}
function needMet(st){if(window.NeedSelect&&NeedSelect.mem.on[st])NeedSelect.satisfied(st)}   // H1: a met need mutes its cues and queues one afterglow line
function pet(){if(asleep())return;const hf=S.needs.comfort>=NeedsV2.full;SFX('care_pet_sparkle',{gap:400});needMetComfort();S.needs.comfort=clamp(S.needs.comfort+C.restore.pet);addBond(0,false,'pet');hop();if(window.Alive)Alive.petFx();talk(B(hf?'hug_full':'pet'),1800)}
function needMetComfort(){if(window.NeedSelect){NeedSelect.pressures(S.needs,S.kind==='fox'?'slyte':'whimber',tod());needMet('cuddly')}}
function hug(){if(asleep())return;const hf=S.needs.comfort>=NeedsV2.full;SFX('care_pet_sparkle',{gap:400});needMetComfort();S.needs.comfort=clamp(S.needs.comfort+C.restore.pet);addBond(0,false,'pet');save();   // E1 press-and-hold hug
  const q=window.NeedSelect&&NeedSelect.mem.queue,i=q?q.indexOf('after_hug'):-1;if(hf)talk(B('hug_full'),1800);else if(i>=0){q.splice(i,1);talk(B('after_hug'),2600)}else talk(B('pet'),1800)}   // hugs are never refused
function rest(){
  const e=E(); if(sess.naps>=C.sessionLimits.naps)return talk(B('not_sleepy'));
  sess.naps++;if(window.NeedSelect){NeedSelect.pressures(S.needs,S.kind==='fox'?'slyte':'whimber',tod());needMet('sleepy')}const fav=S.badges.includes('place');S.needs.rest=clamp(S.needs.rest+(fav?C.restore.restFav:C.restore.rest));S.needs.play=clamp(S.needs.play);
  S.napUntil=now()+C.napSeconds*1000;const from=curScene();S.scene=scHome().id;   // bedtime: the Echo goes home (scenes.md §6); saved at once, shown after the wipe
addBond(0,true,'nap');SFX('care_nap_tuck');save();talk(B('nap'));napTravel(from);
}
// v1.1 nap option A (aliveness/v1_1_motion): yawn, trot / fly off the right-most exit, 6-step curtain wipe, enter home from the
// opposite edge and settle on the bed waypoint (Slyte: tree_base curl, Whimber: hollow_door). Reduced motion keeps the old cut.
const NAP_BED={fox:'tree_base',owl:'hollow_door'};
function napBed(){return scWp(NAP_BED[S.kind]||'stage')||scWp('stage')}
function napSettle(){LIVE.st='present';if(S.napUntil<=now())return;lvDo(S.kind==='fox'?'curl_nap':'nap',0)}
// reduced motion (lowFx / prefers-reduced-motion): option B dusk fade. A 6-step ordered dither in warm plum (never black), the
// scene swaps under full cover with the Echo already on its bed, one gold star twinkles, and the dither steps back out.
function napDusk(){setTimeout(()=>{const s=SCR();if(!s||!document.getElementById('cr'))return;const d=document.createElement('div');d.className='scdusk';s.appendChild(d);let i=0;
  const t=setInterval(()=>{i++;d.style.backgroundImage=`url(px/alive/dusk${Math.min(i,6)}.png)`;if(i===6){clearInterval(t);LIVE.st='present';home();
    const st=document.createElement('i');st.className='scduskstar';d.appendChild(st);
    setTimeout(()=>{st.remove();let k=6;const t2=setInterval(()=>{k--;d.style.backgroundImage=k?`url(px/alive/dusk${k}.png)`:'none';if(!k){clearInterval(t2);d.remove()}},166)},700)}},166)},900)}
function napTravel(from){const hm=scHome(),fox=S.kind==='fox';lvStop();LIVE.st='napgo';$('#sc')&&$('#sc').classList.add('lvaway');
  if(lowFx())return napDusk();
  const exits=w=>w.wp.filter(x=>/exit/.test(x.kind));
  setTimeout(()=>{if(!document.getElementById('cr'))return;
    if(from.id===hm.id){lvMove(napBed(),()=>{LIVE.st='present';home();napSettle()});return}
    const ex=exits(from).sort((a,b)=>b.xy[0]-a.xy[0])[0],right=ex.xy[0]>90,ent=exits(hm).find(x=>(x.xy[0]>90)!==right)||exits(hm)[0];
    lvMove([ex.xy[0],Math.max(52,ex.xy[1]-SC_OY)],()=>{
      const w=document.createElement('div');w.className='scwipe';w.style.background=(SCENES.wipe||{})[from.id+'_'+scVariant()]||'';SCR().appendChild(w);   // the left scene's SKY1
      setTimeout(()=>{home();lvPlace(ent.xy[0],Math.max(52,ent.xy[1]-SC_OY),right?1:-1);
        setTimeout(()=>{w.remove();lvMove(napBed(),napSettle,true)},380)},330)},true)},900)}
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
  <button class="btn" id="b1">+60 bond</button><button class="btn" id="b2">Jump to Ready</button><button class="btn" id="b3">New session</button><button class="btn" id="b7">+1 day</button><button class="btn" id="b9">Calm effects ${S.lowfx?'on':'off'}</button><button class="btn" id="b10">Short bond-ups ${S.shortBondUp?'on':'off'}</button><button class="btn" id="b11">Music ${S.music===false?'off':'on'}</button><button class="btn" id="b4">Sound ${S.voice?'on':'off'}</button><button class="btn" id="b14">Grown-ups corner</button><button class="btn" id="b5">Delete everything</button><button class="btn" id="b9">Pairs level: ${S.pairsLevel||'auto'}</button><button class="btn" id="b8">Fort level: ${S.fortLevel||'auto'}</button>${['run','catch','stack'].map(k=>`<button class="btn" id="bl_${k}">${k} level: ${S[k+'Level']||'auto'}</button>`).join('')}<button class="btn" id="b6">Close</button></div>`);
  const cl=()=>d.remove();
  d.querySelector('#b9').onclick=()=>{S.lowfx=!S.lowfx;save();cl();dev()};d.querySelector('#b10').onclick=()=>{S.shortBondUp=!S.shortBondUp;save();cl();dev()};
  d.querySelector('#b11').onclick=()=>{S.music=S.music===false;save();if(window.Music)Music.refresh();cl();dev()};
  d.querySelector('#b1').onclick=()=>{cl();addBond(60/C.demoSpeed);home()};
  d.querySelector('#b2').onclick=()=>{cl();addBond(500);S.met=Math.min(S.met||now(),now()-8*864e5);S.days=Math.max(S.days||1,6);sess.t0=now()-36e5;S.bondShown=Math.max(S.bondShown||1,4);home()};
  d.querySelector('#b3').onclick=()=>{cl();sess={feeds:0,games:0,naps:0,chats:0};S.napUntil=0;S.last=now()-6*36e5;simulate();save();home(true)};
  d.querySelector('#b4').onclick=()=>{S.voice=!S.voice;save();if(window.Music)Music.refresh();cl()};
  d.querySelector('#b5').onclick=()=>{if(confirm('Delete the Echo, memories and keepsakes?')&&confirm('Really delete everything?')){window.__wiped=1;localStorage.removeItem(KEY);location.reload()}};
  d.querySelector('#b6').onclick=cl;
  d.querySelector('#b14').onclick=()=>{cl();pcSettings()};   // shared device + stay a while moved to the grown-ups corner (onboarding §5)
  d.querySelector('#b9').onclick=()=>{const L=['auto','easy','standard','bigkid'];S.pairsLevel=L[(L.indexOf(S.pairsLevel||'auto')+1)%4];save();d.querySelector('#b9').textContent='Pairs level: '+S.pairsLevel};
  d.querySelector('#b8').onclick=()=>{const L=['auto','easy','standard','bigkid'];S.fortLevel=L[(L.indexOf(S.fortLevel||'auto')+1)%4];save();d.querySelector('#b8').textContent='Fort level: '+S.fortLevel};
  ['run','catch','stack'].forEach(k=>{const b=d.querySelector('#bl_'+k);if(b)b.onclick=()=>{const L=['auto','easy','standard','bigkid'],K=k+'Level';S[K]=L[(L.indexOf(S[K]||'auto')+1)%4];save();b.textContent=k+' level: '+S[K]}});
  d.querySelector('#b7').onclick=()=>{cl();S.clockOffset=(S.clockOffset||0)+864e5;sess={feeds:0,games:0,naps:0,chats:0};S.napUntil=0;simulate();save();home(true);toast('A day passes…')};
}
function book(){
  const e=E(),d=document.createElement('div');d.className='book';
  d.innerHTML=`<button class="btn small ico" style="float:right" id="x" aria-label="Close">${PI('✕')}</button><h1 style="margin:0">${PI('📖')} Memory Book</h1>${obLock('bk')}${S.badges.includes('place')&&scUnlocked().length>1?`<button class="btn small" id="places">${PI('🌲')}<span class="lbl">Our places</span></button>`:''}
  <div class="bkportrait">${svg(S.kind,S.g,'happy')}</div><b>${S.g.name}</b> — ${e.name}, ${e.title}<br><small>Quirk: ${S.g.quirk} · ${S.days} day(s) together</small>
  ${S.keepsake?`<h2>Keepsakes</h2><span class="chip">${PI(S.keepsake.type==='glowleaf'?'🍂':'💫')}${S.keepsake.name}</span>`:''}
  <h2>Stickers</h2>${S.stickers.map(s=>`<span class="chip">${PI('🌟')}${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Talents</h2>${S.talents.map(s=>`<span class="chip">${PI('✨')}${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Foods discovered</h2>${S.foods.map(s=>{const f=foodByLabel(s),t=f?foodTaste(f):(s===S.g.fav?'favorite':'like');   // heart = favourite, star = love, leaf = not my favourite (never an X)
    return `<span class="chip">${f?foodIcon(f):PI(s.split(' ')[0])}${s.split(' ').slice(1).join(' ')}${t==='favorite'?PI('❤️'):t==='love'?PI('⭐'):t==='not_for_me'?PI('🍃'):''}</span>`}).join('')||'<i>none yet</i>'}
  ${S.kind?`<h2>Our ${S.kind==='fox'?'treehouse fort':'tree hollow'}</h2><div class="fortbook">${fortProp()}<span>Homes built: ${fortState().homes}${fortState().decor?' · decorations: '+fortState().decor:''}</span></div>`:''}
  ${(S.bondMoments||[]).length?`<h2>${PI('✨')} Bond moments</h2>`+S.bondMoments.map((m,i)=>`<div class="chip bmom">Bond up! ${BondUp.NAMES[m.to]} · day ${m.day||1} <button class="btn small" data-replay="${i}">Replay</button></div>`).join(''):''}
  <h2>Treasures</h2>${S.treasures.map(s=>`<span class="chip">${PI('💎')}${s}</span>`).join('')||'<i>none yet</i>'}
  <h2>Things we figured out</h2>${S.memories.slice(-12).map(s=>`<div class="chip">${s}</div>`).join('')||'<i>none yet</i>'}
  ${(S.wild||[]).length?`<h2>${PI('🍃')} Friends in the wild</h2>`+S.wild.map(w=>`<p class="mline">${w.name} · ${w.family||''} · ${'★'.repeat(Math.max(1,Math.min(9,w.stage||1)))}</p>`).join(''):''}
  ${S.checkins&&S.checkins.some(k=>k.delivered)?`<h2>${PI('🖼️')} Letters from the wild</h2>`+S.checkins.filter(k=>k.delivered).map((k,i)=>postcardHTML(k,i,true)).join(''):S.postcards&&S.postcards.length?'<h2>Letters from the wild</h2>'+S.postcards.map(p=>`<div class="postcard">${p}</div>`).join(''):''}`;
  SFX('ui_panel_open');SCR().appendChild(d);try{lvModal()}catch(e){}obWireLock(null);d.querySelector('#x').onclick=()=>{SFX('ui_back');d.remove();setTimeout(lvModal,50)};
  const pl=d.querySelector('#places');if(pl)pl.onclick=scPicker;
  d.querySelectorAll('[data-replay]').forEach(btn=>btn.onclick=()=>{const m=S.bondMoments[+btn.dataset.replay];d.remove();playBondUp(m.from,m.to,false)});
}

// ---------- mini-games (§6.3) ----------
function play(){
  if(asleep())return; if(sess.games>=C.sessionLimits.games)return talk(B('game_tired'));
  if(S.needs.play>=NeedsV2.full)talk(B('play_full'),1800);   // games are never refused
  SFX('ui_panel_open');const start=g=>{sess.games++;S.needs.rest=clamp(S.needs.rest-5);g(0)};
  // Play picker (spec v0.3 §0; Night Sky cut): signature Pairs game (daily +3) + Builder on day 1, the runner at bond 70 (spec v0.6; bond 140 unlocks no game)
  const G=gamesFor();choices(G.map(x=>[x[0],x[1],null]),i=>start(G[i][2]));
}
let GT=0;   // game token: a pending next-round timer is dropped if the child left the game
function gamesFor(){const fox=S.kind==='fox',L=[[ '⭐',fox?'Shiny Pairs':'Starlight Pairs',memoryGame],[fox?'🏠':'🏡',fox?'Fort Builder':'Hollow Builder',fortBuilder]];
  if(S.bond>=C.unlock.catch)L.push([fox?'🍓':'🌟',fox?'Berry Catch':'Starfall Catch',catchGame]);
  if(S.bond>=C.unlock.run)L.push([fox?'🍂':'✨',fox?'Meadow Dash':'Moonlight Glide',runGame]);
  if(S.bond>=C.unlock.stack)L.push([fox?'🥞':'☁️',fox?'Pancake Tower':'Cloud Steps',stackGame]);return L}   // bond 70 (Talent 1); bond 140 unlocks no game (spec v0.6)
function gameShell(title){GT++;{const t=title.toLowerCase();curGame=/pairs/.test(t)?'pairs':/builder|hollow|fort/.test(t)?'builder':/dash|glide/.test(t)?'run':/catch/.test(t)?'catch':/tower|steps/.test(t)?'stack':null;if(curGame)(S.gameCounts=S.gameCounts||{})[curGame]=(S.gameCounts[curGame]||0)+1}if(window.Music){const t=title.toLowerCase(),fox=S.kind==='fox';Music.game(/pairs/.test(t)?(fox?'shiny_pairs':'starlight_pairs'):/builder/.test(t)?(fox?'fort_builder':'hollow_builder'):(fox?'meadow_dash':'moonlight_glide'))}const _t=document.getElementById('toast');if(_t)_t.classList.remove('on');h(`<div class="top"><b>${title}</b><button class="btn small" id="quit">Done</button></div><div class="scene ${E().bg}" id="gs"><div class="bubble" id="b" style="top:3%"></div></div>`);$('#quit').onclick=()=>{endGame(false)}}
let curGame=null;
function endGame(finished){GT++;if(finished)fwTick(null,curGame);if(sess.afterOneMore){sess.afterOneMore=0;save();home();return setTimeout(()=>{talk(B('after_one_more'),2600);setTimeout(fwTimeToGo,2700)},500)}if(window.NeedSelect)NeedSelect.pressures(S.needs,S.kind==='fox'?'slyte':'whimber',tod());if(finished){needMet('playful');S.needs.play=clamp(S.needs.play+C.restore.playFinish)}save();home();if(finished)talk(B('game_end'));maybeChat()}
function roundDone(round,next){S.needs.play=clamp(S.needs.play+C.restore.play);if(round>=2)addBond(0,true,'game');else addBond(0,true,'care');
  // signature-only daily bonus (spec §0/§4): first signature round of the day
  
  const t=GT;if(round>=2)setTimeout(()=>{if(t===GT)endGame(true)},2200);else setTimeout(()=>{if(t===GT)next(round+1)},2200)}


// ---------- needs v2 §4: away timeline (note, kind leave) and holiday mode. Bond is frozen, never lowered; nothing guilt-y ----------
const nvVars=()=>({child:S.child||'friend',name:S.g.name,fav:S.g.fav||''});
const NVK={note:'away_note',leave:'leave_postcard',leave2:'away_postcard_day7',holidayStart:'holiday_start',holidayBack:'holiday_end'};
const nvB=k=>B(NVK[k],nvVars()),nvLine=k=>(nvB(k)||{}).text||'';
function awayOnHome(){   // called from home(true): one gentle beat per open, no counting of days out loud
  if(sess.holidayBack){sess.holidayBack=0;return talk(nvB('holidayBack'),3200),true}
  if(sess.awayNote){sess.awayNote=0;remember(nvLine('note'),'note_'+new Date(now()).toDateString());talk(nvB('note'),5200);return true}
  if(sess.awayTreasure){sess.awayTreasure=0;S.treasures=S.treasures||[];S.treasures.push(E().treasure);remember(S.kind==='fox'?'I found you a shiny treasure while exploring':'I found you a glowing treasure while exploring','away_treasure');try{lvFound()}catch(e){}return true}
  return false}
function leaveScreen(){const L=S.left,canVisit=!L.revisited&&now()-L.at<14*864e5;if(now()>=L.card2&&!L.card2Shown){L.card2Shown=1;remember(nvLine('leave2'),'leave2')}
  if(!(S.memTags||[]).includes('leave'))remember(nvLine('leave'),'leave');save();
  h(`<div class="top"><b>${S.g.name}</b></div><div class="scene ${E().bg} pxscene" id="lv"><div class="mcard leavecard"><div class="mtop">${PI('✉️')}<span class="mt">A postcard</span></div><p class="mline">${nvLine('leave')}</p>${L.card2Shown?`<p class="mline">${nvLine('leave2')}</p>`:''}
    <div class="row">${canVisit?`<button class="btn" id="lvvisit">Visit ${S.g.name} again</button>`:''}<button class="btn" id="lvnew">Find a new friend</button><button class="btn small" id="lvbook">${PI('📖')}</button></div></div></div>`);
  if(canVisit)$('#lvvisit').onclick=()=>{L.revisited=1;delete S.left;S.leftBefore=L;for(const k in S.needs)S.needs[k]=70;S.last=now();save();home(true)};   // D4: once, same Echo, needs 70
  $('#lvnew').onclick=()=>{(S.wild=S.wild||[]).push({name:S.g.name,kind:S.kind,family:S.g.family,bond:S.bond,stage:stage(),memories:S.memories.slice(),left:L.at});S.setupDone=0;S.origin={};save();orSeen()};
  $('#lvbook').onclick=()=>{try{book()}catch(e){}}}
function holidaySet(on,until){S.holiday=on?{on:true,since:now(),until:until||null}:{on:false};save()}
// ---------- Games v2 shared kit (games_v2.md §3.0): flat rewards, best store, end card, HUD best, bonus glow, quiet auto-Easy ----------
const GTU=()=>window.GAMES_TUNING;
function gameReward(t0){const R=GTU().REWARD,n=(now()-t0)/1000<R.quitEarlyS?R.quitEarlyRounds:R.roundsPerGame;for(let i=0;i<n;i++)S.needs.play=clamp(S.needs.play+C.restore.play);if(n===R.roundsPerGame)addBond(0,true,'game');else addBond(0,true,'care');return n}   // needs v2 §2: +4 per finished game (6 a day); an early Done still counts as a visit
function bestStore(){S.best=S.best||{};['run','builder','catch','stack'].forEach(k=>S.best[k]=S.best[k]||{});return S.best}
function bestGet(gm,l){const b=bestStore()[gm][l];return (b&&b.score)||0}
function bestPut(gm,l,score,haul){const B=bestStore()[gm],o=B[l]=B[l]||{score:0},was=o.score||0,isBest=score>was,hb=haul!=null&&haul>(o.haul||0);if(isBest){o.score=score;o.at=now()}if(hb)o.haul=haul;return {isBest,was,haulBest:hb,haul:o.haul||0}}
function v2State(gm){S.v2=S.v2||{};return S.v2[gm]=S.v2[gm]||{games:0,short:0,easy:false}}
function v2Level(gm,key){const st=v2State(gm),set=S[key]||'auto';if(set!=='auto')return set;if(st.games<2)return 'easy';return st.easy?'easy':'standard'}   // never announced to the child
function v2Count(gm,score){const A=GTU().AUTO_EASY,th=A[gm],st=v2State(gm);st.games++;if(score<th)st.short++;else st.short=0;if(st.short>=A.shortInARow)st.easy=true;if(score>=A.backUpAt*th){st.easy=false;st.short=0}}
const GLOW=[0,1].map(i=>{const im=new Image();im.src=`px/fx/glow${i}.png`;return im});
function drawGlow(cx,x,y,t){const im=GLOW[lowFx()?0:(t/250|0)%2];if(im.complete&&im.naturalWidth)cx.drawImage(im,Math.round(x-20),Math.round(y-20))}
function hudBest(gm,l){const b=bestGet(gm,l);return b?`<span class="g2hud" id="g2best"><i></i>${b}</span>`:''}
const G2TITLE={run:['WHAT A RUN!','WHAT A GLIDE!'],builder:['WHAT A FORT!','WHAT A HOLLOW!'],catch:['WHAT A CATCH!','WHAT A CATCH!'],stack:['WHAT A TOWER!','WHAT A SKY STAIR!']};
function endCard(o){const gs=$('#gs');if(!gs||$('.g2card'))return;const fox=S.kind==='fox',low=lowFx(),n=gameReward(o.t0);window.__g2rounds=n;
  const bl=o.firstEver?'Our first best!':o.isBest?'NEW BEST!':`Best ${o.best}`;
  gs.insertAdjacentHTML('beforeend',`<div class="g2card${low?' low':''}" role="dialog" aria-label="${G2TITLE[o.game][fox?0:1]}"><b>${G2TITLE[o.game][fox?0:1]}</b><div class="g2num"><span id="g2n">${o.score}</span> ${o.unit}</div><div class="g2bl${o.isBest||o.firstEver?' gold':''}">${bl}</div>${(o.extra||[]).map(x=>`<div class="g2x">${x}</div>`).join('')}<div class="g2btns"><button class="btn" id="g2again">Again</button><button class="btn" id="g2done">Done</button></div></div>`);
  SFX('run_finale',{vol:.7});save();
  $('#g2done').onclick=()=>endGame(true);
  $('#g2again').onclick=()=>{if(sess.games>=C.sessionLimits.games){endGame(true);return setTimeout(()=>talk(B('game_tired')),400)}fwTick(null,curGame);sess.games++;S.needs.rest=clamp(S.needs.rest-5);save();o.onAgain()}}

// ---------- Fort Builder (game spec v0.2 §3): falling blocks that build the treehouse fort ----------
function fortState(){return S.fort=S.fort||{stage:0,decor:0,homes:0,rounds:0,slow:0,best:0}}
function fortLevel(){const f=fortState(),set=S.fortLevel||'auto';
  if((f.games||0)<2)return 'easy';             // the first 2 builds ever are Easy
  if(set!=='auto')return set;                  // grown-up toggle (dev tools)
  return v2State('builder').easy?'easy':'standard'}   // quiet auto-Easy after 2 short builds (AUTO_EASY.build)
function fortProp(){const f=fortState(),open=S.badges.includes('place')?'_open':'',fox=S.kind==='fox',b=fox?'fort':'hollow';
  const nm=f.stage>=3&&f.decor?`${b}_3_d${f.decor}`:`${b}_${f.stage}`;
  return `<div class="fortprop ${b}${open?' open':''}" aria-label="${fox?'Treehouse fort':'Tree hollow'}" style="background-image:url(px/${b}/${nm}${open}.png)"></div>`}
function fortBuilder(round){round=0;
  const f=fortState(),level=fortLevel(),hh=/[?&]board=hh/.test(location.search),t0=now(),best0=bestGet('builder',level),firstEver=!(f.games||0)&&!best0;let ended=false;
  const fox=S.kind==='fox',DIR=fox?'fort':'hollow',HOME=fox?'treehouse fort':'tree hollow',quiet=!fox&&S.talents.includes('Silent Flight');
  const g=FortEngine.create({level,seed:(S.g.seed||1)*31+(f.games||0)*7+(f.rounds||0),w:hh?5:8,h:hh?6:12,disguise:fox&&S.talents.includes('Master of Disguise'),round});
  const W=g.w*16,H=g.h*16,lvlName={easy:'Easy',standard:'',bigkid:'Big-kid'}[level];
  gameShell(`${fox?'Fort':'Hollow'} build`);const gs=$('#gs');gs.classList.add('fortgame');
  gs.insertAdjacentHTML('beforeend',`<canvas id="fb" class="fb" width="${W}" height="${H}" style="width:${W}px;height:${H}px" aria-label="Fort board"></canvas>
    <div class="fbside"><div class="fbnext"><span>next</span><canvas id="fbn" width="32" height="32"></canvas></div>
      <div class="fbmeter" id="fbmeter" aria-label="Height"></div><div class="fbh" id="fbh">0</div>${lvlName?`<div class="fblvl">${lvlName}</div>`:''}<div class="fbstars" id="fbstars"></div></div>
    <div class="fbecho creature" id="cr">${svg(S.kind,S.g,'happy')}</div>
    <div class="fbpad"><button class="btn" id="kL" aria-label="Left">◀</button><button class="btn" id="kR" aria-label="Right">▶</button><button class="btn" id="kA" aria-label="Turn"><b>A</b>turn</button><button class="btn" id="kB" aria-label="Drop"><b>B</b>drop</button></div>`);
  const cv=$('#fb'),cx=cv.getContext('2d'),nx=$('#fbn').getContext('2d');
  const IM={};['plank','window','leafroof','door','lantern','flag','slyte'].forEach(k=>{IM[k]=new Image();IM[k].src=`px/${DIR}/b_${k}.png`;IM['m_'+k]=new Image();IM['m_'+k].src=`px/${DIR}/m_${k==='slyte'?'plank':k}.png`});
  IM.ghost=new Image();IM.ghost.src='px/fort/ghost.png';[0,1,2].forEach(i=>{IM['glow'+i]=new Image();IM['glow'+i].src=`px/fort/glow${i}.png`});
  let glowRows=0,glowT=0,alive=true,rowsSaid=0;
  function draw(){if(!alive)return;cx.fillStyle='#2E2452';cx.fillRect(0,0,W,H);cx.fillStyle='#3B2A5C';
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if((x+y)%2)cx.fillRect(x*16,y*16,16,16);
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){const c=g.grid[y][x];if(c)cx.drawImage(IM[c],x*16,y*16)}
    const p=g.piece;if(p){const gy=FortEngine.ghostY(g);if(gy!==p.y&&FortEngine.ghostOn(g))p.cells.forEach(([a,b])=>cx.drawImage(IM.ghost,(p.x+a)*16,(gy+b)*16));
      p.cells.forEach(([a,b],i)=>{if(p.y+b>=0)cx.drawImage(IM[p.mats[i]],(p.x+a)*16,(p.y+b)*16)})}
    nx.clearRect(0,0,32,32);const q=g.next;if(q){const s=q.cells.length>3||Math.max(...q.cells.map(c=>c[0]))>1?8:16;q.cells.forEach(([a,b],i)=>nx.drawImage(IM[q.mats[i]],a*s,b*s,s,s))}
    const h0=FortEngine.height(g);$('#fbmeter').innerHTML=Array.from({length:24},(_,i)=>`<i class="${i<h0?'on':''}${best0&&i===best0-1&&h0<=best0?' best':''}"></i>`).join('');$('#fbh').textContent=h0;$('#fbh').className='fbh'+(best0&&h0>best0?' gold':'');
    cx.fillStyle='#FFD27A';for(let x=0;x<W;x+=4)cx.fillRect(x,16,2,1);
    if($('#fbstars'))$('#fbstars').innerHTML=Array.from({length:3},(_,i)=>window.PIXEL?PIXEL.icon(i<FortEngine.stars(g)?'sticker':'talk').replace('class="pxi"',`class="pxi${i<FortEngine.stars(g)?'':' dim'}"`):'').join('');}
  const loop=setInterval(draw,83);   // 12 fps
  let fall=0;const sched=()=>{clearTimeout(fall);if(alive&&!g.done&&g.fallMs)fall=setTimeout(()=>{FortEngine.tick(g);after();sched()},g.fallMs)};sched();   // re-reads g.fallMs after every settle (0 = hover until B)
  function stop(){alive=false;clearInterval(loop);clearTimeout(fall);document.removeEventListener('keydown',key)}
  function after(){for(const e of FortEngine.take(g)){
      if(e.type==='settle'&&!quiet)SFX('blocks_land',{vol:.6});if(e.type==='floor')SFX('blocks_floor_done');if(e.type==='row'||e.type==='row-auto'){SFX('blocks_row_glow');glowRows=Math.min(3,(glowRows||0)+1);glowT=0;react('happy');rowsSaid++;if(rowsSaid%2===1)talk(B('stack_row'),1800);chirp()}
      if(e.type==='settle'&&!fall)sched();
      if(e.type==='disguise'){react('excited');talk(B('stack_disguise'),2000)}}
    if(g.done&&alive)finish();draw()}
  function chirp(){try{window.Chirp&&Chirp.play('*',S.kind)}catch(e){}}
  function finish(){if(ended)return;ended=true;draw();stop();f.rounds=(f.rounds||0)+1;f.games=(f.games||0)+1;const rows=FortEngine.height(g);v2Count('build',rows);
    const r=bestPut('builder',level,rows),fl=Math.floor(rows/3),rr=rows%3;
    if(S.talents.includes('Super Jumper'))react('happy');
    SFX('blocks_land');for(let x=0;x<g.w;x++)cx.drawImage(IM.leafroof,x*16,Math.max(0,FortEngine.stackTop(g)-1)*16);setTimeout(()=>SFX('blocks_floor_done'),300);setTimeout(()=>SFX('blocks_row_glow'),700);
    const roofBefore=f.stage>=3;if(f.stage<3)f.stage++;else f.decor=Math.min(3,f.decor+1);if(f.stage>=3&&!roofBefore)f.homes++;   // the Home prop grows one step per finished build
    if(f.stage>=3)(S.homesBuilt=S.homesBuilt||[]).push({day:S.days,decor:f.decor});
    remember(fox?`We built the fort ${rows} rows high`:`We built the hollow ${rows} rows high`,'fort_rows_'+rows);
    setExpr('happy');react('happy');talk(B(r.isBest&&!firstEver?'stack_roof_best':'stack_roof',{rows}),2200);save();lullaby();
    setTimeout(()=>endCard({game:'builder',unit:'rows',score:rows,was:r.was,best:Math.max(rows,r.was),isBest:r.isBest&&!firstEver,firstEver,t0,extra:[fl?(rr?`${fl} floors + ${rr}`:`= ${fl} floors!`):`${rows} rows`,`${'★'.repeat(FortEngine.stars(g))||'tidy rows: 0'}`],onAgain:()=>fortBuilder(0)}),900)}
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
  $('#quit').onclick=()=>{if(ended)return endGame(true);g.done=true;finish()};
  window.__fort=g;window.__fortAfter=after;
  talk(B('stack_start'),2400);draw();
}
// ---------- Games v2 §3.3 / §3.4: Berry Catch / Starfall Catch and Pancake Tower / Cloud Steps (happy ends, flat rewards) ----------
function g2Frames(fox){const SP=fox?'slyte':'whimber',PL=fox?PIXEL.PAL:PIXEL.POWL;let pal=PIXEL.variant(S.g&&S.g.seed,SP,S.g&&S.g.pal).pal;if(!PL.includes(pal))pal=PL[0];const st=PIXEL.stageNow();
  return {pd:`run/${pal}/${st>=4?'':'s'+Math.min(Math.max(st,1),3)+'/'}`,sk:'stage'+Math.min(Math.max(st,1),4),row:Math.min(4,Math.max(0,st)),fly:PIXEL.sheet(SP,S.g).replace(/\.png$/,'_fly.png')}}
function g2Img(IM,k,src){const im=IM[k]=new Image();im.src=src;return im}
const g2ok=im=>im&&im.complete&&im.naturalWidth;
function g2Loop(step,draw){let acc=0,last=performance.now(),alive=true;function tick(t){if(!alive)return;acc+=Math.min(.1,(t-last)/1000);last=t;while(acc>=1/60&&alive){step(1/60);acc-=1/60}if(alive)draw();requestAnimationFrame(tick)}requestAnimationFrame(t=>{last=t;tick(t)});return ()=>{alive=false}}
function g2Banner(gs,t){gs.insertAdjacentHTML('beforeend',`<div class="runbest">${PI('✨')}<span>${t}</span>${PI('✨')}</div>`);setTimeout(()=>{const b=$('.runbest');if(b)b.remove()},2000)}
function catchGame(){
  const fox=S.kind==='fox',level=v2Level('catch','catchLevel'),st=v2State('catch'),t0=now(),best0=bestGet('catch',level),firstEver=!st.games&&!best0,TITLE=fox?'Berry Catch':'Starfall Catch';
  const g=CatchEngine.create({level,seed:(S.g.seed||1)*37+st.games*11+1,fam:fox?'slyte':'whimber',lowfx:lowFx()}),A=CatchEngine.F,FR=g2Frames(fox);
  gameShell(TITLE);const gs=$('#gs');gs.classList.add('rungame','g2game','catchgame');
  gs.insertAdjacentHTML('beforeend',`<canvas id="cc" width="180" height="300" aria-label="${TITLE}"></canvas>`);
  const ITEMS=fox?['berry','strawberry','apple','raspberry']:['star','water','moon','glowleaf'];
  $('.top b').innerHTML=`<i class="pxi" style="background-image:url(px/i_${ITEMS[0]}.png)"></i><span id="cn">0</span> <span id="cs"></span> ${hudBest('catch',level)} <span id="cg"></span>`;
  const IM={};g2Img(IM,'bg',`px/scenes/${fox?'meadow_day':'hilltop_twi'}.png`);if(fox)g2Img(IM,'canopy','px/catch/canopy.png');g2Img(IM,'car',`px/catch/${fox?'basket':'nest'}.png`);
  g2Img(IM,'gold',`px/catch/${fox?'apple_gold':'feather_gold_inked'}.png`);ITEMS.forEach(k=>g2Img(IM,k,`px/i_${k}.png`));
  if(fox)['run0','run1','run2','run3','run4','run5','run_happy'].forEach(k=>g2Img(IM,k,`px/${FR.pd}slyte_${k}.png`));else g2Img(IM,'fly',FR.fly);
  let ended=false,cheered=false,lastLine=-9,happy=0,face=1,F=0,pops=[];const AN=fetch('px/catch/anchors.json').then(r=>r.json()).then(j=>IM.anch=j).catch(()=>{});
  const cv=$('#cc'),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
  const line=(k,ex)=>{if(g.t-lastLine<6)return false;lastLine=g.t;talk(B(k,ex),1800);return true};
  function step(dt){if(ended)return;CatchEngine.step(g,dt);F++;if(happy>0)happy-=dt;pops.forEach(p=>p.t-=dt);pops=pops.filter(p=>p.t>0);
    for(const e of CatchEngine.take(g)){
      if(e.type==='catch'){happy=.25;pops.push({s:e.gold?'+5':'+1',x:g.x,t:1});if(e.gold){SFX('run_gold',{vol:.8});line('catch_gold')}else{SFX(g.n%5===0?'run_treasure_5':'run_treasure_1',{vol:.6});say('*')}}
      if(e.type==='streak'){SFX('run_treasure_5',{vol:.7});line('catch_streak')}
      if(e.type==='land')SFX('run_tumble_boop',{vol:.5,gap:200});
      if(e.type==='end')finish()}
    if(!cheered&&!firstEver&&best0>0&&g.n>best0){cheered=true;const hb=$('#g2best');if(hb)hb.classList.add('gold');g2Banner(gs,'NEW BEST!');SFX('run_finale',{vol:.6})}}
  function draw(){if(!document.getElementById('cc'))return;cx.clearRect(0,0,180,300);if(g2ok(IM.bg))cx.drawImage(IM.bg,0,-20);if(g2ok(IM.canopy))cx.drawImage(IM.canopy,-8,6);const low=lowFx();
    for(const it of g.items){const im=it.gold?IM.gold:IM[ITEMS[it.id%4]],x=Math.round(it.x-8),y=Math.round(it.y-8);if(it.gold)drawGlow(cx,x+8,y+8,performance.now());if(g2ok(im))cx.drawImage(im,x,y,16,16)}
    g.lands.forEach((x,i)=>{const im=IM[ITEMS[i%4]];if(g2ok(im))cx.drawImage(im,Math.round(x-6),A.LINE+34,12,12)});
    const dx=g.tx-g.x;if(Math.abs(dx)>1)face=dx>0?1:-1;const moving=Math.abs(dx)>1,an=IM.anch;
    if(fox){const k=happy>0?'run_happy':moving?'run'+((F/5|0)%6):'run0',im=IM[k],a=(an&&an.slyte_basket[FR.sk]&&an.slyte_basket[FR.sk][k])||[22,22],top=A.LINE+4-a[1];
      if(g2ok(im)){cx.save();if(face<0){cx.translate(Math.round(g.x)*2,0);cx.scale(-1,1)}cx.drawImage(im,Math.round(g.x-a[0]),top);if(g2ok(IM.car))cx.drawImage(IM.car,Math.round(g.x-a[0])+a[0]-11,top+a[1]+2-10);cx.restore()}}
    else{const fi=(F/6|0)%4,a=(an&&an.whimber_nest[FR.sk]&&an.whimber_nest[FR.sk]['fly'+fi])||[24,44],top=A.LINE-2-(a[1]-3);
      if(g2ok(IM.fly))cx.drawImage(IM.fly,fi*48,FR.row*48,48,48,Math.round(g.x-a[0]),top,48,48);if(g2ok(IM.car))cx.drawImage(IM.car,Math.round(g.x-11),A.LINE-2)}
    {const hr=CatchEngine.headR(g);cx.save();cx.globalAlpha=low?.18:.14+.06*Math.sin(performance.now()/300);cx.fillStyle='#FFF4C8';cx.beginPath();cx.ellipse(Math.round(g.x),A.LINE,hr,3,0,0,6.283);cx.fill();cx.restore()}   // playtest: subtle head target
    cx.fillStyle='#FFD27A';cx.font='8px PS2P';for(const p of pops)cx.fillText(p.s,Math.round(p.x-6),Math.round(A.LINE-20-(low?0:(1-p.t)*14)));
    $('#cn').textContent=g.n;$('#cs').textContent=g.streak>=5?'×'+g.streak:'';$('#cs').className=g.streak>=10?'gold':'';
    $('#cg').innerHTML=Array.from({length:g.L.grass},(_,i)=>`<i class="pxi" style="background-image:url(px/catch/grass_spot${i<g.landed?1:0}.png);width:9px;height:4px"></i>`).join('')}
  const stopLoop=g2Loop(step,draw);
  function stop(){stopLoop();document.removeEventListener('keydown',key)}
  function finish(){if(ended)return;ended=true;const n=g.n;v2Count('catch',n);const r=bestPut('catch',level,n);
    if(n>=5)remember(fox?`We caught ${n} berries`:`We caught ${n} stars`,'catch_'+n);react('happy');setExpr('happy');
    g2Banner(gs,fox?'PICNIC TIME!':'STARGAZE TIME!');talk(B(r.isBest&&!firstEver?'catch_best':'catch_end',{n}),2400);
    setTimeout(()=>{draw();stop();endCard({game:'catch',unit:fox?'berries':'stars',score:n,was:r.was,best:Math.max(n,r.was),isBest:r.isBest&&!firstEver,firstEver,t0,extra:[`longest streak ${g.longest}`,`goldens ${g.golds}`],onAgain:catchGame})},900)}
  const xOf=e=>{const r=cv.getBoundingClientRect();return (e.clientX-r.left)*180/r.width};
  cv.addEventListener('pointerdown',e=>{CatchEngine.moveTo(g,xOf(e));cv.setPointerCapture&&cv.setPointerCapture(e.pointerId)});cv.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')CatchEngine.moveTo(g,xOf(e))});
  function key(e){if(!document.getElementById('cc')){stop();return}const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')CatchEngine.nudge(g,-1);else if(k==='arrowright'||k==='d')CatchEngine.nudge(g,1);else return;e.preventDefault()}
  document.addEventListener('keydown',key);
  $('#quit').onclick=()=>{if(ended){stop();return endGame(true)}finish()};
  window.__catch=g;window.__catchFinish=finish;talk(B('catch_start'),2000)}
function stackGame(){
  const fox=S.kind==='fox',level=v2Level('stack','stackLevel'),st=v2State('stack'),t0=now(),best0=bestGet('stack',level),firstEver=!st.games&&!best0,TITLE=fox?'Pancake Tower':'Cloud Steps',M=fox?'pancake':'cloud',LH=8,BASE=268;
  const g=StackEngine.create({level,seed:(S.g.seed||1)*41+st.games*13+1}),FR=g2Frames(fox);
  gameShell(TITLE);const gs=$('#gs');gs.classList.add('rungame','g2game','stackgame');
  gs.insertAdjacentHTML('beforeend',`<canvas id="stc" width="180" height="300" aria-label="${TITLE}"></canvas>`);
  $('.top b').innerHTML=`<i class="pxi" style="background-image:url(px/stack/${M}_60.png);width:12px;height:8px"></i><span id="sh">0</span> ${hudBest('stack',level)} <span id="sp"></span>`;
  const IM={};g2Img(IM,'bg',`px/scenes/${fox?'meadow_day':'hilltop_twi'}.png`);g2Img(IM,'base',fox?'px/stack/plate.png':'px/run/bench.png');
  ['','_perfect'].forEach(p=>['l','m','r'].forEach(s=>g2Img(IM,p+s,`px/stack/${M}${p}_${s}.png`)));[0,1,2,3].forEach(i=>g2Img(IM,'burst'+i,`px/items/burst${i}.png`));
  if(fox)g2Img(IM,'home',PIXEL.sheet('slyte',S.g));else g2Img(IM,'fly',FR.fly);
  let ended=false,cheered=false,cam=0,F=0,bits=[],plop=null,perfN=0;const perf=new Set();
  const cv=$('#stc'),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
  function layer(x,y,w,p){x=Math.round(x);w=Math.max(6,Math.round(w));const P=p?'_perfect':'';if(!g2ok(IM[P+'m']))return;cx.drawImage(IM[P+'l'],x,y);let i=x+3;while(i<x+w-3){const c=Math.min(6,x+w-3-i);cx.drawImage(IM[P+'m'],0,0,c,8,i,y,c,8);i+=c}cx.drawImage(IM[P+'r'],x+w-3,y)}
  const yOf=h=>BASE-LH*(h+1)+cam;
  function step(dt){if(ended)return;StackEngine.step(g,dt);F++;const want=Math.max(0,132-(BASE-LH*(g.h+2)));if(cam<want)cam=lowFx()?Math.ceil(want/8)*8:Math.min(want,cam+2);
    for(const b of bits){if(fox&&!lowFx()){b.vy=Math.min(7,b.vy+1/6);b.y=Math.min(BASE+18-cam,b.y+b.vy)}else b.t--}bits=bits.filter(b=>fox&&!lowFx()?true:b.t>0)}
  function press(){if(ended)return;const top=g.layers[g.layers.length-1],w0=g.w,sx=g.sx;StackEngine.press(g);
    for(const e of StackEngine.take(g)){
      if(e.type==='perfect'){perf.add(g.h+1);SFX('blocks_row_glow',{vol:.6});perfN++;if(perfN%3===1)talk(B('tower_perfect'),1600)}
      if(e.type==='place'){SFX('blocks_land',{vol:.6});if(e.trimL)bits.push({x:sx,w:e.trimL,y:yOf(g.h),vy:0,t:8});if(e.trimR)bits.push({x:sx+w0-e.trimR,w:e.trimR,y:yOf(g.h),vy:0,t:8})}
      if(e.type==='end'){plop={x:sx,w:w0,t:0};SFX('run_tumble_boop',{vol:.6});finish()}}
    if(!cheered&&!firstEver&&best0>0&&g.h>best0){cheered=true;const hb=$('#g2best');if(hb)hb.classList.add('gold');g2Banner(gs,'NEW BEST!');SFX('run_finale',{vol:.6})}}
  function draw(){if(!document.getElementById('stc'))return;cx.clearRect(0,0,180,300);if(g2ok(IM.bg))cx.drawImage(IM.bg,0,-20);
    if(g2ok(IM.base))fox?cx.drawImage(IM.base,47,BASE+cam):cx.drawImage(IM.base,79,BASE+cam,22,8);
    g.layers.forEach((l,i)=>{if(i>0)layer(l.x,yOf(i-1),l.w,perf.has(i))});
    if(!ended)layer(g.sx,yOf(g.h)-LH-2,g.w,false);
    for(const b of bits)if(fox||b.t%2)layer(b.x,Math.round(b.y),b.w,false);
    if(plop&&plop.t<16){const im=IM['burst'+Math.min(3,lowFx()?0:plop.t>>2)];if(g2ok(im))cx.drawImage(im,Math.round(plop.x+plop.w/2-12),BASE+4,24,24);plop.t++}
    if(best0>0){const y=yOf(best0-1);cx.fillStyle='#FFD27A';for(let x=0;x<180;x+=4)cx.fillRect(x,y,2,1);cx.beginPath();cx.moveTo(170,y-6);cx.lineTo(178,y-3);cx.lineTo(170,y);cx.fill()}
    if(fox){if(g2ok(IM.home))cx.drawImage(IM.home,0,0,48,48,2,248,48,48)}else if(g2ok(IM.fly)){const fi=lowFx()?0:(F/6|0)%4;cx.drawImage(IM.fly,fi*48,FR.row*48,48,48,132,Math.max(40,yOf(g.h)-40),48,48)}
    $('#sh').textContent=StackEngine.result(g).h;$('#sp').textContent='•'.repeat(g.run%((g.L.regrowAfter)||3))}
  const stopLoop=g2Loop(step,draw);
  function stop(){stopLoop();document.removeEventListener('keydown',key)}
  function finish(){if(ended)return;ended=true;const R=StackEngine.result(g),n=R.h;v2Count('stack',n);const r=bestPut('stack',level,n);
    if(n>=5)remember(fox?`We stacked ${n} pancakes`:`We stacked ${n} clouds`,'stack_'+n);react('happy');setExpr('happy');talk(B(r.isBest&&!firstEver?'tower_best':'tower_end',{n}),2400);
    setTimeout(()=>{draw();stop();endCard({game:'stack',unit:fox?'pancakes':'clouds',score:n,was:r.was,best:Math.max(n,r.was),isBest:r.isBest&&!firstEver,firstEver,t0,extra:[`perfect drops ${R.perfects}`],onAgain:stackGame})},900)}
  cv.addEventListener('pointerdown',e=>{e.preventDefault();press()});
  function key(e){if(!document.getElementById('stc')){stop();return}const k=e.key.toLowerCase();if((k===' '||k==='a'||k==='enter')&&!e.repeat){press();e.preventDefault()}}
  document.addEventListener('keydown',key);
  $('#quit').onclick=()=>{if(ended){stop();return endGame(true)}finish()};
  window.__stack=g;window.__stackPress=press;talk(B('tower_start'),2000)}
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
      if(S.kind!=='fox'&&S.talents.includes('Super Radar Hearing')&&e.partnerOfFirst>=0){const col=e.partnerOfFirst%g.cols;SFX('run_treasure_1',{pan:(col/(g.cols-1))*2-1,vol:.5})}}
    if(e.type==='hint'){const el=B_[e.i];el.classList.remove('wiggle');void el.offsetWidth;el.classList.add('wiggle');react('curious');let rl=null;if(fox&&S.talents.includes('Riddle Solver')){(S.vars=S.vars||{}).riddle=g.cards[e.i].item;rl=Dialogue.bark('pairs_riddle');delete S.vars.riddle}talk(rl||B('pairs_hint'),rl?2600:1600)}   // Riddle Solver: the hint is a riddle about the partner card
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
// ---- runners (spec v0.6 §3): Meadow Dash (Slyte, tap = jump) / Moonlight Glide (Whimber, hold = rise). No fail state. ----
// saves from before v0.6: the Sparkle trail and Connect are gone. Their memories stay in the Memory Book (read-only facts); their state goes.
function gamesMigrate(){if(!S||S.gv===7)return;if((S.gv||0)<6){delete S.trail;delete S.connect;delete S.trailLevel;delete S.connectLevel;if(S.vars)delete S.vars.connect5}
  const B=bestStore();if(S.run&&S.run.best)for(const l in S.run.best){if(typeof S.run.best[l]==='number'){B.run[l]={score:0,legacy:S.run.best[l]}}}if(S.run)S.run.best={};if(S.fort&&S.fort.best&&!B.builder.standard)B.builder.standard={score:S.fort.best};S.gv=7}   // games v2: old run best (m + 10×treasure) can't be split, the first v2 run sets the new best   // saved with the next save (no save here: it would reset S.last)
const RUN_BUSH=[40,60,80,100,120,140,160,180,200,220,240,260,280,300,320,340,360,380,400];
function runState(){S.run=S.run||{best:{},runs:0,hard:0,auto:null};S.run.best=S.run.best||{};return S.run}
function runLevel(){return v2Level('run','runLevel')}
function runGame(){
  const fox=S.kind==='fox',SP=fox?'slyte':'whimber',rs=runState(),level=runLevel(),TITLE=fox?'Meadow Dash':'Moonlight Glide';
  const T=n=>S.talents.includes(n),silent=!fox&&T('Silent Flight'),nv=!fox&&T('Night Vision');
  const evening=tod()==='evening'||tod()==='night';
  const g=RunnerEngine.create({kind:fox?'jump':'glide',level,seed:(S.g.seed||1)*31+rs.runs*7+1,talents:S.talents});
  const t0=now(),best0=bestGet('run',level),firstEver=!rs.runs&&!best0;let cheered=false,ended=false,lastLine=-9,lastFlap=-9,treN=0,bumpN=0,lastTre=0;
  gameShell(TITLE);const gs=$('#gs');gs.classList.add('rungame');
  const tre=fox?'trinket':'feather';
  gs.insertAdjacentHTML('beforeend',`<canvas id="rc" width="360" height="640" aria-label="${TITLE}"></canvas>
    <div class="runhint" id="rhint">${rs.runs?'':(fox?'tap = jump':'hold = rise, let go = glide')}</div><div class="runcue" id="rcue" style="background-image:url(px/${fox?'i_stamp_paw':'i_feather'}.png)"></div>`);
  const tb=$('.top b');tb.innerHTML=`<span id="rm">0m</span> <i class="pxi" style="background-image:url(px/items/${tre}.png)"></i><span id="rt">×0</span>${hudBest('run',level)}${level==='standard'?'':` <span class="fblvl">${level==='easy'?'Easy':'Big-kid'}</span>`}`;
  if(!rs.runs)setTimeout(()=>{const h=$('#rhint');if(h)h.classList.add('off')},3000);
  const cv=$('#rc'),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;const IM={};const ld=(k,s)=>{const im=IM[k]=new Image();im.onerror=()=>{const f='px/run/'+s.split('/').pop()+'.png';if(!im.src.endsWith(f))im.src=f};im.src='px/'+s+'.png'};   // missing frame: flat bonded fallback
  const PL=fox?PIXEL.PAL:PIXEL.POWL;let pal=PIXEL.variant(S.g&&S.g.seed,SP,S.g&&S.g.pal).pal;if(!PL.includes(pal))pal=PL[0];   // unknown palette: default folder
  const pd=`run/${pal}/${PIXEL.stageNow()>=4?'':'s'+Math.min(Math.max(PIXEL.stageNow(),1),3)+'/'}`;   // runner frames match the home sprite's palette and stage (runner_polish.md §7)
  window.__runHome=null;if(S.badges.includes('place')){const m=/url\(([^)]*)\)/.exec(fortProp());if(m){IM.homeRest=new Image();IM.homeRest.src=m[1].replace(/["']/g,'');window.__runHome=IM.homeRest.src}}
  if(fox){['meadow_sky','meadow_far','meadow_gnd','log','rock','puddle','sign','sunrock','cloud_day'].forEach(k=>ld(k,'run/'+k));
    ['run0','run1','run2','run3','run4','run5','jump','fall','tumble','run_happy','disguise0','disguise1','reveal'].concat(['best_flag0','best_flag1'].map(k=>(ld(k,'run/'+k),null))).filter(Boolean).forEach(k=>ld(k,pd+'slyte_'+k))}
  else{['hill_sky','hill_stars0','hill_stars1','hill_gnd','cloud','sign_twi','bench','moss','branch120','branch160','branch200','branch240',...RUN_BUSH.map(v=>'bush'+v)].forEach(k=>ld(k,'run/'+k));['flap0','flap1','flap2','flap3','glide','tumble','glide_happy'].forEach(k=>ld(k,pd+'whimber_'+k))}
  ld('tre','items/'+tre);if(!fox)['best_star0','best_star1'].forEach(k=>ld(k,'run/'+k));ld('gold','run/'+tre+'_gold');
  let alive=true,acc=0,last=performance.now(),happy=0,pops=[],frame=0;
  const lineOK=()=>g.t-lastLine>=6;const line=(k,ms)=>{if(!lineOK())return false;lastLine=g.t;talk(B(k),ms||1800);return true};
  const giggle=()=>SFX(SP+'_silly_'+(1+Math.floor(Math.random()*3)),{voice:true,vol:.7,gap:300});
  function bg(){const d=g.dist;
    if(fox){cx.drawImage(IM.meadow_sky,0,0);const c=IM.cloud_day;[[30,150],[200,220],[300,120]].forEach(([x,y],i)=>cx.drawImage(c,Math.round(((x-d*.05*(i+1))%420+420)%420-40),y));
      cx.drawImage(IM.meadow_far,-Math.round(d*.3%960),416);cx.drawImage(IM.meadow_gnd,-Math.round(d%960),448)}
    else{cx.drawImage(IM.hill_sky,0,0);cx.drawImage(IM['hill_stars'+((performance.now()/500|0)%2)],0,0);
      [[60,200],[250,320]].forEach(([x,y],i)=>cx.drawImage(IM.cloud,Math.round(((x-d*.08*(i+1))%420+420)%420-40),y));cx.drawImage(IM.hill_gnd,-Math.round(d%960),512)}}
  function drawObs(){const d=g.dist;for(const o of g.obs){const x=Math.round(o.x-d);if(x>370||x<-60)continue;const wob=o.pushed?Math.round(Math.sin(g.t*30)*2):0;
      if(nv&&!o.pushed&&x<360+g.speed*.5){cx.fillStyle='rgba(255,227,154,.25)';cx.fillRect(x-2,o.y-2,o.w+4,Math.min(o.h+4,640))}
      if(o.type==='log')cx.drawImage(IM.log,x-1+wob,o.y-2);else if(o.type==='logs'){cx.drawImage(IM.log,x-1,o.y+12);cx.drawImage(IM.log,x-1,o.y-2)}
      else if(o.type==='rock')cx.drawImage(IM.rock,x-1+wob,o.y-2);else if(o.type==='puddle')cx.drawImage(IM.puddle,x-1,o.y-1-(o.pushed?1:0));
      else if(o.type==='cloud')cx.drawImage(IM.cloud,x+wob,o.y);
      else if(o.type==='branch'){const L=[120,160,200,240].find(v=>v>=o.h)||240,im=IM['branch'+L];cx.drawImage(im,x-1+wob,o.h-im.height+2)}
      else if(o.type==='bush'){const h=RUN_BUSH.filter(v=>v<=o.h).pop()||40;cx.drawImage(IM['bush'+h],x+wob,531-h)}}   // flat-base bushes stand on the grass (runner_polish.md §4)
    if(best0>0){const bx=Math.round(best0*16-d+40),f=lowFx()?0:(performance.now()/250|0)%2;window.__runBestX=bx;if(bx>-20&&bx<370){if(fox){cx.fillStyle='#FFD27A';for(let y=468;y<480;y+=3)cx.fillRect(bx,y,2,2);if(IM['best_flag'+f])cx.drawImage(IM['best_flag'+f],bx,470-47)}else for(let y=52;y<=528;y+=18)if(IM['best_star'+f])cx.drawImage(IM['best_star'+((y/18+f)%2|0)]||IM.best_star0,bx-2,y)}}
    for(const t of g.tre){const x=Math.round(t.x-d)-8,ty=Math.round(t.y-8+(!lowFx()&&Math.sin(g.t*4+t.id)>0?-1:0));if(x>370||x<-20)continue;if(t.gold)drawGlow(cx,x+8,ty+8,performance.now());cx.drawImage(t.gold?IM.gold:IM.tre,x,ty)}
    if(g.phase==='done'&&IM.homeRest&&IM.homeRest.complete&&IM.homeRest.naturalWidth)cx.drawImage(IM.homeRest,10,(fox?470:531)-48)}   // home backdrop at the end (place badge only)
  function echo(){let k;const F=Math.floor(g.t*12);
    if(fox){k=g.tumble>0?'tumble':g.phase!=='run'&&g.mult<.05?'tumble':happy>0?'run_happy':g.air?(g.vy<0?'jump':'fall'):'run'+(F%6)}
    else{k=g.tumble>0?'tumble':happy>0||(g.phase!=='run'&&g.mult<.05)?'glide_happy':g.held?'flap'+(F%4):'glide'}
    if(fox&&g.disguised>0)k=g.disguised<.2?'reveal':'disguise'+(Math.floor(g.t*4)%2);   // Master of Disguise: the secretly-Slyte bush, then the pop-out
    const im=IM[k];if(!im)return;const x=fox?16:20,y=Math.round(g.y-48+(fox?0:6));
    if(g.tumble>0&&!lowFx()){const st=Math.floor((0.5-g.tumble)/0.125)%4;cx.save();cx.translate(x+24,y+24);cx.rotate(st*Math.PI/2);cx.drawImage(im,-24,-24);cx.restore()}
    else{if(g.grace>0&&(F%2))cx.globalAlpha=.6;cx.drawImage(im,x,y)}cx.globalAlpha=1;
    for(const p of pops){cx.fillStyle=p.c;cx.font='8px PS2P';cx.fillText(p.s,p.x,p.y-(1-p.t)*20)}}
  function hud(){const m=Math.floor(g.dist/16);$('#rm').textContent=m+'m';$('#rt').textContent='×'+RunnerEngine.haul(g);if(cheered)$('#rm').classList.add('gold')}
  function tick(now){if(!alive)return;if(!document.getElementById('rc')){stop();return}
    acc+=Math.min(.1,(now-last)/1000);last=now;while(acc>=1/60){RunnerEngine.step(g,1/60);acc-=1/60;if(happy>0)happy-=1/60;pops.forEach(p=>p.t-=1/60);pops=pops.filter(p=>p.t>0);
handle()}
    bg();drawObs();echo();hud();requestAnimationFrame(tick)}
  function handle(){for(const e of RunnerEngine.take(g)){
      if(e.type==='jump'||e.type==='hop2'){SFX('run_hop_'+(1+Math.floor(Math.random()*3)),{vol:.6,gap:100})}
      if(e.type==='flap'&&g.t-lastFlap>=.25){lastFlap=g.t;SFX('run_flap_'+(1+Math.floor(Math.random()*3)),{vol:.5})}   // one shared 0.25 s throttle for the 3 variants
      if(e.type==='treasure'||e.type==='gold'){treN++;happy=.3;pops.push({s:e.type==='gold'?'+3':'+1',x:60,y:g.y-50,t:1,c:'#FFD27A'});
        if(e.type==='gold'){SFX('run_gold',{vol:.8});setExpr('delighted');lastLine=-9;if(!line('run_glow',1800))line('run_gold',1800)}
        else{lastTre=(g.t-lastTre>8)?1:lastTre+1;SFX(treN%5===0?'run_treasure_5':'run_treasure_1',{vol:.6});if(!(treN%3===0&&line('run_treasure',1600)))say('*')}}
      if(e.type==='bump'){bumpN++;if(!silent)SFX('run_tumble_boop',{gap:400,vol:.5})}
      if(e.type==='giggle')giggle();
      if(e.type==='disguise'){giggle();react('excited')}
      if(e.type==='radar')SFX('slyte_radar_ears_twinkle',{pan:1,vol:.5,gap:300});
      if(e.type==='chime')SFX('whimber_radar_hearing_chime',{pan:0,vol:.4,rate:1+(320-e.y)/900,gap:300});
      if(e.type==='cue'){const c=$('#rcue');if(c){c.classList.remove('on');void c.offsetWidth;c.classList.add('on')}}
      if(e.type==='end')finish()}
    if(!cheered&&!firstEver&&best0>0&&RunnerEngine.score(g)>best0){cheered=true;const hb=$('#g2best');if(hb)hb.classList.add('gold');happy=1.2;SFX('run_finale',{vol:.7});react('excited');lastLine=-9;line('run_best',2200);
      gs.insertAdjacentHTML('beforeend',`<div class="runbest">${PI('✨')}<span>NEW BEST!</span>${PI('✨')}</div>`);setTimeout(()=>{const b=$('.runbest');if(b)b.remove()},2200);
      if(!fox)S.hillStars=Math.min(12,(S.hillStars||0)+1)}}
  function finish(){if(ended)return;ended=true;const m=RunnerEngine.score(g),n=RunnerEngine.haul(g);rs.runs++;v2Count('run',m);
    const r=bestPut('run',level,m,n);if(r.isBest&&m>=50)remember(`Our longest run was ${m} m`,'run_best');if(n>=5)remember(`We found ${n} ${tre}s in one run`,'run_haul');
    react('happy');setExpr('happy');if(!fox&&T('Sweet-Dream Lullaby')&&evening)setTimeout(()=>{setExpr('sleepy');talk(B('yawn'),1800)},1500);
    talk(B(r.isBest&&!firstEver?'run_end_best':'run_end',{dist:m}),2400);if(window.Music)setTimeout(()=>Music.duck(false),10);
    setTimeout(()=>{stop();endCard({game:'run',unit:'m',score:m,was:r.was,best:Math.max(m,r.was),isBest:r.isBest&&!firstEver,firstEver,t0,extra:[`${n} ${tre}${n===1?'':'s'}`],onAgain:runGame})},700)}
  function stop(){alive=false;document.removeEventListener('keydown',key);document.removeEventListener('keyup',keyup)}
  const down=e=>{if(e.target.closest&&e.target.closest('.top'))return;RunnerEngine.press(g);const h=$('#rhint');if(h&&rs.runs===0)h.classList.add('off')},up=()=>RunnerEngine.release(g);
  gs.addEventListener('pointerdown',down);['pointerup','pointercancel','pointerleave'].forEach(n=>gs.addEventListener(n,up));
  function key(e){if(!document.getElementById('rc')){stop();return}const k=e.key.toLowerCase();if((k===' '||k==='enter'||k==='a'||k==='z')&&!e.repeat){RunnerEngine.press(g);e.preventDefault()}}
  function keyup(e){const k=e.key.toLowerCase();if(k===' '||k==='enter'||k==='a'||k==='z')RunnerEngine.release(g)}
  document.addEventListener('keydown',key);document.addEventListener('keyup',keyup);
  $('#quit').onclick=()=>{if(ended){stop();return endGame(true)}finish()};   // Done mid-run: the same happy end, never a quit screen
  window.__run=g;window.__runFinish=finish;window.__runHandle=handle;
  lastLine=-9;line('run_start',2400);requestAnimationFrame(t=>{last=t;tick(t)});
}
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
function fwSession(){const f=fw(),t=fwToday();if(f.paused)return;
  if(f.state==='almost_ready'&&!f.almostDays.includes(t))f.almostDays.push(t);
  if(f.state==='grace'&&t!==f.askedDay&&!f.graceDays.includes(t)){f.graceDays.push(t);if(f.graceDays.length>FWC().graceDays){f.state='walking';f.walkDay=t}}
  save()}
function fwGreet(){const f=fw(),t=fwToday();
  if(f.state==='almost_ready'){talk(B('almost_hello'));return true}
  if(f.state==='grace'){if(f.graceDays.length===FWC().graceDays&&f.lastDay!==t){f.lastDay=t;save();talk(B('last_day'))}else talk(B('grace_hello'));return true}
  return false}
function fwBuildList(){const fox=S.kind==='fox',gc=S.gameCounts||{};const top=Object.keys(gc).filter(k=>['pairs','builder','run','catch','stack'].includes(k)).sort((a,b)=>gc[b]-gc[a])[0]||'pairs';
  const GN={pairs:fox?'Shiny Pairs':'Starlight Pairs',builder:fox?'Fort Builder':'Hollow Builder',run:fox?'Meadow Dash':'Moonlight Glide',catch:fox?'Berry Catch':'Starfall Catch',stack:fox?'Pancake Tower':'Cloud Steps'};
  (S.vars=S.vars||{}).listGame=GN[top];const cb=Object.values(S.cbCount||{}).reduce((a,b)=>a+b,0);
  return [{id:top==='builder'?'place':top==='run'?'trail':'play',game:top,done:false},{id:'food',done:false},{id:(S.sits||0)>cb?'cozy':'memory',done:false}]}
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
function fwCalm(){const f=fw(),c=FWC(),n=S.needs;sess.t0=sess.t0||now();if(f.paused)return false;   // grown-up: "Let {name} stay a while" (§10, decision 8)
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
function fwCeremony(path,resume){
  if(resume||!S.fwShared||sess.fwSharedOk)return fwCeremony0(path,resume);
  const d=full(`<div class="mcard fwshared"><p>${fwUI('ui_sibling_card',0)}</p><div class="row"><button class="btn" id="fsy">${fwUI('ui_sibling_card',1)}</button><button class="btn" id="fsn">${fwUI('ui_sibling_card',2)}</button></div></div>`);
  d.querySelector('#fsy').onclick=()=>{d.remove();sess.fwSharedOk=1;fwCeremony0(path)};
  d.querySelector('#fsn').onclick=()=>{d.remove();home()}}      // back Home; no grace day used
async function fwCeremony0(path,resume){
  const f=fw(),fox=S.kind==='fox',e=E();if(!resume){f.path=path;f.step=0;f.gift=null}f.state='ceremony';S.releasePath=f.path;save();
  try{lvStop();clearTimeout(LIVE.noticeT);clearInterval(LIVE.timer)}catch(x){}clearTimeout(ambT);if(window.Music)Music.home(S.kind);
  ov.innerHTML='';document.querySelectorAll('.full').forEach(x=>x.remove());
  h(`<div class="scene fwscene ${fox?'fox':'owl'}" id="sc"><div class="fwsky"></div>${fwStarHTML(fox?2:2,'fwstar')}<div class="fwtrail" id="fwtrail"></div>
    <div class="creature" id="cr" style="left:90px;bottom:${fox?64:130}px">${svg(S.kind,S.g,'happy')}</div>${fox?'<div class="fwgrass"></div>':''}<div class="fwglow" id="fwglow"></div><div class="bubble" id="b" style="display:none"></div></div>`);
  const px=$('#cr .px-echo');if(px)px.dataset.stage=4;   // bonded until the departure; stage 5 plays as the release event
  const star=l=>{const s=$('#fwstar');if(s){s.className='fwstar l'+l;s.style.backgroundImage=`url(px/fw/star_${l}.png)`}};
  const mems=Postcards.memories(S.memories).slice(-3);
  if(fox)fwBg(resume?'meadow':scHome().id,resume?'twi':'day');else fwBg('branch','twi');   // Whimber: the branch's warm twilight, whatever the clock says
  if(resume&&f.step>=1){if(!fox)await fwMoveTo(58,130,400);await fwSay(B('resume_edge'))}
  else{
    // C0 start
    await fwSay(B('walk_start'));fwStep(1);
    // C1 walk (Slyte: three cuts home -> meadow -> edge, trotting) / along the branch (Whimber: each memory lights a star)
    if(fox){const c=$('#cr');c.classList.add('pxwalk');await fwSay(fwPickDone('walk_list'));const sc=$('#sc');sc.classList.add('fwcut');fwBg('meadow','day');await fwWait(350);sc.classList.remove('fwcut');
      for(const m of mems.slice(0,2))await fwSay(B('walk_memory',{memory:m}));sc.classList.add('fwcut');fwBg('meadow','twi');await fwWait(350);sc.classList.remove('fwcut');c.classList.remove('pxwalk')}
    else{await fwMoveTo(74,130,700);await fwSay(fwPickDone('walk_list'));let k=0;
      for(const m of mems){k++;$('#fwtrail').innerHTML=fwTrailHTML(k*2);await fwSay(B('walk_memory',{memory:m}))}await fwMoveTo(58,130,600)}
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
  const s=$('#fwstar');if(s)s.classList.add('answer');if(window.Sound&&S.voice!==false)Sound.play((fox?'slyte':'whimber')+'_pet_motif',{vol:.6});await fwSay(B('last_call'));closure()}
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
  $('#again').onclick=()=>{if(confirm('Start with a new Echo? (This prototype keeps one save, so the old Memory Book will be cleared.)')){if(localStorage.getItem('echo-nosetup')){S={child:S.child,voice:S.voice};return discover()}S={child:S.child,voice:S.voice,music:S.music,vars:{child_named:S.vars&&S.vars.child_named},ageBand:S.ageBand,oseed:S.oseed||Math.floor(Math.random()*2e9)+1,originIdx:S.originIdx||1,songs:S.songs||[],alwaysYes:S.alwaysYes,fwShared:S.fwShared,setupDone:0};if(!S.vars.child_named)delete S.vars.child_named;save();orSeen()}};
}
window.addEventListener('visibilitychange',()=>{if(document.hidden)save();else if(S&&S.last&&now()-S.last>10*60e3){sess={feeds:0,games:0,naps:0,chats:0};simulate();save();if(!S.released)home(true)}});
window.__echo={get state(){return S},toast:t=>toast(t),meters:()=>NeedsV2.meter(S.needs),led:()=>NeedsV2.led(S.needs),simulate:()=>simulate(),sess:()=>sess,leaveScreen:()=>leaveScreen(),holiday:on=>holidaySet(on),setState:x=>{S=x},orDeclines:()=>orDeclines(),hash:x=>obHash(x),band:()=>tod(),talk:(t,ms)=>talk(t,ms),hug:()=>hug(),foodTaste:f=>foodTaste(f),foodMenu:()=>foodMenu(),feed:()=>feed(),runGame:()=>runGame(),games:()=>gamesFor().map(x=>x[1]),fw:{get s(){return fw()},calm:()=>fwCalm(),start:p=>fwCeremony(p),session:()=>fwSession()},milestone:id=>{mq.push({id});flushMilestones()},scene:{home:()=>scHome(),get cur(){return curScene().id},unlocked:()=>scUnlocked().map(s=>s.id),pick:()=>scPickSession(),picker:()=>scPicker()},living:{get st(){return LIVE.st},get pos(){return LIVE.pos},get act(){return LIVE.act},get log(){return LIVE.log},get foundAct(){return LIVE.foundAct},dbg:()=>({can:!!lvCanWander(),feed:!!document.getElementById('feed'),full:!!document.querySelector('.full,.book,.bondup'),ov:ov.innerHTML.trim().slice(0,60),b:($('#b')||{}).style&&$('#b').style.display,nap:S.napUntil>now(),next:LIVE.nextIdle-now(),timer:!!LIVE.timer,st:LIVE.st}),wander:()=>lvWander(),routine:b=>lvRoutine(b),found:()=>lvFound(),present:()=>lvPresent(),start:f=>lvStart(f),move:(to,f)=>lvMove(to,null,f)},home:g=>home(g),maybeBondUp:()=>maybeBondUp(),playBondUp:(a,b)=>playBondUp(a,b,false),trailGame:()=>trailGame(),connectGame:()=>connectGame(),gamesFor:()=>gamesFor().map(x=>x[1]),migrateCheckins:()=>migrateCheckins(),buildCheckins:()=>buildCheckins(),pairsLevel:()=>pairsLevel(),memoryGame:()=>memoryGame(),fortLevel:()=>fortLevel(),fortBuilder:r=>fortBuilder(r||0),initDialogue:()=>initDialogue(),runConv:(id,d)=>runConv(id,d),callbackLine:()=>callbackLine(),bark:(k)=>B(k)};
start();
})();
