# Batch H review screenshots (PM, Oct 25): same browser + iPhone 13 viewport as tests/phone_*_test.py.
# Usage: python3 tests/phone_batch_h_screens.py [URL] [OUT]
import asyncio,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/workspace/echo/phone_app_review/batch_H_screens';os.makedirs(OUT,exist_ok=True)
CHIP={'fox':'ginger','cat':'ginger','owl':'brown'}
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def onboard(pg,age=1):
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700)
  await T(pg,'#obgo',400)
  for _ in range(12):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await T(pg,f'.obagebtn >> nth={age}',600)
async def to_home(b,p,animal,hour=11):
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  await onboard(pg);await pick(pg,animal);await T(pg,'#ornext',300);await T(pg,f'.orchip[data-c={CHIP[animal]}]',900)
  await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1500)
  for _ in range(40):   # tap through any intro bubbles (H13 tap-to-advance)
    w=await pg.evaluate("!!(window.Dialogue&&Dialogue.waiting&&Dialogue.waiting()&&(Dialogue.advance(),1))")
    if not w and await pg.locator('#sc').count():break
    await pg.wait_for_timeout(250)
  # put the clock at `hour` local (same helper as phone_release_test DAYTIME)
  await pg.evaluate(f"(()=>{{const s=__echo.state,d=new Date(Date.now()+(s.clockOffset||0));s.clockOffset=(s.clockOffset||0)+((({hour})-d.getHours()+24)%24)*36e5;__echo.state.weatherOn=false}})()")
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());__echo.home()");await pg.wait_for_timeout(1500)
  return ctx,pg,errs
async def quiet(pg):
  for _ in range(30):
    if not await pg.evaluate("!!(window.Dialogue&&Dialogue.waiting&&Dialogue.waiting()&&(Dialogue.advance(),1))"):break
    await pg.wait_for_timeout(200)
async def shot(pg,name):
  await pg.screenshot(path=f'{OUT}/{name}.png');print('saved',name)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
    # h7 title diorama (fresh start)
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(2500);await shot(pg,'h7_title')
    # h1 miss + h3 family picker: fake camera stream (Chrome's synthetic pattern), no vision model -> miss
    await T(pg,'#obgo',400)
    for _ in range(12):
      if await pg.locator('#obnm').count():break
      await T(pg,'.scene.ob',200)
    await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await T(pg,'.obagebtn >> nth=1',600)
    await pg.wait_for_selector('#orcamctl:not([hidden])',timeout=25000);await pg.wait_for_timeout(600);await shot(pg,'h1_picker_fallback')
    await T(pg,'#orpick',800);await shot(pg,'h3_family_picker');await ctx.close()
    # fox: den parallax + sky taps + hum
    ctx,pg,errs=await to_home(b,p,'fox',11);await quiet(pg)
    # let the first-day "where I came from" talk open and finish (answer its chips) so h6/h5 show the plain home scene
    await pg.wait_for_timeout(3600);calm=0
    for _ in range(40):
      if await pg.locator('#overlay .choices .btn').count():
        await pg.locator('#overlay .choices .btn').first.click();await pg.wait_for_timeout(150);await pg.locator('#overlay .choices .btn').first.click();calm=0
      elif await pg.evaluate("!!(window.Dialogue&&Dialogue.waiting&&Dialogue.waiting()&&(Dialogue.advance(),1))"):calm=0
      else:calm+=1
      if calm>=6:break
      await pg.wait_for_timeout(250)
    await pg.evaluate("(()=>{const b=document.getElementById('b');if(b)b.style.display='none'})()");await pg.wait_for_timeout(1200)
    info=await pg.evaluate("(()=>{const sc=document.getElementById('sc');return {scene:__echo.state.scene,planes:sc.querySelectorAll('.den-wrap .den-plane').length,motes:!!sc.querySelector('.den-motes'),xf:[...sc.querySelectorAll('.den-plane')].map(e=>getComputedStyle(e).transform).slice(0,5),cls:sc.className,solar:sc.dataset.solar}})()");print('fox home',info)
    await shot(pg,'h6_parallax_den')
    sun=await pg.evaluate("(()=>{let so=window.SOLAR&&SOLAR.at?SOLAR.at(Date.now()+(__echo.state.clockOffset||0)):null;if(so&&ENV_HOTSPOTS.skySolar)so=ENV_HOTSPOTS.skySolar(so,document.getElementById('sc'));return so&&{phase:so.phase,sun:so.sun}})()")   # the tappable sun = the disc painted in the den sky;print('solar',sun and {'phase':sun.get('phase'),'sun':sun.get('sun')})
    if sun and sun.get('sun'):
      R=await pg.evaluate("(()=>{const r=document.getElementById('sc').getBoundingClientRect();return [r.left,r.top,r.width]})()");k=R[2]/180
      await pg.mouse.click(R[0]+sun['sun']['x']*k,R[1]+sun['sun']['y']*k);await pg.wait_for_timeout(180)
      print('sky tap',await pg.evaluate("window.ENV_HOTSPOTS&&[...document.querySelectorAll('#sc .env-sky-flare,#sc .env-spark,#sc .env-note')].map(e=>e.className.split(' ')[0])"));await shot(pg,'h5_sky_tap')
    await pg.wait_for_timeout(1200);await quiet(pg)
    r=await pg.evaluate("__echo.affDo('hum')");await pg.wait_for_timeout(500)
    if not await pg.locator('#overlay .choices .btn').count():   # h17 shows the hum reply with reply chips open (Daniel: chips must not hide the lawn)
      await pg.evaluate("__echo.choices([['⭐','Yes!'],['💗','(lean in)']],()=>{})");await pg.wait_for_timeout(700);print('hum',r,await pg.evaluate("document.querySelectorAll('#sc .humnote,#sc [class*=hum],#sc .alnote').length"));await shot(pg,'h17_hum_song')
    # PM round 2: chips open over the home scene (hum reply chips): the scene lifts so feet + log stay on visible lawn
    print('chips lift',await pg.evaluate("(()=>{const sc=document.getElementById('sc');return {lift:sc.dataset.lift||0,chips:document.querySelectorAll('#overlay .choices .btn').length}})()"))
    # PM round 2: returning player's title (own Echo in front, grounded, wild Echoes around it)
    await pg.reload()
    for _ in range(12):
      await pg.wait_for_timeout(200)
      if await pg.locator('.scene.ttl.biome .ttown').count():break
    await pg.wait_for_timeout(300);await shot(pg,'h7_title_return')
    print('errs',errs);await ctx.close()
    # house cat at home (sunbeam_room)
    ctx,pg,errs=await to_home(b,p,'cat',11);await quiet(pg)
    print('cat home',await pg.evaluate("({scene:__echo.state.scene,home:__echo.scene.home().id,bg:getComputedStyle(document.getElementById('sc')).backgroundImage.slice(0,200)})"))
    await shot(pg,'sunbeam_room');print('errs',errs);await ctx.close();await b.close()
if __name__=='__main__':asyncio.run(main())
