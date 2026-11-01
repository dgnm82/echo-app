// LIST2 #10 (Daniel, Oct 28): the word "bond" never reaches the screen (child or grown-up, dev panel included). The concept is the
// Echo's song growing ("Our song grew!", song stages). Internal names (S.bond, bondup_sting, bond_meter_tick, .bondup) may stay.
// Checks: 1) every dialogue/*.json string value that is prose (not an id) 2) BondUp stage names + fallback title 3) visible-text
// literals in the app JS/HTML: quoted/template text with a space or capital around "bond", and HTML text nodes.
// Usage: node tools/test-no-bond.js
'use strict';const fs=require('fs'),path=require('path');const APP=path.join(__dirname,'..');let ok=0,bad=[];
const T=(c,m)=>{if(c)ok++;else{bad.push(m);console.log('FAIL',m)}};
const BOND=/bond/i,ID=/^[\w.#\-:\/ ]*$/;
// 1) dialogue JSON prose
for(const f of fs.readdirSync(path.join(APP,'dialogue')).filter(f=>f.endsWith('.json'))){const d=JSON.parse(fs.readFileSync(path.join(APP,'dialogue',f),'utf8'));let n=0;
  (function walk(o,p){if(Array.isArray(o))o.forEach((v,i)=>walk(v,p+'['+i+']'));else if(o&&typeof o==='object')Object.entries(o).forEach(([k,v])=>walk(v,p+'.'+k));
    else if(typeof o==='string'&&/\s/.test(o.trim())&&BOND.test(o)){n++;T(false,`dialogue/${f}${p}: "${o.slice(0,80)}"`)}})(d,'');
  T(n===0,`dialogue/${f}: no prose with "bond"`)}
// 2) the song-grew moment
global.window=global;require(path.join(APP,'bondup.js'));const B=global.BondUp;
T(Object.values(B.NAMES).every(x=>!BOND.test(x)),'BondUp.NAMES are song stages: '+JSON.stringify(B.NAMES));
T(JSON.stringify(B.NAMES)===JSON.stringify({2:'First notes',3:'Song growing',4:'Full song',5:'Ready to sing'}),'song stage names');
const bu=fs.readFileSync(path.join(APP,'bondup.js'),'utf8');T(/Our song grew!/.test(bu)&&!/'Closer!?'/.test(bu),'bond-up fallback title + aria-label = "Our song grew!"');
// 3) visible literals in code (comments stripped)
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"`\\])\/\/.*$/gm,'$1');
const FILES=['game.js','bondup.js','dialogue_engine.js','dialogue.js','echoback.js','memory.js','postcards.js','lines.js','alive.js','musicfx.js','notes.js','need_select.js','spirit.js','runner.js','catch.js','stack.js','index.html','handheld.html','showcase.html'];
for(const f of FILES){const p=path.join(APP,f);if(!fs.existsSync(p))continue;const src=strip(fs.readFileSync(p,'utf8'));let n=0;
  const CODE=/[;{}()=]|\$\{|&&|\|\|/;
  src.split('\n').forEach((line,i)=>{
    const lits=[...line.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`|>([^<>\n]*)</g)].map(m=>m[1]!=null?m[1]:m[2]!=null?m[2]:m[3]!=null?m[3]:m[4]);
    for(const L of lits){const t=L.replace(/<[^>]*>/g,' ').replace(/\$\{[^}]*\}/g,' ').trim();if(!/\bbond/i.test(t)||CODE.test(t))continue;
      if(/\s/.test(t)||/^Bond/.test(t)||/^bond(s|ed)?[!.,?]?$/i.test(t)){n++;T(false,`${f}:${i+1}: visible "bond" in ${JSON.stringify(t.slice(0,90))}`)}}});
  T(n===0,`${f}: no visible "bond"`)}
// known spots from the LIST2 #10 scan (Kai, Oct 28) + this pass
const G=fs.readFileSync(path.join(APP,'game.js'),'utf8');
T(!/'Bond '/.test(G)&&/'Song '\+S\.bond\+' of 500'/.test(G),'top badge aria-label says "Song N of 500"');
T(!/Bond moments/.test(G)&&/Song moments/.test(G),'Memory Book heading "Song moments"');
T(!/Closer!/.test(G)&&/Our song grew! \$\{BondUp\.NAMES/.test(G),'Memory Book chip "Our song grew! <stage>"');
T(!/\+60 bond|Short bond/.test(G),'dev panel buttons say song');
T(!/Next bond stage/.test(fs.readFileSync(path.join(APP,'handheld.html'),'utf8')),'handheld dev button "Next song stage"');
console.log(`no-bond: ${ok} ok, ${bad.length} failed`);process.exit(bad.length?1:0);
