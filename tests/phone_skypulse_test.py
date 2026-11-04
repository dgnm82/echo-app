# Nov 3 (Daniel via Kai): the sun / moon in the run sky pulses gently to the beat (the gold beat dash stays off: MFX.runPulse=false).
# Logs the sky body's scale + halo every frame for ~6 s against the playing loop's own clock (Music.clock + music/tempo.json) and asserts
# every pulse starts within ~1 frame of a beat, is gone by 250 ms, and the sun pixels are never tinted. Saves the timing log and an
# on-beat / off-beat canvas frame pair (+ 8x crops of the sky body) per run. Meadow Dash (dog, slyte) has the sun; Moonlight Glide
# (owl, whimber) has no sky body (stars only), so it must log no pulse at all.
# Usage: python3 tests/phone_skypulse_test.py [URL] [OUTDIR]
import asyncio,sys,os,json,time,base64,io
from playwright.async_api import async_playwright
from PIL import Image
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/skypulse';os.makedirs(OUT,exist_ok=True)
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));TEMPO=json.load(open(os.path.join(R,'music/tempo.json')))
fails=[]
def check(c,m):
  print(('ok   ' if c else 'FAIL ')+m)
  if not c:fails.append(m)
async def T(pg,sel,ms=250):await pg.locator(sel).first.click();await pg.wait_for_timeout(ms)
async def wait(pg,js,ms):
  t0=time.time()
  while (time.time()-t0)*1000<ms:
    if await pg.evaluate(f"(()=>{{try{{return !!({js})}}catch(e){{return false}}}})()"):return True
    await pg.wait_for_timeout(50)
  return False
