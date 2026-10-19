// Postcards v0.5 tests: node tools/test-postcards.js
const assert=require('assert');const P=require('../postcards.js');let n=0,ok=0;
function T(name,fn){n++;try{fn();ok++;console.log('  ok  '+name)}catch(e){console.log('  FAIL '+name+': '+e.message)}}
const mem=['The day we met in the dusk meadow','You found my favorite food: 🫐 wild blackberries','We found all 10 pairs','We built the fort three floors high'];
T('a) six postcards on days 1, 3, 7, 14, 30, 60 for both Echoes, all type postcard',()=>{for(const kind of ['fox','owl']){const c=P.build({kind,child:'Mia',memories:mem});
  assert.deepEqual(c.map(x=>x.day),[1,3,7,14,30,60]);assert(c.every(x=>x.type==='postcard'&&!x.delivered&&x.scene))}});
T('b) every slot is filled; no braces left; child name and gift appear',()=>{for(const kind of ['fox','owl'])for(const m of [mem,[]]){const c=P.build({kind,child:'Mia',gift:'blackberry leaf',memories:m});
  for(const x of c)assert(!/[{}]/.test(x.text),x.text);assert(c[0].text.includes('Mia')&&c[0].text.includes('blackberry leaf'))}});
T('c) shared memories are distinct, recent first, "the day we met" last; emoji stripped',()=>{const c=P.build({kind:'fox',child:'Mia',memories:mem});
  assert(c[1].text.includes('the time we built the fort three floors high'));assert(c[3].text.includes('the time we found all 10 pairs'));assert(c[4].text.includes('wild blackberries')&&!/🫐/.test(c[4].text))});
T('d) memory-free fallbacks from the doc when nothing is saved',()=>{const c=P.build({kind:'fox',child:'Mia',memories:[]});assert(c[1].text.includes('I told a beetle all about you'));assert(c[4].text.includes('it felt like playing with you'));
  const w=P.build({kind:'owl',child:'Mia',memories:[]});assert(w[2].text.includes('the shy little star we found'));assert(w[5].text.includes('keeping an eye on everybody'))});
T('e) Slyte day 60 uses the gift when it was the trinket',()=>{assert(P.build({kind:'fox',child:'A',gift:'shiny trinket'})[5].text.includes('I still have the shiny trinket'));assert(P.build({kind:'fox',child:'A',gift:'a leaf'})[5].text.includes('a shiny thing'))});
T('f) privacy: feelings-like memories are never used',()=>{const c=P.build({kind:'fox',child:'A',memories:['You felt not great today','You said you were sad']});assert(!c.some(x=>/not great|sad/.test(x.text)))});
T('g) guardrail words: no "miss you", "come back", "secret", "watch"',()=>{for(const kind of ['fox','owl'])for(const x of P.build({kind,child:'A',memories:mem}))assert(!/miss you|come back|secret|watching|play tomorrow/i.test(x.text),x.text)});
T('h) C1/C6: every postcard signs with the CURRENT name (typed or kept default), never a family name; missing/family names -> "your friend"',()=>{const FAM=/(—|,)\s*(Slytes?|Whimbers?|Howlings?|Wingsongs?|S\.|W\.)\s*$/;
  const signed=(kind,name,gift,m)=>P.build({kind,child:'Mia',name,gift,memories:m});
  for(const kind of ['fox','owl'])for(const m of [mem,[]])for(const gift of ['shiny trinket','a leaf']){
    for(const name of ['Pip','Pipsong','Hoosa','Quackaby'])for(const x of signed(kind,name,gift,m)){assert(!FAM.test(x.text),x.text);assert(!/\{echo_name\}/.test(x.text),x.text);if(/—/.test(x.text))assert(new RegExp('— (your friend, )?'+name+'$').test(x.text),x.text)}
    for(const name of [undefined,null,'','  ','Slyte','slyte','Whimber','whimber','Howling','Howlings','Wingsong','Wingsongs'])for(const x of signed(kind,name,gift,m)){assert(!FAM.test(x.text),name+': '+x.text);assert(!/\{echo_name\}|undefined|null|, *$/.test(x.text),x.text);if(/—/.test(x.text))assert(/— your friend$/.test(x.text),x.text)}}
  for(const sp of ['slyte','whimber'])assert(P.T[sp].filter(c=>/—/.test(c.text)).length>=4&&P.T[sp].every(c=>![c.text,c.alt,c.trinket].filter(Boolean).some(t=>FAM.test(t)||/\b(Slytes?|Whimbers)\b/.test(t))))});
T('i) C6: the fox default name is Pipsong and signs as itself',()=>{global.window=global.window||{};const fs=require('fs');const src=fs.readFileSync(__dirname+'/../families.js','utf8');const F=JSON.parse(src.slice(src.indexOf('{'),src.indexOf('};')+1));
  assert.equal(F.animals.fox.default_name,'Pipsong');assert(!/"Slyte"/.test(src));assert(P.build({kind:'fox',child:'Mia',name:F.animals.fox.default_name})[0].text.endsWith('— Pipsong'))});
T('j) Whimber rename: owl default Hoosa, duck default Quackaby, no "Whimber" in families.js; both sign as themselves',()=>{global.window=global.window||{};const fs=require('fs');const src=fs.readFileSync(__dirname+'/../families.js','utf8');const F=JSON.parse(src.slice(src.indexOf('{'),src.indexOf('};')+1));
  assert.equal(F.animals.owl.default_name,'Hoosa');assert.equal(F.animals.duck.default_name,'Quackaby');assert.equal(F.whimber.default_name,'Hoosa');assert(!/Whimber/.test(src));
  for(const nm of ['Hoosa','Quackaby'])assert(P.build({kind:'owl',child:'Mia',name:nm})[0].text.endsWith('— '+nm));for(const nm of ['Whimber','whimber','Whimbers'])assert(P.build({kind:'owl',child:'Mia',name:nm}).every(x=>!/Whimber/i.test(x.text)))});
console.log(ok+'/'+n+' postcard tests passed');if(ok!==n)process.exit(1);
