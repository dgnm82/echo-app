# One-tap choices (Kai, Nov 10): Hug / chat / play / invite / name must select on the
# first tap. Speech may still play. Fails on 54b5a81f (two-tap armed/sel + old hint).
import asyncio, os, re, sys
from pathlib import Path
from playwright.async_api import async_playwright
try:
  from origin_pick import pick, nocam
except Exception:
  async def pick(pg, animal, ms=250):
    pass
  async def nocam(pg):
    pass

ROOT=Path(__file__).resolve().parents[1]
URL=sys.argv[1] if len(sys.argv)>1 else os.environ.get('ONE_TAP_URL','http://127.0.0.1:8773/')
bad=[];n=[0]
def check(c,m):
  n[0]+=1
  if not c:bad.append(m);print('FAIL',m)

print('== static: two-tap armed/confirm and old hint are gone ==')
gj=(ROOT/'game.js').read_text()
schema=(ROOT/'DIALOGUE_SCHEMA.md').read_text() if (ROOT/'DIALOGUE_SCHEMA.md').exists() else ''
check('Tap to hear · tap again to choose' not in gj, 'game.js no longer hardcodes "Tap to hear · tap again to choose"')
check('Tap to hear, tap again' not in gj and 'tap to hear, tap again' not in gj, 'game.js comments no longer describe two-tap hear/choose')
check(not re.search(r'let armed=false', gj), 'orInvite no longer uses an armed flag')
# choices() must not keep a sel confirm on the same button
ch=re.search(r'function choices\(list,cb,opts\)\{.*?\nfunction ', gj, re.S)
check(bool(ch), 'choices() is still defined')
if ch:
  body=ch.group(0)
  check('let sel=-1' not in body and 'if(sel===i)' not in body, 'choices() has no sel/confirm second-tap')
  check('Tap to choose' in body or "U('ui_pick_hint')" in body, 'choices() uses the one-tap hint')
# orName: a name / keep tap must not wait for a second tap on the same control
nm=re.search(r'function orName\(page\)\{.*?function orFinish', gj, re.S)
check(bool(nm), 'orName() is still defined')
if nm:
  body=nm.group(0)
  check('if(sel===b.dataset.n)' not in body and "if(sel==='__keep')" not in body, 'orName no longer confirms on a second tap of the same name/keep button')
check('tap-to-hear, tap-again-to-choose' not in schema, 'DIALOGUE_SCHEMA.md no longer documents two-tap choices')

async def T(pg,sel,ms=250):
  await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)

async def settle(pg):
  await pg.evaluate("""()=>{const o=document.getElementById('overlay');if(o)o.innerHTML='';
    const b=document.getElementById('b');if(b){b.style.display='none';b.classList.remove('tapnext','gamecall')}
    const g=document.getElementById('gs');if(g)g.remove();
    if(window.CONFIG){CONFIG.ambientMin=999;CONFIG.ambientMax=999}
    if(window.__echo){try{__echo.home()}catch(e){}}
  }""");await pg.wait_for_timeout(300)

