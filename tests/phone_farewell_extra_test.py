# Farewell grown-up options (farewell_arc.md §10, decision 8): "Let {name} stay a while" pauses the arc (no Echo-led ask, no session-day
# counting); "Shared device" shows the UI card before C1, "I'll go get {child}" returns Home with no grace day used, "Yes" starts the walk.
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/fwx';os.makedirs(OUT,exist_ok=True)
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for kind in ('fox','owl'):
      pg=await b.new_page(**p.devices['iPhone 13'])
      pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload()
      await pg.fill('#nick','Dani');await pg.click('#go');await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(3800)
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
      await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;CONFIG.farewell={calmAfterMs:0,lineMs:220};__echo.state.bondShown=5")
      await pg.wait_for_timeout(500)
      # pause: state grace, a new day would count -> must not
      r=await pg.evaluate("(()=>{const f=__echo.fw.s;f.state='grace';f.askedDay='2000-01-01';f.graceDays=[];f.paused=true;__echo.fw.session();const a=f.graceDays.length;const c=__echo.fw.calm();f.paused=false;__echo.fw.session();return [a,c,f.graceDays.length]})()")
      assert r[0]==0 and r[1]==False and r[2]==1,('pause',r)
      await pg.evaluate("(()=>{const f=__echo.fw.s;f.state='walking';f.graceDays=['a','b','c','d'];__echo.state.fwShared=true})()")
      await pg.evaluate("__echo.fw.start('child')");await pg.wait_for_selector('.fwshared',timeout=5000);await pg.wait_for_timeout(1500)
      await pg.screenshot(path=f'{OUT}/{kind}-shared-card.png')
      await pg.click('#fsn');await pg.wait_for_selector('#feed',timeout=5000)
      st=await pg.evaluate("[__echo.fw.s.state,__echo.fw.s.graceDays.length]");assert st==['walking',4],('goget',st)
      await pg.evaluate("__echo.fw.start('child')");await pg.click('#fsy');await pg.wait_for_selector('.fwscene',timeout=8000)
      await pg.wait_for_timeout(1500);await pg.screenshot(path=f'{OUT}/{kind}-shared-yes-ceremony.png')
      assert await pg.evaluate("__echo.fw.s.state")=='ceremony'
      print(kind,'pause + shared device OK');await pg.close()
    await b.close()
  print('ERR',errs);assert not errs
asyncio.run(main())
