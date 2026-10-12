// Need-aware line & conversation selection (PROPOSAL for Daniel's review; not in the repo).
// Sits on top of dialogue.js v3 (Dialogue.bark / eligible / no-repeat stay as they are) and needs no schema change:
//   - new bark keys need_<state>, after_hug, after_play, wake_up, look_tap, weather_<w>
//   - a tag table (need_tags.json, built from need_map.json) marks EXISTING lines/conversations with states
// Guardrails baked in: no cue in the first 20 s of a session (open happy), one need voiced at a time (the same one the
// thought icon shows), max 3 cues per need per session, a low need changes how OFTEN a cue plays, never how upset it is.
(function(){
const W=typeof window!=='undefined'?window:globalThis;
const NS={};
NS.cfg={
  enter:35, exit:50, contentMin:60,          // hysteresis: a need turns "on" below 35 and "off" above 50 (no flicker)
  gain:3.0, general:1.0, content:0.6,        // slot weights: need state = gain × pressure × tod; general chatter stays in the mix
  newShare:0.6,                              // when a state wins: 60% from need_<state>, 40% from tagged existing lines
  sameStateMs:120e3, anyNeedMs:60e3,         // cooldowns: same state ≥ 2 min apart, any need cue ≥ 1 min apart
  satisfiedMs:10*60e3,                       // after the child meets a need, that state is muted for 10 min
  perSession:3, graceMs:20e3,
  energetic:{restMin:70,playMax:60,p:0.4},   // well-rested + not much play = "energetic" → playful pressure ≥ 0.4
  tod:{slyte:{morning:{playful:1.3},day:{},evening:{sleepy:1.3},night:{sleepy:1.6,playful:.7}},
       whimber:{morning:{sleepy:1.2},day:{sleepy:1.5,playful:.8},evening:{playful:1.2},night:{playful:1.1}}}};
const NEED={hungry:'food',cuddly:'comfort',playful:'play',sleepy:'rest'};
const AFTER={hungry:null,cuddly:'after_hug',playful:'after_play',sleepy:'wake_up'};   // hungry already has fed / fed_fav
NS.mem={on:{},at:{},any:-1e15,n:{},mute:{},start:0,last:null,queue:[]};
NS.tags={barks:{},convs:{}};                  // barks: {"ambient:<hash>":["hungry"]}, convs: {id:["hungry"]}
NS.now=()=>Date.now(); NS.rand=Math.random;
NS.session=function(){NS.mem.start=NS.now();NS.mem.n={};NS.mem.queue=[]};
// ---- pressures 0..1 per state, with hysteresis
NS.pressures=function(needs,species,band){const c=NS.cfg,p={};
  for(const st in NEED){const v=needs[NEED[st]];const on=NS.mem.on[st]=NS.mem.on[st]?v<c.exit:v<c.enter;
    p[st]=on?Math.max(0,Math.min(1,(c.exit-v)/c.exit)):0}
  if(needs.rest>=c.energetic.restMin&&needs.play<=c.energetic.playMax)p.playful=Math.max(p.playful,c.energetic.p);
  const t=(c.tod[species]||{})[band]||{};for(const st in p)if(p[st]>0)p[st]*=(t[st]||1);
  return p};
NS.content=needs=>Object.values(NEED).every(k=>needs[k]>=NS.cfg.contentMin);
NS.top=p=>{let b=null;for(const st in p)if(p[st]>0&&(!b||p[st]>p[b]))b=st;return b};   // what the thought icon shows
NS.blocked=function(st){const m=NS.mem,c=NS.cfg,t=NS.now();
  return t-m.start<c.graceMs||t-(m.at[st]||-1e15)<c.sameStateMs||t-m.any<c.anyNeedMs||(m.mute[st]||0)>t||(m.n[st]||0)>=c.perSession};
// ---- one ambient / opener slot: returns {state, key, line}
NS.slot=function(ctx){   // ctx: {needs, species, band, weather}
  const c=NS.cfg,m=NS.mem,D=W.Dialogue;
  if(m.queue.length){const k=m.queue.shift();return {state:'after',key:k,line:D.bark(k)}}   // afterglow first (once)
  const p=NS.pressures(ctx.needs,ctx.species,ctx.band),top=NS.top(p);
  const opts=[['general',c.general]];
  if(top&&!NS.blocked(top))opts.push([top,c.gain*p[top]]);                                // only the shown need is voiced
  if(!top&&NS.content(ctx.needs)&&!NS.blocked('content'))opts.push(['content',c.content]);
  if(ctx.weather&&ctx.weather!=='clear'&&!NS.blocked('w_'+ctx.weather))opts.push(['w_'+ctx.weather,0.35]);
  let r=NS.rand()*opts.reduce((s,o)=>s+o[1],0),st='general';for(const [k,w] of opts){r-=w;if(r<=0){st=k;break}}
  if(st==='general'){const wx=ctx.weather||'clear';   // existing ambient, minus lines tagged for other needs/weather
    const line=D.bark('ambient',null,l=>{const tg=NS.tags.barks['ambient:'+NS.h(l.text)]||[];return !tg.some(t=>t.startsWith('w_')&&t!=='w_'+wx)&&!tg.some(t=>NEED[t]&&t!==top)});
    return {state:'general',key:'ambient',line:line||D.bark('ambient')}}
  m.at[st]=NS.now();m.n[st]=(m.n[st]||0)+1;if(st!=='content'&&!st.startsWith('w_'))m.any=NS.now();
  const key=st.startsWith('w_')?'weather_'+st.slice(2):'need_'+st;
  if(NS.rand()>=c.newShare){const old=D.bark('ambient',null,l=>(NS.tags.barks['ambient:'+NS.h(l.text)]||[]).includes(st));if(old)return {state:st,key:'ambient',line:old}}
  return {state:st,key,line:D.bark(key)}};
// ---- the after-care "little moment": conversation weighted by need, no-repeat & topic rules from dialogue.js still apply
NS.pickConversation=function(ctx){const D=W.Dialogue,p=NS.pressures(ctx.needs,ctx.species,ctx.band),t=NS.now();
  const pool=D.eligible('idle',v=>{const tg=NS.tags.convs[v.id]||[];return !tg.some(s=>(NS.mem.mute[s]||0)>t)});   // e.g. no yawn chat right after a nap
  if(!pool.length)return null;const seen=(D.ctx().seen||[]);const fresh=pool.filter(v=>!seen.includes(v.id));const L=fresh.length?fresh:pool;
  const w=v=>(v.weight||1)*(1+NS.cfg.gain*Math.max(0,...(NS.tags.convs[v.id]||[]).map(s=>p[s]||0)));
  let r=NS.rand()*L.reduce((s,v)=>s+w(v),0);for(const v of L){r-=w(v);if(r<=0)return v}return L[0]};
// ---- care hooks: call when a need is met (feed / hug / play / nap end)
NS.satisfied=function(st){NS.mem.mute[st]=NS.now()+NS.cfg.satisfiedMs;NS.mem.on[st]=false;const a=AFTER[st];if(a&&!NS.mem.queue.includes(a))NS.mem.queue.push(a)};
NS.h=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)};   // same hash as dialogue.js lineKey
W.NeedSelect=NS;if(typeof module!=='undefined')module.exports=NS;
})();
