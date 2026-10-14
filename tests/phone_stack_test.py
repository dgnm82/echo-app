# Stacker phone test (games_v2 §6): unlock at bond 210 (not 209); perfect -> pips; 3 perfects -> width +4; full miss -> plop -> end card;
# flat reward; owl pass runs with lowFx on. Usage: python3 tests/phone_stack_test.py [base-url]
import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind,name,title in (('fox','Pancake Tower','WHAT A TOWER'),('owl','Cloud Steps','WHAT A SKY STAIR')):
      pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and errs.append('404 '+r.url))
      await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload()
      await pg.fill('#nick','Dani');await pg.click('#go');await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(3800)
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2000)
      await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';__echo.state.bond=209;__echo.state.badges.push('place','home')")
      assert name not in await pg.evaluate("__echo.games()")
      await pg.evaluate("__echo.state.bond=210;__echo.state.stackLevel='standard';__echo.state.lowfx=%s" % ('true' if kind=='owl' else 'false'))
      assert name in await pg.evaluate("__echo.games()")
      await pg.click('#play');cb=pg.locator('.choices button',has_text=name).first;await cb.click();await cb.click()
      await pg.wait_for_selector('#stc',timeout=5000);b0=await pg.evaluate("__echo.state.bond")
      await pg.wait_for_timeout(600);mu=await pg.evaluate("Music.playing||'nomusic'");print(kind,'music',mu);assert mu in ('nomusic',f"game_{'pancake_tower' if kind=='fox' else 'cloud_steps'}_loop")
      await pg.evaluate("__stack.w=50");
      for i in range(3):await pg.evaluate("__stack.sx=__stack.top+1;__stackPress()");await pg.wait_for_timeout(120)
      st=await pg.evaluate("[__stack.w,__stack.perfects,document.getElementById('sp').textContent]");assert st[0]==54 and st[1]==3,st
      for i in range(6):await pg.evaluate(f"__stack.sx=__stack.top+{5 if i%2 else -5};__stackPress()");await pg.wait_for_timeout(60)
      await pg.wait_for_timeout(4800)
      if kind=='fox':await pg.screenshot(path='/workspace/shots/games-v2/stack-mid.png')
      await pg.evaluate("__stack.sx=__stack.top+300;__stackPress()");await pg.wait_for_selector('.g2card',timeout=5000);await pg.wait_for_timeout(1400)
      card=await pg.inner_text('.g2card');print(kind,card.replace('\n',' '));assert title in card and 'perfect drops' in card and 'Again' in card,card
      print(await pg.evaluate("[__g2rounds,__echo.state.bond]"),b0);assert await pg.evaluate("__g2rounds")==3 and await pg.evaluate("__echo.state.bond")>b0
      await pg.click('#g2done');await pg.wait_for_timeout(500);await pg.close()
    print('ERR',errs);assert not errs,errs;print('stack test OK')
asyncio.run(main())
