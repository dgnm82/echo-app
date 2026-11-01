// Project Echo — dialogue engine (LIVE part): 64-entry S.chatHistory ring buffer + music share quota / recent music events.
// Nov 1 dialogue fix: the compositional clause composer (pick / miniConversation / runMiniConversation, OPENINGS,
// SCENE_OBS, NEED_CLAUSES, EVENT_CLAUSES) is OUT of the live app. Its stitched lines failed review (~92%, see
// echo/pm/dialogue_review/FINDINGS.md). It now lives in tools/engine_composer.js (offline only: tests/research, never
// loaded by index.html / handheld.html; tools/test-no-composer.js enforces that). The app speaks only vetted static
// lines from dialogue/*.json through dialogue.js.
(function(W){
'use strict';

const HISTORY_CAP = 64;

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

// ---- Music School Phase 1 step 4: music share quota + recent music events (PLAN step 4) -------------------------------
// A line may carry "music": one of MUSIC_TAGS (DIALOGUE_SCHEMA.md). The game records a music line in S.chatHistory with a
// leading MUSIC_MARK, so the share is read off the same 64-entry ring. Outside care/calm keys, when a key has both kinds
// of line, Dialogue.bark plays its music line with chance musicTarget(share) (high under 18%, low past the middle, 0 over
// 25%); care/calm keys never get one unless the line has lintAllow ["music_care"].
const MUSIC_TAGS = ['pulse','highlow','loudsoft','fastslow','timbre','contour','rhythm','mood','form','song'];
const MUSIC_MARK = '\u266a';
const MUSIC_QUOTA = { lo: 0.18, hi: 0.25, minHistory: 8, target: [0.7, 0.35, 0.15, 0] };   // target: chance a key with both kinds plays its music line, by share band (<lo, lo-mid, mid-hi, >hi); over the cap a music line plays only when its key has nothing else
const CARE_KEY = /^(fed|feed|full|eat|food_|pet$|pet_|sit$|nap|sleep|not_sleepy|need_(hungry|sleepy|cuddly)|after_hug|found_(nap|lullaby|curl)|wake_up|tuck|sad|feel|comfort|hug|calm|farewell|goodbye|thanks|last_call|time_to_go|two_goodbyes|keepsake)/;   // care / calm / goodbye keys (PLAN step 4)
const MUSIC_EVENTS = ['eib_ancient','catch_hook','stack_tune','song_grew','mission_back'];
const RECENT_MS = 15 * 60 * 1000, RECENT_CAP = 8;
function isCareKey(key){ return CARE_KEY.test(String(key || '')); }
function musicShare(hist){ const h = Array.isArray(hist) ? hist : []; if (!h.length) return 0; return h.filter(x => String(x).charAt(0) === MUSIC_MARK).length / h.length; }
function musicFactor(line, key){   // 0 = this line may not play under this key (music in a care/calm key without lintAllow "music_care")
  if (!line || !line.music) return 1;
  return isCareKey(key) && !((line.lintAllow || []).includes('music_care')) ? 0 : 1;
}
function musicTarget(share, histLen){ const q = MUSIC_QUOTA; if ((histLen | 0) < q.minHistory) return null;
  return share < q.lo ? q.target[0] : share < (q.lo + q.hi) / 2 ? q.target[1] : share <= q.hi ? q.target[2] : q.target[3]; }
function historyId(key, line){ const id = (line && line.id) || (key + ':' + String((line && line.text) || '').slice(0, 24)); return (line && line.music ? MUSIC_MARK : '') + id; }
function noteEvent(state, ev, at){ if (!state || !MUSIC_EVENTS.includes(ev)) return null; const r = state.recentMusic = Array.isArray(state.recentMusic) ? state.recentMusic : [];
  r.push({ e: ev, at: at == null ? Date.now() : at }); while (r.length > RECENT_CAP) r.shift(); return ev; }
function recentEvents(state, now){ const t = now == null ? Date.now() : now; return ((state && state.recentMusic) || []).filter(x => x && t - x.at >= 0 && t - x.at < RECENT_MS).map(x => x.e); }

const API = {
  HISTORY_CAP,
  getHistory,
  recordHistory,
  COMPOSER: false,   // the clause composer is not part of the live build
  MUSIC_TAGS, MUSIC_MARK, MUSIC_QUOTA, MUSIC_EVENTS, isCareKey, musicShare, musicFactor, musicTarget, historyId, noteEvent, recentEvents
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
