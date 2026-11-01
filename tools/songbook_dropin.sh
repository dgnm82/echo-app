#!/usr/bin/env bash
# Ancient Echoes drop-in (one command, after Cole's files land in tools/songbook_src/<fam>/<id>.txt):
# build the tunes.json "songbook" block (edition_check tunes held back), render missing fa/ti/half-step samples,
# run the gate, refresh the cache-bust stamps. Then review: git status (new music/notes/*), and Cole's ear check of the new renders.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/build_songbook.py
python3 tools/render_songbook_notes.py
node tools/test-songbook.js
python3 tools/bust.py
