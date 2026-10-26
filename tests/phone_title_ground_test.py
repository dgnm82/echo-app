# Batch H (PM, Oct 25) H7: the title cast renders exactly where titleCast() puts it (feet on Pixal anchors), in the real browser,
# for every biome (forced via Date) at iPhone 13 width. Catches CSS that shifts the sprite layer off the biome art.
# PM round 2 (Kai): over ~4 s of animation no sprite's opaque pixels are clipped by the viewport (walkers turn inside the screen) and no
# sprite overlaps the tagline (its ink box, measured from the rendered text). The bird perches below the tagline. Returning player: their
# own Echo is on the title, in front (z above the wild cast and the fg plants), grounded on the ground path, with wild Echoes around it;
# a new player (no save) sees only wild ones.
import asyncio,sys,os,io,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image,ImageChops
from playwright.async_api import async_playwright
from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
bad=[];n=[0]
def check(c,m):
  n[0]+=1
  if not c:bad.append(m);print('FAIL',m)
DAY="(()=>{const n0=Date.now.bind(Date),d0=Math.floor(n0()/864e5),want=%d,sh=((want-(d0%%3))+3)%%3,off=sh*864e5;Date.now=()=>n0()+off})()"
JS="""(()=>{const sc=document.querySelector('.scene.ttl'),bg=sc&&sc.querySelector('.ttbio.bg');if(!bg)return null;const R=bg.getBoundingClientRect(),k=R.width/180;
 return {bg:bg.style.backgroundImage,legacy:[...sc.querySelectorAll('.ttecho')].filter(e=>getComputedStyle(e).display!=='none').length,
  spr:[...sc.querySelectorAll('.ttspr')].map(e=>{const r=e.getBoundingClientRect();return {file:e.style.backgroundImage,surf:e.dataset.surface,l:parseFloat(e.style.left),t:parseFloat(e.style.top),x:(r.left-R.left)/k,y:(r.top-R.top)/k}})}})()"""
# opaque box (art px) of every title sprite as shown now: frame from background-position, mirrored when flipped
BOX="""async()=>{const sc=document.querySelector('.scene.ttl');const R=sc.getBoundingClientRect(),k=R.width/180;const C=window.__tC||(window.__tC={});
 const load=u=>C[u]||(C[u]=new Promise(res=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);res({w:c.width,h:c.height,d:x.getImageData(0,0,c.width,c.height).data})};im.onerror=()=>res(null);im.src=u}));
 const out=[];for(const e of sc.querySelectorAll('.ttspr,.ttown .px-echo')){const cs=getComputedStyle(e),u=(cs.backgroundImage.match(/url\\("?([^")]+)"?\\)/)||[])[1];const I=u&&await load(u);if(!I)continue;
  const bp=cs.backgroundPosition.split(' ').map(parseFloat),r=e.getBoundingClientRect(),l=(r.left-R.left)/k,t=(r.top-R.top)/k,flip=(e.classList.contains('flip')||/matrix\\(-1/.test(cs.transform));
  let U=null;for(let y=0;y<48;y++)for(let x=0;x<48;x++){const sx=x-bp[0],sy=y-bp[1];if(sx<0||sy<0||sx>=I.w||sy>=I.h)continue;if(I.d[(sy*I.w+sx)*4+3]>0){const X=flip?47-x:x;if(!U)U=[X,y,X+1,y+1];else{U[0]=Math.min(U[0],X);U[1]=Math.min(U[1],y);U[2]=Math.max(U[2],X+1);U[3]=Math.max(U[3],y+1)}}}
  const own=!!e.closest('.ttown'),z=+getComputedStyle(own?e.closest('.ttown'):e.closest('.ttsprites')||e).zIndex||0;
  if(U)out.push({own,file:u.split('/').pop(),surf:own?+e.closest('.ttown').dataset.surf:null,kind:own?'own':e.dataset.surface,z,box:[l+U[0],t+U[1],l+U[2],t+U[3]]})}
 return out}"""
