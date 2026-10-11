// Echo dialogue engine — loads JSON libraries (shared + species), picks barks, runs multi-turn conversations.
// Schema: see DIALOGUE_SCHEMA.md
(()=>{
const D={lib:null,ui:null};
const rand=a=>a[Math.floor(Math.random()*a.length)];
D.load=async function(species){
  const get=async f=>{const r=await fetch('dialogue/'+f+'.json',{cache:'no-cache'});if(!r.ok)throw new Error('dialogue '+f+' '+r.status);return r.json()};
  const [sh,sp]=await Promise.all([get('shared'),get(species)]);
  const barks={...sh.barks,...sp.barks};
  // situational time-of-day pools are additive (shared + species); other species keys override shared
  for(const k of ['time_morning','time_day','time_evening','time_night'])if(sh.barks[k]&&sp.barks[k])barks[k]=sp.barks[k].concat(sh.barks[k]);
  D.lib={species,barks,conversations:[...(sh.conversations||[]),...(sp.conversations||[])],vars:{...(sh.vars||{}),...(sp.vars||{})}};
  return D.lib;
};
// ctx provider: injected by game (state, mood, bond, stage, memories, vars, extra fill values)
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
D.fill=function(t,extra){const ctx={...D.ctx(),...(extra||{})};return String(t).replace(/\{(\w+)(?::(\w+))?\}/g,(m,k,a)=>{
  if(k==='var')return (ctx.vars||{})[a]??'';if(k==='pick')return rand(String(a).split('|'));return extra&&extra[k]!=null?extra[k]:(ctx.fill&&ctx.fill[k]!=null?ctx.fill[k]:m)})};
// bark: one-line pool → {text, expr, react}
D.bark=function(key,extra,filter){
  const ctx={...D.ctx(),...(extra||{})};const pool=((D.lib&&D.lib.barks[key])||[]).filter(l=>check(l.cond,ctx)&&(!filter||filter(l)));
  if(!pool.length)return filter?null:{text:'…',expr:'neutral',key};
  const tot=pool.reduce((s,l)=>s+(l.weight||1),0);let r=Math.random()*tot,l=pool[0];for(const x of pool){r-=(x.weight||1);if(r<=0){l=x;break}}
  return {text:D.fill(l.text,extra),expr:l.expr||'neutral',react:l.react,key,src:l};
};
// conversations
D.pickConversation=function(trigger){
  const ctx=D.ctx();const c=D.lib.conversations.filter(v=>(v.trigger||'idle')===trigger&&check(v.cond,ctx)&&!(v.once&&(ctx.seen||[]).includes(v.id)));
  if(!c.length)return null;const fresh=c.filter(v=>!(ctx.seen||[]).includes(v.id));const pool=fresh.length?fresh:c;
  const tot=pool.reduce((s,v)=>s+(v.weight||1),0);let r=Math.random()*tot;for(const v of pool){r-=(v.weight||1);if(r<=0)return v}return pool[0];
};
// run(conv, ui, done): ui = {say(lineObj, holdMs), choose(list, cb), setVar(k,v), remember(text, tag), bond(n), react(k), seen(id)}
D.run=function(conv,ui,done){
  if(typeof conv==='string')conv=D.lib.conversations.find(c=>c.id===conv);if(!conv)return done&&done();
  ui.seen&&ui.seen(conv.id);
  const apply=o=>{if(!o)return;if(o.set)for(const k in o.set)ui.setVar(k,D.fill(o.set[k]));if(o.memory)ui.remember(D.fill(o.memory),o.memoryTag);if(o.bond)ui.bond(o.bond);if(o.react)ui.react(o.react)};
  let tangentUsed=false;
  const go=id=>{
    const n=conv.nodes[id];if(!n){done&&done();return}
    const ctx=D.ctx();
    if(n.branch){const b=n.branch.find(x=>check(x.cond,ctx));return go(b?b.goto:n.next)}
    apply(n);
    const line={text:D.fill(n.say||''),expr:n.expr||'neutral',react:n.react};
    const ch=(n.choices||[]).filter(c=>check(c.cond,ctx)).slice(0,4);
    if(ch.length){ui.say(line,600000);ui.choose(ch.map(c=>[c.icon||'💬',D.fill(c.label)]),i=>{const c=ch[i];apply(c);
      if(c.reply){ui.say({text:D.fill(c.reply),expr:c.expr||'happy',react:c.react});setTimeout(()=>go(c.goto),Math.max(1800,c.reply.length*55))}else go(c.goto)})}
    else{ui.say(line);const wait=n.wait||Math.max(1800,line.text.length*55);
      if(n.next&&!tangentUsed&&ui.tangent&&Math.random()<(ui.tangentRate||0.15)){tangentUsed=true;
        setTimeout(()=>{const t=ui.tangent();if(!t)return go(n.next);ui.say(t);setTimeout(()=>go(n.next),Math.max(2200,t.text.length*55))},wait)}
      else if(n.next)setTimeout(()=>go(n.next),wait);else done&&done()}
  };
  go(conv.start||Object.keys(conv.nodes)[0]);
};
window.Dialogue=D;
})();
