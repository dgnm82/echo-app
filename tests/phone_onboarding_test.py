# Onboarding v1 + Origin v2 phone v1 + grown-ups corner. Usage: [base-url] [shot-dir]
import asyncio,sys,os,json
from playwright.async_api import async_playwright
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam,to_family
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/obtest';os.makedirs(OUT,exist_ok=True)
ok=0;bad=[]
def check(c,m):
  global ok
  if c:ok+=1
  else:bad.append(m);print('FAIL',m)
async def shot(pg,n):
  await pg.locator('#screen').screenshot(path=f'{OUT}/{n}.png')
async def fresh(b,p,errs,reqs,route=None):
  ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();await nocam(pg)
  pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text));pg.on('request',lambda r:reqs.append(r.url))
  if route:await pg.route('**/families.js*',route)
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(700);return pg
async def T(pg,sel,ms=250):
  await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def run_to_seen(pg,name='Mia',sh=False):
  if sh:await shot(pg,'ob01_title_first')
  await T(pg,'#obgo',500)
  if sh:await pg.wait_for_timeout(4400);await shot(pg,'ob02_welcome_tagline')
  for i in range(6):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',300)
  if sh:await shot(pg,'ob03_name')
  if name:
    await pg.fill('#obnm',name);await T(pg,'#obnext')
    if sh:await shot(pg,'ob04_confirm')
    await T(pg,'#obyes')
  else:await T(pg,'#obskip')
  if sh:await shot(pg,'ob05_age')
  await T(pg,'.obagebtn >> nth=1')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    errs=[];reqs=[]
    pg=await fresh(b,p,errs,reqs)
    check(await pg.locator('.oblogo').get_attribute('alt')=='ECHO','logo')
    check('Every creature has a song to share' in (await pg.locator('.obtag').get_attribute('aria-label')),'tagline')
    await run_to_seen(pg,'Mia',True)
    S=await pg.evaluate("window.__echo.state")
    check(S['child']=='Mia' and S['vars'].get('child_named')==1 and S['ageBand']=='7-8' and S['setupDone']==0,'name+age saved '+json.dumps({k:S.get(k) for k in ['child','ageBand','setupDone']}))
    check(await pg.locator('.orfamcard').count()==3,'P1 is family-first: 3 family cards');hd=await pg.inner_text('.scene.ob .obpanel b');check(hd=='Pick Your Echo' and 'all count' not in await pg.inner_text('.scene.ob'),'A1 header '+hd)
    cards=[]
    for fam in ('slyte','whimber','twitchel'):
      await to_family(pg,fam);cards+=await pg.evaluate("[...document.querySelectorAll('.orcard[data-a]')].map(b=>b.dataset.a)");await T(pg,'#orback')
    check(len(cards)==20 and sorted(cards)==sorted(['dog','fox','wolf','coyote','owl','bird','duck','dove','pigeon','crow','eagle','chicken','gull','cat','lion','tiger','leopard','cheetah','snowleopard','lynx']),'20 animal cards: birds + canines + cats only '+str(cards))
    await shot(pg,'ob06_seen')
    await pick(pg,'dog');await T(pg,'#ornext')
    check(await pg.locator('.orchip').count()==10,'10 Howling chips')
    check(await pg.evaluate("[...document.querySelectorAll('.orchips')].map(x=>x.children.length).join()")=='6,4','6 real then 4 toy')
    check('Toy colours' in await pg.locator('.ortoy').inner_text(),'Toy colours label')
    await shot(pg,'ob07_colours')
    await T(pg,'.orchip[data-c=golden]',1200)
    check(await pg.locator('.orchip').count()==0,'one pick advances')
    await shot(pg,'ob08_invite')
    await pg.evaluate("window.__arrSeen=0;new MutationObserver(()=>{if(document.querySelector('canvas.notearrive'))__arrSeen=1}).observe(document.body,{childList:true,subtree:true})")
    await T(pg,'#orinv');await T(pg,'#orinv',3200)
    check(await pg.locator('#ornm').count()==1,'first Echo says yes')
    ar=await pg.evaluate("({seen:window.__arrSeen,st:window.__arrive,left:!!document.querySelector('canvas.notearrive'),vis:(document.querySelector('#orlf .px-echo')||{style:{}}).style.visibility,motes:document.querySelectorAll('.ormote').length,halo:getComputedStyle(document.querySelector('#orlf')).filter})")
    check(ar['seen']==1 and ar['st']==2 and not ar['left'] and ar['vis']!='hidden' and ar['motes']==0 and ar['halo'] in ('none',''),'C2 arrival forms from notes (no light motes/halo) '+str(ar))
    t=await pg.locator('.orfamline').inner_text();check(t=="I'm a Howling! I'm the Echo of a dog, wild and tame!" and await pg.locator('.orfamline.obbub').count()==1,'ui_or_family '+t)
    t=await pg.locator('.scene.ob').inner_text();check('Slyte' not in t and 'Whimber' not in t,'no old family word in origin UI')
    await shot(pg,'ob09_yes')
    await T(pg,'#ornm',400)
    check(await pg.locator('.ornm').count()==6,'6 names')
    keep=await pg.locator('#orkeep').inner_text();check(keep=='Just "Thrumble"','dog default name: '+keep)
    await shot(pg,'ob10_naming')
    n=await pg.locator('.ornm').first.get_attribute('data-n');await T(pg,'.ornm >> nth=0');await T(pg,'.ornm >> nth=0',1500)
    S=await pg.evaluate("window.__echo.state")
    check(S['kind']=='fox' and S['g']['name']==n and S['g']['pal']=='sunset-gold-solid' and S['setupDone']==1,'echo made '+json.dumps([S.get('kind'),S['g'].get('name'),S['g'].get('pal')]))
    check(S['origin']['animal']=='dog' and S['origin']['src']=='chips' and S['origin']['ramp']=='sunset-gold-solid' and S['origin']['accent'] is None and not S['origin']['declined'] and S['vars']['origin_animal']=='dog','origin saved')
    check(await pg.locator('#feed').count()==1,'home after naming')
    check(await pg.evaluate("document.querySelector('.top b').textContent")==n,'top bar shows given name')
    sheet=await pg.evaluate("(document.querySelector('#cr .px-echo')||{}).outerHTML||''");check('sunset-gold-solid' in sheet,'sprite uses chip colour')
    await shot(pg,'ob11_named_home')
    raw=await pg.evaluate("localStorage.getItem('echo-proto-v1')");check('data:image' not in raw and 'photo' not in raw,'no photo data in save')
    # returning title + name call
    await pg.evaluate("window.__echo.state.last=Date.now()-60*60e3;localStorage.setItem('echo-proto-v1',JSON.stringify(window.__echo.state))");await pg.reload();await pg.wait_for_timeout(900)
    check(await pg.locator('.obreturn').count()==1,'every-session title');hint=await pg.locator('.obreturn .obpanel').inner_text();check(n in hint and 'playing nearby' in hint,'title hint '+hint)
    await shot(pg,'ob12_title_returning')
    await pg.wait_for_timeout(3300);check(await pg.locator('#feed').count()==1,'auto-advance 3 s')
    # grown-ups corner: hold 3 s
    await pg.reload();await pg.wait_for_timeout(800)
    lk=pg.locator('#oblock');bb=await lk.bounding_box();await pg.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2);await pg.mouse.down();await pg.wait_for_timeout(1200);await pg.mouse.up();await pg.wait_for_timeout(200)
    check(await pg.locator('.pcgate').count()==0,'short hold does not open')
    await pg.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2);await pg.mouse.down();await pg.wait_for_timeout(1500);await shot(pg,'ob13_gate_hold');await pg.wait_for_timeout(1700);await pg.mouse.up();await pg.wait_for_timeout(300)
    check(await pg.locator('.pcgate').count()==1,'3 s hold opens gate')
    a,bq=await pg.evaluate("[+document.querySelector('.pcgate').dataset.a,+document.querySelector('.pcgate').dataset.b]")
    check(6<=a<=9 and 13<=bq<=29 and bq%5,'question range')
    for ch in str(a*bq):await T(pg,f'.pck[data-k="{ch}"]',60)
    await shot(pg,'ob14_gate_question');await T(pg,'.pck[data-k="✓"]',300)
    check(await pg.locator('.pcset').count()==1,'settings open')
    await shot(pg,'ob15_grownups_corner')
    await T(pg,'#pcyes');check((await pg.evaluate("window.__echo.state.alwaysYes"))==True,'always-yes toggle')
    await T(pg,'#pcstay');check(await pg.evaluate("window.__echo.state.fw.paused")==True,'stay a while moved here')
    await T(pg,'#pcvoice');check(await pg.evaluate("window.__echo.state.voice")==False,'chirp toggle')
    await T(pg,'.pcagebtn[data-band="9-10"]');check(await pg.evaluate("window.__echo.state.ageBand")=='9-10','age range: 3 direct choices (Batch G)')
    await T(pg,'#pcname');await pg.fill('#pcnm','Ma7');await T(pg,'#pcnok');check(await pg.locator('#pcnm').input_value()=='','digits rejected')
    await pg.fill('#pcnm','Ana');await T(pg,'#pcnok');S=await pg.evaluate("window.__echo.state");check(S['child']=='Ana' and S['nameChanged']==1,'rename child')
    await T(pg,'#pcecho');await pg.fill('#pcen','B0b');await T(pg,'#pceok');check(await pg.locator('#pcen').input_value()=='','echo rename filter')
    await pg.fill('#pcen','Bramble');await T(pg,'#pceok');check(await pg.evaluate("window.__echo.state.g.name")=='Bramble','echo rename')
    await T(pg,'#pcdone',400);check(await pg.evaluate("document.querySelector('.top b').textContent")=='Bramble','rename on Home')
    check(await pg.locator('.pcset').count()==0,'back to play')
    await pg.evaluate("window.__echo.state.last=Date.now()-60*60e3;localStorage.setItem('echo-proto-v1',JSON.stringify(window.__echo.state))");await pg.reload();await pg.wait_for_timeout(900)
    check('Bramble is playing nearby' in await pg.locator('.obreturn .obpanel').inner_text(),'rename on title')
    bb=await pg.locator('#oblock').bounding_box();await pg.mouse.move(bb['x']+5,bb['y']+5);await pg.mouse.down();await pg.wait_for_timeout(3200);await pg.mouse.up();await pg.wait_for_timeout(200)
    a,bq=await pg.evaluate("[+document.querySelector('.pcgate').dataset.a,+document.querySelector('.pcgate').dataset.b]")
    for ch in str(a*bq):await T(pg,f'.pck[data-k="{ch}"]',60)
    await T(pg,'.pck[data-k="✓"]',300);check(await pg.evaluate("window.__echo.state.alwaysYes")==True,'always-yes survives reload')
    await T(pg,'#pcreset');await shot(pg,'ob16_start_over')
    hb=await pg.locator('#pchold').bounding_box();await pg.mouse.move(hb['x']+5,hb['y']+5);await pg.mouse.down();await pg.wait_for_timeout(1000);await pg.mouse.up();await pg.wait_for_timeout(300)
    check(await pg.evaluate("!!localStorage.getItem('echo-proto-v1')"),'short hold does not erase')
    await pg.mouse.move(hb['x']+5,hb['y']+5);await pg.mouse.down();await pg.wait_for_timeout(3300);await pg.mouse.up();await pg.wait_for_timeout(2600)
    check(await pg.evaluate("!localStorage.getItem('echo-proto-v1')") and await pg.locator('.oblogo').count()==1,'start over erases all (incl. alwaysYes) -> first-run title')
    # wrong answers -> cooldown
    pg2=await fresh(b,p,errs,reqs);lk=pg2.locator('#oblock');bb=await lk.bounding_box()
    await pg2.mouse.move(bb['x']+5,bb['y']+5);await pg2.mouse.down();await pg2.wait_for_timeout(3200);await pg2.mouse.up();await pg2.wait_for_timeout(200)
    for i in range(3):await T(pg2,'.pck[data-k="1"]',30);await T(pg2,'.pck[data-k="✓"]',100)
    check('grown-ups' in (await pg2.locator('.pcgate').inner_text()),'3 wrong -> cooldown copy')
    # decline: never on first; on a later origin the hash may decline once, then next invite always yes
    res=await pg2.evaluate("""(()=>{const E=window.__echo,S=E.state;const r={first:0,dbl:0,ay:0,n:0,dec:0};
      for(let s=1;s<=4000;s++){const st={oseed:s,origin:{idx:0,attempt:0,declined:false,src:'chips'}};E.setState(st);if(E.orDeclines())r.first++;
        st.origin={idx:1+(s%3),attempt:0,declined:false,src:'chips'};r.n++;if(E.orDeclines()){r.dec++;st.origin.declined=true;st.origin.attempt=1;if(E.orDeclines())r.dbl++}
        st.origin={idx:2,attempt:0,declined:false,src:'chips'};st.alwaysYes=true;if(E.orDeclines())r.ay++}
      return r})()""")
    rate=res['dec']/res['n'];check(res['first']==0 and res['dbl']==0 and res['ay']==0 and .09<rate<.15,'decline rules '+json.dumps(res)+f' rate {rate:.3f}')
    # decline screen (forced), then Find a friend -> P1 at once, next yes
    pg3=await fresh(b,p,errs,reqs);await run_to_seen(pg3,None)
    check(await pg3.evaluate("window.__echo.state.child")=='friend','skip name')
    await pg3.evaluate("window.__echo.state.originIdx=1;window.__echo.state.origin=null")
    s=await pg3.evaluate("(()=>{for(let s=1;s<9999;s++){if(window.__echo.hash(s+'|1|0')<.12)return s}})()");await pg3.evaluate(f"window.__echo.state.oseed={s}")
    await pick(pg3,'owl');await T(pg3,'#ornext');await T(pg3,'#orunsure',1000);await T(pg3,'#orinv');await T(pg3,'#orinv',1600)
    check(await pg3.locator('#orff').count()==1,'not today shows Find a friend')
    txt=await pg3.locator('.scene.ob').inner_text();check('Song heard' in txt,'song stamp')
    check(await pg3.evaluate("JSON.parse(localStorage.getItem('echo-proto-v1')).origin.declined")==True,'declined saved at once')
    check(await pg3.locator('.scene.ob .obpanel').count()==0,'decline: one bubble, no UI box')
    await shot(pg3,'ob17_not_today')
    await T(pg3,'#orff');check(await pg3.locator('.orfamcard').count()==3,'Find a friend -> P1 (family step)')
    await pg3.reload();await pg3.wait_for_timeout(900);check(await pg3.locator('.orfamcard').count()==3,'reopen mid-origin -> P1 (family step)')
    await pick(pg3,'owl');await T(pg3,'#ornext');await T(pg3,'#orunsure',1000);await T(pg3,'#orinv');await T(pg3,'#orinv',3000)
    check(await pg3.locator('#ornm').count()==1,'next invite after a decline says yes')
    # data-only rename (Wingsong via the duck card; no borrowed colours any more)
    async def rename(route):
      r=await route.fetch();t=(await r.text()).replace('"label": "Howling"','"label": "Barklet"').replace('"label": "Wingsong"','"label": "Skylark"')
      await route.fulfill(response=r,body=t)
    pg4=await fresh(b,p,errs,reqs,rename);await run_to_seen(pg4,'Leo')
    await pick(pg4,'duck');await T(pg4,'#ornext',400)
    check(await pg4.locator('.orborrow,.orfam').count()==0,'no borrow screen');check(await pg4.locator('.orchip').count()==11,'Wingsong 11 chips (white+grey share dove-mist)');await T(pg4,'.orchip[data-c=green]',1000)
    await T(pg4,'#orinv');await T(pg4,'#orinv',3000);await T(pg4,'#ornm',400)
    check(await pg4.locator('#orkeep').inner_text()=='Just "Quackaby"','duck default name');await T(pg4,'#orkeep');await T(pg4,'#orkeep',1500)
    S=await pg4.evaluate("window.__echo.state");check(S['g']['name']=='Quackaby' and S['g']['family']=='Skylark' and S['origin']['src']=='chips' and S['origin']['animal']=='duck' and S['g']['pal']=='mint-aurora-solid' and S['kind']=='owl','renamed Wingsong origin '+json.dumps([S['g'].get('name'),S['g'].get('pal'),S['g'].get('family'),S['origin'],S['kind']]))
    check(await pg4.evaluate("CREATURES.owl.name")=='Skylark','config family label from data')
    ctx4=pg4.context;await pg4.close()   # old save from a cat / bunny / other pick (edited before the app loads, so no save on unload can overwrite it)
    pg5=await ctx4.new_page();await pg5.add_init_script("(()=>{if(sessionStorage.getItem('mig'))return;sessionStorage.setItem('mig','1');const k='echo-proto-v1',s=JSON.parse(localStorage.getItem(k));s.origin.animal='bunny';s.origin.src='borrowed';s.vars.origin_animal='bunny';s.songs=['bunny','owl'];localStorage.setItem(k,JSON.stringify(s))})()")
    await pg5.goto(URL);await pg5.wait_for_timeout(1500)
    m=await pg5.evaluate("(()=>{const s=__echo.state;return [s.origin.animal,s.origin.src,s.vars.origin_animal,s.songs]})()");check(m==['owl','chips','owl',['owl']],'old bunny save migrates to owl '+str(m))
    pg4=pg5
    chk=await pg4.evaluate("(()=>{const F=FAMILIES,m=[];for(const f of F.order){const L=PIXEL.pals(F[f].sprite);for(const c of F[f].chips)if(!L.includes(c.ramp))m.push(c.ramp)}return m})()")
    check(not chk,'every chip colour in the family palette '+str(chk))
    # privacy: only same-origin requests
    from urllib.parse import urlparse
    host=urlparse(URL).netloc;ext=[u for u in reqs if urlparse(u).netloc not in (host,'') and not u.startswith('data:')]
    check(not ext,'no off-site requests '+str(ext[:3]))
    check(not errs,'no page errors '+str(errs[:3]))
    await b.close()
  print(f'{ok}/{ok+len(bad)} onboarding checks passed');sys.exit(1 if bad else 0)
asyncio.run(main())
