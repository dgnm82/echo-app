// E6: every comfort/affection option label + icon and every pet/sit/hug/affection line renders for every animal of every family, never "undefined"
global.window=global;require('../families.js');require('../config.js');const D=require('../dialogue.js');const fs=require('fs'),path=require('path');
const F=global.FAMILIES,C=global.CONFIG;let n=0,bad=[];const ok=(c,m)=>{n++;if(!c)bad.push(m)};
D.loader=async f=>JSON.parse(fs.readFileSync(path.join(__dirname,'..','dialogue',f+'.json'),'utf8'));
(async()=>{for(const f of F.order){const fam=F[f],cid=fam.dialogue,alt=fam.games&&fam.games.style==='sky'?'whimber':'slyte';await D.load(cid);
  for(const o of C.affection){const l=o.label[cid],i=typeof o.icon==='string'?o.icon:o.icon[cid];/* strict: each family needs its own label (the game also falls back) */ok(typeof l==='string'&&l&&!/undefined/.test(l),`${f} label ${o.id}: ${l}`);ok(typeof i==='string'&&i,`${f} icon ${o.id}`)}
  const keys=Object.keys(D.lib.barks).filter(k=>/^(pet|sit|hug_full|after_hug|aff_\w+)$/.test(k)||C.affection.some(o=>o.pool===k));
  for(const a of Object.keys(F.animals).filter(a=>F.animals[a].family===f)){const A=F.animals[a];
    D.ctx=()=>({vars:{origin_animal:A.word,family:fam.label,family_plural:fam.plural,default_name:A.default_name||fam.default_name,child:'Mia'},fill:{name:A.default_name||'Echo',child:'Mia'}});
    for(const seed of [1,2,3,4,5,6,7,8]){D.setPersona(seed);D.mem.petSince=99;
      for(const k of keys)for(const L of D.lib.barks[k]){const t=D.fill(L.text||'');ok(!/undefined|\{(var|name|pet_phrase|word)\b/.test(t),`${f}/${a} ${k}: ${t}`)}}}}
  console.log(bad.length?bad.slice(0,8).join('\n')+`\n${bad.length}/${n} FAILED`:`no-undefined OK (${n} checks)`);process.exit(bad.length?1:0)})();
