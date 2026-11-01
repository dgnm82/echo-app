// Press (Music School Phase 1, step 1): one small input helper for taps and pats on the warm-up pads (and any later music pads).
// Pointer Events when the browser has them (all current phones; iOS 13+), otherwise touch events (identifier + elementFromPoint, so a
// finger can slide onto the next pad) with mouse as the last fallback. Each press reports a timestamp on the same clock as
// performance.now(), so tap timing can be compared with the beats the app scheduled. No network, no globals beyond window.Press.
// Press.on(root, {down(el, info), up(el, info)}, {sel:'[data-press]'}) -> {off()}. info = {id, t, x, y}.
(function(W){'use strict';
const now=()=>(W.performance&&performance.now)?performance.now():Date.now();
function on(root,h,o){o=o||{};const sel=o.sel||'[data-press]',doc=root.ownerDocument||document,live=new Map(),L=[];
  const at=(x,y)=>{const el=doc.elementFromPoint(x,y),p=el&&el.closest?el.closest(sel):null;return p&&root.contains(p)?p:null};
  const fire=(k,el,id,x,y)=>{const f=h[k];if(f&&el)f(el,{id,t:now(),x,y})};
  const begin=(id,x,y,e)=>{const p=at(x,y);if(!p)return;if(e&&e.cancelable)e.preventDefault();const was=live.get(id);if(was)fire('up',was,id,x,y);live.set(id,p);fire('down',p,id,x,y)};
  const move=(id,x,y)=>{const was=live.get(id);if(!was||!o.slide)return;const p=at(x,y);if(p&&p!==was){fire('up',was,id,x,y);live.set(id,p);fire('down',p,id,x,y)}};
  const end=(id,x,y)=>{const was=live.get(id);if(!was)return;live.delete(id);fire('up',was,id,x,y)};
  const add=(t,ev,f,opt)=>{t.addEventListener(ev,f,opt||false);L.push([t,ev,f,opt||false])};
  if(W.PointerEvent&&!o.noPointer){
    add(root,'pointerdown',e=>begin('p'+e.pointerId,e.clientX,e.clientY,e));
    add(W,'pointermove',e=>move('p'+e.pointerId,e.clientX,e.clientY));
    add(W,'pointerup',e=>end('p'+e.pointerId,e.clientX,e.clientY));add(W,'pointercancel',e=>end('p'+e.pointerId,e.clientX,e.clientY))}
  else{let lastTouch=0;
    add(root,'touchstart',e=>{lastTouch=now();for(let i=0;i<e.changedTouches.length;i++){const t=e.changedTouches[i];begin('t'+t.identifier,t.clientX,t.clientY,e)}},{passive:false});
    add(W,'touchmove',e=>{for(let i=0;i<e.changedTouches.length;i++){const t=e.changedTouches[i];move('t'+t.identifier,t.clientX,t.clientY)}},{passive:true});
    const te=e=>{lastTouch=now();for(let i=0;i<e.changedTouches.length;i++){const t=e.changedTouches[i];end('t'+t.identifier,t.clientX,t.clientY)}};
    add(W,'touchend',te);add(W,'touchcancel',te);
    add(root,'mousedown',e=>{if(now()-lastTouch<800)return;begin('m',e.clientX,e.clientY,e)});   // ignore the mouse events a touch fakes
    add(W,'mouseup',e=>end('m',e.clientX,e.clientY))}
  add(root,'keydown',e=>{const p=e.target&&e.target.closest&&e.target.closest(sel);if(!p||!(e.key==='Enter'||e.key===' '))return;e.preventDefault();fire('down',p,'k',0,0);setTimeout(()=>fire('up',p,'k',0,0),150)});
  return {live,off(){L.forEach(([t,ev,f,opt])=>t.removeEventListener(ev,f,opt));L.length=0;live.clear()}}}
W.Press={on,now};if(typeof module!=='undefined')module.exports=W.Press;
})(typeof window!=='undefined'?window:globalThis);
