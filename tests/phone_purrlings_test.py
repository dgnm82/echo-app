# Purrlings (twitchel): the 7 cat tiles + default names, origin lines fit the bubble, cat onboarding, games menu + Yarn Tumble,
# bond-up burst, basket home, scenes borrowed (basket door, no chasing), no dairy, look chirps load. Usage: [base-url] [shot-dir]
import asyncio,sys,os,re
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/purrtest';os.makedirs(OUT,exist_ok=True)
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)
CATS=[('cat','ginger','Mibbit'),('lion','golden','Rumbo'),('tiger','ginger','Tibbo'),('leopard','tan','Dotti'),('cheetah','golden','Zoomi'),('snowleopard','white','Flurry'),('lynx','brown','Tuffet')]
FITS="(sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect(),s=document.querySelector('#screen')||document.body,R=s.getBoundingClientRect();return e.scrollHeight<=e.clientHeight+4&&e.scrollWidth<=e.clientWidth+1&&r.left>=R.left-1&&r.right<=R.right+1&&r.top>=R.top-1&&r.bottom<=R.bottom+1})"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[];b404=[]
    for i,(animal,chip,name) in enumerate(CATS):
      ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await pg.add_init_script('performance.setResourceTimingBufferSize(20000)')
      pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and b404.append(r.url))
      async def T(sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
      await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600);await T('#obgo',400)
      for _ in range(6):
        if await pg.locator('#obnm').count():break
        await T('.scene.ob',200)
      await pg.fill('#obnm','Mia');await T('#obnext');await T('#obyes');await T('.obagebtn >> nth=1')
      if i==0:
        cards=await pg.evaluate("[...document.querySelectorAll('.orcard')].map(b=>b.dataset.a)")
        check(all(c in cards for c,_,_ in CATS) and 'snow_leopard' not in cards,'7 cat tiles '+str(cards))
        ic=await pg.evaluate("[...document.querySelectorAll('.orcard')].filter(b=>%s.includes(b.dataset.a)).map(b=>b.querySelector('i').style.backgroundImage)"%str([c for c,_,_ in CATS]))
        check(len(set(ic))==7,'each cat has its own tile art')
        await pg.screenshot(path=f'{OUT}/picker.png')
      await T(f'.orcard[data-a={animal}]');await T('#ornext',300);await T(f'.orchip[data-c={chip}]',900)
      await T('#orinv');await T('#orinv',3000)
      fl=await pg.evaluate("(document.querySelector('.orfamline')||{}).textContent||''");check('Purrling' in fl and await pg.evaluate(FITS+"('.orfamline')"),f'{animal} family line fits: {fl}')
      if i==0:await pg.screenshot(path=f'{OUT}/origin-family-line.png')
      await T('#ornm',400);await T('#orkeep');await T('#orkeep',3000)
      S=await pg.evaluate("__echo.state");check(S['kind']=='cat' and S['g']['name']==name and S['g'].get('look')==animal,f"{animal} -> {S['kind']} {S['g'].get('name')} {S['g'].get('look')} (want {name})")
      if i==0:
        # setup talk: the origin lines fit the bubble on the phone
        seen={}
        for _ in range(200):
          t=await pg.evaluate("(document.getElementById('b')||{}).textContent||''")
          for k in ('cat songs','Cat, lion'):
            if k in t and k not in seen:await pg.wait_for_timeout(700);seen[k]=await pg.evaluate(FITS+"('#b')");await pg.screenshot(path=f"{OUT}/origin-line-{'songs' if 'songs' in k else 'cat'}.png")
          if len(seen)==2:break
          if await pg.locator('.choices button').count():
            try:c=pg.locator('.choices button').first;await c.click(timeout=800);await c.click(timeout=800)
            except Exception:pass
          await pg.wait_for_timeout(150)
        check(seen.get('cat songs') and seen.get('Cat, lion'),'origin lines shown and fit the bubble '+str(seen))
        await pg.wait_for_timeout(2500);await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove())")
        # data: borrowed scenes, foods, chirps
        sc=await pg.evaluate("SCENES.twitchel.map(s=>[s.id,s.title,s.wp.map(w=>w.id+':'+w.acts.join('/'))])")
        flat=str(sc);check('basket_door' in flat and 'log_mouth' not in flat and 'butterfly_chase' not in flat and 'The basket clearing' in flat,'borrowed scenes '+flat[:200])
        check(await pg.evaluate("SCENES.slyte.some(s=>s.wp.some(w=>w.id==='log_mouth'))"),'slyte scenes untouched')
        dairy=await pg.evaluate(r"FOODS.twitchel.filter(f=>/milk|cheese|yog|butter|cream|ice cream|custard/i.test(f.name+' '+f.id)).map(f=>f.name)");check(not dairy,'no dairy foods '+str(dairy))
        for f in ('mango_slices','peach_slices','pumpkin_soup','jam_toast','sunny_puff','plum_slices','cucumber_rolls'):check(await pg.evaluate(f"FOODS.twitchel.some(x=>x.id==='{f}')"),'food '+f)
        for s in ('twitchel_lion_roar','twitchel_tiger_chuff','twitchel_snowleopard_chuff','twitchel_cheetah_chirp','bondup_sting_twitchel','goodbye_lion','bg_twitchel_day_loop'):
          st=await pg.evaluate(f"fetch('{'music/'+s+'.ogg' if s.startswith(('goodbye','bg_')) else 'sfx/'+s+'.mp3'}').then(r=>r.status)");check(st==200,f'sfx {s} {st}')
        # Batch D for cats: bond tier layer + beat clock, postcard tune stamp, riddles only for deck items
        await pg.click('#cr');await pg.wait_for_timeout(2500)
        pl=await pg.evaluate("Music.playing");check(pl and pl.startswith('bg_twitchel_') and pl.endswith('_t1_loop'),f'cat new bond plays the T1 layer ({pl})')
        check(await pg.evaluate("!!window.MusicFX&&!!MusicFX.beat()"),'cat beat clock')
        st=await pg.evaluate("window.MusicFX?MusicFX.stampHTML('twitchel','grass'):''");check('pc_tune/twitchel_grass' in st,'cat postcard stamp '+st[:80])
        await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''")
        # games menu
        await pg.evaluate("__echo.state.bond=CONFIG.unlock.stack+5;__echo.state.bondShown=3;__echo.home()");await pg.wait_for_timeout(600);await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''")
        await pg.click('#play');await pg.wait_for_timeout(500)
        labels=await pg.evaluate("[...document.querySelectorAll('.choices button')].map(b=>b.textContent)")
        check(all(any(t in l for l in labels) for t in ('Cozy Pairs','Yarn Tumble','Meadow Dash','Snack Catch','Cushion Tower')),'cat games menu '+str(labels))
        await pg.screenshot(path=f'{OUT}/games-menu.png')
        c=pg.locator('.choices button',has_text='Yarn Tumble').first;await c.click();await c.click();await pg.wait_for_timeout(1500)
        if await pg.locator('.choices button').count():
          c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(1500)
        top=await pg.evaluate("(document.querySelector('.top b')||{}).textContent||''");cap=await pg.evaluate("(document.querySelector('.dgcap')||{}).textContent||''")
        check(top=='Yarn Tumble' and cap=='cozier' and (await pg.evaluate("__echo.state.gameCounts||{}")).get('dig')==1,f'Yarn Tumble opens: {top} / {cap}')
        await pg.screenshot(path=f'{OUT}/yarn-tumble.png');await pg.click('#quit');await pg.wait_for_timeout(2500)
        RES="(k=>performance.getEntriesByType('resource').some(e=>e.name.includes(k)))"
        for k in ('px/yarn/b_','music/game_yarn_tumble_loop','px/scenes/twitchel_clearing_'):check(await pg.evaluate(RES+f"('{k}')"),'loaded '+k)
        for title,shot,keys in (('Snack Catch','snack-catch',('twitchel_garden_day','catch/awning','game_snack_catch_loop')),('Cushion Tower','cushion-tower',('stack/cushion_','stack/rug_base','twitchel_meadow_day','game_cushion_tower_loop')),('Meadow Dash','meadow-dash',('run/garden_sky','run/garden_gnd','/twitchel_run0','game_meadow_dash_twitchel_loop'))):
          await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';CONFIG.sessionLimits.games=99;Object.assign(__echo.state,{bond:CONFIG.unlock.stack+5,bondShown:3,napUntil:0});Object.assign(__echo.state.needs,{food:80,play:20,rest:90,comfort:80});__echo.home()");await pg.wait_for_timeout(800);await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''");await pg.click('#play');await pg.wait_for_timeout(500)
          L=await pg.evaluate("[...document.querySelectorAll('.choices button')].map(b=>b.textContent)")
          if not any(title in l for l in L):check(False,f'{title} in menu {L} bond {await pg.evaluate("__echo.state.bond")}');continue
          c=pg.locator('.choices button',has_text=title).first;await c.click();await c.click();await pg.wait_for_timeout(1200)
          if await pg.locator('.choices button').count():
            c=pg.locator('.choices button').first;await c.click();await c.click()
          await pg.wait_for_timeout(2500);await pg.mouse.click(195,500);await pg.wait_for_timeout(800);await pg.screenshot(path=f'{OUT}/{shot}.png')
          for k in keys:check(await pg.evaluate(RES+f"('{k}')"),f'{title} loaded {k}')
          check(not await pg.evaluate(RES+"('/slyte_run')"),f'{title}: no fox runner frames')
          if await pg.locator('#quit').count():await pg.click('#quit')
          await pg.wait_for_timeout(2500)
        check(await pg.evaluate("[...document.querySelectorAll('*')].every(e=>!/px\\/scenes\\/(clearing|grove|meadow)_/.test(e.style&&e.style.backgroundImage||''))"),'no fox scene art on screen')
        await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''")
        # bond-up burst (1 -> 2)
        await pg.evaluate("Object.assign(__echo.state,{bond:130,bondShown:1});__echo.state.badges=__echo.state.badges.filter(x=>x!=='place');__echo.home()")
        got=set()
        for _ in range(400):
          f=await pg.evaluate("window.__bondup?__bondup.frame:-1")
          for w in (20,35,45):
            if w not in got and f>=w:got.add(w);await pg.screenshot(path=f'{OUT}/bondup-f{w}.png')
          if len(got)==3:break
          await pg.wait_for_timeout(25)
        check(len(got)==3 and await pg.evaluate("__echo.state.bondShown")==2,'cat bond-up burst played '+str(got))
        for _ in range(60):
          if not await pg.evaluate("!!document.querySelector('canvas.bondup')"):break
          await pg.mouse.click(200,300);await pg.wait_for_timeout(300)
        await pg.wait_for_timeout(1500)
        # basket home
        await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML='';const s=__echo.state;if(!s.badges.includes('place'))s.badges.push('place');__echo.home()");await pg.wait_for_timeout(1500)
        await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''")
        hb=await pg.evaluate("(()=>{const h=document.querySelector('#home');return h?h.querySelector('.hb').style.backgroundImage+' '+h.getAttribute('aria-label')+' w'+Math.round(h.querySelector('.hb').getBoundingClientRect().width):''})()")
        check('basket_back' in hb and 'cozy basket' in hb and int(hb.rsplit(' w',1)[1])>=72,'basket home '+hb[:160])
        await pg.screenshot(path=f'{OUT}/basket-home.png')
      if animal in ('cat','lion','snowleopard','cheetah'):await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('overlay').innerHTML=''");await pg.wait_for_timeout(300);await pg.screenshot(path=f'{OUT}/home-{animal}.png')
      await ctx.close()
    await b.close()
    check(not errs,'no page errors '+str(errs[:3]));check(not b404,'no 404s '+str(b404[:4]))
  print(f'{ok}/{ok+len(bad)} purrlings checks passed');sys.exit(1 if bad else 0)
asyncio.run(main())