async def live():
  async with async_playwright() as p:
    brw=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # --- shared choices() + Hug dock + play picker + a chat (nosetup home) ---
    ctx=await brw.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg)
    await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(400)
    await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush');await pg.wait_for_timeout(500)
    # reveal welcome chips also go through choices(); one tap must leave Home
    if await pg.locator('.choices button').count():
      hint=await pg.locator('.choices .hint').first.text_content()
      print('reveal hint',hint)
      check(hint and 'tap again' not in hint.lower(), f'reveal welcome hint is not two-tap ({hint!r})')
      await pg.locator('.choices button').first.click();await pg.wait_for_timeout(800)
      check(await pg.locator('.choices button').count()==0, 'reveal welcome: one tap selects (choices close)')
    await pg.wait_for_timeout(2000)
    await pg.evaluate("document.getElementById('overlay').innerHTML='';const S=__echo.state;S.days=9;S.napUntil=0;S.needs.comfort=20;S.needs.food=40;S.needs.play=40;CONFIG.ambientMin=999;CONFIG.ambientMax=999;__echo.home()");await pg.wait_for_timeout(600)

    # direct choices() hook
    got=await pg.evaluate("""()=>{return new Promise(res=>{window.__oneTap=null;__echo.choices([['👋','Hi there',null],['🤗','A hug',null]],i=>{window.__oneTap=i;res('cb')});setTimeout(()=>res('timeout'),0)})}""")
    hint=await pg.locator('#overlay .choices .hint').text_content()
    print('choices hint',hint)
    check(hint and 'tap again' not in hint.lower() and 'Tap to choose' in hint, f'choices() hint is "Tap to choose" (got {hint!r})')
    # click via the element's own handler (Playwright's retry can land on #comfort after the list closes)
    nbtn=await pg.locator('#overlay .choices button').count()
    await pg.evaluate("document.querySelector('#overlay .choices button')&&document.querySelector('#overlay .choices button').click()");await pg.wait_for_timeout(300)
    picked=await pg.evaluate("window.__oneTap")
    left=await pg.locator('#overlay .choices button').count()
    print('choices one tap',picked,left)
    check(picked==0 and left==0, f'choices(): one tap selects immediately (picked={picked}, buttons left={left})')

    # Hug dock (comfort() -> choices() -> affDo)
    await settle(pg)
    await pg.evaluate("document.getElementById('comfort').click()");await pg.wait_for_timeout(300)
    labels=await pg.locator('#overlay .choices button').all_inner_texts()
    print('hug chips',labels)
    check(len(labels)>=1, f'Hug dock opened chips ({labels})')
    hug=pg.locator('#overlay .choices button',has_text=re.compile(r'Hug|hug|Cuddle|cuddle|Squeeze')).first
    target=hug if await hug.count() else pg.locator('#overlay .choices button').first
    await target.click();await pg.wait_for_timeout(400)
    check(await pg.locator('#overlay .choices button').count()==0, 'Hug chip: one tap chooses (list closes)')

    # Play picker
    await settle(pg)
    await pg.evaluate("document.getElementById('play').click()");await pg.wait_for_timeout(300)
    check(await pg.locator('#overlay .choices button').count()>=1, 'Play picker opened')
    await pg.locator('#overlay .choices button').first.click();await pg.wait_for_timeout(500)
    # one tap should leave the picker (a game may have opened)
    check(await pg.locator('#overlay .choices .hint').count()==0 or 'tap again' not in ((await pg.locator('#overlay .choices .hint').text_content()) or '').lower(),
          'Play picker: one tap leaves the two-tap picker')
    opened=await pg.evaluate("!!document.getElementById('gs')||!document.querySelector('#overlay .choices button')")
    check(opened, 'Play picker: one tap selects a game or closes the list')
    await pg.evaluate("const g=document.getElementById('gs');if(g)g.remove();document.getElementById('overlay').innerHTML='';__echo.home()");await pg.wait_for_timeout(300)

    # Chat choice via runConv
    await pg.evaluate("""()=>{window.__chatPick=0;const c=(Dialogue.lib.conversations||[]).find(x=>x.nodes&&Object.values(x.nodes).some(n=>n.choices));
      if(!c)return false;__echo.runConv(c.id,()=>{});return true}""")
    await pg.wait_for_timeout(800)
    if await pg.locator('#overlay .choices button').count():
      await pg.locator('#overlay .choices button').first.click();await pg.wait_for_timeout(400)
      check(await pg.locator('#overlay .choices button').count()==0, 'chat chips: one tap chooses (list closes)')
    else:
      print('WARN no chat choices appeared; static + hook cover the shared path')
    await ctx.close()

    # --- origin invite + name (real onboarding) ---
    ctx=await brw.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg)
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600)
    if await pg.locator('#obgo').count():await T(pg,'#obgo',400)
    for _ in range(12):
      if await pg.locator('#obnm').count():break
      if await pg.locator('.scene.ob').count():await T(pg,'.scene.ob',200)
    if await pg.locator('#obnm').count():
      await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes')
      await pg.evaluate("window.__echo&&__echo.setBand&&__echo.setBand('7-8')")
      await pick(pg,'fox');await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
    # invite: one tap must proceed (button gone, not merely .sel)
    await pg.locator('#orinv').wait_for(timeout=8000)
    await T(pg,'#orinv',400)
    inv=await pg.evaluate("(()=>{const b=document.getElementById('orinv');return b?{sel:b.classList.contains('sel'),on:1}: {on:0}})()")
    print('invite after one tap',inv)
    check(inv.get('on')==0, f'invite: one tap selects (button still up={inv})')
    if inv.get('on'):  # baseline bootstrap so the name check can still fail
      await T(pg,'#orinv',3000)
    else:
      await pg.wait_for_timeout(3000)
    # name step
    if await pg.locator('#ornm').count():
      await T(pg,'#ornm',500)
    await pg.locator('#orkeep').wait_for(timeout=8000)
    await T(pg,'#orkeep',500)
    still=await pg.evaluate("!!document.getElementById('orkeep')||!!document.querySelector('.scene.orname')")
    print('name after one keep tap, still on name=',still)
    check(not still, 'name keep: one tap chooses the name (left the name screen)')
    await ctx.close();await brw.close()

asyncio.run(live())
print(f'title-independent one-tap: {n[0]-len(bad)}/{n[0]} passed')
sys.exit(1 if bad else 0)
