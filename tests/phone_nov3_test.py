# Nov 3 batch (Jay; LIST.md under pm/review_nov8): 1 Echo It Back layout, 2+6 one needs source + play costs, 9 no text caret in games,
# 11 Ancient Echo intro tempo, 3 "Bye for now". NOV3_ONLY=eib|needs|caret|tempo|bye runs one part.
# Usage: python3 tests/phone_nov3_test.py [URL] [SHOTDIR]
import asyncio,sys,os,json,time
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
SHOT=sys.argv[2] if len(sys.argv)>2 else '/tmp/nov3_shots';os.makedirs(SHOT,exist_ok=True)
ONLY=os.environ.get('NOV3_ONLY','')
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
VP=[('360x640',dict(viewport={'width':360,'height':640},device_scale_factor=2,is_mobile=True,has_touch=True)),
    ('390x844',dict(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)),
    ('desktop',dict(viewport={'width':1280,'height':800},has_touch=True))]
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def wait(pg,js,ms):
  t0=time.time()
  while (time.time()-t0)*1000<ms:
    if await pg.evaluate(f"(()=>{{try{{return !!({js})}}catch(e){{return false}}}})()"):return True
    await pg.wait_for_timeout(80)
  return False
async def setup(b,kw,animal='dog'):
  ctx=await b.new_context(**kw);pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-dev-wu','0')");await pg.reload();await pg.wait_for_timeout(600)
  await T(pg,'#obgo',400)
  for _ in range(12):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await pick(pg,animal);await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
  await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1200)
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());CONFIG.ambientMin=999;CONFIG.ambientMax=999")
  return ctx,pg,errs
# ---------------------------------------------------------------- 1: Echo It Back layout (two-row tune, 8 pads, solfège labels, a long line)
LONG="We caught an Ancient Echo together! It gets its own spot in our collection."
GEO="""(()=>{const gs=document.getElementById('gs').getBoundingClientRect(),k=gs.width/180;const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom}};
  const hit=(a,b)=>!(a.r<=b.l+.5||a.l>=b.r-.5||a.b<=b.t+.5||a.t>=b.b-.5),inside=a=>a.l>=gs.left-.5&&a.r<=gs.right+.5&&a.t>=gs.top-.5&&a.b<=gs.bottom+.5;
  const cv=document.createElement('canvas').getContext('2d');const labels=[...document.querySelectorAll('.eibpad')].map(p=>{const cs=getComputedStyle(p,'::after');if(cs.content==='none'||!p.dataset.sol)return null;
    cv.font=cs.fontSize+' PS2P';const w=cv.measureText(p.dataset.sol).width*k,r=R(p),fs=parseFloat(cs.lineHeight)*k,bt=r.b-parseFloat(cs.bottom)*k;return {l:(r.l+r.r)/2-w/2,r:(r.l+r.r)/2+w/2,t:bt-fs,b:bt}}).filter(Boolean);
  const pads=[...document.querySelectorAll('.eibpad')].map(R),bub=R(document.getElementById('b')),beads=R(document.querySelector('.eibbeads'));
  const text=[bub].concat([...document.querySelectorAll('.eibrow .eibn')].map(R));
  const g=document.getElementById('gs');
  return {gsScroll:[g.scrollTop,g.scrollLeft],gsOverflow:getComputedStyle(g).overflowY,bubIn:inside(bub)&&document.getElementById('b').style.display!=='none',
    beadsHitText:text.some(t=>hit(beads,t))||labels.some(t=>hit(beads,t)),beadsHitPads:pads.some(p=>hit(beads,p)),
    padTops:[...new Set(pads.map(p=>Math.round(p.t)))],padW:pads.map(p=>Math.round(p.r-p.l)),padsOverlap:pads.some((p,i)=>pads.some((q,j)=>i<j&&hit(p,q))),padsIn:pads.every(inside),
    labels:labels.length,labelsOverlap:labels.some((p,i)=>labels.some((q,j)=>i<j&&hit(p,q))),labelsIn:labels.every(inside),labelsHitPads:labels.some(l=>pads.some(p=>hit(l,p))),
    n:EchoBack.cur.tune.n.length,rows:document.querySelector('.eibask').classList.contains('two')}})()"""
