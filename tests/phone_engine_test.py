# Browser test for v3 engine behaviour on a phone viewport. Needs a static server on :8765 serving echo-app.
# Run: python3 tests/phone_engine_test.py   (exit 1 on failure)
import asyncio,sys,json
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
  ok=True
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);pg=await b.new_page(**p.devices['iPhone 13'])
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.evaluate('window.__wiped=1;localStorage.clear()');await pg.reload()
    await pg.uncheck('#voice');await pg.click('#go');await pg.click('#bush');await pg.wait_for_timeout(3800)
    c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2600)
    await pg.evaluate("""window.__said=[];new MutationObserver(()=>{const b=document.getElementById('b');if(b&&b.style.display!=='none'&&window.__said[window.__said.length-1]!==b.textContent)window.__said.push(b.textContent)}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});
      CONFIG.ambientMin=999;CONFIG.ambientMax=999;Dialogue.cfg.carryOnMs=1500;Dialogue.cfg.lostThoughtChance=0;Dialogue.cfg.driftChances=[1,0,0];window.__d=0""")
    # 1) carry-on: nobody answers
    await pg.evaluate("window.__echo.runConv('slyte_puddle_wonder',()=>window.__d=1)")
    await pg.wait_for_function('window.__d===1',timeout=60000)
    # 2) drift: the child answers every question (two taps), engine then drifts to a linked topic
    await pg.evaluate("Dialogue.cfg.carryOnMs=600000;window.__d=0;window.__echo.runConv('slyte_puddle_talk',()=>window.__d=1)")
    for _ in range(80):
      if await pg.evaluate('window.__d===1'):break
      bt=pg.locator('.choices button')
      if await bt.count():
        for _k in range(2):
          try: await bt.first.click(timeout=1500)
          except Exception: pass   # the choice row can close between taps
      await pg.wait_for_timeout(700)
    said=await pg.evaluate('window.__said');st=await pg.evaluate('window.__echo.state')
    carry=[l['text'] for l in json.load(open('dialogue/slyte.json'))['barks']['carry_on']];bridge=[l['text'] for l in json.load(open('dialogue/slyte.json'))['barks']['drift_bridge']]
    c1=any(any(x in s for x in carry) for s in said);c2=any(any(x in s for x in bridge) for s in said)
    topics=[k for k in st['dlg']['topicAt']];print('carry-on said:',c1,'| drift bridge said:',c2,'| topics this run:',topics)
    print('pet phrase / word:',await pg.evaluate('JSON.stringify(Dialogue.persona)'))
    ok&=c1 and c2 and len(topics)>=2 and 'puddle' in topics
    print('ERR',errs);ok&=not errs;await b.close()
  print('PASS' if ok else 'FAIL');sys.exit(0 if ok else 1)
asyncio.run(main())
