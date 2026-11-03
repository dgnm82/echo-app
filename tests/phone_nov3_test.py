# Nov 3 batch (Jay; LIST.md under pm/review_nov8): 1 Echo It Back layout, 2+6 one needs source + play costs, 9 no text caret in games,
# 11 Ancient Echo intro tempo, 3 "Bye for now". NOV3_ONLY=eib|needs|caret|tempo|bye runs one part.
# Usage: python3 tests/phone_nov3_test.py [URL] [SHOTDIR]
import asyncio,sys,os,json,time
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
SHOT=sys.argv[2] if len(sys.argv)>2 else '/tmp/nov3_shots';os.makedirs(SHOT,exist_ok=True)
ONLY=os.environ.get('NOV3_ONLY','')
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
VP=[('360x640',dict(viewport={'width':360,'height':640},device_scale_factor=2,is_mobile=True,has_touch=True)),
    ('390x844',dict(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)),
    ('desktop',dict(viewport={'width':1280,'height':800},has_touch=True))]
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def wait(pg,js,ms):
  t0=time.time()
  while (time.time()-t0)*1000<ms:
    if await pg.evaluate(f"(()=>{{try{{return !!({js})}}catch(e){{return false}}}})()"):return True
    await pg.wait_for_timeout(80)
  return False
async def setup(b,kw,animal='dog'):
  ctx=await b.new_context(**kw);pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-dev-wu','0')");await pg.reload();await pg.wait_for_timeout(600)
  await T(pg,'#obgo',400)
  for _ in range(12):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await pick(pg,animal);await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
  await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1200)
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());CONFIG.ambientMin=999;CONFIG.ambientMax=999")
  return ctx,pg,errs
# ---------------------------------------------------------------- 1: Echo It Back layout (two-row tune, 8 pads, solfège labels, a long line)
LONG="We caught an Ancient Echo together! It gets its own spot in our collection."
GEO="""(()=>{const gs=document.getElementById('gs').getBoundingClientRect(),k=gs.width/180;const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom}};
  const hit=(a,b)=>!(a.r<=b.l+.5||a.l>=b.r-.5||a.b<=b.t+.5||a.t>=b.b-.5),inside=a=>a.l>=gs.left-.5&&a.r<=gs.right+.5&&a.t>=gs.top-.5&&a.b<=gs.bottom+.5;
  const cv=document.createElement('canvas').getContext('2d');const labels=[...document.querySelectorAll('.eibpad')].map(p=>{const cs=getComputedStyle(p,'::after');if(cs.content==='none'||!p.dataset.sol)return null;
    cv.font=cs.fontSize+' PS2P';const w=cv.measureText(p.dataset.sol).width*k,r=R(p),fs=parseFloat(cs.lineHeight)*k,bt=r.b-parseFloat(cs.bottom)*k;return {l:(r.l+r.r)/2-w/2,r:(r.l+r.r)/2+w/2,t:bt-fs,b:bt}}).filter(Boolean);
  const pads=[...document.querySelectorAll('.eibpad')].map(R),bub=R(document.getElementById('b')),beads=R(document.querySelector('.eibbeads'));
  const text=[bub].concat([...document.querySelectorAll('.eibrow .eibn')].map(R));
  const g=document.getElementById('gs');
  return {gsScroll:[g.scrollTop,g.scrollLeft],gsOverflow:getComputedStyle(g).overflowY,bubIn:inside(bub)&&document.getElementById('b').style.display!=='none',
    beadsHitText:text.some(t=>hit(beads,t))||labels.some(t=>hit(beads,t)),beadsHitPads:pads.some(p=>hit(beads,p)),
    padTops:[...new Set(pads.map(p=>Math.round(p.t)))],padW:pads.map(p=>Math.round(p.r-p.l)),padsOverlap:pads.some((p,i)=>pads.some((q,j)=>i<j&&hit(p,q))),padsIn:pads.every(inside),
    labels:labels.length,labelsOverlap:labels.some((p,i)=>labels.some((q,j)=>i<j&&hit(p,q))),labelsIn:labels.every(inside),labelsHitPads:labels.some(l=>pads.some(p=>hit(l,p))),
    n:EchoBack.cur.tune.n.length,rows:document.querySelector('.eibask').classList.contains('two')}})()"""
