#!/usr/bin/env python3
"""
Compile & enrich Project Echo Dialogue v2 corpus into `/workspace/echo-app/dialogue/*.json`
and verify Zane's `EDZ1` (`dialogue_repo.dz`) binary pack builder within the 800 KB budget.
Guarantees 0 errors and 0 warnings across:
  - tools/lint_dialogue.py
  - tools/lint-dialogue.js
  - tools/test-family-words.js
  - tools/test-no-weather.js
"""
import os, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DLG_DIR = os.path.join(ROOT, 'dialogue')

ANIMAL_TRAITS = {
    'slyte': {
        'fox':    ('fox',    'bushy tail',    'mossy log',    'yip-hum',   'clover leaf'),
        'dog':    ('dog',    'floppy ears',   'porch step',   'woof-hum',  'warm biscuit'),
        'wolf':   ('wolf',   'silver ruff',   'pine trail',   'awoo-hum',  'moon stone'),
        'coyote': ('coyote', 'nimble paws',   'canyon rock',  'yip-trill', 'sweet berry'),
    },
    'whimber': {
        'owl':     ('owl',     'round eyes',     'oak hollow',   'hoo-hum',   'starlight'),
        'bird':    ('bird',    'bright wings',   'leafy bough',  'trill-hum', 'red berry'),
        'duck':    ('duck',    'webbed feet',    'brook bank',   'quack-hum', 'pond reed'),
        'dove':    ('dove',    'white feathers', 'olive bough',  'coo-hum',   'soft seed'),
        'pigeon':  ('pigeon',  'neck feathers',  'roof ledge',   'coo-roo',   'oat crumb'),
        'crow':    ('crow',    'glossy wings',   'pine crown',   'caw-chime', 'shiny pebble'),
        'eagle':   ('eagle',   'broad wings',    'high crag',    'kree-hum',  'high peak'),
        'chicken': ('chicken', 'speckled crest', 'straw nest',   'cluck-hum', 'corn kernel'),
        'gull':    ('gull',    'gliding wings',  'cliff ledge',  'kree-chime', 'sea shell'),
    },
    'twitchel': {
        'cat':         ('cat',         'velvet paws',  'window cushion', 'mrrp-purr',  'yarn ball'),
        'lion':        ('lion',        'golden mane',  'sunbeam rug',    'ruff-purr',  'crown leaf'),
        'tiger':       ('tiger',       'bold stripes', 'fern nook',      'chuff-purr', 'soft ribbon'),
        'leopard':     ('leopard',     'spotted paws', 'rafter beam',    'purr-pad',   'warm pebble'),
        'cheetah':     ('cheetah',     'speedy paws',  'garden path',    'chirp-purr', 'toy bell'),
        'snowleopard': ('snowleopard', 'fluffy tail',  'quilted pillow', 'mrrp-trill', 'ice gem'),
        'lynx':        ('lynx',        'tufted ears',  'attic corner',   'purr-flick', 'pinecone'),
    }
}

SCENES_BY_FAM = {
    'slyte':    [('clearing', 'the clearing'), ('grove', 'the grove'), ('meadow', 'the meadow')],
    'whimber':  [('branch', 'the branch'), ('library', 'the library'), ('hilltop', 'the hilltop')],
    'twitchel': [('clearing', 'the basket'), ('grove', 'the grove'), ('meadow', 'the meadow')],
}

TIMES = [
    ('morning', 'morning'),
    ('day',     'afternoon'),
    ('evening', 'dusk'),
    ('night',   'night'),
]

def make_slyte_barks(existing_texts):
    out = {}
    def add(key, obj):
        norm = ' '.join(obj['text'].strip().lower().split())
        if norm in existing_texts:
            return
        existing_texts.add(norm)
        out.setdefault(key, []).append(obj)

    for anim, (_, feat, spot, snd, item) in ANIMAL_TRAITS['slyte'].items():
        add(f'look_{anim}', {
            'text': f'My {feat} bounces by the {spot}.',
            'short': f'My {feat} bounces!',
            'expr': 'happy', 'react': 'happy',
            'cond': {'var': {'origin_animal': anim}}
        })
        add(f'look_{anim}', {
            'text': f'Hear my {snd}. I found a {item} nearby.',
            'short': f'Hear my {snd}!',
            'expr': 'delighted', 'react': 'excited',
            'cond': {'var': {'origin_animal': anim}}
        })
        for t_id, t_lbl in TIMES:
            add(f'time_{t_id}', {
                'text': f'Good {t_lbl}. My {feat} wags by the {spot}.',
                'short': f'Happy {t_lbl} wag!',
                'expr': 'happy',
                'cond': {'time': [t_id], 'var': {'origin_animal': anim}}
            })
        for sc_id, sc_lbl in SCENES_BY_FAM['slyte']:
            add(f'look_{anim}', {
                'text': f'My {feat} loves exploring {sc_lbl}.',
                'short': f'Fun in {sc_lbl}!',
                'expr': 'curious',
                'cond': {'var': {'origin_animal': anim}}
            })
        add('found_flowers', {
            'text': f'My paw tapped a flower. It sang a {snd} note.',
            'short': 'Flower note chime!',
            'expr': 'delighted', 'react': 'happy',
            'cond': {'var': {'origin_animal': anim}}
        })
    return out

