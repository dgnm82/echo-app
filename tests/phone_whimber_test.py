# Whimber pixel playthrough (milestone 5): setup card, arrival, home + hollow, care frames, picker, 
# Starlight Pairs, Hollow Builder, handheld. Usage: python3 tests/phone_whimber_test.py [base-url] [screenshot-dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/whtest';os.makedirs(OUT,exist_ok=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[];bad=[]
    pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.on('response',lambda r:r.status>=400 and bad.append(r.url));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    shot=lambda n:pg.screenshot(path=f'{OUT}/{n}.png')
    async def pick(t):
      c=pg.locator('.choices button',has_text=t).first;await c.wait_for(timeout=40000);await c.click();await c.click()
    novec="!document.querySelector('#app svg')"
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(600)
    assert await pg.locator('.tslot.owl .px-echo.owl').count()==1 and await pg.evaluate(novec),'setup card owl is pixel';await shot('setup')
    await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(400);await pg.click('#tree')
    seen=set()
    for _ in range(80):
      c=await pg.evaluate("(document.querySelector('#cr .px-echo')||{})._col");seen.add(c)
      if c=='ev0:7':await shot('arrival-mid')
      await pg.wait_for_timeout(40)
    assert any(str(x).startswith('ev0:') for x in seen),seen
    assert 'whimber_' in await pg.evaluate("document.querySelector('#cr .px-echo').style.backgroundImage")
    await pg.wait_for_timeout(1500);await shot('arrival-end')
    c=pg.locator('.choices button').first;await c.wait_for(timeout=40000);await c.click();await c.click();await pg.wait_for_timeout(3000)
    await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML=''")
    assert await pg.locator('#sc .px-echo.owl').count()==1 and await pg.locator('.fortprop.hollow').count()==1 and await pg.evaluate(novec),('home pixel owl + hollow',await pg.locator('#sc .px-echo.owl').count(),await pg.locator('.fortprop.hollow').count(),await pg.evaluate(novec),await pg.evaluate('__echo.state.scene'));await shot('home')
    # care frames: feed -> eat columns, hug -> pet columns
    await pg.click('#feed');await pg.locator('.choices button').first.click();await pg.wait_for_timeout(150)
    await pg.wait_for_timeout(1200);await pg.evaluate("document.getElementById('overlay').innerHTML='';PIXEL.react(document.querySelector('#cr .px-echo'),'eat')")
    cols=set()
    for _ in range(14):cols.add(await pg.evaluate("(document.querySelector('#cr .px-echo')||{})._col"));await pg.wait_for_timeout(83)
    assert cols&{12,13},('eat frames',cols);await shot('care-feed')
    for _ in range(6):
      if await pg.locator('.full button').count():await pg.locator('.full button').first.click();await pg.wait_for_timeout(300)
    await pg.evaluate("document.getElementById('overlay').innerHTML=''")
    # picker (Night Sky cut): Starlight Pairs (signature) + Hollow Builder on day 1
    await pg.click('#play');await pg.wait_for_timeout(300);labels=await pg.locator('.choices button').all_inner_texts();print('picker',labels);await shot('picker')
    assert any('Starlight Pairs' in l for l in labels) and any('Hollow Builder' in l for l in labels) and not any('Night Sky' in l for l in labels)
    await pg.evaluate("document.getElementById('overlay').innerHTML=''")
    # Starlight Pairs (first game ever: easy 12, Whimber deck + back)
    await pg.evaluate("document.getElementById('overlay').innerHTML=''");await pg.click('#play');await pick('Starlight Pairs');await pg.wait_for_timeout(500)
    g=await pg.evaluate("({n:__mem.cards.length,items:[...new Set(__mem.cards.map(c=>c.item))]})");print('pairs',g)
    assert g['n']==12 and 'star' in g['items'] and 'moon' in g['items']
    assert 'whimber_back' in await pg.evaluate("document.querySelector('.mcardbtn').style.backgroundImage")
    
    for i in range(12):
      if await pg.evaluate(f"__mem.cards[{i}].paired"):continue
      j=await pg.evaluate(f"MemoryEngine.partner(__mem,{i})");await pg.evaluate(f"__memTap({i})");await pg.wait_for_timeout(120);await pg.evaluate(f"__memTap({j})");await pg.wait_for_timeout(300)
      if i==3:await shot('starlight-pairs')
    await pg.wait_for_timeout(500);await shot('starlight-pairs-cleared');assert await pg.evaluate("__mem.done")
    assert await pg.evaluate("!!__echo.state.sigDay"),'Starlight Pairs now gives the daily +3'
    await pg.wait_for_timeout(3500)
    for _ in range(6):
      if await pg.locator('.full button').count():await pg.locator('.full button').first.click();await pg.wait_for_timeout(300)
    # Hollow Builder: one floor using the engine directly, hollow tiles
    await pg.evaluate("document.querySelectorAll('.bondup').forEach(x=>x.remove());__echo.state.bondShown=5;document.getElementById('overlay').innerHTML='';__echo.fortBuilder(0)");await pg.wait_for_timeout(500)
    assert 'Hollow' in await pg.inner_text('.top b')
    for _ in range(40):
      if await pg.evaluate("__fort.done"):break
      await pg.click('#kB');await pg.wait_for_timeout(90)
      if _==6:await shot('hollow-builder')
    srcs=await pg.evaluate("performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('/px/hollow/'))");assert srcs,'hollow tiles loaded'
    await pg.click('#quit');await pg.wait_for_timeout(500)
    # handheld view shows Whimber
    await pg.goto(URL+'handheld.html?echo=whimber&grid=1');await pg.wait_for_timeout(1200);await shot('handheld')
    hh=await pg.evaluate("performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/whimber_/.test(n)).length");assert hh>=20,hh
    print('ERR',errs,'404',bad);assert not errs and not bad;await b.close();print('whimber playthrough OK')
asyncio.run(main())
