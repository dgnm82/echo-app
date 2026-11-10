# Title peek/occlusion: Daniel (Nov 8): keep peek poses, but the WHOLE FACE must stay visible
# above fg bush/log (body may stay covered). Face = opaque strip pixels with y < 30, from
# Pixal/Cole title_frames peek notes: "put the bush/rock layer IN FRONT, top edge ~row 30
# of the frame" (walk uses the same foot-anchored rig).
#
# Woodland new+return is the live bug: the ground walker (cat_tan-sand in the reported seed)
# walks behind the fg bush and the face is covered (sprites z-index 1, fg z-index 2). The
# log sitter's face is already clear (log is in bg). Pasture/cove are checked the same way.
#
# Assertion composites bg + wild sprites + fg + .ttface (no own Echo, no alive sparkles)
# in art pixels, then requires each face cell under opaque fg to show the sprite color
# (the face layer sits above fg). Layout-vs-fg-PNG alone would still fail after the fix,
# because the body sprite stays under fg on purpose.
import asyncio,sys,os,io,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from playwright.async_api import async_playwright
from origin_pick import pick,nocam
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
TB=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','px','title','title_biomes.json')))['biomes']
FACE_ROW=30  # cover top edge, title_frames peek notes
TOL=12
bad=[];n=[0]
def check(c,m):
  n[0]+=1
  if not c:bad.append(m);print('FAIL',m)

def init_script(day,tod):
  # day 6/7/8 => woodland/pasture/cove; day 6 is the reported cat-walker + wolf-sitter seed.
  # titleTod() lives inside the game.js IIFE and reads solarNow() (local clock). 15:00 UTC is
  # 07:00 PT = dawn. 01:00 UTC is 17:00 PT = dusk in January, and floor(Date.now()/864e5)
  # stays on `day` so the biome seed is unchanged.
  return f"""(()=>{{Date.now=()=>{day}*864e5+1*3600e3;window.__titleTod='{tod}';}})()"""

def face_cols(strip, fi, flip):
  im=Image.open(strip).convert('RGBA')
  fr=im.crop((fi*48,0,(fi+1)*48,48)); px=fr.load()
  cells=[]
  for y in range(FACE_ROW):
    for x in range(48):
      if px[x,y][3]>200:
        cells.append((47-x if flip else x, y, px[x,y]))
  return cells

def close_rgb(a,b,tol=TOL):
  return all(abs(int(a[i])-int(b[i]))<=tol for i in range(3))

async def force_tod(pg, tod):
  # titleDio is inside the game.js IIFE (not on window). Clock in init_script is the hook.
  # Wait until the first diorama has the requested variant bg, or time out.
  for _ in range(20):
    got=await pg.evaluate("""(tod)=>{
      const sc=document.querySelector('.scene.ttl'); if(!sc) return 'nosc';
      const bg=sc.querySelector('.ttbio.bg');
      const u=(bg&&(bg.style.backgroundImage||getComputedStyle(bg).backgroundImage))||'';
      return (bg&&u.indexOf('_'+tod)!==-1)?'ok':'wait';
    }""", tod)
    if got=='ok': break
    await pg.wait_for_timeout(250)

async def wait_biome(pg, bio, need_own=False, walk_into_fg=True):
  spr=False
  for _ in range(40):
    ok=await pg.evaluate("""({bio,need})=>{const sc=document.querySelector('.scene.ttl.biome');
      return {ok:!!(sc&&sc.dataset.biome===bio&&(!need||sc.querySelector('.ttown'))),
              spr:!!(sc&&sc.querySelector('.ttspr'))};}""", {'bio':bio,'need':need_own})
    if ok['ok'] and ok['spr']:
      spr=True; break
    await pg.wait_for_timeout(200)
  if walk_into_fg and spr:
    # wait until a ground walker overlaps the woodland fg bush; no-walker biomes skip
    for _ in range(80):
      hit=await pg.evaluate("""()=>{
        const sc=document.querySelector('.scene.ttl'); if(!sc) return 'no';
        const w=[...sc.querySelectorAll('.ttspr')].find(e=>e.dataset.surface==='ground');
        if(!w) return 'none';
        const L=+w.style.left.replace('px','');
        return (L>=90 && L<=140)?'hit':'wait';
      }""")
      if hit in ('hit','none'): break
      await pg.wait_for_timeout(200)
  await pg.wait_for_timeout(200)

