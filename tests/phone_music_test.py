# Music v2 + sound v2 phone test. Usage: python3 tests/phone_music_test.py [base-url]
import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def run(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);reqs={}
  pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  pg.on('response',lambda r:reqs.__setitem__(r.url.split('/echo-app/')[-1].split('8765/')[-1],r.status))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove())")
  sp='slyte' if kind=='fox' else 'whimber'
  await pg.click('#cr');await pg.wait_for_timeout(2500)
  pl=await pg.evaluate("Music.playing");assert pl and pl.startswith(f'bg_{sp}_'),pl
  # gapless: the decoded loop is sample-exact (whole bars), loops in Web Audio, and came from OGG/WAV, never MP3
  info=await pg.evaluate("(()=>{const b=Music.buffers[Music.playing];return {d:b.duration,sr:b.sampleRate}})()")
  exp={'bg_slyte_day_loop':40.0,'bg_slyte_twilight_loop':36.0,'bg_whimber_day_loop':45.71,'bg_whimber_twilight_loop':45.0}[pl]
  assert abs(info['d']-exp)<0.011,(pl,info)
  assert not [u for u in reqs if u.startswith('music/') and u.endswith('.mp3')]
  assert any(u.startswith('music/') and u.endswith('.ogg') and s==200 for u,s in reqs.items()),reqs
  # a game switches to its own theme
  await pg.evaluate("__echo.state.bondShown=5;__echo.state.bond=150;__echo.connectGame()");await pg.wait_for_timeout(2500)
  g=await pg.evaluate("Music.playing");assert g==('game_berry_connect_loop' if kind=='fox' else 'game_moonlight_connect_loop'),g
  await pg.click('#quit');await pg.wait_for_timeout(3000)
  # v2 voice: expression -> mood takes
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());Sound.chirp('Hi!', '%s','giggling')"%kind);await pg.wait_for_timeout(800)
  loaded=await pg.evaluate("Sound.loaded");assert any(x.startswith(f'{sp}_silly_') for x in loaded),loaded
  if kind=='owl':
    await pg.evaluate("Sound.play('ui_tap')");await pg.wait_for_timeout(600);assert 'ui_tap_whimber' in await pg.evaluate("Sound.loaded")
  # sound off stops the music
  await pg.evaluate("__echo.state.voice=false;Music.refresh()");await pg.wait_for_timeout(200);assert await pg.evaluate("Music.playing")==None
  bad=[u for u,s in reqs.items() if (u.startswith('sfx/') or u.startswith('music/')) and s!=200];assert not bad,bad
  print(kind,'music',pl,info,'game',g);await pg.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);errs=[]
    for k in ('fox','owl'):await run(b,p,k,errs)
    print('ERR',errs);assert not errs;await b.close();print('music test OK')
asyncio.run(main())
