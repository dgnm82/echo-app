Project Echo — mobile-web prototype v2 (spec v0.3: Slyte the fox Echo & Whimber the owl Echo)
Live: https://dgnm82.github.io/echo-app/
Run locally: python3 -m http.server 8765 in this folder, then visit http://localhost:8765/ (dialogue JSON is loaded with fetch, so file:// won't work).
Files: art.js (SVG creatures, backgrounds, expressions), dialogue.js (engine), dialogue/*.json (lines), DIALOGUE_SCHEMA.md, game.js, config.js (tunables), style.css.
Playtest tools: the "dev" button at top-left.
Guardrail lint: node tools/lint-dialogue.js [dialogue dir or files] [--js game.js] [--strict]. It exits with code 1 on any guardrail error. Voice-style findings are warnings.
Privacy: the child's feelings are never saved (legacy data is purged on load). Text-to-speech uses on-device voices only, and stays silent if there are none.

PIXEL ART (milestone 1)
- Main game is pixel art per /workspace/echo/style_research/pixel/style_guide.md: 180x320 virtual phone screen scaled by whole
  device pixels (pixel.js), Press Start 2P 8px, 12 fps sprite clock. Slyte sprite sheets (px/slyte_<palette>_f<fluff>.png,
  rows = bond stages 1-5) and backgrounds/icons are baked by tools/bake_pixel.py from the guide's generator.
- Whimber still uses its old vector art (placeholder) in the same 48 px slot until its pixel milestone.
- handheld.html: 60x80 handheld grid view (hardware addendum), 4x on a 240x320 panel.
- No text-to-speech: Echoes chirp. window.Chirp.play(text, kind) is the hook (fires an 'echo-chirp' event; no sound yet).

PIXEL ART — MILESTONE 2 (care + dialogue)
- Slyte sprite sheets now 28 frames x 5 bond stages: idle/blink/ear/tail/happy + eat, pet, curious, shy,
  sleepy, nap (with z's), sad, surprised, think, giggle (tools/bake_pixel.py). Expressions map to looping
  frame sequences and care reactions to one-shot sequences (pixel.js SEQ / REACT).
- Pixel layouts on the 180x320 screen: bond meter, dock, thought bubble, speech bubble with pixel tail,
  one-row-per-option choice sheet, How am I? panel with segmented bars, milestone card, Memory Book chips.
- 26 hand-placed 16x16 icons (px/i_*.png) replace emoji in care/dialogue UI; dialogue choices use their
  reply-intent icon. Dev button moved to the scene corner, tip/toast below it.

PIXEL ART — MILESTONE 3 (Fort Builder, game spec v0.2 §3)
- fort.js: pure falling-blocks engine (no game over; full rows become fort floor rows; 3 rows = a floor; pan-up when
  the stack nears the top, gaps become windows). Levels easy/standard/big-kid per spec. tools/test-fort.js (9 tests).
- Play picker for Slyte: Shiny Pairs (Memory card game, signature, daily +3 bond; replaced Shiny Search per game spec v0.3) and Fort Builder (day 1). Whimber: Night Sky only.
- Controls: phone drag / tap-to-turn / swipe-down + on-screen ◀ ▶ A B; keyboard ←/→, A/Z/↑/Space turn, B/X/Enter drop
  (hold = faster fall). ?board=hh plays the 5x6 handheld board.
- Treehouse fort Home prop grows per finished game (frame → 1 → 2 floors → roof → decorations), opens at bond 140.
- Assets: tools/bake_fort.py -> px/fort/. Phone playthrough: tests/phone_fort_test.py (in check.sh --phone).

PIXEL ART — MILESTONE 4 (arrival, release, postcards)
- Event sheets px/slyte_*_ev.png (tools/bake_events.py): arrival (15 frames, guide 9.2 P0) and release dissolve
  (13 frames, P1 must-ship: hearts, outside-in dissolve with face last, home star). PIXEL.event(el,kind,cb).
- Pixel title/setup card, discover (rustling bush, blinking eyes), arrival on reveal, glowing stepping-stone path
  that grows over the grace days, release walk at night, closure + feelings cards (feelings never saved),
  after-release meadow with pixel mailbox/signs, painted pixel postcards (px/pc_*.png, tools/bake_m4.py),
  Memory Book page with postcard thumbnails. tests/phone_release_test.py runs in check.sh --phone.

SOUND (quick round before milestone 5)
- sound.js + sfx/ (28 mp3s copied from Cole's /workspace/echo/sound_design/samples; no music, shimmer or esp32).
- Echo lines -> species chirp by expression (happy / curious / sleepy; sad+wistful -> sleepy), pet-phrase lines ->
  pet motif. Care: feed eat, hug/pet + sit sparkle, rest nap tuck, Play opens picker (panel sound). UI: choice tap,
  panel open/back (How am I?, Memory Book), bond tick. Cues: arrival + release. Games: Fort Builder move/rotate/land/
  row/floor, Shiny Pairs flip / pair / all-cleared, Radar Ears panned jingle, Night Sky star connect + named chord.
- Web Audio, unlocked on first tap (iOS); core + species sounds preload after unlock, game sounds 1.5 s later.
  Gated by the "Chirp sounds" toggle (dev: Sound on/off). tests/phone_sound_test.py in check.sh --phone.

Shiny Pairs + postcards v0.5 round
- memory.js: Shiny Pairs engine (game spec v0.3 §1): 20 cards / 10 pairs in 4x5 (Easy 12 in 3x4), one board across 3 rounds (pairs 3/6/10, Easy 2/4/6),
  no timer/fail/turn limit, hints after 3 misses (Easy 2, Big-kid none), Big-kid stars, seeded shuffle, handheld cursor (◀ ▶ skip paired, B down a row, A flip).
  First game ever is Easy; auto Easy after 2 slow boards; dev "Pairs level" toggle. Talents: Radar Ears (panned jingle toward the partner after a miss),
  Master of Disguise (hidden Slyte pair in Big-kid). Barks pairs_start/pair/miss/hint/disguise/done; hunt_/seek_/camo_ barks removed.
- Cards baked by tools/bake_mem.py from Cole's game_mocks.py card functions into px/mem/.
- postcards.js: the six Echo_Postcards.docx v0.5 postcards (days 1, 3, 7, 14, 30, 60) for Slyte and Whimber with doc fallbacks; old v0.3 saves migrate
  (days already reached stay delivered). New pixel scenes: log, bramble, sunset, field, stars, library, autumnnight, frost.
- Tests: tools/test-memory.js, tools/test-postcards.js, tests/phone_memory_test.py.
