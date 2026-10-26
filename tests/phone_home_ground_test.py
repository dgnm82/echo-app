# PM round 2 (Kai, Oct 25): home grounding Option A (den mounted at #sc top -57, the same crop as the scene art) + reply-chip lift +
# sky-tap bubble. For all 20 looks at iPhone 13 width, in 3 states (home, reply chips open, after a sky tap):
#  - the Echo's feet (lowest opaque row of the frame on screen) stand on the den's L3 stage art (lawn, or the canopy branch for
#    Wingsongs): the stage run under the feet column starts at most 2 px below the feet and still has art under them, i.e. not floating
#  - a ground home prop (hollow log / den / basket) rests on the same stage art
#  - feet and prop are on VISIBLE ground: at least 4 px of scene above the dock / chip panel top below them
#  - after a sky tap (sun / moon disc and a plain-sky tap under the default bubble spot) the speech bubble does not overlap the tapped rect
# Indoor house-cat room (no den): feet + basket visible above the dock / chips. Usage: python3 tests/phone_home_ground_test.py [URL]
import asyncio,sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
bad=[];n=[0];depth={}
def check(c,m):
  n[0]+=1
  if not c:bad.append(m);print('FAIL',m)
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
MEASURE="""async()=>{const sc=document.getElementById('sc');if(!sc)return null;const R=sc.getBoundingClientRect(),k=R.width/180;
 const rel=r=>({l:(r.left-R.left)/k,t:(r.top-R.top)/k,r:(r.right-R.left)/k,b:(r.bottom-R.top)/k});
 const C=window.__gC||(window.__gC={});const load=u=>C[u]||(C[u]=new Promise(res=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);res({w:c.width,h:c.height,d:x.getImageData(0,0,c.width,c.height).data})};im.onerror=()=>res(null);im.src=u}));
 const url=e=>{const m=(getComputedStyle(e).backgroundImage.match(/url\\("?([^")]+)"?\\)/)||[])[1];return m||null};
 const A=(I,x,y)=>I&&x>=0&&y>=0&&x<I.w&&y<I.h?I.d[(y*I.w+x)*4+3]:0;
 // lowest opaque row of the shown frame (background-position picks the frame; frame = the element's box at background-size)
 const lowRow=async(e)=>{const u=url(e);const I=u&&await load(u);if(!I)return null;const cs=getComputedStyle(e),bp=cs.backgroundPosition.split(' ').map(parseFloat),bs=cs.backgroundSize,w=e.offsetWidth,h=e.offsetHeight;
   const sx=bs&&bs!=='auto'&&!/auto/.test(bs)?I.w/parseFloat(bs.split(' ')[0]):1,sy=bs&&bs.split(' ')[1]&&!/auto/.test(bs.split(' ')[1])?I.h/parseFloat(bs.split(' ')[1]):sx;
   let low=-1,lx=null;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(A(I,Math.floor((x-bp[0])*sx),Math.floor((y-bp[1])*sy))>0&&y>=low){if(y>low){low=y;lx=[x,x]}else lx[1]=x}}return low<0?null:{row:low,x0:lx[0],x1:lx[1]}};
 const out={den:null,indoor:!sc.querySelector('.den-wrap'),lift:+(sc.dataset.lift||0),scene:[...sc.classList].find(c=>c.startsWith('sc-'))};
 const px=sc.querySelector('#cr .px-echo');if(px&&getComputedStyle(document.getElementById('cr')).visibility!=='hidden'){const r=rel(px.getBoundingClientRect()),lr=await lowRow(px);if(lr)out.feet={y:r.t+lr.row+1,x:r.l+(lr.x0+lr.x1+1)/2,l:r.l,r:r.r}}
 const hm=document.getElementById('home');if(hm&&hm.offsetWidth){const r=rel(hm.getBoundingClientRect());let low=null;for(const e of hm.querySelectorAll('.hb,.hf')){const lr=await lowRow(e);if(lr&&(!low||lr.row>low.row))low=lr}
   if(low)out.home={k:[...hm.classList].find(c=>c.startsWith('home-')),y:r.t+low.row+1,x:r.l+(low.x0+low.x1+1)/2,l:r.l,r:r.r}}
 const w=sc.querySelector('.den-wrap');if(w){out.den=w.dataset.den;out.wrapTop=rel(w.getBoundingClientRect()).t;const L3=w.querySelector('.den-plane[data-layer=L3]'),I=await load(url(L3)),pr=rel(L3.getBoundingClientRect()),zx=I.w/(pr.r-pr.l);
   // the stage-art run under column x that holds row y (or the nearest run starting below y)
   out.run=(x,y)=>{const cx=Math.floor((x-pr.l)*zx);const col=[];for(let yy=0;yy<I.h;yy++)col.push(A(I,cx,yy)>0);let best=null;
     for(let yy=0;yy<I.h;yy++){if(!col[yy]||(yy>0&&col[yy-1]))continue;let e=yy;while(e+1<I.h&&col[e+1])e++;const t=pr.t+yy/zx,b=pr.t+(e+1)/zx;if(b>=y-0.01&&(!best||t<best.t))best={t,b}}return best};
   if(out.feet)out.feet.run=out.run(out.feet.x,out.feet.y);if(out.home)out.home.run=out.run(out.home.x,out.home.y);delete out.run}
 const ch=document.querySelector('#overlay .choices'),dk=document.querySelector('.dock');out.chips=ch?ch.querySelectorAll('.btn').length:0;
 out.vis=ch&&ch.offsetHeight?rel(document.getElementById('overlay').getBoundingClientRect()).t:dk?Math.min(R.height/k,rel(dk.getBoundingClientRect()).t):R.height/k;
 const b=document.querySelector('#sc>#b');out.bub=b&&b.style.display!=='none'?rel(b.getBoundingClientRect()):null;out.avoid=sc._tapAvoid&&Date.now()<sc._tapAvoid.until?sc._tapAvoid:null;
 return out}"""
