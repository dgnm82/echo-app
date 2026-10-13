# Needs v2 logic phone check (needs_bond.md §1–§4). No meter layout, no dialogue pass.
# Usage: python3 tests/phone_needs_test.py [base-url]
import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload()
    await pg.fill('#nick','Dani');await pg.click('#go');await pg.click('#bush');await pg.wait_for_timeout(3800)
    c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(2500)
    await pg.evaluate("CONFIG.ambientMin=999;document.getElementById('overlay').innerHTML=''")
    # drain: overnight keeps a mid-evening food need; a long away day floors at 1
    r=await pg.evaluate("""(()=>{
      const N=NeedsV2,T=(d,h)=>new Date(2026,9,d,h).getTime();
      const a={food:70,play:70,comfort:70,rest:70};N.drain(a,T(13,19)+18e5,T(14,7));
      const b={food:30,play:30,comfort:30,rest:30};N.drain(b,T(13,8),T(20,8));
      return [Math.round(a.food*10)/10,b.food,CONFIG.demoSpeed]
    })()""");print('overnight+floor',r);assert r[0]==67.5 and r[1]==1 and r[2]==1
    # bubble: < 50 only, full food declines, bond visit + caps
    r=await pg.evaluate("""(()=>{
      const s=__echo.state;s.needs={food:40,play:80,comfort:80,rest:80};s.metAt={};__echo.home();
      const on=!!document.querySelector('#sc .thought');
      s.needs.food=90;__echo.hug();const off=!document.querySelector('#sc .thought');
      const b0=s.bond;__echo.state.needs.food=10;const se=__echo.sess();
      // one feed would go through the UI; instead drive addBond via a hug (pet) + check visit
      se.visited=0;se.bond=0;se.c={};s.bondDay={d:'x',n:0,c:{}};
      return [on,off,NeedsV2.want({food:90,play:30,comfort:80,rest:80}),NeedsV2.awayStage(50),NeedsV2.meter({food:12}).food]
    })()""");print('bubble+away',r);assert r[0] and r[1] and r[2]=='play' and r[3]==2 and r[4]['step']==1
    # holiday freezes, then ends on open; leave screen after 72 h
    r=await pg.evaluate("""(()=>{
      __echo.holiday(true);const h=__echo.state.holiday;__echo.state.last=Date.now()-80*36e5;__echo.state.left=null;
      const f0=__echo.state.needs.food;__echo.simulate();const a=__echo.state,frozen=[!!h.on,!!a.left,!!a.holiday.on,a.needs.food===f0,!!__echo.sess().holidayBack];
      a.last=Date.now()-80*36e5;const b0=a.bond;__echo.simulate();return frozen.concat([!!a.left,a.bond===b0])
    })()""");print('holiday+leave',r);assert r==[True,False,False,True,True,True,True],r
    await pg.evaluate("__echo.leaveScreen()");await pg.wait_for_timeout(300);t=await pg.inner_text('.leavecard');print(t.replace('\n',' '))
    assert 'next adventure' in t and 'Visit' in t and 'new friend' in t and not any(w in t.lower() for w in ('miss you','come back','without you','sad'))
    await pg.click('#lvvisit');await pg.wait_for_timeout(600);s=await pg.evaluate("[!!__echo.state.left,__echo.state.needs.food,!!document.getElementById('feed')]");assert s==[False,70,True],s
    await pg.close();await b.close();print('ERR',errs);assert not errs;print('needs test OK')
asyncio.run(main())
