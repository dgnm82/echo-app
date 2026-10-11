import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';PFX=sys.argv[2] if len(sys.argv)>2 else '';OUT='/tmp/relpt-'+PFX
async def run(b,dev,vp,errs,full=True):
  pg=await b.new_page(**vp);pg.on('pageerror',lambda e:errs.append(dev+':'+str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(dev+' console:'+m.text))
  pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
  async def pick(txt=None,t=60000):
    loc=pg.locator('.choices button',has_text=txt) if txt else pg.locator('.choices button')
    await loc.first.wait_for(timeout=t);await loc.first.click();await loc.first.click()
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700)
  await pg.screenshot(path=f'{OUT}{dev}-setup.png')
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(700);await pg.screenshot(path=f'{OUT}{dev}-discover.png')
  await pg.click('#bush');await pg.wait_for_timeout(560);await pg.screenshot(path=f'{OUT}{dev}-reveal-arrival-mid.png')
  await pg.wait_for_timeout(2600);await pg.screenshot(path=f'{OUT}{dev}-reveal.png')
  await pick();await pg.wait_for_timeout(3000)
  if not full:await pg.close();return
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML=''")
  await pg.click('#dbg');await pg.click('#b2');await pg.wait_for_timeout(800)
  for _ in range(12):
    if await pg.locator('.full button').count():await pg.locator('.full button').first.click();await pg.wait_for_timeout(500)
    else:break
  await pg.evaluate("document.getElementById('overlay').innerHTML=''");await pg.wait_for_timeout(600);await pg.screenshot(path=f'{OUT}ready-path.png')
  await pg.evaluate("__echo.state.graceUntil=Date.now()+(__echo.state.clockOffset||0)+1*864e5+60e3;__echo.state.releasePath=null");await pg.click('#dbg');await pg.click('#b6');
  await pg.evaluate("document.querySelector('#bond').click()");await pg.wait_for_timeout(300)
  # re-render home to show grace path growth (day 3 of 3)
  await pg.evaluate("document.querySelector('#how')&&0");await pg.click('#dbg');await pg.click('#b3');await pg.wait_for_timeout(800);await pg.evaluate("document.getElementById('overlay').innerHTML=''")
  await pg.screenshot(path=f'{OUT}grace-path-day3.png')
  await pg.click('#rel');await pick("Let's go");
  await pick(t=60000);await pg.wait_for_timeout(300);
  await pick(t=60000)  # goodbye
  ok=False
  seen=set()
  for _ in range(700):
    c=await pg.evaluate("(document.querySelector('#cr .px-echo')||{})._col")
    seen.add(c)
    if c in ('ev1:5','ev1:6','ev1:7'):await pg.screenshot(path=f'{OUT}release-dissolve-mid.png');ok=True;break
    if c=='ev1:0':await pg.screenshot(path=f'{OUT}release-stage5-hearts.png')
    await pg.wait_for_timeout(40)
  assert ok,'release dissolve frames seen';print('dissolve captured',ok,sorted(x for x in seen if x and str(x).startswith('ev')))
  await pg.locator('.closure').wait_for(timeout=15000);await pg.wait_for_timeout(500);await pg.screenshot(path=f'{OUT}closure.png')
  await pg.locator('#cont button').wait_for(timeout=8000);await pg.click('#cont button');await pg.wait_for_timeout(300)
  await pg.click('.full [data-i="0"]');await pg.click('.full [data-i="1"]');await pg.screenshot(path=f'{OUT}feelings.png')
  await pg.click('#ok');await pg.wait_for_timeout(300);await pg.click('.full button');await pg.wait_for_timeout(500)
  await pg.click('.book #x');
  for _ in range(4):
    await pg.click('#pc');await pg.wait_for_timeout(400)
    if await pg.locator('.mailbox.full').count():break
  await pg.screenshot(path=f'{OUT}after-mailbox.png');await pg.click('#mail');await pg.wait_for_timeout(500);await pg.screenshot(path=f'{OUT}postcard.png')
  await pg.click('.full button');
  for _ in range(4):await pg.click('#pc');await pg.wait_for_timeout(300)
  if await pg.locator('#sign').count():await pg.screenshot(path=f'{OUT}after-sign.png');await pg.click('#sign');await pg.wait_for_timeout(400);await pg.screenshot(path=f'{OUT}sign-card.png');await pg.click('.full button')
  await pg.click('#book');await pg.wait_for_timeout(400);await pg.screenshot(path=f'{OUT}memory-book.png')
  await pg.evaluate("document.querySelector('.book').scrollTop=99999");await pg.wait_for_timeout(200);await pg.screenshot(path=f'{OUT}memory-book-postcards.png')
  print('saved feelings?', await pg.evaluate("JSON.stringify(localStorage).includes('Proud')||'feelings' in __echo.state"))
  await pg.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    await run(b,'phone',p.devices['iPhone 13'],errs)
    await run(b,'desktop',{'viewport':{'width':1280,'height':900}},errs,False)
    print('ERR',errs);await b.close();assert not errs,errs;print('release playthrough OK')
asyncio.run(main())
