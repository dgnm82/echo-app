#!/usr/bin/env node
// Batch G: age-based starting level for every game (difficulty.js) + the 9-10 start table with the actual knob values.
// Usage: node tools/test-age-start.js [--table]
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..');
const D=require(path.join(R,'difficulty.js')),T=require(path.join(R,'games_tuning.js'));
const EB=require(path.join(R,'echoback.js'));EB.setData(JSON.parse(fs.readFileSync(path.join(R,'music/tunes.json'),'utf8')).echo_it_back);
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const G=['pairs','dig','run','catch','stack'],L=(g,o)=>D.level(g,Object.assign({set:'auto',games:0,autoEasy:false},o));
// 7 (Kai): 9-10 starts at Standard from game 1 in every game; 5-6 / 7-8 keep the "first games are Easy" rule
for(const g of G){ok(L(g,{band:'9-10'})==='standard',`9-10 ${g}: game 1 is Standard`);
  ok(L(g,{band:'7-8'})==='easy',`7-8 ${g}: game 1 is still Easy`);ok(L(g,{band:'7-8',games:D.WARMUP[g]})==='standard',`7-8 ${g}: Standard after the warm-up`);
  ok(L(g,{band:'5-6',set:'easy',games:5})==='easy',`5-6 ${g}: Easy (band sets the level)`);ok(L(g,{band:'5-6'})==='easy',`5-6 ${g}: first game Easy without a set level`);
  ok(L(g,{band:undefined})===L(g,{band:'7-8'}),`no band = 7-8 (${g})`);
  ok(L(g,{band:'9-10',autoEasy:true})==='easy',`9-10 ${g}: the quiet auto-Easy still applies (always playable)`);
  for(const s of ['easy','standard','bigkid'])ok(L(g,{band:'9-10',set:s})===s,`9-10 ${g}: grown-up level ${s} wins`)}
ok(L('run',{band:'7-8',set:'bigkid'})==='bigkid'&&L('dig',{band:'7-8',set:'bigkid'})==='easy','7-8 unchanged (run override first, dig warm-up first)');
// the per-game 9-10 start table (actual values) vs the 7-8 first game
const ML=(fs.readFileSync(path.join(R,'memory.js'),'utf8').match(/const LEVELS=(\{[\s\S]*?\}\});/)||[])[1];const MEM=eval('('+ML+')');
const PF=eval('('+fs.readFileSync(path.join(R,'stack.js'),'utf8').match(/const PERFECT=(\{[^}]*\})/)[1]+')');
const run=T.RUN.jump,gl=T.RUN.glide,C=T.CATCH,S=T.STACK,LN=T.LINES;
const row=(lv)=>({
  'Pairs':`${MEM[lv].pairs} pairs (${MEM[lv].cols}x${MEM[lv].rows}), hint after ${MEM[lv].hintAfter} misses`,
  'Dig / Weave':`fall ${LN[lv].fall0} ms, x${LN[lv].mult} a level to ${LN[lv].floor} ms, ${LN[lv].perLevel} rows a level, pieces ${LN[lv].pieces[0][1]}`,
  'Meadow Dash (jump)':`speed ${run[lv].v0} -> ${run[lv].vKid} by ${run[lv].dKid} m, max ${run[lv].vMax}; coyote ${run[lv].coyote}s, hitbox ${run[lv].hitE}/${run[lv].hitO}`,
  'Moonlight Glide':`speed ${gl[lv].v0} -> ${gl[lv].vKid}, max ${gl[lv].vMax}; gap ${gl[lv].gapMax}-${gl[lv].gapMin}`,
  'Snack / Berry / Starfall Catch':`fall ${C[lv].fall0} (+${C[lv].fallStep}, cap ${C[lv].fallCap}), every ${C[lv].int0}s (min ${C[lv].intMin}), basket ${C[lv].basket}, magnet ${C[lv].magnet}`,
  'Cushion Drop / Tower / Steps':`width ${S[lv].w0}, speed ${S[lv].v0} (+${S[lv].vStep}, cap ${S[lv].vCap}), perfect within ${PF[lv]} px (near misses trimmed), min width ${S[lv].minW}`});
const t9=row('standard'),t7=row('easy');
ok(Object.values(t9).every(v=>!/undefined|NaN/.test(v)),'table has real values');
ok(EB._pure.startLen('9-10')===6&&EB._pure.startLen('7-8')===4,'Echo It Back: 9-10 starts at 6 notes (7-8: 4)');
if(process.argv.includes('--table')){console.log('| Game | 9-10 game 1 (Standard) | 7-8 game 1 (Easy) |\n|---|---|---|');for(const k in t9)console.log(`| ${k} | ${t9[k]} | ${t7[k]} |`);
  console.log(`| Echo It Back | 6 notes, ramp +2 to 8 then +1, cap 16 | 4 notes |`)}
console.log(`age starts: ${n} checks, ${bad} failed`);process.exit(bad?1:0);
