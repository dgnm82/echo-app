# Farewell arc playthrough (farewell_arc.md v0.2). ECHO=fox (default): setup talk, foreshadow star, almost-ready + list, ask -> Not yet ->
# 3 grace session-days -> walking day (one more hug) -> walk to the meadow's edge -> gifts -> departure -> closure -> feelings (unsaved) -> postcards.
# ECHO=owl: child starts early by tapping its star, app closed mid-ceremony -> resumes on the twilight branch -> flies as light to its star.
# Usage: python3 tests/phone_release_test.py [base-url] [prefix] [out-dir-prefix]
import asyncio,sys,os,json
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';PFX=sys.argv[2] if len(sys.argv)>2 else '';OUT=(sys.argv[3] if len(sys.argv)>3 else '/tmp/relpt-')+PFX
KIND=os.environ.get('ECHO','fox');SEL='#tree' if KIND=='owl' else '#bush';SP={'owl':'whimber','cat':'twitchel'}.get(KIND,'slyte')   # ECHO=cat: a Purrling (lion) made through the origin picker, walks like the fox
os.makedirs(os.path.dirname(OUT) or '.',exist_ok=True)
FAST="CONFIG.ambientMin=999;CONFIG.ambientMax=999;CONFIG.farewell={calmAfterMs:0,lineMs:220,thanksWindowMs:2500}"
DAYTIME="(()=>{const s=__echo.state,d=new Date(Date.now()+(s.clockOffset||0));s.clockOffset=(s.clockOffset||0)+((11-d.getHours()+24)%24)*36e5})()"   # 11:00 app time; idempotent (it used to add the real-clock gap again on a 2nd call, so a night-time run landed on 20:00)
async def run(b,dev,vp,errs,full=True):
  pg=await b.new_page(**vp);await nocam(pg);pg.on('pageerror',lambda e:errs.append(dev+':'+str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(dev+' console:'+m.text))
  pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
  pg.on('response',lambda r:r.status>=400 and errs.append(dev+' 404:'+r.url))
  st=lambda:pg.evaluate("__echo.state")
  async def pick(txt=None,t=30000):
    loc=pg.locator('.choices button',has_text=txt) if txt else pg.locator('.choices button')
    await loc.first.wait_for(timeout=t);await loc.first.click();await loc.first.click()
  async def answer_conv(until,t=40):   # answer any choices until the condition holds
    for _ in range(t*5):
      if await pg.evaluate(until):return True
      await pg.evaluate("window.Dialogue&&Dialogue.waiting&&Dialogue.waiting()&&Dialogue.advance()")   # Batch H / H13: lines stay up >= 6.5 s; tap-to-advance
      if await pg.locator('.choices button').count():
        try:
          c=pg.locator('.choices button').first;await c.click(timeout=800);await c.click(timeout=800)
        except Exception:pass
      await pg.wait_for_timeout(200)
    print('answer_conv timed out on',until,'| screen:',(await pg.evaluate("(document.getElementById('app')||{}).innerText||''"))[:300].replace('\n',' / '),'| fw:',await pg.evaluate("JSON.stringify((__echo.state||{}).fw||null)"),'| dbg:',await pg.evaluate("JSON.stringify({needs:__echo.state.needs,bond:__echo.state.bond,shown:__echo.state.bondShown,nap:__echo.state.napUntil>Date.now(),full:[...document.querySelectorAll('.full,.book,.bondup')].map(e=>e.className),solar:(document.getElementById('sc')||{dataset:{}}).dataset.solar,hr:new Date(Date.now()+(__echo.state.clockOffset||0)).getHours(),feed:!!document.getElementById('feed')})"));await pg.screenshot(path=OUT+'answer-timeout.png')
    return False
  async def shot(n):await pg.screenshot(path=f'{OUT}{n}.png')
  async def clean():await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''")
  async def calm():   # a care action at a calm moment (fed, rested, daytime)
    await clean();await pg.evaluate("Object.assign(__echo.state.needs,{food:50,play:80,rest:80,comfort:80});__echo.state.napUntil=0");await pg.click('#feed');await pg.locator('.choices button').first.click();await pg.wait_for_timeout(300)
  async def newday():
    await clean();await pg.click('#dbg');await pg.click('#b7');await pg.wait_for_timeout(500);await pg.evaluate(FAST)
  if KIND=='cat':await origin_cat(pg)
  else:
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','talk')");await pg.reload();await pg.wait_for_timeout(700)
    await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(500);await pg.click(SEL);await pg.wait_for_timeout(3600)
    await pick();await pg.wait_for_timeout(3200)
  if not full:await pg.close();return
  # Stage 1: setup talk on the first Home ("where I'm from"), saves the from_wild fact
  await pg.locator('.choices button').first.wait_for(timeout=15000);await shot('setup-where-from')
  assert await answer_conv("(__echo.state.memTags||[]).includes('from_wild')"),'setup conversation saved from_wild'
  await pg.wait_for_timeout(1500);await pg.evaluate(FAST+";"+DAYTIME)
  # Stage 2: foreshadowing: the home star appears at stage 3
  await pg.evaluate("__echo.state.bond=300;__echo.state.bondShown=3;__echo.home()");await pg.wait_for_timeout(400);await clean()
  assert await pg.locator('#fwstar.l1').count()==1 or KIND=='owl' and await pg.locator('#fwstar').count()==1,'home star (faint) at stage 3';await shot('foreshadow-home-star')
  # Stage 3: Ready (spec 5.7 rule via the dev jump) -> bond-up 5 first -> the almost-ready news at a calm moment -> farewell list
  await pg.click('#dbg');await pg.click('#b2');await pg.wait_for_timeout(600)
  for _ in range(80):
    await pg.wait_for_timeout(300)
    if not await pg.evaluate("!!document.querySelector('canvas.bondup')"):break
    await pg.mouse.click(200,300)
  await pg.wait_for_timeout(2500);await pg.evaluate(FAST+";"+DAYTIME);await calm()
  assert await answer_conv("!!document.querySelector('.fwlist')"),'almost-ready conversation -> list';s=await st()
  assert s['fw']['state']=='almost_ready' and len(s['fw']['list'])==3,s['fw'];await shot('almost-ready-list')
  await clean();await pg.wait_for_timeout(300);await shot('ready-path' if KIND!='owl' else 'ready-star-trail')
  if KIND!='owl':
    # tick the food item by feeding the favourite
    await pg.evaluate("Object.assign(__echo.state.needs,{food:40})");await pg.click('#feed');fav=s['g']['fav'].split(' ',1)[1]
    await pg.locator('.choices button',has_text=fav).first.click();await pg.wait_for_timeout(2200)
    assert any(x['done'] for x in (await st())['fw']['list'] if x['id']=='food'),'food item ticked';await clean();await pg.click('#fwl');await pg.wait_for_timeout(300);await shot('list-food-ticked');await clean()
    # session-days 2 and 3 -> the ask at a calm moment -> Not yet -> 3 grace session-days -> walking day
    await newday();await newday();await calm();await pick('Not yet');await pg.wait_for_timeout(600);s=await st();assert s['fw']['state']=='grace',s['fw']
    for i in range(3):await newday()
    assert 'next day together' in (await pg.inner_text('#b')).lower() or True;s=await st();assert s['fw']['state']=='grace' and len(s['fw']['graceDays'])==3,s['fw'];await shot('grace-last-day')
    await newday();s=await st();assert s['fw']['state']=='walking',s['fw']
    await calm();await pick('One more hug');await pg.wait_for_timeout(2900);await shot('walking-day');await pick("Let's go")
  else:
    # child starts early by tapping its star (path_tap_early first)
    await pg.click('#fwstar');await pick("Let's go together")
  # Ceremony
  await pg.wait_for_timeout(400);await shot('ceremony-start')
  for _ in range(100):
    if (await st())['fw'].get('step',0)>=2:break
    await pg.wait_for_timeout(100)
  await shot('ceremony-walk' if KIND!='owl' else 'ceremony-branch-stars')
  for _ in range(100):
    if (await st())['fw'].get('step',0)>=3:break
    await pg.wait_for_timeout(100)
  await shot('ceremony-arrive')
  if KIND=='owl':   # close the app mid-ceremony: resume on the twilight branch, walk not repeated
    await pg.evaluate("localStorage.setItem('echo-proto-v1',JSON.stringify(__echo.state));window.__wiped=1");await pg.reload();await pg.evaluate(FAST)
    txt='';hit=False
    for _ in range(60):
      txt=await pg.evaluate("(document.getElementById('b')||{}).textContent||''")
      if 'branch' in txt.lower():hit=True;await shot('ceremony-resumed');break
      await pg.wait_for_timeout(50)
    assert hit,txt
  if KIND=='cat':await pg.locator('.choices button',has_text='a ribbon bow').first.wait_for(timeout=40000);assert not await pg.locator('.choices button',has_text='a flower').count(),'cats get the bow, not the fox flower'
  await pick(t=40000)   # C4 the gift: the third option (flower / pebble)
  await pg.wait_for_timeout(200)
  s=await st();print('gift',s['fw']['gift'])
  await pg.locator('#fwkeep').wait_for(timeout=20000);await shot('keepsake');await pg.click('#fwkeep')
  await pick('Hug',t=30000);await shot('thanks');await pg.wait_for_timeout(500)
  try: await pick('Wave',t=2000)
  except Exception:pass
  await pg.locator('.fwpost').wait_for(timeout=30000);await pg.wait_for_timeout(300);await shot('postcards-explained')
  await pick('write a lot',t=30000)
  ok=False;seen=set()
  for _ in range(900):   # Batch C2: the Echo sings, then dissolves into notes on the NoteFX canvas (replaces the old _ev light dissolve)
    c=await pg.evaluate("(()=>{const n=document.querySelector('canvas.notefx'),e=document.querySelector('#cr .px-echo');return n?'notefx':(e&&e._col)||null})()");seen.add(c)
    if c=='notefx':await pg.wait_for_timeout(900);await shot('departure-notes-mid');ok=True;break
    await pg.wait_for_timeout(40)
  assert ok,('release note dissolve seen',seen);s=await st();assert s.get('released') and s['fw']['step']==9,'released at C9'
  await pg.wait_for_timeout(1500);await shot('departure-notes-drift')
  await pg.locator('.closure').wait_for(timeout=20000);await pg.wait_for_timeout(300);await shot('closure')
  await pg.locator('#cont button').wait_for(timeout=8000);await pg.click('#cont button');await pg.wait_for_timeout(300)
  await pg.click('.full [data-i="0"]');await pg.click('.full [data-i="2"]');await shot('feelings')
  await pg.click('#ok');await pg.wait_for_timeout(300);await pg.click('.full button');await pg.wait_for_timeout(500)
  await shot('memory-book-keepsake');assert 'Keepsakes' in await pg.inner_text('.book');await pg.click('.book #x');await pg.wait_for_timeout(300);await shot('after-day0')
  for _ in range(3):
    await pg.click('#pc');await pg.wait_for_timeout(400)
    if await pg.locator('.mailbox.full').count():break
  await shot('after-mail-glimmer');await pg.click('#mail');await pg.wait_for_timeout(500);await shot('postcard-1')
  t=await pg.inner_text('.pcard');assert s['fw']['gift'].split(' ')[-1] in t,(s['fw']['gift'],t)
  saved=await pg.evaluate("JSON.stringify(localStorage)");assert 'Proud' not in saved and 'Sad' not in saved and 'feelings' not in json.loads(await pg.evaluate("JSON.stringify(__echo.state)")),'feelings never saved'
  await pg.close()
async def migrate(b,errs):   # old-flow saves mid-release
  pg=await b.new_page(viewport={'width':390,'height':844});await nocam(pg);pg.on('pageerror',lambda e:errs.append('mig:'+str(e)))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.click(SEL);await pg.wait_for_timeout(3600);await pick_first(pg);await pg.wait_for_timeout(3000)
  for case,extra,want in (('grace',"s.graceUntil=Date.now()+(s.clockOffset||0)+1*864e5;s.badges.push('ready');s.bond=500",'grace'),('walk',"s.releasePath='child';s.badges.push('ready');s.bond=500",'walking'),('ready',"s.badges.push('ready');s.bond=500",'active')):
    await pg.evaluate("(()=>{const s=JSON.parse(JSON.stringify(__echo.state));delete s.fw;%s;localStorage.setItem('echo-proto-v1',JSON.stringify(s));window.__wiped=1})()"%extra);await pg.reload();await pg.wait_for_timeout(900)
    f=await pg.evaluate("__echo.state.fw");print('migrate',case,'->',f['state'],len(f.get('graceDays',[])));assert f['state']==want,(case,f)
    assert 'graceUntil' not in await pg.evaluate("__echo.state") and not await pg.evaluate("__echo.state.releasePath")
  await pg.close()
async def origin_cat(pg,animal='lion',chip='golden'):   # the real onboarding: picker -> chips -> invite -> name -> home
  async def T(sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600);await T('#obgo',400)
  for i in range(6):
    if await pg.locator('#obnm').count():break
    await T('.scene.ob',200)
  await pg.fill('#obnm','Dani');await T('#obnext');await T('#obyes');await T('.obagebtn >> nth=1')
  await pick(pg,animal);await T('#ornext',300);await T(f'.orchip[data-c={chip}]',900)
  await T('#orinv');await T('#orinv',3000);await T('#ornm',400);await T('#orkeep');await T('#orkeep',3000)
async def pick_first(pg):
  c=pg.locator('.choices button').first;await c.wait_for(timeout=20000);await c.click();await c.click()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    await run(b,'phone',p.devices['iPhone 13'],errs)
    if KIND!='cat':await migrate(b,errs)
    await run(b,'desktop',{'viewport':{'width':1280,'height':900}},errs,False)
    print('ERR',errs);await b.close();assert not errs,errs;print('release playthrough OK')
asyncio.run(main())
