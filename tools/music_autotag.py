#!/usr/bin/env python3
"""Music School Phase 1 step 4: propose a "music" tag for real listening moments in dialogue/*.json.

Writes PROPOSALS for Cole to review; it never edits the corpus. Plain purr / hum / sing-along filler is not a
listening moment and is not proposed. Care / calm / goodbye keys are skipped (the ranker never plays music there).

  python3 tools/music_autotag.py                 # -> tools/music_tags/proposals.json (+ review copy for Cole)
  python3 tools/music_autotag.py --out FILE

Each item: {file, key, i, text, tag, why, accept:null}. Cole sets accept true/false (or changes tag) and the drop-in
(tools/apply_music_tags.py) writes "music" onto accepted lines.
"""
import json, os, re, sys, datetime
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TAGS = ['pulse','highlow','loudsoft','fastslow','timbre','contour','rhythm','mood','form','song']
CARE = re.compile(r"^(fed|feed|full|eat|food_|pet$|pet_|sit$|nap|sleep|not_sleepy|need_(hungry|sleepy|cuddly)|after_hug|found_(nap|lullaby|curl)|wake_up|tuck|sad|feel|comfort|hug|calm|farewell|goodbye|thanks|last_call|time_to_go|two_goodbyes|keepsake|ui_)")
# a listening anchor: the line is about hearing / music, not just making a cat or bird noise
ANCHOR = re.compile(r"\b(listen\w*|hear\w*|heard|ears?|sound\w*|notes?|songs?|tunes?|melod\w*|music\w*|beats?|rhythm\w*|drum\w*|chime\w*|whistl\w*|sing\w*|sang|echo(es|ed)?|pitch\w*|loud\w*|quiet\w*|softly|tempo)\b", re.I)
RULES = [  # (tag, regex, why) - first match wins, most specific first
 ('highlow',  re.compile(r"\b(high|low|higher|lower|highest|lowest)\b[^.!?]{0,20}\b(notes?|sounds?|voice|squeak|chime|tune|song|pitch)|\b(notes?|sounds?|voice|pitch)\b[^.!?]{0,12}\b(high|low|higher|lower)\b|\bup high\b.*\bdown low\b|\bsqueaky\b|\brumbl\w*", re.I), 'high / low sound'),
 ('contour',  re.compile(r"\b(goes|went|going|climb\w*|slid\w*|jump\w*|float\w*|step\w*)\s+(up|down)\b[^.!?]{0,20}\b(notes?|tune|song|melody)|\b(notes?|tune|song|melody)\b[^.!?]{0,20}\b(goes|went|going|climb\w*|slid\w*)\s+(up|down)\b|\bup and down\b", re.I), 'melody moves up / down'),
 ('loudsoft', re.compile(r"\b(loud\w*|quiet\w*|soft(ly|er)?|hush\w*|whisper\w*|booming)\b[^.!?]{0,14}\b(sounds?|noises?|notes?|tune|song|music|voice|listen\w*)\b|\b(sounds?|noises?|notes?|tune|song|music|voice)\b[^.!?]{0,14}\b(loud\w*|quiet\w*|soft(ly|er)?|hush\w*|booming)\b", re.I), 'loud / soft'),
 ('fastslow', re.compile(r"\b(fast|slow|quick|zippy|speedy|sleepy-slow)\w*\b[^.!?]{0,16}\b(song|tune|beat|music|notes?|tempo|rhythm|drum)|\b(song|tune|beat|music|notes?|tempo|rhythm)\b[^.!?]{0,16}\b(fast|slow|quick|zippy|speed\w*)\b|\btempo\b", re.I), 'fast / slow'),
 ('pulse',    re.compile(r"\b(beats?|tick-tock|thump\w*|clap\w*|pulse|in time|stomp\w*|drum\w*|heartbeat)\b", re.I), 'steady beat'),
 ('rhythm',   re.compile(r"\b(rhythm\w*|pattern|da-dum|ba-dum|ta-ta|long-short|short-long)\b", re.I), 'rhythm pattern'),
 ('form',     re.compile(r"\b(again|comes? back|came back|repeat\w*|same part|same bit|once more|echo(es|ed)? back|my turn|your turn)\b", re.I), 'part returns / turns'),
 ('mood',     re.compile(r"\b(happy|sad|sleepy|brave|cozy|gentle|bouncy|dreamy|spooky|calm)\b[^.!?]{0,14}\b(song|tune|music|notes?|sound)\b|\b(song|tune|music|sounds?)\b[^.!?]{0,10}\b(happy|sad|sleepy|brave|cozy|bouncy|dreamy)\b", re.I), 'how music feels'),
 ('timbre',   re.compile(r"\bsounds? like\b|\bsound of\b|\b(hear\w*|heard|listen\w*)\b[^.!?]{0,24}\b(chime\w*|jingl\w*|clink\w*|twang\w*|plink\w*|ding\w*|bells?|whistl\w*|rustl\w*|crunch\w*|splash\w*|drip\w*)\b", re.I), 'what makes the sound'),
 ('song',     re.compile(r"\b(songs?|tunes?|melod\w*|music)\b", re.I), 'a song / tune'),
]
TEMPLATE = re.compile(r"wings fluttered|beak hums|\bhums (a|by)\b|sniff the|purred a purr-pad|ears twitch at", re.I)   # look_* / time_* fill-ins, not listening
FILLER = re.compile(r"^\W*(purr+|mrr+p?|hum+|hmm+|la+|tra-la|prrr+)\b", re.I)

