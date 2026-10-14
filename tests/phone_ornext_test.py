# origin P4 'learn about your Echo' (family line + keep-colours strip): the Next button stays on screen at 180x320 and on short phones
import asyncio,sys
from playwright.async_api import async_playwright
URL='http://localhost:8765/'
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def run(b,vp,animal):
  ctx=await b.new_context(viewport=vp,device_scale_factor=2,has_touch=True);pg=await ctx.new_page()
  await pg.goto(URL);await pg.evaluate("localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700)
  await T(pg,'#obgo',500)
  for i in range(8):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',300)
  await pg.fill('#obnm','Leo');await T(pg,'#obnext');await T(pg,'#obyes');await T(pg,'.obagebtn >> nth=1',600)
  for sel in ['#ornext']:
    r=await pg.evaluate("(()=>{const e=document.querySelector('#ornext');const a=e.getBoundingClientRect();return [a.top,a.bottom,innerHeight]})()");assert r[1]<=r[2]+.5,('P1 next',vp,r)
  await T(pg,f'.orcard[data-a={animal}]');await T(pg,'#ornext');await T(pg,'.orchip >> nth=0',1000);await T(pg,'#orinv');await T(pg,'#orinv',3200)
  await pg.wait_for_selector('#ornm',timeout=5000);await pg.wait_for_timeout(300)
  r=await pg.evaluate("(()=>{const e=document.getElementById('ornm'),a=e.getBoundingClientRect(),x=document.elementFromPoint(a.left+a.width/2,a.top+a.height/2);return [a.top,a.bottom,innerHeight,x===e||e.contains(x)]})()")
  await pg.screenshot(path=f'/tmp/ornext-{vp["width"]}x{vp["height"]}-{animal}.png');print(vp,animal,r)
  assert r[1]<=r[2]+.5 and r[0]>=0 and r[3],('Next pinned + tappable',vp,r)
  await T(pg,'#ornm',500);assert await pg.locator('.ornm').count()==6,'Next works';await ctx.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for vp in ({'width':180,'height':320},{'width':360,'height':560},{'width':320,'height':480},{'width':390,'height':664}):
      for a in ('dog','owl'):await run(b,vp,a)
    await b.close();print('ornext test OK')
asyncio.run(main())