def ground(a,st,r,what,obj):
  if obj is None:check(False,f'{a} {st}: {what} measured');return
  vis=r['vis']
  check(obj['y']<=vis-4,f"{a} {st}: {what} on visible ground (bottom y={obj['y']:.0f}, scene visible to y={vis:.0f}{', lift '+str(r['lift']) if r['lift'] else ''})")
  if r['indoor']:return
  run=obj.get('run')
  ok=run is not None and run['t']<=obj['y']+2 and run['b']>=obj['y']
  check(ok,f"{a} {st}: {what} stands on the {r['den']} stage art (bottom y={obj['y']:.0f}, stage run {run and [round(run['t']),round(run['b'])]})")
  if ok and what=='Echo feet':depth.setdefault(r['den'],set()).add(round(obj['y']-run['t']))
async def one(b,p,a,sem):
  async with sem:
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    try:
      await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700)
      await T(pg,'#obgo',400)
      for _ in range(12):
        if await pg.locator('#obnm').count():break
        await T(pg,'.scene.ob',200)
      await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await T(pg,'.obagebtn >> nth=1',600)
      await pick(pg,a);await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
      await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1500)
      await pg.evaluate("(()=>{const s=__echo.state,d=new Date(Date.now()+(s.clockOffset||0));s.clockOffset=(s.clockOffset||0)+((11-d.getHours()+24)%24)*36e5;s.weatherOn=false})()")
      await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());__echo.home()");await pg.wait_for_timeout(1200)
      for _ in range(30):
        if not await pg.evaluate("!!(window.Dialogue&&Dialogue.waiting&&Dialogue.waiting()&&(Dialogue.advance(),1))"):break
        await pg.wait_for_timeout(200)
      # let the first-day "where I came from" talk start and finish (answer its chips), so nothing else opens chips / bubbles mid-test
      await pg.wait_for_timeout(3600);calm=0
      for _ in range(40):
        if await pg.locator('#overlay .choices .btn').count():
          await pg.locator('#overlay .choices .btn').first.click();await pg.wait_for_timeout(150);await pg.locator('#overlay .choices .btn').first.click();calm=0
        elif await pg.evaluate("!!(window.Dialogue&&Dialogue.waiting&&Dialogue.waiting()&&(Dialogue.advance(),1))"):calm=0
        else:calm+=1
        if calm>=6:break
        await pg.wait_for_timeout(250)
      await pg.evaluate("(()=>{const b=document.getElementById('b');if(b)b.style.display='none'})()");await pg.wait_for_timeout(300)
      r=await pg.evaluate(MEASURE)
      check(r is not None,f'{a}: home scene up');
      if r is None:return
      check(r['indoor'] or (r['wrapTop']==-57),f"{a}: den mounted at #sc top -57 (Option A; got {r.get('wrapTop')})")
      ground(a,'home',r,'Echo feet',r.get('feet'))
      gh=r.get('home') and r['home']['k'] in ('home-log','home-den','home-den_wild','home-basket','home-basket_room')
      if gh:ground(a,'home',r,r['home']['k'],r['home'])
      # reply chips: the worst case (4 chips, one wrapping) and a real conversation's chips
      await pg.evaluate("__echo.choices([['⭐','One fine thing'],['💗','Two fine things'],['🌲','Three fine things to choose from'],['🎲','Four things']],()=>{})");await pg.wait_for_timeout(500)
      r=await pg.evaluate(MEASURE);check(r['chips']==4,f"{a} chips: 4 reply chips open ({r['chips']}, overlay {await pg.evaluate('document.getElementById(`overlay`).innerHTML.slice(0,80)')})")
      ground(a,'chips',r,'Echo feet',r.get('feet'))
      if gh:ground(a,'chips',r,r['home']['k'],r['home'])
      await pg.evaluate("document.getElementById('overlay').innerHTML=''");await pg.wait_for_timeout(900)
      check(await pg.evaluate("+(document.getElementById('sc').dataset.lift||0)")==0,f'{a}: scene drops back when the chips close')
      # sky taps: a plain-sky spot under the default bubble, then the sun / moon disc; a bubble is up each time
      if not r['indoor']:
        for nm,js in [('sky',"[90,66]"),('body',"(()=>{let so=SOLAR.at(Date.now()+(__echo.state.clockOffset||0));so=ENV_HOTSPOTS.skySolar(so,document.getElementById('sc'));const b=so.sunUp?so.sun:so.moon;return b?[b.x,b.y]:null})()")]:
          xy=await pg.evaluate(js)
          if not xy:check(False,f'{a}: {nm} target found');continue
          R=await pg.evaluate("(()=>{const r=document.getElementById('sc').getBoundingClientRect();return [r.left,r.top,r.width]})()");k=R[2]/180
          if nm=='body':await pg.evaluate("__echo.talk('Ooh, look up there!',4000)");await pg.wait_for_timeout(100)   # a bubble already up moves off the tapped disc
          await pg.mouse.click(R[0]+xy[0]*k,R[1]+xy[1]*k);await pg.wait_for_timeout(150)
          if nm=='sky':await pg.evaluate("__echo.talk('Hm? What is up there?',4000)")   # a bubble the tap sets off lands clear of the tapped spot
          await pg.wait_for_timeout(150)
          r=await pg.evaluate(MEASURE);av=r.get('avoid');bb=r.get('bub')
          check(av is not None,f'{a} {nm} tap: the tapped rect is recorded')
          check(bb is not None,f'{a} {nm} tap: a speech bubble is up')
          if av and bb:check(bb['r']<=av['l'] or bb['l']>=av['r'] or bb['b']<=av['t'] or bb['t']>=av['b'],f"{a} {nm} tap at {xy}: bubble {[round(bb[q]) for q in 'ltrb']} clear of the tapped rect {[round(av[q]) for q in 'lrtb']}")
          if nm=='body':
            fl=await pg.evaluate("[...document.querySelectorAll('#sc .env-sky-flare,#sc .env-spark')].map(e=>{const R=document.getElementById('sc').getBoundingClientRect(),k=R.width/180,r=e.getBoundingClientRect();return [(r.left-R.left)/k,(r.top-R.top)/k,(r.right-R.left)/k,(r.bottom-R.top)/k]})")
            check(len(fl)>0 and av and all(f[0]>=av['l']-1 and f[2]<=av['r']+1 and f[1]>=av['t']-1 and f[3]<=av['b']+1 for f in fl),f'{a} body tap: flare + sparks inside the avoided rect ({len(fl)} fx)')
            if bb and fl:check(all(bb['r']<=f[0] or bb['l']>=f[2] or bb['b']<=f[1] or bb['t']>=f[3] for f in fl),f'{a} body tap: the bubble covers none of the flare / sparks')
          for _ in range(4):   # a hop / ear-perk reaction may lift the Echo for a beat: judge where it lands
            if r.get('feet') and r['feet'].get('run') and r['feet']['run']['t']<=r['feet']['y']+2:break
            await pg.wait_for_timeout(200);r2=await pg.evaluate(MEASURE)
            if r2.get('feet') and (not r.get('feet') or r2['feet']['y']>r['feet']['y']):r=r2
          ground(a,'sky-tap '+nm,r,'Echo feet',r.get('feet'))
          if gh:ground(a,'sky-tap '+nm,r,r['home']['k'],r['home'])
          await pg.wait_for_timeout(400)
      check(not errs,f'{a}: no page errors {errs[:2]}')
    except Exception as e:check(False,f'{a}: run failed {e!r}')
    finally:await ctx.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=await b.new_page();await pg.goto(URL);order=await pg.evaluate("FAMILIES.animalOrder");await pg.close()
    check(len(order)==20,f'20 looks ({len(order)})')
    if os.environ.get('GROUND_LOOKS'):order=[a for a in order if a in os.environ['GROUND_LOOKS'].split(',')]
    sem=asyncio.Semaphore(int(os.environ.get('GROUND_PAR','4')))
    await asyncio.gather(*[one(b,p,a,sem) for a in order])
    await b.close()
  print('feet depth into the stage art by den (px):',{k:sorted(v) for k,v in depth.items()})
  print(f'home ground: {n[0]-len(bad)}/{n[0]} passed');sys.exit(1 if bad else 0)
asyncio.run(main())
