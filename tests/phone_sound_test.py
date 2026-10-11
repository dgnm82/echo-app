# Sound wiring check: every sfx/*.mp3 the app references loads (no 404s), audio unlocks on first tap,
# a chirp and care sounds play, and the sound toggle silences them. Usage: python3 tests/phone_sound_test.py [base-url]
import asyncio,sys,os,re
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=user-gesture-required']);errs=[];bad=[];ok=[]
    pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('response',lambda r:('/sfx/' in r.url) and (ok if r.status==200 else bad).append((r.status,r.url.split('/sfx/')[1])))
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(500)
    assert not await pg.evaluate("Sound.unlocked"),'locked before first tap'
    await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush');await pg.wait_for_timeout(5000)
    c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3500)
    await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML=''")
    loaded=await pg.evaluate("Sound.loaded.length");st=await pg.evaluate("Sound.unlocked")
    r=await pg.evaluate("[Sound.chirp('Hi there!','fox','happy'),Sound.chirp('Hmm?','fox','curious'),Sound.play('care_feed_eat'),Sound.play('care_nap_tuck')]")
    await pg.evaluate("__echo.state.voice=false");off=await pg.evaluate("[Sound.chirp('Hi!','fox','happy'),Sound.play('ui_tap',{gap:0})]")
    files=sorted(set(re.findall(r"'([a-z_0-9]+)'",open('sound.js').read())+re.findall(r"SFX\('([a-z_0-9]+)'",open('game.js').read())))
    need=[f for f in files if os.path.exists('sfx/'+f+'.mp3')];missing=[f for f in re.findall(r"SFX\('([a-z_0-9]+)'",open('game.js').read()) if not os.path.exists('sfx/'+f+'.mp3')]
    print('unlocked',st,'decoded',loaded,'fetched ok',len(ok),'bad',bad,'plays',r,'when off',off,'missing files',missing,'ERR',errs)
    assert st and loaded>=13 and not bad and all(r) and not any(off) and not missing and not errs
    await b.close();print('sound test OK')
asyncio.run(main())
