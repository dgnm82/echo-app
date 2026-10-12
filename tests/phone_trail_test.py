# Sparkle trail phone playthrough (spec v0.3 §3) for both Echoes. Usage: python3 tests/phone_trail_test.py [base-url] [screenshot-dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/trtest';os.makedirs(OUT,exist_ok=True)
async def run(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()));nm='leaf' if kind=='fox' else 'parade';shot=lambda n:pg.screenshot(path=f'{OUT}/trail-{nm}-{n}.png')
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML=''")
  locked=await pg.evaluate("__echo.gamesFor()");assert len(locked)==2,('locked before bond 70',locked)
  await pg.evaluate("__echo.state.bondShown=5;__echo.state.bond=80");await pg.click('#play');await pg.wait_for_timeout(300);await shot('picker')
  title='Leaf Trail' if kind=='fox' else 'Firefly Parade';labels=await pg.locator('.choices button').all_inner_texts();assert any(title in l for l in labels),labels
  c=pg.locator('.choices button',has_text=title).first;await c.click();await c.click();await pg.wait_for_timeout(600);await shot('start')
  assert await pg.evaluate("__trail.level")=='easy'   # first game ever: step mode
  # easy step mode: nothing moves until held
  h0=await pg.evaluate("JSON.stringify(__trail.head)");await pg.wait_for_timeout(1000);assert h0==await pg.evaluate("JSON.stringify(__trail.head)"),'step mode waits'
  # drag: real pointer drag toward the pickup a few times, then a steering loop while held
  box=await pg.locator('#tc').bounding_box();k=box['width']/176
  px=await pg.evaluate("__trail.pickup");await pg.mouse.move(box['x']+(px['x']*16+8)*k,box['y']+(px['y']*16+8)*k);await pg.mouse.down();await pg.wait_for_timeout(1500);await pg.mouse.up()
  await pg.evaluate("window.__trailHold(true);window.__tl=setInterval(()=>{const g=__trail;if(g.pickup)TrailEngine.steer(g,g.pickup.x,g.pickup.y)},60)")
  for i in range(300):
    c=await pg.evaluate("__trail.count")
    if c>=4 and i<400 and not os.path.exists(f'{OUT}/trail-{nm}-mid.png'):await shot('mid')
    if await pg.evaluate("__trail.done"):break
    await pg.wait_for_timeout(200)
  assert await pg.evaluate("__trail.done"),'trail finished'
  await pg.wait_for_timeout(700);await shot('finale')
  st=await pg.evaluate("({games:__echo.state.trail.games,mem:__echo.state.memories.slice(-1)[0],bond:__echo.state.bond})");print(kind,st)
  assert st['games']==1 and ('leaves' in st['mem'] or 'parade' in st['mem']) and st['bond']>80
  await pg.wait_for_timeout(3000)
  # handheld keys on a standard round: ◀ turns, B pauses
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());__echo.trailGame()");await pg.wait_for_timeout(400)
  assert await pg.evaluate("__trail.level")=='standard'
  d0=await pg.evaluate("__trail.dir");await pg.keyboard.press('ArrowLeft');assert await pg.evaluate("__trail.dir")==(d0+3)%4
  await pg.keyboard.press('b');h1=await pg.evaluate("JSON.stringify(__trail.head)");await pg.wait_for_timeout(900);assert h1==await pg.evaluate("JSON.stringify(__trail.head)"),'B pauses'
  await pg.click('#quit');await pg.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind in ('fox','owl'):await run(b,p,kind,errs)
    print('ERR',errs);assert not errs;await b.close();print('trail playthrough OK')
asyncio.run(main())
