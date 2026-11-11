# Title sky/front split (Pixal, Nov 10): sun/moon must sit in an isolated sky layer
# behind trees/ground (front) and the existing fg bushes, while sparkles/fireflies
# stay on a sun-free alive overlay (same 500 ms swap). Layer split comes from the
# delivered art (old alive minus new sparkle-only alive = sun/moon), not a palette
# heuristic. The old px/title/biome_*_*_f0/f1.png files still contain the sun and
# must not be referenced by the title diorama.
#
# Fails on 01b9143d (opaque bg + sun baked into the alive overlay above the trees).
# Fails on 24651bbd for the later disc placement: woodland dusk still a sliver,
# woodland/pasture tops at y=151 overlap the measured 28px return panel, cove
# discs overlap the tagline. Passes after the y=161 / cove y=131 recopy.
import json,os,re,sys
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
TITLE=ROOT/'px'/'title'
LAYERS=ROOT/'px'/'title_layers'
BIOS=['woodland','pasture','cove']
TODS=['dawn','day','dusk','night']
OLD_ALIVE=re.compile(r'px/title/biome_(?:woodland|pasture|cove)_(?:dawn|day|dusk|night)_f[01]\.png')
# production paths that must not keep pointing at the sun-baked overlays
PROD=['game.js','pixel.css','index.html','handheld.html','px/title/title_biomes.json']

bad=[];n=[0]
def check(c,m):
  n[0]+=1
  if not c:bad.append(m);print('FAIL',m)

def load(p):
  return Image.open(p).convert('RGBA')

def px(im):
  return im.load(), im.size

def composite(paths):
  out=Image.new('RGBA',(180,320),(0,0,0,0))
  for p in paths:
    if not p: continue
    im=load(p)
    out.alpha_composite(im)
  return out

def sun_mask(bio,tod):
  """Sun/moon = opaque in the old alive overlay and clear in the sparkle-only art."""
  w,h=180,320
  sun=[[False]*w for _ in range(h)]
  for fr in ('f0','f1'):
    old=load(TITLE/f'biome_{bio}_{tod}_{fr}.png')
    new=load(LAYERS/f'alive_{bio}_{tod}_{fr}.png')
    o,n=old.load(),new.load()
    for y in range(h):
      for x in range(w):
        if o[x,y][3]==255 and n[x,y][3]==0:
          sun[y][x]=True
  return sun

def url_of(style):
  m=re.search(r'url\(["\']?([^"\')]+)["\']?\)', style or '')
  return m.group(1) if m else ''

# --- art integrity (valid on 01b9143d once the files are copied) ---
check(LAYERS.is_dir() and len(list(LAYERS.glob('*.png')))==48, f'title_layers has 48 PNGs ({len(list(LAYERS.glob("*.png"))) if LAYERS.is_dir() else 0})')

print('== sky+front vs old bg (diffs must be only open-sky sun/moon) ==')
for bio in BIOS:
  for tod in TODS:
    sky=LAYERS/f'sky_{bio}_{tod}.png'
    front=LAYERS/f'front_{bio}_{tod}.png'
    bg=TITLE/f'biome_{bio}_{tod}.png'
    for p,label in ((sky,'sky'),(front,'front'),(bg,'bg')):
      im=load(p); check(im.size==(180,320), f'{label} {bio}/{tod} is 180x320 ({im.size})')
      pix=im.load()
      mid=set()
      for y in range(320):
        for x in range(180):
          a=pix[x,y][3]
          if a not in (0,255): mid.add(a)
      check(not mid, f'{label} {bio}/{tod} alpha is 0/255 only ({sorted(mid)[:4]})')
    sf=composite([sky,front])
    oldbg=load(bg)
    fp=load(front).load(); op=oldbg.load(); sp=sf.load()
    extra=[]; open_sun=0
    for y in range(320):
      for x in range(180):
        if sp[x,y]==op[x,y]:
          continue
        # after the 7 suns moved, sky+front differs from the original opaque bg exactly
        # where the sun/moon sits in open sky. Diffs under front would be a split error.
        if fp[x,y][3]==255:
          extra.append((x,y,sp[x,y],op[x,y]))
        else:
          open_sun+=1
    check(len(extra)==0, f'{bio}/{tod}: sky+front vs old bg differs under front ({len(extra)} px) sample={extra[:4]}')
    print(f'  {bio}/{tod}: open-sky sun/moon={open_sun}, diffs_under_front={len(extra)}')

