# Batch H (PM): the family-first picker labels (Howlings / Wingsongs / Purrlings) never clip, at 360 px wide and at iPhone 13 width.
import asyncio,sys,json,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from origin_pick import nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
bad=[];n=[0]
def check(c,m):
  n[0]+=1
  if not c:bad.append(m);print('FAIL',m)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,ctxargs in [('iphone13',p.devices['iPhone 13']),('w360',{**p.devices['iPhone 13'],'viewport':{'width':360,'height':740},'screen':{'width':360,'height':740}})]:
      ctx=await b.new_context(**ctxargs);pg=await ctx.new_page();await nocam(pg)
      await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700)
      await pg.locator('#obgo').click();await pg.wait_for_timeout(400)
      for _ in range(12):
        if await pg.locator('#obnm').count():break
        await pg.locator('.scene.ob').first.click();await pg.wait_for_timeout(200)
      await pg.fill('#obnm','Mia')
      for s in ['#obnext','#obyes','.obagebtn >> nth=1']:await pg.locator(s).first.click();await pg.wait_for_timeout(500)
      await pg.wait_for_selector('.orfamcard',timeout=15000);await pg.wait_for_timeout(500)
      m=await pg.evaluate("""[...document.querySelectorAll('.orfamcard')].map(c=>{const s=c.querySelector('span'),cr=c.getBoundingClientRect(),sr=s.getBoundingClientRect();return {t:s.textContent,cardW:cr.width,cw:c.clientWidth,csw:c.scrollWidth,sw:s.scrollWidth,sCW:s.clientWidth,sl:sr.left-cr.left,sr:cr.right-sr.right,font:getComputedStyle(s).fontSize}})""")
      check(len(m)==3 and {x['t'] for x in m}=={'Howlings','Wingsongs','Purrlings'},f'{name}: 3 family cards with full names {[x["t"] for x in m]}')
      for x in m:
        check(x['sw']<=x['sCW'] and x['csw']<=x['cw'] and x['sl']>=0 and x['sr']>=0,f"{name}: '{x['t']}' label fits its card (text {x['sw']} <= {x['sCW']}, card {x['csw']} <= {x['cw']})")
      vw=await pg.evaluate("innerWidth");check(await pg.evaluate("[...document.querySelectorAll('.orfamcard')].every(c=>{const r=c.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})"),f'{name}: cards inside the {vw}px viewport')
      await ctx.close()
    await b.close()
  print(f'picker labels: {n[0]-len(bad)}/{n[0]} passed');sys.exit(1 if bad else 0)
asyncio.run(main())
