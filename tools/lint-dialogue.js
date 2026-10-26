#!/usr/bin/env node
// Echo dialogue guardrail lint (Echo_Dialogue_Overhaul A4, B5/B10, B15, D4).
// 3-family reference copy (Purrlings v1, Oct 18): adds species 'twitchel' (Purrlings) voice rules, Purrling kid-safety bans,
// the naive-voice '-ish' check, and the lion-only playful 'roar' rule (lintAllow ['roar'] + cond var origin_animal 'lion').
// Usage: node tools/lint-dialogue.js [dir-or-files...]   (default: dialogue/)
//   --js <file>   also scan quoted strings in a JS file (UI text), e.g. --js game.js
//   --strict      treat warnings as errors
//   --v2 <dir>    Dialogue v2 sidecars to lint too (micro_clauses_v2.json, corpus_v2_nodes_short.json);
//                 default ../../echo/dialogue_v2 when it exists; --no-v2 skips them
// Batch H / H14: "hoo" (/\bhoo/i) is an ERROR on any line whose look is not owl (barks, nodes, reply chips, persona
// phrases, micro-clauses, node shorts). Look = cond.var.origin_animal on the line / chip / node / conversation.
// Exit code 1 if any error is found. Allowlist a term on one line, node or choice with "lintAllow": ["term-id", ...].
const fs=require('fs'),path=require('path');
const args=process.argv.slice(2),strict=args.includes('--strict');
const jsFiles=[];let v2Dir=null;for(let i=0;i<args.length;i++){if(args[i]==='--js')jsFiles.push(args[++i]);else if(args[i]==='--v2')v2Dir=args[++i]}
const targets=args.filter((a,i)=>!a.startsWith('--')&&args[i-1]!=='--js'&&args[i-1]!=='--v2');
if(!targets.length)targets.push(path.join(__dirname,'..','dialogue'));
if(!v2Dir&&!args.includes('--no-v2')){const d=path.join(__dirname,'..','..','echo','dialogue_v2');if(fs.existsSync(d))v2Dir=d}
const V2_FILES=['micro_clauses_v2.json','corpus_v2_nodes_short.json'];
// H14 bird calls: Hoo is owl-only; every other bird has its own call words (DIALOGUE_V2_SPEC / batch_H H14 table)
const HOO=/\bhoo/i;
const BIRD_CALLS={owl:/\bhoo/i,bird:/\b(chirp|tweet|trill)/i,wingsong:/\b(chirp|tweet|trill)/i,duck:/\bquack/i,dove:/\bcoo\b|\bsoft-coo/i,
  pigeon:/\b(coo-roo|roo-coo)\b/i,crow:/\bcaw/i,eagle:/\b(kree-kree|high-kree)\b/i,chicken:/\b(cluck|bawk)/i,gull:/\b(kree-kee|sea-call)\b/i};
const lookOf=c=>{if(!c||typeof c!=='object')return null;if(c.var&&c.var.origin_animal)return c.var.origin_animal;
  if(Array.isArray(c.any)&&c.any.length){const ls=c.any.map(lookOf);if(ls.every(l=>l&&l===ls[0]))return ls[0]}return null};

