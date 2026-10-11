// Shiny Pairs engine (Memory card game, game spec v0.3 §1). Pure logic, testable in node.
// One board spans the 3 rounds; rounds end at pairs 3/6/10 (easy 2/4/6). No timer, no fail, no turn limit.
(function(root){
const DECK={slyte:['blackberry','honey_cake','trinket','leaf','nut','apple','daisy','pinecone','mushroom','ball'],
  whimber:['star','moon','leaf_green','comet','feather','dewdrop','firefly','lantern','cloud','book']};
const LEVELS={easy:{pairs:6,cols:3,rows:4,hintAfter:2,rounds:[2,4,6]},standard:{pairs:10,cols:4,rows:5,hintAfter:3,rounds:[3,6,10]},
  bigkid:{pairs:10,cols:4,rows:5,hintAfter:0,rounds:[3,6,10],stars:true}};
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function create(o){o=o||{};const level=LEVELS[o.level]?o.level:'standard',L=LEVELS[level],r=rng(o.seed||Date.now());
  let items=(DECK[o.species||'slyte']).slice(0,L.pairs);
  if(o.disguise&&level==='bigkid')items[items.length-1]='slyte_token';   // Master of Disguise: one hidden "Slyte" pair (board stays 20)
  const cards=[];items.forEach(it=>{cards.push({item:it,up:false,paired:false});cards.push({item:it,up:false,paired:false})});
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}
  return {level,L,cols:L.cols,rows:L.rows,cards,open:[],pairs:0,turns:0,missStreak:0,hint:null,pending:false,events:[],cursor:0,done:false,roundIdx:0}}
function partner(g,i){return g.cards.findIndex((c,j)=>j!==i&&c.item===g.cards[i].item)}
function flip(g,i){const c=g.cards[i];if(g.done||!c||c.paired||c.up)return 'ignored';
  if(g.pending){resolve(g);return 'resolved'}            // after a miss, the next tap turns the cards back
  c.up=true;g.open.push(i);g.events.push({type:'flip',i});
  if(g.open.length===1){if(g.hintArmed){g.hintArmed=false;g.hint=partner(g,i);g.events.push({type:'hint',i:g.hint})}return 'first'}
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
const API={DECK,LEVELS,create,flip,resolve,partner,stars,slow,cursorMove,cursorDown,take};
if(typeof module!=='undefined')module.exports=API;root.MemoryEngine=API;
})(typeof window!=='undefined'?window:globalThis);
