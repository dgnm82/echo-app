// All tunables in one place (spec §5 / Appendix A). First guesses — change freely.
window.CONFIG = {
  demoSpeed: 1,            // bond multiplier so the full arc is reachable in one sitting (1 = spec values)
  decayPerHour: {food:5, play:4, rest:3, comfort:3},   // needs v2 (NeedsV2.rate is what drains; awake hours only)
  restore: {food:30, foodFav:40, play:15, playFinish:15, rest:50, restFav:60, pet:5, sit:15},
  affection: [{"id": "pet", "kind": "touch", "icon": "✋", "label": {"slyte": "Pet", "whimber": "Pet"}, "pool": "pet"}, {"id": "sit", "kind": "touch", "icon": "🌙", "label": {"slyte": "Sit together", "whimber": "Sit together"}, "pool": "sit"}, {"id": "hug", "kind": "touch", "icon": "🤗", "label": {"slyte": "Hug", "whimber": "Hug"}, "pool": "after_hug"}, {"id": "groom", "kind": "touch", "icon": {"slyte": "👂", "whimber": "🪶"}, "label": {"slyte": "Scratch your ears", "whimber": "Smooth your feathers"}, "pool": "aff_groom"}, {"id": "five", "kind": "play", "icon": {"slyte": "🐾", "whimber": "✨"}, "label": {"slyte": "Paw five!", "whimber": "Wing five!"}, "pool": "aff_five"}, {"id": "wave", "kind": "play", "icon": "👋", "label": {"slyte": "Wave hello", "whimber": "Wave hello"}, "pool": "aff_wave"}, {"id": "hum", "kind": "play", "icon": "🎵", "label": {"slyte": "Hum a song", "whimber": "Hum a song"}, "pool": "aff_hum"}, {"id": "amazing", "kind": "words", "icon": "🌟", "label": {"slyte": "You're an amazing Echo!", "whimber": "You're an amazing Echo!"}, "pool": "aff_amazing"}, {"id": "smile", "kind": "words", "icon": "😄", "label": {"slyte": "You make me smile!", "whimber": "You make me smile!"}, "pool": "aff_smile"}, {"id": "friend", "kind": "words", "icon": "💗", "label": {"slyte": "You're my friend!", "whimber": "You're my friend!"}, "pool": "aff_friend"}],   // affection v2 (handoff/affection_v2/options.json)
  affShow: 3,
  sessionLimits: {feeds:3, games:2, naps:1},
  bond: {feed:3, feedFav:6, round:4, signatureDaily:3, pet:1, sit:5, nap:3, reply:3, hello:5},   // legacy: bond amounts live in needs.js (NeedsV2 bond/perDay/capDay); only bond.hello is passed and needs.js overrides it
  milestones: [
    {bond:20,  id:'name',    label:'First friend sticker'},
    {bond:70,  id:'talent1', label:'Talent 1'},
    {bond:140, id:'place',   label:'Favorite place opens'},
    {bond:210, id:'talent2', label:'Talent 2'},
    {bond:290, id:'trust',   label:'Trust gesture'},
    {bond:370, id:'talent3', label:'Talent 3'},
    {bond:440, id:'talent4', label:'Talent 4 + restless signs'},
    {bond:500, id:'ready',   label:'Ready for the wild'}],
  maxDecayHours: 48, callbackMinAgeHours: 24, carryOnSeconds: 45, maxConversationsPerSession: 2, ambientMin: 25, ambientMax: 60, graceDays: 3,
  foundMinAwayMinutes: 20, livingSpeed: 1,   // living_echo.md: Found vignette after >= 20 min away; wander idle 8-20 s (Slyte) / 10-25 s (Whimber) x livingSpeed
  unlock: {run:70, catch:20, stack:210}, // game spec v0.6 §0: the runner (Meadow Dash / Moonlight Glide) at Talent 1 (bond 70); bond 140 = the home milestone only
  checkins: [[1,'postcard'],[3,'postcard'],[7,'postcard'],[14,'postcard'],[30,'postcard'],[60,'postcard']], // Echo_Postcards.docx v0.5 (postcards.js builds the text)
  napSeconds: 20, sitSeconds: 8, // nap/sit shortened from 120s/20s for demo
};
// Creature profiles (spec v0.3). All spoken text lives in dialogue/*.json.
window.CREATURES = {
  "fox": {
    "name": (typeof window!=="undefined"&&window.FAMILIES)?FAMILIES.slyte.label:"Slyte",   // label lives in families.js
    "title": "The Clever Trickster",
    "badge": "🍃",
    "bg": "fox-bg",
    "foods": [
      "🫐 wild blackberries",
      "🍯 warm honey cakes",
      "🌰 roasted nuts"
    ],
    "neutral": [
      "🍎 apple slice"
    ],
    "place": "hollow log",
    "release": "the sunlit flower meadow",
    "treasure": "shiny trinket",
    "token": "leaf",
    "pathIcon": "🌼",
    "sign": "🍂 a blackberry leaf and a shiny trinket by the hollow log",
    "talents": [
      "Radar Ears",
      "Master of Disguise",
      "Super Jumper",
      "Riddle Solver"
    ],
    "trust": "curls along the bottom of the screen like a warm, fluffy scarf and rests its chin on its tail",
    "quirks": [
      "chases its tail tip",
      "sneezes when happy",
      "ear-flicks when thinking",
      "hums a yippy tune",
      "peeks from behind its tail"
    ],
    "game": "Shiny Pairs"
  },
  "owl": {
    "name": (typeof window!=="undefined"&&window.FAMILIES)?FAMILIES.whimber.label:"Whimber",   // label lives in families.js
    "title": "The Starlight Listener",
    "badge": "🪶",
    "bg": "owl-bg",
    "foods": [
      "🐟 crispy smoked fish strips",
      "🥓 savory meat nibbles",
      "💧 cool spring water"
    ],
    "neutral": [
      "🌻 seeds"
    ],
    "place": "cozy tree hollow",
    "release": "the cozy tree hollow under the stars",
    "treasure": "soft feather",
    "token": "feather",
    "pathIcon": "⭐",
    "sign": "🪶 a soft feather on the window sill",
    "talents": [
      "Night Vision",
      "Silent Flight",
      "Super Radar Hearing",
      "Sweet-Dream Lullaby"
    ],
    "trust": "wraps a big soft wing across the bottom of the screen like a velvet blanket, then gently preens the edge",
    "quirks": [
      "tilts its head all the way round",
      "hums and sways while it waits",
      "fluffs up suddenly",
      "blinks one eye at a time",
      "trills when sleepy"
    ],
    "game": "Moonlight Pairs"
  }
};
