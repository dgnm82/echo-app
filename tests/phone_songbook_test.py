# Music School step 2: an Ancient Echo in Echo It Back, the Ancient Echoes tile, the Memory Book page (phone, touch).
# Until Cole's transcriptions land, the round uses the TEST FIXTURE (tools/fixtures/songbook_fixture.json: scale walks, not real tunes),
# injected by intercepting music/tunes.json (nothing in the app ships it). Also checks the shipped build with zero tunes degrades quietly.
# Usage: python3 tests/phone_songbook_test.py [URL] [SHOTDIR]
import asyncio,sys,os,json,time
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8797/'
SHOT=sys.argv[2] if len(sys.argv)>2 else '/tmp/songbook_shots';os.makedirs(SHOT,exist_ok=True)
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FX=json.load(open(os.path.join(R,'tools/fixtures/songbook_fixture.json')))
b2=json.loads(json.dumps([t for t in FX['slyte'] if t['id']=='fixture_steps'][0]));b2['id']='fixture_b'   # a 2nd playable fixture -> the sleeping pebble shows
FX['slyte'].append(b2)
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def wait(pg,js,ms):
  t0=time.time()
  while (time.time()-t0)*1000<ms:
    if await pg.evaluate(f"(()=>{{try{{return !!({js})}}catch(e){{return false}}}})()"):return True
    await pg.wait_for_timeout(80)
  return False
async def setup(b,p,inject):
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  if inject:
    async def route(r):
      resp=await r.fetch();j=await resp.json();j['songbook']=FX;await r.fulfill(response=resp,body=json.dumps(j),headers={**resp.headers,'content-type':'application/json'})
    await pg.route('**/music/tunes.json*',route)
  await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-dev-wu','0')");await pg.reload();await pg.wait_for_timeout(600)
  await T(pg,'#obgo',400)
  for _ in range(12):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await pick(pg,'dog');await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
  await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1200)
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());CONFIG.ambientMin=999;CONFIG.ambientMax=999")
  return ctx,pg,errs
