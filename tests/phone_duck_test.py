# Music ducks ~35% under every Echo chirp for the chirp's length (short fades), both Echoes.
import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);errs=[]
    for kind,sel in (('fox','#bush'),('owl','#tree')):
      pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload()
      await pg.fill('#nick','Dani');await pg.click('#go');await pg.click(sel);await pg.wait_for_timeout(3800)
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(1500)
      await pg.evaluate("Music.home(__echo.state.kind)")
      for _ in range(60):
        if await pg.evaluate("!!Music.playing"):break
        await pg.wait_for_timeout(200)
      sp='slyte' if kind=='fox' else 'whimber'
      await pg.evaluate(f"Sound.preload&&Sound.preload(['{sp}_happy_1','{sp}_happy_2','{sp}_happy_3'])");
      for _ in range(100):
        if await pg.evaluate(f"['{sp}_happy_1','{sp}_happy_2','{sp}_happy_3'].every(n=>Sound.loaded.includes(n))"):break
        await pg.wait_for_timeout(200)
      await pg.wait_for_timeout(1600)   # let any earlier duck recover
      r=await pg.evaluate(f"""(async()=>{{Music.ducks=[];const ok=Sound.chirp('Hi!','{kind}','happy');await new Promise(r=>setTimeout(r,150));const low=Music.level;
         const d=Music.ducks[0];await new Promise(r=>setTimeout(r,(d?d.ms:600)+450));return {{ok,low,d,after:Music.level,playing:Music.playing}}}})()""")
      print(kind,r)
      assert r['ok'] and r['playing'] and r['d'] and r['d']['to']==.65 and 150<=r['d']['ms']<=3000,r
      assert .6<=r['low']<=.72 and r['after']>.95,r
      await pg.close()
    await b.close();assert not errs,errs;print('duck test OK')
asyncio.run(main())
