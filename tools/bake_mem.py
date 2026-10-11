#!/usr/bin/env python3
"""Shiny Pairs (Memory, game spec v0.3 §1) card art for Slyte: 36x48 cards (back, faces, pair glow, 2-frame flip),
taken from Cole's game_mocks.py card functions so the look matches the spec sheet."""
import sys
sys.path.insert(0, '/workspace/echo/style_research/src')
from PIL import Image as _I
_save = _I.Image.save
_I.Image.save = lambda self, fp, *a, **k: None if '/game_design/' in str(fp) else _save(self, fp, *a, **k)  # never touch Cole's mocks
src = open('/workspace/echo/game_design/src/game_mocks.py').read()
exec(src[:src.index('def memory_mock(')])
_I.Image.save = _save
OUT = 'px/mem'
for sp in ('slyte', 'whimber'):
    card_back(sp).save(f'{OUT}/{sp}_back.png')
    card_flip(sp, None, k=.55).save(f'{OUT}/{sp}_flip_back.png')
    for it in DECK[sp] + ['token_' + sp]:
        nm = sp + '_token' if it.startswith('token') else it
        card_face(sp, it).save(f'{OUT}/{sp}_{nm}.png'); card_face(sp, it, glow=True).save(f'{OUT}/{sp}_{nm}_glow.png')
        card_flip(sp, it, k=.2, face=True).save(f'{OUT}/{sp}_{nm}_flip.png')
    ITEMS['leaf'].save('px/i_leaf.png')
print('memory cards ok', DECK['slyte'])
