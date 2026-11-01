# Ancient Echoes transcriptions (Cole) - Music School step 2
One file per tune: `tools/songbook_src/<family>/<id>.txt`, family = slyte | whimber | twitchel, id = the canonical ids in
`px/songbook/manifest.json` (e.g. `slyte/hall_mountain_king.txt`). The format is in the header of `tools/build_songbook.py`
(`id/title/composer/home/meter/bpm/mood/skills/min_ml/source/prov_status`, `echo:` lines, one `child:` line per phrase).

Drop-in (one command, from echo-app/): `bash tools/songbook_dropin.sh`
  = build the tunes.json "songbook" block, render any missing note samples (fa/ti/half-steps) into music/notes/, run tools/test-songbook.js,
    and refresh the cache-bust stamps. edition_check tunes are held back automatically (listed, never shipped).