async def eib_part(b):
  for name,kw in VP:
    ctx,pg,errs=await setup(b,kw)
    await pg.evaluate("__echo.eib('play')");await wait(pg,"EchoBack.cur",8000);await pg.wait_for_timeout(300)
    # a child on 8 notes (two rows) at music level 5 (solfège on the pads + the strip)
    await pg.evaluate("""(()=>{EchoBack.stop();const b=JSON.parse(localStorage.getItem('echo-songbook-v1'));for(const k in b.progress){const p=b.progress[k];p.len=8;p.ml.level=5;p.ml.src='warmup'}
      localStorage.setItem('echo-songbook-v1',JSON.stringify(b));__echo.state.eib={rounds:1,heard:[0,1,2,3,4,5,6,7]}})()""")
    await pg.evaluate("__echo.eib('invite')")
    check(await wait(pg,"EchoBack.cur&&EchoBack.cur.phase==='child'",30000),f'{name}: round reaches the child turn')
    await pg.evaluate("document.querySelectorAll('.eibbeads i').forEach((b,i)=>b.classList.toggle('on',i<2))")
    asked=await pg.evaluate("EchoBack.cur.asked")
    for s in asked[:5]:
      await pg.locator(f'.eibpad[data-pad="{s}"]').first.tap();await pg.wait_for_timeout(110)
    await pg.locator('.eibpad').first.focus();await pg.locator('.eibpad').last.focus()
    await pg.evaluate("__echo.talk(%s,60000)"%json.dumps(LONG));await pg.wait_for_timeout(250)
    g=json.loads(json.dumps(await pg.evaluate(GEO)))
    await pg.screenshot(path=f'{SHOT}/01_eib_{name}.png')
    check(g['n']==8 and g['rows'],f'{name}: a two-row tune ({g["n"]} notes)')
    check(g['gsScroll']==[0,0] and g['gsOverflow']=='clip',f'{name}: the game scene never scrolls (taps + focus) {g["gsScroll"]} {g["gsOverflow"]}')
    check(g['bubIn'],f'{name}: the speech bubble is fully on screen')
    check(not g['beadsHitText'] and not g['beadsHitPads'],f'{name}: progress beads overlap no text, no label, no pad')
    check(len(g['padTops'])==1 and max(g['padW'])-min(g['padW'])<=1 and not g['padsOverlap'] and g['padsIn'],f'{name}: pads = one even row, inside the scene {g["padTops"]} {g["padW"]}')
    check(g['labels']==8 and not g['labelsOverlap'] and g['labelsIn'] and not g['labelsHitPads'],f'{name}: 8 solfège labels, none overlapping, all on screen')
    # past 8 pads (not shipped today): an even 2-row grid, still no overlaps
    g2=await pg.evaluate("""(()=>{const box=document.querySelector('.eibpads');const L=[...box.children];box.insertAdjacentHTML('beforeend',L[1].outerHTML+L[2].outerHTML);EchoBack._pure.padsLayout(box,10);
      const P=[...box.children].map(e=>e.getBoundingClientRect());const rows=[...new Set(P.map(r=>Math.round(r.top)))];
      return {rows:rows.length,per:rows.map(t=>P.filter(r=>Math.round(r.top)===t).length),ov:P.some((p,i)=>P.some((q,j)=>i<j&&!(p.right<=q.left+.5||p.left>=q.right-.5||p.bottom<=q.top+.5||p.top>=q.bottom-.5)))}})()""")
    g3=json.loads(json.dumps(await pg.evaluate(GEO)))
    check(g2['rows']==2 and g2['per']==[5,5] and not g2['ov'] and not g3['labelsOverlap'] and not g3['beadsHitPads'] and g3['labelsIn'],f'{name}: 10 pads -> even 5+5 grid, no overlaps {g2}')
    check(not errs,f'{name}: no page errors {errs[:2]}');await ctx.close()
