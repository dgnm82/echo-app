# Batch H (Hphone): the Origin is camera-first now (Magic Window -> family-first picker on a miss / no camera).
# Phone tests run with S.camOrigin=false, the switch the app honours (game.js orSeen), so they land on the picker
# deterministically, then pick family card -> that family's animal card. pick() also copes with the camera screen.
NOCAM="(()=>{setInterval(()=>{try{const s=window.__echo&&window.__echo.state;if(s&&s.camOrigin===undefined)s.camOrigin=false}catch(e){}},40)})()"
async def nocam(pg):
  await pg.add_init_script(NOCAM)
async def pick(pg,animal,ms=250):
  await pg.wait_for_selector('.orfamcard,.orcard[data-a],#orcamctl:not([hidden]) #orpick',timeout=15000)
  if await pg.locator('#orcamctl:not([hidden]) #orpick').count():
    await pg.locator('#orpick').click();await pg.wait_for_timeout(ms)
  if not await pg.locator(f'.orcard[data-a="{animal}"]').count():
    fam=await pg.evaluate("a=>(FAMILIES.animals[a]||{}).family",animal)
    await pg.locator(f'.orfamcard[data-f="{fam}"]').click();await pg.wait_for_timeout(ms)
    await pg.locator('#ornext').click();await pg.wait_for_timeout(ms)
  await pg.locator(f'.orcard[data-a="{animal}"]').first.click();await pg.wait_for_timeout(ms)
async def to_family(pg,fam,ms=250):
  """open one family's animal step (family-first picker)"""
  await pg.wait_for_selector('.orfamcard,#orcamctl:not([hidden]) #orpick',timeout=15000)
  if await pg.locator('#orcamctl:not([hidden]) #orpick').count():
    await pg.locator('#orpick').click();await pg.wait_for_timeout(ms)
  await pg.locator(f'.orfamcard[data-f="{fam}"]').click();await pg.wait_for_timeout(ms)
  await pg.locator('#ornext').click();await pg.wait_for_timeout(ms)

async def _click(pg,sel,ms=250):
  await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)

async def _beat(pg):
  return await pg.evaluate("((document.querySelector('.scene.ob')||{}).dataset||{}).beat||''")

async def to_ask(pg,ms=400):
  """Advance the hello beat to Come along? No-op if #orinv is already up or we are past ask."""
  if await pg.locator('#orinv').count():return
  beat=await _beat(pg)
  if beat in ('yes','who','glow','name','decline'):return
  await pg.locator('#orgo').wait_for(timeout=8000)
  await _click(pg,'#orgo',ms)

async def through_invite(pg,until='name'):
  """Drive the five-beat invite from hello/ask to yes, who, glow, or the name grid.
  until is one of: ask, yes, who, glow, name."""
  await to_ask(pg)
  if until=='ask':return
  if await pg.locator('#orinv').count() or (await _beat(pg)) in ('hello','ask',''):
    await pg.locator('#orinv').wait_for(timeout=8000)
    await _click(pg,'#orinv',400)
  beat=await _beat(pg)
  if beat=='decline' or until=='yes':return
  if beat=='yes' and until in ('who','glow','name'):
    await pg.locator('#orgo').wait_for(timeout=8000)
    await _click(pg,'#orgo',400)
    beat='who'
  if until=='who':return
  if beat=='who' and until in ('glow','name'):
    await pg.locator('#orgo').wait_for(timeout=8000)
    await _click(pg,'#orgo',400)
    beat='glow'
  if until=='glow':return
  if beat=='glow' and until=='name':
    await pg.locator('#ornm').wait_for(timeout=8000)
    await _click(pg,'#ornm',400)
