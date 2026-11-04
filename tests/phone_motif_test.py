# Nov 4: the family motif at runtime on a phone (iPhone 13 profile): the 3 jingle pre-rolls and the grow-up sting get the motif first,
# other sfx don't; the hum gesture rotates the hum shapes; Wingsongs is silent in the farewell / release / playoff contexts and
# Purrlings right after the warm-up yay. Deterministic (stubbed sfx, no gameplay; a stand-in #cr .px-echo for the hum gesture before onboarding). Usage: python3 tests/phone_motif_test.py [URL]
import asyncio,sys,json
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
JS="""async()=>{await EchoBack.ready;for(let i=0;i<60&&!(MusicFX.motifCtx&&(await fetch('music/motif.json').then(r=>r.ok)));i++)await new Promise(r=>setTimeout(r,50));
  MusicFX.setMotif(await fetch('music/motif.json').then(r=>r.json()));const out={};const L=()=>MusicFX.motifLog.length;
  const run=(f,name)=>{let at=-1;const t0=performance.now(),n0=L();const d=MusicFX.preroll(f,name,{},()=>{at=performance.now()-t0});return {d,logged:L()-n0,sync:at>=0,last:MusicFX.motifLog[L()-1]}};
  const keep=MusicFX.ctx;MusicFX.ctx=Object.assign({},keep,{farewell:()=>false,release:()=>false});Warmup.yayUntil=-1e9;
  for(const f of ['slyte','whimber','twitchel']){out[f]={};for(const j of ['run_finale','memory_all_cleared','run_treasure_5','bondup_sting_'+f,'run_treasure_1','bond_meter_tick'])out[f][j]=run(f,j)}
  MusicFX.ctx=Object.assign({},keep,{farewell:()=>true,release:()=>false});out.fw={whimber:run('whimber','run_finale'),slyte:run('slyte','run_finale'),hum:MusicFX.hum('whimber')};
  MusicFX.ctx=Object.assign({},keep,{farewell:()=>false,release:()=>true});out.rel={whimber:run('whimber','bondup_sting_whimber'),twitchel:run('twitchel','bondup_sting_twitchel')};MusicFX.ctx=Object.assign({},keep,{farewell:()=>false,release:()=>false});
  Warmup.yayUntil=performance.now();out.yay={twitchel:run('twitchel','run_finale'),hum:MusicFX.hum('twitchel'),slyte:run('slyte','run_finale')};Warmup.yayUntil=-1e9;
  const h0=L();for(let k=0;k<3;k++)MusicFX.hum('slyte');out.hums=MusicFX.motifLog.slice(h0).map(e=>e.shape+':'+e.where);
  const h1=L();MusicFX.ctx=Object.assign({},keep,{fam:()=>'twitchel',farewell:()=>false,release:()=>false});let fake=null;if(!document.querySelector('#cr .px-echo')){fake=document.createElement('div');fake.id='cr';fake.innerHTML='<i class="px-echo"></i>';document.body.appendChild(fake)}Alive.act('hum');if(fake)fake.remove();out.gesture=MusicFX.motifLog.slice(h1).map(e=>e.f+':'+e.where);
  MusicFX.ctx=keep;await new Promise(r=>setTimeout(r,2500));return out}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.wait_for_timeout(800)
    o=await pg.evaluate(JS)
    for f in ['slyte','whimber','twitchel']:
      for j in ['run_finale','memory_all_cleared','run_treasure_5']:
        r=o[f][j];check(r['d']>0 and r['logged']==1 and not r['sync'] and r['last']['where']=='jingle' and r['last']['shape']=='full',f'{f} {j}: motif pre-roll first ({r["d"]} ms), then the jingle')
      r=o[f]['bondup_sting_'+f];check(r['d']>0 and r['logged']==1 and r['last']['where']=='sting' and r['last']['shape']=='full_do',f'{f} grow-up sting: the full motif ending on do just before it')
      for j in ['run_treasure_1','bond_meter_tick']:
        r=o[f][j];check(r['d']==0 and r['logged']==0 and r['sync'],f'{f} {j}: no motif, plays at once')
    check(o['fw']['whimber']['d']==0 and o['fw']['whimber']['logged']==0 and o['fw']['whimber']['sync'] and o['fw']['hum']==0,'Wingsongs: no motif in the farewell flow (jingle plays plain, no hum)')
    check(o['fw']['slyte']['d']>0,'Howlings still pre-rolls in the farewell flow (guard is Wingsongs only)')
    check(o['rel']['whimber']['d']==0 and o['rel']['twitchel']['d']>0,'release: Wingsongs silent, Purrlings unaffected')
    check(o['yay']['twitchel']['d']==0 and o['yay']['hum']==0 and o['yay']['slyte']['d']>0,'right after the warm-up yay: no Purrlings motif (Howlings unaffected)')
    check(sorted(o['hums'])==['fragment_tail:hum','full:hum','rhythm_flip:hum'],'hums rotate full / fragment_tail / rhythm_flip: '+json.dumps(o['hums']))
    check(o['gesture']==['twitchel:hum'],'the hum gesture (Alive.act) hums the family motif: '+json.dumps(o['gesture']))
    check(not errs,'no page errors '+str(errs[:2]))
    await b.close()
  print('motif phone:',len(fails),'failed');sys.exit(1 if fails else 0)
asyncio.run(main())
