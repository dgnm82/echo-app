#!/usr/bin/env node
// H9 (final): NO-WEATHER-NETWORK check. The phone's weather is fully offline: it comes only from the on-device season/date
// cycle (weather_engine.js). Part 1 asserts the weather code and the whole app bundle never ask for location or look the
// weather up remotely (no geolocation, open-meteo, WeatherKit, fetch or XHR). Part 2 (Batch F corpus rule, kept):
// Batch F: the game has no weather. Echo-spoken lines in the 3 family files must not assert rain / wind / fog / puddles now.
// Snow / frost lines need cond.var.season==='snow' (snowSeason()). Child answer choices (label / reply / set / memory) are the
// child's own world and are not checked. Kept on purpose: pretend play, facts, the runner puddle, the dripping tap (ALLOW).
// Batch H / H9: the phone now has a weather engine (ctx.weather = clear|cloudy|rain|snow|fog|storm). A line or conversation
// gated by cond.weather (dialogue.js check() needs ctx.weather to match) is the weather system's own content and is exempt;
// everything NOT weather-gated still follows the Batch F rule above.
// Usage: node tools/test-no-weather.js [dialogueDir]
const fs=require('fs'),path=require('path');const R=process.argv[2]||path.join(__dirname,'..','dialogue'),APP=path.join(__dirname,'..');
// ---- Part 1: no weather network / location, in the weather engine and in every script the app loads
{let nbad=0;const NET=[[/navigator\s*\.\s*geolocation|getCurrentPosition|watchPosition/,'geolocation'],[/open-?meteo/i,'open-meteo'],[/weather\s*kit/i,'WeatherKit'],
    [/\bfetch\s*\(/,'fetch()'],[/XMLHttpRequest/,'XHR'],[/\bnew\s+WebSocket\b|\bEventSource\b|sendBeacon/,'socket/beacon'],[/api\.(openweathermap|weather\.gov|weatherapi)|openweathermap/i,'weather API']];
  const loaded=new Set(['weather_engine.js']);for(const h of ['index.html','handheld.html']){const p=path.join(APP,h);if(!fs.existsSync(p))continue;
    for(const m of fs.readFileSync(p,'utf8').matchAll(/<script[^>]+src="([^"?#]+)/g))if(!/^https?:/.test(m[1]))loaded.add(m[1]);else{nbad++;console.log(`${h}: remote script ${m[1]}`)}}
  for(const f of loaded){const p=path.join(APP,f);if(!fs.existsSync(p))continue;const src=fs.readFileSync(p,'utf8');
    // weather_engine.js: comments count too (no placeholder that suggests a live provider); other files: code only
    const body=f==='weather_engine.js'?src:src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"`\\])\/\/.*$/gm,'$1');
    if(f==='weather_engine.js'){for(const [re,why] of NET)if(re.test(body)){nbad++;console.log(`${f}: ${why}`)}}
    else{for(const [re,why] of NET)if(why!=='fetch()'&&re.test(body)){nbad++;console.log(`${f}: ${why}`)}
      // the bundle may fetch its own packaged files only: fetch('<relative path>' or BASE+..), never a URL and never near weather
      for(const m of body.matchAll(/\bfetch\s*\(([^)]{0,80})/g)){const a=m[1].trim(),line=body.slice(body.lastIndexOf('\n',m.index)+1,body.indexOf('\n',m.index));
        if(/^['"`](https?:)?\/\//i.test(a)||/https?:/i.test(a)||!/^(['"`][\w.\/-]+|BASE\b)/.test(a)||/weather|WEATHER|meteo/.test(line)){nbad++;console.log(`${f}: fetch(${a.slice(0,40)}) is not a packaged file`)}}}
    if(f==='weather_engine.js'&&/\bprovider\b|lat(itude)?\s*[:=]|lon(gitude)?\s*[:=]/i.test(src)){nbad++;console.log('weather_engine.js: live provider hook / coordinates')}}
  console.log(nbad?`${nbad} weather network issue(s)`:`no weather network OK (${loaded.size} scripts)`);if(nbad)process.exitCode=1}
// ---- Part 2: Batch F corpus rule
const RX=/\b(rain(?!bow)\w*|drizzl\w*|thunder\w*|puddles?|wind|windy|breez\w*|fog\w*|mist\w*|weather)\b/i,SNOW=/\b(snow\w*|frost\w*)\b/i;
const ALLOW=[/Puddle paws/,/Pretend rain hat/,/tiny breeze came out/,/raindrops just roll off/,/What sound does the wind make/,/Rain rolls right off/,/wind chimes/,/The wind would be a very/];
const FACT=/\b(arctic|foxes|snow leopards?|snowshoes|lynx|deep snow)\b/i;
let bad=0;const hit=(f,w,t,why)=>{bad++;console.log(`${f}:${w} (${why}) ${t}`)};
const season=c=>!!c&&((c.var&&c.var.season==='snow')||(c.any||[]).some(season));
const wgated=c=>!!c&&(Array.isArray(c.weather)&&c.weather.length>0);   // H9: cond.weather-gated = weather engine content
for(const f of ['slyte','whimber','twitchel']){const d=JSON.parse(fs.readFileSync(path.join(R,f+'.json'),'utf8'));
  for(const k of Object.keys(d.barks)){if(/^weather_(drizzle|breezy|fog|rainbow)$/.test(k)&&!d.barks[k].every(l=>wgated(l.cond)))hit(f,'barks.'+k,'','dead weather pool');
    d.barks[k].forEach((l,i)=>{if(wgated(l.cond))return;const t=l.text||'';if(RX.test(t)&&!ALLOW.some(a=>a.test(t)))hit(f,`barks.${k}[${i}]`,t,'weather');
      if(SNOW.test(t)&&!FACT.test(t)&&k!=='weather_snow'&&!season(l.cond))hit(f,`barks.${k}[${i}]`,t,'snow not gated')})}
  for(const c of d.conversations){if(wgated(c.cond))continue;const origin=JSON.stringify(c.cond||{}).includes('origin_animal');
    for(const [nk,n] of Object.entries(c.nodes||{})){const t=n.say||'';if(RX.test(t)&&!ALLOW.some(a=>a.test(t)))hit(f,`${c.id}.${nk}`,t,'weather');
      if(SNOW.test(t)&&!FACT.test(t)&&!origin&&!season(c.cond))hit(f,`${c.id}.${nk}`,t,'snow not gated')}}}
console.log(bad?`${bad} weather line(s)`:'no weather OK');if(bad)process.exitCode=1;
