// Every palette/stage runner frame path and pose sheet a seed or animal look can produce exists (runner_polish.md §7 + 20-animal unification).
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const strictAll20=process.argv.includes('--strict-all-20');
const W={console,Math,setInterval:()=>0,addEventListener:()=>0,setTimeout:()=>0,document:new Proxy({},{get:()=>()=>null})};W.window=W;W.self=W;W.globalThis=W;vm.createContext(W);
vm.runInContext(fs.readFileSync(root+'/families.js','utf8'),W);
vm.runInContext(fs.readFileSync(root+'/pixel.js','utf8'),W);
const P=W.PIXEL,FAM=W.FAMILIES;

const FR={
  slyte:['run0','run1','run2','run3','run4','run5','jump','fall','tumble','run_happy','disguise0','disguise1','reveal'],
  whimber:['flap0','flap1','flap2','flap3','glide','tumble','glide_happy'],
  twitchel:['run0','run1','run2','run3','run4','run5','jump','fall','tumble','run_happy','disguise0','disguise1','reveal']
};

const seen={slyte:new Set(),whimber:new Set(),twitchel:new Set()};
let miss=[],bakedLooks=0,pendingLooks=0;

for(const sp of ['slyte','whimber','twitchel']){
  for(let seed=0;seed<5000;seed++)seen[sp].add(P.variant(seed,sp).pal);
}
for(const sp of ['slyte','whimber','twitchel']){
  const L=P.pals(sp),L0=sp==='slyte'?P.PAL0:sp==='whimber'?P.POWL0:P.PTWIT;
  if(seen[sp].size!==L0.length)miss.push(sp+' seeds reach '+seen[sp].size+'/'+L0.length);
  for(const pal of new Set([...seen[sp],...L])){
    if(!L.includes(pal))miss.push('unknown pal '+pal);
    for(const k of FR[sp]){
      const f=`px/run/${pal}/${sp}_${k}.png`;
      if(!fs.existsSync(root+'/'+f))miss.push(f);
    }
  }
}

// Verify PIXEL.poseSheet() across all 5 poses (home, ev, sleep, walk, fly) including _light.png Stage 1 inputs
for(const base of [
  'px/slyte_wolf_ember-russet_f2_light.png',
  'px/slyte_wolf_ember-russet_f2.png',
  'px/whimber_chicken_sun-finch_f3_light.png',
  'px/whimber_chicken_sun-finch_f3.png',
  'px/twitchel_snowleopard_snow-blush_f1_light.png'
]){
  if(P.poseSheet(base,'home')!==base)miss.push('poseSheet home mismatch: '+base);
  for(const pose of ['ev','sleep','walk','fly']){
    const out=P.poseSheet(base,pose);
    if(out.includes('_light'))miss.push(`poseSheet(${base}, ${pose}) kept _light: ${out}`);
    if(!/_f\d+_(ev|sleep|walk|fly)\.png$/.test(out))miss.push(`poseSheet(${base}, ${pose}) lost fluff: ${out}`);
  }
}

// Verify PIXEL.runFrames(sp, g) across all 20 animal looks
for(const animalKey of FAM.animalOrder){
  const a=FAM.animals[animalKey],fam=FAM[a.family],sp=fam.sprite,look=a.look,isBase=look===fam.look_base;
  let lookBaked=true;
  for(const chip of fam.chips){
    const rf=P.runFrames(sp,{seed:7,pal:chip.ramp,look,fluff:2});
    if(rf.pal!==chip.ramp)miss.push(`runFrames pal ${animalKey}: ${rf.pal} !== ${chip.ramp}`);
    if(rf.look!==look)miss.push(`runFrames look ${animalKey}: ${rf.look} !== ${look}`);
    if(rf.fluff!==2)miss.push(`runFrames fluff ${animalKey}: ${rf.fluff} !== 2`);
    const wantPd=isBase?`run/${chip.ramp}/`:`run/${look}/${chip.ramp}/`;
    if(rf.pd!==wantPd)miss.push(`runFrames pd ${animalKey}: ${rf.pd} !== ${wantPd}`);
    if(rf.fly.includes('_light'))miss.push(`runFrames fly has _light: ${rf.fly}`);
    for(const k of FR[sp]){
      const fp=`px/${rf.pd}${sp}_${k}.png`;
      if(!fs.existsSync(root+'/'+fp)){
        lookBaked=false;
        if(strictAll20||isBase)miss.push(fp);
      }
    }
  }
  if(lookBaked)bakedLooks++;else pendingLooks++;
}

if(fs.readdirSync(root+'/px/run').some(d=>['s1','s2','s3'].some(s=>fs.existsSync(root+'/px/run/'+d+'/'+s))))
  miss.push('glow v1: s1-s3 runner sets must be gone');

if(miss.length){console.error('runner paths FAIL',miss.slice(0,20));process.exit(1)}
console.log('runner paths OK',seen.slyte.size,seen.whimber.size,seen.twitchel.size,`looks:${bakedLooks}/${FAM.animalOrder.length}`);
