#!/usr/bin/env node
// Echo dialogue guardrail lint (Echo_Dialogue_Overhaul A4, B5/B10, B15, D4).
// Usage: node tools/lint-dialogue.js [dir-or-files...]   (default: dialogue/)
//   --js <file>   also scan quoted strings in a JS file (UI text), e.g. --js game.js
//   --strict      treat warnings as errors
// Exit code 1 if any error is found. Allowlist a term on one line, node or choice with "lintAllow": ["term-id", ...].
const fs=require('fs'),path=require('path');
const args=process.argv.slice(2),strict=args.includes('--strict');
const jsFiles=[];for(let i=0;i<args.length;i++)if(args[i]==='--js')jsFiles.push(args[++i]);
const targets=args.filter((a,i)=>!a.startsWith('--')&&args[i-1]!=='--js');
if(!targets.length)targets.push(path.join(__dirname,'..','dialogue'));

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
const EXPR=new Set(['neutral','happy','excited','eating','love','curious','surprised','sleepy','sad','delighted','thinking','giggling','proud','shy','wistful','concentrating']);
const REACT=new Set(['happy','excited','pet','eat','sad','sleepy']);
const FEELINGS=/\b(felt|feel|feeling|sad|upset|cried|scared|worried|good day|bad day|not great|gray days?)\b/i;
let errors=0,warnings=0;
const rep=(lvl,file,where,msg,text)=>{if(lvl==='error'||strict){errors++;lvl='error'}else warnings++;console.log(`${lvl.toUpperCase()} ${path.basename(file)} ${where}: ${msg}${text?`\n    “${String(text).slice(0,140)}”`:''}`)};
function scanText(file,where,text,allow,species){
  if(typeof text!=='string')return;
  for(const [id,re,cat] of RULES){if(re.test(text)&&!(allow||[]).includes(id))rep('error',file,where,`banned (${cat}: ${id})`,text)}
  if(species!==null&&/\{(?!var:|pick:)(\w+)\}/.test(text)){const k=text.match(/\{(?!var:|pick:)(\w+)\}/g).map(x=>x.slice(1,-1)).filter(k=>!KNOWN_SLOTS.has(k));if(k.length)rep('warn',file,where,'unknown slot(s) '+k.join(','),text)}
  // species voice rules (D4) — warnings
  const sentences=text.split(/(?<=[.!?…])\s+/).filter(x=>x.trim());
  if(species==='slyte'){if(sentences.some(x=>x.split(/\s+/).length>12))rep('warn',file,where,'Slyte: sentence over 12 words',text);if(sentences.length>4)rep('warn',file,where,'Slyte: more than 4 sentences',text);if((text.match(/\b[A-Z]{2,}\b/g)||[]).filter(w=>!['OK','TV'].includes(w)).length>1)rep('warn',file,where,'Slyte: more than 1 CAPS word',text)}
  if(species==='whimber'){if((text.match(/\b[A-Z]{3,}\b/g)||[]).length)rep('warn',file,where,'Whimber: no CAPS',text);if(text.split(/\s+/).length>10&&!/…|\.\.\.|—|Hoo/.test(text))rep('warn',file,where,'Whimber: >10 words without a pause',text)}
}
const KNOWN_SLOTS=new Set(['name','child','fav','treasure','place','release','trust','quirk','token','gift','memory','spot','hint','guess','constellation','pet_phrase','word','goal','dist','rows','n']);   // games v2: numbers the Echo says at the end card (B(key,{dist,rows,n}))
function walk(file,obj,where,allow,species){
  if(Array.isArray(obj)){obj.forEach((x,i)=>walk(file,x,`${where}[${i}]`,allow,species));return}
  if(obj&&typeof obj==='object'){const al=(allow||[]).concat(obj.lintAllow||[]);
    for(const k in obj){if(['id','goto','next','start','trigger','expr','react','icon','memoryTag','lintAllow','species','privacy','topic','intent','gesture','voice'].includes(k))continue;   // caption is still scanned (P5)
      if(k==='cond'||k==='context'||k==='set')continue;walk(file,obj[k],where+'.'+k,al,species)}return}
  scanText(file,where,obj,allow,species);
}
function structure(file,d){
  for(const [key,pool] of Object.entries(d.barks||{})){if(!Array.isArray(pool)||!pool.length)rep('error',file,`barks.${key}`,'empty pool');
    (pool||[]).forEach((l,i)=>{if(!l.text&&!(l.text===''&&l.gesture))rep('error',file,`barks.${key}[${i}]`,'missing text');   // P5: text "" + gesture = act-out only
      if(l.expr&&!EXPR.has(l.expr))rep('error',file,`barks.${key}[${i}]`,'unknown expr '+l.expr);if(l.react&&!REACT.has(l.react))rep('error',file,`barks.${key}[${i}]`,'unknown react '+l.react)})}
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
const files=[];for(const t of targets){const st=fs.statSync(t);if(st.isDirectory()){(function rd(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())rd(p);else if(f.endsWith('.json'))files.push(p)}})(t)}else files.push(t)}
let lines=0;
for(const f of files){let d;try{d=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){rep('error',f,'file','invalid JSON: '+e.message);continue}
  const sp=d.species||path.basename(f).split(/[._-]/)[0];lines+=Object.values(d.barks||{}).reduce((s,p)=>s+(p.length||0),0)+(d.conversations||[]).reduce((s,c)=>s+Object.keys(c.nodes||{}).length,0);
  walk(f,d,'$',[],sp);structure(f,d)}
for(const f of jsFiles){const src=fs.readFileSync(f,'utf8');const re=/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;let m;while((m=re.exec(src))){const t=m[2];if(t.length<6||!/[a-z] [a-z]/i.test(t)||/;|=>|\)\{|\$\{[^}]*\(/.test(t))continue;const line=src.slice(0,m.index).split('\n').length;scanText(f,'line '+line,t,[],null)}}
console.log(`\nChecked ${files.length} dialogue file(s) (~${lines} lines/nodes)${jsFiles.length?' + '+jsFiles.join(', '):''}: ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors?1:0);
