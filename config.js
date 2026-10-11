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
  maxDecayHours: 48, graceDays: 3,
  checkins: [[1,'postcard'],[3,'postcard'],[7,'note'],[14,'sign'],[30,'postcard'],[60,'note'],[90,'sign']], napSeconds: 20, sitSeconds: 8 // nap/sit shortened from 120s/20s for demo
};
window.CREATURES = {
  fox: { name:'Slyte', title:'The Clever Trickster', badge:'🍃', bg:'fox-bg',
    foods:['🫐 wild blackberries','🍯 warm honey cakes','🌰 roasted nuts'], neutral:['🍎 apple slice'],
    place:'hollow log', release:'the sunlit flower meadow', treasure:'shiny trinket', token:'leaf', pathIcon:'🌼', sign:'🍂 a blackberry leaf and a shiny trinket by the treehouse',
    talents:['Radar Ears','Master of Disguise','Super Jumper','Riddle Solver'],
    trust:'curls along the bottom of the screen like a warm, fluffy scarf and rests its chin on its tail',
    quirks:['chases its tail tip','sneezes when happy','ear-flicks when thinking','hums a yippy tune','peeks from behind its tail'],
    game:'Shiny Hunt',
    hello:['Psst! You\'re back! I was— okay I wasn\'t hiding. Maybe a little.','Oh! Oh! Guess what. No, don\'t guess. I\'ll tell you. Hi!'],
    lines:{fed:'Mmm! Crunchy. Wait— more crunchy? No? Okay.', fav:'THAT one! How did you know?! Are you a fox too?', full:'I\'m so full my tail is round.',
      pet:'Mrrp…', sit:'…this is nice. Quiet is nice. Shh, don\'t tell anyone I said that.', nap:'Into my log… zzz… psst… zzz.'},
    chats:[
      {q:'Psst. If you could hide anywhere in the whole world, where would you hide?',c:[['🌳','In a tree','A tree! Up high where nobody looks. Smart. Very sneaky.'],['🛏️','Under my bed','Ooh, a bed fort. The best kind of fort.'],['🪣','In a bucket','A BUCKET? …That\'s so silly it would totally work.'],['🤫','Just sit','(Fox sits beside you, ears twitching happily.)']]},
      {q:'I found a shiny thing! Is it treasure or is it just a bottle cap?',c:[['💎','Treasure!','TREASURE. I knew it. I\'m keeping it forever.'],['🧢','Bottle cap','Hmm. A treasure-bottle-cap. Even better.'],['🤔','Both','Both!! You\'re so clever.']]},
      {q:'Do you ever feel a bit wobbly inside? I do sometimes.',c:[['🤗','Me too','Oh. Then we can be wobbly together. That helps.'],['💬','Tell me','Sometimes when it\'s too quiet. But you\'re here now, so it\'s fine.'],['🤫','Just sit','(Fox leans on you. Its tail goes swish… swish.)']]}],
    askReady:'Psst… guess what. I think I\'m ready to go home to the flower meadow. My paws feel it. Will you walk me there?',
    ready:'Psst… I keep smelling the flower meadow. It\'s calling me. Not right now — but soon, maybe?'},
  owl: { name:'Whimber', title:'The Night Watchman', badge:'🪶', bg:'owl-bg',
    foods:['🐟 crispy smoked fish strips','🥓 savory meat nibbles','💧 cool spring water'], neutral:['🌻 seeds'],
    place:'cozy tree hollow', release:'the cozy tree hollow under the stars', treasure:'soft feather', token:'feather', pathIcon:'⭐', sign:'🪶 a soft feather on the window sill',
    talents:['Night Vision','Silent Flight','Super Radar Hearing','Nightmare Banisher'],
    trust:'wraps a big soft wing across the bottom of the screen like a velvet blanket, then gently preens the edge',
    quirks:['tilts its head all the way round','hums and sways while it waits','fluffs up suddenly','blinks one eye at a time','trills when sleepy'],
    game:'Night Sky',
    hello:['Hoo… there you are. I was just thinking about you. Slowly.','Oh. Hello. The sky felt quieter without you.'],
    lines:{fed:'Thank you. That was… very kind. Hoo.', fav:'Oh… my favorite. You remembered. Or you guessed. Either is lovely.', full:'I\'m quite full. Like a moon.',
      pet:'Hoo… (it fluffs up)', sit:'…we don\'t have to say anything. Sitting is enough.', nap:'Into the hollow… I\'ll dream of stars.'},
    chats:[
      {q:'I wonder… do stars get sleepy in the daytime?',c:[['😴','Yes, they nap','A sky full of napping stars. Hoo. I like that.'],['✨','They hide','Hiding… just behind the blue. Patient, like me.'],['🤷','I don\'t know','Me neither. Not knowing is nice to wonder about.']]},
      {q:'What sound do you like best at night?',c:[['🦗','Crickets','Crickets. Tiny violins. Yes.'],['🌧️','Rain','Rain on leaves… I could listen all night. I do, actually.'],['🤫','Quiet','The quiet has its own sound, doesn\'t it.']]},
      {q:'When I feel a little gray inside, I look for one bright thing. What\'s your bright thing?',c:[['🧸','A toy','A friend you can hold. Very wise.'],['👪','My family','Your nest. Of course.'],['🦉','You!','Oh… (Owl slowly blinks both eyes.) Me too. You, I mean.']]}],
    askReady:'Hoo… I think I\'m ready to go home now. To my tree hollow. Would you walk with me?',
    ready:'Hoo… at night I hear the tree hollow calling me. I\'m not sad. Just… listening. When you\'re ready.'}
};
