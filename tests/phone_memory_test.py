# Shiny Pairs + postcards phone playthrough (spec v0.3 §1, Echo_Postcards v0.5).
# Usage: python3 tests/phone_memory_test.py [base-url] [screenshot-dir]
import asyncio,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/';OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/memtest';os.makedirs(OUT,exist_ok=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
    pg=await b.new_page(**p.devices['iPhone 13']);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    shot=lambda n:pg.screenshot(path=f'{OUT}/{n}.png')
    async def pick(t):
      c=pg.locator('.choices button',has_text=t).first;await c.wait_for(timeout=40000);await c.click();await c.click()
    await pg.goto(URL);await pg.evaluate("window.__wiped=1;localStorage.clear();localStorage.setItem('echo-nosetup','1')");await pg.reload();await pg.wait_for_timeout(500)
    await pg.fill('#nick','Dani');await pg.click('#go');await pg.wait_for_timeout(300);await pg.click('#bush');await pg.wait_for_timeout(4500)
    c=pg.locator('.choices button').first;await c.click();await c.click();await pg.wait_for_timeout(3000)
    await pg.evaluate("CONFIG.ambientMin=999;CONFIG.ambientMax=999;document.getElementById('overlay').innerHTML=''")
    await pg.click('#play');await pg.wait_for_timeout(300);await shot('picker')
    labels=await pg.locator('.choices button').all_inner_texts();assert any('Shiny Pairs' in l for l in labels) and any('Den Dig' in l for l in labels) and not any('Shiny Search' in l for l in labels),labels
    await pick('Shiny Pairs');await pg.wait_for_timeout(600)
    g=await pg.evaluate("({n:__mem.cards.length,level:__mem.level})");assert g['level']=='easy' and g['n']==12,g   # first game ever is Easy
    # a miss (two different cards), shown, then turned back by the next tap
    a,bb=await pg.evaluate("(()=>{const c=__mem.cards;const a=0;const b=c.findIndex((x,j)=>j>0&&x.item!==c[0].item);return [a,b]})()")
    await pg.evaluate(f"__memTap({a})");await pg.wait_for_timeout(250);await pg.evaluate(f"__memTap({bb})");await pg.wait_for_timeout(300);await shot('memory-in-progress')
    assert await pg.evaluate("__mem.pending");await pg.wait_for_timeout(2300);assert not await pg.evaluate("__mem.pending"),'auto turn-back after 2 s'
    bond0=await pg.evaluate("__echo.state.bond")
    async def pair(i):
      j=await pg.evaluate(f"MemoryEngine.partner(__mem,{i})");await pg.evaluate(f"__memTap({i})");await pg.wait_for_timeout(150);await pg.evaluate(f"__memTap({j})");await pg.wait_for_timeout(350)
    await pair(0);await shot('memory-match')
    i=1
    while await pg.evaluate("__mem.pairs")<2:
      if not await pg.evaluate(f"__mem.cards[{i}].paired"):await pair(i)
      i+=1
    await pg.wait_for_timeout(200);await shot('memory-round-end');bond1=await pg.evaluate("__echo.state.bond")
    assert bond1>bond0,'round booked bond'
    for i in range(12):
      if not await pg.evaluate(f"__mem.cards[{i}].paired"):await pair(i)
    await pg.wait_for_timeout(500);await shot('memory-board-cleared')
    st=await pg.evaluate("({done:__mem.done,games:__echo.state.pairs.games,mem:__echo.state.memories.slice(-1)[0],sig:__echo.state.sigDay})");print('board',st)
    assert st['done'] and st['games']==1 and 'pairs' in st['mem']   # needs v2: signature-daily bond removed
    await pg.wait_for_timeout(3500)
    # handheld keys on a second board (standard after the first game)
    await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());__echo.memoryGame()");await pg.wait_for_timeout(400)
    assert await pg.evaluate("__mem.level")=='standard'
    await pg.keyboard.press('ArrowRight');await pg.keyboard.press('b');await pg.keyboard.press('a');assert await pg.evaluate("__mem.cards[__mem.cursor].up"),'A flips the card under the cursor'
    await pg.click('#quit');await pg.wait_for_timeout(500)
    # postcards v0.5: release, then each of the six days
    await pg.evaluate("""(()=>{window.__wiped=1;const S=__echo.state;S.gift='shiny trinket';S.released=Date.now()-1;S.checkins=__echo.buildCheckins();S.pcv=2;localStorage.setItem('echo-proto-v1',JSON.stringify(S))})()""")
    days=[1,3,7,14,30,60];texts=[]
    for k,d in enumerate(days):
      await pg.evaluate(f"""(()=>{{window.__wiped=1;const S=JSON.parse(localStorage.getItem('echo-proto-v1'));S.clockOffset=0;S.released=Date.now()-{d}*864e5-36e5;S.lastCheckinDate=null;S.checkins.forEach(c=>c.delivered=c.day<{d});localStorage.setItem('echo-proto-v1',JSON.stringify(S))}})()""")
      await pg.reload();await pg.wait_for_timeout(1200);await pg.click('#mail');await pg.wait_for_timeout(400);await shot(f'postcard-day{d}')
      t=await pg.inner_text('.pcwrap');texts.append(t);assert f'Day +{d}' in t and 'Dani' in t and '{' not in t,t
      await pg.click('.full button');await pg.wait_for_timeout(200)
    await pg.click('#book');await pg.wait_for_timeout(300);await pg.evaluate("document.querySelector('.book').scrollTop=99999");await pg.wait_for_timeout(200);await shot('memory-book-postcards')
    assert await pg.locator('.book .pcard').count()==6
    # migration: a v0.3 save (notes/signs, days up to 7 delivered) becomes six postcards with days <= 7 delivered
    await pg.evaluate("""(()=>{window.__wiped=1;const S=JSON.parse(localStorage.getItem('echo-proto-v1'));delete S.pcv;S.g.name='Pip';S.checkins=[{day:1,type:'postcard',text:'old',delivered:true},{day:3,type:'postcard',text:'old',delivered:true},{day:7,type:'note',text:'old',delivered:true},{day:14,type:'sign',text:'old',delivered:false},{day:90,type:'sign',text:'old',delivered:false}];S.released=Date.now()-8*864e5;S.lastCheckinDate=new Date().toDateString();localStorage.setItem('echo-proto-v1',JSON.stringify(S))})()""")
    await pg.reload();await pg.wait_for_timeout(1200)
    m=await pg.evaluate("({n:__echo.state.checkins.length,types:[...new Set(__echo.state.checkins.map(c=>c.type))],del:__echo.state.checkins.filter(c=>c.delivered).map(c=>c.day),pcv:__echo.state.pcv,old:__echo.state.checkins.some(c=>c.text==='old')})")
    sg=await pg.evaluate("(()=>{const S=__echo.state,re=/(—|,)\\s*(Slytes?|Whimbers?|Howlings?|Wingsongs?|S\\.|W\\.)\\s*$/;return {name:S.g.name,fam:S.checkins.filter(c=>re.test(c.text)).length,signed:S.checkins.filter(c=>/—/.test(c.text)).map(c=>c.text.split('— ').pop())}})()");print('signatures',sg);assert sg['fam']==0 and sg['name']=='Pip' and len(sg['signed'])>=4 and all(x in ('Pip','your friend, Pip') for x in sg['signed']),sg
    print('migrated',m);assert m['n']==6 and m['types']==['postcard'] and m['del']==[1,3,7] and m['pcv']==3 and not m['old']
    assert 'feelings' not in await pg.evaluate("Object.keys(__echo.state).join(',')")
    print('ERR',errs);assert not errs;await b.close();print('memory + postcards playthrough OK')
asyncio.run(main())