# ---------------------------------------------------------------- 2+6: one needs rule for the bubble and Rest/Feed; games cost rest + food
PH=VP[1][1]
async def done_game(pg):   # Done mid-run -> the results card -> its Done (endGame)
  await T(pg,'#quit',900)
  if await wait(pg,"document.getElementById('g2done')",4000):await T(pg,'#g2done',1200)
async def needs_part(b):
  ctx,pg,errs=await setup(b,PH)
  async def state(js):await pg.evaluate("(()=>{const S=__echo.state,ss=__echo.sess();S.napUntil=0;%s;__echo.home()})()"%js);await pg.wait_for_timeout(900)
  moon="(document.querySelector('#sc .thought')||{dataset:{}}).dataset.w==='🛏️'"
  # the bug: the moon shows after this session's nap, Rest said "not sleepy"
  await state("Object.assign(S.needs,{food:90,play:90,comfort:90,rest:40});ss.naps=1")
  check(await pg.evaluate(moon),'needs: rest 40 -> the moon bubble shows')
  await T(pg,'#rest',600);await pg.screenshot(path=f'{SHOT}/02_rest_after_moon.png')
  check(await pg.evaluate("__echo.state.napUntil>Date.now()"),'needs: moon showing + the session nap used -> Rest still naps (no "not sleepy")')
  await state("Object.assign(S.needs,{food:90,play:90,comfort:90,rest:80});ss.naps=1")
  check(not await pg.evaluate(moon),'needs: rest 80 -> no moon')
  await T(pg,'#rest',600);check(await pg.evaluate("!(__echo.state.napUntil>Date.now())"),'needs: no moon + nap used -> Rest declines (unchanged)')
  await state("Object.assign(S.needs,{food:40,play:90,comfort:90,rest:90});ss.feeds=3")
  check(await pg.evaluate("(document.querySelector('#sc .thought')||{dataset:{}}).dataset.w==='🍎'"),'needs: food 40 -> the food bubble')
  await T(pg,'#feed',500);check(await pg.locator('#overlay .choices button').count()>=2,'needs: food bubble + 3 feeds used -> the food menu still opens')
  await pg.evaluate("document.getElementById('overlay').innerHTML=''")
  # item 6: a long run costs rest + food
  await state("Object.assign(S.needs,{food:90,play:90,comfort:90,rest:90});ss.naps=0;ss.games=0")
  await pg.evaluate("__echo.runGame()");await pg.wait_for_timeout(800)
  await pg.evaluate("__echo.state.clockOffset=(__echo.state.clockOffset||0)+6*60e3");await done_game(pg)
  nd=await pg.evaluate("Object.assign({},__echo.state.needs)")
  check(abs(nd['rest']-42)<1.5 and abs(nd['food']-60)<1.5,f'needs: a 6-minute run -> rest ~42, food ~60 {nd}')
  check(await wait(pg,moon,4000),'needs: after the long run the moon bubble shows')
  await pg.screenshot(path=f'{SHOT}/06_after_long_run.png')
  await pg.evaluate("__echo.runGame()");await pg.wait_for_timeout(800);await done_game(pg)
  nd2=await pg.evaluate("Object.assign({},__echo.state.needs)");check(nd['rest']-nd2['rest']<1.5,f'needs: a few seconds of play costs next to nothing {nd2}')
  check(not errs,f'needs: no page errors {errs[:2]}');await ctx.close()
