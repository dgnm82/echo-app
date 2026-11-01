#!/usr/bin/env node
// Nov 1 dialogue fix (BRIEF_FIX_NOV1 Jay #1): the micro-clause composer and the engine line builders stay OUT of the live app.
//  - the live dialogue_engine.js has no composer (no pick / miniConversation / buildCompositionalCandidate / clause tables)
//  - no page loads tools/engine_composer.js, no shipped file mentions micro_clauses / the composer, no micro_clauses*.json ships
//  - game.js and the other runtime files never call the composer
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');const rd=f=>fs.readFileSync(path.join(R,f),'utf8');
let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const E=require(path.join(R,'dialogue_engine.js'));
ok(E.COMPOSER===false,'live DialogueEngine.COMPOSER is false');
for(const k of ['pick','miniConversation','runMiniConversation','buildCompositionalCandidate','generateCandidates','corpusSize','OPENINGS','SCENE_OBS','NEED_CLAUSES','EVENT_CLAUSES'])ok(!(k in E),`live DialogueEngine has no ${k}`);
ok(typeof E.recordHistory==='function'&&typeof E.noteEvent==='function'&&typeof E.recentEvents==='function'&&typeof E.musicTarget==='function','live DialogueEngine keeps history + music quota + recent events');
const src=rd('dialogue_engine.js');ok(!/OPENINGS|SCENE_OBS|NEED_CLAUSES|EVENT_CLAUSES|buildCompositionalCandidate|function pick\b|miniConversation\(/.test(src.replace(/^\s*\/\/.*$/mg,'')),'dialogue_engine.js source carries no composer code');
// shipped = everything GitHub Pages serves that a page can load: top-level files + runtime folders (not tools/, tests/, flash/, .github/)
const SKIP=new Set(['tools','tests','flash','.github','.git','node_modules','__pycache__']);const shipped=[];
(function walk(d){for(const e of fs.readdirSync(path.join(R,d),{withFileTypes:true})){const p=d?d+'/'+e.name:e.name;if(e.isDirectory()){if(!SKIP.has(e.name))walk(p)}else shipped.push(p)}})('');
ok(!shipped.some(f=>/micro_clauses/i.test(path.basename(f))),'no micro_clauses*.json in the shipped tree');
const text=shipped.filter(f=>/\.(js|html|json|webmanifest|css)$/.test(f)&&!/^dialogue\//.test(f));
const refs=text.filter(f=>/micro_clauses|engine_composer|corpus_v2_nodes_short/.test(rd(f).replace(f==='dialogue_engine.js'?/^\s*\/\/.*$/mg:/$^/,'')));
ok(!refs.length,'no shipped file references micro_clauses / engine_composer: '+refs.join(', '));
for(const page of ['index.html','handheld.html','showcase.html'].filter(f=>fs.existsSync(path.join(R,f))))ok(!/src="tools\//.test(rd(page)),`${page} loads nothing from tools/`);
const RUNTIME=shipped.filter(f=>/\.js$/.test(f)&&f!=='dialogue_engine.js');
const calls=RUNTIME.filter(f=>/(DialogueEngine|DIALOGUE|\.engine)\s*\.\s*(pick|miniConversation|runMiniConversation|buildCompositionalCandidate|generateCandidates)\b/.test(rd(f)));
ok(!calls.length,'no runtime file calls the composer: '+calls.join(', '));
// the offline composer still loads for its own tests and declares itself offline
const C=fs.readFileSync(path.join(__dirname,'engine_composer.js'),'utf8');ok(/OFFLINE ONLY/.test(C)&&/DISABLED IN THE LIVE APP/.test(C),'tools/engine_composer.js is marked offline only');
console.log(`no-composer: ${n-bad} ok, ${bad} failed`);process.exit(bad?1:0);
