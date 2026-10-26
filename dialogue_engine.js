// Project Echo — Dialogue v2 Smart On-Device Ranker, Compositional Clause Engine & 2-3 Turn Mini-Conversations
// 100% offline, 100% kid-safe vetted clauses (0% unvetted freeform generation), 64-entry S.chatHistory ring buffer.
(function(W){
'use strict';

const WEIGHTS = {
  look: 30,
  family: 20,
  ageBand: 15,
  scene: 15,
  time: 12,
  need: 15,
  event: 20,     // recent game / flower_tap / episodic memory callback
  repeatPenalty: -1000
};

const HISTORY_CAP = 64;

const ANIMAL_META = {
  // Slyte (Howlings — D major pentatonic)
  fox:         { family: 'slyte',    feat: 'bushy fox tail',      act: 'ears perk up',       home: 'mossy log',       notes: ['d5','f#5'], sound: 'yip-hum' },
  dog:         { family: 'slyte',    feat: 'floppy dog ears',     act: 'tail wags fast',     home: 'sunny step',      notes: ['a4','d5'],  sound: 'woof-hum' },
  wolf:        { family: 'slyte',    feat: 'silver wolf ruff',    act: 'nose sniffs softly', home: 'pine ridge',      notes: ['d4','a4'],  sound: 'awoo-hum' },
  coyote:      { family: 'slyte',    feat: 'nimble coyote paws',  act: 'ears swivel round',  home: 'warm rock',       notes: ['f#4','b4'], sound: 'yip-trill' },
  // Whimber (Wingsongs — F/Bb major pentatonic). Batch H / H14: each bird's own sound word (spec table); 'hoo-' is owl-only
  owl:         { family: 'whimber',  feat: 'round owl eyes',      act: 'head tilts softly',  home: 'oak hollow',      notes: ['f4','c5'],  sound: 'hoo-hum' },
  bird:        { family: 'whimber',  feat: 'bright song wings',   act: 'wings flutter',      home: 'leafy bough',     notes: ['c5','f5'],  sound: 'tweet-trill' },
  wingsong:    { family: 'whimber',  feat: 'bright song wings',   act: 'wings flutter',      home: 'leafy bough',     notes: ['c5','f5'],  sound: 'tweet-trill' },
  duck:        { family: 'whimber',  feat: 'webbed duck feet',    act: 'tail feathers waggle',home: 'reedy bank',     notes: ['g4','d5'],  sound: 'quack-flutter' },
  dove:        { family: 'whimber',  feat: 'soft dove feathers',  act: 'wings fold gently',  home: 'quiet branch',    notes: ['f4','a4'],  sound: 'soft-coo' },
  pigeon:      { family: 'whimber',  feat: 'shimmer neck',        act: 'head bobs along',    home: 'rooftop sill',    notes: ['g4','c5'],  sound: 'roo-coo' },
  crow:        { family: 'whimber',  feat: 'glossy crow wings',   act: 'beak taps a rhythm', home: 'tall pine top',   notes: ['d5','f5'],  sound: 'caw-click' },
  eagle:       { family: 'whimber',  feat: 'broad eagle wings',   act: 'eyes scan the sky',  home: 'high crag',       notes: ['c5','g5'],  sound: 'high-kree' },
  chicken:     { family: 'whimber',  feat: 'speckled crest',      act: 'feathers fluff up',  home: 'cozy straw nest', notes: ['a4','d5'],  sound: 'bawk-cluck' },
  gull:        { family: 'whimber',  feat: 'gliding gull wings',  act: 'wings catch the air',home: 'sunny ledge',     notes: ['d5','g5'],  sound: 'sea-call' },
  // Twitchel (Purrlings — F/G major pentatonic)
  cat:         { family: 'twitchel', feat: 'velvet cat paws',     act: 'whiskers twitch',    home: 'woven basket',    notes: ['f4','c5'],  sound: 'mrrp-purr' },
  lion:        { family: 'twitchel', feat: 'golden lion mane',    act: 'mane fluffs wide',   home: 'sunbeam rug',     notes: ['g4','d5'],  sound: 'ruff-purr' },
  tiger:       { family: 'twitchel', feat: 'bold tiger stripes',  act: 'tail tip curls',     home: 'fern cushion',    notes: ['a4','f5'],  sound: 'chuff-purr' },
  leopard:     { family: 'twitchel', feat: 'spotted leopard paws',act: 'paws knead softly',  home: 'rafter beam',     notes: ['c5','g5'],  sound: 'purr-pad' },
  cheetah:     { family: 'twitchel', feat: 'speedy cheetah paws', act: 'ears perk forward',  home: 'garden path',     notes: ['d5','a5'],  sound: 'chirp-purr' },
  snowleopard: { family: 'twitchel', feat: 'fluffy cloud tail',   act: 'tail wraps my paws', home: 'quilted pillow',  notes: ['c5','f5'],  sound: 'mrrp-trill' },
  lynx:        { family: 'twitchel', feat: 'pointy ear tufts',    act: 'ear tufts flick',    home: 'attic nook',      notes: ['g4','c5'],  sound: 'purr-flick' }
};

const OPENINGS = {
  '5-6': {
    morning: ['Good morning!', 'Sunny morning!', 'Wake-up time!', 'Bright dew!'],
    day:     ['Hi friend!', 'Sunny day!', 'Look here!', 'Play time!'],
    evening: ['Cozy dusk!', 'Golden sky!', 'Lantern time!', 'Soft evening!'],
    night:   ['Starlight night!', 'Look, stars!', 'Cozy night!', 'Moon glow!']
  },
  '7-8': {
    morning: ['The morning light feels so fresh,', 'Early dew is sparkling outside,', 'My song woke up with the sun,', 'What a bright morning to explore,'],
    day:     ['The afternoon sunbeams are warm,', 'Everything in our spot feels lively,', 'I just noticed a neat rhythm,', 'Right here in the warm daylight,'],
    evening: ['The golden dusk makes our lanterns glow,', 'Evening colors are painting the sky,', 'Twilight is settling in so gently,', 'Our cozy spot glows in the dusk,'],
    night:   ['Under the quiet starlight tonight,', 'The night stars are twinkling above us,', 'Warm lantern light keeps us cozy,', 'Listening to the soft night hum,']
  },
  '9-10': {
    morning: ['As the morning sun warms up our stage, I keep noticing new little melodies,', 'There is something extra peaceful about early morning light around our home,', 'Every morning brings a slightly different harmony when we listen closely,', 'I was just tuning my morning song while the dew still shimmers,'],
    day:     ['In the middle of a bright afternoon like this, every corner has a story,', 'I have been practicing a new pentatonic pattern while the sun is high,', 'When the afternoon light hits just right, our whole place feels alive,', 'Between our games and exploring today, I found a rhythm that fits us,'],
    evening: ['When golden hour arrives and the lanterns warm up, the music sounds deeper,', 'Dusk always makes the colors around our home glow like a painted postcard,', 'As the sky turns amber and plum, I love sharing quiet songs with you,', 'The evening air makes every musical note ring out a little longer,'],
    night:   ['Even late at night under the constellations, our lanterns keep the stage bright,', 'Starlight night is my favorite time for noticing soft echoes and harmonies,', 'Watching the fireflies and stars drift by makes me think of our best songs,', 'The quiet night sky feels like a giant songbook waiting for one more tune,']
  }
};

const SCENE_OBS = {
  clearing:          { '5-6': 'by our log',          '7-8': 'near the mossy hollow log',          '9-10': 'across the soft clover of the log clearing' },
  grove:             { '5-6': 'in the leaf grove',   '7-8': 'under the amber grove leaves',       '9-10': 'among the rustling autumn leaves of the grove' },
  meadow:            { '5-6': 'in the flowers',      '7-8': 'out in the sunlit flower meadow',    '9-10': 'where the meadow wildflowers sway in harmony' },
  branch:            { '5-6': 'on our branch',       '7-8': 'perched on the high hollow branch',  '9-10': 'high up on our starlight canopy perch bough' },
  library:           { '5-6': 'by the books',        '7-8': 'up in the cozy library rafters',     '9-10': 'beside the storybooks in the library nook' },
  hilltop:           { '5-6': 'on the hill',         '7-8': 'up on the starry hilltop bench',     '9-10': 'looking out from the open starry hilltop' },
  garden:            { '5-6': 'in the garden',       '7-8': 'along the warm sunbeam garden',      '9-10': 'where the garden bellflowers chime together' },
  twitchel_wild_clearing: { '5-6': 'by our mossy den', '7-8': 'beside our mossy wild den',      '9-10': 'by the bell-vine at the mouth of our mossy den' },
  twitchel_sunbeam_room:  { '5-6': 'in our sunny room', '7-8': 'in our warm sunbeam room',       '9-10': 'on the rug where the sunbeam crosses our room' },
  twitchel_grove:    { '5-6': 'in the sunbeams',     '7-8': 'in the warm sunbeam grove',          '9-10': 'where golden sunbeams cross the grove floor' },
  twitchel_meadow:   { '5-6': 'by the bellflowers',  '7-8': 'out in the bellflower meadow',       '9-10': 'amid the chiming bellflowers of the meadow' },
  twitchel_garden:   { '5-6': 'in the cat garden',   '7-8': 'under the cozy garden awning',       '9-10': 'in the sunny garden corner with soft cushions' }
};

// twitchel_clearing is retired (Pixal follow-up 2); the runtime scene ids are wild_clearing / sunbeam_room
SCENE_OBS.wild_clearing = SCENE_OBS.twitchel_wild_clearing;
SCENE_OBS.sunbeam_room = SCENE_OBS.twitchel_sunbeam_room;

const NEED_CLAUSES = {
  hungry:  { '5-6': 'Snack time soon?',            '7-8': 'my tummy is ready for a tasty snack!',             '9-10': 'a favorite snack would give me extra energy for our next song.' },
  sleepy:  { '5-6': 'Cozy nap soon?',              '7-8': 'my eyes feel ready for a little rest.',            '9-10': 'curling up for a peaceful nap sounds wonderful right now.' },
  playful: { '5-6': 'Let us play!',                '7-8': 'I have so much bounce for a game!',                '9-10': 'I am brimming with energy to play a game or sing together!' },
  clean:   { '5-6': 'Soft pats please!',           '7-8': 'a gentle pat or brush feels so cozy.',             '9-10': 'sharing a calm sit or gentle pat makes my glow feel extra warm.' },
  comfort: { '5-6': 'Hug time!',                   '7-8': 'sitting close together feels so nice.',            '9-10': 'spending a cozy moment together is my favorite part of the day.' },
  happy:   { '5-6': 'Sing with me!',               '7-8': 'want to tap a flower or sing a tune?',             '9-10': 'shall we tap the musical flowers or try a new melody together?' }
};

const EVENT_CLAUSES = {
  flower_note: {
    '5-6': 'That flower sang a note!',
    '7-8': 'tapping that blossom played a real pentatonic chime!',
    '9-10': 'brushing across those flowers wove a real pentatonic phrase in our key!'
  },
  stack: {
    '5-6': 'Tall tower stack!',
    '7-8': 'we stacked those layers so high on the beat!',
    '9-10': 'our timing on that tall stack had such a crisp rhythm!'
  },
  catch: {
    '5-6': 'Great catch game!',
    '7-8': 'catching those falling treasures built a whole tune!',
    '9-10': 'every catch added another note to our melody streak!'
  },
  run: {
    '5-6': 'Fast dash fun!',
    '7-8': 'leaping and gliding down the trail felt amazing!',
    '9-10': 'cruising past the trail markers on the beat felt effortless!'
  },
  eib: {
    '5-6': 'We sang together!',
    '7-8': 'echoing those musical phrases back and forth was awesome!',
    '9-10': 'our call-and-response duet in Echo It Back sounded like a real concert!'
  },
  dig: {
    '5-6': 'Cozy rows cleared!',
    '7-8': 'clearing those rows made our home extra cozy!',
    '9-10': 'fitting every block into place climbed the musical scale!'
  },
  pairs: {
    '5-6': 'Found the pairs!',
    '7-8': 'matching those pairs rang such sweet two-note chimes!',
    '9-10': 'remembering where each matching card hid made a lovely harmony!'
  },
  fav_food: {
    '5-6': 'Yum, favorite treat!',
    '7-8': 'you remembered my absolute favorite snack!',
    '9-10': 'sharing my favorite food again makes our bond glow even brighter!'
  },
  songbook: {
    '5-6': 'I love our song!',
    '7-8': 'I still hum the melody we saved in our Songbook!',
    '9-10': 'the melody we saved in our Songbook keeps echoing in my head!'
  }
};

function getHistory(state){
  const S = state || (W.__echo && W.__echo.state) || null;
  if (!S) return [];
  if (!Array.isArray(S.chatHistory)) S.chatHistory = [];
  return S.chatHistory;
}

function recordHistory(id, state){
  if (!id) return [];
  const S = state || (W.__echo && W.__echo.state) || null;
  if (!S) return [id];
  if (!Array.isArray(S.chatHistory)) S.chatHistory = [];
  const idx = S.chatHistory.indexOf(id);
  if (idx >= 0) S.chatHistory.splice(idx, 1);
  S.chatHistory.push(id);
  while (S.chatHistory.length > HISTORY_CAP) S.chatHistory.shift();
  return S.chatHistory;
}

// Compute total effective vetted lines in the compositional + curated space:
// 20 animals * 3 age bands * 4 times * 4 opening variants * 3 scene contexts * (6 need states + 9 event callbacks)
function corpusSize(){
  const animals = 20;
  const bands = 3;
  const times = 4;
  const openingsPerTime = 4;
  const endings = Object.keys(NEED_CLAUSES).length + Object.keys(EVENT_CLAUSES).length; // 15
  const compCount = animals * bands * times * openingsPerTime * endings; // 20 * 3 * 4 * 4 * 15 = 14,400
  return compCount;
}

function normalizeTextForBand(family, text, band){
  if (family === 'whimber') {
    // Whimber calm voice: soft pauses, gentle punctuation
    return text.replace(/!/g, '.');
  }
  return text;
}

function buildCompositionalCandidate(opts){
  const look = opts.look || 'fox';
  const meta = ANIMAL_META[look] || ANIMAL_META.fox;
  const family = opts.family || meta.family;
  const band = opts.ageBand || '7-8';
  const time = opts.time || 'day';
  const scene = opts.scene || (family === 'whimber' ? 'branch' : 'clearing');
  const need = opts.need || 'happy';
  const event = opts.event || null;
  const variantIdx = (opts.variant || 0) % 4;

  const id = `v2_${family}_${look}_${band}_${time}_${scene}_${event || need}_${variantIdx}`;
  const openList = (OPENINGS[band] && OPENINGS[band][time]) || OPENINGS['7-8'].day;
  const open = openList[variantIdx % openList.length];
  const scPhrase = (SCENE_OBS[scene] && SCENE_OBS[scene][band]) || SCENE_OBS.clearing[band];
  const tailClause = event && EVENT_CLAUSES[event]
    ? EVENT_CLAUSES[event][band]
    : (NEED_CLAUSES[need] && NEED_CLAUSES[need][band]) || NEED_CLAUSES.happy[band];

  let text;
  if (band === '5-6') {
    // 4-8 words concrete sensory
    text = `${open} My ${meta.feat.split(' ').slice(-2).join(' ')} ${scPhrase}. ${tailClause}`;
    const words = text.split(/\s+/);
    if (words.length > 8) text = `${open} ${tailClause}`;
  } else if (band === '7-8') {
    text = `${open} my ${meta.feat} is right ${scPhrase} — ${tailClause}`;
  } else {
    text = `${open} my ${meta.feat} settles ${scPhrase}, and ${tailClause}`;
  }
  text = normalizeTextForBand(family, text, band);
  const shortText = normalizeTextForBand(family, `${open} ${tailClause}`, '5-6');

  const expr = need === 'sleepy' ? 'sleepy'
    : (event === 'flower_note' || event === 'eib' || event === 'fav_food') ? 'delighted'
    : (need === 'playful' || event) ? 'excited'
    : 'happy';
  const react = need === 'sleepy' ? 'sleepy'
    : (event === 'flower_note' || event === 'eib') ? 'sing'
    : (need === 'playful' || event) ? 'excited'
    : 'happy';

  return {
    id,
    text,
    short: shortText,
    expr,
    react,
    notes: meta.notes.slice(),
    sound: meta.sound,
    family,
    look,
    ageBand: band,
    scene,
    time,
    need,
    event
  };
}

function score(cand, ctx, historyArr){
  ctx = ctx || {};
  const hist = historyArr || getHistory(ctx.state);
  let s = 0;
  if (cand.look && ctx.look && cand.look === ctx.look) s += WEIGHTS.look;
  if (cand.family && ctx.family && cand.family === ctx.family) s += WEIGHTS.family;
  if (cand.ageBand && ctx.ageBand && cand.ageBand === ctx.ageBand) s += WEIGHTS.ageBand;
  if (cand.scene && ctx.scene && cand.scene === ctx.scene) s += WEIGHTS.scene;
  if (cand.time && ctx.time && cand.time === ctx.time) s += WEIGHTS.time;
  if (cand.need && ctx.need && cand.need === ctx.need) s += WEIGHTS.need;
  if (cand.event && ctx.event && cand.event === ctx.event) s += WEIGHTS.event;
  if (cand.memory && ctx.memory && cand.memory === ctx.memory) s += WEIGHTS.event;
  if (hist && hist.includes(cand.id)) s += WEIGHTS.repeatPenalty;
  return s;
}

function resolveContext(rawCtx){
  rawCtx = rawCtx || {};
  const S = rawCtx.state || (W.__echo && W.__echo.state) || {};
  const look = rawCtx.look || (S.g && S.g.look) || (S.origin && S.origin.animal) || (S.kind === 'owl' ? 'owl' : S.kind === 'cat' ? 'cat' : 'fox');
  const meta = ANIMAL_META[look] || ANIMAL_META.fox;
  const family = rawCtx.family || meta.family || (S.kind === 'owl' ? 'whimber' : S.kind === 'cat' ? 'twitchel' : 'slyte');
  const ageBand = rawCtx.ageBand || S.ageBand || '7-8';
  const scene = rawCtx.scene || S.scene || (family === 'whimber' ? 'branch' : family === 'twitchel' ? (['lion','tiger','leopard','cheetah','snowleopard','lynx'].includes(String(look).toLowerCase()) ? 'wild_clearing' : 'sunbeam_room') : 'clearing');
  const time = rawCtx.time || (W.__echo && W.__echo.band && W.__echo.band()) || 'day';
  let need = rawCtx.need || null;
  if (!need && S.needs) {
    if (S.needs.food < 45) need = 'hungry';
    else if (S.needs.rest < 45) need = 'sleepy';
    else if (S.needs.play < 45) need = 'playful';
    else if (S.needs.comfort < 45) need = 'comfort';
    else need = 'happy';
  }
  need = need || 'happy';
  const event = rawCtx.event || null;
  // H9 (final): the Echo's own seasonal weather (window.WEATHER, on-device date cycle only); undefined when off / absent
  let weather = rawCtx.weather;
  if (weather === undefined && W.WEATHER && W.WEATHER.dialogueCtx) { try { weather = W.WEATHER.dialogueCtx(S); } catch (e) { weather = undefined; } }
  return { state: S, look, family, ageBand, scene, time, need, event, weather };
}

function generateCandidates(rawCtx){
  const ctx = resolveContext(rawCtx);
  const cands = [];
  // Generate targeted candidates + cross-variant candidates so a 64-call streak never runs out of fresh IDs
  const events = ctx.event ? [ctx.event, null] : [null, 'flower_note', 'eib', 'stack', 'catch', 'run', 'dig', 'pairs', 'fav_food', 'songbook'];
  const needs = [ctx.need, 'happy', 'playful', 'hungry', 'comfort', 'sleepy'];
  const scenes = [ctx.scene, 'clearing', 'grove', 'meadow', 'branch', 'library', 'hilltop', 'garden'];
  const times = [ctx.time, 'morning', 'day', 'evening', 'night'];

  const seenIds = new Set();
  for (const ev of events) {
    for (const nd of needs) {
      for (const sc of scenes.slice(0, 3)) {
        for (const tm of times.slice(0, 2)) {
          for (let v = 0; v < 4; v++) {
            const c = buildCompositionalCandidate({
              look: ctx.look,
              family: ctx.family,
              ageBand: ctx.ageBand,
              scene: sc,
              time: tm,
              need: nd,
              event: ev,
              variant: v
            });
            if (!seenIds.has(c.id)) {
              seenIds.add(c.id);
              cands.push(c);
            }
          }
        }
      }
    }
  }
  return cands;
}

// H14: non-owl birds never say "Hoo": same swap table as dialogue.js (Dialogue.speciesCalls), one source of truth there
function owlCalls(t, look){ const D = W.Dialogue; return (D && D.speciesCalls) ? D.speciesCalls(t, String(look || '').toLowerCase() === 'wingsong' ? 'bird' : String(look || '').toLowerCase()) : t; }
const WEATHER_SHARE = 0.2;
function pick(rawCtx, opts){
  opts = opts || {};
  const ctx = resolveContext(rawCtx);
  const hist = getHistory(ctx.state);
  // H9: now and then voice Cole's weather_<state> line for the Echo's own weather (cond.weather is checked by dialogue.js)
  if (ctx.weather && ctx.weather !== 'clear' && opts.weather !== false && W.Dialogue && W.Dialogue.lib && (opts.forceWeather || Math.random() < WEATHER_SHARE)) {
    const line = W.Dialogue.bark('weather_' + ctx.weather, { weather: ctx.weather }, () => true);
    if (line && line.text) return { id: 'weather_' + ctx.weather, text: owlCalls(line.text, ctx.look), expr: line.expr, react: line.react, weather: ctx.weather, score: 0 };
  }
  const cands = generateCandidates(ctx);
  let best = null, bestScore = -1e9;
  for (const c of cands) {
    const sc = score(c, ctx, hist);
    c.score = sc;
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }
  if (best && opts.record !== false) {
    recordHistory(best.id, ctx.state);
  }
  if (best && best.text) best.text = owlCalls(best.text, ctx.look);   // H14: "Hoo" for owls only
  return best;
}

// 2-3 Turn Interactive Mini-Conversations with 2-3 kid tap-reply chips tailored by ageBand
function miniConversation(rawCtx){
  const ctx = resolveContext(rawCtx);
  const meta = ANIMAL_META[ctx.look] || ANIMAL_META.fox;
  const band = ctx.ageBand;
  const turn1 = pick(ctx, { record: false });

  const chipSets = {
    '5-6': [
      { icon: '🎵', label: 'Sing note!',   intent: 'listen', expr: 'delighted', react: 'sing',    notes: meta.notes },
      { icon: '🌸', label: 'Tap flower!',  intent: 'yes',    expr: 'happy',     react: 'happy',   notes: [meta.notes[1] || 'a4', meta.notes[0] || 'd4'] },
      { icon: '🤗', label: 'Cozy pat!',    intent: 'nod',    expr: 'love',      react: 'pet',     notes: [meta.notes[0] || 'd4'] }
    ],
    '7-8': [
      { icon: '🎵', label: 'Sing our tune!',       intent: 'listen', expr: 'delighted', react: 'sing',    notes: meta.notes },
      { icon: '🌸', label: 'Chime the flowers!',   intent: 'yes',    expr: 'excited',   react: 'excited', notes: [meta.notes[1] || 'a4', meta.notes[0] || 'd4'] },
      { icon: '✨', label: 'Show me a trick!',     intent: 'wow',    expr: 'happy',     react: 'happy',   notes: meta.notes }
    ],
    '9-10': [
      { icon: '🎵', label: 'Harmonize a 2-note phrase', intent: 'listen', expr: 'delighted', react: 'sing',    notes: meta.notes },
      { icon: '🌸', label: 'Brush the flower bells',    intent: 'yes',    expr: 'excited',   react: 'excited', notes: [meta.notes[1] || 'a4', meta.notes[0] || 'd4'] },
      { icon: '🌟', label: 'Tell me what you noticed',  intent: 'ask_more',expr: 'curious',  react: 'curious', notes: meta.notes }
    ]
  };
  const chips1 = (chipSets[band] || chipSets['7-8']).map((c, idx) => {
    const turn2Text = band === '5-6'
      ? normalizeTextForBand(ctx.family, `${meta.sound}! That felt so fun!`, band)
      : band === '7-8'
      ? normalizeTextForBand(ctx.family, `Ooh, my ${meta.feat} loved that ${c.label.toLowerCase().replace(/!$/, '')}! Listen to this note:`, band)
      : normalizeTextForBand(ctx.family, `When we ${c.label.toLowerCase()}, my ${meta.feat} catches the rhythm right away. Want to finish the phrase?`, band);
    return Object.assign({}, c, {
      id: `${turn1.id}_t2_${idx}`,
      reply: turn2Text,
      goto: 'turn3'
    });
  });

  const chips2 = (chipSets[band] || chipSets['7-8']).slice(0, 2).map((c, idx) => {
    const turn3Text = band === '5-6'
      ? normalizeTextForBand(ctx.family, `Yay! Best song friends!`, band)
      : band === '7-8'
      ? normalizeTextForBand(ctx.family, `That two-note harmony rang all across ${ (SCENE_OBS[ctx.scene] && SCENE_OBS[ctx.scene]['5-6']) || 'our home' }!`, band)
      : normalizeTextForBand(ctx.family, `Our duet echoed right through ${ (SCENE_OBS[ctx.scene] && SCENE_OBS[ctx.scene]['7-8']) || 'our home' }. I will remember this melody!`, band);
    return Object.assign({}, c, {
      id: `${turn1.id}_t3_${idx}`,
      reply: turn3Text,
      goto: null
    });
  });

  return {
    id: `miniconv_${ctx.family}_${ctx.look}_${band}_${ctx.scene}_${ctx.time}`,
    family: ctx.family,
    look: ctx.look,
    ageBand: band,
    turns: 3,
    start: 'turn1',
    nodes: {
      turn1: {
        id: turn1.id,
        say: turn1.text,
        short: turn1.short,
        expr: turn1.expr,
        react: turn1.react,
        notes: turn1.notes,
        choices: chips1
      },
      turn3: {
        id: `${turn1.id}_turn3_prompt`,
        say: band === '5-6'
          ? normalizeTextForBand(ctx.family, 'One more note together?', band)
          : normalizeTextForBand(ctx.family, 'Want to add one more note to finish our song?', band),
        expr: 'happy',
        react: 'sing',
        notes: meta.notes,
        choices: chips2
      }
    }
  };
}

function vocalize(fam, notes){
  try {
    if (W.ENV_HOTSPOTS && W.ENV_HOTSPOTS.playPentatonicNotes) {
      return W.ENV_HOTSPOTS.playPentatonicNotes(fam, notes, true);
    }
    if (W.Chirp && W.Chirp.play) {
      W.Chirp.play('♪', fam, 'happy');
    }
  } catch (e) {}
  return { fam, notes };
}

function runMiniConversation(rawCtx, ui, onDone){
  const ctx = resolveContext(rawCtx);
  const conv = miniConversation(ctx);
  ui = ui || {};
  const log = [];

  function stepNode(nodeKey, turnIdx){
    const node = conv.nodes[nodeKey];
    if (!node) {
      onDone && onDone({ convId: conv.id, turnsCompleted: turnIdx - 1, log });
      return;
    }
    recordHistory(node.id, ctx.state);
    if (W.setExpr) W.setExpr(node.expr || 'happy');
    if (W.react && node.react) W.react(node.react);
    else if (W.PIXEL && W.PIXEL.react && node.react) W.PIXEL.react(node.react);
    const voc = vocalize(ctx.family, node.notes);
    log.push({ turn: turnIdx, id: node.id, text: node.say, expr: node.expr, react: node.react, notes: node.notes, voc });
    if (ui.say) ui.say({ text: owlCalls(node.say, ctx.look), expr: node.expr, react: node.react });

    const ch = node.choices || [];
    if (!ch.length) {
      onDone && onDone({ convId: conv.id, turnsCompleted: turnIdx, log });
      return;
    }
    const pickIdx = (ui.autoPick != null) ? (typeof ui.autoPick === 'function' ? ui.autoPick(turnIdx, ch) : ui.autoPick) : null;
    const handlePick = (idx) => {
      const picked = ch[idx] || ch[0];
      recordHistory(picked.id, ctx.state);
      if (W.setExpr) W.setExpr(picked.expr || 'happy');
      if (W.react && picked.react) W.react(picked.react);
      else if (W.PIXEL && W.PIXEL.react && picked.react) W.PIXEL.react(picked.react);
      const rVoc = vocalize(ctx.family, picked.notes);
      log.push({ turn: turnIdx + 0.5, id: picked.id, chipLabel: picked.label, text: picked.reply, expr: picked.expr, react: picked.react, notes: picked.notes, voc: rVoc });
      if (ui.say) ui.say({ text: owlCalls(picked.reply, ctx.look), expr: picked.expr, react: picked.react });
      if (picked.goto && conv.nodes[picked.goto]) {
        stepNode(picked.goto, turnIdx + 1);
      } else {
        onDone && onDone({ convId: conv.id, turnsCompleted: turnIdx + 1, log });
      }
    };
    if (pickIdx != null) {
      handlePick(pickIdx);
    } else if (ui.choose) {
      ui.choose(ch.map(c => [c.icon, c.label, c.intent]), handlePick);
    } else {
      handlePick(0);
    }
  }

  stepNode(conv.start, 1);
  return { conv, log };
}

const API = {
  WEIGHTS,
  HISTORY_CAP,
  ANIMAL_META,
  OPENINGS,
  SCENE_OBS,
  NEED_CLAUSES,
  EVENT_CLAUSES,
  corpusSize,
  effectiveLineCount: corpusSize,
  getHistory,
  recordHistory,
  score,
  resolveContext,
  buildCompositionalCandidate,
  generateCandidates,
  pick,
  WEATHER_SHARE,
  miniConversation,
  runMiniConversation,
  vocalize
};

W.DialogueEngine = API;
if (W.Dialogue) {
  W.Dialogue.engine = API;
  W.DIALOGUE = W.Dialogue;
} else {
  W.DIALOGUE = API;
}
if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