async def play_round(pg,tag,shots):   # answer every tune with the asked notes (touch taps on the pads); returns the ancient tune count
  anc=[];seen=set();t0=time.time();shot_done=False
  while time.time()-t0<150:
    ph=await pg.evaluate("EchoBack.cur?EchoBack.cur.phase:'gone'")
    if ph in ('end','done','gone','tiles'):break
    tid=await pg.evaluate("EchoBack.cur.tune&&EchoBack.cur.tune.id")
    if tid and tid.startswith('anc:') and await pg.evaluate("!document.querySelector('.eibflo').hidden") and shots and not shot_done:
      await pg.screenshot(path=f'{SHOT}/{tag}_ancient_flourish.png');shot_done=True
    if ph=='child':
      key=await pg.evaluate("EchoBack.cur.round.tunes")
      if key not in seen:
        seen.add(key)
        if tid and tid.startswith('anc:'):
          need=await pg.evaluate("[...document.querySelectorAll('.eibpad.need')].map(p=>+p.dataset.pad)");asked=await pg.evaluate("EchoBack.cur.asked")
          anc.append(dict(slot=key,len=len(asked),need_ok=set(asked)<=set(need)))
          if shots:await pg.screenshot(path=f'{SHOT}/{tag}_ancient_your_turn.png')
      asked=await pg.evaluate("EchoBack.cur.asked")
      for s in asked:
        await pg.locator(f'.eibpad[data-pad="{s}"]').first.tap();await pg.wait_for_timeout(90)
      await wait(pg,"EchoBack.cur.phase!=='child'",4000)
    await pg.wait_for_timeout(120)
  return anc
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    # A) zero shipped tunes: no Ancient Echo, no tile, no Memory Book page
    if os.environ.get('SB_ONLY')!='fixture':
     ctx,pg,errs=await setup(b,p,False)
     await pg.evaluate("__echo.eib('play')");check(await wait(pg,"EchoBack.cur&&EchoBack.cur.phase==='child'",15000),'zero tunes: round starts')
     anc=await play_round(pg,'zero',False);check(not anc,'zero tunes: no Ancient Echo in the round')
     await wait(pg,"!EchoBack.cur",20000);await pg.evaluate("__echo.eib('play')");await pg.wait_for_timeout(1500)
     check(not await pg.locator('.eibanc').count(),'zero tunes: no Ancient Echoes tile');await pg.evaluate("EchoBack.stop();__echo.home()")
     await pg.evaluate("__echo.book()");await pg.wait_for_timeout(500);check(not await pg.locator('.bkanc').count(),'zero tunes: no Ancient Echoes page');check(not errs,f'zero tunes: no page errors {errs[:2]}')
     await ctx.close()
    # B) the fixture songbook: one Ancient Echo a round, never the first tune, pads it needs lit, it joins Ancient Echoes
    ctx,pg,errs=await setup(b,p,True)
    await pg.evaluate("__echo.eib('play')");check(await wait(pg,"EchoBack.cur&&EchoBack.cur.phase",8000),'fixture: Echo It Back opens')
    anc=await play_round(pg,'r1',True)
    check(len(anc)==1,f'round 1: exactly one Ancient Echo ({anc})');check(all(a['slot']>1 for a in anc),'never the first tune')
    L=await pg.evaluate("EchoBack.cur?EchoBack.cur.progress.len:0")
    check(all(a['need_ok'] for a in anc),'the pads the tune needs are lit')
    ml=await pg.evaluate("__echo.ml()");met=ml.get('met',{})
    check(any(v.get('h',0)>=1 for v in met.values()),f'heard -> in Ancient Echoes ({met})');check(any(v.get('m')==1 for v in met.values()),'matched flag set')
    await wait(pg,"!EchoBack.cur",25000)
    await pg.evaluate("__echo.eib('play')");check(await wait(pg,"!!document.querySelector('.eibanc .eibanci')",8000),'the Ancient Echoes tile shows the heard tune')
    n_icons=await pg.locator('.eibanci').count();check(n_icons==1,f'tile: only heard icons, no empty wells ({n_icons})')
    await pg.screenshot(path=f'{SHOT}/tile.png')
    await pg.locator('.eibanci').first.tap();await wait(pg,"EchoBack.cur.phase!=='tiles'",3000);anc2=await play_round(pg,'r2',False)
    check(len(anc2)==2 and len({a['slot'] for a in anc2})==2 and all(a['slot']>1 for a in anc2),f'chosen from the tile: 2 of the round are that tune ({anc2})')
    await wait(pg,"!EchoBack.cur",25000);await pg.evaluate("EchoBack.stop();document.querySelectorAll('.full').forEach(f=>f.remove());__echo.home()");await pg.wait_for_timeout(400)
    await pg.evaluate("__echo.book()");await pg.wait_for_timeout(600)
    n=await pg.evaluate("[document.querySelectorAll('.bkanc [data-ancplay]').length,document.querySelectorAll('.bkanc .sleep').length,document.querySelectorAll('.bkanc .bkancp').length]")
    check(n[0]==1 and n[1]==1 and n[2]==3,f'Memory Book: heard tunes + ONE sleeping pebble, page = top + 1 row + bottom ({n})')
    await pg.evaluate("document.querySelector('.bkanch').scrollIntoView()");await pg.screenshot(path=f'{SHOT}/memory_book_ancient_echoes.png')
    await pg.locator('.bkanc [data-ancplay]').first.click();await pg.wait_for_timeout(150);check(await pg.locator('.bkanc .playing').count()==1,'tapping a heard tune plays the Echo version')
    txt=await pg.evaluate("document.body.innerText");check('secret song' not in txt.lower(),'never "secret song" on screen')
    check(not errs,f'fixture: no page errors {errs[:2]}');await ctx.close();await b.close()
  print(f'songbook phone test: {len(fails)} failed');sys.exit(1 if fails else 0)
asyncio.run(main())
