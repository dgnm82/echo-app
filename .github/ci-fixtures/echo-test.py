import asyncio
from playwright.async_api import async_playwright
URL=__import__('sys').argv[1] if len(__import__('sys').argv)>1 else 'http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=await b.new_page(**p.devices['iPhone 13'])
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    async def dismiss(n=20):
      for _ in range(n):
        if await pg.locator('.full button').count(): await pg.locator('.full button').first.click();await pg.wait_for_timeout(800)
        else: break
    async def choose(txt,timeout=40000):
      c=pg.locator('.choices button',has_text=txt).first;await c.wait_for(timeout=timeout);await c.click()
    async def clearov(): await pg.evaluate("document.getElementById('overlay').innerHTML=''")
    async def dev(btn):
      await dismiss();await clearov()
      if not await pg.locator('#dbg').count(): print('NOHOME',(await pg.inner_text('#app'))[:300]);await pg.screenshot(path='/workspace/shots/fail.png')
      await pg.click('#dbg');await pg.click(btn);await pg.wait_for_timeout(600)
    for kind,sel in [('fox','#bush'),('owl','#tree')]:
      await pg.goto(URL);await pg.evaluate('window.__wiped=1;localStorage.clear();localStorage.setItem("echo-nosetup","1")');await pg.reload()
      await pg.fill('#nick','Dani');await pg.uncheck('#voice');await pg.click('#go')
      await pg.click(sel);await pg.wait_for_timeout(4500);await choose('Hi');await pg.wait_for_timeout(2600)
      await pg.screenshot(path=f'/workspace/shots/{kind}-1home.png')
      await pg.click('#feed');await pg.locator('.choices button').first.click();await pg.wait_for_timeout(500);await dismiss();await clearov()
      await pg.click('#play')
      if True:
        await choose('Shiny Pairs' if kind=='fox' else 'Moonlight Pairs');await pg.wait_for_timeout(500)
        n=await pg.evaluate("__mem.cards.length");print('shiny pairs cards',n,'level',await pg.evaluate("__mem.level"))
        for i in range(n):
          if await pg.evaluate(f"__mem.cards[{i}].paired"):continue
          j=await pg.evaluate(f"MemoryEngine.partner(__mem,{i})");await pg.evaluate(f"__memTap({i})");await pg.wait_for_timeout(120);await pg.evaluate(f"__memTap({j})");await pg.wait_for_timeout(250)
          if i==2: await pg.screenshot(path=f'/workspace/shots/{kind}-2game.png')
        assert await pg.evaluate("__mem.done"),'shiny pairs board cleared'
        await pg.wait_for_timeout(3200)
      for r in range(0):
        await pg.wait_for_timeout(600)
        if kind=='fox':
          for i in range(5):
            s=pg.locator('#gs .spot').nth(i)
            if await s.count() and await s.get_attribute('class')=='spot': await s.click()
            if await pg.locator('#gs .spot',has_text='💎').count(): break
        else:
          n=await pg.locator('.star').count();print('round',r,'stars',n,await pg.inner_text('.top'))
          for i in range(n):
            try: await pg.locator('.star').nth(i).click(timeout=4000)
            except Exception as ex: print('FAIL',i,await pg.inner_text('#app'));await pg.screenshot(path='/workspace/shots/fail.png');raise
          await pg.wait_for_timeout(300);c=pg.locator('.choices button').first;await c.click()
        if r==0: await pg.screenshot(path=f'/workspace/shots/{kind}-2game.png')
        await pg.wait_for_timeout(2500)
      await pg.wait_for_timeout(800);await dismiss()
      await dev('#b2')
      for _ in range(60):   # the 4->5 bond-up celebration plays first on Home; tap through it
        await pg.wait_for_timeout(500)
        if not await pg.evaluate("!!document.querySelector('canvas.bondup')"):break
        await pg.mouse.click(200,300)
      await dismiss(30);await clearov()
      await pg.evaluate("CONFIG.farewell={calmAfterMs:0,lineMs:200,thanksWindowMs:800};(()=>{const d=new Date();__echo.state.clockOffset=(__echo.state.clockOffset||0)+((11-d.getHours()+24)%24)*36e5})()")
      async def calm():
        await clearov();await dismiss();await pg.evaluate('Object.assign(window.__echo.state.needs,{food:50,play:80,rest:80,comfort:80});window.__echo.state.napUntil=0');await pg.click('#feed');await pg.locator('.choices button').first.click()
      async def answer(until):
        for _ in range(200):
          if await pg.evaluate(until):return
          if await pg.evaluate("!!(window.Dialogue&&Dialogue.waiting&&Dialogue.waiting())"):await pg.evaluate("Dialogue.advance()")   # Batch H / H13: lines stay up >= 6.5 s; tap-to-advance like a kid would
          if await pg.locator('.choices button').count():
            try:
              c=pg.locator('.choices button').first;await c.click(timeout=800)
            except Exception:pass
          await pg.wait_for_timeout(200)
        raise AssertionError(until)
      await calm();await answer("!!document.querySelector('.fwlist')");await dismiss()
      await pg.screenshot(path=f'/workspace/shots/{kind}-3ready.png')
      if kind=='fox':
        await pg.click('#rel');await choose("Let's go together")
      else:
        for d in range(2):await dev('#b7')
        await calm();await choose('Not yet');await pg.wait_for_timeout(800)
        st=await pg.evaluate('window.__echo.state');print('grace set',st['fw']['state']=='grace')
        for d in range(4):await dev('#b7')
        await calm();await pg.screenshot(path=f'/workspace/shots/{kind}-4grace-forced.png')
        await choose('One more hug');await pg.wait_for_timeout(2800);await choose("Let's go")
      await choose('',timeout=60000)  # gift
      await pg.locator('#fwkeep').wait_for(timeout=30000);await pg.click('#fwkeep')
      await choose('Hug');await choose('Okay',timeout=60000)
      await pg.locator('.full button').wait_for(timeout=30000);await pg.screenshot(path=f'/workspace/shots/{kind}-5closure.png');await pg.locator('.full button').click()
      await pg.locator('.full [data-i]').first.click();await pg.click('#ok');await pg.locator('.full button').click();await pg.click('.book #x')
      for d in range(8):
        await pg.click('#pc');await pg.wait_for_timeout(300)
      await pg.screenshot(path=f'/workspace/shots/{kind}-6checkin.png')
      await pg.click('#book');await pg.screenshot(path=f'/workspace/shots/{kind}-7book.png',full_page=True)
      st=await pg.evaluate('window.__echo.state')
      print(kind,st['g']['name'],'bond',st['bond'],'talents',st['talents'],'path',st['fw'].get('path'),'gift',st.get('gift'),'letters',len(st['postcards']),'feelings',st.get('feelings'))
    print('ERRORS:',errs);await b.close()
asyncio.run(main())
