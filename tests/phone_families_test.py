# Families v1: animal -> look sheets (home, events, fly), fox/owl unchanged, old saves, aria-labels, colour budget. Usage: [base-url] [shot-dir]
import asyncio,sys,os,json
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/famtest';os.makedirs(OUT,exist_ok=True)
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)
async def T(pg,sel,ms=250):
  await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def origin(b,p,animal,chip,errs,b404,fam=None):
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg)
  pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and b404.append(r.url))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600)
  await T(pg,'#obgo',400)
  for i in range(6):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await T(pg,'.obagebtn >> nth=1')
  await pick(pg,animal);await T(pg,'#ornext',300)
  if fam:await T(pg,f'.orfam[data-f={fam}]')
  await T(pg,f'.orchip[data-c={chip}]',900)
  inv=await pg.evaluate("(document.querySelector('#orlf .px-echo')||{}).outerHTML||''")
  await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1500)
  return pg,inv
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[];b404=[]
    CASES=[('dog','golden',None,'slyte','dog'),('wolf','grey',None,'slyte','wolf'),('fox','ginger',None,'slyte',None),
           ('bird','red',None,'whimber','wingsong'),('duck','green',None,'whimber','duck'),('owl','brown',None,'whimber',None),
           ('coyote','golden',None,'slyte','coyote'),('dove','grey',None,'whimber','dove'),('pigeon','grey',None,'whimber','pigeon'),('crow','black',None,'whimber','crow'),
           ('eagle','brown',None,'whimber','eagle'),('chicken','white',None,'whimber','chicken'),('gull','white',None,'whimber','gull'),
           ('cat','ginger',None,'twitchel',None),('lion','golden',None,'twitchel','lion'),('tiger','ginger',None,'twitchel','tiger'),('leopard','tan',None,'twitchel','leopard'),
           ('cheetah','golden',None,'twitchel','cheetah'),('snowleopard','white',None,'twitchel','snowleopard'),('lynx','brown',None,'twitchel','lynx')]   # Purrlings   # batch A2   # birds and canines only
    for animal,chip,fam,sp,look in CASES:
      pg,inv=await origin(b,p,animal,chip,errs,b404,fam)
      S=await pg.evaluate("window.__echo.state");pal=S['g']['pal'];fl=await pg.evaluate("PIXEL.variant(__echo.state.g.seed,'%s',__echo.state.g.pal).fluff"%sp)
      want=f"px/{sp}_{look+'_' if look else ''}{pal}_f{fl}.png"
      check(S['g'].get('look')==(look or {'slyte':'fox','whimber':'owl','twitchel':'cat'}[sp]),f'{animal} saves look {S["g"].get("look")}')
      check(want[:-4] in inv,f'{animal} invite sprite uses {want} (or its _light lightform)')
      el=await pg.evaluate("(()=>{const e=document.querySelector('#cr .px-echo');return e?[e.style.backgroundImage,e.getAttribute('aria-label')]:null})()")
      check(el and want in el[0],f'{animal} home sheet {el and el[0]}')
      check(el and el[1]==S['g']['name'],f'{animal} aria-label = Echo name {el and el[1]}')
      for suf in (['_ev','_fly'] if sp=='whimber' else ['_ev']):
        st=await pg.evaluate(f"fetch('{want.replace('.png',suf+'.png')}').then(r=>r.status)");check(st==200,f'{animal} {suf} sheet {st}')
      await pg.locator('#screen').screenshot(path=f'{OUT}/home_{animal}.png');await pg.context.close()
    # old save without g.look: today's sheet, no 404s
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg);pg.on('response',lambda r:r.status>=400 and b404.append(r.url))
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
    await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush');await pg.wait_for_timeout(4500)
    c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(1500)
    S=await pg.evaluate("window.__echo.state");bg=await pg.evaluate("document.querySelector('#cr .px-echo').style.backgroundImage")
    import re;check('look' not in S['g'] and re.search(r'px/slyte_(mint-teal|violet-rose|sunset-gold|rose-sapphire|teal-gold|sky-periwinkle)_f\d\.png',bg),'old save: today\'s sheet '+bg)
    # missing look sheet falls back to the family sheet
    n0=len(b404);await pg.evaluate("__echo.state.g.look='dog';__echo.state.g.pal='nope-pal'");await pg.evaluate("__echo.home()");await pg.wait_for_timeout(1200)
    bg=await pg.evaluate("document.querySelector('#cr .px-echo').style.backgroundImage");check('_dog_' not in bg,'missing look sheet falls back: '+bg)
    b404[n0:]=[u for u in b404[n0:] if '_dog_' not in u]   # the probe's expected 404
    await b.close()
    m=json.load(open(os.path.join(os.path.dirname(__file__),'..','px','looks_meta.json')))
    check(m['frames']>=1500 and m['max']<=16 and m['over16']==0 and m['black']==0,'look colour budget '+json.dumps({k:m[k] for k in ('frames','max','over16','black')}))
    check(not errs,'no page errors '+str(errs[:3]));check(not b404,'no 404s '+str(b404[:4]))
  print(f'{ok}/{ok+len(bad)} families checks passed');sys.exit(1 if bad else 0)
asyncio.run(main())
