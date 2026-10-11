// Light sound layer (Cole's samples, sfx/*.mp3, all same-origin; no network beyond the app itself).
// Echo lines -> species chirps chosen by expression; care actions and key UI moments -> sfx. Respects the
// "Chirp sounds" toggle (S.voice). Web Audio, unlocked on the first tap (iOS). Not the full step-7 sound system.
(function(){
const W=window,BASE='sfx/';
const CORE=['ui_tap','ui_back','ui_panel_open','bond_meter_tick','care_feed_eat','care_pet_sparkle','care_nap_tuck'];
const SPECIES=k=>{const s=k==='owl'||k==='whimber'?'whimber':'slyte';return [s+'_chirp_happy',s+'_chirp_curious',s+'_chirp_sleepy',s+'_pet_motif',s+'_arrival',s+'_release']};
const LATER=['blocks_move','blocks_rotate','blocks_land','blocks_row_glow','blocks_floor_done','memory_card_flip','memory_pair_found','memory_all_cleared','radar_jingle','sky_star_connect','sky_named_chord'];
// expression -> chirp mood (happy / curious / sleepy); sad and wistful use the soft sleepy chirp
const MOOD={happy:'happy',delighted:'happy',giggling:'happy',proud:'happy',love:'happy',excited:'happy',eating:'happy',
  curious:'curious',thinking:'curious',surprised:'curious',concentrating:'curious',neutral:'curious',shy:'curious',
  sleepy:'sleepy',sad:'sleepy',wistful:'sleepy'};
let ctx=null,buf={},loading={},unlocked=false,last={},voiceNode=null;
function on(){try{const S=W.__echo&&W.__echo.state;if(S&&S.voice===false)return false;const v=document.getElementById('voice');if(v&&!S)return v.checked}catch(e){}return true}
function ac(){if(!ctx){const C=W.AudioContext||W.webkitAudioContext;if(!C)return null;ctx=new C()}return ctx}
function load(n){if(buf[n]||loading[n]||!ac())return loading[n];
  loading[n]=fetch(BASE+n+'.mp3').then(r=>{if(!r.ok)throw new Error('sfx '+n+' '+r.status);return r.arrayBuffer()})
    .then(a=>new Promise((res,rej)=>ctx.decodeAudioData(a,res,rej))).then(b=>{buf[n]=b;return b}).catch(e=>{console.warn(e.message||e);loading[n]=null});return loading[n]}
function preload(kind){[...CORE,...SPECIES(kind)].forEach(load);setTimeout(()=>LATER.forEach(load),1500)}
function unlock(){if(unlocked)return;const c=ac();if(!c)return;unlocked=true;
  try{const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0)}catch(e){}
  if(c.state==='suspended')c.resume();const S=W.__echo&&W.__echo.state;preload(S&&S.kind)}
['pointerdown','touchend','keydown'].forEach(ev=>W.addEventListener(ev,unlock,{capture:true,passive:true}));
function play(n,o){o=o||{};if(!on()||!unlocked||!ctx)return false;const now=performance.now();if(last[n]&&now-last[n]<(o.gap||60))return false;last[n]=now;
  const b=buf[n];if(!b){load(n);return false}
  const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.playbackRate.value=o.rate||1;g.gain.value=o.vol==null?.8:o.vol;s.connect(g);let out=g;if(o.pan&&ctx.createStereoPanner){const pn=ctx.createStereoPanner();pn.pan.value=Math.max(-1,Math.min(1,o.pan));g.connect(pn);out=pn}out.connect(ctx.destination);s.start(0);
  if(o.voice){try{voiceNode&&voiceNode.stop()}catch(e){}voiceNode=s}return true}
function chirp(text,kind,expr){
  const sp=kind==='owl'?'whimber':'slyte';let m=MOOD[expr]||null;const t=String(text||'');
  if(!m)m=/\?/.test(t)?'curious':/(sleep|nap|yawn|rest|…$|zz)/i.test(t)?'sleepy':/!/.test(t)?'happy':'curious';
  const pet=W.Dialogue&&Dialogue.persona&&Dialogue.persona.petPhrase&&t.startsWith(Dialogue.persona.petPhrase);
  return play(pet?sp+'_pet_motif':sp+'_chirp_'+m,{voice:true,vol:.7,rate:1+((t.length*7)%9-4)/100})}
W.Sound={play,chirp,preload,unlock,get unlocked(){return unlocked},get loaded(){return Object.keys(buf)},MOOD};
// route the existing chirp hook (pixel.js) to real sounds; the 'echo-chirp' event still fires
if(W.Chirp){const base=W.Chirp.play.bind(W.Chirp);W.Chirp.play=function(text,kind,expr){base(text,kind);try{if(text!=='*')chirp(text,kind,expr||W.Chirp.nextExpr);W.Chirp.nextExpr=null}catch(e){}}}
})();
