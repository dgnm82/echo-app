# Living Echo phone test (living_echo.md). Usage: python3 tests/phone_living_test.py [base-url] [screenshot-dir]
import asyncio,sys,os,json,re
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/lvtest';os.makedirs(OUT,exist_ok=True)
BAD=re.compile(r"\b(waited|waiting for you|missed you|miss you|where were you|lonely|you were gone|been gone|so long)\b",re.I)
for f in ('slyte','whimber'):
  d=json.load(open(f'dialogue/{f}.json'))['barks']
  for k,v in d.items():
    if k.startswith(('found_','routine_')):
      for l in v:assert not BAD.search(l['text']),(k,l['text'])
async def newecho(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('b').style.display='none'");return pg
async def until(pg,js,ms=8000):
  for i in range(ms//100):
    if await pg.evaluate(js):return True
    await pg.wait_for_timeout(100)
  return False
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind,nm in (('fox','slyte'),('owl','whimber')):
      pg=await newecho(b,p,kind,errs);L="__echo.living";HP=[90,199] if kind=='fox' else [90,133]   # Whimber home v2: stage on the limb
      assert await pg.evaluate(L+".st")=='present' and await pg.evaluate(L+".pos")==HP
      # Wander: idle -> walks/flies to a waypoint and does that spot's behaviour (shortened idle for the test)
      await pg.evaluate("CONFIG.livingSpeed=.05;__echo.living.start(false)")
      assert await until(pg,L+".st==='wander'&&!!"+L+".act",15000),'wandered'
      await pg.wait_for_timeout(300);await pg.screenshot(path=f'{OUT}/living-{nm}-wander-{await pg.evaluate(L+".act")}.png')
      pos=await pg.evaluate(L+".pos");assert pos!=HP,pos
      # Present: a care tap calls it back to the stage spot within ~2 s
      await pg.evaluate("CONFIG.livingSpeed=1");await pg.click('#feed');await pg.wait_for_timeout(2300)
      dbg=await pg.evaluate(L+'.dbg()');pos=await pg.evaluate(L+'.pos');assert pos==HP and dbg['st']=='present',(pos,dbg)
      # Routine: band change (evening -> the sunset routine for Slyte / lantern for Whimber; night -> moon yip / stargaze)
      await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';document.getElementById('b').style.display='none'")
      await pg.wait_for_timeout(3500);await pg.evaluate("document.getElementById('b').style.display='none'");await pg.evaluate(L+".routine('night')")
      assert await until(pg,L+".act==='"+('moon_yip' if kind=='fox' else 'stargaze')+"'",6000),await pg.evaluate(L+".act")
      await pg.wait_for_timeout(400);await pg.screenshot(path=f'{OUT}/living-{nm}-routine-night.png')
      # Found: reopen after 30 min away -> mid-activity at a waypoint, notices after 1.5 s with a found_* line, then comes over
      await pg.evaluate("__echo.state.last=Date.now()-30*6e4;__echo.state.napUntil=0;localStorage.setItem('echo-proto-v1',JSON.stringify(__echo.state));window.__wiped=1");await pg.reload();await pg.wait_for_timeout(1500)
      assert await pg.evaluate(L+".st")=='found',await pg.evaluate(L+".st");act=await pg.evaluate(L+".foundAct");await pg.screenshot(path=f'{OUT}/living-{nm}-found-{act}.png')
      assert await until(pg,"document.getElementById('b').style.display==='block'",3000);txt=await pg.inner_text('#b');print(nm,'found',act,'|',txt);assert not BAD.search(txt)
      await pg.screenshot(path=f'{OUT}/living-{nm}-found-noticed.png')
      assert await until(pg,L+".st==='present'&&JSON.stringify("+L+".pos)==="+repr(str(HP).replace(' ','')),8000),'came over after noticing'
      await pg.close()
    # playtest fixes: the need bubble is re-picked when a need is met, and follows the Echo while it moves
    pg=await newecho(b,p,'owl',errs)
    await pg.evaluate("const s=__echo.state;s.needs.food=10;s.needs.play=s.needs.rest=s.needs.comfort=90;s.napUntil=0;__echo.home()");await pg.wait_for_timeout(400)
    assert await pg.evaluate("(document.querySelector('#sc .thought')||{}).dataset?.w")=='🍎'
    await pg.evaluate("__echo.state.needs.food=100;__echo.hug()");await pg.wait_for_timeout(200)
    assert not await pg.evaluate("!!document.querySelector('#sc .thought')"),'bubble hides once fed'
    await pg.evaluate("__echo.state.needs.play=10;__echo.hug()");await pg.wait_for_timeout(200)
    assert await pg.evaluate("document.querySelector('#sc .thought').dataset.w")=='⚽','bubble re-picks the top need'
    off=lambda:pg.evaluate("(()=>{const t=document.querySelector('#sc .thought'),c=document.getElementById('cr').getBoundingClientRect(),r=t.getBoundingClientRect();return [Math.round(r.left-c.left),Math.round(r.top-c.top),getComputedStyle(t).visibility]})()")
    o0=await off();await pg.evaluate("__echo.living.move([40,200])");hid=0
    for i in range(8):
      await pg.wait_for_timeout(120);o=await off();hid+=o[2]=='hidden'
    for i in range(40):
      await pg.wait_for_timeout(150)
      if not await pg.evaluate("document.getElementById('cr').classList.contains('lvmoving')"):break
    await pg.wait_for_timeout(1300);o=await off();print('bubble in flight hidden',hid,'landed',o,o0)
    assert hid>=6 and o[2]=='visible' and abs(o[0]-o0[0])<=24 and abs(o[1]-o0[1])<=24,(hid,o,o0)   # needs v2 P2: hidden while moving, back beside the sprite 1 s after landing
    await pg.close()
    print('ERR',errs);assert not errs;await b.close();print('living test OK')
asyncio.run(main())