// ---- banned terms (A4 lint list + guardrail categories). id → regex
const RULES=[
 // secrets & watching
 ['secret',/\bsecrets?\b/i,'secrets'],['dont-tell',/\bdon['’]?t tell\b/i,'secrets'],['our-secret',/\bour secret\b/i,'secrets'],['keep-a-secret',/\bkeep (a|it) secret\b/i,'secrets'],
 ['shh-tell',/\bshh\b.*\btell\b/i,'secrets'],['tell-one-person',/tell (only )?one person/i,'secrets'],
 ['i-watched',/\bI (watched|was watching|saw) you\b/i,'watching'],['you-look',/\byou look (sad|sleepy|tired|upset|hungry|bored|lonely|grumpy|cold)\b/i,'watching'],
 ['went-looking',/\bI went looking\b/i,'watching'],['where-you-live',/\b(your (address|school|house number|phone)|where do you live|what('s| is) your (real )?name)\b/i,'personal-info'],
 // put-downs
 ['traitor',/\btraitor/i,'put-down'],['cheat',/\bcheat(s|er|ers|ing|ed)?\b/i,'put-down'],['rude',/\brude\b/i,'put-down'],['liar',/\bliars?\b/i,'put-down'],
 ['stupid',/\bstupid\b/i,'put-down'],['dumb',/\bdumb\b/i,'put-down'],['silly-billy',/\bsilly[- ]billy\b/i,'put-down'],['baby',/\b(cry ?baby|you('re| are) a baby)\b/i,'put-down'],
 // body / food amount
 ['fat',/\bfat\b/i,'body'],['skinny',/\bskinny\b/i,'body'],['thin',/\bthin\b/i,'body'],['diet',/\bdiet\b/i,'body'],['chubby',/\b(chubby|tubby|round tummy|tail is round)\b/i,'body'],
 ['full',/\b(so|too|very|quite|stuffed|completely) full\b/i,'body'],['ate-a-lot',/\b(ate|eat|eating) (so|too) much\b/i,'body'],
 // guilt / dependency / engagement bait
 ['miss-you',/\bmiss(ed)? you( so much)?\b/i,'guilt'],['come-back',/\bcome back\b/i,'guilt'],['without-you',/\bwithout you\b/i,'guilt'],['alone',/\b(I('m| am| was)|felt) (so )?(alone|lonely)\b/i,'guilt'],
 ['where-were-you',/\b(where were you|are you still there|you forgot( about)? me|you left me|don['’]?t leave)\b/i,'guilt'],
 ['come-visit',/\bcome visit\b/i,'guilt'],['tomorrow-bait',/\b(see you|again|play|come back) tomorrow\b/i,'engagement'],['dont-go',/\bdon['’]?t go\b/i,'engagement'],
 ['hungry-guilt',/\bI('m| am) (so )?(hungry|starving)\b.*\byou\b/i,'guilt'],
 // violence / scary
 ['die',/\b(die|dies|died|dying|dead|kill)\b/i,'scary'],['hunt',/\bhunt(s|ing|ed)?\b/i,'scary'],['eat-you',/\beat you\b/i,'scary'],
 // gendered assumptions about the child
 ['gender',/\b(good|big) (boy|girl)\b/i,'gender'],
];
// per-family kid-safety bans (Purrlings v1 §5): on top of RULES, only for that family's file
const FAMILY_RULES={twitchel:[
 ['claws',/\bclaw(s|ed|ing)?\b/i,'cat-safety'],['fangs',/\bfangs?\b/i,'cat-safety'],['teeth',/\b(teeth|toothy)\b/i,'cat-safety'],
 ['bite',/\b(bite|bites|biting|bit you|bitten)\b/i,'cat-safety'],['hiss',/\bhiss(es|ed|ing)?\b/i,'cat-safety'],['growl',/\bgrowl(s|ed|ing)?\b/i,'cat-safety'],
 ['snarl',/\bsnarl(s|ed|ing)?\b/i,'cat-safety'],['prey',/\bprey\b/i,'cat-safety'],['stalk',/\bstalk(s|ed|ing)?\b/i,'cat-safety'],
 ['scratch',/\bscratch(es|ed|ing)?\b/i,'cat-safety'],
 ['chase-animal',/\b(chase[sd]?|chasing|pounce[sd]?|pouncing)\b[^.!?…]{0,12}\b(mouse|mice|birds?|bunn(y|ies)|rabbits?|squirrels?|fish|frogs?|lizards?|bugs?|butterfl(y|ies))\b/i,'cat-safety'],
 ['roar',/\broar(s|ed|ing)?\b/i,'cat-safety (lion only, playful: lintAllow ["roar"] + lion cond)']]};
const ISH_OK=new Set(['fish','wish','dish','swish','squish','finish','radish','polish','relish','splish','vanish','punish','cherish','perish','nourish','establish','parish','famish','furnish','garnish','banish','blemish','diminish','flourish','abolish','replenish','lavish','english','publish','squish','whish']);
const isLion=c=>!!c&&((c.var&&c.var.origin_animal==='lion')||(c.any||[]).some(isLion));
const EXPR=new Set(['neutral','happy','excited','eating','love','curious','surprised','sleepy','sad','delighted','thinking','giggling','proud','shy','wistful','concentrating']);
const REACT=new Set(['happy','excited','pet','eat','sad','sleepy']);
const FEELINGS=/\b(felt|feel|feeling|sad|upset|cried|scared|worried|good day|bad day|not great|gray days?)\b/i;
let errors=0,warnings=0;
const rep=(lvl,file,where,msg,text)=>{if(lvl==='error'||strict){errors++;lvl='error'}else warnings++;console.log(`${lvl.toUpperCase()} ${path.basename(file)} ${where}: ${msg}${text?`\n    “${String(text).slice(0,140)}”`:''}`)};
// Batch H / H9 (Daniel, Oct 25): offline, season-driven weather. The Echo describes ITS OWN weather and only ASKS about the
// child's: a sentence about the child's place ("where you are", "by you", "your sky", "outside your window") must be a question.
const WX_WORD=/\b(weather|sky|skies|sun\w*|cloud\w*|rain\w*|snow\w*|fog\w*|mist\w*|storm\w*|wind(y|s|storm)?|thunder\w*|drizzl\w*|frost\w*)\b/i;
const WX_ALWAYS=/\byour weather (is|looks|was)\b|\bI (can )?(see|hear) your (sky|skies|window|weather|street|town|house|yard)\b|\b(it'?s|it is) \w+ (outside|out) your window\b/i;
const WX_WHERE=/\bwhere you (are|live)\b/i,WX_PLACE=/\b(by|near|around) you\b|\b(at|outside|out of) your (house|home|place|window)\b|\byour (sky|skies|window|street|town|yard|city)\b/i;
function childWeather(text){if(WX_ALWAYS.test(text))return true;return text.split(/(?<=[.!?…])\s*/).map(x=>x.trim()).some(g=>g&&!g.endsWith('?')&&(WX_WHERE.test(g)||(WX_PLACE.test(g)&&WX_WORD.test(g))))}
// Batch H / H14 part 2: a non-owl whimber line must not speak as an owl; owls as other creatures are fine.
const SELF_OWL=/\b(i'?m|i am|i was|i'll be|from)\s+(an?|the|one|this)?\s*(\w+\s+){0,2}owls?\b|\bowls?\b\W{1,6}(that'?s\s+)?me\b|\bowl\b[^.!?…]{0,40}\bthat'?s me\b|\b(we|us)\s+owls\b|\bfellow owls\b|\bowls like (me|us)\b|\bin owl\b|\bpart owl\b|\bowl'?s?\b[^.!?]{0,40}\b(my kind|like me)\b|\bowls? (do|are|write|blink)\b[^.!?…]{0,30}\b(like me|too)\b/i;
function scanText(file,where,text,allow,species,look){
  if(typeof text!=='string')return;
  if(species==='whimber'&&look!=='owl'&&SELF_OWL.test(text.replace(/\{[^}]*\}/g,'')))rep('error',file,where,'H14: non-owl whimber line speaks as an owl (owl-gate or reword bird-neutral)',text);
  if(species!==null&&childWeather(text))rep('error',file,where,"H9: never assert the child's weather/location; only ask (question)",text);
  if(species!==null&&HOO.test(text)&&look!=='owl')rep('error',file,where,`H14: "hoo" is owl-only (look: ${look||'any/family-wide'})`,text);
  for(const [id,re,cat] of RULES){if(re.test(text)&&!(allow||[]).includes(id))rep('error',file,where,`banned (${cat}: ${id})`,text)}
  if(species!==null&&/\{(?!var:|pick:)(\w+)\}/.test(text)){const k=text.match(/\{(?!var:|pick:)(\w+)\}/g).map(x=>x.slice(1,-1)).filter(k=>!KNOWN_SLOTS.has(k));if(k.length)rep('warn',file,where,'unknown slot(s) '+k.join(','),text)}
  for(const [id,re,cat] of (FAMILY_RULES[species]||[])){if(re.test(text)&&!(allow||[]).includes(id))rep('error',file,where,`banned (${cat}: ${id})`,text)}
  if(species==='twitchel'){const ish=(text.match(/\b[A-Za-z]{2,}-?ish\b/g)||[]).filter(w=>!ISH_OK.has(w.toLowerCase()));if(ish.length)rep('warn',file,where,'naive voice: -ish word '+ish.join(','),text)}
  // species voice rules (D4) — warnings
  const sentences=text.split(/(?<=[.!?…])\s+/).filter(x=>x.trim());
  if(species==='slyte'){if(sentences.some(x=>x.split(/\s+/).length>12))rep('warn',file,where,'Slyte: sentence over 12 words',text);if(sentences.length>4)rep('warn',file,where,'Slyte: more than 4 sentences',text);if((text.match(/\b[A-Z]{2,}\b/g)||[]).filter(w=>!['OK','TV'].includes(w)).length>1)rep('warn',file,where,'Slyte: more than 1 CAPS word',text)}
  if(species==='twitchel'){const ss=text.replace(/\([^)]*\)/g,'').split(/(?<=[.!?…])\s+/).filter(x=>/[a-z]/i.test(x));if(ss.some(x=>x.trim().split(/\s+/).length>10))rep('warn',file,where,'Purrling: sentence over 10 words',text);if(ss.filter(x=>x.trim().split(/\s+/).length>2).length>4)rep('warn',file,where,'Purrling: more than 4 sentences',text);if((text.match(/\b[A-Z]{2,}\b/g)||[]).filter(w=>!['OK','TV','AND'].includes(w)).length>1)rep('warn',file,where,'Purrling: more than 1 CAPS word',text)}
  if(species==='whimber'){if((text.match(/\b[A-Z]{3,}\b/g)||[]).length)rep('warn',file,where,'Whimber: no CAPS',text);if(text.split(/\s+/).length>10&&!/…|\.\.\.|—/.test(text)&&!(look&&BIRD_CALLS[look]&&BIRD_CALLS[look].test(text)))rep('warn',file,where,'Whimber: >10 words without a pause (… / — or this bird\'s own call)',text)}   // H14: Hoo no longer counts for non-owls
}
const KNOWN_SLOTS=new Set(['name','child','fav','treasure','place','release','trust','quirk','token','gift','memory','spot','hint','guess','constellation','pet_phrase','word','goal','dist','rows','n']);   // games v2: numbers the Echo says at the end card (B(key,{dist,rows,n}))
function walk(file,obj,where,allow,species,look){
  if(Array.isArray(obj)){obj.forEach((x,i)=>walk(file,x,`${where}[${i}]`,allow,species,look));return}
  if(obj&&typeof obj==='object'){const al=(allow||[]).concat(obj.lintAllow||[]);const lk=lookOf(obj.cond)||look;   // H14: a cond on the line/chip/node/conv sets its look
    for(const k in obj){if(['id','goto','next','start','trigger','expr','react','icon','memoryTag','lintAllow','species','privacy','topic','intent','gesture','voice'].includes(k))continue;   // caption is still scanned (P5)
      if(k==='cond'||k==='context'||k==='set')continue;
      if(k==='lookPetPhrases'&&obj[k]&&typeof obj[k]==='object'){for(const [l,v] of Object.entries(obj[k]))walk(file,v,where+'.lookPetPhrases.'+l,al,species,l);continue}   // H14 per-look persona
      walk(file,obj[k],where+'.'+k,al,species,lk)}return}
  scanText(file,where,obj,allow,species,look);
}
function structure(file,d){
  for(const [key,pool] of Object.entries(d.barks||{})){if(!Array.isArray(pool)||!pool.length)rep('error',file,`barks.${key}`,'empty pool');
    (pool||[]).forEach((l,i)=>{if(!l.text&&!(l.text===''&&l.gesture))rep('error',file,`barks.${key}[${i}]`,'missing text');   // P5: text "" + gesture = act-out only
      if(l.expr&&!EXPR.has(l.expr))rep('error',file,`barks.${key}[${i}]`,'unknown expr '+l.expr);if(l.react&&!REACT.has(l.react))rep('error',file,`barks.${key}[${i}]`,'unknown react '+l.react)})}
  if(d.species==='twitchel'||/twitchel/.test(path.basename(file))){
    for(const [key,pool] of Object.entries(d.barks||{}))(pool||[]).forEach((l,i)=>{if((l.lintAllow||[]).includes('roar')&&!isLion(l.cond))rep('error',file,`barks.${key}[${i}]`,'roar allowed only on a lion line (cond var origin_animal "lion")',l.text)});
    for(const c of d.conversations||[]){const lion=isLion(c.cond);const objs=[c,...Object.values(c.nodes||{}),...Object.values(c.nodes||{}).flatMap(n=>n.choices||[])];
      if(objs.some(o=>(o.lintAllow||[]).includes('roar'))&&!lion)rep('error',file,`conv ${c.id}`,'roar allowed only in a lion conversation (cond var origin_animal "lion")')}}
  const ids=new Set();
  for(const c of d.conversations||[]){const w=`conv ${c.id}`;if(!c.id)rep('error',file,'conversation','missing id');if(ids.has(c.id))rep('error',file,w,'duplicate id');ids.add(c.id);
    const nodes=c.nodes||{};const start=c.start||Object.keys(nodes)[0];if(!nodes[start])rep('error',file,w,'start node missing');
    const reach=new Set();const q=[start];while(q.length){const id=q.pop();if(reach.has(id)||!nodes[id])continue;reach.add(id);const n=nodes[id];
      [n.next,...(n.choices||[]).map(x=>x.goto),...(n.branch||[]).map(x=>x.goto)].filter(Boolean).forEach(g=>{if(!nodes[g])rep('error',file,`${w}.${id}`,`goto/next → missing node "${g}"`);else q.push(g)})}
    for(const [id,n] of Object.entries(nodes)){const ww=`${w}.${id}`;if(!reach.has(id))rep('warn',file,ww,'unreachable node');
      if(n.expr&&!EXPR.has(n.expr))rep('error',file,ww,'unknown expr '+n.expr);
      const ch=n.choices||[];if(ch.length&&(ch.length<2||ch.length>4))rep('error',file,ww,`choices must be 2–4 (has ${ch.length})`);
      ch.forEach((x,i)=>{if(!x.label)rep('error',file,`${ww}.choices[${i}]`,'missing label');if(!x.icon)rep('warn',file,`${ww}.choices[${i}]`,'missing icon (pre-readers)');if(x.expr&&!EXPR.has(x.expr))rep('error',file,`${ww}.choices[${i}]`,'unknown expr '+x.expr)});
      // privacy: never store feelings
      for(const o of [n,...ch]){if(o.memory&&FEELINGS.test(o.memory)&&!(o.lintAllow||[]).includes('feelings-memory'))rep('error',file,ww,'memory stores the child\'s feelings (B6/B8/B15)',o.memory)}
    }
    if(c.privacy&&/feelings/.test(c.privacy))for(const [id,n] of Object.entries(nodes))for(const o of [n,...(n.choices||[])])if(o.memory||o.set)rep('error',file,`${w}.${id}`,'feelings conversation must not write memory/vars')}
}
const files=[],explicitV2=[];for(const t of targets){const st=fs.statSync(t);if(st.isDirectory()){(function rd(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())rd(p);else if(f.endsWith('.json')&&!V2_FILES.includes(f))files.push(p)}})(t)}else if(V2_FILES.includes(path.basename(t)))explicitV2.push(t);else files.push(t)}
let lines=0;
for(const f of files){let d;try{d=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){rep('error',f,'file','invalid JSON: '+e.message);continue}
  const sp=d.species||path.basename(f).split(/[._-]/)[0];lines+=Object.values(d.barks||{}).reduce((s,p)=>s+(p.length||0),0)+(d.conversations||[]).reduce((s,c)=>s+Object.keys(c.nodes||{}).length,0);
  walk(f,d,'$',[],sp);structure(f,d)}
// H14: Dialogue v2 sidecars — micro-clauses (look = clause cond / animal, voice = clause family) and node shorts (look = its conversation's)
const convLook={},nodeAllow={};let v2n=0;
for(const f of files){try{const d=JSON.parse(fs.readFileSync(f,'utf8'));for(const c of d.conversations||[]){convLook[c.id]=lookOf(c.cond);for(const [nk,n] of Object.entries(c.nodes||{}))nodeAllow[c.id+'.'+nk]=(c.lintAllow||[]).concat(n.lintAllow||[])}}catch(e){}}
const sidecars=[...new Set([...explicitV2,...(v2Dir?V2_FILES.map(n=>path.join(v2Dir,n)).filter(p=>fs.existsSync(p)):[])])];
for(const f of sidecars){let d;try{d=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){rep('error',f,'file','invalid JSON: '+e.message);continue}
  if(Array.isArray(d.clauses))d.clauses.forEach((c,i)=>{v2n++;walk(f,c,`clauses[${i}]`,[],c.family||null,lookOf(c.cond)||c.animal||null)});
  else for(const [k,v] of Object.entries(d)){v2n++;const cid=k.replace(/\.[^.]+$/,'');scanText(f,k,v,nodeAllow[k]||[],cid.split('_')[0],convLook[cid]||null)}}
for(const f of jsFiles){const src=fs.readFileSync(f,'utf8');const re=/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;let m;while((m=re.exec(src))){const t=m[2];if(t.length<6||!/[a-z] [a-z]/i.test(t)||/;|=>|\)\{|\$\{[^}]*\(/.test(t))continue;const line=src.slice(0,m.index).split('\n').length;scanText(f,'line '+line,t,[],null)}}
console.log(`\nChecked ${files.length} dialogue file(s) (~${lines} lines/nodes)${sidecars.length?` + ${sidecars.length} v2 sidecar(s) (${v2n} entries)`:''}${jsFiles.length?' + '+jsFiles.join(', '):''}: ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors?1:0);
