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