print('== sparkle-only alive == old alive minus sun/moon ==')
for bio in BIOS:
  for tod in TODS:
    for fr in ('f0','f1'):
      old=load(TITLE/f'biome_{bio}_{tod}_{fr}.png')
      neu=load(LAYERS/f'alive_{bio}_{tod}_{fr}.png')
      o,q=old.load(),neu.load()
      mismatch=0; extra_new=0; sun=0
      for y in range(320):
        for x in range(180):
          oa,na=o[x,y][3],q[x,y][3]
          if na==255:
            if oa!=255 or q[x,y]!=o[x,y]:
              mismatch+=1
          elif oa==255:
            sun+=1
      check(mismatch==0 and extra_new==0, f'{bio}/{tod}/{fr}: sparkles identical to old alive ({mismatch} mismatches)')
      check(sun>0, f'{bio}/{tod}/{fr}: old-minus-new sun/moon region is non-empty ({sun})')
      print(f'  {bio}/{tod}/{fr}: sparkle_ok sun/moon={sun}')

# --- wiring + composite of what the app actually points at ---
def disc_cells(bio,tod):
  """Open-sky sun/moon: sky != original opaque bg, and front+fg are clear."""
  sky=load(LAYERS/f'sky_{bio}_{tod}.png')
  front=load(LAYERS/f'front_{bio}_{tod}.png')
  fg=load(TITLE/f'biome_{bio}_{tod}_fg.png')
  bg=load(TITLE/f'biome_{bio}_{tod}.png')
  sp,fp,gp,bp=sky.load(),front.load(),fg.load(),bg.load()
  vis=[]
  for y in range(320):
    for x in range(180):
      if sp[x,y]!=bp[x,y] and fp[x,y][3]==0 and gp[x,y][3]==0:
        vis.append((x,y))
  full=0
  for fr in ('f0','f1'):
    old=load(TITLE/f'biome_{bio}_{tod}_{fr}.png')
    neu=load(LAYERS/f'alive_{bio}_{tod}_{fr}.png')
    o,q=old.load(),neu.load()
    nsun=sum(1 for y in range(320) for x in range(180) if o[x,y][3]==255 and q[x,y][3]==0)
    full=max(full,nsun)
  return vis, full

def box_hits(cells, box):
  """box is [l,t,r,b) in art px (or a dict with left/top/right/bottom)."""
  if not box: return []
  if isinstance(box, dict):
    import math
    l,t,r,b=math.floor(box['left']),math.floor(box['top']),math.ceil(box['right']),math.ceil(box['bottom'])
  else:
    l,t,r,b=box
  return [(x,y) for x,y in cells if l<=x<r and t<=y<b]

print('== sun/moon fully visible over front/fg and clear of logo/tagline/tap ==')
KEEP=json.loads((TITLE/'title_biomes.json').read_text()).get('ui_keepouts') or {}
DISCS={}
for bio in BIOS:
  for tod in TODS:
    vis,full=disc_cells(bio,tod)
    DISCS[(bio,tod)]=vis
    check(len(vis)==full and full>0, f'{bio}/{tod}: sun/moon fully visible, 0 px under front/fg ({len(vis)}/{full} in open sky)')
    for name,box in KEEP.items():
      hit=box_hits(vis, box)
      check(len(hit)==0, f'{bio}/{tod}: sun/moon clear of ui_keepouts.{name} {box} ({len(hit)} px) sample={hit[:4]}')
    if vis:
      xs=[x for x,_ in vis]; ys=[y for _,y in vis]
      print(f'  {bio}/{tod}: visible={len(vis)}/{full} bbox=[{min(xs)}, {min(ys)}, {max(xs)+1}, {max(ys)+1})')

