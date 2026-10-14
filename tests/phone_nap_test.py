# v1.1 nap: trot / fly home + wipe (or the reduced-motion dusk fade), then the sleeper ends on its bed spot. Usage: [base-url] [shot-dir]
import asyncio,sys,os,json,re
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/naptest';os.makedirs(OUT,exist_ok=True)
async def newecho(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('b').style.display='none'");return pg
async def until(pg,js,ms=8000):
  for i in range(ms//100):
    if await pg.evaluate(js):return True
    await pg.wait_for_timeout(100)
  return False
CL="document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove());const b=document.getElementById('b');if(b)b.style.display='none'"
async def frames(pg,name,n,ms=83,crop=None):
  r=await pg.evaluate("(()=>{const s=document.getElementById('screen').getBoundingClientRect();return [s.x,s.y,s.width,s.height]})()")
  fs=[]
  for i in range(n):
    clip={'x':r[0],'y':r[1],'width':r[2],'height':r[3]}
    if crop:
      c=await pg.evaluate("(()=>{const e=document.getElementById('cr');if(!e)return null;const q=e.getBoundingClientRect();return [q.x,q.y,q.width,q.height]})()")
      if c:clip={'x':max(r[0],c[0]-c[2]*.6),'y':max(r[1],c[1]-c[3]*.6),'width':c[2]*2.2,'height':c[3]*2.2}
    f=f'{OUT}/_{name}_{i:03d}.png';await pg.screenshot(path=f,clip=clip);fs.append(f);await pg.wait_for_timeout(ms)
  from PIL import Image
  ims=[Image.open(f).convert('RGB') for f in fs];sz=ims[0].size;ims=[im.resize(sz) for im in ims]
  ims[0].save(f'{OUT}/{name}.gif',save_all=True,append_images=ims[1:],duration=ms+40,loop=0)
  for f in fs:os.remove(f)
BED={'fox':'log_mouth','owl':'hollow_sill'}   # home_log_hollow v1
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[];bad=[]
    for kind,sp in (('fox','slyte'),('owl','whimber')):
      for low in (False,True):
        pg=await newecho(b,p,kind,errs);pg.on('response',lambda r:r.status>=400 and bad.append(r.url))
        home=await pg.evaluate("__echo.scene.home?__echo.scene.home().id:(SCENES[__echo.state.kind==='fox'?'slyte':'whimber'].find(s=>s.home)||SCENES[__echo.state.kind==='fox'?'slyte':'whimber'][0]).id")
        away=await pg.evaluate("SCENES[__echo.state.kind==='fox'?'slyte':'whimber'].map(s=>s.id).find(id=>id!=='%s')"%home)
        await pg.evaluate("CONFIG.livingSpeed=99;Alive.cueMax=0;const s=__echo.state;s.bond=300;s.badges.push('place');s.lowfx=%s;s.napUntil=0;s.scene='%s';s.needs.rest=20;__echo.home();"%('true' if low else 'false',away)+CL)
        await pg.wait_for_timeout(700);await pg.evaluate(CL)
        await pg.click('#rest');name=f'{sp}-nap'+('-reduced-motion' if low else '')
        await frames(pg,name,32,40)
        st=await pg.evaluate("(()=>{const c=document.getElementById('cr'),sc=document.getElementById('sc');return [__echo.state.scene,__echo.scene.cur,[parseInt(c.style.left),sc.clientHeight-parseInt(c.style.bottom)],__echo.living.pos]})()")
        wp=await pg.evaluate("(()=>{const w=SCENES['%s'].find(s=>s.id==='%s').wp.find(x=>x.id==='%s');return [w.xy[0],Math.max(52,w.xy[1]-57)]})()"%(sp,home,BED[kind]))
        assert st[0]==home and st[2]==wp,(name,st,wp)
        print(name,'ends on',BED[kind],wp,'OK')
        if low:assert await pg.evaluate("!document.querySelector('.scwipe')")
        await pg.close()
    # Whimber's flap while flying (lvMove)
    pg=await newecho(b,p,'owl',errs);pg.on('response',lambda r:r.status>=400 and bad.append(r.url))
    await pg.evaluate("CONFIG.livingSpeed=.05;Alive.cueMax=0;__echo.living.start(false)")
    for i in range(150):
      if await pg.evaluate("document.querySelector('#cr.lvmoving')"):break
      await pg.wait_for_timeout(100)
    fl=await pg.evaluate("(()=>{const e=document.querySelector('#cr .px-echo');return e&&/_fly\\.png/.test(e.style.backgroundImage)})()")
    await frames(pg,'whimber-flap',24,83,crop=True);assert fl,'flap sheet while flying'
    await b.close();print('ERR',errs,'404',bad);assert not errs and not bad;print('nap test OK')
asyncio.run(main())
