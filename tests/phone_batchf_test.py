# Batch F: Echo It Back on the phone (decisions 1-5 + the 4 data locks) and the weather cleanup.
# Usage: python3 tests/phone_batchf_test.py [url] [outdir]
import asyncio,sys,os,json
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/batchf';os.makedirs(OUT,exist_ok=True)
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)
CLEAN="document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''"
SPY="window.__os=[];const _o=Music.oneShot;Music.oneShot=(n,o)=>{__os.push(n);return _o(n,o)};0"
BUB="((document.getElementById('b')||{}).textContent||'')"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);errs=[]
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
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600);await T('#obgo',400)
    for _ in range(6):
      if await pg.locator('#obnm').count():break
      await T('.scene.ob',200)
    await pg.fill('#obnm','Mia');await T('#obnext');await T('#obyes');await T('.obagebtn >> nth=1')
    await T('.orcard[data-a=snowleopard]');await T('#ornext',300);await T('.orchip[data-c=white]',900);await T('#orinv');await T('#orinv',3000)
    await T('#ornm',400);await T('#orkeep');await T('#orkeep',1500)
    for _ in range(150):   # answer the setup talk
      if not await pg.locator('.choices button').count() and await pg.locator('#play').count():break
      if await pg.locator('.choices button').count():
        try:x=pg.locator('.choices button').first;await x.click(timeout=800);await x.click(timeout=800)
        except Exception:pass
      await pg.wait_for_timeout(200)
    await pg.wait_for_timeout(1500);await pg.evaluate(CLEAN+";CONFIG.ambientMin=999;CONFIG.ambientMax=999;CONFIG.sessionLimits.games=99");await pg.evaluate(SPY)
    # ---------------------------------------------------------------- weather cleanup (twitchel had no need tags, so its rain leaked)
    w=await pg.evaluate("""(()=>{const L=Dialogue.lib,tx=[];for(const k in L.barks)for(const l of L.barks[k])tx.push(l.text||'');for(const c of L.conversations)for(const n of Object.values(c.nodes||{}))tx.push(n.say||'');
      return {rain:tx.filter(t=>/\\b(rain(?!bow)\\w*|puddles?|wind|windy|fog\\w*|drizzl\\w*|breez\\w*)\\b/i.test(t)&&!/Rain is|Pretend|wind chimes/.test(t)),pools:Object.keys(L.barks).filter(k=>/^weather_(drizzle|breezy|fog|rainbow)$/.test(k)),
        nose:tx.filter(t=>/raindrop on my nose/i.test(t)).length,eib:Object.keys(L.barks).filter(k=>k.startsWith('eib_')).length}})()""")
    check(w['nose']==0,'"A raindrop on my nose" is gone');check(not w['pools'],'dead weather pools gone '+str(w['pools']));check(w['eib']==20,f"20 eib_ pools loaded (Batch G adds 10) ({w['eib']})")
    check(len(w['rain'])==0,'no rain/wind/fog/puddle lines the Echo says '+str(w['rain'][:3]))
    await pg.evaluate("__echo.state.bond=100;__echo.glow()")
    s=await pg.evaluate("[Dialogue.ctx().vars.season,Dialogue.eligible('idle').some(c=>c.id==='twitchel_snow_talk')]")
    import datetime;winter=datetime.date.today().month in (12,1,2)
    check(s[0]==('snow' if winter else 'none') and s[1]==winter,'season var follows snowSeason() '+str(s))
    s2=await pg.evaluate("(()=>{const S=__echo.state,d=new Date();const j=new Date(d.getFullYear()+(d.getMonth()>1?1:0),0,15,12);S.clockOffset=j-Date.now();const r=[Dialogue.ctx().vars.season,Dialogue.eligible('idle').some(c=>c.id==='twitchel_snow_talk')];S.clockOffset=0;Dialogue.ctx();return r})()")
    check(s2==['snow',True],'in January the snow chat is back '+str(s2))
    # ---------------------------------------------------------------- Play list entry, always open (decision 4)
    await pg.evaluate(CLEAN+";__echo.state.napUntil=0;Object.assign(__echo.state.needs,{food:70,rest:90,play:30});__echo.home()");await pg.wait_for_timeout(900);await pg.evaluate(CLEAN)
    await T('#play',500);L=await pg.evaluate("[...document.querySelectorAll('.choices button')].map(b=>b.textContent)");check(any('Echo It Back' in l for l in L),'Echo It Back in the Play list '+str(L))
    await pg.evaluate("__os.length=0");b0=await pg.evaluate("__echo.state.bond");await pick('Echo It Back',300)
    check(await wait("!!document.querySelector('#gs.eibgame #eib .eibpads')",5000),'game screen')
    pl=await pg.evaluate("(()=>{for(const o of [window.Music,window.Sound])if(o&&typeof o.playing==='function')return o.playing()||null;return null})()");check(pl is None,'no game loop under the tune '+str(pl))
    pads=await pg.evaluate("[...document.querySelectorAll('.eibpad')].map(p=>p.dataset.pad)");check(pads==['0','1','2','4','5'],'T2: 5 pads do re mi sol la '+str(pads))
    st=await pg.evaluate("[...document.querySelectorAll('.eibpad')].map(p=>parseFloat(getComputedStyle(p).marginBottom))");check(st==sorted(st) and st[-1]>st[0],'staircase '+str(st))
    check(await wait("EchoBack.cur&&EchoBack.cur.phase==='child'",12000),'your turn comes');n_echo=await pg.evaluate("__os.filter(x=>/^notes\\/twitchel_/.test(x)).length")
    asked=await pg.evaluate("EchoBack.cur.asked");check(len(asked)==4 and n_echo>=4,f'v2: age 7-8 starts at 4 notes; the Echo sang {len(asked)} ({n_echo} one-shots)')
    names=await pg.evaluate("EchoBack.cur.tune.n.map(x=>EchoBack.nameOf('twitchel',EchoBack.step(x)))");check(all(x in ('f4','g4','a4','c5','d5') for x in names),'twitchel F pentatonic '+str(names))
    await pg.screenshot(path=f'{OUT}/f1-your-turn.png')
    # same
    await pg.evaluate("window.__spk=[];new MutationObserver(()=>__spk.push(document.querySelector('.eibspark').className)).observe(document.querySelector('.eibspark'),{attributes:true})")
    for s_ in asked:await T(f'.eibpad[data-pad="{s_}"]',150)
    check(await wait(BUB+".startsWith('Same')",4000),'same -> "Same! ..." '+await pg.evaluate(BUB))
    check(await pg.evaluate("__spk.some(c=>c.includes('big')&&c.includes('go'))"),'big sparkle');await pg.screenshot(path=f'{OUT}/f2-same.png')
    # close (one note off)
    check(await wait("EchoBack.cur.phase==='child'",12000),'round 2');asked=await pg.evaluate("EchoBack.cur.asked")
    pads_i=[int(x) for x in pads];alt=[x for x in pads_i if x!=asked[1] and x!=asked[0] and x!=asked[2]][0];ans=[asked[0],alt]+asked[2:]
    r=await pg.evaluate(f"EchoBack.matchTune({asked},{ans})")
    for s_ in ans:await T(f'.eibpad[data-pad="{s_}"]',150)
    check(await wait(BUB+".startsWith('Close')||"+BUB+".startsWith('Ooh, close')",4000),f'close ({r}) -> "Close! Like this:" '+await pg.evaluate(BUB))
    k0=await pg.evaluate("__os.length");await pg.wait_for_timeout(3500);check(await pg.evaluate("__os.length")-k0>=3,'the Echo plays it again')
    check(await wait("EchoBack.cur.phase==='child'",8000),'one more go after close');asked=await pg.evaluate("EchoBack.cur.asked")
    for s_ in asked:await T(f'.eibpad[data-pad="{s_}"]',150)
    await wait(BUB+".startsWith('Same')",4000)
    # new -> the Echo copies the child back
    check(await wait("EchoBack.cur.phase==='child'",12000),'round 3');asked=await pg.evaluate("EchoBack.cur.asked")
    new=[pads_i[0],pads_i[4],pads_i[0],pads_i[4],pads_i[0]];await pg.evaluate("__os.length=0")
    for s_ in new:await T(f'.eibpad[data-pad="{s_}"]',120)
    await wait("/new one|New song|our song/i.test("+BUB+")",4000)   # v2: 4 asked + 2 extra, so 5 taps end on the gap
    t=await pg.evaluate(BUB);check(any(x in t for x in ('new one','New song','Your song','your song')),'new -> "Ooh, a new one! My turn:" '+t)
    await pg.wait_for_timeout(4000);cp=await pg.evaluate("EchoBack.cur.lastCopy");check(cp and [EB for EB in cp['n']] and len(cp['n'])==5 and cp['v']==1,'copy-back is a Song v1 of the child\'s 5 notes')
    played=await pg.evaluate("__os.filter(x=>/^notes\\//.test(x)).slice(5)");check(len(played)>=5,f'the Echo sang the child\'s tune back ({len(played)})')
    check(await pg.evaluate("__echo.state.bond")==b0,'v2: no bond mid-round (bond comes with a finished round)');check(await pg.evaluate("EchoBack.cur.round.matches")==2,'same + close count, new does not')
    sb=await pg.evaluate("JSON.parse(localStorage.getItem('echo-songbook-v1'))");check(sb and sb['v']==2 and list(sb['progress'].values())[0]['len']==4 and list(sb['progress'].values())[0]['band']=='7-8','v2 songbook holds per-child progress + age '+str(sb and sb.get('progress')))
    # multi-finger: two pointers at once, and a slide from one pad onto the next
    check(await wait("EchoBack.cur.phase==='child'",12000),'round 4');await pg.evaluate("__os.length=0")
    mf=await pg.evaluate("""(()=>{const P=[...document.querySelectorAll('.eibpad')],c=e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
      const ev=(t,el,id,xy)=>{const [x,y]=xy||c(el);(t==='pointerdown'?el:window).dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:x,clientY:y,bubbles:true,pointerType:'touch',isPrimary:id===1}))};
      ev('pointerdown',P[0],1);ev('pointerdown',P[2],2);const both=P[0].classList.contains('on')&&P[2].classList.contains('on');
      ev('pointermove',P[2],2,c(P[3]));const slid=P[3].classList.contains('on');ev('pointerup',P[0],1);ev('pointerup',P[3],2);
      return {both,slid,live:EchoBack.cur.input.live.size,os:__os.slice()}})()""")
    check(mf['both'],'two fingers light two pads');check(mf['slid'],'slide onto the next pad plays it');check(mf['live']==0,'all pointers released');check(len(mf['os'])==3,'3 notes (2 fingers + slide) '+str(mf['os']))
    # idle: one replay, then quiet - no reminders
    await pg.evaluate("EchoBack.data.timing.answer_wait_ms=1200;EchoBack.data.timing.answer_gap_ms=600");await pg.wait_for_timeout(2500)
    await wait("EchoBack.cur.phase==='child'&&!EchoBack.cur.input.live.size",15000);await pg.wait_for_timeout(1500)
    t=await pg.evaluate(BUB);check(any(x in t for x in ('Again. Slow.','Here it is again')),'idle -> the Echo sings it again '+t)
    await wait(BUB+".toLowerCase().includes('listening')",12000);t=await pg.evaluate(BUB);check('listening' in t.lower(),'second idle -> "Just listening? Nice." '+t)
    k0=await pg.evaluate("__os.length");await pg.wait_for_timeout(5000);check(await pg.evaluate("__os.length")==k0 and await pg.evaluate("EchoBack.cur.phase")=='child','then it just waits (no reminders)')
    await T('#quit',1500);check(await pg.evaluate("!document.getElementById('eib')&&!EchoBack.cur"),'Done -> home, stopped')
    check(await pg.evaluate("(__echo.state.gameCounts||{}).eib")>=1,'game counted as eib')
    # T4: 8 pads, long-short rhythm shown; reduced motion
    await pg.evaluate(CLEAN+";__echo.state.bond=400;__echo.glow();__echo.state.lowfx=true;__echo.home()");await pg.wait_for_timeout(900);await pg.evaluate(CLEAN)
    await T('#play',500);await pick('Echo It Back',300)
    await wait("EchoBack.cur&&EchoBack.cur.phase==='child'",15000)
    pads=await pg.evaluate("[...document.querySelectorAll('.eibpad')].map(p=>p.dataset.pad)");check(len(pads)==8,'T4: 8 pads '+str(pads))
    check(await pg.evaluate("document.querySelector('#gs').classList.contains('eibrm')&&getComputedStyle(document.querySelector('.eibpad')).animationName==='none'"),'reduced motion: no pad bob')
    wide=await pg.evaluate("EchoBack.tunesFor('twitchel',4).some(u=>u.n.some(x=>x[2]===18))");check(wide,'T4 tunes carry long-short')
    await pg.evaluate("(()=>{const u=EchoBack.tunesFor('twitchel',4)[0];document.querySelector('.eibask').innerHTML='';})()")
    fits=await pg.evaluate("(()=>{const r=document.querySelector('.eibpads').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()");check(fits,'8 pads fit the phone width')
    await pg.screenshot(path=f'{OUT}/f3-t4-pads.png');await T('#quit',1200)
    # the one Echo-started invite: a note chip, tap = play; never a second one in the session
    await pg.evaluate(CLEAN+";__echo.state.lowfx=false;Object.assign(__echo.state.needs,{food:70,rest:90,play:30});__echo.home()");await pg.wait_for_timeout(900);await pg.evaluate(CLEAN)
    await pg.wait_for_timeout(6000);await pg.evaluate(CLEAN+";__echo.home()");await pg.wait_for_timeout(1500);await pg.evaluate(CLEAN)   # let the bond-ups from bond 400 finish first
    for _ in range(40):
      if not await pg.evaluate("!!document.querySelector('.bondup')"):break
      await pg.evaluate("document.querySelectorAll('.bondup').forEach(x=>x.click())");await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelectorAll('.bondup').forEach(x=>x.remove())")
    await pg.evaluate("window.__r=Math.random;Math.random=()=>0.19;CONFIG.ambientMin=1;CONFIG.ambientMax=1.2;__echo.home()")
    got=await wait("!!document.querySelector('.eibinv')",15000);check(got,'invite chip appears');t=await pg.evaluate(BUB);check('Tap the note' in t,'invite line '+t)
    top=await pg.evaluate("(()=>{const b=document.querySelector('.eibinv');if(!b)return false;const r=b.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===b})()")
    check(top,'the chip is on top and tappable');await pg.screenshot(path=f'{OUT}/f4-invite.png')
    if got:
      await pg.evaluate("document.querySelector('.eibinv')&&document.querySelector('.eibinv').click()");await pg.wait_for_timeout(800)
      check(await pg.evaluate("!!document.getElementById('eib')"),'tapping the chip starts Echo It Back');await T('#quit',1200)
    await pg.evaluate(CLEAN+";__echo.home()");await pg.wait_for_timeout(8000);check(await pg.evaluate("!document.querySelector('.eibinv')"),'no second invite this session')
    await pg.evaluate("Math.random=__r;CONFIG.ambientMin=999;CONFIG.ambientMax=999")
    f=await pg.evaluate("(()=>{const h=document.querySelector('#cr').parentNode;EchoBack.data.timing.invite_fade_ms=800;const b=EchoBack.invite(h,()=>{});return !!b})()");await pg.wait_for_timeout(1700)
    check(f and await pg.evaluate("!document.querySelector('.eibinv')"),'an ignored invite fades on its own')
    await b.close();check(not errs,'no errors/404s '+str(errs[:3]))
  print(f'{ok}/{ok+len(bad)} batch F checks passed');sys.exit(1 if bad else 0)
asyncio.run(main())
