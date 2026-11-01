// Music School Phase 1 step 4: listening missions (PLAN step 4; art px/missions/, data music/missions.json).
// A mission is a little postcard: "listen for a high sound out there". At most one is given per calendar day, never in the
// child's first session and never during care; it is offered at Home after a game. On a LATER session's Home the Echo asks
// once: 4 answer icons + the sleeping pebble ("Not yet", no word). An answer plays its sound and the Echo is delighted;
// "Not yet" keeps the card with no reminder that day. Nothing expires, nothing is counted, nothing is scored.
// State lives per child in the EchoBack Songbook store: progress[kid].ml.missions = {given:{id:ms}, back:{id:{pick,at}}, quiet:{id:day}}
// so it survives a new Echo. Pure core first (node-testable), then the DOM layer.
(function(){'use strict';
const W=typeof window!=='undefined'?window:globalThis;
const M={};
const pad=n=>String(n).padStart(2,'0');
const dayKey=ms=>{const d=new Date(ms);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const norm=st=>{st=st&&typeof st==='object'?st:{};['given','back','quiet'].forEach(k=>{if(!st[k]||typeof st[k]!=='object')st[k]={}});return st};
const byGiven=st=>Object.keys(st.given).sort((a,b)=>st.given[a]-st.given[b]);
M.dayKey=dayKey;M.norm=norm;
M.outstanding=st=>{st=norm(st);return byGiven(st).filter(id=>!st.back[id])};
M.next=(data,st,level)=>{st=norm(st);return (data.missions||[]).find(m=>!st.given[m.id]&&(m.min_ml||1)<=(level||1))||null};
// o: {now, sessions (this one counted), care, offered (this session)}
M.canOffer=(data,st,level,o)=>{st=norm(st);if(!o||(o.sessions|0)<2||o.care||o.offered)return null;
  if(M.outstanding(st).length)return null;const today=dayKey(o.now);if(Object.values(st.given).some(t=>dayKey(t)===today))return null;
  return M.next(data,st,level)};
// o: {now, sessStart, asked (this session)}
M.canAsk=(st,o)=>{st=norm(st);if(!o||o.asked||o.care)return null;const today=dayKey(o.now);
  return M.outstanding(st).find(id=>st.given[id]<o.sessStart&&st.quiet[id]!==today)||null};
M.give=(st,id,now)=>{st=norm(st);if(!st.given[id])st.given[id]=now;return st};
M.answer=(st,id,pick,now)=>{st=norm(st);if(st.given[id]&&!st.back[id]){st.back[id]={pick,at:now};delete st.quiet[id]}return st};
M.notYet=(st,id,now)=>{st=norm(st);if(st.given[id]&&!st.back[id])st.quiet[id]=dayKey(now);return st};
// Listening page: one row per given mission in the order given; at most one "next" row, only when no card is out and one is ungiven
M.rows=(data,st)=>{st=norm(st);const byId={};(data.missions||[]).forEach(m=>byId[m.id]=m);
  const rows=byGiven(st).filter(id=>byId[id]).map(id=>{const m=byId[id],b=st.back[id],a=b&&m.answers.find(x=>x.id===b.pick);return {id,mini:m.mini,found:a?a.icon:null}});
  const next=!M.outstanding(st).length&&(data.missions||[]).some(m=>!st.given[m.id]);return {rows,next}};
M.findMission=(data,id)=>(data.missions||[]).find(m=>m.id===id)||null;
// sound plan for an answer: [{at, kind:'note', n, vol} | {at, kind:'home', animal}]; real notes off the family ladder only
M.plan=(snd,ladder,bpm)=>{if(!snd)return [];if(snd.home)return [{at:0,kind:'home',animal:snd.home}];if(!Array.isArray(snd.notes)||!ladder||!ladder.length)return [];
  const k=60000/(bpm||96)/4;let t=0;return snd.notes.map(([i,ticks,vol])=>{const n=ladder[i<0?ladder.length+i:Math.min(i,ladder.length-1)];const e={at:Math.round(t),kind:'note',n,vol:vol==null?.45:vol};t+=ticks*k;return e})};
if(typeof module!=='undefined'){module.exports=M;return}
// ---------------- DOM layer. host = {sc(), line(key)->{text}, talk(line), react(kind), fam(), state(fn), level(), sessions(), care(), event(name)}
let DATA=null,host=null;const SES={start:Date.now(),asked:false,offered:false};
M.ready=fetch('music/missions.json').then(r=>r.json()).then(j=>DATA=j).catch(()=>null);
M.data=()=>DATA;M.session=SES;
M.init=h=>{host=h};
const img=(src,x,y,cls)=>`<img src="${src}" class="${cls||''}" style="left:${x}px;top:${y}px" alt="" draggable="false">`;
function playAnswer(a){if(!a||!a.snd)return;const f=host.fam(),MF=W.MusicFX;if(!MF)return;
  M.plan(a.snd,MF.stackLadder&&MF.stackLadder(f),DATA.bpm).forEach(e=>setTimeout(()=>{if(e.kind==='home')MF.homeSound(e.animal);else MF.note(f,e.n,{vol:e.vol})},e.at))}
function close(){const o=document.querySelector('.msn');if(o)o.remove()}
M.offer=function(){if(!DATA||!host||document.querySelector('.msn'))return false;const sc=host.sc();if(!sc)return false;
  let m=null;host.state(st=>{m=M.canOffer(DATA,st,host.level(),{now:Date.now(),sessions:host.sessions(),care:host.care(),offered:SES.offered})});if(!m)return false;
  SES.offered=true;const l=host.line(m.give);const d=document.createElement('div');d.className='msn msncard';
  d.innerHTML=img(m.card,34,39,'msnc')+`<div class="msnbox"><div class="msnline">${(l&&l.text)||''}</div><button class="msnok" id="msnok">OK!</button></div>`;sc.appendChild(d);
  d.querySelector('#msnok').onclick=e=>{e.stopPropagation();host.state(st=>M.give(st,m.id,Date.now()));close();if(W.SFX)try{W.SFX('ui_confirm')}catch(_){}};
  return m.id};
M.ask=function(){if(!DATA||!host||SES.asked||document.querySelector('.msn'))return false;const sc=host.sc();if(!sc)return false;
  let id=null;host.state(st=>{id=M.canAsk(st,{now:Date.now(),sessStart:SES.start,asked:SES.asked,care:host.care()})});const m=id&&M.findMission(DATA,id);if(!m)return false;
  SES.asked=true;const l=host.line(m.ask);const d=document.createElement('div');d.className='msn msnask';
  const btn=(i,icon,key,lab)=>`<button class="msnans" data-a="${key}" aria-label="${lab}" style="left:${18+i*30}px;top:0">${img(icon,4,4,'msni')}</button>`;
  d.innerHTML=img(m.mini,58,35,'msnm')+`<div class="msnbox msnaskbox"><div class="msnline msnq">${(l&&l.text)||''}</div><div class="msnrow">`+m.answers.slice(0,4).map((a,i)=>btn(i,a.icon,a.id,a.id)).join('')+btn(4,DATA.not_yet.icon,'not_yet','not yet')+'</div></div>';
  sc.appendChild(d);
  d.querySelectorAll('.msnans').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.a;close();
    if(k==='not_yet'){host.state(st=>M.notYet(st,m.id,Date.now()));return}
    const a=m.answers.find(x=>x.id===k);host.state(st=>M.answer(st,m.id,k,Date.now()));playAnswer(a);host.event('mission_back');host.react('delighted');
    setTimeout(()=>host.talk(host.line('mission_back')),400)});
  return m.id};
M.hasTab=()=>{let on=false;if(host)host.state(st=>{on=Object.keys(norm(st).given).length>0});return on};
M.page=function(parent){if(!DATA||!host)return;let R=null;host.state(st=>{R=M.rows(DATA,st)});const n=R.rows.length+(R.next?1:0);
  const d=document.createElement('div');d.className='msnpage';let h=img('px/missions/listen_page_top.png',8,52)+R.rows.map((r,i)=>{const y=52+34+30*i;
    return img('px/missions/listen_page_row.png',8,y)+img(r.mini,22,y+3)+(r.found?img('px/missions/bubble_found.png',132,y+2)+img(r.found,137,y+7):img('px/missions/bubble_listening.png',132,y+2))}).join('');
  if(R.next)h+=img('px/missions/listen_page_row.png',8,52+34+30*R.rows.length)+img('px/missions/listen_next.png',22,52+34+30*R.rows.length+3);
  h+=img('px/missions/listen_page_bottom.png',8,52+34+30*n);
  d.innerHTML=`<button class="btn small ico msnx" aria-label="Close">✕</button><div class="msntitle">Listening</div>`+h;(parent||document.getElementById('screen')||document.body).appendChild(d);
  d.querySelector('.msnx').onclick=()=>d.remove();return d};
W.Missions=M;
})();
