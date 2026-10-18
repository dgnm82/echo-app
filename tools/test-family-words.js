#!/usr/bin/env node
// Family-word lint, N families (Purrlings v1 reference, Oct 18). Each family's own body/home words come from its manifest
// (families/<id>.json `words:{body,home}`; here families/words_<id>.json). A family's pool (its file + its own entries in shared.json)
// must not use words owned ONLY by other families. A word shared by two families (paw, tail, fur, whiskers) is banned only for the rest.
// Scans spoken & shown fields: text, say, reply, label, short, caption, gesture, memory.
// Usage: node tools/test-family-words.js [dialogueDir] [familiesDir]   (exit 1 on any hit)
const fs=require('fs'),path=require('path');
const R=process.argv[2]||path.join(__dirname,'..','dialogue'),FD=process.argv[3]||path.join(__dirname,'..','families');
const ORDER=JSON.parse(fs.readFileSync(path.join(FD,'order.json'),'utf8')).order;   // = FAMILIES.order (index of the per-family shared UI pools)
const man=id=>{for(const f of [id+'.json','words_'+id+'.json']){const p=path.join(FD,f);if(fs.existsSync(p))return JSON.parse(fs.readFileSync(p,'utf8'))}return null};
const FAM=ORDER.filter(id=>man(id));   // every family with a manifest owns its words, even if its dialogue file is absent
const own={};for(const id of FAM){const w=man(id).words;own[id]=new Set([...(w.body||[]),...(w.home||[])].map(x=>x.toLowerCase()))}
const rx=list=>list.length?new RegExp('\\b('+list.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,m=>m==='*'?'*':'\\'+m).replace(/\*$/,'\\w*').replace(/ /g,'\\s+')).join('|')+')\\b','i'):null;
const bans={};for(const id of FAM){const other=new Set();for(const o of FAM)if(o!==id)for(const w of own[o])if(!own[id].has(w))other.add(w);bans[id]=rx([...other])}
const ALL=rx([...new Set(FAM.flatMap(id=>[...own[id]]))]);
const KEYS=new Set(['text','say','reply','label','short','caption','gesture','memory']);const hits=[];
function walk(o,where,re,file,nm){if(!re)return;if(Array.isArray(o))return o.forEach((x,i)=>walk(x,where+'['+i+']',re,file,nm));if(!o||typeof o!=='object')return;
  for(const [k,v] of Object.entries(o)){if(typeof v==='string'&&KEYS.has(k)){const m=v.match(re);if(m&&!(o.lintAllow||[]).includes('family:'+m[0].toLowerCase()))hits.push(`${file}:${where}.${k} (${nm}: "${m[0]}") ${v.slice(0,70)}`)}else if(typeof v==='object')walk(v,where+'.'+k,re,file,nm)}}
const J=f=>JSON.parse(fs.readFileSync(path.join(R,f+'.json'),'utf8'));
// shared.json: the per-family UI pools carry one entry per family, in FAMILIES.order; entry i belongs to family ORDER[i]
const sh=J('shared'),FAMI=new Set(['ui_keepsake','ui_path_button']);
for(const [k,L] of Object.entries(sh.barks||{})){if(FAMI.has(k)&&Array.isArray(L))L.forEach((l,i)=>{const id=ORDER[i];walk(l,'barks.'+k+'['+i+']',FAM.includes(id)?bans[id]:ALL,'shared',id?'not-'+id:'any family')});
  else walk(L,'barks.'+k,ALL,'shared','family word in shared')}
walk(sh.conversations||[],'conversations',ALL,'shared','family word in shared');
for(const id of FAM)if(fs.existsSync(path.join(R,id+'.json')))walk(J(id),id,bans[id],id,'not-'+id+' word');
console.log('families: '+FAM.join(', '));
if(hits.length){console.log(hits.length+' cross-family word(s):\n'+hits.join('\n'));process.exit(1)}console.log('family words OK')
