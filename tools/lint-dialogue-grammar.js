#!/usr/bin/env node
// Dialogue grammar lint (Nov 1 dialogue fix, BRIEF_FIX_NOV1 Jay #3; rules from echo/pm/dialogue_review/tools/heuristic_scan.py).
// Renders every shipped line in dialogue/*.json the way the app does (dialogue.js D.fill + personalize + speciesCalls), once per
// animal look that can hear it (cond.var.origin_animal, else every animal of the family; shared.json for all 3 families), with
// representative fills and the Echo's pet phrase on and off, then checks the rendered text. ANY hit fails (exit 1).
// Rules: banned_bond, banned_secret_song, article_a_an, doubled_word, doubled_punct, body_part_agreement, raw_scene_id,
//        leftover_placeholder, cut_off_short.
// Ids match the review CSVs: <file>:b:<key>:<i>[:short], <file>:c:<conv>:<node>[:ch<j>:label|reply], shared:pool:<intent>:<i>.
// Allowlist: tools/dialogue_grammar_allowlist.json {"entries":[{"id":..,"rule":..,"reason":..}]}; GENUINE false positives only,
// every entry needs a reason. Stale entries are reported (warning).
// Usage: node tools/lint-dialogue-grammar.js [dialogue dir] [--allow <file>] [--max-examples N] [--quiet]
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');
const args=process.argv.slice(2);const opt=(k,d)=>{const i=args.indexOf(k);return i>=0?args[i+1]:d};
const DIR=args.find((a,i)=>!a.startsWith('--')&&!['--allow','--max-examples'].includes(args[i-1]))||path.join(R,'dialogue');
const ALLOW=opt('--allow',path.join(__dirname,'dialogue_grammar_allowlist.json'));const QUIET=args.includes('--quiet');
global.window=global;require(path.join(R,'families.js'));const FAM=global.FAMILIES;delete global.window;
const D=require(path.join(R,'dialogue.js'));
const J=f=>JSON.parse(fs.readFileSync(path.join(DIR,f+'.json'),'utf8'));
const FAMS=['slyte','whimber','twitchel'];
const LOOKS={};for(const [k,a] of Object.entries(FAM.animals))(LOOKS[a.family]=LOOKS[a.family]||[]).push(k);

// ---- representative fills (same values as echo/pm/dialogue_review/tools/render.py; {fav} is the bare food name, as in game.js)
const FILL={child:'Mia',fav:'berries',treasure:'shiny pebble',place:'mossy log',release:'the big meadow',trust:'a pinecone',quirk:'hums when happy',
  token:'a little feather',gift:'smooth stone',memory:'the day we met',n:'7',dist:'120',rows:'3',spot:'under the log',hint:'near the flowers',
  guess:'the tree',constellation:'the Big Dipper',goal:'10'};
const VAR={ancient_tune:'Ode to Joy',ancient_composer:'Beethoven',season:'autumn',listGame:'Snack Catch',gateA:'3',gateB:'4',family_a:'a Howling',family_echo:'',eib_band:''};

