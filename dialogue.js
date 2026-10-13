// Echo dialogue engine v3. It loads the JSON libraries (shared + species), picks barks with no-repeat rules,
// runs multi-turn conversations with kid-reply phrasing pools, fallbacks, a 45 s carry-on, tangents, drift and lost thoughts,
// and fills in per-Echo pet phrases and invented words. Schema: DIALOGUE_SCHEMA.md
(()=>{
const W=typeof window!=='undefined'?window:globalThis;
const D={lib:null};
const DAY=864e5;
D.rand=Math.random;                       // injectable for tests
D.now=()=>Date.now();                     // the game injects its demo-aware clock
D.timers={set:(f,ms)=>setTimeout(f,ms),clear:t=>clearTimeout(t)};
D.mem={};                                 // persisted by the game (S.dlg): lineAt, topicAt, phraseAt, petSince
D.persona=null;                           // {petPhrase, word}
D.cfg={lineDays:7,coreLineHours:24,topicDays:5,carryOnMs:45000,petEvery:10,driftChances:[0.6,0.3,0],lostThoughtChance:1/8};
const CORE=/^(fed|fed_fav|full|pet|sit|nap|napping|not_sleepy|hello|game_tired|game_end|pairs_|run_|time_|carry_on|fallback|drift_bridge|lost_thought)/;
const rand=a=>a[Math.floor(D.rand()*a.length)];
const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)};

D.loader=async f=>{const r=await fetch('dialogue/'+f+'.json',{cache:'no-cache'});if(!r.ok)throw new Error('dialogue '+f+' '+r.status);return r.json()};
D.load=async function(species){
  const [sh,sp]=await Promise.all([D.loader('shared'),D.loader(species)]);
  return D.use(species,sh,sp);
};
D.use=function(species,sh,sp){
  const barks={...sh.barks,...sp.barks};
  for(const k of ['time_morning','time_day','time_evening','time_night'])if(sh.barks[k]&&sp.barks[k])barks[k]=sp.barks[k].concat(sh.barks[k]);
  const convs=[...(sh.conversations||[]),...(sp.conversations||[])];
  const groups=sp.topicGroups||{};const groupOf={};for(const g in groups)for(const t of groups[g])groupOf[t]=g;
  D.lib={species,barks,conversations:convs,vars:{...(sh.vars||{}),...(sp.vars||{})},replyPools:sh.replyPools||{},intentMap:sh.intentMap||{},
    persona:sp.persona||{petPhrases:[],words:[]},groupOf};
  return D.lib;
};
// topic = explicit conv.topic, else the second id segment (slyte_puddle_talk → puddle)
D.topic=c=>c.topic||(c.id.split('_')[1]||c.id);
// pick this Echo's pet phrase and invented word deterministically from its seed (Overhaul D3)
D.setPersona=function(seed){const p=D.lib.persona;const s=Math.abs(seed|0)||1;
  D.persona={petPhrase:p.petPhrases.length?p.petPhrases[s%p.petPhrases.length]:'',word:p.words.length?p.words[Math.floor(s/7)%p.words.length]:''};return D.persona};

D.ctx=()=>({});
function check(cond,ctx){
  if(!cond)return true; const c=cond;
  if(c.mood&&!c.mood.includes(ctx.mood))return false;
  if(c.bondMin!=null&&ctx.bond<c.bondMin)return false; if(c.bondMax!=null&&ctx.bond>c.bondMax)return false;
  if(c.stageMin!=null&&ctx.stage<c.stageMin)return false; if(c.stageMax!=null&&ctx.stage>c.stageMax)return false;
  if(c.hasMemory&&!(ctx.memTags||[]).includes(c.hasMemory))return false;
  if(c.notMemory&&(ctx.memTags||[]).includes(c.notMemory))return false;
  if(c.talent&&!(ctx.talents||[]).includes(c.talent))return false;
  if(c.time&&!c.time.includes(ctx.time))return false;
  if(c.var)for(const k in c.var){if((ctx.vars||{})[k]!==c.var[k])return false}
  if(c.varSet&&!(c.varSet in (ctx.vars||{})))return false;
  if(c.varUnset&&(c.varUnset in (ctx.vars||{})))return false;
  if(c.notSeen&&(ctx.seen||[]).includes(c.notSeen))return false;
  if(c.any&&!c.any.some(x=>check(x,ctx)))return false;
  return true;
}
D.check=check;

