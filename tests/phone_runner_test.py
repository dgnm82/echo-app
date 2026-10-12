# Runner phone test (spec v0.6 §3): picker at bond 70 shows the runner (no Trail / Connect), Meadow Dash / Moonlight Glide start, mid-run,
# NEW BEST, rest-stop score card, rewards; bond 140 = home milestone only (no new game); old saves with trail/connect state migrate.
# Usage: python3 tests/phone_runner_test.py [base-url] [shots-dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/runtest';os.makedirs(OUT,exist_ok=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind,sel,name in (('fox','#bush','Meadow Dash'),('owl','#tree','Moonlight Glide')):
      sp='slyte' if kind=='fox' else 'whimber'
      pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and errs.append('404 '+r.url))
      pg.on('console',lambda m:m.type=='error' and errs.append('console '+m.text))
      await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload()
      await pg.fill('#nick','Dani');await pg.click('#go');await pg.click(sel);await pg.wait_for_timeout(3800)
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2500)
      await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;const s=__echo.state;s.bond=80;s.bondShown=2;s.run={best:{easy:5},runs:1};document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';__echo.home()")
      await pg.wait_for_timeout(800);await pg.click('#play');await pg.wait_for_selector('.choices button');await pg.wait_for_timeout(400)
      labels=await pg.locator('.choices button').all_inner_texts();print(kind,'picker',labels)
      assert any(name in l for l in labels) and not any(('Trail' in l or 'Parade' in l or 'Connect' in l) for l in labels),labels
      await pg.screenshot(path=f'{OUT}/{sp}-picker.png')
      b0=await pg.evaluate("__echo.state.bond")
      cb=pg.locator('.choices button',has_text=name).first;await cb.click();await cb.click()
      await pg.wait_for_selector('#rc',state='attached',timeout=5000);await pg.evaluate("__run.L=Object.assign({},__run.L,{stretch:6})")
      await pg.wait_for_timeout(1200);await pg.screenshot(path=f'{OUT}/{sp}-start.png')
      assert await pg.evaluate("Music.playing||'nomusic'") in ('nomusic',f"game_{'meadow_dash' if kind=='fox' else 'moonlight_glide'}_loop")
      # play: tap / hold on the play area
      box=await pg.locator('#gs').bounding_box();x,y=box['x']+box['width']/2,box['y']+box['height']*.6
      for i in range(14):
        await pg.mouse.move(x,y);await pg.mouse.down();await pg.wait_for_timeout(260 if kind=='owl' else 60);await pg.mouse.up();await pg.wait_for_timeout(200)
        if i==6:await pg.screenshot(path=f'{OUT}/{sp}-mid-run.png')
      st=await pg.evaluate("({d:__run.dist,t:__run.treasures+__run.gold,b:__run.bumps,s:__run.stretch,ph:__run.phase})");print(kind,'mid',st)
      assert st['d']>200,st
      for _ in range(80):
        if await pg.locator('.runbest').count():await pg.screenshot(path=f'{OUT}/{sp}-new-best.png');break
        await pg.wait_for_timeout(100)
      await pg.wait_for_selector('.runcard',timeout=30000);await pg.wait_for_timeout(300);await pg.screenshot(path=f'{OUT}/{sp}-finale.png')
      card=await pg.inner_text('.runcard');print(kind,'card',card.replace('\n',' '))
      await pg.wait_for_selector('#feed',timeout=15000)
      s=await pg.evaluate("({bond:__echo.state.bond,run:__echo.state.run,mem:__echo.state.memories.map(m=>m.text||m).slice(-3),gc:__echo.state.gameCounts})");print(kind,'after',s)
      assert s['bond']>=b0+12-1 and s['run']['runs']==2 and s['run']['best']['easy']>5 and s['gc'].get('run')==1,s
      # bond 140: the home milestone, and no new game in the picker
      await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());const s=__echo.state;s.bond=150;s.bondShown=3;__echo.milestone('place')");await pg.wait_for_timeout(900)
      await pg.screenshot(path=f'{OUT}/{sp}-bond140-milestone.png')
      await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';__echo.home()");await pg.wait_for_timeout(500)
      await pg.evaluate("__echo.state.needs.rest=100;__echo.state.napUntil=0")
      L2=await pg.evaluate("__echo.games()");print(kind,'games at bond 150',L2);assert len(L2)==3 and name in L2,L2
      await pg.close()
    # migration: an old save with trail / connect state and counts
    pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload()
    await pg.fill('#nick','Dani');await pg.click('#go');await pg.click('#bush');await pg.wait_for_timeout(3800)
    c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(1500)
    await pg.evaluate("const s=__echo.state;s.trail={games:3};s.connect={games:9};s.connectLevel='easy';s.vars.connect5=true;s.gameCounts={connect:9,trail:3,pairs:2};s.memories.push({text:'We gathered big bunches of berries together',tag:'connect_big',t:Date.now()});delete s.gv;localStorage.setItem('echo-save-v1',JSON.stringify(s))")
    key=await pg.evaluate("Object.keys(localStorage).find(k=>{try{return JSON.parse(localStorage.getItem(k)).kind}catch(e){return false}})")
    await pg.evaluate(f"const s=__echo.state;localStorage.setItem('{key}',JSON.stringify(s))");await pg.reload();await pg.wait_for_timeout(2500)
    m=await pg.evaluate("(()=>{const s=__echo.state;return {trail:'trail' in s,connect:'connect' in s,c5:!!(s.vars||{}).connect5,mem:s.memories.some(m=>(m.text||m).includes('bunches')),gv:s.gv}})()");print('migrate',m)
    assert not m['trail'] and not m['connect'] and not m['c5'] and m['mem'] and m['gv']==6,m
    await pg.close();await b.close()
    print('ERR',errs);assert not errs,errs;print('runner test OK')
asyncio.run(main())
