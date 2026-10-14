# home_log_hollow v1: nap end beat (inside, tail, Zzz, glow), masks recoloured (no raw key colours), clear of corner glows/dock, sleep sheet
import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    for kind in ('fox','owl'):
      pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status==404 and errs.append('404 '+r.url))
      await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
      await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
      c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
      await pg.evaluate("document.getElementById('overlay').innerHTML='';const S=__echo.state;S.napUntil=Date.now()+600000;S.bond=400;__echo.home()");await pg.wait_for_timeout(300)
      await pg.evaluate("__echo.homeIn()");await pg.wait_for_timeout(2500)
      r=await pg.evaluate("""()=>{const h=document.getElementById('home'),keys=new Set(['0,255,255','255,0,255','255,255,0','0,255,0']);let raw=0,px=0;
        h.querySelectorAll('canvas.hgl').forEach(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=4)if(d[i+3]){px++;if(keys.has(d[i]+','+d[i+1]+','+d[i+2]))raw++}});
        const hr=h.querySelector('.hb').getBoundingClientRect(),k=hr.width/(h.querySelector('.hb').offsetWidth||1),hit=(q)=>{const a=q.getBoundingClientRect();return !(hr.right+4*k<=a.left||hr.left-4*k>=a.right||hr.bottom+4*k<=a.top||hr.top-4*k>=a.bottom)};
        return {in:h.classList.contains('in'),glow:h.classList.contains('glow'),tail:!!h.querySelector('.htail.on'),hid:document.getElementById('cr').style.visibility,raw,px,
          over:[...document.querySelectorAll('#sc .mt-comfort,#sc .mt-rest,.dock')].filter(hit).map(e=>e.className)}}""")
      print(kind,r);assert r['in'] and r['glow'] and r['tail'] and r['hid']=='hidden' and r['px']>0 and r['raw']==0,r
      assert not r['over'],r['over']
      await pg.evaluate("__echo.homeTap()");await pg.wait_for_timeout(300)
      sl=await pg.evaluate("(()=>{const e=document.querySelector('#cr .px-echo');return e.style.backgroundImage})()");assert '_sleep.png' in sl,sl
      await pg.close()
    print('ERR',errs);assert not errs;await b.close();print('home test OK')
asyncio.run(main())
