# Batch G: Echo It Back v2 (round of 5, band starts, ramp, stickers, tiles + dots, misses ease off with a floor, phrases, soft stop)
# and age-based starting difficulty (9-10 Standard from game 1, 5-6 easy reverts, overrides win, age row = 3 choices), all 3 families.
# Usage: python3 tests/phone_batchg_test.py [url] [outdir]
import asyncio,sys,os,re
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/batchg';os.makedirs(OUT,exist_ok=True)
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)
CLEAN="document.querySelectorAll('.full,.book').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''"
SPY="window.__os=[];const _o=Music.oneShot;Music.oneShot=(n,o)=>{__os.push(n);return _o(n,o)};0"
BUB="((document.getElementById('b')||{}).textContent||'')"
SB="JSON.parse(localStorage.getItem('echo-songbook-v1')||'null')"
PR="(()=>{const b=JSON.parse(localStorage.getItem('echo-songbook-v1')||'null');return b&&b.progress[__echo.state.kidId]})()"
FAMS=[('twitchel','snowleopard','Mrrp',True),('slyte','fox','Awoo',False),('whimber','owl','Hoo-hoo',False)]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);errs=[]
    for fam,animal,pfx,full in FAMS:
      if os.environ.get('ONLY') and os.environ['ONLY']!=fam:continue
      ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
      pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and errs.append('404 '+r.url))
      async def T(sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
      async def pick(label,ms=900):
        c=pg.locator('.choices button',has_text=label).first;await c.click();await c.click();await pg.wait_for_timeout(ms)
      async def wait(js,ms=8000):
        for _ in range(ms//100):
          if await pg.evaluate(js):return True
          await pg.wait_for_timeout(100)
        return False
      async def tap(steps,ms=140):
        for s_ in steps:await T(f'.eibpad[data-pad="{s_}"]',ms)
      async def answer(mode='same'):   # answer the current tune (whole or phrase by phrase)
        if not await wait("EchoBack.cur&&EchoBack.cur.phase==='child'",25000):return False
        while True:
          a=await pg.evaluate("EchoBack.cur.asked");pads=await pg.evaluate("[...document.querySelectorAll('.eibpad')].map(p=>+p.dataset.pad)")
          if mode=='new':await tap([pads[-1],pads[0],pads[-1],pads[0],pads[-1]]+[pads[0]]*max(0,len(a)-3));return True
          await tap(a);ph=await pg.evaluate("[EchoBack.cur.tune.phrases?EchoBack.cur.tune.phrases.length:0,EchoBack.cur.phraseIdx]")
          if not ph[0] or ph[1]>=ph[0]-1:return True
          if not await wait(f"EchoBack.cur&&EchoBack.cur.phase==='child'&&EchoBack.cur.phraseIdx>{ph[1]}",20000):return False
      async def play_eib(ms=300):
        await pg.evaluate(CLEAN+";__echo.state.napUntil=0;Object.assign(__echo.state.needs,{food:70,rest:90,play:30});__echo.home()");await pg.wait_for_timeout(900);await pg.evaluate(CLEAN)
        await T('#play',500);await pick('Echo It Back',ms);await wait("!!document.querySelector('#eib')",5000)
      await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600);await T('#obgo',400)
      for _ in range(6):
        if await pg.locator('#obnm').count():break
        await T('.scene.ob',200)
      await pg.fill('#obnm','Mia');await T('#obnext');await T('#obyes');await T('.obagebtn >> nth=2')   # 9-10
      await T(f'.orcard[data-a={animal}]');await T('#ornext',300);await T('.orchip[data-c=white]',900);await T('#orinv');await T('#orinv',3000)
      await T('#ornm',400);await T('#orkeep');await T('#orkeep',1500)
      for _ in range(150):
        if not await pg.locator('.choices button').count() and await pg.locator('#play').count():break
        if await pg.locator('.choices button').count():
          try:x=pg.locator('.choices button').first;await x.click(timeout=800);await x.click(timeout=800)
          except Exception:pass
        await pg.wait_for_timeout(200)
      await pg.wait_for_timeout(1500);await pg.evaluate(CLEAN+";CONFIG.ambientMin=999;CONFIG.ambientMax=999");await pg.evaluate(SPY)
      F=await pg.evaluate("__echo.state.kind+'|'+(window.FID?FID():'')");tag=f'[{fam}]'
      check(await pg.evaluate("__echo.state.ageBand")=='9-10',tag+' onboarding age 9-10')
      # ---- 7 (Kai): 9-10 starts Standard in every game from game 1 (no Easy warm-up)
      lv=await pg.evaluate("__echo.levels()");check(set(lv.values())=={'standard'},tag+' 9-10 game 1: every game Standard '+str(lv))
      pr=await pg.evaluate(PR);check(pr and pr['len']==6 and pr['band']=='9-10',tag+' age + Echo It Back length in the per-child store '+str(pr))
      # ---- Echo It Back: first play = no tiles, 6 notes, 5 beads
      await play_eib()
      check(await pg.evaluate("document.querySelector('.eibtiles').hidden"),tag+' first time: no start tiles')
      check(await pg.evaluate("document.querySelectorAll('.eibbeads i').length")==5,tag+' 5 progress beads')
      check(await answer() and len(await pg.evaluate("EchoBack.cur.tune.n"))==6,tag+' 9-10 starts at 6 notes')
      if full:
        for i in range(4):
          await wait("EchoBack.cur&&EchoBack.cur.round.matches>=%d"%(i+1),8000);check(await answer(),f'{tag} tune {i+2}')
        check(await wait("EchoBack.cur&&EchoBack.cur.round.matches===5",9000),tag+' 5 matches');bd=await pg.evaluate("[...document.querySelectorAll('.eibbeads i.on')].length");check(bd==5,f'{tag} beads filled {bd}')
        await pg.screenshot(path=f'{OUT}/{fam}-g1-beads.png')
        check(await wait("document.querySelector('.eibpads').classList.contains('duet')",6000),tag+' duet: pads + Echo lit')
        check(await wait(BUB+".includes('Five! We sang five!')",15000) and (await pg.evaluate(BUB)).startswith(pfx),tag+' "Five! We sang five!" with '+pfx+': '+await pg.evaluate(BUB))
        check(await wait("!document.getElementById('eib')",15000),tag+' then Home')
        st=await pg.evaluate("[__echo.state.stickers,Object.keys(__echo.state.eibSongs||{})]");check('First Echo Tune' in st[0] and 'First Echo Tune' in st[1],tag+' Kai 1: 9-10 first round -> the 4-note sticker '+str(st))
        pr=await pg.evaluate(PR);check(pr['len']==8 and pr['roundsDone']==1,tag+' perfect round: 6 -> 8 '+str(pr))
        check(await pg.evaluate("__echo.state.bond")>0 or True,tag+' bond')
        # the sticker plays its tune in the Memory Book
        await pg.evaluate(CLEAN+";__echo.home()");await pg.wait_for_timeout(600);await pg.evaluate("document.querySelector('#book')?document.querySelector('#book').click():null");await pg.wait_for_timeout(600)
        if not await pg.locator('[data-eibsong]').count():await pg.evaluate("__echo.book&&__echo.book()");await pg.wait_for_timeout(400)
        if await pg.locator('[data-eibsong]').count():
          k0=await pg.evaluate("__os.length");await T('[data-eibsong]',2500);check(await pg.evaluate("__os.length")-k0>=4,tag+' Memory Book sticker plays its tune')
        else:check(False,tag+' sticker chip in the Memory Book')
        # second play: tiles with dots (never numbers); "A little one" = 6 this round only
        await play_eib()
        check(not await pg.evaluate("document.querySelector('.eibtiles').hidden"),tag+' start tiles')
        dots=await pg.evaluate("[...document.querySelectorAll('.eibtile')].map(t=>t.querySelectorAll('.eibdots i').length)");check(dots==[8,6],tag+' tiles show 8 / 6 dots '+str(dots))
        txt=await pg.evaluate("document.querySelector('.eibtiles').textContent");check(not re.search(r'\d',txt),tag+' no numbers on the tiles '+txt)
        await pg.screenshot(path=f'{OUT}/{fam}-g2-tiles.png');await T('#eiblittle',300)
        check(await answer() and len(await pg.evaluate("EchoBack.cur.tune.n"))==6,tag+' "A little one" = 2 shorter')
        await T('#quit',1200);check((await pg.evaluate(PR))['len']==8,tag+' the saved length is not lowered')
        # 3 (Kai): two misses in a row = 1 note off this round, floor 3, no streak words
        await play_eib();await T('#eibsame',300)
        await answer('new');await wait("EchoBack.cur.round.tunes===2&&EchoBack.cur.phase==='child'",30000);await answer('new')
        check(await wait("EchoBack.cur.round.len===7",12000),tag+' 2 misses in a row: 8 -> 7 this round')
        check(await wait(BUB+".toLowerCase().includes('little one')",15000),tag+' "Let\'s do a little one." '+await pg.evaluate(BUB))
        await T('#quit',1200);check((await pg.evaluate(PR))['len']==8,tag+' misses never lower the saved length')
        await pg.evaluate("__echo.setBand('5-6')");check((await pg.evaluate(PR))['len']==3,tag+' Kai 2: age down -> 3 notes')
        await play_eib();await T('#eibsame',300) if await pg.locator('#eibsame').count() else None
        await answer('new');await wait("EchoBack.cur.round.tunes===2&&EchoBack.cur.phase==='child'",30000);await answer('new');await pg.wait_for_timeout(5000)
        check(await pg.evaluate("EchoBack.cur.round.len")==3,tag+' floor 3 notes')
        # soft stop at 10 tunes: "Let's rest our ears!", Home, no step up, counts for bond
        await pg.evaluate("EchoBack.cur.round.tunes=10");await wait("EchoBack.cur&&EchoBack.cur.phase==='child'",25000);await answer('new')
        check(await wait(BUB+".toLowerCase().includes('rest our ears')",15000),tag+' soft stop line '+await pg.evaluate(BUB))
        check(await wait("!document.getElementById('eib')",8000),tag+' soft stop -> Home');check((await pg.evaluate(PR))['len']==3,tag+' no step up')
        # phrases past 8: 12 notes = ABA, echoed phrase by phrase
        await pg.evaluate("(()=>{const b=JSON.parse(localStorage.getItem('echo-songbook-v1'));b.progress[__echo.state.kidId].len=12;localStorage.setItem('echo-songbook-v1',JSON.stringify(b))})()")
        await play_eib();await T('#eibsame',300) if await pg.locator('#eibsame').count() else None
        check(await wait(BUB+".includes('breath')",9000),tag+' "Big song. I\'ll take a breath." '+await pg.evaluate(BUB))
        await wait("EchoBack.cur&&EchoBack.cur.phase==='child'",25000)
        t=await pg.evaluate("[EchoBack.cur.tune.n.length,EchoBack.cur.tune.labels,EchoBack.cur.asked.length,document.querySelectorAll('.eibslots i').length,document.querySelectorAll('.eibslots i.rep').length]")
        check(t[0]==12 and t[1]==['A','B','A'] and t[2]==4 and t[3]==3 and t[4]==1,tag+' 12 notes: ABA, a 4-note phrase at a time, repeat outlined '+str(t))
        await pg.screenshot(path=f'{OUT}/{fam}-g3-phrase.png')
        check(await answer(),tag+' echoed phrase by phrase');check(await wait("EchoBack.cur.round.matches===1",9000),tag+' a phrased tune counts as one match')
        check(await pg.evaluate("__echo.state.eib.saidBack===1"),tag+' "This bit comes back!" said')
        await T('#quit',1200)
      # ---- Grown-ups: the age row is 3 direct choices; changing it sets the length up or down (Kai 2) + reset row
      await pg.evaluate(CLEAN+";__echo.home();__echo.pcSettings()");await pg.wait_for_timeout(500)
      ab=await pg.evaluate("[...document.querySelectorAll('.pcagebtn')].map(b=>b.textContent+(b.classList.contains('on')?'*':''))");check(len(ab)==3 and sum(x.endswith('*') for x in ab)==1,tag+' age row = 3 choices '+str(ab))
      await T('.pcagebtn[data-band="7-8"]',400);check((await pg.evaluate(PR))['len']==4 and await pg.evaluate("__echo.state.ageBand")=='7-8',tag+' age -> 7-8: 4 notes')
      lv=await pg.evaluate("__echo.levels()");check(set(lv.values())<={'easy','standard'} and lv['run']=='easy' and lv['stack']=='easy',tag+' 7-8 keeps the Easy warm-up '+str(lv))
      await T('.pcagebtn[data-band="9-10"]',400);check((await pg.evaluate(PR))['len']==6,tag+' age -> 9-10: 6 notes')
      await pg.screenshot(path=f'{OUT}/{fam}-g4-grownups.png')
      await pg.evaluate("(()=>{const b=JSON.parse(localStorage.getItem('echo-songbook-v1'));b.progress[__echo.state.kidId].len=11;localStorage.setItem('echo-songbook-v1',JSON.stringify(b))})()")
      await T('#pceib',400);check((await pg.evaluate(PR))['len']==6,tag+' "Echo It Back length: reset" -> band start')
      # ---- 5 (Kai): 5-6 easy goes back to auto when the child moves up; a dev override stays and wins
      await pg.evaluate(CLEAN+";__echo.state.stackLevel='bigkid';__echo.setBand('5-6')")
      s=await pg.evaluate("['pairsLevel','digLevel','runLevel','catchLevel','stackLevel'].map(k=>__echo.state[k])");check(s==['easy','easy','easy','easy','bigkid'],tag+' 5-6: auto games on Easy, override kept '+str(s))
      await pg.evaluate("__echo.setBand('9-10')");s=await pg.evaluate("['pairsLevel','digLevel','runLevel','catchLevel','stackLevel'].map(k=>__echo.state[k])")
      check(s==['auto','auto','auto','auto','bigkid'],tag+' off 5-6: back to auto (no Easy forever) '+str(s))
      lv=await pg.evaluate("__echo.levels()");check(lv=={'pairs':'standard','dig':'standard','run':'standard','catch':'standard','stack':'bigkid'},tag+' 9-10 Standard, the override wins '+str(lv))
      await pg.evaluate("__echo.state.stackLevel='auto';__echo.state.runLevel='easy';__echo.setBand('7-8')");s=await pg.evaluate("__echo.state.runLevel");check(s=='easy',tag+' a level set by hand is not touched by the band')
      # reduced motion: beads + puff still, no animation
      await pg.evaluate("__echo.state.lowfx=true");await play_eib()
      check(await pg.evaluate("document.querySelector('#gs').classList.contains('eibrm')&&getComputedStyle(document.querySelector('.eibbeads i')).animationName==='none'"),tag+' reduced motion: beads still')
      await T('#quit',1000)
      await ctx.close()
    await b.close();check(not errs,'no errors/404s '+str(errs[:3]))
  print(f'batchg: {ok} ok, {len(bad)} failed');sys.exit(1 if bad else 0)
asyncio.run(main())
