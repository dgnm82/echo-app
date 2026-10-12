# Per-Echo scenes phone test (scenes.md v0.2). Usage: python3 tests/phone_scenes_test.py [base-url] [screenshot-dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/sctest';os.makedirs(OUT,exist_ok=True)
CLEAN="document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''"
async def newecho(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;"+CLEAN);return pg
async def reopen(pg,mins=30,extra=''):
  await pg.evaluate("__echo.state.last=Date.now()+(__echo.state.clockOffset||0)-%d*6e4;__echo.state.napUntil=0;%slocalStorage.setItem('echo-proto-v1',JSON.stringify(__echo.state));window.__wiped=1"%(mins,extra))
  await pg.reload();await pg.wait_for_timeout(1200)
def hour_offset(h):return "(()=>{const d=new Date();return (( %d - d.getHours()+24)%%24)*36e5-d.getMinutes()*6e4})()"%h
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind,sp,home,s2,s3,first2 in (('fox','slyte','clearing','grove','meadow','Psst! I found a new spot'),('owl','whimber','branch','library','hilltop','I found a room full of stories')):
      pg=await newecho(b,p,kind,errs)
      assert await pg.evaluate("__echo.scene.cur")==home and await pg.evaluate("__echo.scene.unlocked()")==[home]
      assert f'scenes/{home}_' in await pg.evaluate("document.getElementById('sc').getAttribute('style')")
      # no mid-session change: unlocking scene 2 doesn't move the Echo now
      await pg.evaluate("__echo.state.bondShown=5;__echo.state.bond=80;__echo.home()");await pg.wait_for_timeout(300);assert await pg.evaluate("__echo.scene.cur")==home
      # next open after >= 20 min: the new scene arrives as a found-moment with its first line + a Memory Book entry
      await reopen(pg,30,"__echo.state.clockOffset=%s;"%hour_offset(10))
      assert await pg.evaluate("__echo.scene.cur")==s2,await pg.evaluate("__echo.scene.cur")
      for i in range(30):
        if await pg.evaluate("document.getElementById('b').style.display==='block'"):break
        await pg.wait_for_timeout(100)
      txt=await pg.inner_text('#b');print(sp,'found',txt);assert first2 in txt,txt
      assert any('found the' in m for m in await pg.evaluate("__echo.state.memories"))
      await pg.screenshot(path=f'{OUT}/scene-{s2}-found-first.png')
      # wander uses the scene's waypoints
      await pg.wait_for_timeout(3500);await pg.evaluate(CLEAN+";document.getElementById('b').style.display='none';CONFIG.livingSpeed=.05;__echo.living.start(false)")
      for i in range(150):
        if await pg.evaluate("__echo.living.st==='wander'&&!!__echo.living.act"):break
        await pg.wait_for_timeout(100)
      assert await pg.evaluate("__echo.living.st")=='wander';await pg.wait_for_timeout(2500);await pg.screenshot(path=f'{OUT}/scene-{s2}-wander-{await pg.evaluate("__echo.living.act")}.png')
      await pg.evaluate("CONFIG.livingSpeed=1")
      # 'Our places' picker opens with the place badge (bond 140): travel home
      await pg.evaluate("__echo.state.bond=300;__echo.state.badges.push('place');__echo.home()");await pg.wait_for_timeout(500);await pg.evaluate(CLEAN)
      await pg.click('#book');await pg.wait_for_timeout(300);await pg.click('#places');await pg.wait_for_timeout(300);await pg.screenshot(path=f'{OUT}/scene-{sp}-our-places.png')
      n=await pg.locator('.places .place').count();assert n==3,n
      await pg.locator('.places .place').first.click();await pg.wait_for_timeout(1200);assert await pg.evaluate("__echo.scene.cur")==home
      # a nap always goes home
      await pg.evaluate("__echo.state.scene='%s'"%s3);await pg.evaluate(CLEAN);await pg.click('#rest');await pg.wait_for_timeout(400)
      assert await pg.evaluate("__echo.state.scene")==home
      # every scene, day + twilight
      for s in (home,s2,s3):
        for h,v in ((10,'day'),(19,'twi')):
          await pg.evaluate("__echo.state.napUntil=0;__echo.state.scene='%s';__echo.state.clockOffset=%s;__echo.home()"%(s,hour_offset(h)));await pg.wait_for_timeout(500)
          await pg.evaluate(CLEAN+";document.getElementById('b').style.display='none'");st=await pg.evaluate("document.getElementById('sc').getAttribute('style')");assert f'{s}_{v}.png' in st,st
          await pg.screenshot(path=f'{OUT}/scene-{s}-{v}.png')
      await pg.close()
    print('ERR',errs);assert not errs;await b.close();print('scenes test OK')
asyncio.run(main())
