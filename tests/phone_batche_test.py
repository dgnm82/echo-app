# Batch E playtest fixes: E1 picker names one size (Snow leopard wraps), E2-E4 origin copy, E5 "Can you sing me your song?" plays the tune,
# E6 no "undefined" in the comfort menu (snow leopard), E7 games always playable (3rd = just for fun) + full/not-sleepy explain, E8 tower trims fall in world space.
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/batche';os.makedirs(OUT,exist_ok=True)
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)
CLEAN="document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''"
SPY="window.__os=[];const _o=Music.oneShot;Music.oneShot=(n,o)=>{__os.push(n);return _o(n,o)};0"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and errs.append('404 '+r.url))
    async def T(sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
    txt=lambda:pg.evaluate("document.querySelector('.scene.ob,#app').innerText")
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600);await T('#obgo',400)
    for _ in range(6):
      if await pg.locator('#obnm').count():break
      await T('.scene.ob',200)
    await pg.fill('#obnm','Mia');await T('#obnext');await T('#obyes');await T('.obagebtn >> nth=1')
    # E1
    sp=await pg.evaluate("[...document.querySelectorAll('.orcard span')].map(s=>[s.textContent,getComputedStyle(s).fontSize,s.scrollWidth<=s.parentElement.clientWidth,(()=>{const r=document.createRange();r.selectNodeContents(s);return new Set([...r.getClientRects()].map(q=>Math.round(q.top))).size})()])")
    check(len({x[1] for x in sp})==1,'one font size '+str({x[1] for x in sp}));check(all(x[2] for x in sp),'every name fits its card '+str([x[0] for x in sp if not x[2]]))
    sl=[x for x in sp if x[0]=='Snow leopard'][0];one=[x for x in sp if x[0]=='Cat'][0];check(sl[3]==2 and one[3]==1,'Snow leopard wraps to 2 lines '+str((sl,one)))
    await pg.evaluate("document.querySelector('.orcard[data-a=snowleopard]').scrollIntoView()");await pg.screenshot(path=f'{OUT}/e1-picker.png')
    await T('.orcard[data-a=snowleopard]');await T('#ornext',300);await T('.orchip[data-c=white]',900)
    check('Do you want to ask it to come with you?' in await txt(),'E2 invite line');await pg.screenshot(path=f'{OUT}/e2-invite.png')
    await T('#orinv');await T('#orinv',3000);t=await txt()
    check("I'm a Purrling! I'm the Echo of a cat, big and small!" in t,'E3 family line');check('Your snow leopard is glowing with its song! The more you play together, the bigger and brighter its song will glow!' in t,'E4 keep line')
    await pg.screenshot(path=f'{OUT}/e3-e4-family.png')
    await T('#ornm',400);await T('#orkeep');await T('#orkeep',1500);await pg.evaluate(SPY)
    # E5: answer the setup talk, pick "Can you sing me your song?"
    sang=False
    for _ in range(150):
      c=pg.locator('.choices button',has_text='Can you sing me your song?')
      if await c.count():
        check(not await pg.locator('.choices button',has_text='still sing').count(),'old choice gone');await c.first.click();await c.first.click();break
      if await pg.locator('.choices button').count():
        try:x=pg.locator('.choices button').first;await x.click(timeout=800);await x.click(timeout=800)
        except Exception:pass
      await pg.wait_for_timeout(200)
    for _ in range(60):
      if 'Okay! Listen...' in await pg.evaluate("document.getElementById('b').textContent"):sang=True;break
      await pg.wait_for_timeout(100)
    check(sang,'E5 says Okay! Listen...');await pg.wait_for_timeout(8000)
    n=await pg.evaluate("__os.filter(x=>/notes\\/twitchel_/.test(x)).length");check(n>=12,f'E5 the tune plays ({n} notes)')
    await pg.wait_for_timeout(6000);await pg.evaluate(CLEAN+";CONFIG.ambientMin=999;CONFIG.ambientMax=999")
    # E6
    for i in range(6):
      await pg.evaluate(CLEAN);await T('#comfort',400);L=await pg.evaluate("[...document.querySelectorAll('.choices button')].map(b=>b.textContent)")
      check(len(L)==3 and not any('undefined' in l for l in L),'E6 comfort menu '+str(L))
    await pg.screenshot(path=f'{OUT}/e6-comfort.png');await pg.evaluate(CLEAN)
    # E7: feed full / not sleepy explain themselves; games always open, the 3rd is just for fun (no bond)
    await pg.evaluate("__echo.state.needs.food=100");await T('#feed',400);check(await pg.evaluate("document.getElementById('b').textContent")=="My tummy's full! Let's play instead?",'E7 full line')
    await pg.evaluate(CLEAN+";__echo.state.napUntil=0;__echo.state.needs.rest=40");await T('#rest',600);await pg.wait_for_timeout(1500)
    await pg.evaluate(CLEAN+";__echo.state.napUntil=0;__echo.home()");await pg.wait_for_timeout(1200);await pg.evaluate(CLEAN);await T('#rest',400)
    check(await pg.evaluate("document.getElementById('b').textContent")=="I'm not sleepy yet! Let's play?",'E7 not-sleepy line')
    for i in range(4):
      await pg.evaluate(CLEAN+";__echo.state.napUntil=0;Object.assign(__echo.state.needs,{food:70,rest:90,play:30});__echo.home()");await pg.wait_for_timeout(900);await pg.evaluate(CLEAN)
      await T('#play',500);L=await pg.evaluate("[...document.querySelectorAll('.choices button')].map(b=>b.textContent)");check(any('Cozy Pairs' in l for l in L),f'E7 game {i+1} picker opens')
      b0=await pg.evaluate("__echo.state.bond");c=pg.locator('.choices button',has_text='Cozy Pairs').first;await c.click();await c.click();await pg.wait_for_timeout(1200)
      if i>=2:check(await pg.evaluate("__echo.funOnly()"),f'E7 game {i+1} is just for fun')
      else:check(not await pg.evaluate("__echo.funOnly()"),f'E7 game {i+1} gives bond')
      await T('#quit',2500)
      if i>=2:check(await pg.evaluate("__echo.state.bond")==b0,f'E7 game {i+1}: no bond')
    # E8: tower trims fall in world space and leave quickly
    await pg.evaluate(CLEAN+";__echo.state.bond=CONFIG.unlock.stack+5;__echo.state.lowfx=false;__echo.home()");await pg.wait_for_timeout(900);await pg.evaluate(CLEAN)
    await T('#play',500);c=pg.locator('.choices button',has_text='Cushion Tower').first;await c.click();await c.click();await pg.wait_for_timeout(1500)
    if await pg.locator('.choices button').count():
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(800)
    await pg.evaluate("__stack.sx=__stack.top+(__stack.w/3);__stackPress()");w=await pg.evaluate("__stackBits()");check(len(w)>=1,'E8 a trim piece')
    await pg.wait_for_timeout(200);w2=await pg.evaluate("__stackBits()");check(w2 and w2[0]['wy']>w[0]['wy'] and w2[0]['a']<1,'E8 falls + fades '+str((w,w2)))
    await pg.screenshot(path=f'{OUT}/e8-trim.png');await pg.wait_for_timeout(1500);check(await pg.evaluate("__stackBits().length")==0,'E8 gone within ~1.7 s')
    await b.close();check(not errs,'no errors/404s '+str(errs[:3]))
  print(f'{ok}/{ok+len(bad)} batch E checks passed');sys.exit(1 if bad else 0)
asyncio.run(main())
