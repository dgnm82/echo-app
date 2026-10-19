# Families cleanup: a dummy THIRD family (families.js rebuilt from the manifests + one stand-in manifest that borrows whimber's
# sprite, dialogue and art) plugs in: origin card, colours, arrival, home sprite, Play list and a Pairs board from its own deck.
# Usage: [base-url] [shot-dir]
import asyncio,sys,os,json,subprocess,tempfile,shutil
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/thirdfam';os.makedirs(OUT,exist_ok=True)
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..');tmp=tempfile.mkdtemp();fd=os.path.join(tmp,'families');shutil.copytree(os.path.join(R,'families'),fd)
m=json.load(open(os.path.join(fd,'whimber.json')))
m.update(id='testfam',label='Testling',plural='Testlings',default_name='Testy',kind='testkind',look_base='owl',look_default='owl',looks=['owl'],icon_fallback='bird',
  animals={'testcat':{'label':'Test cat','word':'test cat','member':'testcat','default_name':'Testy','look':'owl'}},animalOrder=['testcat'],words={'body':['gills'],'home':['reef']})
m['games']=dict(m['games'],token='testfam_token',memoryDeck=['moon','star','comet','feather','cloud','book','lantern','firefly','dewdrop','leaf_green'])
m['music']=dict(m['music'],goodbye={'testcat':'goodbye_owl'})
json.dump(m,open(os.path.join(fd,'testfam.json'),'w'));o=json.load(open(os.path.join(fd,'order.json')));o['order'].append('testfam');json.dump(o,open(os.path.join(fd,'order.json'),'w'))
out=os.path.join(tmp,'families.js');subprocess.check_call(['python3',os.path.join(R,'tools/build_families.py')],env=dict(os.environ,ECHO_FAMILIES_DIR=fd,ECHO_FAMILIES_OUT=out),stdout=subprocess.DEVNULL)
JS=open(out).read();chip=[c['word'] for c in m['colours'] if c['real']][0]
ok=0;bad=[]
def check(c,msg):
  global ok
  if c:ok+=1
  else:bad.append(msg);print('FAIL',msg)
async def T(pg,sel,ms=250):
  await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[];b404=[]
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
    await pg.route('**/families.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=JS))
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status>=400 and b404.append(r.url))
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600)
    check(await pg.evaluate("FAMILIES.order.join()")=='slyte,whimber,testfam','3-family FAMILIES served')
    await T(pg,'#obgo',400);await pg.evaluate("localStorage.setItem('echo-nosetup','1')")   # skip the first-meeting chat, go straight home
    for i in range(6):
      if await pg.locator('#obnm').count():break
      await T(pg,'.scene.ob',200)
    await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await T(pg,'.obagebtn >> nth=1')
    check(await pg.locator('.orcard[data-a=testcat]').count()==1,'the dummy animal card is in the picker')
    await pg.screenshot(path=f'{OUT}/picker.png')
    await T(pg,'.orcard[data-a=testcat]');await T(pg,'#ornext',300);await T(pg,f'.orchip[data-c={chip}]',900)
    check(await pg.locator('#orlf .px-echo').count()==1,'invite shows a stand-in sprite')
    await T(pg,'#orinv');await T(pg,'#orinv',3000)
    line=await pg.evaluate("(document.querySelector('.orfamline')||{}).textContent||''");check('Testling' in line,'family line uses the manifest label: '+line)
    await pg.screenshot(path=f'{OUT}/arrival.png')
    await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1500)
    for i in range(12):
      if await pg.locator('#cr .px-echo').count():break
      bt=pg.locator('.choices button')
      if await bt.count():
        try:await bt.first.click(timeout=1500)
        except Exception:pass
      await pg.wait_for_timeout(800)
    S=await pg.evaluate("({kind:__echo.state.kind,fam:__echo.state.origin&&__echo.state.origin.family,name:__echo.state.g.name,talents:__echo.state.talents})")
    check(S['kind']=='testkind' and S['fam']=='testfam','save holds the new kind/id: %s'%S)
    check(S['name']=='Testy','default name from the manifest: %s'%S['name'])
    bg=await pg.evaluate("(()=>{const e=document.querySelector('#cr .px-echo');return e?e.style.backgroundImage:''})()");check('px/whimber_' in bg,'home sprite borrows whimber art: '+bg)
    await pg.screenshot(path=f'{OUT}/home.png')
    await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML=''")
    await pg.wait_for_timeout(3000);await pg.evaluate("document.getElementById('overlay').innerHTML=''");await pg.click('#play');await pg.wait_for_timeout(400)
    labels=await pg.locator('.choices button').all_inner_texts();check(any('Moonlight Pairs' in l for l in labels),'Play list from the manifest titles: %s'%labels)
    c=pg.locator('.choices button',has_text='Moonlight Pairs').first;await c.click();await c.click();await pg.wait_for_timeout(800)
    items=await pg.evaluate("window.__mem?[...new Set(__mem.cards.map(c=>c.item))]:null");check(items and set(items)<=set(m['games']['memoryDeck']),'Pairs deck from the manifest: %s'%items)
    await pg.screenshot(path=f'{OUT}/pairs.png')
    check(not errs,'no page errors: %s'%errs[:3]);check(not b404,'no 404s: %s'%b404[:5])
    await b.close()
  shutil.rmtree(tmp,ignore_errors=True)
  print(f'{ok}/{ok+len(bad)} third-family checks passed');sys.exit(1 if bad else 0)
asyncio.run(main())