// ---- pet phrases & invented words
function cap(src,w){return src[0]===src[0].toUpperCase()?w[0].toUpperCase()+w.slice(1):w}
D.personalize=function(text){
  if(!D.persona)return text;let t=text;const p=D.lib.persona;
  // invented word: {word:shiny} slot, and any sibling invented word from the species list becomes this Echo's word
  t=t.replace(/\{word:([\w-]+)\}/g,()=>D.persona.word||'');
  if(D.persona.word&&p.words.length){const re=new RegExp('\\b('+p.words.map(w=>w.replace(/[-]/g,'\\-')).join('|')+')\\b','gi');t=t.replace(re,m=>cap(m,D.persona.word))}
  // pet phrase slot: at most once per petEvery lines
  if(t.includes('{pet_phrase}')){const ok=petBudget();t=t.replace(/\{pet_phrase\}/g,ok?D.persona.petPhrase:'').replace(/\s{2,}/g,' ').replace(/^\s+|\s+$/g,'');if(ok)D.mem.petSince=0}
  return t;
};
function petBudget(){return (D.mem.petSince==null?99:D.mem.petSince)>=D.cfg.petEvery}
D.countLine=()=>{D.mem.petSince=(D.mem.petSince==null?99:D.mem.petSince)+1};
// approved insertion point: prepend the pet phrase to a line if the budget allows
D.withPet=function(line){if(!line||!D.persona||!D.persona.petPhrase||!petBudget())return line;D.mem.petSince=0;return {...line,text:D.persona.petPhrase+' '+line.text,pet:true}};

D.fill=function(t,extra){const ctx={...D.ctx(),...(extra||{})};
  const out=String(t).replace(/\{(\w+)(?::([^}]+))?\}/g,(m,k,a)=>{
    if(k==='var')return (ctx.vars||{})[a]??'';if(k==='pick')return rand(String(a).split('|'));if(k==='word'||k==='pet_phrase')return m;
    return extra&&extra[k]!=null?extra[k]:(ctx.fill&&ctx.fill[k]!=null?ctx.fill[k]:m)});
  return D.personalize(out)};

// ---- no-repeat rules (Overhaul B10): exact line 7 days (core reactions 24 h); least-recently-used fallback
function lineKey(key,l){return key+':'+(l.text?hash(l.text):'act'+(((D.lib&&D.lib.barks[key])||[]).indexOf(l)))}
function recentWindow(key){return CORE.test(key)?D.cfg.coreLineHours*36e5:D.cfg.lineDays*DAY}
D.bark=function(key,extra,filter){
  const ctx={...D.ctx(),...(extra||{})};const all=((D.lib&&D.lib.barks[key])||[]).filter(l=>check(l.cond,ctx)&&(!filter||filter(l)));
  if(!all.length)return filter?null:{text:'…',expr:'neutral',key};
  const at=D.mem.lineAt=D.mem.lineAt||{};const now=D.now(),win=recentWindow(key);
  let pool=all.filter(l=>!(at[lineKey(key,l)]>now-win));
  if(!pool.length){const oldest=Math.min(...all.map(l=>at[lineKey(key,l)]||0));pool=all.filter(l=>(at[lineKey(key,l)]||0)===oldest)}
  const tot=pool.reduce((s,l)=>s+(l.weight||1),0);let r=D.rand()*tot,l=pool[0];for(const x of pool){r-=(x.weight||1);if(r<=0){l=x;break}}
  at[lineKey(key,l)]=now;D.countLine();
  return {text:D.fill(l.text,extra),expr:l.expr||'neutral',react:l.react,key,src:l,gesture:l.gesture,caption:l.caption&&D.fill(l.caption,extra),voice:l.voice};
};
D.prune=function(){const now=D.now();for(const m of ['lineAt','topicAt','phraseAt']){const o=D.mem[m]||{};for(const k in o)if(o[k]<now-8*DAY)delete o[k]}};