// ---- rules (heuristic_scan.py, tightened for a hard gate)
const SOUNDY=new Set('zoom la tap okay purr hum yip woof chirp coo caw quack mrrp boop buzz drip splash ding tick tock pitter patter hop flap so very no yes bye hi ha hee tweet kree cluck roo pat sniff swish wiggle bounce peek boing mew mrr hoo plip plop pop nod same squeak clap ting dum da bop sing step jump'.split(' '));
const SCENES=['clearing','grove','meadow','branch','library','hilltop','garden'];
const SCENE_IDS=Object.keys((j=>j.scenes||j)(JSON.parse(fs.readFileSync(path.join(R,'scenes_hotspots.json'),'utf8')))).filter(k=>!k.startsWith('_'));
const RAW_SCENE=new RegExp(`\\b(?:[Ii]n|[Aa]t|[Oo]n|[Nn]ear|[Ff]rom|[Ii]nto|loves|by|across) (?:${SCENES.join('|')})\\b(?!\\s+(?:leaves|floor|path|rafters|bench|nook))`,'g');
const RAW_ID=new RegExp(`\\b(?:${SCENE_IDS.filter(s=>s.includes('_')).join('|')})\\b`,'g');
// cut-off shorts: a short that ends on a word no sentence can end on (articles, possessives, conjunctions: "My tail is a.") always hits;
// one that ends on a preposition / "is" ("The leaf pile is.", "I still think about.") hits unless it is a whole sentence of its full line
// ("Clouds race by." from "Clouds race by. I could race them!", "I'll settle right in." from "{rows} rows… I'll settle right in.").
// heuristic_scan.py list minus on / it / fun / sweet / kind, which end ordinary sentences ("Hold on.", "That did it.", "Soft and sweet.").
const TRUNC_HARD=/\b(?:the|a|an|my|your|our|its|of|and|or|but|to|with|this|that's)[.…]+$/i;
const TRUNC_SOFT=/\b(?:in|at|by|for|is|under|near|after|behind|from|into|about)[.…]+$/i;
const words=t=>t.toLowerCase().replace(/[^a-z0-9' ]+/g,' ').split(/\s+/).filter(Boolean).join(' ');
function cutOff(short,full){const s=short.trim();if(TRUNC_HARD.test(s))return true;if(!TRUNC_SOFT.test(s))return false;
  return !(full&&String(full).split(/[.!?…:;]+/).some(x=>words(x)&&words(x)===words(s)))}
const PL='paws|ears|wings|feet|eyes|stripes|tufts|feathers|whiskers|spots|legs|claws|toes|cheeks|pads';
// deliberate kid-speak reduplication ("Knock knock.", "Night night.", "Hot hot!", "Go go go!"): starts a sentence, ends at punctuation / line end / the
// same word again, and is not a function word or half of a hyphen compound ("a soft soft-coo" is a seam, not a repeat)
const FUNC=new Set('the a an to in of and my is it on at for with by your our'.split(' '));
const REDUP=(t,m)=>{const pre=t.slice(0,m.index),post=t.slice(m.index+m[0].length);return !FUNC.has(m[1].toLowerCase())&&/(^|[.!?…"“]\s*)$/.test(pre)&&(/^\s*([.,!?…]|$)/.test(post)||new RegExp('^\\s+'+m[1]+'\\b','i').test(post))&&!/^-/.test(post)};
const all=(re,t)=>[...t.matchAll(re)].map(m=>m[0]);
const RULES=[
  ['banned_bond',t=>all(/\bbond(?:s|ed|ing)?\b/gi,t)],
  ['banned_secret_song',t=>all(/\bsecret songs?\b/gi,t)],
  ['article_a_an',t=>all(/\b[Aa] (?!one\b|uni|use|usu|eu|once\b|u\b|and\b|or\b)[aeiouAEIOU][\w-]*/g,t).concat(all(/\b[Aa]n (?![aeiouAEIOU]|h(?:our|onest|onou?r|eir)|[FHLMNRSX]\b)[\w-]+/g,t))],   // "an X" / "an S": letter names; "hold A and B": buttons
  ['doubled_word',t=>[...t.matchAll(/\b(\w+)\s+\1\b/gi)].filter(m=>!SOUNDY.has(m[1].toLowerCase())&&!REDUP(t,m)).map(m=>m[0])],
  ['doubled_punct',t=>all(/(?:[!?.,;:…]\s*[.,;:]|,\s*[!?]|…\.|\.…|\s[.,!?;:](?!\.))/g,t.replace(/\.\.\./g,'…'))],
  ['body_part_agreement',t=>all(new RegExp(`(?<!behind )(?<!under )(?<!on )(?<!in )\\bmy (?:[\\w-]+ ){0,2}(?:${PL})\\s+(?:is|feels|curls|wags|rests|hums|purrs|settles|was|has|does|goes|twitches|tingles|flutters|swishes|perks|points|wiggles|taps|sparkles|glows|shines|stretches|fluffs|puffs|knows|says)\\b`,'gi'),t)
    .concat(all(/(?<!\b(?:makes?|made|making|lets?|helps?|watch|see|saw|feel|hear) )\bmy (?:[\w-]+ ){0,2}(?:tail|ruff|mane|crest|neck|beak|nose|fur) (?:feel|hear|rest|curl|wag|twitch|swish|tingle)\b(?!s)/gi,t))],   // "makes my tail wag" is right
  ['raw_scene_id',t=>all(RAW_SCENE,t).concat(all(RAW_ID,t))],
  ['leftover_placeholder',t=>all(/\{[^}]*\}|\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]/g,t)],
];

// ---- collect + render
const hits=new Map();let rendered=0,lines=0;
function hit(id,rule,text,look,match){const k=id+'|'+rule;if(!hits.has(k))hits.set(k,{id,rule,text,look,match});}
function looksFor(fam,...conds){const s=new Set();const walk=c=>{if(!c||typeof c!=='object')return;if(c.var&&c.var.origin_animal)s.add(c.var.origin_animal);(c.any||[]).forEach(walk)};conds.forEach(walk);
  const own=LOOKS[fam];const l=[...s].filter(x=>own.includes(x));return l.length?l:s.size?[]:own}
function render(raw,fam,look,extra){const out=new Set();const lp=(D.lib.persona.lookPetPhrases||{})[look]||D.lib.persona.petPhrases||[];
  const pets=raw.includes('{pet_phrase}')?[0,1,2,-1]:[0];
  for(const pi of pets){D.persona={petPhrase:pi<0?'':(lp[pi%Math.max(lp.length,1)]||''),word:D.lib.persona.words[(LOOKS[fam].indexOf(look))%D.lib.persona.words.length]||''};D.mem={petSince:99};
    ctx={vars:{...VAR,...SETVARS,origin_animal:(FAM.animals[look]||{}).word||look,family:FAM[fam].label,family_plural:FAM[fam].plural,family_a:D.article(FAM[fam].label)+' '+FAM[fam].label,default_name:(FAM.animals[look]||{}).default_name||FAM[fam].default_name},
      fill:{...FILL,name:(FAM.animals[look]||{}).default_name||'Pip'}};out.add(D.fill(raw,extra));rendered++}
  return [...out]}
let ctx={};D.ctx=()=>ctx;let SETVARS={};
function lintText(id,raw,fam,looks,isShort,fullRaw){if(typeof raw!=='string'||!raw)return;lines++;
  for(const look of looks){const full=isShort&&fullRaw?render(fullRaw,fam,look)[0]:null;for(const t of render(raw,fam,look)){for(const [rule,fn] of RULES){const m=fn(t);if(m.length)hit(id,rule,t,look,m[0])}
    if(isShort&&cutOff(t,full))hit(id,'cut_off_short',t,look,t.trim().split(/\s+/).slice(-1)[0])}}}
const sh=J('shared');
for(const fam of FAMS){const sp=J(fam);D.use(fam,sh,sp);
  SETVARS={};for(const c of [...(sh.conversations||[]),...(sp.conversations||[])])for(const n of Object.values(c.nodes))for(const o of [n,...(n.choices||[])])for(const [k,v] of Object.entries(o.set||{}))if(!(k in SETVARS))SETVARS[k]=v;
  for(const [file,doc] of [['shared',sh],[fam,sp]]){
    for(const [key,ls] of Object.entries(doc.barks||{}))(ls||[]).forEach((l,i)=>{if(!l||typeof l!=='object')return;if(file==='shared'&&l.family&&l.family!==fam)return;
      const looks=looksFor(fam,l.cond);const id=`${file}:b:${key}:${i}`;lintText(id,l.text,fam,looks);if(l.short&&l.short!==l.text)lintText(id+':short',l.short,fam,looks,true,l.text);if(l.caption)lintText(id+':caption',l.caption,fam,looks)});
    for(const c of doc.conversations||[]){if(file==='shared'&&c.family&&c.family!==fam)continue;const cl=c.cond;
      for(const [nk,n] of Object.entries(c.nodes||{})){const looks=looksFor(fam,cl,n.cond);const id=`${file}:c:${c.id}:${nk}`;lintText(id,n.say,fam,looks);if(n.short)lintText(id+':short',n.short,fam,looks,true,n.say);
        (n.choices||[]).forEach((ch,j)=>{const lk=looksFor(fam,cl,n.cond,ch.cond);if(ch.label&&!String(ch.label).startsWith('@pool:'))lintText(`${id}:ch${j}:label`,ch.label,fam,lk);lintText(`${id}:ch${j}:reply`,ch.reply,fam,lk)})}}}}
D.use('slyte',sh,J('slyte'));for(const [intent,pool] of Object.entries(sh.replyPools||{}))(pool.phrases||[]).forEach((p,i)=>lintText(`shared:pool:${intent}:${i}`,typeof p==='string'?p:p.text,'slyte',['fox']));

// ---- allowlist
let allow=[];if(fs.existsSync(ALLOW)){const a=JSON.parse(fs.readFileSync(ALLOW,'utf8'));allow=a.entries||[]}
const bad=allow.filter(e=>!e.id||!e.rule||!e.reason||String(e.reason).trim().length<8);
const allowed=new Set(allow.map(e=>e.id+'|'+e.rule));const used=new Set();
const real=[...hits.values()].filter(h=>{const k=h.id+'|'+h.rule;if(allowed.has(k)){used.add(k);return false}return true});
const stale=allow.filter(e=>!used.has(e.id+'|'+e.rule));
// ---- report
const byRule={};for(const [r] of RULES.concat([['cut_off_short']]))byRule[r]=0;for(const h of real)byRule[h.rule]++;
if(!QUIET)for(const h of real.sort((a,b)=>a.rule.localeCompare(b.rule)||a.id.localeCompare(b.id)))console.log(`HIT ${h.rule}  ${h.id}  [${h.look}]  «${h.match}»  :: ${h.text}`);
for(const e of bad)console.log(`ALLOWLIST ERROR: entry needs id, rule and a real reason: ${JSON.stringify(e)}`);
for(const e of stale)console.log(`allowlist warning: stale entry (no such hit now): ${e.id} ${e.rule}`);
console.log('by rule: '+Object.entries(byRule).map(([r,n])=>`${r} ${n}`).join(', '));
console.log(`dialogue grammar lint: ${lines} lines, ${rendered} renders, ${real.length} hits (${hits.size-real.length} allowlisted), ${new Set(real.map(h=>h.id)).size} lines hit${real.length||bad.length?' - FAILED':' - OK'}`);
process.exit(real.length||bad.length?1:0);
