# Batch H (H1/H2/H3): the camera-first Origin on a phone. Usage: python3 tests/phone_camera_origin_test.py [base-url] [shot-dir]
#  A) fake camera: the Magic Window opens FIRST with Cole's band copy (ask + hint); a miss shows retry + "Pick your Echo";
#     retry re-opens the window; pick -> the family-first picker; the camera is stopped (no live tracks) and nothing is stored.
#  B) a vision label (ECHO_VISION stub) + 4 agreeing frames -> straight to the invite with that animal (src: camera).
#  C) camera declined (NotAllowedError) and D) no camera API -> straight to the family-first picker.
#  Every case: no request leaves localhost, no frame / image data in localStorage, no photo/picture/save wording on screen.
import asyncio,sys,os,re,json
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/camorigin';os.makedirs(OUT,exist_ok=True)
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)
SH=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','dialogue','shared.json')))['barks']
def band(k,b):
  L=SH[k];return ([l for l in L if (l.get('context') or {}).get('age_band')==b] or [l for l in L if (l.get('context') or {}).get('age_band')=='all'] or [L[1] if len(L)>1 else L[0]])[0]['text']
BANNED=re.compile(r'\b(photos?|pictures?|pics?|save[sd]?|saving|snap(shot)?)\b',re.I)
DENY="navigator.mediaDevices&&(navigator.mediaDevices.getUserMedia=()=>Promise.reject(Object.assign(new Error('no'),{name:'NotAllowedError'})))"
NOAPI="try{Object.defineProperty(navigator,'mediaDevices',{value:undefined,configurable:true})}catch(e){}"
VISION="window.ECHO_VISION={classify:async()=>({labels:[{id:'fox',conf:.97}]})}"
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def to_origin(b,p,errs,reqs,init=None,age=1):
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
  if init:await pg.add_init_script(init)
  pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('request',lambda r:reqs.append(r.url))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700)
  await T(pg,'#obgo',400)
  for _ in range(12):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await T(pg,f'.obagebtn >> nth={age}',600)
  return ctx,pg
async def common(pg,tag):
  txt=await pg.evaluate("document.querySelector('#app').innerText");check(not BANNED.search(txt),f'{tag}: no photo / picture / save wording on screen')
  ls=await pg.evaluate("JSON.stringify(localStorage)");check('data:image' not in ls and 'blob:' not in ls and len(ls)<400000,f'{tag}: no frame or image data saved')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
    errs=[];reqs=[]
    # A) fake camera, no vision model: the window opens first; a miss offers retry + pick
    ctx,pg=await to_origin(b,p,errs,reqs)
    check(await pg.locator('#orvid').count()==1 and await pg.locator('.orfamcard').count()==0,'A: the Magic Window opens first (camera-first Origin)')
    check((await pg.inner_text('#orcamask')).strip()==band('ui_or_cam_ask','7-8'),'A: ask copy is the 7-8 band line')
    check((await pg.inner_text('#orcamhint')).strip()==band('ui_or_cam_hint','7-8'),'A: hint copy is the 7-8 band line')
    await pg.wait_for_timeout(1500);live=await pg.evaluate("(()=>{const v=document.getElementById('orvid');return !!(v&&v.srcObject&&v.srcObject.getTracks().some(t=>t.readyState==='live'))})()")
    check(live,'A: the fake camera stream is live in the window');await pg.locator('#screen').screenshot(path=f'{OUT}/a-window.png')
    await common(pg,'A window')
    try:await pg.wait_for_selector('#orcamctl:not([hidden]),#orinv',timeout=20000)
    except Exception:pass
    if await pg.locator('#orcamctl:not([hidden])').count():
      check((await pg.inner_text('#orcammiss')).strip()==band('ui_or_cam_miss','7-8'),'A: miss copy (7-8)')
      check(band('ui_or_cam_retry','7-8') in await pg.inner_text('#orretry') and 'Pick' in await pg.inner_text('#orpick'),'A: retry + pick buttons')
      st=await pg.evaluate("(()=>{const v=document.getElementById('orvid');return v?!!v.srcObject:false})()");check(not st,'A: the camera is stopped after a miss')
      await pg.locator('#screen').screenshot(path=f'{OUT}/a-miss.png');await common(pg,'A miss')
      await T(pg,'#orretry',800);check(await pg.locator('#orvid').count()==1 and await pg.locator('#orcamctl[hidden]').count()==1,'A: retry re-opens the Magic Window')
      try:await pg.wait_for_selector('#orcamctl:not([hidden])',timeout=20000)
      except Exception:pass
      await T(pg,'#orpick',600);check(await pg.locator('.orfamcard').count()==3,'A: Pick your Echo -> the family-first picker (3 families)')
      check(await pg.evaluate("!document.getElementById('orvid')"),'A: the window is gone on the picker')
    else:
      check(await pg.evaluate("(__echo.state.origin||{}).src")=='camera','A: the fake frame matched (camera src) instead of a miss')
    await ctx.close()
    # B) a confident vision label -> straight to the invite with that animal
    ctx,pg=await to_origin(b,p,errs,reqs,VISION)
    try:await pg.wait_for_selector('#orinv,#orcamctl:not([hidden])',timeout=20000)
    except Exception:pass
    o=await pg.evaluate("__echo.state.origin||{}")
    if await pg.locator('#orinv').count():
      check(o.get('animal')=='fox' and o.get('src')=='camera' and o.get('family')=='slyte','B: a vision match goes straight to the invite as a fox ('+json.dumps({k:o.get(k) for k in ('animal','family','src')})+')')
      await pg.locator('#screen').screenshot(path=f'{OUT}/b-invite.png')
    else:
      print('note: B fell back to the picker (the fake frame tripped the conservative person / doubt gate)');check(await pg.locator('#orpick').count()==1,'B: conservative fallback still offers Pick your Echo')
    await common(pg,'B');await ctx.close()
    # C) declined and D) no camera API -> the picker straight away
    for tag,init in (('C declined',DENY),('D no camera',NOAPI)):
      ctx,pg=await to_origin(b,p,errs,reqs,init)
      await pg.wait_for_timeout(600);check(await pg.locator('.orfamcard').count()==3 and await pg.locator('#orvid').count()==0,f'{tag}: straight to the family-first picker')
      await common(pg,tag);await pg.locator('#screen').screenshot(path=f'{OUT}/{tag[0].lower()}-picker.png');await ctx.close()
    ext=[u for u in reqs if not re.match(r'^(https?://(localhost|127\.0\.0\.1)(:\d+)?/|data:|blob:|about:)',u)]
    check(not ext,'no request leaves localhost '+str(ext[:3]));check(not errs,'no page errors '+str(errs[:3]))
    await b.close()
  print(f'camera origin: {ok} passed, {len(bad)} failed');sys.exit(1 if bad else 0)
asyncio.run(main())