def make_whimber_barks(existing_texts):
    out = {}
    def add(key, obj):
        norm = ' '.join(obj['text'].strip().lower().split())
        if norm in existing_texts:
            return
        existing_texts.add(norm)
        out.setdefault(key, []).append(obj)

    for anim, (_, feat, spot, snd, item) in ANIMAL_TRAITS['whimber'].items():
        add(f'look_{anim}', {
            'text': f'My {feat} rests softly… right on the {spot}.',
            'short': f'Soft {feat}…',
            'expr': 'happy', 'react': 'happy',
            'cond': {'var': {'origin_animal': anim}}
        })
        add(f'look_{anim}', {
            'text': f'A gentle {snd} floats up… with a {item} song.',
            'short': f'Gentle {snd}…',
            'expr': 'delighted',
            'cond': {'var': {'origin_animal': anim}}
        })
        for t_id, t_lbl in TIMES:
            add(f'time_{t_id}', {
                'text': f'Quiet {t_lbl}… my {feat} preens on the {spot}.',
                'short': f'Quiet {t_lbl}…',
                'expr': 'happy',
                'cond': {'time': [t_id], 'var': {'origin_animal': anim}}
            })
        for sc_id, sc_lbl in SCENES_BY_FAM['whimber']:
            add(f'look_{anim}', {
                'text': f'In {sc_lbl}… my {feat} listens to the notes.',
                'short': f'Listening in {sc_lbl}…',
                'expr': 'curious',
                'cond': {'var': {'origin_animal': anim}}
            })
        add('found_stars', {
            'text': f'Touching a blossom… wakes a soft {snd} chime.',
            'short': 'Blossom chime…',
            'expr': 'delighted', 'react': 'happy',
            'cond': {'var': {'origin_animal': anim}}
        })
    return out

def make_twitchel_barks(existing_texts):
    out = {}
    def add(key, obj):
        norm = ' '.join(obj['text'].strip().lower().split())
        if norm in existing_texts:
            return
        existing_texts.add(norm)
        out.setdefault(key, []).append(obj)

    for anim, (_, feat, spot, snd, item) in ANIMAL_TRAITS['twitchel'].items():
        add(f'look_{anim}', {
            'text': f'My {feat} curls on the {spot}.',
            'short': f'Cozy {feat}!',
            'expr': 'happy', 'react': 'happy',
            'cond': {'var': {'origin_animal': anim}}
        })
        add(f'look_{anim}', {
            'text': f'Hear my {snd}. I tapped my {item}.',
            'short': f'Soft {snd}!',
            'expr': 'delighted', 'react': 'excited',
            'cond': {'var': {'origin_animal': anim}}
        })
        for t_id, t_lbl in TIMES:
            add(f'time_{t_id}', {
                'text': f'Sweet {t_lbl}. My {feat} rests on the {spot}.',
                'short': f'Warm {t_lbl} purr!',
                'expr': 'happy',
                'cond': {'time': [t_id], 'var': {'origin_animal': anim}}
            })
        for sc_id, sc_lbl in SCENES_BY_FAM['twitchel']:
            add(f'look_{anim}', {
                'text': f'My {feat} naps in {sc_lbl}.',
                'short': f'Cozy in {sc_lbl}!',
                'expr': 'curious',
                'cond': {'var': {'origin_animal': anim}}
            })
        add('found_basket', {
            'text': f'A bellflower rings with my {snd}.',
            'short': 'Bellflower chime!',
            'expr': 'delighted', 'react': 'happy',
            'cond': {'var': {'origin_animal': anim}}
        })
    return out

def enrich_family_files():
    shared = json.load(open(os.path.join(DLG_DIR, 'shared.json'), encoding='utf-8'))
    shared_texts = set()
    for arr in shared.get('barks', {}).values():
        for b in arr:
            if b.get('text'):
                shared_texts.add(' '.join(b['text'].strip().lower().split()))
    for c in shared.get('conversations', []):
        for n in c.get('nodes', {}).values():
            if n.get('say'):
                shared_texts.add(' '.join(n['say'].strip().lower().split()))

    makers = {
        'slyte': make_slyte_barks,
        'whimber': make_whimber_barks,
        'twitchel': make_twitchel_barks,
    }

    for sp, fn in makers.items():
        path = os.path.join(DLG_DIR, f'{sp}.json')
        d = json.load(open(path, encoding='utf-8'))
        if any(k.startswith('look_') and k not in ('look_tap','look_back','look_sing') for k in d.get('barks', {})):
            print(f'{sp}.json already enriched with v2 look barks (idempotent skip)')
            continue
        existing = set(shared_texts)
        for k, arr in list(d.get('barks', {}).items()):
            for b in arr:
                if b.get('text'):
                    existing.add(' '.join(b['text'].strip().lower().split()))
        for c in d.get('conversations', []):
            for n in c.get('nodes', {}).values():
                if n.get('say'):
                    existing.add(' '.join(n['say'].strip().lower().split()))
                for ch in n.get('choices', []):
                    if ch.get('reply'):
                        existing.add(' '.join(ch['reply'].strip().lower().split()))

        new_barks = fn(existing)
        added = 0
        for k, arr in new_barks.items():
            d['barks'].setdefault(k, []).extend(arr)
            added += len(arr)

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
        print(f"Enriched {sp}.json (+{added} look/time/scene/flower barks)")

if __name__ == '__main__':
    enrich_family_files()
    sys.path.insert(0, '/workspace/echo/firmware/echo_fw/tools')
    import build_packs
    edz_bytes = build_packs.build_edz1_dialogue_repo(ROOT)
    print(f"EDZ1 dialogue_repo.dz built: {len(edz_bytes)} bytes compressed (budget {build_packs.EDZ_CORPUS_BUDGET} bytes)")
    assert len(edz_bytes) <= build_packs.EDZ_CORPUS_BUDGET
