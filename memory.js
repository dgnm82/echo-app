// Shiny Pairs engine (Memory card game, game spec v0.3 §1). Pure logic, testable in node.
// One board spans the 3 rounds; rounds end at pairs 3/6/10 (easy 2/4/6). No timer, no fail, no turn limit.
(function(root){
const FAMS=root.FAMILIES||(typeof require!=='undefined'&&(()=>{const w=typeof window!=='undefined'?window:(global.window=global);require('./families.js');return w.FAMILIES})()),DECK={};
for(const f of FAMS.order)DECK[f]=FAMS[f].games.memoryDeck;   // decks live in the family manifests
const LEVELS={easy:{pairs:6,cols:3,rows:4,hintAfter:2,rounds:[2,4,6]},standard:{pairs:10,cols:4,rows:5,hintAfter:3,rounds:[3,6,10]},
  bigkid:{pairs:10,cols:4,rows:5,hintAfter:0,rounds:[3,6,10],stars:true}};
// LIST2 #5 (Daniel, Oct 26 6:12pm PT): Pairs morphs into true matching by sound as the child progresses. Every card has its OWN sound
// (both cards of a pair sound the same; real notes from music/tunes.json families.<fam>.pairs, never synthesized pitches):
//   stage 0 pictures + their sounds (the board as before) -> 1-2 the picture fades under a note face (sound matters more)
//   -> 3 alike pictures (every face is the same note card) -> 4 sound only, same pitch -> 5 sound only, the same little tune.
// Hints fade as the child improves: a higher hint threshold each stage, +1 per clean board in a row, none at the last stage.
// A paired card always shows its picture (the reveal is the reward). Progress: 2 good boards (not slow) step up, 2 slow boards step back.
const MORPH=[
  {id:'picture',face:'picture',sound:'tune'},
  {id:'fade1',face:'ghost',ghost:.5,sound:'tune',pairs:6,hintAfter:3},
  {id:'fade2',face:'ghost',ghost:.2,sound:'tune',pairs:6,hintAfter:4},
  {id:'alike',face:'alike',sound:'tune',pairs:6,hintAfter:4},
  {id:'pitch',face:'none',sound:'pitch',pairs:6,hintAfter:5},
  {id:'tune',face:'none',sound:'tune',pairs:6,hintAfter:0}];
const MORPH_UP=2,MORPH_DOWN=2,HINT_FADE_MAX=2;
// real-note pool for sound-only "same pitch": every note the family's pair tunes use, low to high, spread over the board's pairs
const MIDI=n=>{const m=/^([a-g])(#|b)?(\d)$/.exec(String(n).toLowerCase());if(!m)return NaN;return 12*(+m[3]+1)+{c:0,d:2,e:4,f:5,g:7,a:9,b:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)};
function pitchPool(snd){const all=[...new Set([].concat(...Object.values(snd||{})))].filter(n=>!isNaN(MIDI(n)));return all.sort((a,b)=>MIDI(a)-MIDI(b))}
function soundsFor(items,stage,snd){const M=MORPH[stage]||MORPH[0],out={};
  if(M.sound==='pitch'){const P=pitchPool(snd),k=items.length;items.forEach((it,i)=>{out[it]=[P[Math.round(i*(P.length-1)/Math.max(1,k-1))]]})}
  else items.forEach(it=>{const t=snd&&(snd[it]||snd[String(it).replace(/^\w+_token$/,'token')]);if(t)out[it]=t.slice()});
  return out}
function morphOf(p){return Math.max(0,Math.min(MORPH.length-1,(p&&p.stage)|0))}
function morphHint(stage,clean){const M=MORPH[stage]||MORPH[0];if(!stage)return null;if(!M.hintAfter)return 0;return M.hintAfter+Math.min(HINT_FADE_MAX,clean|0)}
// after a board: {slow, hints} -> moves p.stage (returns 'up'|'down'|null). p = S.pairs
function morphAfter(p,r){p.stage=morphOf(p);p.good=p.good|0;p.bad=p.bad|0;p.clean=p.clean|0;
  if(r.slow){p.bad++;p.good=0;p.clean=0}else{p.good++;p.bad=0;p.clean=r.hints?0:p.clean+1}
  if(p.good>=MORPH_UP&&p.stage<MORPH.length-1){p.stage++;p.good=0;p.clean=0;return 'up'}
  if(p.bad>=MORPH_DOWN&&p.stage>0){p.stage--;p.bad=0;return 'down'}return null}
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function create(o){o=o||{};const level=LEVELS[o.level]?o.level:'standard',stage=Math.max(0,Math.min(MORPH.length-1,o.morph|0)),M=MORPH[stage],r=rng(o.seed||Date.now());
  let L=LEVELS[level];if(stage>0){const h=o.hintAfter!=null?o.hintAfter:morphHint(stage,o.clean);L=Object.assign({},LEVELS.easy,{pairs:M.pairs,hintAfter:h,stars:!!LEVELS[level].stars})}
  let items=(o.deck||DECK[o.species||'slyte']).slice(0,L.pairs);   // deck: manifest games.memoryDeck
  if(o.disguise&&level==='bigkid')items[items.length-1]=o.token||'slyte_token';   // Master of Disguise: one hidden "Slyte" pair (board stays 20)
  const cards=[];items.forEach(it=>{cards.push({item:it,up:false,paired:false});cards.push({item:it,up:false,paired:false})});
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}
  const snd=soundsFor(items,stage,o.sounds);cards.forEach(c=>{c.snd=snd[c.item]||null});
  return {level,L,cols:L.cols,rows:L.rows,cards,open:[],pairs:0,turns:0,missStreak:0,hint:null,hints:0,pending:false,events:[],cursor:0,done:false,roundIdx:0,stage,morph:M}}
function partner(g,i){return g.cards.findIndex((c,j)=>j!==i&&c.item===g.cards[i].item)}
function flip(g,i){const c=g.cards[i];if(g.done||!c||c.paired||c.up)return 'ignored';
  if(g.pending){resolve(g);return 'resolved'}            // after a miss, the next tap turns the cards back
  c.up=true;g.open.push(i);g.events.push({type:'flip',i});
  if(g.open.length===1){if(g.hintArmed){g.hintArmed=false;g.hint=partner(g,i);g.hints++;g.events.push({type:'hint',i:g.hint})}return 'first'}
  g.turns++;const [a,b]=g.open;
  if(g.cards[a].item===g.cards[b].item){g.cards[a].paired=g.cards[b].paired=true;g.open=[];g.pairs++;g.missStreak=0;g.hint=null;
    g.events.push({type:'pair',item:g.cards[a].item,a,b});
    if(g.pairs>=g.L.rounds[g.roundIdx]){g.events.push({type:'round',round:g.roundIdx});g.roundIdx++}
    if(g.pairs>=g.L.pairs){g.done=true;g.events.push({type:'done'})}return 'pair'}
  g.pending=true;g.missStreak++;g.events.push({type:'miss',a,b,partnerOfFirst:partner(g,a)});
  if(g.L.hintAfter&&g.missStreak>=g.L.hintAfter){g.hintArmed=true;g.missStreak=0}return 'miss'}
function resolve(g){if(!g.pending)return false;g.open.forEach(i=>g.cards[i].up=false);g.events.push({type:'back',cards:g.open.slice()});g.open=[];g.pending=false;return true}
function stars(g){if(!g.L.stars)return 0;return g.turns<=18?3:g.turns<=24?2:1}
function slow(g){return g.turns>2*g.L.pairs}
// handheld cursor (spec §1): ◀ ▶ reading order with wrap, skipping paired cards; B jumps down one row (wraps)
function cursorMove(g,d){const n=g.cards.length;let i=g.cursor;for(let k=0;k<n;k++){i=(i+d+n)%n;if(!g.cards[i].paired){g.cursor=i;return i}}return g.cursor}
function cursorDown(g){const n=g.cards.length;let i=g.cursor;for(let k=0;k<g.rows;k++){i=(i+g.cols)%n;if(!g.cards[i].paired){g.cursor=i;return i}}return cursorMove(g,1)}
function take(g){const e=g.events;g.events=[];return e}
const API={DECK,LEVELS,MORPH,MORPH_UP,MORPH_DOWN,morphOf,morphHint,morphAfter,soundsFor,pitchPool,MIDI,create,flip,resolve,partner,stars,slow,cursorMove,cursorDown,take};
if(typeof module!=='undefined')module.exports=API;root.MemoryEngine=API;
})(typeof window!=='undefined'?window:globalThis);