def tag_for(text):
    t = re.sub(r"\{[^}]*\}", " ", text or '')
    if not ANCHOR.search(t): return None, None
    if FILLER.match(t) and len(t.split()) < 4: return None, None
    if TEMPLATE.search(t): return None, None
    for tag, rx, why in RULES:
        if rx.search(t): return tag, why + ' (matched "%s")' % rx.search(t).group(0)
    return None, None

def items_for(fn, d):
    out = []
    for key, pool in d.get('barks', {}).items():
        if CARE.match(key): continue
        for i, l in enumerate(pool or []):
            if l.get('music') or not isinstance(l.get('text'), str): continue
            tag, why = tag_for(l['text'])
            if tag: out.append({'file': fn, 'key': key, 'i': i, 'text': l['text'], 'tag': tag, 'why': why, 'accept': None})
    return out

def main():
    out = os.path.join(ROOT, 'tools', 'music_tags', 'proposals.json')
    if '--out' in sys.argv: out = sys.argv[sys.argv.index('--out') + 1]
    items, per = [], {}
    for f in ('shared', 'slyte', 'whimber', 'twitchel'):
        p = os.path.join(ROOT, 'dialogue', f + '.json')
        d = json.load(open(p, encoding='utf-8'))
        its = items_for(f + '.json', d); items += its
        total = sum(len(v) for k, v in d['barks'].items() if not k.startswith('ui_'))
        per[f] = {'proposed': len(its), 'bark_lines': total, 'by_tag': {t: sum(1 for x in its if x['tag'] == t) for t in TAGS}}
    doc = {'_about': 'Music Phase 1 step 4: auto-tagger PROPOSALS (tools/music_autotag.py). Not applied to the corpus. '
                      'Cole: set accept true/false per item (or change tag to one of TAGS); save as cole_out/step4/music_tags_reviewed.json; '
                      'then tools/step4_dropin.sh applies the accepted tags in one command.',
           'generated': datetime.date.today().isoformat(), 'tags': TAGS, 'summary': per, 'items': items}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(doc, open(out, 'w', encoding='utf-8'), indent=1, ensure_ascii=False); open(out, 'a').write('\n')
    print(f"{len(items)} proposals -> {os.path.relpath(out, ROOT)}")
    for f, v in per.items(): print(f"  {f}: {v['proposed']}/{v['bark_lines']}  {v['by_tag']}")

if __name__ == '__main__': main()