async def ink(pg):
  """tagline ink box per line (art px) = pixels that change when the tagline is hidden, cast hidden"""
  R=await pg.evaluate("(()=>{const r=document.querySelector('.scene.ttl').getBoundingClientRect();return [r.left,r.top,r.width,window.devicePixelRatio]})()");k=R[2]/180*R[3]
  await pg.add_style_tag(content='.ttsprites,.ttown,.ttbio.alive,.oblogo-glow,.mfx-tnotes{visibility:hidden!important}*{animation-play-state:paused!important}')
  a=Image.open(io.BytesIO(await pg.screenshot())).convert('RGB')
  await pg.evaluate("document.querySelector('.obtag').style.visibility='hidden'")
  c=Image.open(io.BytesIO(await pg.screenshot())).convert('RGB')
  await pg.evaluate("document.querySelector('.obtag').style.visibility='';document.querySelectorAll('style').forEach(s=>{if(s.textContent.includes('.ttsprites,.ttown'))s.remove()})")
  d=ImageChops.difference(a,c).convert('L').point(lambda v:255 if v>8 else 0)
  spans=await pg.evaluate("(()=>{const sc=document.querySelector('.scene.ttl'),R=sc.getBoundingClientRect(),k=R.width/180;return [...sc.querySelectorAll('.obtag span')].map(s=>{const r=s.getBoundingClientRect();return [(r.top-R.top)/k,(r.bottom-R.top)/k]})})()")
  out=[]
  for t,b in spans:
    bb=d.crop((int(R[0]*R[3]),int((R[1]/R[3]*0+R[1])*R[3]+t*k),int((R[0]+R[2])*R[3]),int(R[1]*R[3]+b*k))).getbbox()
    if bb:out.append([bb[0]/k,t+bb[1]/k,bb[2]/k,t+bb[3]/k])
  return out
