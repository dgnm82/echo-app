# Intro-convo layout + Wingsong article regressions. Failing-first against the packed
# meadow invite: dusk gradient, 96px Echo bottom-left on every beat, bubble tail down,
# glow as its own beat before naming, invite_hum names the bird the child saw (a/an).
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from origin_pick import pick,nocam,to_ask,through_invite,_beat

URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
ROOT=Path(__file__).resolve().parents[1]
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)

ART="""(()=>{const sc=document.getElementById('app')||document.getElementById('screen');
  const S=sc.getBoundingClientRect(),k=S.width/180;
  const box=el=>{if(!el||!el.getClientRects().length)return null;const r=el.getBoundingClientRect();
    return {w:r.width/k,h:r.height/k,x:(r.left-S.left)/k,y:(r.top-S.top)/k,yb:(S.bottom-r.bottom)/k,top:r.top,bottom:r.bottom,left:r.left,right:r.right}};
  const bg=document.querySelector('.scene.ob .pxbg');
  const lf=document.getElementById('orlf');
  const bub=document.getElementById('obb');
  const vis=el=>!!(el&&el.getClientRects().length&&getComputedStyle(el).display!=='none'&&!el.hidden);
  const tail=(()=>{if(!vis(bub))return null;const s=getComputedStyle(bub,'::before');
    return {top:parseFloat(s.borderTopWidth)||0,bottom:parseFloat(s.borderBottomWidth)||0,topC:s.borderTopColor,botC:s.borderBottomColor}})();
  return {beat:((document.querySelector('.scene.ob')||{}).dataset||{}).beat||'',
    bg:bg?{cls:bg.className,img:getComputedStyle(bg).backgroundImage}:null,
    discover:!!document.querySelector('.pxbg-discover'),
    dusk:!!(bg&&bg.classList.contains('pxbg-dusk')),
    echo:box(lf),bub:box(bub),bubOn:vis(bub),tail,
    ornm:!!document.getElementById('ornm'),strip:!!document.querySelector('.orstrip'),
    names:!!document.querySelector('.ornames'),fam:!!document.querySelector('.orfamline'),
    perch:!!document.querySelector('.orperch'),
    panel:!!document.querySelector('.scene.ob .obpanel:not([hidden])')}
})()"""

def close(a,b,tol=2.5):
  return a is not None and abs(a-b)<=tol

async def T(pg,sel,ms=250):
  await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)

async def to_colours(b,p,animal):
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg)
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700)
  await T(pg,'#obgo',400)
  for _ in range(8):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes')
  await pg.evaluate("__echo.setBand('7-8')")
  await pick(pg,animal);await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',1000)
  return ctx,pg

def layout_ok(info,tag,size=None,wing=False):
  check(not info['discover'] and 'bg_discover' not in ((info.get('bg') or {}).get('img') or ''),f'{tag}: no bg_discover')
  check(info['dusk'] and 'pxbg-dusk' in ((info.get('bg') or {}).get('cls') or ''),f'{tag}: dusk gradient class')
  e=info['echo']
  check(bool(e),f'{tag}: Echo is mounted')
  if not e:return size
  check(close(e['w'],96) and close(e['h'],96),f'{tag}: Echo is 96px (got {e["w"]:.1f}x{e["h"]:.1f})')
  check(close(e['x'],8,3),f'{tag}: Echo is bottom-left (x={e["x"]:.1f})')
  want_yb=12 if wing else 8
  check(close(e['yb'],want_yb,4),f'{tag}: Echo is bottom-left (y_bottom={e["yb"]:.1f}, want ~{want_yb})')
  if size:
    check(close(e['w'],size['w'],1.5) and close(e['h'],size['h'],1.5) and close(e['x'],size['x'],1.5),
          f'{tag}: Echo same size/place as first beat (was {size}, now {e})')
  else:
    size={'w':e['w'],'h':e['h'],'x':e['x']}
  if info['bubOn'] and info['bub'] and e:
    check(info['bub']['bottom']<=e['top']+10,f'{tag}: bubble sits above the head (bub.bottom={info["bub"]["bottom"]:.1f} echo.top={e["top"]:.1f})')
    t=info.get('tail') or {}
    check(t.get('top',0)>t.get('bottom',0),f'{tag}: bubble tail points down {t}')
  if wing:
    check(info['perch'],f'{tag}: Wingsong sits on a twig')
  return size

