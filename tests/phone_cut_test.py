# Nov 4 (ancient-19, Kai): full phrases vs the one phrase cut, at runtime on a phone (iPhone 13 profile). Deterministic, no gameplay.
# A = an Ancient Echo plays the whole approved phrase: EIB intro/replay + Memory Book (sbEchoNotes, EchoBack.playEcho) and the grow-up
#     last stage (MusicFX.growSong stage 5). B = the Catch hook is the 8 s phrase cut (cutAtPhrase), and the hum after a caught hook
#     (site 6) hums exactly that cut: same notes, its own length (no full-tune mute mid-game). Usage: python3 tests/phone_cut_test.py [URL]
import asyncio,sys,json
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
JS="""async()=>{await EchoBack.ready;const P=MusicFX._pure,out={a:[],catch:[]},k=t=>60000/t.echo.bpm/12,len=(t,n)=>n.reduce((a,x)=>a+x[2],0)*k(t);
  const realEcho=EchoBack.playEcho,realNote=EchoBack.playNote;
  for(const f of ['slyte','whimber','twitchel'])for(const t of EchoBack.ancientTunes(f)){const ms=realEcho(t.id);
    out.a.push({id:t.id,f,n:EchoBack.sbEchoNotes(t.echo).length,all:t.echo.n.length,ms,full:len(t,t.echo.n)})}
  await new Promise(r=>setTimeout(r,50));
  for(const f of ['slyte','whimber','twitchel']){const id=MusicFX.catchStart(f),t=EchoBack.sbById(id),c=P.cutAtPhrase(t,8000),hook=c.n.filter(x=>x[0]);
    const played=[],hums=[];EchoBack.playNote=(fam,s,o)=>{played.push(o&&o.midi)};EchoBack.playEcho=(i,cut)=>{const ms=realEcho(i,cut);hums.push({id:i,cut,ms});return ms};
    let r=null,steps=0;while(steps<200){r=MusicFX.catchHit(f);steps++;if(r&&r.done)break}
    await new Promise(r=>setTimeout(r,500));const h=hums[0]||{},hm=MusicFX.catchTune();
    out.catch.push({f,id,steps,hookLen:hook.length,cutTicks:c.ticks,by:c.by,hum:h.id,same:JSON.stringify(h.cut)===JSON.stringify(c.n),
      caught:JSON.stringify(played.slice(0,hook.length))===JSON.stringify(hook.map(x=>EchoBack.midiOfNote(f,x))),humMs:h.ms,cutMs:len(t,c.n),fullMs:len(t,t.echo.n),next:hm&&hm.id,humming:hm&&hm.humming});
    EchoBack.playNote=realNote;EchoBack.playEcho=realEcho}
  out.grow=['slyte','whimber','twitchel'].map(f=>{const t=MusicFX.growTune(f),g=MusicFX.growSong(f,5);return {f,id:t&&t.id,full:g&&g.full,ms:g&&g.ms,want:t&&len(t,t.echo.n)}});
  MusicFX.motifStop();return out}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.wait_for_timeout(800)
    o=await pg.evaluate(JS)
    check(len(o['a'])==19,f"19 Ancient Echoes ({len(o['a'])})")
    for a in o['a']:
      check(a['n']==a['all'] and a['ms']>=a['full']-1,f"A {a['id']}: the whole approved phrase ({a['n']}/{a['all']} notes, {a['ms']/1000:.2f} s >= {a['full']/1000:.2f} s)")
    for c in o['catch']:
      check(c['steps']==c['hookLen'] and c['caught'],f"B {c['f']} Catch {c['id']}: the hook is the phrase cut ({c['hookLen']} notes, cut at {c['cutTicks']} ticks, {c['by']})")
      check(c['hum']==c['id'] and c['same'],f"site 6 {c['f']}: the hum after the caught hook is that same cut")
      check(abs(c['humMs']-c['cutMs'])<=c['hookLen']*120 and c['humMs']<=8000+c['hookLen']*120,f"site 6 {c['f']}: hum {c['humMs']/1000:.2f} s = the cut's length ({c['cutMs']/1000:.2f} s; the whole tune is {c['fullMs']/1000:.2f} s)")
      check(c['next'] and c['next']!=c['id'],f"site 6 {c['f']}: then the next tune is ready ({c['next']})")
    for g in o['grow']:
      check(g['full'] and g['ms']>=g['want']-1,f"A grow-up last stage {g['f']} {g['id']}: the whole approved phrase ({(g['ms'] or 0)/1000:.2f} s >= {(g['want'] or 0)/1000:.2f} s)")
    check(not errs,'no page errors '+str(errs[:2]))
    await b.close()
  print('cut phone:',len(fails),'failed');sys.exit(1 if fails else 0)
asyncio.run(main())
