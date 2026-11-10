# Music School step 3: the game music touches on a phone (touch, iPhone 13 profile, real shipped songbook).
# Home beat bounce + den flower sway (and none in reduced motion), Catch plays a songbook hook, Stack climbs the ladder with note sparkles,
# Meadow Dash is beat-locked to its 126 bpm loop with the gold beat mark, a Dig floor plays a tune opening, "Our song grew!" plays the growing song.
# Usage: python3 tests/phone_music3_test.py [URL] [SHOTDIR]   (ECHO_TZ=UTC etc. sets the browser time zone: the home loop is day/twilight by local hour)
import asyncio,sys,os,json,time
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
SHOT=sys.argv[2] if len(sys.argv)>2 else '/tmp/music3_shots';os.makedirs(SHOT,exist_ok=True)
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SB=json.load(open(os.path.join(R,'music/tunes.json')))['songbook'];IDS={t['id'] for t in SB['slyte']}
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def wait(pg,js,ms):
  t0=time.time()
  while (time.time()-t0)*1000<ms:
    if await pg.evaluate(f"(()=>{{try{{return !!({js})}}catch(e){{return false}}}})()"):return True
    await pg.wait_for_timeout(50)
  return False
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    ctx=await b.new_context(**p.devices['iPhone 13'],**({'timezone_id':os.environ['ECHO_TZ']} if os.environ.get('ECHO_TZ') else {}));pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-dev-wu','0')");await pg.reload();await pg.wait_for_timeout(600)
    await T(pg,'#obgo',400)
    for _ in range(12):
      if await pg.locator('#obnm').count():break
      await T(pg,'.scene.ob',200)
    await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await pick(pg,'dog');await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
    await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep',1200)
    await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());CONFIG.ambientMin=999;CONFIG.ambientMax=999;const b=document.getElementById('b');if(b)b.style.display='none'")
    # 1) Home: bounce + sway on the beat while the home loop plays
    check(await wait(pg,"Music.clock()&&/^bg_/.test(Music.clock().name)",8000),'home loop playing')
    name=await pg.evaluate("Music.clock()&&Music.clock().name")
    # Sample >= 3 s, and keep going (up to 3 sway periods + 0.5 s) until both frames showed: day loops sway on every beat, but twilight loops
    # (80 bpm, 3/4) sway only on beat 1 of each bar, alternating f1/f2 per bar (2.25 s), so a flat 3 s window caught a single downbeat.
    seen=await pg.evaluate("""new Promise(res=>{const o={beat:0,rest:0,sway:new Set(),url:'',spots:document.querySelectorAll('#sc .den-hotspot[data-sway-orig]').length,shot:false};const t0=performance.now();
      const c=Music.clock(),tm=((window.MusicFX&&MusicFX.tempo&&MusicFX.tempo())||{})[c&&c.name]||{bpm:96,beatsPerBar:4},tw=/twilight/.test((c&&c.name)||'');
      const unit=60000/tm.bpm*(tw?tm.beatsPerBar:1),maxMs=Math.max(3000,3*unit+500);o.maxMs=Math.round(maxMs);
      (function f(){const c=document.querySelector('#sc #cr');if(c&&c.classList.contains('beat'))o.beat++;else o.rest++;document.querySelectorAll('#sc .den-hotspot[data-sway-orig]').forEach(e=>{o.sway.add(e.dataset.sway);if(e.dataset.sway!=='0')o.url=e.style.backgroundImage});
        const el=performance.now()-t0;if(el<3000||(el<maxMs&&!(o.sway.has('1')&&o.sway.has('2'))))requestAnimationFrame(f);else{o.ms=Math.round(el);o.sway=[...o.sway].sort();o.spots=document.querySelectorAll('#sc .den-hotspot[data-sway-orig]').length;res(o)}})()})""")
    check(seen['beat']>0 and seen['rest']>seen['beat'],f'home ({name}): the Echo bobs on the beat, short holds ({seen["beat"]} beat / {seen["rest"]} rest frames)')
    check(seen['spots']>0 and '1' in seen['sway'] and '2' in seen['sway'] and 'px/beat/sway_' in seen['url'],f'den flowers sway f1/f2 with Pixal\'s strips ({seen["spots"]} flowers, {seen["sway"]}, {seen["url"][:40]}, {seen["ms"]}/{seen["maxMs"]} ms)')
    tr=await pg.evaluate("getComputedStyle(document.querySelector('#sc #cr')).transitionProperty");check('transform' not in tr and 'all' not in tr,f'the bob is instant (no easing on transform: {tr})')
    await wait(pg,"document.querySelector('#sc #cr.beat')&&[...document.querySelectorAll('#sc .den-hotspot[data-sway-orig]')].some(e=>e.dataset.sway!=='0')",4000)
    await pg.screenshot(path=f'{SHOT}/home_beat_bounce_sway.png')
    await pg.emulate_media(reduced_motion='reduce');await pg.wait_for_timeout(200)
    rm=await pg.evaluate("""new Promise(res=>{let b=0,s=0;const t0=performance.now();(function f(){if(document.querySelector('#sc #cr.beat'))b++;document.querySelectorAll('#sc .den-hotspot[data-sway-orig]').forEach(e=>{if(e.dataset.sway&&e.dataset.sway!=='0')s++});if(performance.now()-t0<2000)requestAnimationFrame(f);else res([b,s])})()})""")
    check(rm==[0,0],f'reduced motion: no bounce, no sway ({rm})');await pg.emulate_media(reduced_motion='no-preference')
    # 2) Catch: the songbook hook note by note; a whole hook = the Echo hums it, then the next tune
    await pg.evaluate("__echo.catchGame()");await pg.wait_for_timeout(1200)
    ct=await pg.evaluate("MusicFX.catchTune()");check(ct and ct['id'] in IDS,f'Catch plays a shipped Ancient Echo hook ({ct})')
    r=await pg.evaluate("(()=>{const t=MusicFX.catchTune(),out=[];for(let i=0;i<t.len;i++)out.push(MusicFX.catchHit('slyte'));return {len:t.len,first:out[0].i,last:out[out.length-1],hum:MusicFX.catchTune()}})()")
    check(r['first']==0 and r['last']['done'] and r['last']['hum'],f'N catches = the first N notes; the last note completes the hook and the Echo hums it ({r["len"]} notes)')
    check(await pg.evaluate("MusicFX.catchHit('slyte')===null"),'while the Echo hums, a catch keeps today\'s sound (null)')
    await pg.wait_for_timeout(1500);await pg.screenshot(path=f'{SHOT}/catch.png');check(not errs,f'catch: no page errors {errs[:2]}')
    await pg.evaluate("document.querySelectorAll('#gs').forEach(e=>e.remove());__echo.home()");await pg.wait_for_timeout(600)
    # 3) Stack: each layer a step up the ladder, Pixal's note sparkle on the right end; the end card plays the tower back
    await pg.evaluate("window.__sn=[];const s=MusicFX.stackNote;MusicFX.stackNote=function(f,k){const r=s(f,k);__sn.push([k,r&&r.note]);return r};window.__sp=0;const p=MusicFX.stackPlay;MusicFX.stackPlay=function(f,h){__sp=h;return p(f,h)}")
    await pg.evaluate("(()=>{window.__holdSpk=1;const d=MusicFX.drawNoteSparkle;MusicFX.drawNoteSparkle=function(cx,c,x,y,ms){return d(cx,c,x,y,window.__holdSpk?Math.min(ms,120):ms)}})()")   # screenshot only: hold the sparkle on its full frame
    await pg.evaluate("__echo.stackGame()");await pg.wait_for_timeout(1200)
    for i in range(4):
      await pg.locator('#stc').tap();await pg.wait_for_timeout(60 if i==3 else 650)
    await pg.screenshot(path=f'{SHOT}/stack_note_sparkle.png');await pg.evaluate("window.__holdSpk=0")
    sn=await pg.evaluate("__sn");lad=await pg.evaluate("MusicFX.stackLadder('slyte')")
    check(len(sn)>=2 and [k for k,_ in sn]==list(range(len(sn))) and all(n==lad[k%len(lad)] for k,n in sn),f'Stack: layer k plays ladder note k ({sn})')
    for _ in range(30):
      if await pg.evaluate("!!document.querySelector('.endcard,.g2end,.gend')") or await pg.evaluate("__sp>0"):break
      await pg.locator('#stc').tap();await pg.wait_for_timeout(120)
    await wait(pg,"__sp>0",4000);sp=await pg.evaluate("__sp");check(sp>0,f'Stack end: the tower plays back as a rising tune ({sp} layers)')
    await pg.evaluate("document.querySelectorAll('#gs,.full').forEach(e=>e.remove());__echo.home()");await pg.wait_for_timeout(600)
    # 4) Meadow Dash: beat-locked to the 126 bpm loop, the gold beat mark after the obstacles
    await pg.evaluate("const s=RunnerEngine.step;RunnerEngine.step=function(g,dt){window.__rg=g;return s(g,dt)};window.__pm=[];const d=MusicFX.drawRunPulse;MusicFX.drawRunPulse=function(cx,x,y){__pm.push([x,y]);return d.apply(this,arguments)}")
    await pg.evaluate("__echo.runGame()")
    # g.beat is refreshed every frame from the playing loop, so read it once it was taken from the meadow-dash clock (the first frames
    # after runGame can still carry the home loop's grid while the music crossfades: a read on the same tick as the clock check raced)
    ok=await wait(pg,"window.__rg&&__rg.beat&&Music.clock()&&/meadow_dash/.test(Music.clock().name)&&__rg.beat.bpm===MusicFX.tempo()[Music.clock().name].bpm",6000);bt=await pg.evaluate("window.__rg&&__rg.beat")
    check(ok and abs(bt['spb']-60/126)<1e-6,f'Run: the beat grid comes from game_meadow_dash_loop ({bt})')
    await wait(pg,"__rg.obs.some(o=>o.beat&&o.x-__rg.dist<300)&&MusicFX.beat().phase<.12",5000);await pg.screenshot(path=f'{SHOT}/run_beat_mark.png')
    nb=await pg.evaluate("[__rg.obs.filter(o=>o.beat).length,__rg.obs.length]");check(nb[0]>=1,f'Run: obstacles were moved onto the beat ({nb[0]}/{nb[1]})')
    pm=await pg.evaluate("__pm.slice(-1)[0]");check(pm==[84,474],f'Run: the beat-mark hook is called at (84,474) ({pm}; drawing off since Nov 3, LIST #9)')
    await pg.evaluate("document.querySelectorAll('#gs,.full').forEach(e=>e.remove());__echo.home()");await pg.wait_for_timeout(600)
    # 5) Dig: a floor plays the opening of a family tune
    df=await pg.evaluate("MusicFX.digFloor('slyte')");check(df and df['id'] in IDS and df['ms']>0,f'Dig floor: the opening of {df and df["id"]} ({df and df["ms"]} ms)')
    # 6) Our song grew!: the growing song after the sting (stage 2 = 1 phrase; the last stage = the whole hook)
    await pg.evaluate("__echo.playBondUp(1,2)");await wait(pg,"window.__growsong",4000);g2=await pg.evaluate("window.__growsong")
    check(g2 and g2['id'] in IDS and g2['stage']==2 and g2['phrases']==1 and not g2['full'] and g2['delay']>=1500,f'Our song grew! stage 2: one phrase after the sting ({g2})')
    await pg.wait_for_timeout(1800);await pg.screenshot(path=f'{SHOT}/bondup_growing_song.png')
    gs5=await pg.evaluate("MusicFX._pure.growPlan(MusicFX.growTune('slyte'),5)");check(gs5 and gs5['full'],'stage 5 plays the whole hook')
    check(not errs,f'no page errors {errs[:2]}');await b.close()
  print(f'music step 3 phone test: {len(fails)} failed');sys.exit(1 if fails else 0)
asyncio.run(main())
