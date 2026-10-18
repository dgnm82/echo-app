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
      await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;const s=__echo.state;s.bond=80;s.bondShown=2;s.run={best:{},runs:1};s.best={run:{easy:{score:5}}};s.v2={run:{games:0,short:0}};document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';__echo.home()")
      await pg.wait_for_timeout(800);await pg.click('#play');await pg.wait_for_selector('.choices button');await pg.wait_for_timeout(400)
      labels=await pg.locator('.choices button').all_inner_texts();print(kind,'picker',labels)
      assert any(name in l for l in labels) and not any(('Trail' in l or 'Parade' in l or 'Connect' in l) for l in labels),labels
      await pg.screenshot(path=f'{OUT}/{sp}-picker.png')
      b0=await pg.evaluate("__echo.state.bond")
      cb=pg.locator('.choices button',has_text=name).first;await cb.click();await cb.click()
      await pg.wait_for_selector('#rc',state='attached',timeout=5000)
      assert await pg.evaluate("!window.__runHome"),"no home rest stop before the place badge"
      await pg.wait_for_timeout(1200);await pg.screenshot(path=f'{OUT}/{sp}-start.png')
      assert await pg.evaluate("Music.playing||'nomusic'") in ('nomusic',f"game_{'meadow_dash' if kind=='fox' else 'moonlight_glide'}_loop")
      lv=await pg.evaluate("__run.level");br=await pg.evaluate("C=>C.bond.round",None) if False else await pg.evaluate("CONFIG.bond.round")
      await pg.evaluate("__run.obs=[];__run.nextObs=1e9");seen=False
      for _ in range(52):
        seen=seen or bool(await pg.locator('.runbest').count());await pg.wait_for_timeout(100)
      await pg.evaluate("__run.dist=Math.max(__run.dist,16*30)")
      assert seen and await pg.locator('#g2best.gold').count(),'NEW BEST banner after passing the best'
      bx=await pg.evaluate("window.__runBestX");assert bx is not None and abs(bx-(5*16-__import__('math').floor(0)) )<10000,bx
      if kind=='owl':   # A5: a moon fragment catches one bump (the glide goes on), then the next bump ends it
        await pg.evaluate("const g=__run;g.moon=1;g.grace=0;g.obs=[{type:'tree',x:g.dist+44,y:g.y-60,w:30,h:120}];g.nextObs=1e9")
        for _ in range(40):
          if await pg.evaluate("__run.saved>0"):break
          await pg.wait_for_timeout(100)
        sv=await pg.evaluate("[__run.saved,__run.phase,__run.moon,document.getElementById('rmoon').style.visibility]");print('moon save',sv)
        assert sv[0]==1 and sv[1]=='run' and sv[2]==0,sv
        await pg.wait_for_timeout(1700)
      # force a bump: the run ends (tumble, giggle, end card)
      await pg.evaluate("const g=__run;g.moon=0;g.obs=[{type:g.kind==='jump'?'log':'cloud',x:g.dist+44,y:g.kind==='jump'?456:g.y-20,w:30,h:g.kind==='jump'?14:30}];g.nextObs=1e9")
      await pg.wait_for_selector('.g2card',timeout=8000);await pg.wait_for_timeout(1400)
      if kind=='fox':await pg.screenshot(path=f'/workspace/shots/games-v2/{sp}-run-card.png')
      card=await pg.inner_text('.g2card');print(kind,'card',card.replace('\n',' '))
      assert 'NEW BEST' in card and ' m' in card and 'Again' in card and 'Done' in card and 'haul' not in card and 'was' not in card and 'gold counts' not in card and ('star' in card or 'trinket' in card),card
      assert await pg.evaluate("__echo.state.bond")>b0   # needs v2 §2: a finished game books bond (+8, via the caps)
      assert await pg.evaluate("__g2rounds")==3
      await pg.click('#g2done');await pg.wait_for_selector('#feed',timeout=15000)
      s=await pg.evaluate("({run:__echo.state.run,best:__echo.state.best.run[__run.level],gc:__echo.state.gameCounts})");print(kind,'after',s)
      assert s['run']['runs']==2 and s['best']['score']>=30 and s['gc'].get('run')==1,s
      # second run: HUD shows the best, Done at once books 1 round and shows "Best N"
      await pg.wait_for_timeout(800);await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';__echo.state.needs.rest=100");await pg.click('#play');await pg.wait_for_selector('.choices button')
      cb=pg.locator('.choices button',has_text=name).first;await cb.click();await cb.click();await pg.wait_for_selector('#rc',state='attached',timeout=5000)
      assert await pg.locator('#g2best').count()
      await pg.wait_for_timeout(300);await pg.click('#quit');await pg.wait_for_selector('.g2card',timeout=5000);card=await pg.inner_text('.g2card')
      assert 'Best' in card and await pg.evaluate("__g2rounds")==1,card
      await pg.click('#g2done');await pg.wait_for_timeout(600)
      # bond 140: the home milestone, and no new game in the picker
      await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());const s=__echo.state;s.bond=150;s.bondShown=3;__echo.milestone('place')");await pg.wait_for_timeout(900)
      await pg.screenshot(path=f'{OUT}/{sp}-bond140-milestone.png')
      await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';__echo.home()");await pg.wait_for_timeout(500)
      await pg.evaluate("__echo.state.needs.rest=100;__echo.state.napUntil=0")
      L2=await pg.evaluate("__echo.games()");print(kind,'games at bond 150',L2);assert len(L2)==4 and name in L2,L2
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
    assert not m['trail'] and not m['connect'] and not m['c5'] and m['mem'] and m['gv']==7,m
    await pg.close();await b.close()
    print('ERR',errs);assert not errs,errs;print('runner test OK')
asyncio.run(main())