async def main():
  # static: whimber invite_hum[0] uses the animal slot, not a hardcoded owl
  w=json.loads((ROOT/'dialogue'/'whimber.json').read_text())
  t0=w['barks']['invite_hum'][0]['text']
  check('{var:origin_animal}' in t0,'whimber invite_hum[0] uses {var:origin_animal}')
  check('owl' not in t0.lower(),'whimber invite_hum[0] is not hardcoded to owl: '+t0)
  sh=json.loads((ROOT/'dialogue'/'shared.json').read_text())
  hello=sh['barks']['ui_or_invite_hello'][0]['text']
  check(hello=='Shh... listen. Something is humming!','ui_or_invite_hello exact text')
  check('...' in hello and '\u2026' not in hello,'ui_or_invite_hello uses ASCII periods')

  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # --- article helper: owl / robin / eagle via the production orFill path ---
    ctx,pg=await to_colours(b,p,'owl')
    art=await pg.evaluate("""()=>{
      const S=__echo.state,tpl='…You saw a {var:origin_animal}. I\\'m the little song it hums.';
      const run=a=>{S.vars.origin_animal=a;return __echo.orFill(tpl)};
      return {owl:run('owl'),robin:run('robin'),eagle:run('eagle'),bird:run('bird')};
    }""")
    print('article fills',art)
    check(art['owl']=="…You saw an owl. I'm the little song it hums.",'owl gets "an owl": '+art['owl'])
    check(art['robin']=="…You saw a robin. I'm the little song it hums.",'non-owl bird gets its own name and "a": '+art['robin'])
    check(art['eagle']=="…You saw an eagle. I'm the little song it hums.",'eagle gets "an eagle": '+art['eagle'])
    check(art['bird']=="…You saw a bird. I'm the little song it hums.",'bird gets "a bird": '+art['bird'])
    # restore the real origin word for the live invite
    await pg.evaluate("(__echo.state.vars.origin_animal='owl')")

    # --- dog (slyte): every beat, no discover, 96px, glow is its own beat ---
    # already on hello (we picked owl above). Start a dog path in a fresh page.
    await ctx.close()
    ctx,pg=await to_colours(b,p,'dog')
    info=await pg.evaluate(ART);print('hello',info['beat'],info['echo'])
    check(info['beat']=='hello','land on hello beat')
    check('humming' in ((await pg.locator('#orpanel').inner_text()).lower()),'hello narrator is ui_or_invite_hello')
    size=layout_ok(info,'hello dog')
    # glow must not be on hello/ask/yes/who
    await to_ask(pg)
    info=await pg.evaluate(ART);print('ask',info['beat'])
    check(info['beat']=='ask' and await pg.locator('#orinv').count()==1,'ask beat shows Come along?')
    size=layout_ok(info,'ask dog',size)
    check(not info['ornm'] and not info['strip'] and not info['names'],'ask: glow/name not on this beat')
    await pg.evaluate("window.__arrSeen=0;new MutationObserver(()=>{if(document.querySelector('canvas.notearrive'))__arrSeen=1}).observe(document.body,{childList:true,subtree:true})")
    await through_invite(pg,'yes')
    await pg.wait_for_timeout(1100)
    info=await pg.evaluate(ART);print('yes',info['beat'],info)
    check(info['beat']=='yes','yes beat after Come along?')
    size=layout_ok(info,'yes dog',size)
    check(not info['ornm'] and not info['strip'] and not info['fam'] and not info['names'],
          'glow (keep-colours + strip + Next) is not on the yes screen')
    await through_invite(pg,'who')
    info=await pg.evaluate(ART);print('who',info['beat'])
    check(info['beat']=='who' and info['fam'],'who-I-am beat shows the family line')
    size=layout_ok(info,'who dog',size)
    check(not info['ornm'] and not info['strip'] and not info['names'],'who: glow/name not on this beat')
    await through_invite(pg,'glow')
    info=await pg.evaluate(ART);print('glow',info['beat'])
    check(info['beat']=='glow' and info['ornm'] and info['strip'],'glow is its own beat (keep-colours + strip + Next)')
    size=layout_ok(info,'glow dog',size)
    check(not info['names'] and not info['fam'],'glow appears before naming, family bubble is gone')
    t=await pg.locator('#orpanel').inner_text()
    check('glowing with its song' in t,'glow beat shows keep-colours')
    await through_invite(pg,'name')
    info=await pg.evaluate(ART);print('name',info['beat'])
    check(info['beat']=='name' and info['names'] and await pg.locator('.ornm').count()==6,'naming grid on the same layout')
    size=layout_ok(info,'name dog',size)
    check(not info['discover'],'naming: no bg_discover')
    await ctx.close()

    # --- bird (whimber): twig + same 96px size ---
    ctx,pg=await to_colours(b,p,'bird')
    info=await pg.evaluate(ART)
    size=layout_ok(info,'hello bird',wing=True)
    await through_invite(pg,'glow')
    info=await pg.evaluate(ART)
    layout_ok(info,'glow bird',size,wing=True)
    await through_invite(pg,'name')
    info=await pg.evaluate(ART)
    layout_ok(info,'name bird',size,wing=True)
    await ctx.close()

    # --- decline stays on the dusk layout ---
    ctx,pg=await to_colours(b,p,'owl')
    s=await pg.evaluate("(()=>{for(let s=1;s<9999;s++){if(window.__echo.hash(s+'|1|0')<.12)return s}})()")
    await pg.evaluate("""(s)=>{const S=__echo.state;S.originIdx=1;S.oseed=s;S.alwaysYes=false;
      S.origin={idx:1,attempt:0,declined:false,src:S.origin.src,animal:S.origin.animal,family:S.origin.family,ramp:S.origin.ramp,seed:S.origin.seed,chip:S.origin.chip}}""",s)
    await pg.evaluate("__echo.orInvite()")
    await pg.wait_for_timeout(600)
    await to_ask(pg)
    await T(pg,'#orinv',800)
    beat=await _beat(pg)
    check(beat=='decline' and await pg.locator('#orff').count()==1,'forced later origin can decline')
    info=await pg.evaluate(ART)
    layout_ok(info,'decline owl',wing=True)
    check(not info['discover'] and info['dusk'],'decline: dusk layout, no discover')
    await ctx.close()
    await b.close()
  print(f'{ok}/{ok+len(bad)} intro-convo checks passed')
  sys.exit(1 if bad else 0)

asyncio.run(main())
