#!/usr/bin/env node
// Family-word lint (playtest: a wolf talked about feathers). Every line a family can hear (its own file + shared.json)
// must not use the OTHER family's body/home words. Scans spoken & shown fields: text, say, reply, label, short, caption,
// gesture, memory. Run: node tools/test-family-words.js   (exit 1 on any hit)
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..','dialogue');
const BIRD=/\b(feathers?|feathery|wings?|winged|wingtips?|beaks?|nests?|talons?|preen(s|ing|ed)?|hoot(s|ing|ed)?|tweet(s|ing)?|plumage|flock)\b/i;   // never in a Howling's pool
const BEAST=/\b(paws?|pawprints?|tails?|dens?|fur|furry|snouts?|muzzles?|whiskers?|howl(s|ing|ed)?|wag(s|ging|ged)?|growl(s|ing)?|claws?|sniff(s|ing)?)\b/i;   // never in a Wingsong's pool (tree 'bark' and another animal that 'sniffed' are fine)
const KEYS=new Set(['text','say','reply','label','short','caption','gesture','memory']);
const hits=[];
function walk(o,where,ban,file){if(Array.isArray(o))return o.forEach((x,i)=>walk(x,where+'['+i+']',ban,file));if(!o||typeof o!=='object')return;
  for(const [k,v] of Object.entries(o)){if(typeof v==='string'&&KEYS.has(k)){for(const [nm,re] of ban){const m=v.match(re);if(m)hits.push(`${file}:${where}.${k} (${nm}: "${m[0]}") ${v.slice(0,70)}`)}}else if(typeof v==='object')walk(v,where+'.'+k,ban,file)}}
const J=f=>JSON.parse(fs.readFileSync(path.join(R,f+'.json'),'utf8'));
// shared.json: indexed UI pools carry one entry per family in FAMILIES.order (slyte, whimber); those entries are family-owned
const sh=J('shared'),FAMI=new Set(['ui_keepsake','ui_or_family']);
for(const [k,L] of Object.entries(sh.barks||{})){if(Array.isArray(L)&&L.length===2&&/^(ui_|fw_)/.test(k)&&L.some(l=>BIRD.test(l.text||''))&&L.some(l=>!BIRD.test(l.text||''))){walk(L[0],'barks.'+k+'[0]',[['bird',BIRD]],'shared');walk(L[1],'barks.'+k+'[1]',[['beast',BEAST]],'shared')}
  else walk(L,'barks.'+k,[['bird',BIRD],['beast',BEAST]],'shared')}
walk(sh.conversations||[],'conversations',[['bird',BIRD],['beast',BEAST]],'shared');
walk(J('slyte'),'slyte',[['bird',BIRD]],'slyte');walk(J('whimber'),'whimber',[['beast',BEAST]],'whimber');
if(hits.length){console.log(hits.length+' cross-family word(s):\n'+hits.join('\n'));process.exit(1)}console.log('family words OK')