async def eib_part(b):
  for name,kw in VP:
    ctx,pg,errs=await setup(b,kw)
    await pg.evaluate("__echo.eib('play')");await wait(pg,"EchoBack.cur",8000);await pg.wait_for_timeout(300)
    # a child on 8 notes (two rows) at music level 5 (solfège on the pads + the strip)
    await pg.evaluate("""(()=>{EchoBack.stop();const b=JSON.parse(localStorage.getItem('echo-songbook-v1'));for(const k in b.progress){const p=b.progress[k];p.len=8;p.ml.level=5;p.ml.src='warmup'}
      localStorage.setItem('echo-songbook-v1',JSON.stringify(b));__echo.state.eib={rounds:1,heard:[0,1,2,3,4,5,6,7]}})()""")
    await pg.evaluate("__echo.eib('invite')")
    check(await wait(pg,"EchoBack.cur&&EchoBack.cur.phase==='child'",30000),f'{name}: round reaches the child turn')
    await pg.evaluate("document.querySelectorAll('.eibbeads i').forEach((b,i)=>b.classList.toggle('on',i<2))")
    asked=await pg.evaluate("EchoBack.cur.asked")
    for s in asked[:5]:
      await pg.locator(f'.eibpad[data-pad="{s}"]').first.tap();await pg.wait_for_timeout(110)
    await pg.locator('.eibpad').first.focus();await pg.locator('.eibpad').last.focus()
    await pg.evaluate("__echo.talk(%s,60000)"%json.dumps(LONG));await pg.wait_for_timeout(250)
    g=json.loads(json.dumps(await pg.evaluate(GEO)))
    await pg.screenshot(path=f'{SHOT}/01_eib_{name}.png')
    check(g['n']==8 and g['rows'],f'{name}: a two-row tune ({g["n"]} notes)')
    check(g['gsScroll']==[0,0] and g['gsOverflow']=='clip',f'{name}: the game scene never scrolls (taps + focus) {g["gsScroll"]} {g["gsOverflow"]}')
    check(g['bubIn'],f'{name}: the speech bubble is fully on screen')
    check(not g['beadsHitText'] and not g['beadsHitPads'],f'{name}: progress beads overlap no text, no label, no pad')
    check(len(g['padTops'])==1 and max(g['padW'])-min(g['padW'])<=1 and not g['padsOverlap'] and g['padsIn'],f'{name}: pads = one even row, inside the scene {g["padTops"]} {g["padW"]}')
    check(g['labels']==8 and not g['labelsOverlap'] and g['labelsIn'] and not g['labelsHitPads'],f'{name}: 8 solfège labels, none overlapping, all on screen')
    # past 8 pads (not shipped today): an even 2-row grid, still no overlaps
    g2=await pg.evaluate("""(()=>{const box=document.querySelector('.eibpads');const L=[...box.children];box.insertAdjacentHTML('beforeend',L[1].outerHTML+L[2].outerHTML);EchoBack._pure.padsLayout(box,10);
      const P=[...box.children].map(e=>e.getBoundingClientRect());const rows=[...new Set(P.map(r=>Math.round(r.top)))];
      return {rows:rows.length,per:rows.map(t=>P.filter(r=>Math.round(r.top)===t).length),ov:P.some((p,i)=>P.some((q,j)=>i<j&&!(p.right<=q.left+.5||p.left>=q.right-.5||p.bottom<=q.top+.5||p.top>=q.bottom-.5)))}})()""")
    g3=json.loads(json.dumps(await pg.evaluate(GEO)))
    check(g2['rows']==2 and g2['per']==[5,5] and not g2['ov'] and not g3['labelsOverlap'] and not g3['beadsHitPads'] and g3['labelsIn'],f'{name}: 10 pads -> even 5+5 grid, no overlaps {g2}')
    check(not errs,f'{name}: no page errors {errs[:2]}');await ctx.close()
PARTS={'eib':eib_part}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    for k,f in PARTS.items():
      if ONLY in ('',k):await f(b)
    await b.close()
  print('ALL OK' if not fails else f'{len(fails)} FAIL');sys.exit(1 if fails else 0)
asyncio.run(main())
