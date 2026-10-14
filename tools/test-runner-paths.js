// Every palette/stage runner frame path a seed can produce exists (runner_polish.md §7).
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.join(__dirname,'..');
const W={};vm.runInNewContext(fs.readFileSync(root+'/pixel.js','utf8'),{window:W,self:W,document:new Proxy({},{get:()=>()=>null}),console,Math,setInterval:()=>0,addEventListener:()=>0,setTimeout:()=>0});const P=W.PIXEL;
const FR={slyte:['run0','run1','run2','run3','run4','run5','jump','fall','tumble','run_happy','disguise0','disguise1','reveal'],whimber:['flap0','flap1','flap2','flap3','glide','tumble','glide_happy']};
const seen={slyte:new Set(),whimber:new Set()};let miss=[];
for(const sp of ['slyte','whimber'])for(let seed=0;seed<5000;seed++)seen[sp].add(P.variant(seed,sp).pal);
for(const sp in seen){const L=sp==='slyte'?P.PAL:P.POWL,L0=sp==='slyte'?P.PAL0:P.POWL0;if(seen[sp].size!==L0.length)miss.push(sp+' seeds reach '+seen[sp].size+'/'+L0.length);
  for(const pal of new Set([...seen[sp],...L])){   // seeded ramps + every chip colour (origin v0.3)
if(!L.includes(pal))miss.push('unknown pal '+pal);for(const sd of [''])for(const k of FR[sp]){const f=`px/run/${pal}/${sd}${sp}_${k}.png`;if(!fs.existsSync(root+'/'+f))miss.push(f)}}}
if(fs.readdirSync(root+'/px/run').some(d=>['s1','s2','s3'].some(s=>fs.existsSync(root+'/px/run/'+d+'/'+s))))miss.push('glow v1: s1-s3 runner sets must be gone');
if(miss.length){console.error('runner paths FAIL',miss.slice(0,20));process.exit(1)}console.log('runner paths OK',[...seen.slyte].length,[...seen.whimber].length);