print('== production no longer references sun-baked alive overlays ==')

hits=[]
for rel in PROD:
  p=ROOT/rel
  if not p.exists(): continue
  text=p.read_text()
  for m in OLD_ALIVE.finditer(text):
    hits.append(f'{rel}:{m.group(0)}')
check(len(hits)==0, 'old alive f0/f1 no longer referenced in production files: '+', '.join(hits[:8]))

B=json.loads((TITLE/'title_biomes.json').read_text())
print('== app composite: sun/moon never paints over front/fg ==')
for bio in BIOS:
  for tod in TODS:
    v=B['biomes'][bio]['variants'][tod]
    for key,path,need in (('bg',v.get('bg'),True),('front',v.get('front'),True),('fg',v.get('fg'),True)):
      check(bool(path) and (ROOT/path).is_file(), f'{bio}/{tod} JSON {key} exists ({path})')
    if path and key=='bg':
      pass
    check(isinstance(v.get('alive'),list) and len(v['alive'])==2 and all((ROOT/p).is_file() for p in v['alive']),
          f'{bio}/{tod} JSON alive is two existing files ({v.get("alive")})')
    if v.get('bg'):
      check('title_layers/sky_' in (v.get('bg') or ''), f'{bio}/{tod} bg is the sky layer ({v.get("bg")})')
    if v.get('front'):
      check('title_layers/front_' in (v.get('front') or ''), f'{bio}/{tod} front is the tree/ground layer ({v.get("front")})')
    if v.get('alive'):
      check(all('title_layers/alive_' in p for p in v['alive']), f'{bio}/{tod} alive is sparkle-only title_layers ({v.get("alive")})')
    front_im=load(LAYERS/f'front_{bio}_{tod}.png')
    fg_im=load(TITLE/f'biome_{bio}_{tod}_fg.png')
    fp,gp=front_im.load(),fg_im.load()
    sun=sun_mask(bio,tod)
    for fr_i,alive in enumerate(v.get('alive') or []):
      layers=[v.get('bg'), v.get('front'), v.get('fg'), alive]
      # only composite files that exist (baseline may omit front / still point at old bg)
      comp=composite([ROOT/p for p in layers if p and (ROOT/p).is_file()])
      cp=comp.load()
      hit=[]
      for y in range(320):
        for x in range(180):
          if not sun[y][x]: continue
          cover = fp[x,y][3]==255 or gp[x,y][3]==255
          if not cover: continue
          # visible pixel is sun/moon if it matches the old alive sun colour and not the cover
          cover_c = fp[x,y] if fp[x,y][3]==255 else gp[x,y]
          if cp[x,y][3]==255 and cp[x,y][:3]!=cover_c[:3]:
            hit.append((x,y,cp[x,y],cover_c))
      check(len(hit)==0, f'{bio}/{tod}/alive[{fr_i}]: sun/moon does not paint over front/fg ({len(hit)} px) sample={hit[:4]}')

# game.js must insert a front layer and composite it into titleSurf (perch feet)
game=(ROOT/'game.js').read_text()
check(re.search(r"lay\(['\"]front['\"]", game) or re.search(r"ttbio['\"]?\s*\+\s*['\"]front|className='ttbio front'|className=\"ttbio front\"", game),
      'titleDio inserts a .ttbio.front layer')
check(re.search(r'v\.front', game), 'titleDio/titleSurf reads v.front')
css=(ROOT/'pixel.css').read_text()
check(re.search(r'\.ttbio\.front', css), 'pixel.css assigns .ttbio.front a z-index behind sprites')

