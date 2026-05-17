# RIVER — Multiplayer Implementation Spec

## Start Here

Before writing a single line of code, inspect the existing repository thoroughly.
Read every source file. Understand what's already built — the learning system,
the UI, the single-player game engine, the bot logic. You are extending a working
app, not starting from scratch. Identify what needs to change, what can be reused,
and what needs to be rewritten to support multiplayer correctly.

If the current engine architecture makes multiplayer difficult, rewrite it.
Correctness and clean architecture matter more than preserving existing code.
The goal is the best poker app in the world. Make decisions accordingly.

---

## What You're Building

River is a luxury poker learning and playing app. You are adding:

- Real-time multiplayer (2–9 players per table)
- Frictionless identity (username only, no email, no password)
- User presence (who's online, who's at which table, live seat indicators)
- LLM-powered bot personalities (shit talk, table banter, post-hand commentary)
- A lobby system (create table, browse tables, join with a code)
- Persistent player state (chip stack across sessions, hand history, stats)

---

## Repository Structure

Organize this as a monorepo. How you structure it is your call — use whatever
monorepo tooling makes the most sense given the existing codebase. The constraint
is that packages should be cleanly separated by concern and the game engine should
be importable independently of any framework or runtime.

Likely packages:
- `packages/engine` — pure poker logic, zero dependencies, framework-agnostic
- `packages/server` — Bun game server, WebSocket handling, bot logic
- `packages/web` — Next.js frontend (the existing app lives here)
- `packages/shared` — types and utilities shared across packages

Again — this is a suggestion, not a prescription. You know what structure will
produce the cleanest result. Use your judgment.

---

## Programming Paradigm

The game engine should be purely functional — immutable state, pure functions,
no side effects. `applyAction(state, action) → newState` is the right mental model.
The state machine transitions should be explicit and testable.

For the server and connection handling, use whatever pattern best fits the
problem — classes for stateful objects like `PokerTable` and `PlayerSession` are
appropriate and idiomatic. Don't force a paradigm where it doesn't fit.

Choose the best data structures for the performance characteristics needed:
fast lookups for active tables and players, efficient broadcast fan-out,
minimal allocations in the hot action-processing path.

---

## Identity & Auth

Frictionless is the priority. The flow:

1. User lands on River
2. They pick a username (shown at the table, stored persistently)
3. A session token is generated and stored in localStorage / a cookie
4. That's it — they're in

No email. No password. No OAuth unless they want it later.

The username + session token IS their identity. Persist it so returning users
pick up where they left off — their chip stack, hand history, stats.

If a username is taken, prompt them to pick another. Keep it instant.

In future this can be upgraded to real auth without breaking anything — build
the session layer cleanly so that's a drop-in addition later.

---

## Server Architecture

**Runtime:** Bun. Use Bun's native HTTP and WebSocket APIs directly — no Hono,
no Express, no additional HTTP framework needed.

**Game state:** Lives in memory. Each active table is an object in a Map.
No database reads in the hot action path. A player acts → engine processes →
server broadcasts. That entire loop should be microseconds.

**Persistence:** Bun's built-in SQLite for hand history and session data — it's
synchronous and lives in the same process, so there's zero network overhead.
A proper Postgres instance for anything that needs to survive a server restart
and be queried across sessions — user accounts, chip balances, stats.

**WebSocket model:** One persistent WebSocket connection per player. The server
broadcasts personalized state — each player's view is filtered so they only
see cards they're entitled to see. Hole cards for other players are hidden
until showdown.

**Authoritative server:** The server is the single source of truth. Clients
send actions, never state. The server validates every action against the
current game state before applying it. Clients are untrusted.

---

## Table Lifecycle

```
Lobby
  └─ Player creates table (sets blind levels, max players, buy-in range)
     └─ Table gets a short join code (e.g. "RIVER-4829")
        └─ Other players join via code or lobby browser
           └─ Host starts the game when ready (min 2 players)
              └─ Game runs until players leave or chips run out
                 └─ Table closes, results persisted
```

Handle mid-hand disconnection gracefully: start a fold timer (configurable,
default 30 seconds) when a player's connection drops. If they reconnect before
the timer expires, they continue. If not, their hand is folded and play continues.
The table should never stall because someone's internet cut out.

Handle the case where only one human remains — fill empty seats with bots
at the appropriate difficulty so the game continues. Let the human toggle this.

---

## Presence System

Presence is a first-class feature, not an afterthought.

Players should see:
- Who is online in the lobby right now
- Which tables are active, how many players, what stakes
- Live seat indicators at the table — connected (green), disconnected (yellow),
  fold-timer counting down (red with countdown)
- When a player joins or leaves a table, everyone sees it immediately

Presence state should update in real time via the existing WebSocket connection —
no separate polling, no separate connection.

---

## Bot System

Bots fill empty seats when a table doesn't have enough humans. They should
be indistinguishable from humans in terms of timing and presentation.

