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
