// All tunables in one place (spec §5 / Appendix A). First guesses — change freely.
window.CONFIG = {
  demoSpeed: 6,            // bond multiplier so the full arc is reachable in one sitting (1 = spec values)
  decayPerHour: {food:8, play:6, rest:5, comfort:4},
  restore: {food:30, foodFav:40, play:15, playFinish:15, rest:50, restFav:60, pet:5, sit:15},
  sessionLimits: {feeds:3, games:2, naps:1},
  bond: {feed:3, feedFav:6, round:4, pet:1, sit:5, nap:3, reply:3, hello:5},
  milestones: [
    {bond:20,  id:'name',    label:'First friend sticker'},
    {bond:70,  id:'talent1', label:'Talent 1'},
    {bond:140, id:'place',   label:'Favorite place opens'},
    {bond:210, id:'talent2', label:'Talent 2'},
    {bond:290, id:'trust',   label:'Trust gesture'},
    {bond:370, id:'talent3', label:'Talent 3'},
    {bond:440, id:'talent4', label:'Talent 4 + restless signs'},
    {bond:500, id:'ready',   label:'Ready for the wild'}],
  maxDecayHours: 48, callbackMinAgeHours: 24, ambientMin: 25, ambientMax: 60, graceDays: 3,
  checkins: [[1,'postcard'],[3,'postcard'],[7,'note'],[14,'sign'],[30,'postcard'],[60,'note'],[90,'sign']], napSeconds: 20, sitSeconds: 8 // nap/sit shortened from 120s/20s for demo
};
// Creature profiles (spec v0.3). All spoken text lives in dialogue/*.json.
window.CREATURES = {
  "fox": {
    "name": "Slyte",
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
    "sign": "🍂 a blackberry leaf and a shiny trinket by the treehouse",
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
    "game": "Shiny Search"
  },
  "owl": {
    "name": "Whimber",
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
    "game": "Night Sky"
  }
};