# ---------------------------------------------------------------- 9: nothing that blinks like a text cursor in or over the Echo, in any game
AUD="""(()=>{const bad=[];for(const e of document.querySelectorAll('body *')){const cs=getComputedStyle(e),txt=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
  if(e.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)||(txt&&cs.userSelect!=='none'&&cs.webkitUserSelect!=='none')||(e.tabIndex>=0&&!/^(BUTTON|A)$/.test(e.tagName)&&e.getAttribute('role')!=='button'))bad.push(e.tagName+'#'+e.id+'.'+(typeof e.className==='string'?e.className:''))}
  const a=document.activeElement;return {bad,act:a?a.tagName:'',design:document.designMode,sel:getSelection().rangeCount}})()"""
SPY="""(()=>{window.__bm=0;const d=CanvasRenderingContext2D.prototype.drawImage;if(d.__spy)return;const f=function(im){if(im&&im.src&&/run_beat_mark/.test(im.src))window.__bm++;return d.apply(this,arguments)};f.__spy=1;CanvasRenderingContext2D.prototype.drawImage=f})()"""
async def caret_part(b):
  for animal in ('dog','owl'):
    ctx,pg,errs=await setup(b,PH,animal)
    await pg.evaluate(SPY)
    for gm in ['runGame','catchGame','stackGame','memoryGame','linesGame','eib']:
      if not await pg.evaluate(f"typeof __echo.{gm}==='function'"):continue
      await pg.evaluate(f"document.getElementById('overlay').innerHTML='';__echo.home();window.__bm=0;__echo.{gm}()");await pg.wait_for_timeout(1200)
      r=await pg.evaluate("(()=>{const r=(document.getElementById('gs')||document.body).getBoundingClientRect();return [r.left+r.width/2,r.top+r.height*.7]})()")
      for _ in range(3):
        await pg.touchscreen.tap(r[0],r[1]);await pg.wait_for_timeout(200)
      await pg.wait_for_timeout(1500)
      a=await pg.evaluate(AUD)
      check(not a['bad'] and a['act'] in ('BODY','BUTTON') and a['design']=='off' and a['sel']==0,f'caret {animal} {gm}: no editable / focusable / selectable text, no selection {a}')
      if gm=='runGame':
        bm=await pg.evaluate("window.__bm");check(bm==0,f'caret {animal} run: the blinking beat dash at the Echo\'s feet is never drawn ({bm} draws in ~2 s)')
        if animal=='dog':
          await wait(pg,"MusicFX.beat()&&MusicFX.beat().phase<.12",3000)
          rc=await pg.evaluate("(()=>{const r=document.getElementById('rc').getBoundingClientRect();return [r.left,r.top,r.width/360]})()")
          await pg.screenshot(path=f'{SHOT}/09_run_echo.png',clip={'x':rc[0],'y':rc[1]+400*rc[2],'width':140*rc[2],'height':100*rc[2]})
    check(not errs,f'caret {animal}: no page errors {errs[:2]}');await ctx.close()
# ---------------------------------------------------------------- 11: an Ancient Echo's intro plays at the tune's own tempo (also after the speed-up steps)
# the start time is when the sample really starts (Music.oneShot resolves with the source), not when it was asked for
OSPY="""(()=>{window.__on=[];const _o=Music.oneShot;Music.oneShot=(n,o)=>{const c=EchoBack.cur,r={n,t:performance.now(),ph:c&&c.phase,id:c&&c.tune&&c.tune.id,ask:document.querySelectorAll('.eibask .eibn').length};__on.push(r);
  const p=_o(n,o);if(p&&p.then)p.then(s=>{if(s)r.st=performance.now()});return p}})()"""
async def slow_notes(pg):   # a phone's first fetch of a note sample: 120-420 ms (deterministic per file); a cached replay never waits
  async def route(r):
    u=r.request.url;await asyncio.sleep((120+(sum(map(ord,u))*37)%300)/1000);await r.continue_()
  await pg.route('**/music/notes/**',route)
