# Oct 14 fixes: (3) speech bubble never covers the Echo at any perch; (6) a tap outside any open choice list closes it and does nothing else
import asyncio,json
from playwright.async_api import async_playwright
URL='http://localhost:8765/'
async def setup(b,p,kind):
  pg=await b.new_page(**p.devices['iPhone 13']);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2500)
  await pg.evaluate("document.getElementById('overlay').innerHTML='';const S=__echo.state;S.bond=400;S.bondShown=5;S.needs.food=20;S.napUntil=0;CONFIG.ambientMin=999;CONFIG.ambientMax=999;__echo.home()");await pg.wait_for_timeout(1200)
  await pg.evaluate("document.getElementById('b').style.display='none'");return pg,errs
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);E=[]
    for kind in ('owl','fox'):
      pg,errs=await setup(b,p,kind);E+=errs
      # (3) every waypoint of every scene of this family
      wps=await pg.evaluate("(()=>{const sc=SCENES[__echo.state.kind==='fox'?'slyte':'whimber'];return sc.map(s=>({id:s.id,wp:s.wp.filter(w=>!/exit/.test(w.kind)).map(w=>[w.id,w.xy])}))})()")
      home=wps[0]
      for wid,xy in home['wp']:
        r=await pg.evaluate(f"""(()=>{{__echo.lvPlace({xy[0]},{xy[1]}-57);__echo.talk('Hello! This is a longer line so the bubble is two or three rows tall.',4000);
          const q=e=>e.getBoundingClientRect(),a=q(document.getElementById('b')),c=q(document.querySelector('#cr .px-echo'));
          return {{hit:!(a.right<=c.left||a.left>=c.right||a.bottom<=c.top||a.top>=c.bottom),b:[a.left|0,a.top|0,a.right|0,a.bottom|0],c:[c.left|0,c.top|0,c.right|0,c.bottom|0],inview:a.top>=0&&a.bottom<=innerHeight}}}})()""")
        assert not r['hit'] and r['inview'],(kind,wid,r)
      print(kind,'bubble clear of the Echo at',len(home['wp']),'perches')
      await pg.evaluate("document.getElementById('b').style.display='none';__echo.home()");await pg.wait_for_timeout(800)
      # (6) play / feed / hug menus: an outside tap closes it and is not a scene tap
      for btn in ('#play','#feed','#comfort'):
        await pg.click(btn);await pg.wait_for_timeout(300);assert await pg.locator('#overlay .choices').count()==1,btn
        n0=await pg.evaluate("Alive.log.length");sc=await pg.evaluate("(()=>{const r=document.getElementById('sc').getBoundingClientRect();return [r.x+r.width*.15,r.y+r.height*.3]})()")
        await pg.mouse.click(sc[0],sc[1]);await pg.wait_for_timeout(400)
        assert await pg.locator('#overlay .choices').count()==0,(btn,'closed')
        assert await pg.evaluate("Alive.log.length")==n0,(btn,'outside tap was also a scene tap')
        assert await pg.evaluate("document.getElementById('b').style.display")=='none',(btn,'no tap reaction line')
      # a tap ON the list still works (does not dismiss)
      await pg.click('#play');await pg.wait_for_timeout(300);await pg.locator('#overlay .choices button').first.click();await pg.wait_for_timeout(200);assert await pg.locator('#overlay .choices').count()==1,'tap inside keeps it open'
      await pg.mouse.click(10,200);await pg.wait_for_timeout(300)
      # conversation choices: tapping away = nobody answered -> carry-on line now, the talk goes on to its end
      cid='whimber_puddle_talk' if kind=='owl' else 'slyte_puddle_talk'
      await pg.evaluate(f"window.__said=[];window.__d=0;new MutationObserver(()=>{{const b=document.getElementById('b');if(b&&b.style.display!=='none'&&__said[__said.length-1]!==b.textContent)__said.push(b.textContent)}}).observe(document.body,{{subtree:true,childList:true,characterData:true,attributes:true}});Dialogue.cfg.lostThoughtChance=0;Dialogue.cfg.driftChances=[0,0,0];const c=Dialogue.lib.conversations.find(c=>c.trigger!=='x'&&c.nodes&&Object.values(c.nodes).some(n=>n.choices));__echo.runConv(Dialogue.lib.conversations.find(x=>x.id==='{cid}')?'{cid}':c.id,()=>window.__d=1)")
      await pg.wait_for_selector('#overlay .choices',timeout=8000);await pg.wait_for_timeout(300)
      await pg.mouse.click(20,250);await pg.wait_for_timeout(300);assert await pg.locator('#overlay .choices').count()==0,'conv choices closed'
      carry=await pg.evaluate("Dialogue.lib.barks.carry_on.map(l=>l.text)") if await pg.evaluate("!!(Dialogue.lib.barks&&Dialogue.lib.barks.carry_on)") else None
      for _ in range(60):
        if await pg.evaluate("window.__d===1"):break
        if await pg.locator('#overlay .choices').count():await pg.mouse.click(20,250)
        await pg.wait_for_timeout(500)
      said=await pg.evaluate("__said");print(kind,'conv after tap-away:',said[:4])
      assert await pg.evaluate("window.__d===1"),'conversation finished after tap-away'
      await pg.close()
    print('ERR',E);assert not E;await b.close();print('ui fixes test OK')
asyncio.run(main())
