#!/usr/bin/env python3
"""Lint Echo dialogue JSON (schema v2, /workspace/echo-app/DIALOGUE_SCHEMA.md).
Checks: schema, graph integrity, substitution tokens, banned words (Overhaul A4 + guide 8.3),
duplicate Echo lines (per species, shared pooled in), and species voice rules (Overhaul D4).
Usage: python3 lint_dialogue.py [dir]   (default: ../dialogue relative to this script). Exit 1 on any error."""
import json, re, sys, os
from collections import defaultdict

EXPR = {"neutral","happy","excited","eating","love","curious","surprised","sleepy","sad","delighted","thinking","giggling","proud","shy","wistful","concentrating"}
REACT = {"happy","excited","pet","eat","sad","sleepy"}
KNOWN_KEYS = {"hello","grace_hello","last_day","ready_hint","ask_ready","stay_more","reveal","reveal_reply","fed","fed_fav",
  "full","pet","sit","nap","napping","not_sleepy","game_tired","game_end","stack_start","stack_floor_next","stack_row","stack_floor","stack_high","stack_disguise","stack_done","first_gift","favplace","trust",
  "hug_more","walk_memory","gift_ask","gift_got","farewell","look_back"}
FAREWELL_KEYS = {"wild_glance","bondup_after_3","bondup_after_4","bondup_after_5","restless","almost_hello","list_nudge","list_play_done","list_food_done",
  "list_place_done","list_trail_done","list_memory_done","list_cozy_done","list_complete","time_to_go","one_more_game","after_one_more","walk_start","walk_list",
  "edge_arrive","edge_explain","keepsake_give","thanks","next_postcards","two_goodbyes","resume_edge","path_tap_early","last_call","thanks_hug","thanks_wave",
  "thanks_nose","thanks_words","write_a_lot"}   # farewell_arc.md v0.2 (release_invite / release_forced / goodbye_ask / walk_end retired)
NEW_KEYS = {"carry_on","drift_bridge","lost_thought","ambient","tangent","callback","time_morning","time_day","time_evening","time_night"}  # wired in game.js (v3): ambient timer, conversation tangents, aged-memory callbacks, time-of-day greeting
KEY_PREFIX = {"slyte": ("talent_","bond_up_","found_","routine_","pairs_","trail_","connect_","fallback_","run_"), "whimber": ("talent_","bond_up_","found_","routine_","pairs_","trail_","connect_","fallback_","run_"), "shared": ("talent_","fallback_","ui_")}
COND_KEYS = {"mood","bondMin","bondMax","stageMin","stageMax","time","talent","hasMemory","notMemory","var","varSet","varUnset","notSeen","any"}
NODE_KEYS = {"gesture","lintAllow","say","expr","react","choices","next","wait","branch","set","memory","memoryTag","bond"}
CHOICE_KEYS = {"gesture","intent","lintAllow","icon","label","cond","reply","expr","react","set","memory","memoryTag","bond","goto"}
CONV_KEYS = {"topic","id","trigger","weight","once","cond","start","nodes","privacy","lintAllow"}
TOKENS = {"name","child","fav","treasure","place","release","trust","quirk","token","gift","memory","spot","hint","guess","constellation","goal"}

BANNED = [r"traitor", r"cheat\w*", r"rude", r"liars?", r"stupid", r"dumb", r"fat", r"skinny", r"thin", r"diet\w*",
  r"don'?t tell", r"our secret", r"keep a secret", r"secrets?", r"I watched you", r"I saw you", r"watching you", r"watch(ed|ing)? you",
  r"you look", r"I went looking", r"miss(ed)? you", r"come back", r"without you", r"alone", r"lonely", r"die[sd]?", r"dying", r"dead",
  r"hunt\w*", r"eat you", r"see you", r"again tomorrow", r"tomorrow\?", r"scary", r"spooky", r"monsters?", r"nightmares?", r"afraid", r"kill\w*",
  r"he", r"she", r"him", r"his", r"her", r"hers", r"boys?", r"girls?", r"school", r"rude", r"silly[- ]billy", r"shut up", r"hate"]
BANNED_RE = [(b, re.compile(r"(?<![\w'])" + b + r"(?![\w'])", re.I)) for b in BANNED]

