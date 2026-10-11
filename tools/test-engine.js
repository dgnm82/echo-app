#!/usr/bin/env node
// Unit tests for the v3 dialogue engine (no browser). Run: node tools/test-engine.js
const fs=require('fs'),path=require('path'),assert=require('assert');
const D=require('../dialogue.js');
const J=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'..','dialogue',f+'.json'),'utf8'));
let clock=Date.UTC(2026,9,11,15);D.now=()=>clock;
// fake timers
let q=[];D.timers={set:(f,ms)=>{const t={f,at:clock+ms,id:Math.random()};q.push(t);return t},clear:t=>{q=q.filter(x=>x!==t)}};
function advance(ms){const end=clock+ms;for(;;){q.sort((a,b)=>a.at-b.at);const t=q[0];if(!t||t.at>end)break;q.shift();clock=t.at;t.f()}clock=end}
let ctx={mood:'happy',bond:500,stage:9,memTags:[],talents:[],time:'day',vars:{},seen:[],fill:{name:'Slyte',child:'Dani'}};D.ctx=()=>ctx;
const tests=[];const T=(n,f)=>tests.push([n,f]);
function fresh(sp){D.mem={};D.rand=Math.random;D.use(sp,J('shared'),J(sp));D.setPersona(12345);ctx.seen=[];q=[]}
function ui(log){return {say:l=>log.push(['say',l.text]),choose:(list,cb,o)=>{log.push(['choose',list.map(x=>x[1])]);log.cb=cb;log.onTap=o&&o.onTap},cancelChoices:()=>log.push(['cancel']),
  setVar(){},remember(){},bond(){},react(){},seen:id=>ctx.seen.push(id)}}

T('a) generic labels get fresh phrasings from intent pools, no duplicates in one menu',()=>{fresh('slyte');
  const node=[{icon:'👂',label:'(just listen)'},{icon:'✅',label:'Yes!'},{icon:'❌',label:'Nope!'}];const seen=new Set();
  for(let i=0;i<8;i++){const p=D.present(node);assert.equal(new Set(p.map(x=>x.label)).size,3);assert.deepEqual(p.map(x=>x.intent),['listen','yes','no']);p.forEach(x=>seen.add(x.label))}
  assert(seen.size>=10,'expected varied phrasings, got '+seen.size);
  assert.equal(D.present([{label:'@pool:giggle'},{label:'Sparkle'}])[1].label,'Sparkle');});
T('a) fallback reply: choice with no reply and no goto, and a broken goto',()=>{fresh('slyte');const log=[];let done=null;
  D.run({id:'t_x_1',nodes:{a:{say:'Pick one',choices:[{icon:'🤪',label:'Something silly!'},{icon:'🙂',label:'Other',goto:'missing'}]}}},ui(log),i=>done=i);
  log.cb(0);const said=log.filter(x=>x[0]==='say').map(x=>x[1]);assert(J('slyte').barks.fallback_silly.some(l=>said.includes(l.text)),'silly fallback said');advance(5000);assert(done);
  const log2=[];let d2=null;D.run({id:'t_y_1',nodes:{a:{say:'Pick',choices:[{icon:'🙂',label:'A',goto:'nope'},{icon:'🙂',label:'B',goto:'nope'}]}}},ui(log2),i=>d2=i);log2.cb(1);advance(5000);
  assert(d2&&d2.fallback,'broken goto ends with a fallback');});
T('b) after 45 s with no input the Echo carries on (listen choice) and a tap resets the timer',()=>{fresh('slyte');const log=[];let done=null;
  D.run({id:'t_z_1',nodes:{a:{say:'Hmm?',choices:[{icon:'👂',label:'(just listen)',reply:'Okay so…',goto:'b'},{icon:'🙂',label:'Other',goto:'b'}]},b:{say:'The end.'}}},ui(log),i=>done=i);
  advance(30000);log.onTap(1);advance(30000);assert(!log.some(x=>x[0]==='cancel'),'tap reset the timer');
  advance(16000);assert(log.some(x=>x[0]==='cancel'));const said=log.filter(x=>x[0]==='say').map(x=>x[1]);
  assert(J('slyte').barks.carry_on.some(l=>said.includes(l.text)),'carry_on line');advance(10000);assert(said.length>=2&&log.filter(x=>x[0]==='say').some(x=>x[1]==='Okay so…'));advance(10000);assert(done);
  const l3=[];let d3=null;D.run({id:'t_w_1',nodes:{a:{say:'?',choices:[{icon:'1',label:'A'},{icon:'2',label:'B'}]}}},ui(l3),i=>d3=i);advance(60000);assert(d3&&d3.carriedOn,'no listen option → gentle end');});