// ---- conversations: topic not re-offered within 5 days
D.topicFresh=c=>!((D.mem.topicAt||{})[D.topic(c)]>D.now()-D.cfg.topicDays*DAY);
D.eligible=function(trigger,extraFilter){const ctx=D.ctx();
  return D.lib.conversations.filter(v=>(v.trigger||'idle')===trigger&&check(v.cond,ctx)&&!(v.once&&(ctx.seen||[]).includes(v.id))&&D.topicFresh(v)&&(!extraFilter||extraFilter(v)))};
function weighted(pool){const tot=pool.reduce((s,v)=>s+(v.weight||1),0);let r=D.rand()*tot;for(const v of pool){r-=(v.weight||1);if(r<=0)return v}return pool[0]}
D.pickConversation=function(trigger,extraFilter){const c=D.eligible(trigger||'idle',extraFilter);if(!c.length)return null;
  const seen=D.ctx().seen||[];const fresh=c.filter(v=>!seen.includes(v.id));return weighted(fresh.length?fresh:c)};
D.markTopic=c=>{(D.mem.topicAt=D.mem.topicAt||{})[D.topic(c)]=D.now()};
// after a conversation: drift to a linked topic (0.6 → 0.3 → 0), or ~1 in 8 lose the thought (Overhaul B7)
D.afterConversation=function(conv,depth){
  if(D.rand()<D.cfg.lostThoughtChance)return {type:'lost',line:D.bark('lost_thought')};
  const p=D.cfg.driftChances[Math.min(depth||0,D.cfg.driftChances.length-1)];
  if(D.rand()<p){const g=D.lib.groupOf[D.topic(conv)];
    const next=D.pickConversation('idle',v=>D.topic(v)!==D.topic(conv)&&g&&D.lib.groupOf[D.topic(v)]===g);
    if(next)return {type:'drift',conv:next,line:D.bark('drift_bridge')}}
  return null;
};

// ---- kid reply phrasing (Overhaul B6): choices carry an intent; generic labels get a fresh phrasing from the pool
D.intentOf=function(c){if(c.intent)return c.intent;const m=D.lib.intentMap||{};const l=(c.label||'').trim();for(const i in m)if(m[i].includes(l))return i;return null};
D.phrase=function(intent,avoid){const pool=(D.lib.replyPools[intent]||{}).phrases||[];if(!pool.length)return null;
  const at=D.mem.phraseAt=D.mem.phraseAt||{};const ok=pool.filter(p=>!(avoid||[]).includes(p.text));const cand=ok.length?ok:pool;
  const min=Math.min(...cand.map(p=>at[intent+':'+p.text]||0));const lru=cand.filter(p=>(at[intent+':'+p.text]||0)===min);const p=rand(lru);at[intent+':'+p.text]=D.now();return p};
D.present=function(choices){const used=[];return choices.map(c=>{const intent=D.intentOf(c);let icon=c.icon||'💬',label=c.label||'';
  const pooled=/^@pool:/.test(label)||(intent&&(D.lib.intentMap[intent]||[]).includes(label.trim()));
  if(intent&&pooled){const p=D.phrase(/^@pool:/.test(label)?label.slice(6):intent,used);if(p){label=p.text;icon=c.icon&&!/^@pool:/.test(c.label)?c.icon:(p.icon||(D.lib.replyPools[intent]||{}).icon||icon)}}
  used.push(label);return {icon,label:D.fill(label),intent}})};