# optional live DOM check
URL=sys.argv[1] if len(sys.argv)>1 else os.environ.get('TITLE_SKY_URL','')
if URL:
  import asyncio
  sys.path.insert(0,str(Path(__file__).parent))
  from playwright.async_api import async_playwright
  try:
    from origin_pick import nocam
  except Exception:
    async def nocam(pg):
      pass
  def init_script(day,hour_utc):
    return f"(()=>{{Date.now=()=>{day}*864e5+{hour_utc}*3600e3;}})()"
  async def live():
    async with async_playwright() as p:
      brw=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
      # woodland/pasture/cove dusk at 01:00 UTC = 17:00 PT
      for day,bio,tod,hour in ((6,'woodland','dusk',1),(7,'pasture','dusk',1),(8,'cove','dusk',1)):
        ctx=await brw.new_context(**p.devices['iPhone 13']); pg=await ctx.new_page(); await nocam(pg)
        await pg.add_init_script(init_script(day,hour))
        await pg.goto(URL); await pg.evaluate("window.__wiped=1;localStorage.clear()"); await pg.reload()
        info=None
        for _ in range(25):
          info=await pg.evaluate("""()=>{
            const sc=document.querySelector('.scene.ttl'); if(!sc) return {err:'no sc'};
            const u=el=>{if(!el)return ''; const s=el.style.backgroundImage||getComputedStyle(el).backgroundImage||'';
              const m=s.match(/url\\(["']?([^"')]+)["']?\\)/); return m?m[1]:s;};
            return {bio:sc.dataset.biome,
              bg:u(sc.querySelector('.ttbio.bg')),
              front:u(sc.querySelector('.ttbio.front')),
              fg:u(sc.querySelector('.ttbio.fg')),
              alive:u(sc.querySelector('.ttbio.alive'))};
          }""")
          if info and info.get('bg'): break
          await pg.wait_for_timeout(200)
        check(info and info.get('bio')==bio, f'live {bio} {tod}: biome up ({info})')
        if info:
          check('title_layers/sky_' in (info.get('bg') or '') and tod in (info.get('bg') or ''),
                f'live {bio} {tod}: .ttbio.bg is sky ({info.get("bg")})')
          check('title_layers/front_' in (info.get('front') or ''),
                f'live {bio} {tod}: .ttbio.front is present ({info.get("front")})')
          check(f'px/title/biome_{bio}_{tod}_fg.png' in (info.get('fg') or ''),
                f'live {bio} {tod}: existing fg unchanged ({info.get("fg")})')
          check('title_layers/alive_' in (info.get('alive') or ''),
                f'live {bio} {tod}: .ttbio.alive is sparkle-only ({info.get("alive")})')
          check('biome_' not in (info.get('alive') or '') or 'title_layers' in (info.get('alive') or ''),
                f'live {bio} {tod}: alive is not the old sun-baked overlay ({info.get("alive")})')
        await ctx.close()
      # first-visit title: measure the rendered logo / tagline / tap pill (don't hardcode keepouts)
      ctx=await brw.new_context(**p.devices['iPhone 13']); pg=await ctx.new_page(); await nocam(pg)
      await pg.add_init_script(init_script(6,1))
      await pg.goto(URL); await pg.evaluate("window.__wiped=1;localStorage.clear()"); await pg.reload()
      for _ in range(25):
        ok=await pg.evaluate("!!document.querySelector('.scene.ttl.biome')")
        if ok: break
        await pg.wait_for_timeout(200)
      ui=await pg.evaluate("""()=>{
        const sc=document.querySelector('.scene.ttl'); if(!sc) return {err:'no sc'};
        const R=sc.getBoundingClientRect(),k=R.width/180;
        const box=el=>{if(!el)return null; const r=el.getBoundingClientRect();
          return {left:(r.left-R.left)/k, top:(r.top-R.top)/k, right:(r.right-R.left)/k, bottom:(r.bottom-R.top)/k};};
        const a=box(sc.querySelector('.oblogo')), g=box(sc.querySelector('.oblogo-glow'));
        let logo=a;
        if(g&&a) logo={left:Math.min(a.left,g.left),top:Math.min(a.top,g.top),right:Math.max(a.right,g.right),bottom:Math.max(a.bottom,g.bottom)};
        else if(g) logo=g;
        return {logo, tagline:box(sc.querySelector('.obtag')), tap:box(sc.querySelector('.obtap, #obgo'))};
      }""")
      print('live UI boxes', ui)
      check(bool(ui and ui.get('logo') and ui.get('tagline') and ui.get('tap')), f'first-visit title rendered logo/tagline/tap (got {ui})')
      if ui and not ui.get('err'):
        for bio in BIOS:
          for tod in TODS:
            vis=DISCS.get((bio,tod)) or []
            for name in ('logo','tagline','tap'):
              hit=box_hits(vis, ui.get(name))
              check(len(hit)==0, f'{bio}/{tod}: sun/moon clear of rendered {name} {ui.get(name)} ({len(hit)} px) sample={hit[:4]}')
      await ctx.close()
      # return title: onboard once, then measure the real .obpanel and check cove handoff
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
        from origin_pick import pick as _pick, through_invite
        await _pick(pg,'fox'); await T('#ornext',300); await T('.orchip >> nth=0',900)
        await through_invite(pg,'name'); await T('#orkeep',1500)
      await pg.wait_for_timeout(400); await pg.close()
      async def open_return(day, hour):
        pg=await ctx.new_page(); await nocam(pg)
        await pg.add_init_script(init_script(day,hour))
        await pg.add_init_script("setTimeout=(f=>(fn,ms,...a)=>f(fn,ms===3000?6e5:ms,...a))(setTimeout)")
        await pg.goto(URL)
        for _ in range(25):
          ok=await pg.evaluate("!!document.querySelector('.scene.ttl.biome')")
          if ok: break
          await pg.wait_for_timeout(200)
        return pg
      # woodland dusk return: measure the panel (don't hardcode Pixal's 131/18/151)
      pg=await open_return(6,1)
      meas=await pg.evaluate("""()=>{
        const sc=document.querySelector('.scene.ttl'); if(!sc) return {err:'no sc'};
        const R=sc.getBoundingClientRect(),k=R.width/180;
        const box=el=>{if(!el)return null; const r=el.getBoundingClientRect();
          return {left:(r.left-R.left)/k, top:(r.top-R.top)/k, right:(r.right-R.left)/k, bottom:(r.bottom-R.top)/k, height:r.height/k};};
        const p=sc.querySelector('.obpanel');
        const natural=p?p.textContent.trim():'';
        const one=box(p);
        const long='Wimmertail is playing nearby!';
        if(p) p.textContent=long;
        const wrapped=box(p);
        return {natural, one, long, wrapped, bio:sc.dataset.biome};
      }""")
      print('obpanel measure', meas)
      panel=meas.get('wrapped') or meas.get('one')
      check(bool(panel), f'return title rendered an .obpanel (got {meas})')
      if panel:
        print(f'  measured panel top={panel["top"]:.2f} bottom={panel["bottom"]:.2f} height={panel["height"]:.2f} natural={meas.get("natural")!r}')
        # woodland + pasture return show this panel; cove does not (handoff)
        for bio,tod in DISCS:
          if bio=='cove': continue
          hit=box_hits(DISCS[(bio,tod)], panel)
          check(len(hit)==0, f'return {bio}/{tod}: sun/moon clear of measured .obpanel (bottom={panel["bottom"]:.2f}, {len(hit)} px overlap) sample={hit[:4]}')
      await pg.close()
      # cove return must hand off to a dry biome (woodland is next in crossfade.order)
      pg=await open_return(8,1)
      got=await pg.evaluate("document.querySelector('.scene.ttl')&&document.querySelector('.scene.ttl').dataset.biome")
      print(f'  cove return handed off to biome={got!r}')
      check(got=='woodland', f'cove return hands off to woodland (got {got!r})')
      await pg.close(); await ctx.close()
      await brw.close()
  asyncio.run(live())


print(f'title sky layer: {n[0]-len(bad)}/{n[0]} passed')
sys.exit(1 if bad else 0)
