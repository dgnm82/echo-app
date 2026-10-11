# Echo dialogue schema (v2)

Files: `dialogue/shared.json` (lines either species can use), `dialogue/slyte.json`, `dialogue/whimber.json`.
At startup the engine (`dialogue.js`) loads shared + the species file. Species barks override shared barks with the same key; conversations from both files are pooled.

## Top level
```json
{ "version": 2, "species": "slyte", "vars": {}, "barks": { "<key>": [Line, ...] }, "conversations": [Conversation, ...] }
```

## Line (bark)
One-shot line picked at random (weighted) from the pool for a key, after filtering by `cond`.
```json
{ "text": "Psst! Hi {child}!", "expr": "excited", "react": "happy", "cond": { "bondMin": 140 }, "weight": 2 }
```
- `expr`: facial expression cue. One of `neutral, happy, excited, eating, love, curious, surprised, sleepy, sad`.
- `react`: optional body animation. One of `happy, excited, pet, eat, sad, sleepy`.
- `lintAllow`: optional list of lint rule ids allowed on this line, node or choice (see tools/lint-dialogue.js).
- `privacy: "feelings…"` on a conversation: the lint then rejects any memory or variable writes in it. Feelings answers are never stored.
- Keys the game uses: hello, grace_hello, last_day, ready_hint, ask_ready, stay_more, reveal, reveal_reply, fed, fed_fav, full, pet, sit, nap, napping, not_sleepy, game_tired, game_end, talent_<Talent Name>, first_gift, favplace, trust, hunt_*/camo_*/seek_* (Slyte), sky_* (Whimber), release_invite, release_forced, hug_more, walk_memory, walk_end, gift_ask, gift_got, goodbye_ask, farewell, look_back.

## Conversation (multi-turn)
```json
{ "id": "slyte_hide_anywhere", "trigger": "idle", "weight": 2, "once": false, "cond": { "bondMin": 60 },
  "start": "a",
  "nodes": {
    "a": { "say": "Where would you hide?", "expr": "curious",
           "choices": [ { "icon": "🌳", "label": "In a tree", "reply": "Smart!", "expr": "happy",
                          "set": { "hideSpot": "a tree" }, "goto": "b" } ] },
    "b": { "branch": [ { "cond": { "var": { "hideSpot": "a tree" } }, "goto": "c" } ], "next": "d" },
    "c": { "say": "Up high, {var:hideSpot}!", "expr": "excited", "next": "d", "wait": 2500 },
    "d": { "say": "I'll remember.", "memory": "You told me you'd hide in {var:hideSpot}", "memoryTag": "hide_spot", "bond": 2 }
  } }
```
- `trigger`: when the game asks for one. Only `idle` (the "little moment" after a care action) is used right now.
- `once`: never repeat it after it has been seen. Conversations not yet seen are always preferred.
- Node fields:
  - `say` + `expr` + `react`: the line and how it's delivered.
  - `choices`: 2–4 items, each `{icon, label, cond?, reply?, expr?, react?, set?, memory?, memoryTag?, bond?, goto?}`. Choices whose `cond` fails are hidden. A choice with no `goto` ends the conversation after its `reply`.
  - `next` + `wait` (ms): move on automatically when there are no choices.
  - `branch`: a list of `{cond, goto}`; the first match wins, otherwise `next`.
  - `set` / `memory` / `memoryTag` / `bond`: effects applied when the node or choice runs.
- Choices are tap-to-hear, tap-again-to-choose, and never timed.

## Conditions (`cond`, all optional, AND-ed)
`mood: ["happy","ok","sad","sleep"]`, `bondMin`, `bondMax`, `stageMin`, `stageMax` (1–9), `time: ["morning","day","evening","night"]`, `talent: "Radar Ears"`, `hasMemory` / `notMemory` (memoryTag), `var: {k: v}`, `varSet: "k"`, `varUnset: "k"`, `notSeen: "<conversation id>"`, `any: [cond, ...]` (OR).

## Text substitution
`{name} {child} {fav} {treasure} {place} {release} {trust} {quirk} {token} {gift} {memory}`, plus per-call values (`{spot} {hint} {guess} {constellation}`), `{var:key}` for a conversation variable, and `{pick:a|b|c}` for a random choice.
Variables, memory tags and seen conversations are saved with the Echo (`S.vars`, `S.memTags`, `S.seen`).
