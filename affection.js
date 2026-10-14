// affection v2: pick 3 of the 10 kind things (>=1 touch, >=1 words), shuffle bag, Pet always offered on days 1-3. Pure.
(function(W){
function affPick(S,pool,rand){rand=rand||Math.random;const ids=pool.map(o=>o.id),by=id=>pool.find(o=>o.id===id),last=S.affLast||[];
  let bag=(S.affBag||[]).filter(id=>ids.includes(id));const out=[];
  const take=(ok)=>{let c=bag.filter(id=>!out.includes(id)&&ok(by(id)));if(!c.length)c=ids.filter(id=>!out.includes(id)&&ok(by(id))&&!last.includes(id));if(!c.length)c=ids.filter(id=>!out.includes(id)&&ok(by(id)));const id=c[Math.floor(rand()*c.length)];out.push(id);bag=bag.filter(x=>x!==id);if(!bag.length)bag=ids.filter(x=>!out.includes(x))};
  if((S.days||0)<=3){out.push('pet');bag=bag.filter(x=>x!=='pet')}else take(o=>o.kind==='touch');
  take(o=>o.kind==='words');take(()=>true);
  if(out.slice().sort().join()===last.slice().sort().join()){const k=out.pop();take(o=>o.id!==k)}
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  S.affBag=bag;S.affLast=out.slice();return out.map(by)}
W.affPick=affPick;if(typeof module!=='undefined')module.exports={affPick};
})(typeof window!=='undefined'?window:globalThis);
