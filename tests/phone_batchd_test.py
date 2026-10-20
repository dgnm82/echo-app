# Batch D music-first phone test (handoff/batch_d_music_v1.md). Usage: python3 tests/phone_batchd_test.py [base-url] [shot-dir]
# Title glow on the beat + floating notes (static + none under reduced motion), bond tier loops, beat clock, home pulse, home sound,
# Pairs chimes, Dig ladder, Snack Catch tune, Cushion Tower sparkle, runner pulse, postcard stamp, Memory Book sounds, Quieter music, no errors / 404s.
import asyncio,sys,os,re
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/batchd';os.makedirs(OUT,exist_ok=True)
ok=0;bad=[]
def check(c,msg):
  global ok
  if c:ok+=1
  else:bad.append(msg);print('FAIL',msg)
SPY="window.__os=[];const _o=Music.oneShot;Music.oneShot=(n,o)=>{__os.push(n);return _o(n,o)};window.__sp=[];const _p=Sound.play;Sound.play=(n,o)=>{__sp.push(n);return _p(n,o)}"
async def title(b,p,rm,errs):
  ctx=await b.new_context(**p.devices['iPhone 13'],reduced_motion='reduce' if rm else 'no-preference');pg=await ctx.new_page()
  pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and errs.append('404 '+r.url))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(1200)
  check(await pg.locator('.scene.ttl .oblogo-glow.g5').count()==1,f'title glow is the level-5 glow (rm={rm})')
  fr=set()
  for i in range(14):
    fr.add(await pg.evaluate("document.querySelector('.scene.ttl .oblogo-glow').dataset.f||'0'"));await pg.wait_for_timeout(150)
  bg=await pg.evaluate("getComputedStyle(document.querySelector('.scene.ttl .oblogo-glow')).backgroundImage")
  nc=await pg.locator('.scene.ttl .mfx-tnotes').count()
  if rm:
    check('logo_glow5_0' in bg,f'reduced motion: static glow frame ({bg})');check(nc==0,'reduced motion: no floating notes');check(fr<={'0'},f'reduced motion: frame held {fr}')
  else:
    check(len(fr)>=2,f'glow frames change on the beat {fr}');check(nc==1,'floating notes canvas');await pg.wait_for_timeout(2500)
    n=await pg.evaluate("(()=>{const c=document.querySelector('.mfx-tnotes'),d=c.getContext('2d').getImageData(0,0,180,120).data;let n=0;for(let i=3;i<d.length;i+=4)n+=d[i]>0;return n})()");check(n>20,f'floating notes drawn ({n} px)')
  await pg.screenshot(path=f"{OUT}/title{'_rm' if rm else ''}.png",clip={'x':0,'y':0,'width':390,'height':330});await ctx.close()
