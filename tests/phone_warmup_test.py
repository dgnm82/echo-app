# Music School Phase 1, step 1: the hatching-song warm-up on a phone.
#   A) fresh child, taps through every moment (mouse+touch phone context) -> Home; screenshots of each moment; no numbers / scores on screen
#   B) a child who taps nothing: auto-finishes at speed 1 in under 2.5 min, lands on Home, first song saved + in the Memory Book
#   C) touch-only + reduced motion (static frames, no hop)
# Usage: python3 tests/phone_warmup_test.py [URL] [SHOTDIR]   (server: python3 -m http.server 8797 in echo-app; 8765/8766 are taken)
import asyncio,sys,os,re,time
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8797/'
SHOT=sys.argv[2] if len(sys.argv)>2 else '/tmp/warmup_shots'
os.makedirs(SHOT,exist_ok=True)
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
SCAN="""(()=>{const w=document.querySelector('.wu');if(!w)return null;const t=w.innerText||'';
  return {digits:/\\d/.test(t),stars:/[★☆⭐🌟]|score|points|wrong/i.test(t),text:t.slice(0,200)}})()"""
async def onboard(pg,speed,ex=''):
  await pg.goto(URL);await pg.evaluate("localStorage.clear()")
  await pg.evaluate(f"localStorage.setItem('echo-dev-wu','1');localStorage.setItem('echo-dev-wu-speed','{speed}');{ex}");await pg.reload();await pg.wait_for_timeout(700)
  await T(pg,'#obgo',400)
  for _ in range(12):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  check(not await pg.locator('.obagebtn').count(),'no age step after naming')
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes')
  await pick(pg,'dog');await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
  await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',600)
  await pg.wait_for_selector('.wu',timeout=8000)
async def turn(pg,timeout=30):   # the cue shows "your turn" (finger frames)
  t0=time.time()
  while time.time()-t0<timeout:
    if await pg.evaluate("(()=>{const c=document.querySelector('.wucue');return !!c&&!c.hidden&&c.style.backgroundPosition&&!c.style.backgroundPosition.startsWith('0px')})()"):return True
    await pg.wait_for_timeout(60)
  return False
async def tap(pg,key,touch=False):
  el=pg.locator(f'.wu [data-press="{key}"]').first
  if touch:await el.tap()
  else:await el.click()
async def run_taps(b,p,tag,touch=False,rm=False,shots=True):
  dev=dict(p.devices['iPhone 13']);
  if not touch:dev.pop('is_mobile',None)
  ctx=await b.new_context(**dev,reduced_motion='reduce' if rm else 'no-preference');pg=await ctx.new_page();await nocam(pg)
  errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));reqs=[];pg.on('request',lambda r:reqs.append(r.url))
  await onboard(pg,2)
  async def shot(n):
    if shots:await pg.screenshot(path=f'{SHOT}/{tag}_{n}.png')
    s=await pg.evaluate(SCAN)
    if s:check(not s['digits'] and not s['stars'],f'{tag} {n}: no numbers / stars / score words on screen ({s["text"]!r})')
  await pg.wait_for_timeout(600);await shot('01_intro')
  await tap(pg,'go',touch)
  check(await turn(pg),f'{tag}: copy turn');await shot('02_copy_turn')
  for k in ('sol','mi'):await tap(pg,k,touch);await pg.wait_for_timeout(250)
  await pg.wait_for_timeout(500);await shot('03_copy_outcome')
  await pg.wait_for_selector('.wu [data-press="beat"]',timeout=20000);await pg.wait_for_timeout(900);await shot('04_beat_show')
  check(await turn(pg),f'{tag}: beat turn')
  for i in range(8):await tap(pg,'beat',touch);await pg.wait_for_timeout(int(714/2)-20)
  await shot('05_beat_taps')
  await pg.wait_for_selector('.wu [data-press="L"]',timeout=25000);await pg.wait_for_timeout(500);await shot('06_chirps_same')
  imgs=await pg.evaluate("[...document.querySelectorAll('.wuchirp')].map(e=>e.style.backgroundImage)")
  check(len(imgs)==2 and all('chirp_same' in i for i in imgs),f'{tag}: both chirps idle as chirp_same ({imgs})')
  for trial in range(2):
    check(await turn(pg),f'{tag}: chirp turn {trial+1}')
    await tap(pg,'R' if trial==0 else 'L',touch);await pg.wait_for_timeout(150)
    imgs=await pg.evaluate("[...document.querySelectorAll('.wuchirp')].map(e=>e.style.backgroundImage)")
    check(all('chirp_same' in i for i in imgs) and not any('chirp_high' in i or 'chirp_low' in i for i in imgs),f'{tag}: a tapped chirp stays chirp_same')
    if trial==0:await shot('07_chirp_tapped')
    for _ in range(120):
      if await pg.evaluate("[...document.querySelectorAll('.wuchirp')].some(e=>e.style.backgroundImage.includes('chirp_reveal'))"):break
      await pg.wait_for_timeout(50)
    hop=await pg.evaluate("[...document.querySelectorAll('.wuchirp')].map(e=>[e.style.backgroundImage.includes('chirp_reveal'),e.classList.contains('hop')])")
    check(sum(1 for x in hop if x[0])==1,f'{tag}: exactly one chirp reveals (the higher)')
    check(all(x[1]==(x[0] and not rm) for x in hop),f'{tag}: hop only on the reveal{" (none: reduced motion)" if rm else ""}')
    if rm:check(await pg.evaluate("[...document.querySelectorAll('.wuchirp')].some(e=>e.style.backgroundImage.includes('chirp_reveal_') && e.style.backgroundImage.includes('_static'))"),f'{tag}: static reveal frame')
    if trial==0:await shot('08_chirp_reveal')
  await pg.wait_for_selector('.wu [data-press="pat"]',timeout=25000);await pg.wait_for_timeout(400);await shot('09_clap_show')
  check(await turn(pg),f'{tag}: clap turn')
  for g in (500,250,250,0):
    await tap(pg,'pat',touch)
    if g:await pg.wait_for_timeout(g)
  await pg.wait_for_timeout(300);await shot('10_clap_taps')
  await pg.wait_for_selector('.wucard:not([hidden])',timeout=25000);await pg.wait_for_timeout(1200);await shot('11_first_song')
  await pg.wait_for_selector('#feed',timeout=25000);await pg.wait_for_timeout(500)
  check(not await pg.locator('.wu').count(),f'{tag}: warm-up gone, Home shown');await shot('12_home')
  ml=await pg.evaluate("__echo.ml()");st=await pg.evaluate("({b:__echo.state.ageBand,a:__echo.state.bandAuto,f:__echo.state.firstSong})")
  check(ml and ml['src']=='warmup' and ml['warm'] and 1<=ml['level']<=5,f'{tag}: music level set by the warm-up (ML{ml and ml["level"]}, {ml and ml["warm"]})')
  check(st['a']==1 and st['b'] in ('5-6','7-8','9-10'),f'{tag}: reading band auto ({st["b"]})')
  check(st['f'] and st['f']['song']['n'][-1][0]==1,f'{tag}: first song saved, ends on do')
  check(not [r for r in reqs if not r.startswith(URL) and not r.startswith('data:') and not r.startswith('blob:')],f'{tag}: offline (no outside requests)')
  check(not errs,f'{tag}: no page errors {errs[:2]}')
  await ctx.close()
