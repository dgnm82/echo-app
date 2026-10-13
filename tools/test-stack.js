const S=require('../stack.js'),T=require('../games_tuning.js');let ok=0,n=0;const A=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
let g=S.create({level:'standard'});g.w=52;g.top=60;g.sx=66;S.press(g);let e=S.take(g)[0];A(g.w===46&&e.trimR===6&&g.top===66,'trim');
g=S.create({level:'standard'});g.sx=g.top+2;S.press(g);A(g.w===64&&S.take(g)[0].type==='perfect','perfect');
g=S.create({level:'standard'});g.w=50;for(let i=0;i<3;i++){g.sx=g.top;S.press(g)}A(g.w===54,'regrow');
g=S.create({level:'standard'});g.sx=g.top+200;S.press(g);A(g.done&&S.take(g).some(e=>e.type==='end'),'miss end');
g=S.create({level:'easy'});g.w=12;g.sx=g.top+40;S.press(g);A(!g.done&&g.h===1,'easy net');
g=S.create({level:'standard'});g.h=10;A(S.speed(g)===90,'speed');
const r=s=>{const g=S.create({level:'bigkid',seed:s});g.h=40;const xs=[];for(let i=0;i<500;i++){S.step(g,1/60);xs.push(g.sx)}return xs.join()};A(r(5)===r(5),'wind replay');
console.log(`${ok}/${n} stack tests passed`);if(ok<n)process.exit(1)
