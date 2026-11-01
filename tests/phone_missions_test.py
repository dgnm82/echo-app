# Music School step 4: one listening mission on a phone, touch only (iPhone 13 profile).
# Give (Home after a game, second session) -> next session's Home asks once -> an answer plays real notes and the Echo
# is delighted -> the Memory Book Listening page shows the found bubble with no counts.
# Usage: python3 tests/phone_missions_test.py [URL] [SHOTDIR]
import asyncio,sys,os,re,time
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
SHOT=sys.argv[2] if len(sys.argv)>2 else '/tmp/missions_shots';os.makedirs(SHOT,exist_ok=True)
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
async def T(pg,sel,ms=250):await pg.locator(sel).first.tap();await pg.wait_for_timeout(ms)
async def wait(pg,js,ms):
  t0=time.time()
  while (time.time()-t0)*1000<ms:
    if await pg.evaluate(f"(()=>{{try{{return !!({js})}}catch(e){{return false}}}})()"):return True
    await pg.wait_for_timeout(50)
  return False
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-dev-wu','0')");await pg.reload();await pg.wait_for_timeout(600)
    await T(pg,'#obgo',400)
    for _ in range(12):
      if await pg.locator('#obnm').count():break
      await T(pg,'.scene.ob',200)
    await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await pick(pg,'dog');await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
    await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1200)
    await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());CONFIG.ambientMin=999;CONFIG.ambientMax=999;window.__msnFast=1")
    # first session: a game ends, Home -> no card (first session)
    await pg.evaluate("__msn.sess().afterGame=1;__msn.home()");await pg.wait_for_timeout(900)
    check(not await pg.locator('.msncard').count(),'no mission in the first session')
    # second session (sessions counter as the store would have it), Home after a game -> the card
    await pg.evaluate("EchoBack.withMl(__msn.kid(),m=>{m.sessions=2},__msn.S().ageBand);__msn.sess().careAt=0;__msn.sess().afterGame=1;__msn.home()")
    check(await wait(pg,"document.querySelector('#sc .msncard img.msnc')",3000),'card offered at Home after a game')
    txt=await pg.evaluate("document.querySelector('.msncard .msnline').textContent")
    check(len(txt)>5 and not re.search(r'\d|secret|bond|wrong',txt,re.I),'card line: '+txt)
    await pg.screenshot(path=os.path.join(SHOT,'mission_card.png'))
    await T(pg,'#msnok',300)
    given=await pg.evaluate("EchoBack.mlFor(__msn.kid(),__msn.S().ageBand).missions.given")
    check(list(given)==['high_sound'],'high_sound given (store)')
    await pg.evaluate("__msn.sess().afterGame=1;__msn.home()");await pg.wait_for_timeout(900)
    check(not await pg.locator('.msn').count(),'no second card the same session/day, and no ask in the giving session')
    # next session: reload (a new page session), Home asks once
    await pg.reload();await pg.wait_for_timeout(500);await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());CONFIG.ambientMin=999;CONFIG.ambientMax=999;window.__msnFast=1;__msn.home()")
    check(await wait(pg,"document.querySelectorAll('#sc .msnask .msnans').length===5",4000),'next session: ask with 4 answers + Not yet')
    await pg.screenshot(path=os.path.join(SHOT,'mission_return.png'))
    await pg.evaluate("window.__notes=0;const o=MusicFX.note;MusicFX.note=function(){window.__notes++;return o.apply(this,arguments)}")
    await T(pg,'#sc .msnans >> nth=1',1200)   # whistle: real family notes
    back=await pg.evaluate("EchoBack.mlFor(__msn.kid(),__msn.S().ageBand).missions.back")
    check(back.get('high_sound',{}).get('pick')=='whistle','answer stored')
    check(await pg.evaluate("window.__notes")>=3,'answer plays its notes')
    check(await pg.evaluate("DialogueEngine.recentEvents(__msn.S()).includes('mission_back')"),'mission_back event recorded')
    await pg.evaluate("__msn.home()");await pg.wait_for_timeout(700)
    check(not await pg.locator('.msnask').count(),'asked once per session')
    # Listening page from the Memory Book (touch)
    await T(pg,'#book',500);await T(pg,'#msntab',500)
    pgtxt=await pg.evaluate("document.querySelector('.msnpage').textContent")
    check(await pg.locator('.msnpage img[src*="bubble_found"]').count()==1 and await pg.locator('.msnpage img[src*="listen_next"]').count()==1,'Listening page: found bubble + one next row')
    check(not re.search(r'\d',pgtxt),'Listening page has no counts: '+pgtxt.strip())
    check(not errs,'no page errors '+str(errs[:2]))
    await b.close()
  print(f"\n{'PASS' if not fails else 'FAIL'}: phone missions ({len(fails)} failed)");sys.exit(1 if fails else 0)
asyncio.run(main())