def inter(a,b):return a[0]<b[2] and a[2]>b[0] and a[1]<b[3] and a[3]>b[1]
async def watch(pg,label,keep,own_expected):
  seen=set();owns=[]
  for i in range(8):
    S=await pg.evaluate(BOX)
    for s in S:
      bx=s['box'];key=(s['file'],s['kind'])
      check(bx[0]>=0 and bx[2]<=180 and bx[1]>=0 and bx[3]<=320,f"{label} t{i}: {s['file']} ({s['kind']}) is not clipped by the viewport ({[round(v) for v in bx]})")
      for kb in keep:check(not inter(bx,kb),f"{label} t{i}: {s['file']} ({s['kind']}) clear of the tagline / panel {[round(v) for v in kb]} (sprite {[round(v) for v in bx]})")
      if s['own']:owns.append(s)
      seen.add(key)
    await pg.wait_for_timeout(500)
  return S,owns
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for day,bio in [(0,'woodland'),(1,'pasture'),(2,'cove')]:
      ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
      # pick the biome of the day (order woodland, pasture, cove) by shifting Date.now to a day index with day%3 == wanted, at 11:00 local
      await pg.add_init_script(DAY%day)
      await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(2500)
      r=await pg.evaluate(JS)
      check(r is not None and bio in (r or {}).get('bg',''),f'{bio}: biome diorama is up ({(r or {}).get("bg")})')
      if r:
        check(r['legacy']==0,f'{bio}: no floating legacy title Echo is visible')
        check(len(r['spr'])>=(1 if bio=='cove' else 2),f'{bio}: cast on screen ({len(r["spr"])})')   # cove: the duck (its rock-ledge perch sits under the tagline)
        for s in r['spr']:check(abs(s['x']-s['l'])<=0.5 and abs(s['y']-s['t'])<=0.5,f"{bio}: {s['file'][-40:]} ({s['surf']}) renders at its anchor placement ({s['x']:.1f},{s['y']:.1f}) vs ({s['l']},{s['t']})")
        if bio=='woodland':check(any(s['surf']=='perch' and s['l']<90 for s in r['spr']),'woodland: the bird perches on the left tree branch (below the tagline)')
      check(await pg.locator('.ttown').count()==0,f'{bio}: new player (no save): no own Echo on the title, wild ones only')
      keep=await ink(pg);check(len(keep)==3,f'{bio}: tagline ink measured ({[[round(v) for v in k] for k in keep]})')
      await watch(pg,f'{bio} new',keep,False)
      await pg.screenshot(path=f'/tmp/title_{bio}.png');await ctx.close()
    # returning player: onboard once (fox), then the every-session title for each forced day
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg)
    async def T(sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700);await T('#obgo',400)
    for _ in range(12):
      if await pg.locator('#obnm').count():break
      await T('.scene.ob',200)
    await pg.fill('#obnm','Mia');await T('#obnext');await T('#obyes');await T('.obagebtn >> nth=1',600)
    await pick(pg,'fox');await T('#ornext',300);await T('.orchip >> nth=0',900);await T('#orinv');await T('#orinv',3000);await T('#ornm',400);await T('#orkeep');await T('#orkeep',1500)
    await pg.wait_for_timeout(500);await pg.close()
    for day,bio in [(0,'woodland'),(1,'pasture'),(2,'cove')]:
      pg=await ctx.new_page();await pg.add_init_script(DAY%day);await pg.add_init_script("setTimeout=(f=>(fn,ms,...a)=>f(fn,ms===3000?6e5:ms,...a))(setTimeout)")   # hold the return title (it auto-advances after 3 s)
      await pg.goto(URL)
      for _ in range(30):
        if await pg.locator('.scene.ttl.biome .ttown').count():break
        await pg.wait_for_timeout(200)
      await pg.wait_for_timeout(400)
      got=await pg.evaluate("(()=>{const sc=document.querySelector('.scene.ttl.obreturn');return sc&&{bio:sc.dataset.biome,own:sc.querySelectorAll('.ttown').length,wild:sc.querySelectorAll('.ttspr').length,fgz:+getComputedStyle(sc.querySelector('.ttbio.fg')).zIndex,ownAfterFg:!!sc.querySelector('.ttbio.fg~.ttown'),panel:(()=>{const p=sc.querySelector(':scope>.obpanel'),R=sc.getBoundingClientRect(),k=R.width/180,r=p&&p.getBoundingClientRect();return r&&[(r.left-R.left)/k,(r.top-R.top)/k,(r.right-R.left)/k,(r.bottom-R.top)/k]})()}})()")
      check(got is not None,f'return {bio}: the every-session title is up')
      if not got:await pg.close();continue
      check(got['own']==1,f"return {bio}: the player's own Echo is on the title ({got['own']})")
      check(got['wild']>=1,f"return {bio}: wild Echoes around it ({got['wild']})")
      check(got['bio']!='cove' and (bio!='cove' or got['bio'] in ('woodland','pasture')),f"return {bio}: shown biome {got['bio']} has dry ground for the own Echo")
      keep=await ink(pg)+([got['panel']] if got['panel'] else [])
      S,owns=await watch(pg,f'return {bio}',keep,True)
      check(len(owns)>0,f'return {bio}: own Echo measured')
      for o in owns[:1]:
        paths={'woodland':262,'pasture':266}
        check(abs(o['box'][3]-o['surf'])<=1 and o['surf']==paths.get(got['bio']),f"return {bio}: own Echo's feet on the {got['bio']} ground path y={o['surf']} (opaque bottom {o['box'][3]:.0f})")
        check(all(o['z']>s['z'] for s in S if not s['own']) and o['z']>=got['fgz'] and got['ownAfterFg'],f"return {bio}: own Echo in front (z {o['z']} over the wild cast and the fg plants)")
      await pg.screenshot(path=f'/tmp/title_return_{bio}.png');await pg.close()
    await ctx.close();await b.close()
  print(f'title ground: {n[0]-len(bad)}/{n[0]} passed');sys.exit(1 if bad else 0)
asyncio.run(main())