// fallback reply for anything unexpected: a choice with no reply and no destination, a broken goto, or no input at all
D.fallback=intent=>D.bark('fallback_'+(intent||'any'),null,null)||D.bark('fallback_any');

// run(conv, ui, done): ui = {say, choose(list, cb, opts), cancelChoices, setVar, remember, bond, react, seen, tangent, tangentRate}
D.run=function(conv,ui,done){
  if(typeof conv==='string')conv=D.lib.conversations.find(c=>c.id===conv);if(!conv)return done&&done();
  ui.seen&&ui.seen(conv.id);D.markTopic(conv);
  const finish=(info)=>{done&&done(info||{})};
  const apply=o=>{if(!o)return;if(o.set)for(const k in o.set)ui.setVar(k,D.fill(o.set[k]));if(o.memory)ui.remember(D.fill(o.memory),o.memoryTag);if(o.bond)ui.bond(o.bond);if(o.react)ui.react(o.react)};
  let tangentUsed=false;const T=D.timers;
  const go=id=>{
    const n=conv.nodes[id];
    if(!n){if(id!=null){const f=D.fallback();ui.say(f);T.set(()=>finish({fallback:true}),2200)}else finish();return}
    const ctx=D.ctx();
    if(n.branch){const b=n.branch.find(x=>check(x.cond,ctx));return go(b?b.goto:n.next)}
    apply(n);
    const line={text:D.fill(n.say||''),expr:n.expr||'neutral',react:n.react,gesture:n.gesture,caption:n.caption&&D.fill(n.caption),voice:n.voice};D.countLine();
    const ch=(n.choices||[]).filter(c=>check(c.cond,ctx)).slice(0,4);
    if(ch.length){
      ui.say(line,600000);const shown=D.present(ch);let carry=null,answered=false;
      const pickChoice=(i,auto)=>{if(answered)return;answered=true;T.clear(carry);const c=ch[i];apply(c);
        let reply=c.reply!=null&&(c.reply||c.gesture)?{text:D.fill(c.reply||''),expr:c.expr||'happy',react:c.react,gesture:c.gesture,caption:c.caption&&D.fill(c.caption),voice:c.voice}:null;
        if(!reply&&!c.goto)reply=D.fallback(shown[i].intent);
        if(reply){ui.say(reply);D.countLine();T.set(()=>go(c.goto),Math.max(1800,reply.text.length*55))}else go(c.goto)};
      const arm=()=>{T.clear(carry);carry=T.set(()=>{if(answered)return;ui.cancelChoices&&ui.cancelChoices();
        const cl=D.bark('carry_on');ui.say(cl);D.countLine();
        const li=shown.findIndex(s=>s.intent==='listen');
        T.set(()=>{if(li>=0)pickChoice(li,true);else{answered=true;finish({carriedOn:true})}},Math.max(2000,cl.text.length*55))},D.cfg.carryOnMs)};
      arm();
      ui.choose(shown.map(s=>[s.icon,s.label,s.intent]),i=>pickChoice(i),{onTap:arm});
    }else{ui.say(line);const wait=n.wait||Math.max(1800,line.text.length*55);
      if(n.next&&!tangentUsed&&ui.tangent&&D.rand()<(ui.tangentRate||0.15)){tangentUsed=true;
        T.set(()=>{const t=ui.tangent();if(!t)return go(n.next);ui.say(t);T.set(()=>go(n.next),Math.max(2200,t.text.length*55))},wait)}
      else if(n.next)T.set(()=>go(n.next),wait);else T.set(()=>finish(),Math.min(wait,2500))}
  };
  go(conv.start||Object.keys(conv.nodes)[0]);
};
W.Dialogue=D;
if(typeof module!=='undefined')module.exports=D;
})();
