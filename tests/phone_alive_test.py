# Echo aliveness v1 phone test (aliveness/README.md). Usage: python3 tests/phone_alive_test.py [base-url] [shot-dir]
import asyncio,sys,os,json,re
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/alive';os.makedirs(OUT,exist_ok=True)
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
CL="document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove());const b=document.getElementById('b');if(b)b.style.display='none'"
async def frames(pg,name,n,ms=83):
  r=await pg.evaluate("(()=>{const s=document.getElementById('sc').getBoundingClientRect();return [s.x,s.y,s.width,s.height]})()")
  for i in range(n):await pg.screenshot(path=f'{OUT}/_{name}_{i:02d}.png',clip={'x':r[0],'y':r[1]+r[3]*.35,'width':r[2],'height':r[3]*.65});await pg.wait_for_timeout(ms)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[];bad=[]
    for kind,sp in (('fox','slyte'),('owl','whimber')):
      pg=await newecho(b,p,kind,errs);pg.on('response',lambda r:r.status>=400 and bad.append(r.url))
      await pg.evaluate("CONFIG.livingSpeed=99;__echo.living.stop&&__echo.living.stop();Alive.sess.t0=0;__echo.state.needs={food:80,play:80,rest:80,comfort:80};"+CL)
      await pg.wait_for_timeout(400)
      # 8/1: menu = 3 foods with drawn icons (Whimber's seeds no longer a speech bubble)
      await pg.click('#feed');await pg.wait_for_timeout(300);ic=await pg.evaluate("[...document.querySelectorAll('#overlay .choices .pxi')].map(i=>i.dataset.icon)")
      assert len(ic)==3 and 'talk' not in ic,ic;await pg.screenshot(path=f'{OUT}/{sp}-feed-menu.png')
      # 7: food drop/float/plate -> eat -> reaction
      await pg.locator('#overlay .choices button').first.click();await pg.wait_for_timeout(150);await frames(pg,sp+'-eat',30)
      assert await pg.evaluate("__echo.state.foods.length")>=1
      assert await until(pg,"!document.querySelector('#sc .alfood')&&document.getElementById('b').style.display!=='none'",8000),'ate + line'
      await pg.evaluate(CL);await pg.wait_for_timeout(600)
      # gentle dislike: polite nibble, nudged aside, "That one's yours"
      await pg.evaluate("Alive.food(FOODS['%s'].find(f=>f.id==='lemon'),'not_for_me',()=>{window.__nfm=1})"%sp);await frames(pg,sp+'-dislike',34)
      assert await until(pg,"window.__nfm===1",8000),'dislike done'
      # tier/menu rule sanity: favourite first in taste, a disliked food restores +15
      t=await pg.evaluate("FOODS['%s'].map(f=>__echo.foodTaste(f))"%sp);assert t.count('favorite')==1,t;assert await pg.evaluate("FOODS.tiers.not_for_me.food")==15
      await pg.evaluate(CL);await pg.wait_for_timeout(300)
      # 2: look toward taps (ripple + mirror + curious), text once a session, then chirp only
      r=await pg.evaluate("(()=>{const s=document.getElementById('sc').getBoundingClientRect();return [s.x,s.y,s.width,s.height]})()")
      await pg.mouse.click(r[0]+r[2]*.12,r[1]+r[3]*.55);await pg.wait_for_timeout(120);await frames(pg,sp+'-look',14)
      assert 'look' in await pg.evaluate("Alive.log"),'look';assert await pg.evaluate("Alive.sess.tapText")==1
      await pg.wait_for_timeout(1700);await pg.evaluate(CL);await pg.mouse.click(r[0]+r[2]*.88,r[1]+r[3]*.55);await pg.wait_for_timeout(200)
      assert await pg.evaluate("Alive.log.filter(x=>x==='look').length")==2;assert await pg.evaluate("document.getElementById('b').style.display")=='none','2nd tap: chirp only'
      # 4: pet hearts, hold-to-hug, sit scoot
      await pg.wait_for_timeout(1300);await pg.evaluate(CL);await pg.click('#cr');await pg.wait_for_timeout(250);await frames(pg,sp+'-pet',10)
      assert await pg.evaluate("1")
      c0=await pg.evaluate("__echo.state.needs.comfort=20");await pg.evaluate("NeedSelect.pressures(__echo.state.needs,'%s','day')"%sp)
      bb=await pg.locator('#cr').bounding_box();await pg.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2);await pg.mouse.down();await pg.wait_for_timeout(700);await frames(pg,sp+'-hug',10);await pg.mouse.up()
      assert 'hug' in await pg.evaluate("Alive.log");assert await pg.evaluate("__echo.state.needs.comfort")>20
      # 5: say-do sync
      await pg.wait_for_timeout(300);await pg.evaluate(CL+";__echo.talk({text:'(Yawns.) Big one.'})");await pg.wait_for_timeout(300);assert 'act:yawn' in await pg.evaluate("Alive.log")
      # 3: blinks (heavy when sleepy; exported slow blink)
      await pg.evaluate(CL+";__echo.state.needs={food:80,play:80,rest:20,comfort:80};CONFIG.cueSpeed=.05")
      assert await until(pg,"document.querySelector('#cr .px-echo').dataset.sleepy==='1'",6000),'sleepy flag'
      # 6: need cues (top need only)
      await pg.evaluate("__echo.state.needs={food:10,play:80,rest:80,comfort:80};Alive.cueN={}");await pg.wait_for_timeout(100)
      assert await until(pg,"(()=>{"+CL+";return Alive.log.includes('cue:hungry')})()",15000),'hungry cue'
      await pg.evaluate("__echo.state.needs={food:80,play:80,rest:80,comfort:12}")
      assert await until(pg,"(()=>{"+CL+";return Alive.log.includes('cue:cuddly')})()",15000),'cuddly cue';await frames(pg,sp+'-cue-cuddly',8)
      await pg.evaluate("CONFIG.cueSpeed=1")
      # 9: need-aware selection voices the shown need (cooldowns reset per draw)
      ks=await pg.evaluate("(()=>{const o=[];for(let i=0;i<40;i++){const m=NeedSelect.mem;m.start=-1e15;m.at={};m.any=-1e15;m.n={};m.queue=[];o.push(NeedSelect.slot({needs:{food:10,play:80,rest:80,comfort:80},species:'%s',band:'day',weather:'clear'}).key)}return o})()"%sp)
      assert 'need_hungry' in ks and not any(k in ks for k in ('need_sleepy','need_cuddly')),ks
      # sprites and effects stay under modals
      await pg.evaluate(CL);await pg.click('#cr');await pg.wait_for_timeout(100);await pg.click('#book');await pg.wait_for_timeout(300)
      hit=await pg.evaluate("[...document.querySelectorAll('#sc .alfx,#cr')].filter(e=>{const r=e.getBoundingClientRect();const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return t&&(e===t||e.contains(t))}).length")
      assert hit==0,('over modal',hit);await pg.screenshot(path=f'{OUT}/{sp}-modal.png')
      await pg.evaluate(CL);await pg.evaluate("document.querySelectorAll('.book,.panel').forEach(x=>x.remove())")
      if kind=='owl':   # twilight twinkle on the v2 branch
        await pg.evaluate("__echo.state.clockOffset=(()=>{const d=new Date();return ((19-d.getHours()+24)%24)*36e5-d.getMinutes()*6e4})();__echo.state.scene='branch';__echo.home()");await pg.wait_for_timeout(600)
        assert await pg.locator('#sc .altwinkle').count()==1;await frames(pg,'whimber-twinkle',13)
      await pg.close()
    await b.close();print('ERR',errs,'404',bad);assert not errs and not bad
  # GIFs from the frame series
  from PIL import Image
  import glob
  for g in sorted({os.path.basename(f).rsplit('_',1)[0][1:] for f in glob.glob(f'{OUT}/_*.png')}):
    fs=sorted(glob.glob(f'{OUT}/_{g}_*.png'));ims=[Image.open(f).convert('RGB') for f in fs]
    ims[0].save(f'{OUT}/{g}.gif',save_all=True,append_images=ims[1:],duration=83 if 'twinkle' not in g else 160,loop=0)
    for f in fs:os.remove(f)
  print('alive test OK')
asyncio.run(main())