async def tempo_part(b):
  for step in (0,4):
    ctx,pg,errs=await setup(b,PH)
    await pg.evaluate("__echo.eib('play')");await wait(pg,"EchoBack.cur",8000);await pg.wait_for_timeout(300)
    await pg.evaluate("""(st=>{EchoBack.stop();const b=JSON.parse(localStorage.getItem('echo-songbook-v1'));for(const k in b.progress){b.progress[k].tempoStep=st}localStorage.setItem('echo-songbook-v1',JSON.stringify(b))})(%d)"""%step)
    await slow_notes(pg);await pg.evaluate(OSPY);await pg.evaluate("__echo.eib('invite')")
    t0=time.time();anc=None;shot=0
    while time.time()-t0<120:
      c=await pg.evaluate("EchoBack.cur?[EchoBack.cur.phase,EchoBack.cur.tune&&EchoBack.cur.tune.id]:['gone',null]")
      if c[0] in ('end','done','gone'):break
      if c[0]=='echo' and c[1] and c[1].startswith('anc:') and not shot:shot=1;await pg.wait_for_timeout(900);await pg.screenshot(path=f'{SHOT}/11_anc_intro_step{step}.png')
      if c[0]=='child':
        if c[1] and c[1].startswith('anc:'):anc=c[1];break
        for s_ in await pg.evaluate("EchoBack.cur.asked"):
          await pg.locator(f'.eibpad[data-pad="{s_}"]').first.tap();await pg.wait_for_timeout(90)
        await wait(pg,"EchoBack.cur.phase!=='child'",4000)
      await pg.wait_for_timeout(100)
    check(anc is not None,f'tempo step {step}: an Ancient Echo came up ({anc})')
    if anc:
      r=await pg.evaluate("""(id=>{const t=EchoBack.sbById(id.slice(4)),V=EchoBack.data.v2.tempo,on=__on.filter(x=>x.id===id),ch=on.filter(x=>x.ask>0),ec=on.filter(x=>x.ask===0);
        const n=EchoBack.cur.asked.length,cn=EchoBack.cur.tune.n.slice(0,n),dur=(x,bpm)=>Math.max(V.min_note_ms,x[2]*60000/bpm/12);
        const T=x=>x.st||1e12,exp=cn.slice(0,-1).reduce((a,x)=>a+dur(x,t.bpm),0),got=ch.length>=n?T(ch[n-1])-T(ch[0]):-1;
        const gaps=(L,ex)=>L.slice(1).map((x,i)=>Math.round(T(x)-T(L[i])));
        const en=EchoBack.sbEchoNotes(t.echo),ei=en.map((x,i)=>i).filter(i=>en[i][0]),eexp=en.slice(ei[0],ei[ei.length-1]).reduce((a,x)=>a+dur(x,t.echo.bpm),0),egot=ec.length?T(ec[ec.length-1])-T(ec[0]):-1;
        return {tune:t.id,bpm:t.bpm,echoBpm:t.echo.bpm,curBpm:EchoBack.cur.tune.bpm,child:[Math.round(got),Math.round(exp)],echo:[Math.round(egot),Math.round(eexp)],nc:ch.length,ne:ec.length,echoGaps:gaps(ec),childGaps:gaps(ch.slice(0,n)),
          echoScore:en.slice(ei[0]).map(x=>Math.round(dur(x,t.echo.bpm)))}})(%s)"""%json.dumps(anc))
      json.dump(r,open(f'{SHOT}/11_anc_intro_step{step}_timing.json','w'))
      ok_c=r['child'][1]>0 and abs(r['child'][0]/r['child'][1]-1)<.06;ok_e=r['echo'][1]>0 and abs(r['echo'][0]/r['echo'][1]-1)<.06
      check(r['curBpm']==r['bpm']==r['echoBpm'],f'tempo step {step}: the intro tune runs at the tune\'s own bpm {r}')
      check(ok_e,f'tempo step {step}: the Echo version plays at its natural tempo (span {r["echo"][0]} ms, score {r["echo"][1]} ms; gaps {r["echoGaps"][:10]})')
      check(ok_c,f'tempo step {step}: the child\'s part plays at the tune\'s natural tempo (span {r["child"][0]} ms, score {r["child"][1]} ms)')
    check(not errs,f'tempo step {step}: no page errors {errs[:2]}');await ctx.close()
