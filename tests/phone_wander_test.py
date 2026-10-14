# wander v1: Howlings walk/trot on the _walk sheet (never slide seated), facing travel; Wingsongs hop short / fly long
import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind in ('fox','owl'):
      pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status==404 and errs.append('404 '+r.url))
      await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
      await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
      await pg.evaluate("document.getElementById('overlay').innerHTML=''");await pg.wait_for_timeout(300)
      for dx,fast,want in ((-24,False,'walk' if kind=='fox' else 'hop'),(70,False,'trot' if kind=='fox' else 'fly')):
        x0=await pg.evaluate("__echo.lvPos()&&__echo.lvPos()[0]");await pg.evaluate(f"(()=>{{const p=__echo.lvPos();__echo.lvMove([p[0]+({dx}),p[1]])}})()")
        sm=[];
        for k in range(6):
          await pg.wait_for_timeout(166);sm.append(await pg.evaluate("(()=>{const e=document.querySelector('#cr .px-echo');return [e.style.backgroundImage.slice(-24),e.style.backgroundPosition,e.classList.contains('lvflip'),__echo.lvPos()[0]]})()"))
        print(kind,want,sm[0],sm[-1])
        if kind=='fox':
          assert all('_walk.png' in s[0] for s in sm),sm;assert len({s[1] for s in sm})>1,sm
          sp=abs(sm[-1][3]-sm[0][3])/(5*2);assert (0.5<=sp<=2.2) if want=='walk' else (1.5<=sp<=3.2),(want,sp)
        else:
          assert ('_fly' in sm[1][0]) == (want=='fly'),sm
        assert sm[1][2]==(dx<0),sm
        await pg.wait_for_timeout(2500)
        if kind=='fox':assert '_walk' not in await pg.evaluate("document.querySelector('#cr .px-echo').style.backgroundImage")
      await pg.close()
    print('ERR',errs);assert not errs;await b.close();print('wander test OK')
asyncio.run(main())
