#!/usr/bin/env node
// H14: "Hoo" / "hoo-hoo" / "hoo-hum" are owl-only.
//  1) RUNTIME (always strict): every whimber line + persona pet phrase, as heard by each non-owl bird through Dialogue.speciesCalls,
//     has 0 x \bhoo\b / hoo-. Also the dialogue_engine compositional output for each non-owl look.
//  2) CORPUS (raw JSON, informational until Cole's rebuilt corpus lands; --strict-corpus makes it fail): non-owl-reachable lines
//     (not gated on origin_animal owl) that still contain hoo. The handheld EDZ1 pack has no runtime swap, so it needs the corpus fix.
const fs=require('fs'),path=require('path'),vm=require('vm');const R=path.join(__dirname,'..');const strictCorpus=process.argv.includes('--strict-corpus');
const RX=/\bhoo\b|\bhoo-/i,BIRDS=['bird','duck','dove','pigeon','crow','eagle','chicken','gull'];
const W={console,Math,Date,JSON,setTimeout:()=>0,clearTimeout(){}};W.window=W;vm.createContext(W);
vm.runInContext(fs.readFileSync(path.join(R,'dialogue.js'),'utf8'),W);vm.runInContext(fs.readFileSync(path.join(R,'dialogue_engine.js'),'utf8'),W);const D=W.Dialogue;
const J=JSON.parse(fs.readFileSync(path.join(R,'dialogue','whimber.json'),'utf8'));
const owlGated=c=>!!c&&JSON.stringify(c).includes('"origin_animal":"owl"')&&!/"any"/.test(JSON.stringify(c));
const texts=[];for(const [k,L] of Object.entries(J.barks))L.forEach((l,i)=>{if(l.text)texts.push({w:`barks.${k}[${i}]`,t:l.text,owl:owlGated(l.cond)})});
for(const c of J.conversations||[])for(const [nk,n] of Object.entries(c.nodes||{})){const owl=owlGated(c.cond);if(n.say)texts.push({w:`${c.id}.${nk}`,t:n.say,owl});for(const ch of n.choices||[])if(ch.reply)texts.push({w:`${c.id}.${nk}.reply`,t:ch.reply,owl})}
(J.persona.petPhrases||[]).forEach((p,i)=>texts.push({w:`persona.petPhrases[${i}]`,t:p,owl:false}));
let rt=0,raw=0;const ex=[];
for(const x of texts){if(x.owl)continue;if(RX.test(x.t)){raw++;if(ex.length<5)ex.push(x.w+': '+x.t)}for(const b of BIRDS){const o=D.speciesCalls(x.t,b);if(RX.test(o)){rt++;if(rt<=5)console.log('RUNTIME',b,x.w,o)}}}
// engine output
const E=W.DialogueEngine||W.DIALOGUE_ENGINE||W.DialogueV2;let eng=0;
if(E&&E.pick)for(const b of BIRDS)for(let i=0;i<40;i++){const c=E.pick({look:b,family:'whimber',ageBand:['5-6','7-8','9-10'][i%3],state:{chatHistory:[]}},{record:false});if(c&&c.text&&RX.test(c.text)){eng++;if(eng<=3)console.log('ENGINE',b,c.text)}}
console.log(`hoo lint: runtime ${rt} non-owl hoo (must be 0), engine ${eng}; corpus ${raw} raw non-owl-reachable lines still say hoo${raw?' (swapped at runtime; needs corpus rebuild for EDZ1)':''}`);
if(raw&&!strictCorpus)ex.forEach(e=>console.log('  e.g.',e));
process.exit(rt||eng||(strictCorpus&&raw)?1:0);