T('b) drift follows a linked topic (0.6 → 0.3 → 0); ~1 in 8 lose the thought',()=>{fresh('slyte');const conv=D.lib.conversations.find(c=>c.id==='slyte_puddle_talk');
  let r;D.rand=()=>0.05;r=D.afterConversation(conv,0);assert.equal(r.type,'lost');assert(J('slyte').barks.lost_thought.some(l=>l.text===r.line.text));
  let k=0;D.rand=()=>[0.5,0.2][k++%2]??0.1;r=D.afterConversation(conv,0);assert.equal(r&&r.type,'drift');assert.equal(D.lib.groupOf[D.topic(r.conv)],D.lib.groupOf['puddle']);assert.notEqual(D.topic(r.conv),'puddle');
  D.rand=()=>0.5;assert.equal(D.afterConversation(conv,1),null,'0.3 at depth 1');D.rand=()=>0.2;k=0;D.rand=()=>[0.5,0.2][k++%2];assert(D.afterConversation(conv,1));
  D.rand=()=>0.15;assert.equal(D.afterConversation(conv,2),null,'no drift at depth 2');});
T('c) no-repeat: a line is not reused within 7 days (core reactions 24 h)',()=>{fresh('slyte');const n=J('slyte').barks.ambient.length;const got=new Set();
  for(let i=0;i<n;i++)got.add(D.bark('ambient').src.text);assert.equal(got.size,n,'all distinct before any repeat');
  const again=D.bark('ambient');assert(again.text);clock+=7*864e5+1;const g2=new Set();for(let i=0;i<n;i++)g2.add(D.bark('ambient').src.text);assert.equal(g2.size,n);
  fresh('slyte');const pn=J('slyte').barks.pet.length;const a=new Set();for(let i=0;i<pn;i++)a.add(D.bark('pet').src.text);assert.equal(a.size,pn);
  clock+=25*36e5;const b=new Set();for(let i=0;i<pn;i++)b.add(D.bark('pet').src.text);assert.equal(b.size,pn,'core lines free again after 24 h');});
T('c) no-repeat: a topic is not offered again within 5 days',()=>{fresh('slyte');ctx.memTags=[];
  const c=D.pickConversation('idle',v=>!v.once);const topic=D.topic(c);D.run(c,ui([]),()=>{});q=[];
  for(let i=0;i<200;i++){const x=D.pickConversation('idle');if(x)assert.notEqual(D.topic(x),topic)}
  clock+=5*864e5+1;let back=false;for(let i=0;i<2000&&!back;i++){const x=D.pickConversation('idle');if(x&&D.topic(x)===topic)back=true}assert(back,'topic available after 5 days');});
T('d) pet phrase + invented word are per-Echo, deterministic, and pet phrase ≤ 1 per 10 lines',()=>{fresh('slyte');
  const a=D.setPersona(111),b=D.setPersona(111);assert.deepEqual(a,b);const ps=new Set();for(let s=1;s<200;s++)ps.add(D.setPersona(s).petPhrase);assert.equal(ps.size,8);
  D.setPersona(42);const w=D.persona.word;assert.equal(D.personalize('Everything is sparkly. Sparkleful!'),'Everything is sparkly. '+w[0].toUpperCase()+w.slice(1)+'!');
  assert.equal(D.fill('So {word:shiny}!'),'So '+w+'!');
  D.mem={};let pets=0;for(let i=0;i<50;i++){const l=D.withPet({text:'Hi!'});if(l.pet)pets++;D.countLine()}assert(pets>=4&&pets<=5,'pets='+pets);
  fresh('whimber');D.setPersona(7);assert(J('whimber').persona.petPhrases.includes(D.persona.petPhrase));});
T('lint data: reply pools and persona exist for both species',()=>{for(const sp of ['slyte','whimber']){const d=J(sp);assert.equal(d.persona.petPhrases.length,8);assert.equal(d.persona.words.length,6);assert(d.barks.carry_on&&d.barks.lost_thought&&d.barks.drift_bridge)}
  assert(Object.keys(J('shared').replyPools).length>=8);});
T('e) all 13 Overhaul expressions have CSS and are accepted by both lints',()=>{const css=fs.readFileSync(path.join(__dirname,'..','style.css'),'utf8');
  const E=['neutral','happy','delighted','curious','thinking','surprised','giggling','proud','shy','sleepy','wistful','sad','concentrating'];
  for(const e of E){if(e!=='neutral')assert(css.includes('[data-expr='+e+']')||css.includes('[data-expr='+e+' ')||new RegExp('\\[data-expr='+e+'\\]').test(css),'css for '+e)}
  const py=fs.readFileSync(path.join(__dirname,'lint_dialogue.py'),'utf8'),js=fs.readFileSync(path.join(__dirname,'lint-dialogue.js'),'utf8');for(const e of E){assert(py.includes('"'+e+'"'),'py lint '+e);assert(js.includes("'"+e+"'"),'js lint '+e)}});
let fail=0;for(const [n,f] of tests){try{f();console.log('PASS',n)}catch(e){fail++;console.log('FAIL',n,'\n   ',e.message)}}
console.log(`\n${tests.length-fail}/${tests.length} engine tests passed`);process.exit(fail?1:0);
