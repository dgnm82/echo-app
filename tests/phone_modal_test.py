# Living Echo vs modals (Daniel's bug): while the Echo is wandering, open every modal and assert the sprite never covers it
# (elementFromPoint at the modal's text lands inside the modal) and that wandering pauses + the away sprite hides.
# Usage: python3 tests/phone_modal_test.py [base-url] [screenshot-dir] [tag]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/modal';TAG=sys.argv[3] if len(sys.argv)>3 else 'after'
os.makedirs(OUT,exist_ok=True);STRICT=TAG=='after'
CLEAN="document.querySelectorAll('.full,.book,.panel').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''"
# park the wandering sprite right under the point we test (worst case), keep it in its away state
PARK="(x,y)=>{const sc=document.getElementById('sc'),c=document.getElementById('cr');if(!sc||!c)return;const R=sc.getBoundingClientRect(),z=R.width/180;sc.classList.add('lvaway');c.style.setProperty('left',Math.round((x-R.left)/z)+'px','important');c.style.setProperty('bottom',Math.max(0,Math.round((R.bottom-y)/z)-24)+'px','important');c.style.zIndex='60';[c,...c.querySelectorAll('*')].forEach(e=>e.style.pointerEvents='auto')}"
HIT="(sel)=>{const m=document.querySelector(sel);if(!m)return 'missing';const t=m.querySelector('.mline,.mt,h1,h2,.hs,b,span,p')||m;const r=t.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;return [x,y]}"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[];bad=[]
    for kind,sel in (('owl','#tree'),('fox','#bush')):
      pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
      await pg.fill('#nick','Dani');await pg.click('#go');await pg.click(sel);await pg.wait_for_timeout(3800)
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
      await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;__echo.state.bondShown=5;__echo.state.bond=300;__echo.state.badges.push('place');"+CLEAN+";__echo.home()");await pg.wait_for_timeout(600)
      cases=[('talent card',"__echo.milestone('talent4')",'.full.milestone'),('Memory Book',"document.getElementById('book').click()",'.book'),
             ('How am I',"document.getElementById('how').click()",'.panel'),('game picker',"document.getElementById('play').click()",'#overlay .choices'),
             ('Our places',"__echo.scene.picker()",'.mcard.places'),('toast',"(()=>{const t=document.getElementById('toast');t.textContent='Tip: a toast';t.style.pointerEvents='auto';t.classList.add('on')})()",'#toast')]
      for name,open_js,msel in cases:
        await pg.evaluate(CLEAN+";document.getElementById('b').style.display='none';CONFIG.livingSpeed=.05;__echo.living.start(false)")
        for _ in range(120):
          if await pg.evaluate("__echo.living.st==='wander'"):break
          await pg.wait_for_timeout(100)
        await pg.wait_for_timeout(400);await pg.evaluate(open_js);await pg.wait_for_timeout(500)
        pt=await pg.evaluate(HIT,msel)
        if pt=='missing':bad.append((kind,name,'modal missing'));continue
        await pg.evaluate(f"({PARK})({pt[0]},{pt[1]})");await pg.wait_for_timeout(150)
        top=await pg.evaluate(f"(()=>{{const e=document.elementFromPoint({pt[0]},{pt[1]});return e&&e.closest('{msel}')?'modal':(e&&e.closest('#cr')?'SPRITE':(e?(e.tagName+'.'+e.className+'<'+(e.parentElement&&e.parentElement.id+'.'+e.parentElement.className)):'none'))}})()")
        hidden=await pg.evaluate("getComputedStyle(document.getElementById('cr')).visibility")
        st=await pg.evaluate("__echo.living.st")
        await pg.screenshot(path=f'{OUT}/{TAG}-{kind}-{name.replace(" ","-").lower()}.png')
        print(kind,name,'top:',top,'sprite',hidden,'living',st)
        if top!='modal':bad.append((kind,name,top))
        if STRICT and name!='toast' and name!='game picker' and st=='wander':bad.append((kind,name,'still wandering'))
        await pg.evaluate("CONFIG.livingSpeed=1;document.getElementById('toast').classList.remove('on')")
      await pg.close()
    print('ERR',errs,'BAD',bad);await b.close()
    if STRICT:assert not errs and not bad,(errs,bad);print('modal test OK')
asyncio.run(main())