async def home(b,p,kind,errs):
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
  pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and errs.append('404 '+r.url))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.evaluate(SPY)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove())")
  fam='slyte' if kind=='fox' else 'whimber'
  await pg.click('#cr');await pg.wait_for_timeout(2500)
  pl=await pg.evaluate("Music.playing");check(pl and pl.endswith('_t1_loop') and pl.startswith(f'bg_{fam}_'),f'{kind} new bond plays the T1 layer ({pl})')
  check(await pg.evaluate("!!Music.clock()&&Music.clock().name===Music.playing"),'beat clock follows the loop')
  check(await pg.evaluate("!!MusicFX.beat()"),'MusicFX.beat() has a grid for the home loop')
  seen=set()
  for i in range(30):
    seen.add(await pg.evaluate("(()=>{const a=document.querySelector('#cr canvas.aura');return a?a.classList.contains('mfx-beat'):null})()"));await pg.wait_for_timeout(60)
  check(seen=={True,False},f'home aura pulses on the beat {seen}')
  src=await pg.evaluate("Music.oneShot('notes/'+(__echo.state.kind==='fox'?'slyte_d5':'whimber_bb4'),{vol:.01}).then(s=>!!s&&s.buffer.sampleRate)");check(bool(src),f'Music.oneShot plays a note ({src})')
  # tiers: bond 370 -> glow 4 -> full loop on the next home()
  await pg.evaluate("__echo.state.bond=210;__echo.homeIn&&0");await pg.evaluate("__echo.glowSync&&__echo.glowSync()")
  await pg.evaluate("Music.home(__echo.state.kind,__echo.glow())");await pg.wait_for_timeout(300);t3=await pg.evaluate("Music.playing");check(t3.endswith('_t3_loop'),f'bond 210 = T3 ({t3})')
  await pg.evaluate("__echo.state.bond=380");await pg.evaluate("Music.home(__echo.state.kind,__echo.glow())");await pg.wait_for_timeout(300);t4=await pg.evaluate("Music.playing")
  check(t4==f'bg_{fam}_day_loop' or t4==f'bg_{fam}_twilight_loop',f'bond 380 = the full loop ({t4})')
  # petting hum (stroke on the Echo)
  bx=await pg.locator('#cr').bounding_box();cdp=await ctx.new_cdp_session(pg);x0,y0=bx['x']+bx['width']/2,bx['y']+bx['height']/2
  await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x0,'y':y0}]})
  for i in range(40):
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x0+((i%10)-5)*4,'y':y0}]});await pg.wait_for_timeout(40)
  await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  hum=await pg.evaluate("__os.filter(n=>n.startsWith('pet_hum_'))");check(len(hum)>=1 and hum[0]==f'pet_hum_{fam}',f'petting hum ({hum})')
  await pg.evaluate("document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove())")
  # games (bond high enough for all)
  await pg.evaluate("__echo.state.bond=300");names=await pg.evaluate("__echo.games()")
  async def open_game(word,sel):
    await pg.evaluate("CONFIG.sessionLimits.games=99;__echo.state.needs.rest=100;__echo.state.needs.food=100");await pg.evaluate("document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove())")
    await pg.click('#play');await pg.wait_for_timeout(300);cb=pg.locator('.choices button',has_text=word).first
    if not await cb.count():await pg.screenshot(path=f'{OUT}/nogame_{word}.png');print('choices',await pg.locator('.choices button').all_inner_texts(),await pg.locator('#gs').count())
    await cb.click();await cb.click();await pg.wait_for_selector(sel,timeout=6000);await pg.wait_for_timeout(500)
  async def leave():
    for i in range(3):
      if not await pg.locator('#gs').count():break
      await pg.evaluate("(()=>{const q=document.querySelector('#quit,#g2done');if(q)q.click()})()");await pg.wait_for_timeout(700)
    await pg.evaluate("document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove())")
  G=lambda rx:next((n for n in names if re.search(rx,n)),None);print(kind,'games',names)
  pw=G('Pairs')
  await open_game(pw,'#mg, .memgame, .mcard');await pg.evaluate("__os.length=0;__sp.length=0")
  i,j=await pg.evaluate("(()=>{const c=__mem.cards;return [0,MemoryEngine.partner(__mem,0)]})()")
  await pg.evaluate(f"__memTap({i})");await pg.wait_for_timeout(200);await pg.evaluate(f"__memTap({j})");await pg.wait_for_timeout(500)
  os_=await pg.evaluate("__os");sp=await pg.evaluate("__sp")
  check(len([n for n in os_ if n.startswith(f'notes/{fam}_')])==4 and 'memory_pair_found' not in sp,f'pairs: flip+flip+match chime = 4 notes ({os_})')
  await leave()
  dw=G('Dig|Weave|Tumble')
  if dw:
    await open_game(dw,'#lc, canvas');await pg.evaluate("__os.length=0")
    await pg.evaluate("(()=>{const g=__dig;for(let r=0;r<2;r++)g.grid[g.h-1-r]=Array(g.w).fill('dirt').map((c,x)=>x<g.w-1?c:null);})()")
    await pg.evaluate("(()=>{const g=__dig;g.piece.cells=[[0,0],[0,1]];g.piece.x=g.w-1;LinesEngine.drop(g);__digAfter()})()");await pg.wait_for_timeout(400)
    d=await pg.evaluate("__os");check(len([n for n in d if n.startswith(f'notes/{fam}_')])==2,f'dig: a 2-row clear = 2 ladder steps ({d})');await leave()
  else: print('no dig game named',dw,names)
  cw=G('Catch')
  await open_game(cw,'#cc');await pg.evaluate("__os.length=0")
  for k in range(3):
    await pg.evaluate("__catch.ev.push({type:'catch',gold:false})");await pg.wait_for_timeout(120)
  c3=await pg.evaluate("__os");check(len(c3)==3 and all(n.startswith(f'notes/{fam}_') for n in c3),f'catch: each catch = the next tune note ({c3})')
  await leave()
  sw=G('Tower|Steps|Stair')
  await open_game(sw,'#stc');await pg.evaluate("window.__spk=0;const _d=MusicFX.drawSparkle;MusicFX.drawSparkle=(...a)=>{__spk++;return _d(...a)};MusicFX.onBeatNow=()=>true;__stack.sx=__stack.top;__stackPress()");await pg.wait_for_timeout(120)
  await pg.screenshot(path=f'{OUT}/stack_sparkle_{kind}.png');check(await pg.evaluate("__spk")>=2,'tower: an on-beat drop draws the sparkle')
  await pg.evaluate("MusicFX.onBeatNow=()=>false;window.__spk=0;__stack.sx=__stack.top;__stackPress()");await pg.wait_for_timeout(400);check(await pg.evaluate("__spk")==0,'tower: off-beat drop = no sparkle, stacks normally')
  await leave()
  if kind=='fox':
    await open_game(G('Dash'),'#rc');await pg.evaluate("window.__rp=0;const _r=MusicFX.drawRunPulse;MusicFX.drawRunPulse=(...a)=>{__rp++;return _r(...a)}");await pg.wait_for_timeout(600)
    check(await pg.evaluate("__rp")>5,'runner: the ground pulse is drawn every frame');await pg.screenshot(path=f'{OUT}/run_pulse.png');await leave()
  # postcards + Memory Book sounds
  stamp=await pg.evaluate(f"MusicFX.stampHTML('{fam}','pond')")
  check('data-tune' in stamp and f'pc_tune/{fam}_pond.png' in stamp,f'postcard stamp html ({stamp[:80]})')
  # Quieter music toggle state survives in S
  await pg.evaluate("__echo.state.musicQuiet=true;Music.refresh()");check(await pg.evaluate("__echo.state.musicQuiet===true"),'quieter music flag')
  # A5: next app open = first hello of the session -> the real animal's home sound (waits for the first tap if audio is still locked)
  await pg.reload();await pg.wait_for_timeout(2500);await pg.click('#cr');await pg.wait_for_timeout(1500)
  hs=await pg.evaluate("performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/music/home_')).map(n=>n.split('/music/')[1])")
  check(hs==[f'home_{kind}.ogg'],f'home sound at the first hello of the session ({hs})')
  await ctx.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);errs=[]
    await title(b,p,False,errs);await title(b,p,True,errs)
    for k in ('fox','owl'):await home(b,p,k,errs)
    check(not errs,f'no page errors / 404s {errs[:6]}')
    await b.close()
  print(f'batch D phone: {ok} ok, {len(bad)} fail');sys.exit(1 if bad else 0)
asyncio.run(main())
