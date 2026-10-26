#!/usr/bin/env node
// Lint (PM rule, Oct 25; hard error since Cole's rewording landed 03:40 PDT): a weather-tagged Echo line (a `weather_*` bark pool,
// or a line / conversation with cond.weather) must not invite the child to SENSE the Echo's own weather ("can you hear", "look up",
// "what do you see", "feel the", "smell the", "listen!", "let's listen", ...). The Echo's weather is the Echo's world, not the child's sky.
// ALLOWED: questions about the child's own world ("Is it raining by you?", "What's your sky like?", "Can you see snow where you are?"),
// and the Echo's own senses ("My ears listen close", "I smell the flowers"). No pending list: any offender fails.
// Usage: node tools/lint-weather-sense.js      (exit 1 on any offender)
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');
const SENSE=[/\b(can|do|did|could|would|will)\s+you\s+(hear|see|spot|smell|feel|sniff|notice|watch)\b/i,/\bhear\s+(that|it|them)\s*[?!]/i,
  /\blook(ing)?\s+(up|out|outside)\b/i,/\bpeek\s+(out|outside)\s+the\b/i,/\bsee\s+(up\s+there|out\s+there)\b/i,/\bwhat\s+(do|can|did)\s+you\s+(see|hear|smell|feel)\b/i,
  /(?<!\bI\s+(can\s+)?)\b(feel|smell|sniff)\s+(the|that|it)\b/i,                   // "feel the" / "smell the" (but "I smell the flowers" is the Echo's own sense)
  /(^|[.!?…]\s*)listen\b/i,/\b(let'?s|let us|shall we|can we|we can|will you|want to)\b[^.!?]*\blisten\b/i,/(?<!\b(my|I)\b[^.!?…]*)\blisten\s+(together|with me|close|closely)\b/i,
  /\b(out|through)\s+the\s+window\b/i];
// a question about the CHILD's own place is fine (it asks, it does not invite them to sense the Echo's sky)
const CHILD_PLACE=/\b(where you are|by you|near you|around you|at your|outside your|your\s+(sky|window|house|home|yard|street|town|place|side))\b/i;
const wx=c=>{const w=c&&c.cond&&c.cond.weather;return !!w&&w!=='any'};
function collect(files){const out=[];for(const [fam,d] of files){
  for(const [pool,L] of Object.entries(d.barks||{}))(L||[]).forEach((l,i)=>{if(/^weather_/.test(pool)||wx(l))out.push({id:`${fam}:barks.${pool}[${i}]`,text:l.text||'',short:l.short||''})});
  for(const c of d.conversations||[])if(wx(c))for(const [nid,n] of Object.entries(c.nodes||{}))if(n.say)out.push({id:`${fam}:conv.${c.id}.${nid}`,text:n.say,short:''})}
  return out}
const sentences=t=>String(t||'').match(/[^.!?…]+[.!?…]*/g)||[];
const sentOffends=s=>SENSE.some(r=>r.test(s))&&!(/\?\s*$/.test(s.trim())&&CHILD_PLACE.test(s));
const offends=l=>[l.text,l.short].some(t=>sentences(t).some(sentOffends)||SENSE.slice(-4,-1).some(r=>r.test(t))&&!CHILD_PLACE.test(t));   // cross-sentence 'let's ... listen' forms
function lint(files){const lines=collect(files),off=lines.filter(offends);return {lines:lines.length,errors:off.map(l=>`weather-sense offender ${l.id}: "${l.text}"`)}}
const load=()=>['slyte','twitchel','whimber','shared'].map(f=>[f,JSON.parse(fs.readFileSync(path.join(R,'dialogue',f+'.json'),'utf8'))]);
module.exports={lint,collect,offends,load};
if(require.main===module){const r=lint(load());r.errors.forEach(e=>console.log('ERROR',e));
  console.log(`weather-sense lint: ${r.lines} weather lines, ${r.errors.length} offenders (hard error, no pending list)`);process.exit(r.errors.length?1:0)}
