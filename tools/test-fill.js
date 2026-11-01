#!/usr/bin/env node
// Nov 1 dialogue fix (BRIEF_FIX_NOV1 Jay #2): runtime line filler grammar. Run: node tools/test-fill.js
//  a/an agreement before filled values, capitalized line/sentence-initial fills, {pet_phrase} spacing + punctuation.
const assert=require('assert');const D=require('../dialogue.js');
let ctx={vars:{},fill:{}};D.ctx=()=>ctx;
const lib=(pets,words)=>D.use('slyte',{barks:{},conversations:[]},{barks:{},conversations:[],persona:{petPhrases:pets,words:words||['glimmery']}});
const persona=(pet,word)=>{lib([pet],[word||'glimmery']);D.setPersona(1);D.mem={petSince:99}};
const tests=[];const T=(n,f)=>tests.push([n,f]);
T('a/an: "a {var:origin_animal}" agrees with the animal',()=>{persona('Yip!');
  ctx={vars:{origin_animal:'owl'},fill:{}};assert.equal(D.fill('You saw a {var:origin_animal}?'),'You saw an owl?');
  ctx.vars.origin_animal='fox';assert.equal(D.fill('You saw an {var:origin_animal}?'),'You saw a fox?');
  ctx.vars.origin_animal='eagle';assert.equal(D.fill('A {var:origin_animal} sang.'),'An eagle sang.');});
T('a/an: sounds and fills ("a awoo-hum" -> "an awoo-hum"), u/one/hour exceptions',()=>{persona('Yip!');
  assert.equal(D.fill('I did a {s} hop!',{s:'awoo-hum'}),'I did an awoo-hum hop!');
  assert.equal(D.fill('I found a {treasure}.',{treasure:'acorn'}),'I found an acorn.');
  assert.equal(D.fill('I found an {treasure}.',{treasure:'shiny pebble'}),'I found a shiny pebble.');
  assert.equal(D.fill('a {x} and a {y}',{x:'unicorn',y:'hour-long nap'}),'a unicorn and an hour-long nap');
  assert.equal(D.fill('It was a {x} day.',{x:'one-note'}),'It was a one-note day.');
  assert.equal(D.fill('That was a {word:soft} sky.'),'That was a glimmery sky.');persona('Yip!','oozy');
  assert.equal(D.fill('That was a {word:soft} sky.'),'That was an oozy sky.');
  assert.equal(D.fill('Banana {x}',{x:'apple'}),'Banana apple','"a" inside a word is not an article');});
T('capitalize a line-initial / sentence-initial fill ({fav}, {memory}, any value)',()=>{persona('Yip!');ctx={vars:{},fill:{fav:'berries',memory:'the day we met'}};
  assert.equal(D.fill('{fav}! My favorite-favorite!'),'Berries! My favorite-favorite!');
  assert.equal(D.fill('{fav}… my favorite.'),'Berries… my favorite.');
  assert.equal(D.fill('{memory}. I still smile about it.'),'The day we met. I still smile about it.');
  assert.equal(D.fill('Yum! {fav} again?'),'Yum! Berries again?');
  assert.equal(D.fill('…{fav}?'),'…Berries?');
  assert.equal(D.fill('I love {fav}.'),'I love berries.','mid-sentence stays lowercase');
  assert.equal(D.fill('Look… {fav}.'),'Look… berries.','a soft … pause is not a sentence end');
  assert.equal(D.fill('{var:origin_animal} friend',{vars:{origin_animal:'owl'}}),'Owl friend');});
T('{pet_phrase}: spacing and punctuation, with and without the phrase',()=>{
  persona('How lovely.');assert.equal(D.fill('{pet_phrase}…That\'s a thank you.'),'How lovely. That\'s a thank you.');
  persona('How lovely.');assert.equal(D.fill('{pet_phrase}  Hello there.'),'How lovely. Hello there.');
  persona('Yip-yip!');assert.equal(D.fill('Hello there. {pet_phrase}'),'Hello there. Yip-yip!');
  persona('Yip-yip!');assert.equal(D.fill('Hi{pet_phrase}there'),'Hi Yip-yip! there');
  persona('Well, well…');assert.equal(D.fill('{pet_phrase}, you came back.'),'Well, well… you came back.');
  // budget spent: the slot disappears cleanly
  persona('Yip!');D.mem.petSince=0;assert.equal(D.fill('{pet_phrase} Hello there.'),'Hello there.');
  D.mem.petSince=0;assert.equal(D.fill('Hello there {pet_phrase}!'),'Hello there!');
  D.mem.petSince=0;assert.equal(D.fill('Hello. {pet_phrase} Bye.'),'Hello. Bye.');
  D.mem.petSince=0;assert.equal(D.fill('{pet_phrase}…That\'s a thank you.'),'…That\'s a thank you.');
  D.mem.petSince=0;assert.equal(D.fill('Okay, {pet_phrase}, let\'s go.'),'Okay, let\'s go.');
  // budget: the phrase plays then waits petEvery lines
  persona('Yip!');assert.equal(D.fill('{pet_phrase} Hi.'),'Yip! Hi.');assert.equal(D.fill('{pet_phrase} Hi.'),'Hi.');});
T('no persona yet: no raw {pet_phrase} / {word:x} left on screen',()=>{const sv=D.persona;D.persona=null;
  assert.equal(D.fill('{pet_phrase} A {word:soft} sky.'),'A soft sky.');D.persona=sv;});
T('the corpus never shows a raw placeholder for any family persona (every pet phrase, budget on and off)',()=>{
  const fs=require('fs'),path=require('path');const J=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'..','dialogue',f+'.json'),'utf8'));const sh=J('shared');let n=0;
  for(const fam of ['slyte','whimber','twitchel']){const sp=J(fam);D.use(fam,sh,sp);const pets=sp.persona.petPhrases;
    for(let s=0;s<pets.length;s++){D.setPersona(s);for(const k in sp.barks)for(const l of sp.barks[k]){if(!l||!l.text||!l.text.includes('{pet_phrase}'))continue;
      for(const pb of [99,0]){D.mem={petSince:pb};ctx={vars:{origin_animal:'fox'},fill:{name:'Pip',child:'Mia',fav:'berries'}};const o=D.fill(l.text);n++;
        assert(!/\{pet_phrase\}|\s[.,!?;:](?!\.)|\s{2}|^\s|\s$/.test(o),`${fam}:${k}: "${o}"`)}}}}
  assert(n>50,'checked '+n);});
let pass=0;for(const [n,f] of tests){try{f();pass++;console.log('PASS',n)}catch(e){console.log('FAIL',n,'\n  ',e.message)}}
console.log(`\n${pass}/${tests.length} fill tests passed`);if(pass!==tests.length)process.exit(1);
