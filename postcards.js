// Postcards from the wild (Echo_Postcards.docx v0.5): six postcards per Echo on days 1, 3, 7, 14, 30 and 60.
// Slots come from the save; every slot has the doc's fallback. Facts about play only, never the child's feelings.
(function(root){
const DAYS=[1,3,7,14,30,60];
const T={
 slyte:[
  {day:1,scene:'meadow',pose:'tall',text:'Dear {child_name}, PSST. I made it! The meadow is SO big. I counted the flowers, then lost count, then started over. Twice. The {parting_gift} came too. I hid it somewhere super safe, and I check on it every morning. Still there! — Slyte'},
  {day:3,scene:'meadow',pose:'leap',text:'Dear {child_name}, I jumped so high today I saw over the whole meadow. There’s MORE meadow on the other side! Who put it there? I told a beetle about {shared_memory}. It didn’t laugh. I don’t think beetles get jokes. — S.',
   alt:'Dear {child_name}, I jumped so high today I saw over the whole meadow. There’s MORE meadow on the other side! Who put it there? I told a beetle all about you. It didn’t say much. I don’t think beetles are big talkers. — S.'},
  {day:7,scene:'log',pose:'tail',text:'Psst, {child_name}. I have a new fort. It’s a log! A squirrel says it was there first. We’re figuring it out. Maybe we’ll share. I hid in it all morning and nobody found me. …Nobody was looking. Still counts. — Slyte'},
  {day:14,scene:'bramble',pose:'berry',text:'Dear {child_name}, blackberries grow here. On BUSHES. Just sitting there! I tried one. Then one more. My nose is purple now. Is it supposed to do that? Also, I still think about {shared_memory}. I giggle every time. — S.',
   alt:'Dear {child_name}, blackberries grow here. On BUSHES. Just sitting there! I tried one. Then one more. My nose is purple now. Is it supposed to do that? Also, I still think about you finding me every single time. I giggle every time. — S.'},
  {day:30,scene:'autumn',pose:'pounce',text:'{child_name}! The leaves fell down. ALL of them. On purpose, I think. I made the biggest pile ever and jumped in, and for one second it felt just like {shared_memory}. A really good second. — Slyte',
   alt:'{child_name}! The leaves fell down. ALL of them. On purpose, I think. I made the biggest pile ever and jumped in, and for one second it felt like playing with you. A really good second. — Slyte'},
  {day:60,scene:'sunset',pose:'curl',text:'Psst. Guess what, {child_name}? I still have a shiny thing that reminds me of you. I check on it every day. It’s doing fine. I hope you are too. I think you are. — your friend, Slyte',
   trinket:'Psst. Guess what, {child_name}? I still have the {parting_gift}. I check on it every day. It’s doing fine. I hope you are too. I think you are. — your friend, Slyte'}],
 whimber:[
  {day:1,scene:'night',pose:'sit',text:'Dear {child_name}, I found my tree hollow. It’s very quiet. …I like quiet. The {parting_gift} is right here beside me. I think it’s keeping me company. — Whimber'},
  {day:3,scene:'field',pose:'glide',text:'Dear {child_name}, I flew across the whole field last night. Not one sound. The crickets kept right on singing, like I wasn’t even there. …I wonder if they thought I was a cloud. — W.'},
  {day:7,scene:'stars',pose:'gaze',text:'{child_name}, last night I found {constellation_name}. It was right where we left it. I said hello for both of us. …I think it twinkled back. Maybe. Stars are hard to read.'},
  {day:14,scene:'library',pose:'sit',text:'Dear {child_name}, there’s an old library near my tree. I sit in the rafters. I tried to read a book by myself. Whimbers are not good at turning pages. So I looked at the pictures and remembered {shared_memory}. — Whimber',
   alt:'Dear {child_name}, there’s an old library near my tree. I sit in the rafters. I tried to read a book by myself. Whimbers are not good at turning pages. So I looked at the pictures and remembered you reading to me. That was the best part. — Whimber'},
  {day:30,scene:'autumnnight',pose:'sit',text:'Dear {child_name}, the leaves are falling. I caught one without a sound. Then another. Then six. I think the tree was playing with me. …I thought of you. In a happy way. — W.'},
  {day:60,scene:'frost',pose:'small',text:'{child_name}… the nights are long now. Good for stargazing. I’ve been thinking about {shared_memory}. The moon is still up there, being followed by everybody. I hooted at it. Politely. — Whimber',
   alt:'{child_name}… the nights are long now. Good for stargazing. The moon is still up there, keeping an eye on everybody. I hooted at it. Politely. — Whimber'}]};
const BAD=/you had a really good day|felt not great|bright thing for gray days|how you feel|you felt|you said you/i;
// turn a saved memory into a short phrase that fits after "I still think about…" / "it felt just like…"
function phrase(m){let t=String(m||'').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]\uFE0F?/gu,'').replace(/\s+/g,' ').trim().replace(/[.!]+$/,'');if(!t)return null;
  t=t.replace(/:\s*/,', ');const lc=t.charAt(0).toLowerCase()+t.slice(1);
  if(/^(the |when |how |what )/i.test(t))return lc;
  if(/^we named a constellation, /i.test(t))return 'the night you named '+t.replace(/^we named a constellation, /i,'');
  if(/^(we|you|i) /i.test(t))return 'the time '+lc;
  return 'the time '+lc}
function memories(list){const seen=new Set(),out=[];const L=(list||[]).filter(m=>m&&!BAD.test(m));
  const met=L.filter(m=>/day we met/i.test(m)),rest=L.filter(m=>!/day we met/i.test(m)).reverse();
  for(const m of [...rest,...met]){const p=phrase(m);if(p&&!seen.has(p)){seen.add(p);out.push(p)}}return out}
function build(o){const sp=o.kind==='owl'||o.kind==='whimber'?'whimber':'slyte',mem=memories(o.memories);let mi=0;
  const gift=o.gift||(sp==='slyte'?'shiny trinket':'soft feather');
  return T[sp].map(c=>{let tpl=c.text;
    if(tpl.includes('{shared_memory}')){if(mi<mem.length)tpl=tpl.replace('{shared_memory}',mem[mi++]);else tpl=c.alt||tpl.replace('{shared_memory}','you')}
    if(c.trinket&&/trinket|shiny/i.test(o.gift||''))tpl=c.trinket;
    const text=tpl.replace(/\{child_name\}/g,o.child||'friend').replace(/\{parting_gift\}/g,gift).replace(/\{constellation_name\}/g,o.constellation||'the shy little star we found');
    return {day:c.day,type:'postcard',scene:c.scene,pose:c.pose,text,delivered:false}})}
const API={DAYS,T,build,phrase,memories,VERSION:2};
if(typeof module!=='undefined')module.exports=API;root.Postcards=API;
})(typeof window!=='undefined'?window:globalThis);
