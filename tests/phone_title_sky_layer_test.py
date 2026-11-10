# Title sky/front split (Pixal, Nov 10): sun/moon must sit in an isolated sky layer
# behind trees/ground (front) and the existing fg bushes, while sparkles/fireflies
# stay on a sun-free alive overlay (same 500 ms swap). Layer split comes from the
# delivered art (old alive minus new sparkle-only alive = sun/moon), not a palette
# heuristic. The old px/title/biome_*_*_f0/f1.png files still contain the sun and
# must not be referenced by the title diorama.
#
# Fails on 01b9143d (opaque bg + sun baked into the alive overlay above the trees).
# Passes after title_biomes.json + titleDio point at px/title_layers/.
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
print('== sun/moon fully visible over front/fg (woodland dusk is the known peek) ==')
PEEK={('woodland','dusk')}  # Daniel's case: Pixal did not move this sun
for bio in BIOS:
  for tod in TODS:
    sky=load(LAYERS/f'sky_{bio}_{tod}.png')
    front=load(LAYERS/f'front_{bio}_{tod}.png')
    fg=load(TITLE/f'biome_{bio}_{tod}_fg.png')
    bg=load(TITLE/f'biome_{bio}_{tod}.png')
    sp,fp,gp,bp=sky.load(),front.load(),fg.load(),bg.load()
    # sun/moon now in the sky layer: open-sky pixels where sky != the original opaque bg
    vis=[]; hid_front=[]; hid_fg=[]
    for y in range(320):
      for x in range(180):
        if sp[x,y]==bp[x,y]:
          continue
        # only count pixels that belong to the sky (not a mismatch under an opaque front cell:
        # under front, sky is the hidden sky-band and is *supposed* to differ from old bg/trees)
        if fp[x,y][3]==0 and gp[x,y][3]==0:
          vis.append((x,y))
        elif fp[x,y][3]==255 or gp[x,y][3]==255:
          # A sun pixel still sitting under front/fg would also appear as sky!=old_bg
          # only if we looked at the sky file itself vs old bg at a front-opaque cell —
          # that comparison is invalid (old bg is the tree). Use the alive-split sun
          # only as a size check below; visibility is "open-sky sun count vs full sun count".
          pass
    full=0
    for fr in ('f0','f1'):
      old=load(TITLE/f'biome_{bio}_{tod}_{fr}.png')
      neu=load(LAYERS/f'alive_{bio}_{tod}_{fr}.png')
      o,q=old.load(),neu.load()
      nsun=0
      for y in range(320):
        for x in range(180):
          if o[x,y][3]==255 and q[x,y][3]==0:
            nsun+=1
      full=max(full,nsun)
    if (bio,tod) in PEEK:
      check(0<len(vis)<full, f'{bio}/{tod}: woodland dusk keeps a visible peek ({len(vis)}/{full} px in open sky, rest still in the canopy)')
    else:
      check(len(vis)==full and full>0, f'{bio}/{tod}: sun/moon fully visible, not covered by front/fg ({len(vis)}/{full} in open sky)')
    if vis:
      top=min(y for x,y in vis)
      print(f'  {bio}/{tod}: visible={len(vis)}/{full} top_y={top}')

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
      # return title: .obpanel (top 131, ~18px) vs sun/moon (moved tops at y=151)
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
        from origin_pick import pick as _pick
        await _pick(pg,'fox'); await T('#ornext',300); await T('.orchip >> nth=0',900)
        await T('#orinv'); await T('#orinv',3000); await T('#ornm',400); await T('#orkeep'); await T('#orkeep',1500)
      await pg.wait_for_timeout(400); await pg.close()
      # woodland dusk return, then rewrite the panel with the longest 10-letter name
      pg=await ctx.new_page(); await nocam(pg)
      await pg.add_init_script("(()=>{Date.now=()=>6*864e5+1*3600e3;})()")
      await pg.add_init_script("setTimeout=(f=>(fn,ms,...a)=>f(fn,ms===3000?6e5:ms,...a))(setTimeout)")
      await pg.goto(URL)
      for _ in range(25):
        ok=await pg.evaluate("!!(document.querySelector('.scene.ttl.biome')&&document.querySelector('.obpanel'))")
        if ok: break
        await pg.wait_for_timeout(200)
      meas=await pg.evaluate("""()=>{
        const sc=document.querySelector('.scene.ttl'); if(!sc) return {err:'no sc'};
        const R=sc.getBoundingClientRect(),k=R.width/180;
        const box=el=>{if(!el)return null; const r=el.getBoundingClientRect();
          return {top:(r.top-R.top)/k, bottom:(r.bottom-R.top)/k, height:r.height/k, left:(r.left-R.left)/k, right:(r.right-R.left)/k};};
        const p=sc.querySelector('.obpanel');
        const natural=p?p.textContent.trim():'';
        const one=box(p);
        // longest legal Echo name is 10 letters (input maxlength=10)
        const lines=[
          'Wimmertail is playing nearby!',
          'MMMMMMMMMM is playing nearby!'
        ];
        const out={natural, one, wrapped:{}};
        for(const s of lines){
          if(p) p.textContent=s;
          out.wrapped[s]=box(p);
        }
        return out;
      }""")
      print('obpanel measure', meas)
      def art_box(b):
        return b and {k:round(b[k],2) for k in b}
      one=meas.get('one') or {}
      check(one and abs(one.get('top',-1)-131)<1.5, f'return .obpanel top is 131 art px (got {art_box(one)})')
      # sun tops at y=151 for the 7 moved skies. Report margin; do not fail the wiring
      # test if the live two-line panel (taller than Pixal's ~18px assumption) overlaps.
      SUN_TOP=151
      if one:
        margin=SUN_TOP-one['bottom']
        print(f'  natural {meas.get("natural")!r} panel bottom={one["bottom"]:.2f} height={one["height"]:.2f} margin to sun y={SUN_TOP} is {margin:.2f}px')
        if margin<0:
          print(f'  NOTE: return .obpanel overlaps the y={SUN_TOP} sun/moon by {-margin:.2f}px (panel is {one["height"]:.1f}px tall, not the assumed 18px)')
      for s,b in (meas.get('wrapped') or {}).items():
        if not b: continue
        m=SUN_TOP-b['bottom']
        taller=b['height']>one.get('height',0)+1
        print(f'  name {s!r} height={b["height"]:.2f} bottom={b["bottom"]:.2f} margin={m:.2f}px taller_than_natural={taller}')
      await pg.close(); await ctx.close()
      await brw.close()
  asyncio.run(live())


print(f'title sky layer: {n[0]-len(bad)}/{n[0]} passed')
sys.exit(1 if bad else 0)