**Decision making:** Keep the existing rules-based engine. It makes correct
poker decisions. An LLM does not improve decision quality here — it would
make it worse. The three tiers (Fish Freddy, TAG Terry, GTO Gary) are right.

**Personality layer — this is where LLMs come in:**

Use the Vercel AI SDK for all LLM operations. Configure it to use OpenRouter
as the provider so any model can be swapped in via environment variable.
The model should be configurable without code changes.

The LLM layer is:
- Async, non-blocking, completely off the hot path
- Cosmetic only — it never influences game decisions
- Gracefully degraded — if it fails or times out, bots act silently
- Cheap — use a fast, small model (the equivalent of claude-haiku or gpt-4o-mini)

What the LLM generates per bot action:
- **Table talk** (70% of actions): A short in-character comment about the action
  just taken. Max 12 words. Personality-appropriate. Occasionally trash talk,
  occasionally complimentary, occasionally deadpan.
- **Post-hand commentary** (every showdown): A brief reaction to the result.
  Fish Freddy is confused or lucky. TAG Terry is analytical. GTO Gary is
  unbothered.
- **Coaching whisper** (when coaching mode is on, human actions only):
  A one-sentence explanation of whether the action was good and why.
  This should feel like a wise, calm coach — not a chatbot.

Bot prompt design: give each personality a clear character brief. Freddy is
a retired accountant who plays too many hands and can't believe his luck.
Terry is a young professional who read one poker book and never shut up about
position. Gary speaks almost entirely in percentages and pot fractions.
They should feel like real people at a table.

The Vercel AI SDK setup should make switching from OpenRouter to Anthropic
direct, or OpenAI, or any other provider a one-line config change.

---

## Lobby

The lobby is the social layer of River.

- Live table browser: see all active tables, stakes, player count, seats available
- Quick join: one click to sit at any open table
- Create table: set blinds, buy-in, max players, public/private
- Private tables: join via code only (shareable link works too)
- Player list: who else is in the lobby right now (presence)

The lobby updates in real time. No page refresh, no polling.

---

## Hand History & Stats

Every hand should be recorded:
- All actions on every street
- Final board
- Hole cards at showdown
- Pot distribution and winners
- Each player's stack before and after

Stats to track and display per player:
- VPIP, PFR, win rate, hands played
- Biggest pot won, longest session
- Profit/loss over time (chart)
- Poker IQ score (already exists in the learning system — connect it to real play)

Hand history should be replayable street-by-street using the existing
PlayingCard and CommunityCards components.

---

## Chip Economy

Players start with a default chip stack (configurable). Chips persist across
sessions. If a player goes broke, they can top up from a free daily allocation —
this is a play-money app, not real money.

Keep the economy simple and frictionless. The goal is to have something to
play for without it being stressful.

---

## What "Best in the World" Means Here

A few things that separate a great poker app from a mediocre one:

**Speed.** Action to broadcast should feel instant. The server loop must be fast.
No unnecessary async in the hot path.

**Correctness.** Side pots, all-in run-outs, BB option, split pots, minimum
raise rules — all of it must be exactly right. If the current engine has
gaps, fix them. A poker app that makes a wrong ruling at showdown is broken.

**Feel.** The animations, the timing of bot actions, the chip sounds, the
reveal at showdown — these are what make poker feel like poker. The UI already
has good bones. The multiplayer layer should make it feel alive.

**Reliability.** A hand should never get stuck. There should always be a path
forward — if a player disconnects, the timer fires and the hand continues.
If something goes wrong server-side, the error should be recoverable without
losing the hand state.

**Presence.** Knowing there are real people at the table — their usernames,
their reaction times, their chat — is what makes multiplayer worth building.
Lean into it.

---

## Technical Constraints

- Vercel AI SDK for all LLM calls. OpenRouter as default provider.
  Model configurable via environment variable.
- Bun native HTTP/WebSocket. No additional HTTP framework.
- Monorepo. Engine must be independently importable and testable.
- TypeScript throughout. Strict mode.
- The existing Next.js frontend stays on Next.js. The game server is a
  separate Bun process. They communicate — the frontend connects to the
  game server via WebSocket for real-time, and via HTTP for lobby/auth.
- No prescribed data structures — choose what's fastest and clearest
  for each use case.

---

## Deliverables

When done, River should support:

1. A player landing on the site, picking a username, and being at a table
   within 30 seconds
2. 2–9 real players (or human + bots) playing a full game of No-Limit Hold'em
3. Bot personalities with LLM-generated table talk
4. Live presence — who's online, who's at what table
5. Hand history and stats persisted across sessions
6. A lobby to find and create tables
7. Graceful disconnection handling
8. The existing learning system still fully working alongside multiplayer

The app should feel like it was built by a small team of obsessives who
actually play poker and actually care about software quality. Because it was.
