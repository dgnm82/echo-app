// Echo aliveness v1 (aliveness/README.md, Daniel-approved with Cole's defaults). Look toward taps (C1), hug/pet/sit (E1),
// say-do sync (D1), need cues in body language (G1), food drop + eating (F1) and the twilight twinkle on Whimber's branch.
// Guardrails: nothing about the child is saved; no guilt, no "come back", no waiting poses; sprites stay under modals.
(function(){
const W=window,$=s=>document.querySelector(s),FR=PIXEL.FR,T=83;
const A=W.Alive={sess:{t0:Date.now(),tapText:0,lastTap:0,cues:{}},log:[]};
const px=()=>$('#cr .px-echo'),cr=()=>$('#cr'),sc=()=>$('#sc');
const onHome=()=>!!document.getElementById('feed')&&!!sc()&&!document.querySelector('.full,.book,.panel,.bondup,.fwscene')&&!(document.getElementById('overlay')||{}).innerHTML;
const idle=()=>{const b=$('#b');return onHome()&&(!b||b.style.display==='none')&&!A.busy&&(!W.__echo||!W.__echo.living||W.__echo.living.st==='present')};
const asleep=()=>{const S=W.__echo&&W.__echo.state;return !!(S&&S.napUntil>Date.now())};
A.idle=idle;
// ---- small pixel effects inside the scene (whole pixels, 83 ms ticks). They live in #sc, so modals always cover them.
function scenePos(){const c=cr(),s=sc();if(!c||!s)return null;const R=s.getBoundingClientRect(),z=R.width/180,r=c.getBoundingClientRect();
  return {x:Math.round((r.left-R.left)/z+r.width/z/2),top:Math.round((r.top-R.top)/z),feet:Math.round((r.bottom-R.top)/z),z}}
function fx(cls,img,x,y,w,h){const s=sc();if(!s)return null;const e=document.createElement('div');e.className='alfx lvfx '+cls;
  Object.assign(e.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px',backgroundImage:`url(px/${img}.png)`});s.appendChild(e);return e}
function anim(e,n,f,done){let i=0;const t=setInterval(()=>{if(!e.isConnected){clearInterval(t);return}f(i++);if(i>=n){clearInterval(t);done&&done()}},T);return t}
A.hearts=function(n,big){const p=scenePos();if(!p)return;for(let k=0;k<n;k++)setTimeout(()=>{const x0=p.x-10+k*7+(n===1?7:0),y0=p.top+10;
  const h=fx('alheart','alive/heart',x0,y0,7,7);if(!h)return;anim(h,big?14:10,i=>{h.style.top=(y0-i*2)+'px';h.style.left=(x0+(i%4<2?0:1))+'px';if(i>6)h.style.opacity=i%2?'.6':'1'},()=>h.remove())},k*160)};
A.sparkle=function(){const p=scenePos();if(!p)return;const e=fx('alspark','i_sparkle',p.x-8,p.top-4,16,16);if(e)anim(e,6,i=>{e.style.opacity=i%2?'.5':'1'},()=>e.remove())};
// ---- C1: look toward taps (ripple, mirror toward the tap, ear perk, curious tilt ~1.2 s; never leaves the stage spot)
document.addEventListener('pointerdown',ev=>{const s=sc();if(!s||!s.contains(ev.target)||ev.target.closest('#cr,button,.bubble,.thought,.home,.fwstar,#fwstar,.lvfx'))return;
  if(!onHome()||asleep()||(W.__echo&&W.__echo.living&&W.__echo.living.st!=='present'))return;   // a Found moment handles its own taps
  const now=Date.now();if(now-A.sess.lastTap<1500)return;A.sess.lastTap=now;
  const R=s.getBoundingClientRect(),z=R.width/180,x=Math.round((ev.clientX-R.left)/z),y=Math.round((ev.clientY-R.top)/z);
  const r=fx('alripple','alive/ripple0',x-4,y-4,8,8);if(r)anim(r,4,i=>{r.style.backgroundImage=`url(px/alive/ripple${i}.png)`},()=>r.remove());
  A.look(x)},true);
A.look=function(x){const e=px(),p=scenePos();if(!e||!p)return;const was=e.classList.contains('lvflip'),left=x<p.x;
  if(was!==left){e.classList.toggle('lvflip',left);PIXEL.blink(e)}
  PIXEL.queue(e,[[FR.ear1,2],[FR.ear2,2],[FR.cur1,3],[FR.cur2,3],[FR.cur1,3],[FR.cur2,3]],true);A.log.push('look');
  setTimeout(()=>{const e2=px();if(e2&&!A.busy)e2.classList.toggle('lvflip',was)},1300);
  const S=W.__echo.state;if(!A.sess.tapText&&idle()){A.sess.tapText=1;const l=Dialogue.bark('look_tap');if(l)W.__echo.talk(l,2200)}   // text at most once a session,
  else if(S&&S.voice!==false&&W.Chirp)Chirp.play('?',S.kind,'curious')};                                                                    // then chirp only
// ---- E1: pet hearts + blush, press-and-hold hug, sit together scoot
A.petFx=function(){const e=px();if(e){PIXEL.blink(e,true);setTimeout(()=>PIXEL.queue(e,[[FR.shy1,3],[FR.shy2,3]],true),400)}A.hearts(2)};
let holdT=null,hugT=null;A.hugging=false;
document.addEventListener('pointerdown',ev=>{if(!ev.target.closest||!ev.target.closest('#cr')||!onHome()||asleep())return;clearTimeout(holdT);
  holdT=setTimeout(()=>{A.hugging=true;A.busy=true;const c=cr();if(c)c.classList.add('alhug');A.log.push('hug');let k=0;
    const step=()=>{const e=px();if(e)PIXEL.queue(e,[[FR.pet1,3],[FR.pet2,3]]);if(k++%2===0)A.hearts(1,true)};step();hugT=setInterval(step,500);
    const S=W.__echo.state;if(S&&S.voice!==false&&W.Chirp)Chirp.play('♥',S.kind,'love')},500)},true);
const endHold=ev=>{clearTimeout(holdT);if(!A.hugging)return;clearInterval(hugT);A.hugging=false;A.busy=false;const c=cr();if(c)c.classList.remove('alhug');
  A.suppressClick=Date.now();W.__echo.hug&&W.__echo.hug()};
['pointerup','pointercancel','pointerleave'].forEach(t=>document.addEventListener(t,endHold,true));
document.addEventListener('click',ev=>{if(A.suppressClick&&Date.now()-A.suppressClick<400&&ev.target.closest&&ev.target.closest('#cr')){ev.stopPropagation();ev.preventDefault()}},true);
A.sit=function(on){const c=cr(),e=px();if(!c)return;c.classList.toggle('alsit',!!on);if(on&&e){PIXEL.queue(e,[[FR.shy1,4],[FR.shy2,4],[FR.tail1,3],[FR.tail2,3]]);W.setExpr&&W.setExpr('love')}};
// ---- D1: say-do sync. Ambient/tangent lines act out their stage direction with existing frames.
const GEST=[[/yawn/i,'yawn'],[/sneez/i,'sneeze'],[/pounc|chase|hop|jump|bounc|leap|zoom|wiggl|snap/i,'pounce'],[/spin|twirl|turns? around|circle/i,'spin'],
  [/preen|fluff|shake|groom|tidy|ruffl|smooth/i,'preen'],[/slow blink|blinks? slow/i,'slowblink'],[/sniff|smell|peer|peek|listen|tilt|ears? (swivel|perk)|looks?/i,'curious'],[/giggl|laugh|hee/i,'giggle'],[/stretch/i,'stretch']];
A.gestureOf=function(l){if(l.gesture)return l.gesture;const m=/^\(([^)]*)\)/.exec(l.text||'')||/\(([^)]*)\)/.exec(l.text||'');if(!m)return null;for(const [re,g] of GEST)if(re.test(m[1]))return g;return null};
A.act=function(g){const e=px(),c=cr();if(!e||!g)return;A.log.push('act:'+g);
  const Q={yawn:[[FR.sl1,4],[FR.sl2,6],[FR.sl1,3]],sneeze:[[FR.sur,3],[FR.gig,3],[FR.happy,3]],preen:[[FR.pet1,3],[FR.pet2,3],[FR.pet1,3],[FR.pet2,3]],
    slowblink:[[FR.blink,5]],curious:[[FR.cur1,3],[FR.cur2,4],[FR.cur1,3]],giggle:[[FR.gig,3],[FR.happy,3],[FR.gig,3]],stretch:[[FR.sl2,4],[FR.happy,4]],pounce:[[FR.cur1,2],[FR.cur2,2]],spin:[],
    tap:[[FR.cur1,2],[FR.cur2,2],[FR.cur1,2],[FR.cur2,2]],wave:[[FR.tail1,3],[FR.tail2,3],[FR.tail1,3],[FR.tail2,3]],settle:[[FR.sl1,10]],hum:[[FR.blink,3],[FR.happy,6]],lookup:[[FR.cur2,10]],wait:[]};   // P5: 6 new gestures from existing frames (static frames, so reduced motion holds)
  PIXEL.queue(e,Q[g]||[],true);if(g==='sneeze')setTimeout(A.sparkle,250);
  if(g==='pounce')setTimeout(()=>W.react&&W.react('excited'),330);
  if(g==='tap'&&c&&!(W.__echo&&W.__echo.state&&W.__echo.state.lowfx)){c.classList.add('altap');setTimeout(()=>c.classList.remove('altap'),700)}
  if(g==='hum'){const s=sc(),p=scenePos&&scenePos();if(s&&p){const n=document.createElement('i');n.className='lvfx alnote';n.textContent='♪';n.style.cssText=`left:${p.x+14}px;top:${p.feet-44}px`;s.appendChild(n);setTimeout(()=>n.remove(),1200)}}
  if(g==='spin'){let k=0;const t=setInterval(()=>{const e2=px();if(e2)e2.classList.toggle('lvflip');if(++k>=2){clearInterval(t);W.react&&W.react('happy')}},250)}};
A.onTalk=function(o){if(!o)return;if(o.expr==='love'){const e=px();if(e)PIXEL.blink(e,true)}const g=A.gestureOf(o);if(g&&!o.react)setTimeout(()=>A.act(g),120)};
// ---- G1: need cues in body language (top need only, one every 8-15 s, none in the first 20 s; never droopy or "waiting")
A.cueN={};A.cueMax=10;
function topNeed(){const S=W.__echo&&W.__echo.state;if(!S||!S.needs)return null;const NS=W.NeedSelect;
  const p=NS?NS.pressures(S.needs,W.FAMILIES?FAMILIES.of(S.kind).dialogue:(S.kind==='fox'?'slyte':'whimber'),W.__echo.band?W.__echo.band():'day'):{};const t=NS?NS.top(p):null;
  if(t)return t;return NS&&NS.content(S.needs)?'content':null}
A.cue=function(st){const e=px(),c=cr();if(!e||!c)return;A.log.push('cue:'+st);A.cueN[st]=(A.cueN[st]||0)+1;
  if(st==='hungry'){PIXEL.queue(e,[[FR.cur1,3],[FR.cur2,3],[FR.cur1,3],[FR.think,4]],true);c.classList.add('alshiver');setTimeout(()=>c.classList.remove('alshiver'),700)}
  else if(st==='cuddly'){c.classList.add('alscoot');PIXEL.queue(e,[[FR.shy1,4],[FR.shy2,4],[FR.shy1,4]],true);setTimeout(()=>A.hearts(1),300);setTimeout(()=>c.classList.remove('alscoot'),2600)}
  else if(st==='playful'){c.classList.add('alwiggle');PIXEL.queue(e,[[FR.cur1,2],[FR.cur2,2],[FR.cur1,2],[FR.cur2,2]],true);setTimeout(()=>{c.classList.remove('alwiggle');W.react&&W.react('excited')},700)}
  else if(st==='sleepy'){PIXEL.queue(e,[[FR.blink,6],[FR.sl1,4],[FR.sl2,6],[FR.sl1,3]],true)}
  else if(st==='content'){W.react&&W.react('happy')}};
let nextCue=Date.now()+8000;const gap=()=>(8+Math.random()*7)*1000*(W.CONFIG&&CONFIG.cueSpeed||1);
setInterval(()=>{const e=px();const S=W.__echo&&W.__echo.state;if(e&&S&&S.needs)e.dataset.sleepy=S.needs.rest<35&&!asleep()?'1':'';   // heavy blinks + slower idle
  if(Date.now()<Math.min(nextCue,Date.now()+gap()))return;nextCue=Date.now()+gap();
  if(Date.now()-A.sess.t0<20000||!idle()||asleep())return;const st=topNeed();if(!st||(A.cueN[st]||0)>=A.cueMax)return;A.cue(st)},500);
// ---- F1: food arrives (drop / bush_pop / float / plate), the Echo watches, eats bite by bite, reacts by tier
A.food=function(food,tier,done){const p=scenePos(),s=sc(),S=W.__echo.state;if(!p||!s){done&&done();return}A.busy=true;
  const fox=W.FAMILIES?FAMILIES.of(S.kind).games.style!=='sky':S.kind==='fox',side=fox?1:-1,fx0=p.x+side*16-8,fy=p.feet-16,how=food.delivery,e=px();
  const it=fx('alfood','',fx0,fy,16,16);it.style.backgroundImage=`url(px/${food.icon}.png)`;let plate=null,leaf=null;
  const over=()=>{const c=cr(),z=(parseInt(c&&c.style.zIndex)||2)+1;it.style.zIndex=z+1;if(plate)plate.style.zIndex=z;if(leaf)leaf.style.zIndex=z+1};setTimeout(over,0);   // food draws in front of the Echo (lvPlace depth-sorts #cr to 10+y/10); #sc isolates it, so modals still cover it
  if(e)W.setExpr&&W.setExpr('curious');
  const land=()=>{over();if(e){const want=fox?false:true;e.classList.toggle('lvflip',fox?false:true)}eat()};
  if(how==='plate'){plate=fx('alplate','alive/plate',fx0+side*60,fy+12,16,5);it.style.left=(fx0+side*60)+'px';
    anim(it,10,i=>{const x=fx0+side*(54-i*6);it.style.left=x+'px';plate.style.left=x+'px'},land)}
  else if(how==='float'){leaf=fx('alleaf','alive/leaf_parachute',fx0,fy-60,16,16);let y=fy-60;it.style.top=(y+10)+'px';
    anim(it,15,i=>{y+=4;const sw=(Math.floor(i/4)%2?2:-2);it.style.top=(y+10>fy?fy:y+10)+'px';it.style.left=(fx0+sw)+'px';leaf.style.top=Math.min(y,fy-10)+'px';leaf.style.left=(fx0+sw)+'px'},()=>{it.style.top=fy+'px';it.style.left=fx0+'px';leaf.remove();land()})}
  else if(how==='bush_pop'){const sx=fx0+side*40;it.style.left=sx+'px';anim(it,8,i=>{it.style.left=(sx-side*i*5)+'px';it.style.top=(fy-(i<3?[3,5,3][i]:0))+'px'},()=>{it.style.left=fx0+'px';land()})}
  else{A.sparkleAt(fx0,fy-70);let y=fy-70;it.style.top=y+'px';anim(it,10,i=>{y=Math.min(fy,y+8);it.style.top=y+'px'},()=>{it.style.height='15px';it.style.top=(fy+1)+'px';setTimeout(()=>{it.style.height='16px';it.style.top=fy+'px';land()},2*T)})}
  function eat(){const st=food.eat_style||'nibble',e2=px();
    if(tier==='not_for_me'){if(e2)PIXEL.queue(e2,[[FR.cur1,4],[FR.cur2,4],[FR.eat1,3],[FR.idle[0],2],[FR.shy1,4],[FR.shy2,4],[FR.gig,4]]);   // sniff, polite nibble, shy scrunch
      setTimeout(()=>{anim(it,6,i=>{it.style.left=(fx0+side*(i+1)*2)+'px'},()=>{A.sparkleAt(fx0+side*12,fy);setTimeout(()=>{it.remove();plate&&plate.remove();fin()},300)})},2000);return}   // nudges it aside
    const bites=st==='nibble'?4:st==='crunch'?3:st==='lick'?3:st==='slurp'?3:1,tk=st==='nibble'?3:2;let b=0;
    const one=()=>{const e3=px();if(e3)PIXEL.queue(e3,st==='sip'?[[FR.eat1,4],[FR.idle[0],2]]:st==='lick'?[[FR.eat2,2],[FR.eat2,2],[FR.eat2,2]]:[[FR.eat1,tk],[FR.eat2,tk]]);
      b++;const cut=Math.round(16*b/(bites+1));it.style.clipPath=`inset(0 ${fox?cut:0}px 0 ${fox?0:cut}px)`;   // bite masks
      if(st==='crunch'||st==='nibble'){const c=fx('alcrumb','alive/crumb',fx0+8+(b%2?3:-3),fy+12,2,2);if(c)anim(c,4,i=>{c.style.top=(fy+12+i)+'px'},()=>c.remove())}
      if(b<bites)setTimeout(one,tk*2*T+120);else setTimeout(()=>{it.remove();plate&&plate.remove();fin()},250)};one()}
  function fin(){A.busy=false;const T2=(W.FOODS&&FOODS.tiers[tier])||{};const n=T2.hearts||0;if(n)A.hearts(n,tier==='favorite');
    if(tier==='favorite'){W.react&&W.react('excited');setTimeout(A.sparkle,200)}else if(tier==='love')W.react&&W.react('happy');else if(tier==='like')W.react&&W.react('happy');
    done&&done()}};
A.sparkleAt=function(x,y){const e=fx('alspark','i_sparkle',x,y,16,16);if(e)anim(e,4,i=>{e.style.opacity=i%2?'.4':'1'},()=>e.remove())};
// ---- Whimber's twilight twinkle on the v2 branch: a 2-frame overlay, 500 ms each (twinkle_timing.json)
A.twinkle=function(){const s=sc();if(!s||!s.classList.contains('sc-branch')||!/branch_twi/.test(s.getAttribute('style')||''))return;if(s.querySelector('.altwinkle'))return;
  const o=document.createElement('div');o.className='altwinkle';s.appendChild(o)};
})();
