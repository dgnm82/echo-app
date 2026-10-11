// Config sanity tests: node tools/test-config.js
const assert=require('assert');global.window=global;require('../config.js');const C=global.CONFIG;let n=0,ok=0;
function T(name,fn){n++;try{fn();ok++;console.log('  ok  '+name)}catch(e){console.log('  FAIL '+name+': '+e.message)}}
T('napSeconds and sitSeconds are positive numbers (not swallowed by a comment)',()=>{for(const k of ['napSeconds','sitSeconds'])assert(typeof C[k]==='number'&&C[k]>0,k+'='+C[k])});
T('check-in schedule is the six v0.5 postcards',()=>assert.deepEqual(C.checkins.map(c=>c[0]),[1,3,7,14,30,60]));
console.log(ok+'/'+n+' config tests passed');if(ok!==n)process.exit(1);