# ---------------------------------------------------------------- 3: "Bye for now": wave, one short warm line, curl up asleep; no countdown, no pressure
BANNED=['bond','see you','come back','miss you','parent','grown-up','minute','second']
async def bye_part(b):
  for band in ('7-8','5-6'):
    ctx,pg,errs=await setup(b,PH)
    await pg.evaluate(f"__echo.sess().chats=99;__echo.state.ageBand='{band}';__echo.state.needs.rest=90;document.getElementById('overlay').innerHTML='';__echo.home()");await pg.wait_for_timeout(1500)
    if band=='7-8':await pg.screenshot(path=f'{SHOT}/03_bye_home.png')
    check(await pg.locator('#bye').count()==1,f'bye {band}: a "Bye for now" button on the home screen')
    if not await pg.locator('#bye').count():await ctx.close();continue
    lab=await pg.get_attribute('#bye','aria-label');check(lab=='Bye for now',f'bye {band}: labelled {lab!r}')
    if band=='5-6':   # tapped while the Echo is busy at a wander spot (the wander's end timer must not wake the sleeper)
      quiet=0   # let the first-day origin talk finish (answer it like a kid), so the Echo is free to wander
      for _ in range(150):
        if await pg.locator('.choices button').count():
          try:
            c=pg.locator('.choices button').first;await c.click(timeout=800);await c.click(timeout=800)
          except Exception:pass
        elif await pg.evaluate("!!(Dialogue.waiting&&Dialogue.waiting())"):await pg.evaluate("Dialogue.advance()")
        quiet=quiet+1 if await pg.evaluate("!document.getElementById('overlay').innerHTML.trim()&&!(Dialogue.waiting&&Dialogue.waiting())") else 0
        if quiet>=12:break
        await pg.wait_for_timeout(250)
      await pg.evaluate("document.getElementById('b').style.display='none';CONFIG.livingSpeed=.05;__echo.living.start(false)")
      check(await wait(pg,"__echo.living.st==='wander'&&__echo.living.act&&!__echo.living.dbg().timer",15000),f'bye {band}: the Echo is busy at a wander spot {await pg.evaluate("[__echo.living.st,__echo.living.act,__echo.living.dbg()]")}')
    # a tip already showing when bye is tapped, plus tips pending for the wave (0.6 s), the line (1.8 s) and the sleep (5 s, 9 s);
    # a 50 ms watcher records any toast bubble that is visible (#toast.on: a tip, or the missions check's "Shh… napping") from the tap until the Feed tap below
    tip0=await pg.evaluate("""(()=>{__echo.tip('Tip: tap the buttons below to care for '+__echo.state.g.name);const t=document.getElementById('toast');return t.classList.contains('on')&&t.textContent.startsWith('Tip')})()""")
    check(tip0,f'bye {band}: a tip is showing just before the tap (the test can see one)')
    await pg.evaluate("""(()=>{const T='Tip: tap the buttons below to care for '+__echo.state.g.name;window.__tipSeen=[];const t0=Date.now();
      document.getElementById('bye').addEventListener('click',()=>{[600,1800,5000,9000].forEach(ms=>setTimeout(()=>__echo.tip(T),ms));
        window.__tipW=setInterval(()=>{const e=document.getElementById('toast');if(e.classList.contains('on'))__tipSeen.push((Date.now()-t0)+' '+e.textContent)},50)},{once:true,capture:true})})()""")
    await pg.evaluate("Alive.log.length=0;document.getElementById('overlay').innerHTML=''");await pg.locator('#bye').click()   # an open choice list eats the first outside tap (by design);await pg.wait_for_timeout(700)
    if band=='7-8':await pg.screenshot(path=f'{SHOT}/03_bye_wave.png')
    if band=='7-8':
      await pg.wait_for_timeout(1300)   # the line is up and the 0.6 s / 1.8 s tips have fired
      os.makedirs('/workspace/echo/pm/review_nov8/jay',exist_ok=True);await pg.screenshot(path='/workspace/echo/pm/review_nov8/jay/03_bye_after_notip.png')
    r=await pg.evaluate("""(()=>{const S=__echo.state,L=Dialogue.lib.barks.bye_for_now,b=document.getElementById('b');return {txt:b.textContent.trim(),shown:b.style.display!=='none',L,wave:Alive.log.includes('act:wave'),
      nap:(S.napUntil-Date.now()-(S.clockOffset||0))/1000,napS:CONFIG.napSeconds,thought:!!document.querySelector('#sc .thought')}})()""")
    L=r['L'];check(isinstance(L,list) and len(L)==1,f'bye {band}: exactly one shared line bye_for_now {L}')
    want=L[0]['text']   # Phase B: all dialogue is one 7-8 band, the age pick no longer swaps in the 5-6 short
    check(r['shown'] and r['txt']==want,f'bye {band}: the Echo says {want!r} (got {r["txt"]!r})')
    check(len(L[0]['short'].split())<=7,f'bye: the 5-6 short has <= 7 words ({L[0]["short"]!r})')
    low=(L[0]['text']+' '+L[0]['short']).lower()
    check(not any(w in low for w in BANNED) and not any(c.isdigit() for c in low) and '?' not in low,f'bye: no banned words, numbers, questions or pressure in {low!r}')
    check(r['wave'],f'bye {band}: the Echo waves');check(not r['thought'],f'bye {band}: no need bubble over the sleeper')
    check(0<r['nap']<=r['napS']+1,f'bye {band}: asleep as a normal nap ({r["nap"]:.1f} s of {r["napS"]} s), nothing counts down on screen')
    await pg.wait_for_timeout(3600)
    sl=await pg.evaluate("(()=>{const px=document.querySelector('#cr .px-echo');return {sleep:!!(px&&px._sleep),mood:document.querySelector('#cr')&&true,feed:!!document.getElementById('feed')}})()")
    check(sl['sleep'],f'bye {band}: curled up asleep {sl}')
    if band=='5-6':
      await pg.wait_for_timeout(12000);sl=await pg.evaluate("!!(document.querySelector('#cr .px-echo')||{})._sleep");check(sl,f'bye {band}: still asleep 16 s later (a wander in progress never wakes it)')
    if band=='7-8':await pg.screenshot(path=f'{SHOT}/03_bye_asleep.png')
    if band=='7-8':await pg.wait_for_timeout(5000)   # past the 9 s pending tip, still asleep
    seen=await pg.evaluate("(clearInterval(__tipW),{seen:__tipSeen.slice(0,5),asleep:__echo.state.napUntil>Date.now()+(__echo.state.clockOffset||0)})")
    check(not seen['seen'] and seen['asleep'],f'bye {band}: no tip / toast bubble visible during the wave, the line or the sleep (seen at ms {seen["seen"]}, still asleep {seen["asleep"]})')
    nd=await pg.evaluate("Object.assign({},__echo.state.needs)");await pg.locator('#feed').click();await pg.wait_for_timeout(300)
    nd2=await pg.evaluate("Object.assign({},__echo.state.needs)");check(nd==nd2,f'bye {band}: a sleeping Echo is not fed/woken by Feed')
    body=await pg.evaluate("document.body.innerText.toLowerCase()");check('see you' not in body and 'bond' not in body,f'bye {band}: nothing banned on screen')
    check(not errs,f'bye {band}: no page errors {errs[:2]}');await ctx.close()
PARTS={'eib':eib_part,'needs':needs_part,'caret':caret_part,'tempo':tempo_part,'bye':bye_part}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    for k,f in PARTS.items():
      if ONLY in ('',k):await f(b)
    await b.close()
  print('ALL OK' if not fails else f'{len(fails)} FAIL');sys.exit(1 if fails else 0)
asyncio.run(main())