errors, warns = [], []
def err(where, msg): errors.append(f"ERROR {where}: {msg}")
def warn(where, msg): warns.append(f"warn  {where}: {msg}")

def check_cond(c, where):
    if not isinstance(c, dict): return err(where, "cond must be an object")
    for k, v in c.items():
        if k not in COND_KEYS: err(where, f"unknown cond key {k!r}")
        if k == "any":
            for x in v: check_cond(x, where + ".any")
        if k in ("mood", "time") and not isinstance(v, list): err(where, f"{k} must be a list")
        if k == "time" and any(x not in ("morning","day","evening","night") for x in v): err(where, "bad time value")
        if k == "var" and not isinstance(v, dict): err(where, "var must be an object")

def check_tokens(text, where):
    for t in re.findall(r"\{([^{}]*)\}", text):
        if t in TOKENS or t == "pet_phrase" or t.startswith(("var:","pick:","word:")): continue
        err(where, f"unknown substitution {{{t}}}")
    if re.search(r"\{[^}]*$|^[^{]*\}", text): err(where, "unbalanced braces")

def check_banned(text, where):
    for b, rx in BANNED_RE:
        if rx.search(text): err(where, f"banned word/phrase /{b}/ in: {text!r}")

def words(s): return re.findall(r"[A-Za-z']+", s)
def caps_words(s): return [w for w in words(s) if len(w) >= 2 and w.isupper() and w not in ("OK", "HA")]  # Ha-HA is a Slyte pet phrase
def sentences(s):
    s = re.sub(r"\([^)]*\)", "", s)  # stage directions don't count
    return [x for x in re.split(r"(?<=[.!?…])\s+", s.strip()) if words(x)]
def counted_sentences(s):  # 1–2 word bursts ("Okay.", "Hi!", "Basically.") are Slyte rhythm, not sentences
    return [x for x in sentences(s) if len(words(x)) > 2]

def voice(sp, text, where, stats):
    if sp == "slyte":
        ss = sentences(text)
        for x in ss:
            if len(words(x)) > 12: err(where, f"Slyte sentence >12 words: {x!r}")
        if len(counted_sentences(text)) > 4: err(where, f"Slyte line >4 sentences: {text!r}")
        if len(caps_words(text)) > 1: err(where, f"Slyte line >1 CAPS word: {text!r}")
    elif sp == "whimber":
        if caps_words(text): err(where, f"Whimber CAPS word: {text!r}")
        if "…" not in text and "..." not in text and len(words(text)) > 10: err(where, f"Whimber line needs a pause or ≤10 words: {text!r}")
        stats["lines"] += 1; stats["excl"] += text.count("!")

