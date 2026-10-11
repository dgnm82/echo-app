# Bond-up scene phone test (bond_up.md). Usage: python3 tests/phone_bondup_test.py [base-url] [screenshot-dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/butest';os.makedirs(OUT,exist_ok=True)
async def newecho(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove())");return pg
async def frames(pg,tag,want):
  got=set()
  for i in range(400):
    f=await pg.evaluate("window.__bondup?__bondup.frame:-1")
    for w in want:
      if w not in got and f>=w:got.add(w);await pg.screenshot(path=f'{OUT}/bondup-{tag}-f{w:02d}.png')
    if len(got)==len(want):break
    await pg.wait_for_timeout(25)
  return got
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    pg=await newecho(b,p,'fox',errs)
    assert await pg.evaluate("__echo.state.bondShown")==1
    # queue: never during a game
    await pg.evaluate("__echo.state.bond=130;__echo.fortBuilder()");await pg.wait_for_timeout(300)
    assert not await pg.evaluate("__echo.maybeBondUp()"),'no bond-up mid-game'
    await pg.click('#quit');await pg.wait_for_timeout(2500);await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove())")
    # back on Home: plays first, then the milestone card (the 'name' sticker milestone is due at bond 20)
    await pg.evaluate("__echo.state.badges=__echo.state.badges.filter(x=>x!=='place');__echo.home()")
    got=await frames(pg,'slyte-1to2',[3,10,20,30,35,38,45,60])
    assert len(got)==8,got
    assert await pg.evaluate("__echo.state.bondShown")==2 and await pg.evaluate("__echo.state.bondMoments.length")==1
    # skip guard: a tap right away does nothing; later it jumps to the end state
    await pg.mouse.click(200,300);assert await pg.evaluate("!!window.__bondup")
    await pg.wait_for_timeout(5000);await pg.mouse.click(200,300);await pg.wait_for_timeout(600)
    assert not await pg.evaluate("!!window.__bondup"),'tap after the hold finishes it'
    await pg.wait_for_timeout(800);st=await pg.evaluate("document.querySelector('#cr .px-echo').dataset.stage");assert st=='2',st
    await pg.screenshot(path=f'{OUT}/bondup-slyte-after.png')
    # Memory Book replay
    await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove())");await pg.click('#book');await pg.wait_for_timeout(300)
    await pg.locator('.book [data-replay]').first.scroll_into_view_if_needed();await pg.screenshot(path=f'{OUT}/bondup-memory-book.png')
    await pg.locator('.book [data-replay]').first.click();await pg.wait_for_timeout(1500);assert await pg.evaluate("!!window.__bondup");assert await pg.evaluate("__echo.state.bondMoments.length")==1
    await pg.wait_for_timeout(1000);await pg.mouse.click(200,300);await pg.wait_for_timeout(300);await pg.mouse.click(200,300);await pg.wait_for_timeout(500)
    # reduced effects: short cross-fade
    await pg.evaluate("__echo.state.lowfx=true;__echo.state.bond=260;document.querySelectorAll('.full').forEach(f=>f.remove());__echo.home()")
    got=await frames(pg,'slyte-lowfx',[6,12]);assert len(got)==2
    for i in range(80):
      if not await pg.evaluate("!!window.__bondup"):break
      await pg.wait_for_timeout(100)
    assert await pg.evaluate("__echo.state.bondShown")==3;await pg.close()
    # Whimber 3 -> 4 and the 4 -> 5 celebration (release untouched)
    pg=await newecho(b,p,'owl',errs)
    await pg.evaluate("__echo.state.bondShown=3;__echo.state.bond=380;__echo.home()");got=await frames(pg,'whimber-3to4',[20,30,38,45,60]);assert len(got)==5
    await pg.wait_for_timeout(5000);await pg.mouse.click(200,300);await pg.wait_for_timeout(1000)
    await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());__echo.state.bond=500;__echo.home()");got=await frames(pg,'whimber-4to5',[38,60]);assert len(got)==2
    assert await pg.evaluate("__echo.state.bondShown")==5 and not await pg.evaluate("__echo.state.releasePath")
    await pg.close();print('ERR',errs);assert not errs;await b.close();print('bond-up test OK')
asyncio.run(main())
