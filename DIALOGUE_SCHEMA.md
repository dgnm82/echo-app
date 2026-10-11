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
- `expr`: facial expression cue. The 13 Overhaul expressions are `neutral, happy, delighted, curious, thinking, surprised, giggling, proud, shy, sleepy, wistful, sad` (gentle sad) and `concentrating`. `excited`, `eating` and `love` are also accepted.
- `react`: optional body animation. One of `happy, excited, pet, eat, sad, sleepy`.
- `lintAllow`: optional list of lint rule ids allowed on this line, node or choice (see tools/lint-dialogue.js).
- `privacy: "feelings…"` on a conversation: the lint then rejects any memory or variable writes in it. Feelings answers are never stored.
- Keys the game uses: hello, grace_hello, last_day, ready_hint, ask_ready, stay_more, reveal, reveal_reply, fed, fed_fav, full, pet, sit, nap, napping, not_sleepy, game_tired, game_end, talent_<Talent Name>, first_gift, favplace, trust, hunt_*/camo_*/seek_* (Slyte), sky_* (Whimber), release_invite, release_forced, hug_more, walk_memory, walk_end, gift_ask, gift_got, goodbye_ask, farewell, look_back.

### Situational and ambient keys (v3, wired)
- `time_morning`, `time_day`, `time_evening`, `time_night`: the opener after the greeting, picked by device clock (morning before 11:00, day before 17:00, evening before 20:00, night after). Shared and species pools are combined.
- `ambient`: an unprompted remark on Home every 25–60 s (`CONFIG.ambientMin/Max`) when nothing else is showing. About 1 in 4 of these tries a callback first.
- `tangent`: an interruption inserted at most once per conversation, on an auto-advance beat. The chance is 10–30%, scaled by the Echo's Playfulness.
- `callback`: memory-driven lines. Each line's `cond.hasMemory` tags must be at least `CONFIG.callbackMinAgeHours` (24) old, and each memory is used for at most 3 callbacks. Callbacks are offered at the after-care moment (max 1 per session) and inside ambient chatter. A tag's age is recorded the first time a conversation writes it (`S.memTagAt`).

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

## Engine v3 additions
- **Kid-reply pools** (`shared.json` → `replyPools`, `intentMap`): a choice can carry `"intent"`. A label of `"@pool:<intent>"`, or a generic label listed in `intentMap` (e.g. "Yes!", "(just listen)"), is swapped for a fresh phrasing each time it's shown. The least-recently-used phrasing is chosen, with no duplicates in one menu. Intents: yes, no, unsure, listen, nod, giggle, ask_more, later, wow, silly.
- **Fallbacks**: barks `fallback_<intent>` and `fallback_any`. They're used when a choice has neither `reply` nor `goto`, or when a `goto` points nowhere.
- **Carry-on**: if no reply comes within `CONFIG.carryOnSeconds` (45), the Echo says a `carry_on` line and continues through the `listen` choice if there is one, otherwise it ends gently. Any tap restarts the timer.
- **Drift / lost thought**: after a conversation, about 1 in 8 end with a `lost_thought` line. Otherwise there's a chance to drift (0.6, then 0.3, then 0) via a `drift_bridge` line into a conversation on a linked topic. Topics are linked by species `topicGroups`; a conversation's topic is `conv.topic` or the second id segment. Drift counts toward the 2-conversations-per-session limit.
- **No-repeat**: an exact bark line isn't reused within 7 days (24 h for core reaction keys). When every line is recent, the least-recently-used one is picked. A topic isn't offered again within 5 days. Stored in `S.dlg`.
- **Persona** (species `persona`): 8 `petPhrases` and 6 invented `words`; the Echo's seed picks one of each. `{pet_phrase}` is filled at most once per 10 lines. The game also prepends the pet phrase at approved points (hello, favourite food, game wins, gift). `{word:shiny}` becomes the invented word, and any sibling invented word in a line is replaced with this Echo's word.
