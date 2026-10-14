const S=require('../stack.js'),T=require('../games_tuning.js');let ok=0,n=0;const A=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
let g=S.create({level:'standard'});g.w=52;g.top=60;g.sx=66;S.press(g);let e=S.take(g)[0];A(g.w===46&&e.trimR===6&&g.top===66,'trim');
g=S.create({level:'standard'});g.sx=g.top+1;S.press(g);A(g.w===64&&S.take(g)[0].type==='perfect','perfect');
g=S.create({level:'standard'});g.w=50;for(let i=0;i<3;i++){g.sx=g.top;S.press(g)}A(g.w===54,'regrow');
g=S.create({level:'standard'});g.sx=g.top+200;S.press(g);A(g.done&&S.take(g).some(e=>e.type==='end'),'miss end');
g=S.create({level:'easy'});g.w=12;g.sx=g.top+40;S.press(g);A(g.done,'easy: a full miss ends (no glue)');
g=S.create({level:'easy'});g.w=40;g.sx=g.top+30;S.press(g);A(g.w===10,'easy: overhang trimmed, no width floor');
g=S.create({level:'easy'});g.sx=g.top;S.press(g);S.take(g);S.press(g);A(S.take(g).every(e=>e.type!=='perfect'),'instant re-tap is not perfect');
for(const l of ['easy','standard','bigkid']){let P=0,H=0;for(let s=1;s<=40;s++){const g=S.create({level:l,seed:s});let x=s*7919;const rr=()=>(x=(x*48271)%2147483647)/2147483647;while(!g.done&&g.h<200){const k=Math.floor(rr()*90);for(let i=0;i<k;i++)S.step(g,1/60);S.press(g);S.take(g)}P+=g.perfects;H+=g.h}A(P<=H*.2,'random taps rarely perfect '+l+' '+P+'/'+H)}
g=S.create({level:'standard'});g.h=10;A(S.speed(g)===90,'speed');
const r=s=>{const g=S.create({level:'bigkid',seed:s});g.h=40;const xs=[];for(let i=0;i<500;i++){S.step(g,1/60);xs.push(g.sx)}return xs.join()};A(r(5)===r(5),'wind replay');
console.log(`${ok}/${n} stack tests passed`);if(ok<n)process.exit(1)