PAINT="""async()=>{
  const sc=document.querySelector('.scene.ttl'); if(!sc) return {err:'no sc'};
  const load=u=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=u});
  const url=el=>{const s=(el&&(getComputedStyle(el).backgroundImage||el.style.backgroundImage))||'';return (s.match(/url\\(["']?([^"')]+)["']?\\)/)||[])[1]||''};
  const c=document.createElement('canvas');c.width=180;c.height=320;const x=c.getContext('2d',{willReadFrequently:true});
  const blit=async (el,maxH)=>{
    const u=url(el);if(!u)return;const im=await load(u);if(!im)return;
    if(el.classList.contains('ttbio')){x.drawImage(im,0,0,180,320);return}
    const cs=getComputedStyle(el);
    const L=parseFloat(el.style.left)||0,T=parseFloat(el.style.top)||0;
    const W=48,H=Math.min(maxH||48, parseFloat(cs.height)||48);
    const bp=(cs.backgroundPosition||'0 0').split(' ').map(parseFloat);
    const srcX=Math.abs(bp[0]||0),srcY=Math.abs(bp[1]||0);
    const flip=el.classList.contains('flip')||/matrix\\(-1/.test(cs.transform);
    x.save();
    if(flip){x.translate(L+W,T);x.scale(-1,1);x.drawImage(im,srcX,srcY,W,H,0,0,W,H)}
    else x.drawImage(im,srcX,srcY,W,H,L,T,W,H);
    x.restore();
  };
  const bg=sc.querySelector('.ttbio.bg'); if(bg) await blit(bg);
  const front=sc.querySelector('.ttbio.front'); if(front) await blit(front);
  for(const e of sc.querySelectorAll('.ttsprites .ttspr')) await blit(e,48);
  const fgEl=sc.querySelector('.ttbio.fg'); if(fgEl) await blit(fgEl);
  for(const e of sc.querySelectorAll(':scope>.ttface')) await blit(e,30);
  const D=x.getImageData(0,0,180,320).data;
  const spr=[...sc.querySelectorAll('.ttspr')].filter(e=>e.dataset.surface==='ground'||e.dataset.surface==='seat');
  const bgU=url(bg)||'';
  const m=bgU.match(/_(dawn|day|dusk|night)(?:_fg|_f\\d)?(?:\\.png)?/i);
  return {
    bio:sc.dataset.biome,
    shownTod: (bgU.match(/(?:biome|sky)_[a-z]+_(dawn|day|dusk|night)/)||[])[1]||'',
    hasFace:sc.querySelectorAll('.ttface').length,
    pixels:Array.from(D),
    spr:spr.map(e=>{
      const bp=(getComputedStyle(e).backgroundPosition||'0 0').split(' ').map(parseFloat);
      const file=(url(e)||e.style.backgroundImage||'');
      const pop=file.split('/').pop();
      return {surf:e.dataset.surface,left:+e.style.left.replace('px',''),top:+e.style.top.replace('px',''),
        file:pop,path:file,flip:e.classList.contains('flip'),fi:Math.round(Math.abs(bp[0]||0)/48)};
    })
  };
}"""

