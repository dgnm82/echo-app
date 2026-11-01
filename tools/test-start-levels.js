#!/usr/bin/env node
// Music School Phase 1 step 1 (Nov 1 overrides) - replaces the Batch G age-start test: there is NO age step any more.
// New children: reading band 5-6 (auto-growing), music level = neutral ML2 prior until the warm-up; starts come from the music level.
// Usage: node tools/test-start-levels.js
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..');
const D=require(path.join(R,'difficulty.js')),ML=require(path.join(R,'musiclevel.js'));
const EB=require(path.join(R,'echoback.js'));EB.setData(JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'),'utf8')).echo_it_back);
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const G=fs.readFileSync(path.join(R,'game.js'),'utf8'),CSS=fs.readFileSync(path.join(R,'style.css'),'utf8');
// 1. no age step anywhere a child sees it
ok(!/function obAge\b|obAge\(\)/.test(G),'game.js: no obAge step');ok(!/obagebtn|obages/.test(G+CSS),'no age buttons / CSS');
const dl=['shared','slyte','whimber','twitchel'].map(f=>fs.readFileSync(path.join(R,`dialogue/${f}.json`),'utf8')).join('\n');
ok(!/ui_ob_age_/.test(dl),'no ui_ob_age_* lines');ok(!/how old (are you|is your child|is the child)|your child'?s age/i.test(dl+G.replace(/\/\/[^\n]*/g,'')),'no "how old are you" copy (child or grown-up)');
for(const f of fs.readdirSync(path.join(R,'tests')).filter(f=>/\.py$/.test(f)))ok(!/(T\((pg,)?f?'|\.click\(|\.tap\()[^\n]*obagebtn|obagebtn[^\n]*\.(click|tap)\(/.test(fs.readFileSync(path.join(R,'tests',f),'utf8')),`tests/${f}: no age-step clicks`);
ok(/obName|obConfirm/.test(G)&&/obSetChild\(n\);orSeen\(\)/.test(G),'naming goes straight on (orSeen)');
ok(/if\(!S\.ageBand\)\{S\.ageBand='5-6';S\.bandAuto=1\}/.test(G),'new child: reading band 5-6, auto-growing');
ok(/wuRun\(null,/.test(G),'the warm-up runs after naming');
ok(/Age range/.test(G),'the existing locked grown-ups Age range setting is left as it is');
ok(!/Music level/.test(G),'no grown-ups Music level row');
// 2. music-level starts (prior ML2 for everyone; no age prior)
const b={v:3,songs:[],progress:{}};const p=EB.Progress.get(b,'kid1','9-10');ok(p.ml.level===2&&p.len===4,'new child in any band: ML2, Echo It Back starts at 4 notes');
ok([1,2,3,4,5].map(ML.eibStartLen).join()==='3,4,6,7,8','EIB starts by ML 3/4/6/7/8');
ok(ML.readingBand('5-6',2,0)==='5-6'&&ML.readingBand('5-6',3,0)==='7-8'&&ML.readingBand('5-6',4,0)==='9-10'&&ML.readingBand('9-10',1,0)==='9-10','reading band: warm-up nudge, never down');
ok(ML.readingBand('5-6',2,15)==='7-8','reading band grows with play');
ok(D.dial('catch',{ml:ML.fresh()})===ML.fresh().dial.catch&&D.dial('catch',{set:'bigkid',ml:ML.fresh()})===2,'game dials: from the music level; a set level wins');
// 3. the old per-game level() still works for set levels / Pairs (kept for grown-up overrides and old saves)
for(const g of ['pairs','dig','run','catch','stack'])for(const s of ['easy','standard','bigkid'])ok(D.level(g,{set:s,games:9,band:'7-8'})===(g==='dig'||g==='pairs'?s:s),`${g}: set level ${s} wins`);
console.log(`start levels (no age step): ${n} checks, ${bad} failed`);process.exit(bad?1:0)
