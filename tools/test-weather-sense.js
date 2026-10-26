#!/usr/bin/env node
// Tests for tools/lint-weather-sense.js (hard error, no pending list): the corpus is clean; the 13 pre-rewording offenders
// (frozen here) would all fail; any NEW offender in a weather pool / cond.weather line / weather conversation fails;
// questions about the child's own world and the Echo's own senses stay allowed.
const L=require('./lint-weather-sense.js');let n=0,bad=0;const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL',m)}};
const files=L.load(),clone=()=>files.map(([f,d])=>[f,JSON.parse(JSON.stringify(d))]),off=t=>L.offends({text:t,short:''});
let r=L.lint(files);ok(r.errors.length===0,'corpus: no offenders '+r.errors.join('; '));ok(r.lines>=500,`scans the weather corpus (${r.lines} lines)`);
const OLD=["Every snowflake falls with a tiny, quiet hush. Listen!","Look up! Twinkly stars!","That cloud looks like a bunny with floppy ears! What do you see?",
  "Let's build a blanket fort and listen to the rain song.","Let's play cloud shapes! What do you see up there?","The rain sounds like tiny drums. Can you hear?",
  "Let's listen together. Rain patter, wind whoosh, thunder hum.","Let's find shapes in the clouds. What do you see?","…snow is falling very quietly. Listen.",
  "Each snowflake falls with a tiny hush… listen.","Let's tuck in close… and listen to the rain song.","Let's look for cloud shapes… what do you see?",
  "The rain is playing a soft song… shall we listen together?"];
for(const t of OLD)ok(off(t),'pre-rewording offender still caught: '+t);
for(const t of ['Can you hear the rain?','Feel the breeze?','Smell the rain!','Do you see the fog?','Peek out the window!','Look outside at the snow!','Hear that?'])ok(off(t),'variant caught: '+t);
for(const t of ['Is it raining by you?',"What's your sky like?",'Can you see snow where you are?','Is it sunny outside your window?','Do you see clouds by you today?',
  'My ears listen close in the fog.','I smell the flowers.','I can hear the meadow.','In my meadow the snow is quiet.','Rain is my favourite drum.'])ok(!off(t),'allowed: '+t);
for(const [what,mut] of [['weather_ pool',d=>d.barks.weather_rain.push({text:'Can you hear the rain on the leaves?'})],['cond.weather line',d=>(d.barks.ambient=d.barks.ambient||[]).push({text:'Look up at the snow!',cond:{weather:'snow'}})],
  ['weather conversation',d=>d.conversations.find(c=>c.cond&&c.cond.weather&&c.cond.weather!=='any').nodes.a.say='Smell the rain?']]){
  const f=clone();mut(f.find(x=>x[0]==='twitchel')[1]);ok(L.lint(f).errors.length===1,'a new offender in a '+what+' fails')}
{const f=clone();(f[0][1].barks.ambient=f[0][1].barks.ambient||[]).push({text:'Can you hear the birds?'});ok(L.lint(f).errors.length===0,'untagged (non-weather) lines are out of scope')}
console.log(`weather-sense lint tests: ${n} checks, ${bad} failed`);process.exit(bad?1:0);
