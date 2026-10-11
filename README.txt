Project Echo — mobile-web prototype v2 (spec v0.3: Slyte the fox Echo & Whimber the owl Echo)
Live: https://dgnm82.github.io/echo-app/
Run locally: python3 -m http.server 8765 in this folder, then visit http://localhost:8765/ (dialogue JSON is loaded with fetch, so file:// won't work).
Files: art.js (SVG creatures, backgrounds, expressions), dialogue.js (engine), dialogue/*.json (lines), DIALOGUE_SCHEMA.md, game.js, config.js (tunables), style.css.
Playtest tools: the "dev" button at top-left.
Guardrail lint: node tools/lint-dialogue.js [dialogue dir or files] [--js game.js] [--strict]. It exits with code 1 on any guardrail error. Voice-style findings are warnings.
Privacy: the child's feelings are never saved (legacy data is purged on load). Text-to-speech uses on-device voices only, and stays silent if there are none.
