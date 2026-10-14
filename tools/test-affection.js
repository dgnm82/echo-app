// affection v2: affPick rules (3 shown, >=1 touch + >=1 words, all 10 appear, bag, Pet on days 1-3), labels per family
global.window=global;require('../config.js');const {affPick}=require('../affection.js');const C=global.CONFIG||global.C;const P=C.affection;let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}};
let r=1;const rand=()=>(r=(r*16807)%2147483647)/2147483647;
for(const days of [1,2,3,9]){const S={days},seen=new Set();let prev=[];
  for(let n=0;n<1000;n++){const o=affPick(S,P,rand),ids=o.map(x=>x.id);ids.forEach(i=>seen.add(i));
    ok(o.length===3&&new Set(ids).size===3,'3 distinct');ok(o.some(x=>x.kind==='touch')&&o.some(x=>x.kind==='words'),'touch+words '+ids);
    if(days<=3)ok(ids.includes('pet'),'pet day '+days);ok(ids.slice().sort().join()!==prev.slice().sort().join(),'same set twice');prev=ids}
  ok(seen.size===10||days<=3&&seen.size===10,'all 10 appear day '+days+': '+seen.size)}
const L=id=>P.find(o=>o.id===id).label;ok(L('groom').slyte==='Scratch your ears'&&L('groom').whimber==='Smooth your feathers'&&L('five').slyte==='Paw five!'&&L('five').whimber==='Wing five!','labels');
for(const o of P){ok(!/feather|preen|wing/i.test(o.label.slyte),'howling label '+o.id);ok(!/paw|tail|sniff/i.test(o.label.whimber),'wingsong label '+o.id);ok(!/you look|secret|again/i.test(o.label.slyte+o.label.whimber),'kind label '+o.id)}
console.log(f?f+' affection failure(s)':'affection OK');process.exit(f?1:0)
