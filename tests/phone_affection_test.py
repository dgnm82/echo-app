# affection v2: Hug shows 3 (touch + words), each choice plays a line from its pool, comfort +5, bond capped by the pet daily cap
import asyncio
from playwright.async_api import async_playwright
URL='http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind in ('fox','owl'):
      pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
      await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(500)
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2500)
      await pg.evaluate("document.getElementById('overlay').innerHTML='';const S=__echo.state;S.days=9;S.napUntil=0;S.needs.comfort=20;__echo.home()");await pg.wait_for_timeout(500)
      await pg.click('#comfort');await pg.wait_for_timeout(300);labels=await pg.locator('.choices button').all_inner_texts();print(kind,labels);assert len([l for l in labels if l.strip() and 'close' not in l.lower() and l.strip()!='✕'])>=3,labels
      b0=await pg.evaluate("__echo.state.bond")
      for id in ['groom','five','wave','hum','amazing','smile','friend','groom','five','wave']:
        c0=await pg.evaluate("__echo.state.needs.comfort");await pg.evaluate(f"__echo.affDo('{id}')");await pg.wait_for_timeout(150)
        t=await pg.evaluate("(document.getElementById('b')||{}).innerText||''");assert t.strip(),id
        if id=='groom' and kind=='fox':print(id,t)
      b1=await pg.evaluate("__echo.state.bond");print(kind,'bond +',b1-b0,'(visit + 3 capped pet grants)')
      for id in ['amazing','smile','friend','hum','wave']:await pg.evaluate(f"__echo.affDo('{id}')");await pg.wait_for_timeout(100)
      d=await pg.evaluate("__echo.state.bond")-b1;assert d==0,('past the pet cap',d)
      await pg.close()
    print('ERR',errs);assert not errs;await b.close();print('affection test OK')
asyncio.run(main())