def lint_file(path, seen_ids, dup_pool):
    try: d = json.load(open(path, encoding="utf-8"))
    except Exception as e: return err(path, f"invalid JSON: {e}")
    fn = os.path.basename(path); sp = d.get("species")
    if d.get("version") != 2: err(fn, "version must be 2")
    if sp not in ("shared","slyte","whimber"): err(fn, f"bad species {sp!r}")
    for k in ("vars","barks","conversations"):
        if k not in d: err(fn, f"missing top-level {k}")
    stats = {"lines": 0, "excl": 0}
    def echo_line(text, where):
        if not isinstance(text, str) or not text.strip(): return err(where, "empty text")
        check_tokens(text, where); check_banned(text, where); voice(sp, text, where, stats)
        if not words(text): return  # pure beats like "…" are not lines
        dup_pool[re.sub(r"\s+", " ", text.strip().lower())].append(f"{fn}:{where}")
    for key, lines in d.get("barks", {}).items():
        if key not in KNOWN_KEYS and key not in NEW_KEYS and key not in FAREWELL_KEYS and not key.startswith(KEY_PREFIX.get(sp, ())):
            err(fn, f"unknown bark key {key!r}")
        if not isinstance(lines, list) or not lines: err(fn, f"bark {key} must be a non-empty list"); continue
        for i, b in enumerate(lines):
            w = f"bark {key}[{i}]"
            extra = set(b) - {"text","expr","react","cond","weight","gesture"}
            if extra: err(fn, f"{w} unknown fields {extra}")
            if b.get("expr") not in EXPR: err(fn, f"{w} bad expr {b.get('expr')!r}")
            if "react" in b and b["react"] not in REACT: err(fn, f"{w} bad react {b['react']!r}")
            if "cond" in b: check_cond(b["cond"], f"{fn} {w}")
            echo_line(b.get("text"), w)
    for c in d.get("conversations", []):
        cid = c.get("id", "?"); w0 = f"conv {cid}"
        if cid in seen_ids: err(fn, f"duplicate conversation id {cid}")
        seen_ids.add(cid)
        if set(c) - CONV_KEYS: warn(fn, f"{w0} unknown fields {set(c)-CONV_KEYS}")
        if c.get("trigger") not in ("idle","first_home","ready"): err(fn, f"{w0} trigger must be idle, first_home or ready")
        if "cond" in c: check_cond(c["cond"], f"{fn} {w0}")
        nodes = c.get("nodes", {})
        if c.get("start") not in nodes: err(fn, f"{w0} start node missing"); continue
        edges = defaultdict(set)
        for nid, n in nodes.items():
            w = f"{w0}.{nid}"
            if set(n) - NODE_KEYS: err(fn, f"{w} unknown fields {set(n)-NODE_KEYS}")
            if "say" in n: echo_line(n["say"], w)
            elif "branch" not in n: err(fn, f"{w} has neither say nor branch")
            if n.get("expr", "neutral") not in EXPR: err(fn, f"{w} bad expr")
            if "react" in n and n["react"] not in REACT: err(fn, f"{w} bad react")
            if "memory" in n: check_tokens(n["memory"], w); check_banned(n["memory"], w)
            if "choices" in n:
                if not 2 <= len(n["choices"]) <= 4: err(fn, f"{w} needs 2–4 choices")
                if "next" in n: err(fn, f"{w} has both choices and next")
                for j, ch in enumerate(n["choices"]):
                    cw = f"{w}.choice{j}"
                    if set(ch) - CHOICE_KEYS: err(fn, f"{cw} unknown fields {set(ch)-CHOICE_KEYS}")
                    if not ch.get("icon") or not ch.get("label"): err(fn, f"{cw} needs icon and label")
                    check_banned(ch.get("label", ""), cw)
                    if "reply" in ch: echo_line(ch["reply"], cw)
                    if ch.get("expr", "neutral") not in EXPR: err(fn, f"{cw} bad expr")
                    if "react" in ch and ch["react"] not in REACT: err(fn, f"{cw} bad react")
                    if "cond" in ch: check_cond(ch["cond"], cw)
                    if "memory" in ch: check_tokens(ch["memory"], cw); check_banned(ch["memory"], cw)
                    if "goto" in ch: edges[nid].add(ch["goto"])
            if "next" in n: edges[nid].add(n["next"])
            for br in n.get("branch", []):
                check_cond(br.get("cond", {}), w); edges[nid].add(br.get("goto"))
        for a, bs in edges.items():
            for b in bs:
                if b not in nodes: err(fn, f"{w0}.{a} points to missing node {b!r}")
        reach, st = set(), [c["start"]]
        while st:
            x = st.pop()
            if x in reach or x not in nodes: continue
            reach.add(x); st.extend(edges[x])
        for nid in nodes:
            if nid not in reach: err(fn, f"{w0}.{nid} unreachable")
        turns = len(reach)
        if turns < 2: warn(fn, f"{w0} has only {turns} node(s)")
    if sp == "whimber" and stats["lines"] and stats["excl"] > stats["lines"] / 20:
        err(fn, f"Whimber exclamation budget exceeded: {stats['excl']} '!' in {stats['lines']} lines (max 1 per 20)")
    return d

def main():
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dialogue')
    shared_pool = defaultdict(list); ids = set()
    lint_file(os.path.join(root, "shared.json"), ids, shared_pool)
    for sp in ("slyte", "whimber"):
        pool = defaultdict(list, {k: list(v) for k, v in shared_pool.items()})
        lint_file(os.path.join(root, f"{sp}.json"), ids, pool)
        for text, where in pool.items():
            if len(where) > 1: err(sp, f"duplicate line ×{len(where)}: {text!r} at {where[:4]}")
    for w in warns: print(w)
    for e in errors: print(e)
    print(f"\n{len(errors)} error(s), {len(warns)} warning(s)")
    sys.exit(1 if errors else 0)
if __name__ == "__main__": main()
