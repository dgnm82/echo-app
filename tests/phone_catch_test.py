# Catch phone test (games_v2 §6): unlock at bond 20 (not 19), carrier follows at <= echoV, 3 landings -> PICNIC/STARGAZE TIME -> end card,
# flat reward, NEW BEST on the second game, lowFx = no sway. Usage: python3 tests/phone_catch_test.py [base-url]
import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def setup(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and errs.append('404 '+r.url))
  await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload()
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(3800)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''")
  return pg
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind,name,ban in (('fox','Berry Catch','PICNIC TIME!'),('owl','Starfall Catch','STARGAZE TIME!')):
      pg=await setup(b,p,kind,errs)
      await pg.evaluate("__echo.state.bond=19");assert name not in await pg.evaluate("__echo.games()")
      await pg.evaluate("__echo.state.bond=20");assert name in await pg.evaluate("__echo.games()")
      await pg.click('#play');cb=pg.locator('.choices button',has_text=name).first;await cb.click();await cb.click()
      await pg.wait_for_selector('#cc',timeout=5000);b0=await pg.evaluate("__echo.state.bond")
      v=await pg.evaluate("new Promise(r=>{const g=__catch,x0=g.x;CatchEngine.moveTo(g,170);setTimeout(()=>r([g.x-x0,g.L.echoV]),500)})")
      assert 0<v[0]<=v[1]*0.5+12,v
      seen=False
      await pg.evaluate("setInterval(()=>{if(window.__catch&&!__catch.done){const it=__catch.items[0];CatchEngine.moveTo(__catch,it&&it.x<90?175:5)}},50)")   # dodge: let them land
      for _ in range(300):
        seen=seen or await pg.locator('.runbest',has_text=ban).count()>0
        if await pg.locator('.g2card').count():break
        await pg.wait_for_timeout(100)
      assert seen,'banner'
      await pg.wait_for_timeout(1400);card=await pg.inner_text('.g2card');print(kind,card.replace('\n',' '))
      assert 'WHAT A CATCH' in card and 'Again' in card and 'Done' in card,card
      assert await pg.evaluate("__g2rounds")==3 and await pg.evaluate("__echo.state.bond")>b0
      if kind=='fox':await pg.screenshot(path='/workspace/shots/games-v2/catch-card.png')
      # Again: a second game, beat the best -> NEW BEST
      await pg.click('#g2again');await pg.wait_for_selector('#cc',timeout=5000);await pg.wait_for_timeout(400)
      await pg.evaluate("__catch.n=Math.max(1,(__echo.state.best.catch[__catch.level]||{score:0}).score)+2;__catchFinish()")
      await pg.wait_for_selector('.g2card',timeout=5000);card=await pg.inner_text('.g2card');assert 'NEW BEST' in card,card
      await pg.click('#g2done');await pg.wait_for_timeout(500)
      if kind=='fox':
        await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());const s=__echo.state;s.lowfx=true;s.needs.rest=100;s.catchLevel='bigkid'");
        await pg.evaluate("window.__echo.home()");await pg.wait_for_timeout(500)
        # session limit 2: the picker now says game_tired, so open the game directly through the hook-free path
        await pg.evaluate("(()=>{const g=CatchEngine.create({level:'bigkid',seed:3,lowfx:true});for(let i=0;i<900;i++)CatchEngine.step(g,1/60);window.__low=g.items.every(i=>i.sway===0)})()")
        assert await pg.evaluate("__low")
      await pg.close()
    print('ERR',errs);assert not errs,errs;print('catch test OK')
asyncio.run(main())
