#!/usr/bin/env python3
"""Cache-busting: stamp every local <script src> / <link href> in index.html and handheld.html with ?v=<content hash>,
so phones pick up a new build on the next load (GitHub Pages serves max-age=600; home-screen web apps can hold files longer).
Run before each commit (tools/check.sh runs it with --check and fails if a stamp is stale)."""
import hashlib, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
stale = []
for page in ('index.html', 'handheld.html'):
  p = os.path.join(ROOT, page); s = open(p).read()
  def stamp(m):
    attr, f = m.group(1), m.group(2)
    fp = os.path.join(ROOT, f)
    if not os.path.exists(fp): return m.group(0)
    h = hashlib.md5(open(fp, 'rb').read()).hexdigest()[:8]
    return f'{attr}="{f}?v={h}"'
  n = re.sub(r'(src|href)="([A-Za-z0-9_./-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"', stamp, s)
  if n != s:
    stale.append(page)
    if '--check' not in sys.argv: open(p, 'w').write(n)
if '--check' in sys.argv and stale: print('STALE cache-bust stamps in', stale, '- run python3 tools/bust.py'); sys.exit(1)
print('cache-bust', 'ok' if not stale else 'stamped ' + ', '.join(stale))