async def assert_faces(pg, label, bio, tod):
  v=TB[bio]['variants'][tod]
  fg=Image.open(v['fg']).convert('RGBA'); fp=fg.load()
  info=await pg.evaluate(PAINT)
  check(info and not info.get('err') and info.get('bio')==bio, f'{label}: biome {bio} up ({info and info.get("bio")})')
  if not info or info.get('bio')!=bio:return
  check(info.get('shownTod')==tod, f'{label}: variant is {tod} (got {info.get("shownTod")})')
  if bio=='woodland':
    check(len(info['spr'])>=1, f'{label}: woodland has a ground/seat actor ({len(info["spr"])})')
  pix=info['pixels']
  def painted(ax,ay):
    i=(ay*180+ax)*4
    return (pix[i],pix[i+1],pix[i+2],pix[i+3])
  for s in info['spr']:
    fname=s['file']
    strip=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','px','title',fname)
    if not os.path.exists(strip):
      check(False, f'{label}: missing strip {fname}'); continue
    cells=face_cols(strip, s['fi'], s['flip'])
    check(len(cells)>=4, f"{label}: {s['surf']} {fname} has a face region ({len(cells)} px)")
    hit=[]
    for x,y,col in cells:
      ax,ay=s['left']+x,s['top']+y
      if not (0<=ax<180 and 0<=ay<320): continue
      if fp[ax,ay][3]<=200: continue
      p=painted(ax,ay)
      if not close_rgb(p, col):
        hit.append((ax,ay,p,tuple(col[:3])))
    check(len(hit)==0, f"{label}: {s['surf']} {fname} face y<{FACE_ROW} clear of fg ({len(hit)}/{len(cells)} covered, left={s['left']} top={s['top']} frame={s['fi']}) sample={hit[:6]}")

async def main():
  shots=os.environ.get('TITLE_FACE_SHOTDIR','')
  async with async_playwright() as p:
    brw=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # NEW titles
    for day,bio,tod in [(6,'woodland','dusk'),(7,'pasture','dusk'),(8,'cove','dusk')]:
      ctx=await brw.new_context(**p.devices['iPhone 13']); pg=await ctx.new_page(); await nocam(pg)
      await pg.add_init_script(init_script(day,tod))
      await pg.goto(URL); await pg.evaluate("window.__wiped=1;localStorage.clear()"); await pg.reload()
      await force_tod(pg,tod)
      await wait_biome(pg,bio,False,True)
      await assert_faces(pg,f'{bio} new',bio,tod)
      if shots: await pg.screenshot(path=os.path.join(shots,f'{os.environ.get("TITLE_FACE_TAG","shot")}_{bio}_new.png'))
      await ctx.close()
    # RETURN titles: onboard once, then each biome day
    ctx=await brw.new_context(**p.devices['iPhone 13']); pg=await ctx.new_page(); await nocam(pg)
    async def T(sel,ms=250):
      await pg.locator(sel).first.click(); await pg.wait_for_timeout(ms)
    await pg.goto(URL); await pg.evaluate("window.__wiped=1;localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(700)
    if await pg.locator('#obgo').count(): await T('#obgo',400)
    for _ in range(12):
      if await pg.locator('#obnm').count(): break
      if await pg.locator('.scene.ob').count(): await T('.scene.ob',200)
    if await pg.locator('#obnm').count():
      await pg.fill('#obnm','Mia'); await T('#obnext'); await T('#obyes')
      await pg.evaluate("window.__echo&&__echo.setBand&&__echo.setBand('7-8')")
      await pick(pg,'fox'); await T('#ornext',300); await T('.orchip >> nth=0',900)
      await T('#orinv',3000); await T('#ornm',400); await T('#orkeep',1500)
    await pg.wait_for_timeout(400); await pg.close()
    for day,bio,tod in [(6,'woodland','dusk'),(7,'pasture','dusk'),(8,'cove','dusk')]:
      pg=await ctx.new_page(); await nocam(pg)
      await pg.add_init_script(init_script(day,tod))
      # hold the return title (auto-advances after 3 s)
      await pg.add_init_script("setTimeout=(f=>(fn,ms,...a)=>f(fn,ms===3000?6e5:ms,...a))(setTimeout)")
      await pg.goto(URL)
      await force_tod(pg,tod)
      await wait_biome(pg,bio,True,True)
      # cove return may hand off to a dry biome
      got=await pg.evaluate("document.querySelector('.scene.ttl')&&document.querySelector('.scene.ttl').dataset.biome")
      use=got or bio
      await assert_faces(pg,f'return {bio}',use,'dusk')
      if shots: await pg.screenshot(path=os.path.join(shots,f'{os.environ.get("TITLE_FACE_TAG","shot")}_{bio}_return.png'))
      await pg.close()
    await ctx.close(); await brw.close()
  print(f'title face vis: {n[0]-len(bad)}/{n[0]} passed')
  sys.exit(1 if bad else 0)
asyncio.run(main())
