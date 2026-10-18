# Bond-up scene phone test (bond_up.md). Usage: python3 tests/phone_bondup_test.py [base-url] [screenshot-dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/butest';os.makedirs(OUT,exist_ok=True)
async def newecho(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
  await pg.add_init_script("window.__nb=0;addEventListener('DOMContentLoaded',()=>{if(window.NoteFX){const d=NoteFX.drawBurst;NoteFX.drawBurst=function(){__nb++;return d.apply(this,arguments)}}})")   # Batch C1: note burst counter
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove())");return pg
async def frames(pg,tag,want):
  got=set()
  for i in range(400):
    f=await pg.evaluate("window.__bondup?__bondup.frame:-1")
    for w in want:
      if w not in got and f>=w:got.add(w);await pg.screenshot(path=f'{OUT}/bondup-{tag}-f{w:02d}.png')
    if len(got)==len(want):break
    await pg.wait_for_timeout(25)
  return got
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    pg=await newecho(b,p,'fox',errs)
    assert await pg.evaluate("__echo.state.bondShown")==1
    # queue: never during a game
    await pg.evaluate("__echo.state.bond=130;__echo.linesGame()");await pg.wait_for_timeout(300)
    assert not await pg.evaluate("__echo.maybeBondUp()"),'no bond-up mid-game'
    await pg.click('#quit');await pg.wait_for_timeout(2500);await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove())")
    # back on Home: plays first, then the milestone card (the 'name' sticker milestone is due at bond 20)
    await pg.evaluate("__echo.state.badges=__echo.state.badges.filter(x=>x!=='place');__echo.home()")
    got=await frames(pg,'slyte-1to2',[3,10,20,30,35,38,45,60])
    assert len(got)==8,got
    # A3 (bondup_lines_v1): the banner shows a bond_up_title line (never the old words) or the wordless cheer
    bt=await pg.evaluate("(()=>{const b=document.querySelector('.bubanner b');return b&&[b.textContent,!!b.querySelector('.buhearts'),b.scrollWidth<=b.clientWidth+1]})()")
    pool=await pg.evaluate("Dialogue.lib.barks.bond_up_title.map(l=>l.text)")
    print('slyte title',bt);assert bt and 'BOND UP' not in bt[0].upper() and (bt[0] in pool or (bt[1] and '' in pool)) and bt[2],bt
    assert await pg.evaluate("__echo.state.bondShown")==2 and await pg.evaluate("__echo.state.bondMoments.length")==1
    # skip guard: a tap right away does nothing; later it jumps to the end state
    await pg.mouse.click(200,300);assert await pg.evaluate("!!window.__bondup")
    await pg.wait_for_timeout(5000);await pg.mouse.click(200,300);await pg.wait_for_timeout(600)
    assert not await pg.evaluate("!!window.__bondup"),'tap after the hold finishes it'
    await pg.wait_for_timeout(800);st=await pg.evaluate("document.querySelector('#cr .px-echo').dataset.stage");assert st=='2',st
    await pg.screenshot(path=f'{OUT}/bondup-slyte-after.png')
    # Memory Book replay
    await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove())");await pg.click('#book');await pg.wait_for_timeout(300)
    chip=await pg.inner_text('.book .bmom');assert chip.startswith('Closer! ') and 'Bond up' not in chip,chip
    await pg.locator('.book [data-replay]').first.scroll_into_view_if_needed();await pg.screenshot(path=f'{OUT}/bondup-memory-book.png')
    await pg.locator('.book [data-replay]').first.click();await pg.wait_for_timeout(1500);assert await pg.evaluate("!!window.__bondup");assert await pg.evaluate("__echo.state.bondMoments.length")==1
    await pg.wait_for_timeout(1000);await pg.mouse.click(200,300);await pg.wait_for_timeout(300);await pg.mouse.click(200,300);await pg.wait_for_timeout(500)
    # reduced effects: short cross-fade
    await pg.evaluate("__echo.state.lowfx=true;__echo.state.bond=260;document.querySelectorAll('.full').forEach(f=>f.remove());__echo.home()")
    got=await frames(pg,'slyte-lowfx',[6,12]);assert len(got)==2
    for i in range(80):
      if not await pg.evaluate("!!window.__bondup"):break
      await pg.wait_for_timeout(100)
    assert await pg.evaluate("__echo.state.bondShown")==3;await pg.close()
    # Whimber 3 -> 4 and the 4 -> 5 celebration (release untouched)
    pg=await newecho(b,p,'owl',errs)
    # every title fits the banner at 180x320, both families (render each into a banner)
    for fam in ('slyte','whimber'):
      fit=await pg.evaluate("""f=>fetch('dialogue/'+f+'.json').then(r=>r.json()).then(d=>d.barks.bond_up_title.map(l=>{const u=document.createElement('div');u.className='bondup-ui';u.innerHTML='<div class="bubanner"><b></b><span>Growing</span></div>';document.getElementById('screen').appendChild(u);const b=u.querySelector('b');b.textContent=l.text;const ok=[l.text,b.scrollWidth<=b.clientWidth+1,b.getBoundingClientRect().height/(u.querySelector('.bubanner').getBoundingClientRect().width/140)];u.remove();return ok}))""",fam)
      assert len(fit)==9 and sum(1 for f in fit if f[0]=='')==1 and all(f[1] for f in fit),(fam,fit);print(fam,'titles fit',len(fit))
    # the wordless cheer: 3 pixel hearts + a chirp
    await pg.evaluate("window.__chirps=0;const cp=Chirp.play;Chirp.play=function(t,k){if(t==='*')__chirps++;return cp.apply(this,arguments)};Dialogue.lib.barks.bond_up_title=Dialogue.lib.barks.bond_up_title.filter(l=>!l.text)")
    await pg.evaluate("__echo.state.bondShown=3;__echo.state.bond=380;__echo.home()")
    for i in range(80):
      if await pg.evaluate("!!document.querySelector('.bubanner')"):break
      await pg.wait_for_timeout(100)
    wc=await pg.evaluate("(()=>{const b=document.querySelector('.bubanner b');return [b.textContent.trim(),b.querySelectorAll('.buheart').length,__chirps,window.__butitle&&window.__butitle.gesture]})()")
    print('wordless',wc);assert wc[0]=='' and wc[1]==3 and wc[2]>=1 and wc[3]=='hum',wc
    await pg.wait_for_timeout(5000);await pg.mouse.click(200,300);await pg.wait_for_timeout(1000)
    await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove())")
    await pg.evaluate("__echo.state.bondShown=3;__echo.state.bond=380;__echo.home()");got=await frames(pg,'whimber-3to4',[20,30,38,45,60]);assert len(got)==5
    await pg.wait_for_timeout(5000);await pg.mouse.click(200,300);await pg.wait_for_timeout(1000)
    await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());__echo.state.bond=500;__echo.home()");got=await frames(pg,'whimber-4to5',[38,60]);assert len(got)==2
    assert await pg.evaluate("__echo.state.bondShown")==5 and not await pg.evaluate("__echo.state.releasePath")
    nb=await pg.evaluate('window.__nb');print('note burst frames',nb);assert nb>0,'bond-up note burst drew';await pg.close();print('ERR',errs);assert not errs;await b.close();print('bond-up test OK')
asyncio.run(main())
