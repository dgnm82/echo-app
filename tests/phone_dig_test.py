# Den Dig / Nest Weave: list names, fill to the top -> happy end -> card (points/rows/level), NEW BEST on 2nd game, flat reward, no fail words; lowfx pass
import asyncio,sys,re
from playwright.async_api import async_playwright
URL='http://localhost:8765/';BAD=re.compile(r'game over|\blose\b|\blost\b|fail|try again|tetri|top out',re.I)
async def run(b,p,kind,low):
  pg=await b.new_page(**p.devices['iPhone 13']);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status==404 and errs.append('404 '+r.url))
  await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2500)
  name='Den Dig' if kind=='fox' else 'Nest Weave'
  await pg.evaluate(f"document.getElementById('overlay').innerHTML='';const S=__echo.state;S.lowfx={1 if low else 0};S.bond=300;S.needs.play=0")
  for gi in range(2):
    await pg.evaluate("document.getElementById('overlay').innerHTML='';__echo.linesGame()");await pg.wait_for_timeout(400)
    assert name in await pg.inner_text('.top b')
    if gi==1:   # score more on the 2nd game: clear rows
      await pg.evaluate("(()=>{const g=__dig;for(let r=0;r<2;r++)g.grid[g.h-1-r]=Array(g.w).fill('dirt').map((c,x)=>x<g.w-1?c:null);})()")
      await pg.evaluate("(()=>{const g=__dig;g.piece.cells=[[0,0],[0,1]];g.piece.x=g.w-1;LinesEngine.drop(g);__digAfter()})()");await pg.wait_for_timeout(100)
      assert await pg.evaluate("__dig.lines")==2
    b0=await pg.evaluate("__echo.state.bond")
    for _ in range(80):
      if await pg.evaluate("__dig.done"):break
      await pg.click('#kB');await pg.wait_for_timeout(40)
    await pg.wait_for_timeout(300);assert await pg.locator('.dgspark').count()==8 and await pg.locator('.dgprop').count()==0,'celebration (sparkles, no den/nest picture over the card)'
    await pg.wait_for_timeout(1500);card=await pg.inner_text('.g2card');print(kind,low,gi,card.replace('\n',' | '))
    assert ('DEN' if kind=='fox' else 'NEST') in card and 'rows' in card and 'level' in card,card
    if gi==1:assert 'NEW BEST' in card,card
    assert not BAD.search(await pg.inner_text('body')),'fail words'
    await pg.locator('.g2card button').last.click();await pg.wait_for_timeout(500)
  assert not errs,errs;await pg.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    await run(b,p,'fox',False);await run(b,p,'owl',False);await run(b,p,'fox',True)
    await b.close();print('dig test OK')
asyncio.run(main())
