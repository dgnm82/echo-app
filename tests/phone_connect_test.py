# Connect phone playthrough (spec v0.3 §4) for both Echoes. Usage: python3 tests/phone_connect_test.py [base-url] [screenshot-dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/cntest';os.makedirs(OUT,exist_ok=True)
async def run(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()));nm='berry' if kind=='fox' else 'moonlight';shot=lambda n:pg.screenshot(path=f'{OUT}/connect-{nm}-{n}.png')
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML=''")
  await pg.evaluate("__echo.state.bondShown=5;__echo.state.bond=100");assert len(await pg.evaluate("__echo.gamesFor()"))==3,'trail only at 100'
  await pg.evaluate("__echo.state.bondShown=5;__echo.state.bond=150");await pg.click('#play');await pg.wait_for_timeout(300);await shot('picker')
  title='Berry Connect' if kind=='fox' else 'Moonlight Connect';labels=await pg.locator('.choices button').all_inner_texts();assert any(title in l for l in labels) and len(labels)==4,labels
  c=pg.locator('.choices button',has_text=title).first;await c.click();await c.click();await pg.wait_for_timeout(600);await shot('start')
  g=await pg.evaluate("({lv:__con.level,n:__con.cells.length})");assert g=={'lv':'easy','n':30},g
  # real drag through a bunch (screenshot mid-thread), lift to gather
  path=await pg.evaluate("ConnectEngine.orderPath(__con,ConnectEngine.bunches(__con)[0].cells)");box=await pg.locator('#cc').bounding_box();k=box['width']/(6*24)
  pt=lambda i:(box['x']+((i%6)*24+12)*k,box['y']+((i//6)*24+12)*k)
  got0=await pg.evaluate("__con.threads");await pg.mouse.move(*pt(path[0]));await pg.mouse.down()
  for i in path[1:]:await pg.mouse.move(*pt(i),steps=4);await pg.wait_for_timeout(60)
  await pg.wait_for_timeout(120);await shot('thread');await pg.mouse.up();await pg.wait_for_timeout(200)
  assert await pg.evaluate("__con.threads")==got0+1,'drag gathered the bunch'
  # a 2-item drag just un-links (no gather)
  # play to the end via the engine (goal item first)
  mid=False
  for t in range(400):
    if await pg.evaluate("__con.done"):break
    await pg.evaluate("(()=>{const g=__con,b=ConnectEngine.bunches(g);const pk=b.find(x=>x.kind===g.goal)||b[0];__conGather(ConnectEngine.orderPath(g,pk.cells))})()");await pg.wait_for_timeout(60)
    if not mid and await pg.evaluate("__con.round")==1:mid=True;await pg.wait_for_timeout(300);await shot('mid')
  assert await pg.evaluate("__con.done");await pg.wait_for_timeout(500);await shot('done')
  st=await pg.evaluate("({games:__echo.state.connect.games,mem:__echo.state.memories.slice(-1)[0],bond:__echo.state.bond})");print(kind,st);assert st['games']==1 and st['bond']>150
  await pg.wait_for_timeout(2800)
  # handheld: bunch picker gathers with A; B switches to free threading
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());__echo.connectGame()");await pg.wait_for_timeout(400);assert await pg.evaluate("__con.level")=='standard'
  t0=await pg.evaluate("__con.threads");await pg.keyboard.press('ArrowRight');await pg.keyboard.press('a');assert await pg.evaluate("__con.threads")==t0+1,'A gathers the picked bunch'
  await pg.keyboard.press('b');await pg.keyboard.press('ArrowRight');await pg.wait_for_timeout(200);await shot('handheld-free');await pg.click('#quit');await pg.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind in ('fox','owl'):await run(b,p,kind,errs)
    print('ERR',errs);assert not errs;await b.close();print('connect playthrough OK')
asyncio.run(main())