async def setup(b,animal):
  ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);pg=await ctx.new_page();await nocam(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  await pg.goto(URL);await pg.evaluate("localStorage.clear();localStorage.setItem('echo-dev-wu','0')");await pg.reload();await pg.wait_for_timeout(600)
  await T(pg,'#obgo',400)
  for _ in range(12):
    if await pg.locator('#obnm').count():break
    await T(pg,'.scene.ob',200)
  await pg.fill('#obnm','Mia');await T(pg,'#obnext');await T(pg,'#obyes');await pick(pg,animal);await T(pg,'#ornext',300);await T(pg,'.orchip >> nth=0',900)
  await T(pg,'#orinv');await T(pg,'#orinv',3000);await T(pg,'#ornm',400);await T(pg,'#orkeep');await T(pg,'#orkeep',1200)
  await pg.evaluate("document.querySelectorAll('.full').forEach(f=>f.remove());CONFIG.ambientMin=999;CONFIG.ambientMax=999")
  return ctx,pg,errs
# per frame, right after the sky pulse is drawn: the raw loop clock + the pulse it drew; grab the canvas on a beat / off a beat
HOOK="""(()=>{window.__sl=[];window.__shot={};const d=MusicFX.drawSkyPulse;MusicFX.drawSkyPulse=function(cx,im){const r=d.apply(this,arguments);const c=Music.clock(),L=MusicFX.skyLast;
  __sl.push({pn:performance.now(),loop:c&&c.name,t:c&&c.t,env:L?L.env:null,scale:L?L.scale:null,glow:L?L.glow:null,kind:L?L.kind:null,beat:L?L.beat:null});
  const b=MusicFX.beat(),ms=b?b.phase*b.spb*1000:-1;if(window.__grab&&b&&/_loop$/.test(b.name)&&/(dash|glide)/.test(b.name)){
    if(!__shot.on&&ms>=0&&ms<12)__shot.on={png:cx.canvas.toDataURL(),ms,beat:b.beat};
    if(!__shot.off&&ms>b.spb*750&&ms<b.spb*750+20)__shot.off={png:cx.canvas.toDataURL(),ms,beat:b.beat}}return r}})()"""
def save_png(durl,path):
  im=Image.open(io.BytesIO(base64.b64decode(durl.split(',')[1]))).convert('RGBA');im.save(path);return im
async def run_part(b,animal,label,has_body):
  ctx,pg,errs=await setup(b,animal)
  await pg.evaluate("(()=>{const s=RunnerEngine.step;RunnerEngine.step=function(g,dt){window.__rg=g;return s(g,dt)}})()")
  await pg.evaluate(HOOK);await pg.evaluate("__echo.runGame()")
  want='meadow_dash' if label=='meadow_dash' else 'moonlight_glide'
  ok=await wait(pg,f"Music.clock()&&/{want}/.test(Music.clock().name)&&MusicFX.beat()",8000)
  check(ok,f'{label}: the run loop plays and the beat clock reads it ({await pg.evaluate("Music.clock()&&Music.clock().name")})')
  await pg.wait_for_timeout(600);await pg.evaluate("__sl.length=0;window.__grab=1");await pg.wait_for_timeout(6000)
  log=await pg.evaluate("__sl.slice()");shot=await pg.evaluate("window.__shot")
  check(await pg.evaluate("MusicFX.runPulse===false"),f'{label}: the beat dash stays off (MFX.runPulse=false)')
  log=[x for x in log if x['loop'] and want in x['loop']]
  loop=log[0]['loop'] if log else None;tp=TEMPO.get(loop,{});spb=60/tp.get('bpm',120);bpb=tp.get('beatsPerBar',4);nb=tp.get('beats',64)
  gaps=sorted(b2['pn']-a['pn'] for a,b2 in zip(log,log[1:]));fr=gaps[len(gaps)//2] if gaps else 16.7
  tol=max(fr*1.5,20)   # ~1 frame
  rows=[]
  for x in log:
    since=(x['t']%spb)*1000;k=int(x['t']//spb)%nb;rows.append(dict(x,since_beat_ms=round(since,2),beat_calc=k))
  json.dump({'run':label,'loop':loop,'bpm':tp.get('bpm'),'spb_ms':spb*1000,'frame_ms_median':fr,'tolerance_ms':tol,
    'params':{'scale_bump':.05,'halo_alpha_peak':.3,'ease_ms':250,'ease':'quadratic ease-out (1-t/250)^2','halo_radius':'1.6 x body radius'},'frames':rows},open(f'{OUT}/{label}_sky_pulse_log.json','w'),indent=0)
  with open(f'{OUT}/{label}_sky_pulse_log.tsv','w') as f:
    f.write('perf_ms\tloop_t_s\tbeat\tsince_beat_ms\tenv\tscale\tglow\n')
    for r in rows:f.write(f"{r['pn']:.1f}\t{r['t']:.4f}\t{r['beat_calc']}\t{r['since_beat_ms']:.1f}\t{r['env']}\t{r['scale']}\t{r['glow']}\n")
  check(len(rows)>100,f'{label}: logged {len(rows)} frames over ~6 s (median frame {fr:.1f} ms)')
  if has_body:
    on=[r for r in rows if r['scale'] and r['scale']>1]
    bad=[r for r in rows if (r['scale'] or 1)>1 and r['since_beat_ms']>=250+0.5]
    check(len(on)>0 and not bad,f'{label}: the sun is bigger only within 250 ms after a beat ({len(on)} pulsed frames, {len(bad)} outside)')
    miss=[r for r in rows if r['since_beat_ms']<200 and not ((r['scale'] or 1)>1)]
    check(not miss,f'{label}: every frame 0-200 ms after a beat is pulsing ({len(miss)} misses)')
    # onsets: a frame with scale>1 after one at scale 1 = a new pulse; it must sit within ~1 frame after a beat, and every beat gets one
    ons=[r for p,r in zip(rows,rows[1:]) if (p['scale'] or 1)==1 and (r['scale'] or 1)>1]
    late=[r for r in ons if r['since_beat_ms']>tol]
    nbeats=len({(int((r['t'])//spb)) for r in rows})
    check(ons and not late,f'{label}: {len(ons)} pulse onsets, all within {tol:.0f} ms (~1 frame) of their beat (max {max([r["since_beat_ms"] for r in ons] or [0]):.1f} ms)')
    check(len(ons)>=nbeats-2,f'{label}: one pulse per beat ({len(ons)} onsets for {nbeats} beats in the log; day loop = every beat)')
    pk=max(r['scale'] for r in on);check(1.04<=pk<=1.0501,f'{label}: peak scale {pk:.4f} (~5%)')
    gk=max(r['glow'] for r in on);check(.25<=gk<=.3001,f'{label}: peak halo alpha {gk:.3f}')
    check(all(r['kind']=='sun' for r in on),f'{label}: the pulsing body is the sun')
    nob=await pg.evaluate("__rg&&__rg.obs.filter(o=>o.beat).length");check(nob>=1,f'{label}: obstacles still beat-locked ({nob} on the beat)')
  else:
    drawn=[r for r in rows if r['scale'] is not None]
    check(not drawn,f'{label}: no sky body in this sky (stars only), so nothing pulses ({len(drawn)} pulse frames)')
  check(shot and shot.get('on') and shot.get('off'),f'{label}: grabbed an on-beat and an off-beat frame')
  if shot and shot.get('on') and shot.get('off'):
    a=save_png(shot['on']['png'],f'{OUT}/{label}_on_beat.png');o=save_png(shot['off']['png'],f'{OUT}/{label}_off_beat.png')
    box=(230,70,295,135)
    for nm,im in (('on',a),('off',o)):im.crop(box).resize(((box[2]-box[0])*8,(box[3]-box[1])*8),Image.NEAREST).save(f'{OUT}/{label}_{nm}_beat_sky_8x.png')
    print(f"   frames: on-beat {shot['on']['ms']:.1f} ms after beat {shot['on']['beat']}, off-beat {shot['off']['ms']:.1f} ms after beat {shot['off']['beat']}")
    if has_body:
      check(a.getpixel((262,102))[:3]==(255,248,218)==o.getpixel((262,102))[:3],f'{label}: the sun pixels are never tinted (centre {a.getpixel((262,102))[:3]} on-beat, {o.getpixel((262,102))[:3]} off)')
      ha,ho=a.getpixel((262,120))[:3],o.getpixel((262,120))[:3]
      check(sum(ha)>sum(ho) and ho==(169,218,240),f'{label}: the halo shows on the beat only (below the sun: {ha} on-beat vs {ho} off)')
  # reduced motion / Calm effects: no pulse
  await pg.evaluate("__echo.state.lowfx=true;__sl.length=0");await pg.wait_for_timeout(1500)
  rm=await pg.evaluate("__sl.filter(x=>x.scale&&x.scale>1).length");check(rm==0,f'{label}: Calm effects -> no pulse ({rm})')
  check(not errs,f'{label}: no page errors {errs[:2]}');await ctx.close()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    await run_part(b,'dog','meadow_dash',True)
    await run_part(b,'owl','moonlight_glide',False)
    await b.close()
  print(f'sky pulse phone test: {len(fails)} failed (log + frames in {OUT})');sys.exit(1 if fails else 0)
asyncio.run(main())
