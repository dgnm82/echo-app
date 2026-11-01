# TEST FIXTURE ONLY: not real tunes, never shipped
These two files only exercise `tools/build_songbook.py`, `tools/test-songbook.js` and `tests/phone_songbook_test.py` until Cole's
transcriptions arrive in `tools/songbook_src/`. The melodies are plain scale walks on the Howlings pads, not any composer's tune.
`fixture_steps` is "ok" (so the Ancient Echo flow can be played in tests); `fixture_held` is `edition_check` (it must be held back).
Built into `tools/fixtures/songbook_fixture.json` with:
  python3 tools/build_songbook.py --src tools/fixtures/songbook_src --out tools/fixtures/songbook_fixture.json --fixture --include-held
