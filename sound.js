// Light sound layer (Cole's samples, sfx/*.mp3, all same-origin; no network beyond the app itself).
// Echo lines -> species chirps chosen by expression; care actions and key UI moments -> sfx. Respects the
// "Chirp sounds" toggle (S.voice). Web Audio, unlocked on the first tap (iOS). Not the full step-7 sound system.
(function(){
const W=window,BASE='sfx/';
const CORE=['ui_tap','ui_back','ui_panel_open','bond_meter_tick','care_feed_eat','care_pet_sparkle','care_nap_tuck'];
const V2MOODS=['happy','curious','sleepy','shy','silly','excited','sad_gentle'];
const FS=k=>{const F=W.FAMILIES;if(!F)return k==='owl'||k==='whimber'?'whimber':'slyte';const v=(F.of(k).sound||{}).voice;return v?v.split('_<')[0]:F.idOf(k)};   // kind or id -> voice prefix (manifest sound.voice '<prefix>_<mood>_<1-3>')
const SPECIES=k=>{const s=FS(k);const v=[];V2MOODS.forEach(m=>[1,2,3].forEach(i=>v.push(s+'_'+m+'_'+i)));const F=W.FAMILIES,lc=F?Object.values((F.of(k).sound||{}).lookChirps||{}).map(c=>c.sample):[];return [...v,s+'_pet_motif',s+'_arrival',s+'_release',...lc]};   // + per-look samples (manifest sound.lookChirps)
// sound v2: Whimber's own takes of a few shared sounds (Slyte uses the plain name)
const OWLVAR=new Set(['memory_card_flip','memory_card_flip_2nd','memory_flip_back','memory_card_flip_whimber','memory_pair_found_whimber','ui_tap_whimber','run_treasure_1_whimber','whimber_night_vision_glint','ui_panel_close','memory_pair_found','ui_tap','run_treasure_1']);
const LATER=['blocks_move','blocks_rotate','blocks_land','blocks_row_glow','blocks_floor_done','memory_card_flip','bondup_sting_slyte','bondup_sting_whimber','run_treasure_1','run_treasure_5','run_tumble_boop','run_gold','run_finale','run_hop_1','run_hop_2','run_hop_3','run_flap_1','run_flap_2','run_flap_3','whimber_radar_hearing_chime','memory_pair_found','memory_all_cleared','slyte_radar_ears_twinkle',];
// expression -> chirp mood (happy / curious / sleepy); sad and wistful use the soft sleepy chirp
const MOOD={happy:'happy',delighted:'happy',proud:'happy',love:'happy',eating:'happy',excited:'excited',giggling:'silly',
  curious:'curious',thinking:'curious',surprised:'curious',concentrating:'curious',neutral:'curious',shy:'shy',
  sleepy:'sleepy',sad:'sad_gentle',wistful:'sad_gentle'};   // sound v2 voice moods (Slyte v2.1 calm, Whimber v2)
const lastVar={};
let ctx=null,buf={},loading={},unlocked=false,last={},voiceNode=null;
function on(){try{const S=W.__echo&&W.__echo.state;if(S&&S.voice===false)return false;const v=document.getElementById('voice');if(v&&!S)return v.checked}catch(e){}return true}
function ac(){if(!ctx){const C=W.AudioContext||W.webkitAudioContext;if(!C)return null;ctx=new C()}return ctx}
function load(n){if(buf[n]||loading[n]||!ac())return loading[n];
  loading[n]=fetch(BASE+n+'.mp3').then(r=>{if(!r.ok)throw new Error('sfx '+n+' '+r.status);return r.arrayBuffer()})
    .then(a=>new Promise((res,rej)=>ctx.decodeAudioData(a,res,rej))).then(b=>{buf[n]=b;return b}).catch(e=>{console.warn(e.message||e);loading[n]=null});return loading[n]}
function preload(kind){[...CORE,...SPECIES(kind)].forEach(load);setTimeout(()=>{LATER.forEach(load);const F=W.FAMILIES;if(F)F.order.forEach(f=>F[f].music&&load(F[f].music.bondup_sting))},1500)}
function unlock(){if(unlocked)return;const c=ac();if(!c)return;unlocked=true;
  try{const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0)}catch(e){}
  if(c.state==='suspended')c.resume();const S=W.__echo&&W.__echo.state;preload(S&&S.kind)}
['pointerdown','touchend','keydown'].forEach(ev=>W.addEventListener(ev,unlock,{capture:true,passive:true}));
function play(n,o){o=o||{};try{const S=W.__echo&&W.__echo.state;const sv=S&&W.FAMILIES&&FAMILIES.of(S.kind).sound.sfxVariant;if(sv&&OWLVAR.has(n))n=n+'_'+sv}catch(e){}if(!on()||!unlocked||!ctx)return false;const now=performance.now();if(last[n]&&now-last[n]<(o.gap||60))return false;last[n]=now;
  const b=buf[n];if(!b){load(n);return false}
  const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.playbackRate.value=o.rate||1;g.gain.value=o.vol==null?.8:o.vol;s.connect(g);let out=g;if(o.pan&&ctx.createStereoPanner){const pn=ctx.createStereoPanner();pn.pan.value=Math.max(-1,Math.min(1,o.pan));g.connect(pn);out=pn}out.connect(ctx.destination);s.start(0);
  if(o.voice){try{voiceNode&&voiceNode.stop()}catch(e){}voiceNode=s}return true}
function chirp(text,kind,expr){
  const sp=FS(kind);let m=MOOD[expr]||null;const t=String(text||'');
  if(!m)m=/\?/.test(t)?'curious':/(sleep|nap|yawn|rest|…$|zz)/i.test(t)?'sleepy':/!/.test(t)?'happy':'curious';
  const pet=W.Dialogue&&Dialogue.persona&&Dialogue.persona.petPhrase&&t.startsWith(Dialogue.persona.petPhrase);
  let i=1+Math.floor(Math.random()*3);if(i===lastVar[m])i=i%3+1;lastVar[m]=i;
  let lk=null;try{const F=W.FAMILIES,S=W.__echo&&W.__echo.state,c=F&&S&&S.g&&((F.of(kind).sound||{}).lookChirps||{})[S.g.look];if(c&&!pet&&c.moods.includes(m)&&Math.random()<c.chance&&buf[c.sample])lk=c.sample}catch(e){}   // e.g. the lion's silly little roar (lion look only)
  const nm=lk||(pet?sp+'_pet_motif':sp+'_'+m+'_'+i),ok=play(nm,{voice:true,vol:.7,gap:120});if(ok&&W.Music)Music.talk(buf[nm]?buf[nm].duration:.6);return ok}
W.Sound={get ctx(){return ctx},play,chirp,preload,unlock,get unlocked(){return unlocked},get loaded(){return Object.keys(buf)},MOOD};
// ---- Music v2 (sound_design/v2): gapless loops (OGG Vorbis, sample-exact; 8-bit WAV fallback if OGG can't be decoded), never MP3.
// Home: bg_<echo>_day / _twilight (evening + night), 4 s crossfade on change; games: their own theme. Ducks -6 dB under Echo voices.
const Music=(function(){let cur=null,want=null,mbuf={},mload={},master=null,duckT=null,ducked=false,out=false;
  const enabled=()=>{try{const S=W.__echo&&W.__echo.state;return on()&&!(S&&S.music===false)}catch(e){return on()}};
  const vf=()=>{try{const S=W.__echo&&W.__echo.state;return S&&S.musicQuiet?.5:1}catch(e){return 1}};   // Batch D A11: Grown-ups corner "Quieter music" (loops + tune notes at half level)
  function get(n){if(mbuf[n])return Promise.resolve(mbuf[n]);if(mload[n])return mload[n];
    const dec=ext=>fetch('music/'+n+'.'+ext).then(r=>{if(!r.ok)throw new Error('music '+n+' '+r.status);return r.arrayBuffer()}).then(a=>new Promise((res,rej)=>ctx.decodeAudioData(a,res,rej)));
    return mload[n]=dec('ogg').catch(()=>dec('wav')).then(b=>{mbuf[n]=b;return b}).catch(e=>{console.warn(e.message||e);mload[n]=null})}
  function bus(){if(!master){master=ctx.createGain();master.gain.value=1;master.connect(ctx.destination)}return master}
  function set(n){want=n;if(!unlocked||!ctx||!enabled()){stopAll();return}if(cur&&cur.n===n)return;
    get(n).then(b=>{if(!b||want!==n||(cur&&cur.n===n))return;const t=ctx.currentTime,s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.loop=true;s.loopStart=0;s.loopEnd=b.duration;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.32*vf(),t+(cur?4:1.2));s.connect(g);g.connect(bus());s.start(t);
      if(cur){const o=cur;o.g.gain.cancelScheduledValues(t);o.g.gain.setValueAtTime(o.g.gain.value,t);o.g.gain.linearRampToValueAtTime(0,t+4);setTimeout(()=>{try{o.s.stop()}catch(e){}},4200)}
      cur={n,s,g,t0:t}})}   // t0: the loop's sample 0 on the audio clock (Batch D beat clock)
  function stopAll(){if(cur){try{cur.s.stop()}catch(e){}cur=null}}
  function level(v,sec){if(!master)return;const t=ctx.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(v,t+(sec||.15))}
  function band(){const h=new Date().getHours();return h>=17||h<6?'twilight':'day'}
  return {
    home(kind,tier){const F=W.FAMILIES;let n=F?F.of(kind).music.home.replace('<band>',band()):`bg_${FS(kind)}_${band()}_loop`;
      if(tier>=1&&tier<=3)n=n.replace(/_loop$/,'_t'+Math.floor(tier)+'_loop');set(n)},   // Batch D A6: bond tier 1-3 -> fewer layers (music/bg_<fam>_<band>_t<n>_loop); 4+ = the full loop
    game(name){set(`game_${name}_loop`)},
    title(){set('title_welcome_loop')},   // onboarding §4: first-run title -> welcome -> name -> age (C major, neutral)
    talk(sec){sec=sec||.6;(this.ducks=this.ducks||[]).push({to:.65,ms:Math.round(sec*1000)});if(!master||out)return;level(.65,.06);clearTimeout(duckT);duckT=setTimeout(()=>{if(!out)level(1,.2)},sec*1000)},   // ~35% duck for the chirp's length, short fades (both Echoes)
    get level(){return master?master.gain.value:1},
    duck(v){out=!!v;level(v?0:1,v?.5:1.5)},   // bond-up: fade out, come back after
    once(n,vol){if(!unlocked||!ctx||!enabled())return;level(.15,.4);get(n).then(b=>{if(!b)return level(1,1);const s=ctx.createBufferSource(),g=ctx.createGain();   // C2: one-shot goodbye melody, home loop ducked
      s.buffer=b;g.gain.value=vol||.6;s.connect(g);g.connect(ctx.destination);s.start(ctx.currentTime+.05);s.onended=()=>level(1,1.5)}).catch(()=>level(1,1))},
    refresh(){if(!enabled())stopAll();else{if(cur){const t=ctx.currentTime;cur.g.gain.cancelScheduledValues(t);cur.g.gain.setValueAtTime(cur.g.gain.value,t);cur.g.gain.linearRampToValueAtTime(.32*vf(),t+.3)}if(want)set(want)}},
    clock(){if(!cur||!ctx||cur.t0==null)return null;const L=cur.s.buffer.duration;return {name:cur.n,t:((ctx.currentTime-cur.t0)%L+L)%L}},   // Batch D: position in the playing loop (s)
    oneShot(n,o){o=o||{};if(!unlocked||!ctx||!enabled())return null;return get(n).then(b=>{if(!b)return null;const s=ctx.createBufferSource(),g=ctx.createGain();   // Batch D: tune notes, hums, home sounds
      s.buffer=b;s.playbackRate.value=o.rate||1;g.gain.value=(o.vol==null?.5:o.vol)*vf();s.connect(g);g.connect(ctx.destination);s.start(ctx.currentTime+.01);
      if(o.duck&&!out){level(o.duck,.05);clearTimeout(duckT);duckT=setTimeout(()=>{if(!out)level(1,.25)},Math.min(1200,b.duration*1000/(o.rate||1)))}return s}).catch(()=>null)},
    stop(){want=null;stopAll()},
    get playing(){return cur&&cur.n},get buffers(){return mbuf}}})();
W.Music=Music;W.addEventListener('pointerdown',()=>setTimeout(()=>{if(want_())Music.refresh()},50),{capture:true,passive:true});
function want_(){return true}
// route the existing chirp hook (pixel.js) to real sounds; the 'echo-chirp' event still fires
if(W.Chirp){const base=W.Chirp.play.bind(W.Chirp);W.Chirp.play=function(text,kind,expr){base(text,kind);try{if(text!=='*')chirp(text,kind,expr||W.Chirp.nextExpr);W.Chirp.nextExpr=null}catch(e){}}}
})();
