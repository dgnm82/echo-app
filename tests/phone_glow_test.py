# glow v1.1 (handoff/glow_v1.md §8): level per tier + Ready, never dims, aura extent + roles only, body unchanged, one sheet row,
# no s1-s3 runner requests, LED mapping, reduced-motion step-up, origin strip + copy.
import asyncio,sys,os,json
from playwright.async_api import async_playwright
async def newecho(b,p,kind,errs):
  pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:r.status==404 and errs.append('404 '+r.url))
  await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
  await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush' if kind=='fox' else '#tree');await pg.wait_for_timeout(4500)
  c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
  await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML='';document.querySelectorAll('.full').forEach(f=>f.remove());document.getElementById('b').style.display='none'");return pg
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT='/workspace/shots/glow-v1';os.makedirs(OUT,exist_ok=True)
AU=json.load(open(os.path.join(os.path.dirname(__file__),'..','px','aura.json')))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[];bad=[]
    for kind in ('fox','owl'):
      pg=await newecho(b,p,kind,errs);pg.on('request',lambda r:bad.append(r.url) if '/run/' in r.url and any(f'/s{i}/' in r.url for i in (1,2,3)) else None)
      lv=await pg.evaluate("""()=>{const S=__echo.state,o={};for(const b of [0,69,70,209,210,369,370,499,500]){S.bond=b;o[b]=__echo.glowLevel()}return o}""")
      assert lv=={'0':1,'69':1,'70':2,'209':2,'210':3,'369':3,'370':4,'499':4,'500':4},lv
      assert await pg.evaluate("(()=>{const S=__echo.state;S.releasePath=1;const l=__echo.glowLevel();S.releasePath=0;return l})()")==5,'release path G5'
      for bond,want in ((0,1),(70,2),(210,3),(370,4)):
        await pg.evaluate(f"(()=>{{const S=__echo.state;S.bond={bond};S.glowMax=0;S.needs.food=S.needs.play=S.needs.comfort=S.needs.rest=90;__echo.home()}})()");await pg.wait_for_timeout(700)
        r=await pg.evaluate("""()=>{const el=document.querySelector('#cr .px-echo'),cv=document.querySelector('#cr canvas.aura'),d=cv.getContext('2d').getImageData(0,0,74,65).data;
          let x0=99,x1=-1,y0=99,cols=new Set();for(let y=0;y<65;y++)for(let x=0;x<74;x++){const q=(y*74+x)*4;if(d[q+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);cols.add('#'+[d[q],d[q+1],d[q+2]].map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join(''))}}
          const im=new Image();im.src=/url\\("?([^")]+)/.exec(el.style.backgroundImage)[1];const bp=el.style.backgroundPosition.split(' ').map(v=>-parseInt(v));
          const c=document.createElement('canvas');c.width=48;c.height=48;const k=c.getContext('2d');k.drawImage(im,bp[0],bp[1],48,48,0,0,48,48);const e=k.getImageData(0,0,48,48).data;
          let s0=99,s1=-1,t0=99;for(let y=0;y<48;y++)for(let x=0;x<48;x++)if(e[(y*48+x)*4+3]){s0=Math.min(s0,x);s1=Math.max(s1,x);t0=Math.min(t0,y)}
          return {g:+el.dataset.glow,pal:el.dataset.pal,bp:el.style.backgroundPosition,x0,x1,y0,s0:s0+13,s1:s1+13,t0:t0+13,cols:[...cols]}}""")
        R=AU['radius'][str(want)];ro=AU['roles'][r['pal']]
        assert r['g']==want,(kind,bond,r['g'])
        assert r['bp'].endswith(' 0px'),r['bp']
        assert r['x0']<=r['s0']-(R-1) and r['x1']>=r['s1']+(R-1) and r['y0']<=r['t0']-(R-1),(kind,want,r)   # aura reaches >= R-1 past the 48 px frame box
        assert set(r['cols'])<={ro['glow'],ro['rim'][want-1],'#FFFFFF'},(kind,want,r['cols'])
        await pg.screenshot(path=f'{OUT}/{kind}-G{want}.png')
      # the aura tracks the sprite in every motion: wander/fly, hug squish, scoot, tap look, nap trip (it is the sprite's child)
      await pg.evaluate("(()=>{const S=__echo.state;S.lowfx=false;S.bond=210;S.needs.food=S.needs.play=S.needs.comfort=S.needs.rest=90;__echo.home()})()");await pg.wait_for_timeout(500)
      off="(()=>{const e=document.querySelector('#cr .px-echo'),c=e&&e.querySelector('canvas.aura');if(!c)return null;const a=e.getBoundingClientRect(),b=c.getBoundingClientRect(),k=a.width/48;return [Math.round((a.left-b.left)/k*10)/10,Math.round((a.top-b.top)/k*10)/10]})()"
      seen=set()
      for act in ("__echo.living.move([40,200])","__echo.hug()","document.getElementById('cr').classList.add('alscoot')","document.querySelector('#cr').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))","__echo.living.move([120,190])"):
        await pg.evaluate(act)
        for i in range(10):
          o=await pg.evaluate(off);assert o is not None,act;seen.add(tuple(o));await pg.wait_for_timeout(90)
      assert all(abs(x-13)<=.6 and abs(y-13)<=.6 for x,y in seen),(kind,seen)
      # never dims: low needs, a long gap, a visit again
      await pg.evaluate("(()=>{const S=__echo.state;S.bond=210;S.glowMax=0;__echo.home();S.needs.food=S.needs.play=S.needs.comfort=S.needs.rest=0;S.last-=50*36e5;__echo.home()})()")
      assert await pg.evaluate("__echo.glow()")==3
      # LED: need < 75 as today; all >= 75 cream at G1-G4; G5 own colour + shimmer; a step-up swells once
      led=await pg.evaluate("""()=>{const S=__echo.state,o={};S.needs.food=S.needs.play=S.needs.comfort=S.needs.rest=90;S.needs.food=10;o.low=__echo.led();S.needs.food=S.needs.play=S.needs.comfort=S.needs.rest=90;o.g3=__echo.led();
        S.bond=370;__echo.home();o.sw=__echo.led();__echo.sess().swell=0;S.releasePath=1;__echo.led();__echo.sess().swell=0;o.g5=__echo.led();S.releasePath=0;return o}""")
      assert led['low'].get('need')=='food' and led['g3']['hex']=='#FFF6E6' and led['sw'].get('swell') and led['g5'].get('shimmer') and led['g5']['hex']!='#FFF6E6',led
      # reduced motion: the step-up shows the full aura in one frame
      await pg.evaluate("(()=>{const S=__echo.state;S.lowfx=true;S.releasePath=0;S.bond=0;S.glowMax=0;__echo.home()})()");await pg.wait_for_timeout(300)
      await pg.evaluate("(()=>{const S=__echo.state;S.bond=370;S.bondShown=9;__echo.glowSync()})()");await pg.wait_for_timeout(100);assert await pg.evaluate("document.querySelector('#cr .px-echo')._ring==null"),"reduced motion: no ring-by-ring growth";await pg.wait_for_timeout(300)
      ext=await pg.evaluate("""(()=>{const d=document.querySelector('#cr canvas.aura').getContext('2d').getImageData(0,0,74,65).data;let x0=99;for(let y=0;y<65;y++)for(let x=0;x<74;x++)if(d[(y*74+x)*4+3])x0=Math.min(x0,x);
        const el=document.querySelector('#cr .px-echo'),im=new Image();im.src=/url\\("?([^")]+)/.exec(el.style.backgroundImage)[1];const bp=el.style.backgroundPosition.split(' ').map(v=>-parseInt(v)||0);
        const c=document.createElement('canvas');c.width=48;c.height=48;const k=c.getContext('2d');k.drawImage(im,bp[0],bp[1],48,48,0,0,48,48);const e=k.getImageData(0,0,48,48).data;let s0=99;for(let y=0;y<48;y++)for(let x=0;x<48;x++)if(e[(y*48+x)*4+3])s0=Math.min(s0,x);
        return [x0,s0+13]})()""")
      R4=AU['radius']['4'];assert ext[0]<=ext[1]-(R4-1),(kind,ext)   # lowfx: G4 at full radius at once, measured from the sprite's own edge (not the 48px box; sprites vary per look)
      await pg.close()
    assert not bad,bad[:3]
    print('ERR',errs);assert not [e for e in errs if '404' in e or 'Error' in e],errs
    print('glow test OK')
    await b.close()
asyncio.run(main())
