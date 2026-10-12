import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';PFX=sys.argv[2] if len(sys.argv)>2 else '';OUT='/tmp/fortpt-'+PFX;
PLAY="""async (n)=>{for(let i=0;i<n&&window.__fort&&!__fort.done;i++){const g=__fort;if(!g.piece)break;
  let best=null;for(let r=0;r<4;r++){for(let x=-3;x<g.w;x++){const c=g.piece.cells;if(FortEngine.fits(g,c,x,g.piece.y)){let y=g.piece.y;while(FortEngine.fits(g,c,x,y+1))y++;const sc=y*10+c.reduce((a,p)=>a+p[1],0);if(!best||sc>best.sc)best={sc,x,r}}}FortEngine.rotate(g)}
  for(let r=0;r<best.r;r++)FortEngine.rotate(g);FortEngine.moveTo(g,best.x);document.getElementById('kB').click();await new Promise(r=>setTimeout(r,90))}}"""
async def run(b,dev,vp,errs,q=''):
  pg=await b.new_page(**vp);pg.on('pageerror',lambda e:errs.append(dev+':'+str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(dev+' console:'+m.text))
  await pg.goto(URL+q);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(600)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(400);await pg.click('#bush');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2600)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML=''");await pg.wait_for_timeout(300)
  await pg.screenshot(path=f'{OUT}{dev}-home-fort-frame.png')
  await pg.click('#play');await pg.wait_for_timeout(300);await pg.screenshot(path=f'{OUT}{dev}-play-picker.png')
  f=pg.locator('.choices button:has-text("Fort Builder")');await f.click();await f.click();await pg.wait_for_timeout(700)
  await pg.screenshot(path=f'{OUT}{dev}-start.png');res={'level':await pg.evaluate("__fort.level"),'board':await pg.evaluate("[__fort.w,__fort.h]")}
  # touch: tap the board to rotate, buttons to move, keyboard handheld keys
  await pg.click('#kL');await pg.click('#kA');await pg.keyboard.press('ArrowRight');await pg.keyboard.press('a');await pg.keyboard.press('b');await pg.wait_for_timeout(200)
  await pg.evaluate(PLAY,5);await pg.wait_for_timeout(300);await pg.screenshot(path=f'{OUT}{dev}-midgame.png')
  for r in range(3):
    await pg.evaluate(PLAY,80);await pg.wait_for_timeout(500)
    await pg.screenshot(path=f'{OUT}{dev}-round{r+1}-done.png');await pg.wait_for_timeout(2400)
  await pg.wait_for_timeout(1500);await pg.screenshot(path=f'{OUT}{dev}-home-after-game.png')
  if await pg.locator('.full.milestone').count():await pg.screenshot(path=f'{OUT}{dev}-milestone-after-game.png')
  for _ in range(5):
    if await pg.locator('.full button').count():await pg.locator('.full button').first.click();await pg.wait_for_timeout(500)
  await pg.screenshot(path=f'{OUT}{dev}-home-after-game.png')
  S=await pg.evaluate("({fort:__echo.state.fort,bond:__echo.state.bond,play:__echo.state.needs.play,mem:__echo.state.memories.slice(-2),games:0})");res['state']=S
  await pg.click('#book');await pg.wait_for_timeout(400);await pg.evaluate("document.querySelector('.book').scrollTop=document.querySelector('.fortbook').offsetTop-40");await pg.wait_for_timeout(200);await pg.screenshot(path=f'{OUT}{dev}-memory-book-fort.png')
  if dev=='phone':
    for _ in range(3):
      if await pg.locator('.book #x').count():await pg.click('.book #x')
    await pg.evaluate("__echo.state.fort.stage=2;__echo.state.napUntil=0;__echo.state.badges.push('place');__echo.state.bondShown=5;__echo.state.bond=150;document.querySelectorAll('.book,.full').forEach(e=>e.remove())")
    await pg.evaluate("__echo.fortBuilder(2)");await pg.wait_for_timeout(600);await pg.evaluate(PLAY,80);await pg.wait_for_timeout(700)
    await pg.screenshot(path=f'{OUT}reward-roof.png');await pg.wait_for_timeout(2600)
    for _ in range(5):
      if await pg.locator('.full button').count():await pg.locator('.full button').first.click();await pg.wait_for_timeout(500)
    await pg.wait_for_timeout(600);await pg.screenshot(path=f'{OUT}home-fort-finished-open.png')
    res['after_roof']=await pg.evaluate("({fort:__echo.state.fort,mem:__echo.state.memories.slice(-1)})")
  await pg.close();return res
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    r=await run(b,'phone',p.devices['iPhone 13'],errs);print('phone',r);assert r['state']['fort']['stage']==1 and r['after_roof']['fort']['stage']==3 and r['state']['fort']['rounds']==3
    print('desktop',await run(b,'desktop',{'viewport':{'width':1280,'height':900}},errs))
    print('handheld-board',await run(b,'handheld',{'viewport':{'width':480,'height':860}},errs,'?board=hh'))
    print('ERR',errs);await b.close()
    assert not errs, errs
    print('fort playthrough OK')
asyncio.run(main())
# (run via tools/check.sh --phone; asserts below run after the play-through prints)