async def run_none(b,p):
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  await onboard(pg,1);t0=time.time()
  await pg.wait_for_selector('.wu [data-press="L"]',timeout=60000);tp=time.time()
  await pg.wait_for_selector('.wu [data-press="pat"]',timeout=60000);tq=time.time()
  print(f'no taps: "which is higher" moment (chirps on screen until the clap pad) {tq-tp:.1f} s')
  await pg.wait_for_selector('#feed',timeout=160000);dt=time.time()-t0
  check(dt<150,f'no taps: auto-finishes in {dt:.0f} s (< 150 s)')
  ml=await pg.evaluate("__echo.ml()");check(ml['level']==1 and ml['src']=='warmup','no taps: ML1 (gentlest start), still a happy ending')
  check((await pg.evaluate("__echo.state.ageBand"))=='5-6','no taps: reading band stays 5-6')
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());__echo.book()");await pg.wait_for_timeout(600)
  check(await pg.locator('#bkfirst').count()==1,'Memory Book: "Our first song" card')
  await pg.screenshot(path=f'{SHOT}/none_13_memory_book.png')
  await pg.locator('#bkfirst').click();await pg.wait_for_timeout(200);check(await pg.locator('#bkfirst.playing').count()==1,'Memory Book: the first song plays')
  check(not errs,f'no taps: no page errors {errs[:2]}');await ctx.close()
async def run_invite(b,p):   # an existing child without a warm-up gets the ignorable Home chip
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg)
  await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-dev-wu','0')");await pg.reload();await pg.wait_for_timeout(600)
  await T(pg,'#obgo',400)
  for _ in range(12):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await pick(pg,'owl');await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
  await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1500)
  check(not await pg.locator('.wu').count(),'echo-dev-wu=0: no warm-up')
  await pg.evaluate("localStorage.setItem('echo-dev-wu','1')");await pg.reload();await pg.wait_for_timeout(500)
  try:await pg.wait_for_selector('.wuinv',timeout=15000);ok=True
  except Exception:ok=False
  check(ok,'existing child: the warm-up invite chip shows on Home')
  if ok:
    await pg.screenshot(path=f'{SHOT}/invite_home.png');life=0
    for _ in range(24):
      if not await pg.locator('.wuinv').count():break
      life+=.5;await pg.wait_for_timeout(500)
    check(8<=life<=12,f'the ignorable invite chip fades after about 10 s ({life} s)')
    sess=await pg.evaluate("__echo.sess().wuInvite");check(sess==1,'shown once per session')
    await pg.reload();await pg.wait_for_selector('.wuinv',timeout=15000)   # a new session shows it again (no warm-up yet)
    await pg.locator('.wuinv').click(force=True)   # the chip bobs, so playwright never sees it "stable"; a real tap is fine
    await pg.wait_for_selector('.wu',timeout=5000);check(True,'tapping the invite opens the warm-up')
  await ctx.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    only=os.environ.get('WU_ONLY')
    if not only or only=='taps':await run_taps(b,p,'taps')
    if not only or only=='touch':await run_taps(b,p,'touch_rm',touch=True,rm=True,shots=True)
    if not only or only=='invite':await run_invite(b,p)
    if not only or only=='none':await run_none(b,p)
    await b.close()
  print(f'warm-up phone test: {len(fails)} failed');sys.exit(1 if fails else 0)
asyncio.run(main())
