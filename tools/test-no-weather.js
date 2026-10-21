#!/usr/bin/env node
// Batch F: the game has no weather. Echo-spoken lines in the 3 family files must not assert rain / wind / fog / puddles now.
// Snow / frost lines need cond.var.season==='snow' (snowSeason()). Child answer choices (label / reply / set / memory) are the
// child's own world and are not checked. Kept on purpose: pretend play, facts, the runner puddle, the dripping tap (ALLOW).
// Usage: node tools/test-no-weather.js [dialogueDir]
const fs=require('fs'),path=require('path');const R=process.argv[2]||path.join(__dirname,'..','dialogue');
const RX=/\b(rain(?!bow)\w*|drizzl\w*|thunder\w*|puddles?|wind|windy|breez\w*|fog\w*|mist\w*|weather)\b/i,SNOW=/\b(snow\w*|frost\w*)\b/i;
const ALLOW=[/Puddle paws/,/Pretend rain hat/,/tiny breeze came out/,/raindrops just roll off/,/What sound does the wind make/,/Rain rolls right off/,/wind chimes/,/The wind would be a very/];
const FACT=/\b(arctic|foxes|snow leopards?|snowshoes|lynx|deep snow)\b/i;
let bad=0;const hit=(f,w,t,why)=>{bad++;console.log(`${f}:${w} (${why}) ${t}`)};
const season=c=>!!c&&((c.var&&c.var.season==='snow')||(c.any||[]).some(season));
for(const f of ['slyte','whimber','twitchel']){const d=JSON.parse(fs.readFileSync(path.join(R,f+'.json'),'utf8'));
  for(const k of Object.keys(d.barks)){if(/^weather_(drizzle|breezy|fog|rainbow)$/.test(k))hit(f,'barks.'+k,'','dead weather pool');
    d.barks[k].forEach((l,i)=>{const t=l.text||'';if(RX.test(t)&&!ALLOW.some(a=>a.test(t)))hit(f,`barks.${k}[${i}]`,t,'weather');
      if(SNOW.test(t)&&!FACT.test(t)&&k!=='weather_snow'&&!season(l.cond))hit(f,`barks.${k}[${i}]`,t,'snow not gated')})}
  for(const c of d.conversations){const origin=JSON.stringify(c.cond||{}).includes('origin_animal');
    for(const [nk,n] of Object.entries(c.nodes||{})){const t=n.say||'';if(RX.test(t)&&!ALLOW.some(a=>a.test(t)))hit(f,`${c.id}.${nk}`,t,'weather');
      if(SNOW.test(t)&&!FACT.test(t)&&!origin&&!season(c.cond))hit(f,`${c.id}.${nk}`,t,'snow not gated')}}}
console.log(bad?`${bad} weather line(s)`:'no weather OK');process.exit(bad?1:0);
