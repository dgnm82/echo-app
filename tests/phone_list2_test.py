# LIST2 web batch (Nov 1): #3 Echo It Back rows (> 4 notes = two even rows, phone + 240x320 device), #7 clouds behind the den foreground,
# #9 "sitting together" label lifted off the bottom edge, #5 Pairs by sound (alike faces / sound-only cards), #10 no "bond" on screen.
# Usage: python3 tests/phone_list2_test.py [url] [screenshot dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick as orpick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/list2';os.makedirs(OUT,exist_ok=True)
CLEAN="document.querySelectorAll('.full,.book,.panel').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''"
DEVICE=dict(viewport={'width':240,'height':320},device_scale_factor=1,has_touch=True,is_mobile=True)
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)
VR="""(sel)=>{const sc=document.getElementById('screen').getBoundingClientRect(),z=sc.width/180;return [...document.querySelectorAll(sel)].map(e=>{const b=e.getBoundingClientRect();return [(b.left-sc.left)/z,(b.top-sc.top)/z,(b.right-sc.left)/z,(b.bottom-sc.top)/z].map(v=>Math.round(v*10)/10)})}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);errs=[]
    for name,co in (('phone',p.devices['iPhone 13']),('device',DEVICE)):
      if os.environ.get('ONLY') and os.environ['ONLY']!=name:continue
      ctx=await b.new_context(**co);pg=await ctx.new_page();await nocam(pg)
      pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and errs.append('404 '+r.url))
      async def T(sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
      async def wait(js,ms=8000):
        for _ in range(ms//100):
          if await pg.evaluate(js):return True
          await pg.wait_for_timeout(100)
        return False
      async def home():
        await pg.evaluate(CLEAN+";if(window.EchoBack)EchoBack.stop();__echo.state.napUntil=0;Object.assign(__echo.state.needs,{food:70,rest:90,play:30,comfort:60});__echo.home()");await pg.wait_for_timeout(900);await pg.evaluate(CLEAN)
      await pg.goto(URL);await pg.evaluate("localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600);await T('#obgo',400)
      for _ in range(6):
        if await pg.locator('#obnm').count():break
        await T('.scene.ob',200)
      await pg.fill('#obnm','Mia');await T('#obnext');await T('#obyes');await pg.evaluate("__echo.setBand('9-10')")   # 9-10: Echo It Back starts at 6 notes
      await orpick(pg,'fox');await T('#ornext',300);await T('.orchip[data-c=white]',900);await T('#orinv',3000)
      await T('#ornm',400);await T('#orkeep',1500)
      for _ in range(150):
        if not await pg.locator('.choices button').count() and await pg.locator('#play').count():break
        if await pg.locator('.choices button').count():
          try:x=pg.locator('.choices button').first;await x.click(timeout=800)
          except Exception:pass
        await pg.wait_for_timeout(200)
      await pg.wait_for_timeout(1200);await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999");await home()
      tag=f'[{name}]'
      # ---- #3 Echo It Back: 6 notes = 3 + 3, 8 notes = 4 + 4, both rows of the tune and of the answer on screen and above the Echo
      for ln in (6,8):
        await home()
        if ln==8:await pg.evaluate("(()=>{const b=JSON.parse(localStorage.getItem('echo-songbook-v1'));b.progress[__echo.state.kidId].len=8;localStorage.setItem('echo-songbook-v1',JSON.stringify(b))})()")
        await T('#play',500);c=pg.locator('.choices button',has_text='Echo It Back').first;await c.click()
        if await pg.locator('#eibsame').count():await T('#eibsame')
        check(await wait("EchoBack.cur&&EchoBack.cur.phase==='child'",25000),tag+f' EIB {ln}: your turn')
        if await pg.locator('#eibsame').count()==0 and await pg.evaluate("!!document.querySelector('.eibtiles:not([hidden])')"):await T('#eibsame')
        a=await pg.evaluate("EchoBack.cur.asked");check(len(a)==ln,tag+f' EIB asked {len(a)} notes')
        for s_ in a:await T(f'.eibpad[data-pad="{s_}"]',140)
        await pg.wait_for_timeout(120)
        ask=await pg.evaluate(VR,'.eibask .eibn');ans=await pg.evaluate(VR,'.eibans .eibn');echo=(await pg.evaluate(VR,'#cr'))[0]
        def rows(R):
          out=[]
          for t in sorted(r[3] for r in R):
            if not out or t-out[-1]>6:out.append(t)
          return out
        tops=rows(ask);half=ln//2
        check(len(tops)==2 and sum(1 for r in ask if abs(r[3]-tops[0])<=6)==half,tag+f' EIB {ln}: the tune is two even rows {tops} {ask}')
        check(len(rows(ans))==2,tag+f' EIB {ln}: the answer is two rows too {rows(ans)}')
        check(all(r[0]>=0 and r[2]<=180 and r[1]>=0 for r in ask+ans),tag+f' EIB {ln}: every note inside the 180 px screen')
        check(max(r[3] for r in ask+ans)<=echo[1]+4,tag+f' EIB {ln}: notes stay above the Echo ({max(r[3] for r in ask+ans)} vs {echo[1]})')
        await pg.screenshot(path=f'{OUT}/item3_eib_{ln}notes_{name}.png')
        await pg.evaluate("EchoBack.stop()")
      # 4 notes stay on one row (pure rule)
      check(await pg.evaluate("[3,4,5,6,7,8,16].map(n=>EchoBack._pure.rowCols(n)).join()")=='3,4,3,3,4,4,8',tag+' rowCols rule')
      # ---- #7 clouds: a cloudy sky lives inside the den, right above L0 and under L1 (vista), L2 (trees + props), L3 and the Echo
      await pg.evaluate("__echo.state.weatherOverride='cloudy'");await home();await pg.wait_for_timeout(600)
      cl=await pg.evaluate("""(()=>{const c=document.querySelector('canvas.wx-layer');if(!c)return null;const w=c.closest('.den-wrap'),z=+getComputedStyle(c).zIndex,zz=s=>{const e=document.querySelector(s);return e?+getComputedStyle(e).zIndex:null};
        const cr=document.getElementById('cr');return {inDen:!!w,prev:c.previousElementSibling&&c.previousElementSibling.dataset.layer,z,l0:zz('.den-l0'),l1:zz('.den-l1'),l2:zz('.den-l2'),wrapZ:w?+getComputedStyle(w).zIndex:null,cr:+getComputedStyle(cr).zIndex}})()""")
      check(cl and cl['inDen'] and cl['prev']=='L0' and cl['l0']<cl['z']<cl['l1']<cl['l2'] and cl['wrapZ']<cl['cr'],tag+f' clouds behind tree/props/Echo {cl}')
      await pg.screenshot(path=f'{OUT}/item7_clouds_{name}.png')
      await pg.evaluate("__echo.state.weatherOverride='rain'");await home();check(await pg.evaluate("(()=>{const c=document.querySelector('canvas.wx-layer');return !!c&&!c.closest('.den-wrap')})()"),tag+' rain still falls in front')
      await pg.evaluate("__echo.state.weatherOverride='off'");await home()
      # ---- #9 sitting together: label lifted clear of the bottom edge
      for _ in range(30):
        await pg.evaluate(CLEAN);await T('#comfort',350)
        if await pg.locator('.choices button',has_text='Sit').count():break
      c=pg.locator('.choices button',has_text='Sit').first;await c.click()
      check(await wait("!!document.querySelector('.choices.sitting')",3000),tag+' sitting together shown');await pg.wait_for_timeout(700)   # after the slide-up
      h=(await pg.evaluate(VR,'.choices.sitting .hint'))[0];print(tag,'sit label',h,await pg.evaluate("(()=>{const o=document.getElementById('overlay');return [o.getBoundingClientRect().toJSON(),document.getElementById('screen').getBoundingClientRect().toJSON(),o.innerHTML.slice(0,200),scrollY]})()"))
      check(320-h[3]>=8,tag+f' sit label >= 8 px above the bottom edge ({320-h[3]})')
      await pg.screenshot(path=f'{OUT}/item9_sitting_{name}.png')
      await pg.wait_for_timeout(8500);await home()
      # ---- #10 no "bond" on screen: How am I? panel, Memory Book, top badge label
      await T('#how',400);txt=await pg.evaluate("document.querySelector('.howpanel').innerText");check('bond' not in txt.lower() and 'Song' in txt,tag+' How am I? panel: '+txt.replace('\n',' '))
      lab=await pg.evaluate("document.getElementById('bond').getAttribute('aria-label')");check(lab.startswith('Song '),tag+' badge label '+lab)
      await home()
      if name=='phone':
        # ---- #5 Pairs by sound: alike faces (stage 3) and sound-only cards (stage 4); a pair shows its picture
        await pg.evaluate("window.__os=[];const _o=Music.oneShot;Music.oneShot=(n,o)=>{__os.push(n);return _o(n,o)};0")
        for st,face in ((3,'alike'),(4,'none')):
          await pg.evaluate(f"Object.assign(__echo.state.pairs=__echo.state.pairs||{{games:3,slow:0,boards:3}},{{games:3,stage:{st},good:0,bad:0,clean:0}})");await home()
          for _ in range(8):
            await pg.evaluate(CLEAN);await T('#play',500)
            if await pg.locator('.choices button',has_text='Pairs').count():break
            print(tag,'picker',await pg.evaluate("[...document.querySelectorAll('.choices button')].map(b=>b.textContent).join('|')"));await home()
          c=pg.locator('.choices button',has_text='Pairs').first;await c.click();await wait("!!window.__mem&&!!document.getElementById('mg')",5000)
          check(await pg.evaluate("__mem.stage")==st and await pg.evaluate("document.getElementById('gs').classList.contains('mem-'+__mem.morph.face)"),tag+f' pairs stage {st} board')
          await pg.evaluate("__os.length=0");i0=0;j=await pg.evaluate("(()=>{const c=__mem.cards;return c.findIndex((x,k)=>k>0&&x.item!==c[0].item)})()")
          await pg.evaluate("__memTap(0)");await pg.wait_for_timeout(450)
          f=await pg.evaluate("(()=>{const b=document.querySelectorAll('.mcardbtn')[0],v=b.querySelector('.mveil');return {bg:b.style.backgroundImage,veil:v?getComputedStyle(v).opacity:null,hear:b.classList.contains('hear'),label:b.getAttribute('aria-label')}})()")
          if face=='alike':check(f['veil']=='1' and f['label']=='Sound card',tag+f' alike: open card is the note card {f}')
          else:check('back' in f['bg'] and f['hear'] and f['label']=='Sound card',tag+f' sound only: card stays face down and rings {f}')
          n1=await pg.evaluate("__os.filter(n=>n.startsWith('notes/')).length");check(n1==(2 if face=='alike' else 1),tag+f' the card sings its own sound ({n1} notes)')
          if face=='alike':await pg.screenshot(path=f'{OUT}/item5_pairs_alike_{name}.png')
          pj=await pg.evaluate("MemoryEngine.partner(__mem,0)");await pg.evaluate(f"__memTap({pj})");await pg.wait_for_timeout(500)
          g=await pg.evaluate(f"document.querySelectorAll('.mcardbtn')[{pj}].style.backgroundImage");check('_glow' in g,tag+f' a pair shows its glowing picture ({g})')
          if face=='none':await pg.screenshot(path=f'{OUT}/item5_pairs_soundonly_{name}.png')
          await pg.evaluate("document.getElementById('quit').click()");await pg.wait_for_timeout(600)
      await ctx.close()
    print('ERRORS',errs);check(not errs,'no page errors / 404s '+str(errs[:3]))
    await b.close()
  print(f'list2: {ok} ok, {len(bad)} failed');sys.exit(1 if bad else 0)
asyncio.run(main())
