'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LESSONS } from '@/constants/lessons';
import { useGameStore } from '@/stores/gameStore';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayingCard } from '@/components/game/PlayingCard';
import type { LessonId, Card as PokerCard, Rank, Suit } from '@river/engine';

type LessonPageProps = {
  lessonId: LessonId;
};

type QuizQuestion = {
  question: string;
  answers: string[];
  correct: number;
  feedback: string;
};

// ─── Utility ────────────────────────────────────────────────────────────────

function pc(rank: string, suit: string): PokerCard {
  return { rank: rank as Rank, suit: suit as Suit };
}

// ─── Shared lesson components ────────────────────────────────────────────────

function PokerTerm({ term, definition }: { term: string; definition: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <span
        className="cursor-help border-b border-dotted border-[var(--accent)] text-[var(--accent)]"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {term}
      </span>
      {open && (
        <span className="absolute bottom-full left-0 z-50 mb-2 w-60 rounded-md border border-emerald-100/20 bg-[#0d2318] p-3 text-xs leading-5 text-[var(--text-muted)] shadow-xl">
          {definition}
        </span>
      )}
    </span>
  );
}

function OpeningHook({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-7 max-w-3xl text-[15px] leading-7 text-[var(--text-muted)]">{children}</p>
  );
}

function MistakeCallout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="mt-7 border-t border-emerald-100/10 pt-4">
      <div className="max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
        <span className="mr-2 font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]">Watch for</span>
        {children}
      </div>
    </aside>
  );
}

function LessonConnector({ nextId, nextTitle, reason }: { nextId: LessonId; nextTitle: string; reason: string }) {
  return (
    <Link
      href={`/learn/${nextId}`}
      className="mt-8 flex items-center justify-between gap-4 rounded-md border border-emerald-100/10 bg-emerald-500/5 px-4 py-3 transition-colors hover:border-[var(--accent)]"
    >
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">What to learn next</div>
        <div className="mt-0.5 font-serif text-lg text-[var(--text-primary)]">{nextTitle}</div>
        <div className="mt-0.5 text-xs text-[var(--text-muted)]">{reason}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--accent)]" />
    </Link>
  );
}

function HandCards({ cards, size = 'sm' }: { cards: PokerCard[]; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex flex-wrap gap-1">
      {cards.map((card, i) => (
        <PlayingCard key={i} card={card} size={size} />
      ))}
    </div>
  );
}

type PracticeScenario = {
  spot: string;
  prompt: string;
  answers: string[];
  correct: number;
  reason: string;
};

const quizQuestions: Record<LessonId, QuizQuestion[]> = {
  'how-poker-works': [
    { question: 'There are two ways to win a pot. What are they?', answers: ['Have the best hand at showdown, or make every other player fold', 'Win the most hands per session, or have the most chips to start', 'Bluff on every street, or never bet at all'], correct: 0, feedback: 'Every decision in poker aims at one of these two outcomes. Either you show the best hand at showdown, or you bet in a way that convinces all other players to fold before showdown — winning the pot without ever revealing your cards.' },
    { question: 'What is the "flop" in Texas Hold\'em?', answers: ['The first three community cards revealed face up', 'The two hole cards dealt privately to each player', 'The final single card dealt on the last betting round'], correct: 0, feedback: 'The flop is the first three of five community cards placed face up in the center of the table. All players share these cards. Combined with each player\'s two private hole cards, they start to form a final five-card hand.' },
    { question: 'Why do blinds exist in poker?', answers: ['To create a pot worth winning so players have incentive to play hands', 'To punish the players sitting closest to the dealer', 'To determine which player has the best position in the hand'], correct: 0, feedback: 'Without forced bets, players could fold every hand and wait indefinitely for the perfect cards. Blinds create a prize — the growing pot — that makes entering each hand worth considering, even before you\'ve seen your cards.' },
    { question: 'Which action is free and passes the action without putting chips in?', answers: ['Check — only available when no bet has been made on this street', 'Fold — you surrender your hand and exit the pot', 'Call — you match the exact amount of the current bet'], correct: 0, feedback: 'A check costs nothing and moves action to the next player, but it\'s only available when no one has bet yet on that street. Once a player bets, checking is no longer an option — you must fold, call, or raise.' },
    { question: 'How many community cards are dealt in total in Texas Hold\'em?', answers: ['Five — three on the flop, one on the turn, one on the river', 'Two — one on the turn, one on the river', 'Seven — two per player plus three community cards'], correct: 0, feedback: 'Five shared community cards are dealt in three rounds: three on the flop, one on the turn, one on the river. Each player also holds two private hole cards, giving seven total cards from which to build the best five-card hand.' },
  ],
  'hand-rankings': [
    { question: 'Which hand is stronger: Full House or Flush?', answers: ['Full House', 'Flush', 'They tie'], correct: 0, feedback: 'Full House ranks above Flush. Three matching cards plus a pair is harder to make than five suited cards — the hand hierarchy reflects raw combinatorial rarity.' },
    { question: 'What beats four of a kind?', answers: ['Straight Flush (or Royal Flush)', 'Full House', 'Flush'], correct: 0, feedback: 'Only a Straight Flush or Royal Flush beats Four of a Kind. Nothing else in the hand hierarchy outranks quads except five consecutive same-suited cards.' },
    { question: 'Both players hold a pair. Player A has Queens, Player B has Tens. Who wins?', answers: ['Player A — higher pair wins', 'Player B — lower pairs are rarer', 'Split pot'], correct: 0, feedback: 'The higher pair always wins. Queens outrank Tens, so Player A takes the pot. Rank of the pair is the first tiebreaker for One Pair hands.' },
    { question: 'A "wheel" straight is:', answers: ['A-2-3-4-5', 'A-K-Q-J-T', '2-3-4-5-6'], correct: 0, feedback: 'A-2-3-4-5 is called the wheel — the only straight where the Ace plays low. A-K-Q-J-T is a Broadway straight (the Royal Flush version). The wheel is the lowest-ranked straight.' },
    { question: 'Both players\' best five cards are identical using the community cards. What happens?', answers: ['The pot is split equally', 'The player in position wins', 'The hand is replayed'], correct: 0, feedback: 'When both players\' best five-card hands are identical in rank, suits are irrelevant and the pot is split. This happens most often when the board plays — five strong community cards that neither player can improve.' },
  ],
  position: [
    { question: 'Which seat has the best postflop position in every hand?', answers: ['Button (BTN)', 'Small Blind (SB)', 'Under the Gun (UTG)'], correct: 0, feedback: 'The Button acts last on every postflop street. This is a permanent positional advantage — you see every opponent\'s action before deciding, which is worth a significant edge over thousands of hands.' },
    { question: 'Who acts first preflop in a heads-up (2-player) game?', answers: ['The dealer / Small Blind', 'The Big Blind', 'It alternates randomly'], correct: 0, feedback: 'In heads-up, the dealer posts the Small Blind and acts first preflop — but last postflop. This is unique to heads-up play. In full-ring games, UTG always acts first preflop.' },
    { question: 'Why does acting last give you an advantage?', answers: ['You see every opponent\'s action before deciding', 'You get extra cards', 'You pay no blinds'], correct: 0, feedback: 'Information is everything in poker. Acting last means every bet, check, and raise before you is data — you know whether opponents showed strength or weakness before you commit a single chip.' },
    { question: 'Under the Gun (UTG) should play:', answers: ['A tight range — mostly premium hands', 'Any two cards, position doesn\'t matter preflop', 'Only aces and kings'], correct: 0, feedback: 'UTG opens into the widest possible field — every player behind has position and can re-raise. A tight UTG range avoids being dominated and out-of-position against strong hands. The further from the button, the tighter you play.' },
    { question: 'The Small Blind is a difficult position because:', answers: ['It acts first on every postflop street', 'It always acts last preflop', 'It pays no fee to enter pots'], correct: 0, feedback: 'The Small Blind acts first postflop on every street — flop, turn, and river. Despite the discount to enter preflop, it\'s the worst seat in a hand because you\'re always giving opponents information before acting yourself.' },
  ],
  'pot-odds': [
    { question: 'Pot is $100, opponent bets $25. What are your pot odds?', answers: ['20% — you call $25 to win $125 total', '25% — pot to call ratio', '33% — bet as fraction of pot'], correct: 0, feedback: 'Call ($25) ÷ Total pot after calling ($125) = 20%. You need to win at least 1 in 5 times to break even. The formula is always: call amount ÷ (pot + call).' },
    { question: 'Four outs on the turn (one card to come) gives you roughly:', answers: ['8% equity', '32% equity', '4% equity'], correct: 0, feedback: 'The quick rule: outs × 2 for one card, outs × 4 for two cards. Four outs × 2 = 8%. This is the "rule of 2 and 4" — a reliable estimate that\'s accurate enough for live decisions.' },
    { question: 'Your equity is 30%. The pot odds are 25%. Should you call?', answers: ['Yes — equity exceeds the required price', 'No — any draw should fold', 'Only if you have position'], correct: 0, feedback: 'Correct. When your equity (30%) exceeds the pot odds price (25%), calling shows a long-run profit. The difference — 5 percentage points here — is your edge on the call.' },
    { question: 'The pot odds formula is:', answers: ['Call ÷ (Pot + Call)', 'Pot ÷ Call', 'Outs ÷ Pot'], correct: 0, feedback: 'Call ÷ (Pot + Call) gives you the percentage of the final pot you\'re paying. This is the break-even equity. If your actual equity exceeds this number, call. If it doesn\'t, fold.' },
    { question: 'A flush draw has nine outs on the flop (two cards to come). Approximate equity:', answers: ['36% — nine outs × 4', '9% — one out per card', '18% — nine outs × 2'], correct: 0, feedback: 'Nine outs × 4 = 36% with two cards to come. This is why flush draws are so profitable to play — they have enough equity to call most reasonable bets on the flop, and they become disguised when they complete.' },
  ],
  'starting-hands': [
    { question: 'Which is a premium starting hand?', answers: ['Pocket Aces (AA)', '7-2 offsuit', 'J-4 offsuit'], correct: 0, feedback: 'Pocket Aces is the strongest starting hand in hold\'em — it dominates every other hand preflop and wins roughly 85% of the time against a random hand. 7-2 offsuit is the weakest possible hand.' },
    { question: 'Why are Button (BTN) opening ranges wider than UTG ranges?', answers: ['Fewer players remain to act, and you have postflop position', 'The blinds are larger from the button', 'The button sees an extra card'], correct: 0, feedback: 'From the Button, only two players (SB and BB) remain. You have position postflop guaranteed. From UTG, six or more players can wake up with a strong hand and you\'ll be out of position if called. Range width reflects both these factors.' },
    { question: 'Suited connectors (like 7♠ 8♠) work best when:', answers: ['Stacks are deep and you have position', 'You\'re short-stacked all-in', 'The board is always dry'], correct: 0, feedback: 'Suited connectors need deep stacks because their value comes from implied odds — winning a big pot when they hit a flush or straight. Short stacks don\'t have enough depth to justify speculative calls. Position helps you control pot size.' },
    { question: 'Under the Gun with A-8 offsuit. The correct bias is:', answers: ['Fold — dominated aces lose badly when called', 'Open raise any ace', 'Always suited so always open'], correct: 0, feedback: 'A-8 offsuit from UTG is a leak. When UTG opens and gets called or 3-bet, the caller often holds AK, AQ, AJ — all of which dominate A-8. You\'re putting money in badly and you\'ll be out of position.' },
    { question: 'A-K suited (AKs) is classified as:', answers: ['Premium — top 1% of starting hands', 'A marginal hand to limp with', 'A fold against aggression'], correct: 0, feedback: 'AKs is the third-best starting hand, behind only AA and KK. It makes the top pair with the best kicker, has nut flush potential, and has blockers to AA and KK — meaning opponents are less likely to hold those hands.' },
  ],
  'bet-sizing': [
    { question: 'Betting 25% of the pot gives your opponent:', answers: ['Excellent pot odds — roughly 5:1', 'No odds at all', 'A 50/50 price'], correct: 0, feedback: 'A 25% pot bet means opponent calls 1 unit to win 5 (the pot plus the bet). That\'s 5:1 odds — so cheap that most draws, overcards, and even weak hands can profitably call. Small bets charge nothing meaningful.' },
    { question: 'A value bet is designed to:', answers: ['Get called by hands that lose to you', 'Make stronger hands fold', 'Win without going to showdown'], correct: 0, feedback: 'Value betting means you believe you have the best hand and want worse hands to call. The key question is: "What worse hands would call this bet?" If the answer is none, check — don\'t bet for value with no value target.' },
    { question: 'An overbet (larger than the pot) primarily creates:', answers: ['Maximum fold equity and polarization', 'Free cards for draws', 'Dead money blinds'], correct: 0, feedback: 'Overbets put maximum pressure on medium-strength hands. They\'re most effective as the final bet on the river where hands are either strong (value overbet) or air (bluff overbet) — polar ranges that aren\'t affected by draw pricing.' },
    { question: 'A standard value bet size falls in the range of:', answers: ['50–75% of the pot', '1 big blind always', '200–500% of the pot'], correct: 0, feedback: '50–75% of the pot is the most common value bet range. It charges draws adequately (giving roughly 25–33% pot odds) while extracting enough value from calling hands. Smaller gets called too cheaply; larger folds out value targets.' },
    { question: 'Your bet sizing directly controls:', answers: ['The pot odds you offer your opponent', 'The order cards are dealt', 'Which seat acts first'], correct: 0, feedback: 'Every bet size is an offer. Bet small, opponent gets good odds and should call more hands. Bet large, opponent gets poor odds and should fold more. Sizing is a tool — use it to shape the decisions your opponents face.' },
  ],
  'board-texture': [
    { question: 'A "wet" board primarily features:', answers: ['Connected cards and/or suited cards that create many draws', 'Three unconnected cards of different suits', 'A paired board card'], correct: 0, feedback: 'Wet boards have high draw density — flush draws, straight draws, combo draws. Many hands in an opponent\'s range "connect" on wet boards, which means you should be more cautious and charge draws aggressively when you have made hands.' },
    { question: 'A "monotone" flop means:', answers: ['All three cards share one suit', 'Three cards of three different suits', 'Two cards of the same rank'], correct: 0, feedback: 'Monotone means one suit across all three flop cards — e.g., A♥ 7♥ 3♥. Whoever holds two hearts has already made a flush. One heart gives a draw. Even opponents without hearts must account for flush pressure on every action.' },
    { question: 'On a paired board (e.g., Q-Q-4), the main change to ranges is:', answers: ['Trips and full houses become possible, changing who has nutted hands', 'Only straights are possible', 'Range advantage disappears completely'], correct: 0, feedback: 'Paired boards transfer equity toward whoever holds the paired rank. Q-Q-4 heavily favors anyone holding a queen (trips or full house). Whoever lacks a queen must be cautious facing heavy bets — even top pair can be crushed.' },
    { question: 'A dry, rainbow board (e.g., K-7-2 with three suits) typically:', answers: ['Favors the preflop raiser who can small-bet frequently', 'Creates maximum draw danger', 'Makes bluffing impossible'], correct: 0, feedback: 'Dry boards miss most calling ranges. The preflop raiser can exploit this with small, frequent continuation bets because most opponents missed completely. There\'s no draw to charge — just fold equity against air.' },
    { question: 'A "rainbow" flop has:', answers: ['Three different suits — no flush draw possible', 'All cards the same suit', 'Two cards of matching rank'], correct: 0, feedback: 'Rainbow means three different suits — zero flush draw potential on the flop. This significantly lowers the number of strong drawing hands in any range, making the board "drier" than a two-tone or monotone flop even if the cards are connected.' },
  ],
  'bluffing-basics': [
    { question: 'For a bluff to show long-run profit, it requires:', answers: ['Enough fold equity — opponent folds often enough to cover bet cost', 'Showdown value in your hand', 'A dry board always'], correct: 0, feedback: 'Fold equity is the core of a bluff\'s profitability. If you bet $75 into $100, you need folds 43% of the time to break even (75 ÷ 175). Below that threshold, every bluff loses money. Estimate fold frequency before betting.' },
    { question: 'Bluffing into multiple opponents is:', answers: ['Less effective — each extra caller reduces fold equity dramatically', 'More effective — bigger pot if it works', 'Identical to heads-up bluffing'], correct: 0, feedback: 'In a three-way pot, your bluff needs all three opponents to fold. If each folds 50% independently, the combined fold rate is 50% × 50% × 50% = 12.5%. Multiway bluffs fail far more often than the math of a single opponent.' },
    { question: 'A blocker improves a bluff because:', answers: ['It removes combos from the opponent\'s calling range', 'It guarantees a fold', 'It gives you extra equity at showdown'], correct: 0, feedback: 'If you hold A♠ and the board is four spades, your opponent cannot hold the nut flush (A♠ is in your hand). This makes your bluff more credible — you represent a range that includes the flush — and reduces the number of nutted hands that can call.' },
    { question: 'Break-even fold percentage for a bluff is calculated by:', answers: ['Bet ÷ (Pot + Bet)', 'Pot ÷ Stack', 'Outs × 10'], correct: 0, feedback: 'Bet ÷ (Pot + Bet) = break-even fold rate. Bet $90 into $160 pot: 90 ÷ 250 = 36%. If your opponent folds more than 36% of the time, the bluff profits. If they fold less, you\'re burning chips.' },
    { question: 'A semi-bluff (e.g., betting a flush draw) is better than a pure bluff because:', answers: ['You win even when called if your draw completes', 'You have guaranteed showdown value', 'Pure bluffs are illegal'], correct: 0, feedback: 'A semi-bluff has two ways to win: fold equity now, or equity if called. A flush draw has ~36% equity — so even when called, you\'re not in a disaster. A pure air bluff has 0% equity if called and loses a full bet every time it fails.' },
  ],
  'bankroll-management': [
    { question: 'The standard minimum bankroll for cash games is:', answers: ['20 buy-ins at your stake level', '2 buy-ins — just enough to reload', '200 buy-ins for safety'], correct: 0, feedback: '20 buy-ins is the widely-cited cash game minimum. Even a skilled player can experience 10–15 buy-in downswings through normal variance. Fewer than 20 buy-ins means a normal downswing could end your ability to play at that stake.' },
    { question: 'Tournament bankrolls need to be larger because:', answers: ['Variance is extreme — most entries return nothing', 'There are no blinds in tournaments', 'Buy-ins are always smaller'], correct: 0, feedback: 'A tournament player cashes maybe 15–20% of the time. The rest of the time, the entire entry is lost. Even a skilled player will lose 50+ buy-ins in a row through pure variance. Tournament bankroll guidelines range from 50 to 100+ buy-ins.' },
    { question: 'Strict bankroll rules primarily protect against:', answers: ['Ruin — going broke and unable to play', 'Winning too fast', 'Making good folds'], correct: 0, feedback: 'Ruin is the technical term for going broke. Once you\'re ruined, the game is over — no more decisions to make. Bankroll management ensures that even a long run of bad luck can\'t end your poker career entirely.' },
    { question: 'The common tournament bankroll guideline is:', answers: ['50 buy-ins minimum', '5 buy-ins — similar to cash', '1 buy-in per event'], correct: 0, feedback: '50 buy-ins is the conservative tournament guideline for most formats. High-variance formats like bounty tournaments or large MTTs may require 100+ buy-ins. The logic: with a 10% ROI and 15% cash rate, even strong players need volume to realize their edge.' },
    { question: 'Variance describes:', answers: ['Short-term luck swings that affect results independent of skill', 'Guaranteed long-run losses for everyone', 'A strategy for stealing blinds'], correct: 0, feedback: 'Variance is the statistical scatter around your expected win rate. A winning player with 5 bb/100 win rate will still have losing months, losing 10,000-hand stretches, and 20 buy-in downswings. This is normal, not a sign the player is losing.' },
  ],
  'implied-odds': [
    { question: 'Implied odds are relevant when:', answers: ['Pot odds don\'t justify calling, but future winnings might', 'The pot odds already justify calling', 'You are on the river with one card to come'], correct: 0, feedback: 'Implied odds fill the gap when pot odds say fold but future value changes the math. They only apply when there are cards left to come and a realistic chance of winning a larger pot if you hit.' },
    { question: 'Implied odds are ZERO on the river because:', answers: ['No more cards are dealt — there\'s no future pot to win', 'The river is always dry', 'Bluffing is not allowed on the river'], correct: 0, feedback: 'Implied odds require future streets. On the river, you\'re already seeing the final card — what you call is what you win. There\'s no "future pot" that grows after this. River decisions are always pure pot odds.' },
    { question: 'Which hand benefits MOST from implied odds?', answers: ['A set draw (pocket pair hoping to flop a set)', 'Top pair with top kicker', 'A busted straight draw on the river'], correct: 0, feedback: 'Set draws have the best implied odds because sets are disguised — opponents with top pair won\'t know they\'re beat. When a set hits, you often win your opponent\'s entire stack. Flopping a set happens roughly 12% of the time with a pocket pair.' },
    { question: 'Implied odds are LESS reliable when:', answers: ['Your draw is obvious and opponents will fold when you hit', 'The pot is large', 'You have position'], correct: 0, feedback: 'If you\'re drawing to a flush on a three-flush board, a careful opponent will be wary when the flush card hits and may not pay you off. Implied odds require "hidden" outs — draws opponents won\'t see coming. Obvious draws collect fewer chips when they complete.' },
    { question: 'The formula for estimated call profitability with implied odds is:', answers: ['(Pot odds equity gap) must be covered by expected future winnings', 'Always call if you have any draw', 'Implied odds = pot × outs'], correct: 0, feedback: 'If pot odds require 33% equity but you have 20%, the gap is 13 percentage points. To justify calling, the implied value from hitting must cover that shortfall across all the times you call and miss. The bigger the gap, the more future value you need.' },
  ],
  'reading-opponents': [
    { question: 'The most reliable information in online poker comes from:', answers: ['Betting patterns and sizing choices across multiple hands', 'How quickly they click buttons', 'Their screen name or avatar'], correct: 0, feedback: 'Betting patterns are durable and reliable. A player who always bets 2x pot on the river with strong hands and 50% with medium hands is giving you exploitable information on every hand. Physical tells don\'t exist online — patterns do.' },
    { question: 'Opponent bets large on all three streets. Their range is most likely:', answers: ['Polarized — very strong hands or complete bluffs', 'Purely medium-strength hands', 'Always a set or better'], correct: 0, feedback: 'Triple-barrel large sizing is a polar line. Most medium-strength hands (top pair, two pair) don\'t bet large all three streets — they\'re too vulnerable. This line represents either the nuts or air. The key is identifying which and responding accordingly.' },
    { question: 'Putting an opponent "on a range" means:', answers: ['Assigning a set of hands they could plausibly hold given all their actions', 'Guessing one specific hand they hold', 'Counting their chips to estimate strength'], correct: 0, feedback: 'Range thinking replaces hand-reading with probability. Instead of "they have KQ," you think "they could have KQ, AQ, AJ, some flush draws, and occasional bluffs." Every action narrows that range. By the river, you have a clearer picture of what they\'re representing.' },
    { question: 'A player raises preflop, bets flop, then checks the turn. This often indicates:', answers: ['Giving up or slowing down — a medium or weak hand', 'The strongest possible hand always', 'A forced timing tell with no meaning'], correct: 0, feedback: 'Bet-bet-check is a common "giving up" line with continuation bets that got called. Strong hands typically keep betting for value. A check on the turn often means the opponent missed or has showdown value but doesn\'t want to build a bigger pot.' },
    { question: 'The primary goal of ranging opponents is:', answers: ['To make better decisions by knowing what they\'re likely to hold', 'To memorize every hand they\'ve played', 'To bluff more often'], correct: 0, feedback: 'Range construction is a decision tool. When you know an opponent\'s likely range, you know whether to call, fold, or raise — and at what size. It moves you from reacting to a single hand to playing against a distribution of possibilities.' },
  ],
  'common-mistakes': [
    { question: 'The single most common preflop mistake for beginners is:', answers: ['Playing too many hands (high VPIP)', 'Playing too few hands', 'Only playing suited hands'], correct: 0, feedback: 'Most beginners play 40–60% of hands; a winning player plays 15–25% from most positions. Every extra hand you play from a bad position with weak cards is a small loss. Over thousands of hands, loose preflop play is the #1 leak to fix first.' },
    { question: 'Limping (just calling the big blind preflop) instead of raising is wrong because:', answers: ['It builds a small pot with a hand that should build a larger pot, and gives everyone behind good odds to play', 'Raising is always wrong preflop', 'Limping is correct with premium hands'], correct: 0, feedback: 'Limping with strong hands wastes value (you want to play a big pot with AA, not a tiny one) and gives every remaining player a cheap price to enter. Raising isolates weaker opponents, builds the pot, and starts establishing fold equity.' },
    { question: '"Results-oriented" thinking is dangerous because:', answers: ['It confuses good decisions with good outcomes — bad calls sometimes win, good folds sometimes miss a winner', 'Outcomes are the only measure of skill', 'It makes you more disciplined'], correct: 0, feedback: 'Poker is measured over thousands of decisions, not individual hands. A bad call that wins is still a bad call. A good fold that would have won is still a good fold. Judging your play by results rather than process leads to reinforcing mistakes and abandoning correct plays.' },
    { question: 'When you lose a big pot, the correct response is:', answers: ['Continue playing your normal game and review the hand later', 'Immediately play higher stakes to win it back', 'Limp every hand to see cheap flops until even'], correct: 0, feedback: 'Emotional control is a skill. Playing larger stakes after a loss to "get even" is called tilt — and it turns a single bad beat into a session-destroying spiral. Log the hand, play your game, review later. The chips are gone; protect the rest.' },
    { question: 'The correct move when your bankroll falls below 20 buy-ins at your current stake is:', answers: ['Move down in stakes immediately', 'Move up to win it back faster', 'Stop playing until fully recovered'], correct: 0, feedback: 'Moving down protects two things: your remaining bankroll, and your decision-making. Scared money plays scared poker. At 20 buy-ins, you have a cushion. Below that floor, drop a stake level and rebuild — there\'s no shame in protecting your ability to keep playing.' },
  ],
};

const practiceScenarios: Record<LessonId, PracticeScenario[]> = {
  'how-poker-works': [
    {
      spot: 'Two ways to win',
      prompt: 'The pot is $200. You hold A♠ K♠ — a strong but not guaranteed hand. Your opponent bets $100 on the river. You raise to $300. They fold. How did you win?',
      answers: ['Fold equity — they surrendered, no showdown needed', 'Best hand at showdown', 'You won because you raised'],
      correct: 0,
      reason: 'When your opponent folded, the pot was awarded to you immediately — no cards were shown. You won via fold equity, the second path to winning. Your actual hand never mattered.',
    },
    {
      spot: 'Community cards',
      prompt: 'Board: K♦ 9♠ 3♥ J♣ 2♦. You hold A♠ K♣. What is your best five-card hand?',
      answers: ['One pair — Kings (A♠ K♣ K♦ J♣ 9♠)', 'Two pair — Aces and Kings', 'Three of a kind — Kings'],
      correct: 0,
      reason: 'You hold A♠ K♣. The board has K♦ — giving you one pair of Kings. Your best five cards are A♠ K♣ K♦ J♣ 9♠. There is no second pair and no trips (only one K on the board plus one in hand).',
    },
    {
      spot: 'Choosing an action',
      prompt: 'It is your turn. The player before you bet $20. What actions are available to you?',
      answers: ['Fold, Call, or Raise — checking is not available once a bet is made', 'Check or Call only', 'Only Fold or Call'],
      correct: 0,
      reason: 'Once any player has bet, the check option is closed for all remaining players that street. You must fold (give up), call (match the bet), or raise (increase the bet). Check is only available when no bet has been made.',
    },
  ],
  'hand-rankings': [
    {
      spot: 'Showdown',
      prompt: 'Board is A K Q J 9 with no flush. You hold T 8. Villain holds A A. Who wins?',
      answers: ['You: straight', 'Villain: three aces', 'Split pot'],
      correct: 0,
      reason: 'Your best five cards are A-K-Q-J-T, a Broadway straight. Trips cannot beat a straight.',
    },
    {
      spot: 'Kicker pressure',
      prompt: 'Board is K K 7 4 2. You hold A 7. Villain holds Q 7. What decides the pot?',
      answers: ['Pair of sevens', 'Ace kicker', 'Board pair'],
      correct: 1,
      reason: 'Both players have two pair, kings and sevens. The fifth card is the kicker, so ace beats queen.',
    },
    {
      spot: 'Board plays',
      prompt: 'Board is T T T T A. You hold 9 8. Villain holds 7 6. What happens?',
      answers: ['You win', 'Villain wins', 'Split pot'],
      correct: 2,
      reason: 'The best five-card hand for both players is the board: four tens with an ace kicker.',
    },
  ],
  position: [
    {
      spot: 'Button open',
      prompt: 'Everyone folds to you on the Button with K♥ 9♥ (suited). The players in the blinds play tight. What is the default play?',
      answers: ['Raise — the Button is the best seat and this hand is strong enough', 'Fold — K-9 is too weak from any seat', 'Just call the big blind without raising'],
      correct: 0,
      reason: 'The Button is the best seat at the table — you act last on every street after the flop. From here, K-9 suited is a clear raise. You only have two players left to beat, and you have positional advantage for the whole hand.',
    },
    {
      spot: 'Small blind',
      prompt: 'You call from the Small Blind with J♠ 8♦. The Big Blind checks. Three cards are dealt face up (the flop). Who acts first?',
      answers: ['Small Blind — you act first on every street after the flop', 'Big Blind — they have more chips in', 'Button — they dealt the cards'],
      correct: 0,
      reason: 'The Small Blind acts first on every postflop street. This is a permanent positional disadvantage — you always have to act before your opponent, giving away information every single time.',
    },
    {
      spot: 'UTG discipline',
      prompt: 'You are first to act at a six-player table, holding A♣ 8♦. Five players are still to act behind you. What should you do?',
      answers: ['Fold — five players left means someone likely holds a stronger ace', 'Raise — any ace is strong enough to open from anywhere', 'Raise big to make everyone fold immediately'],
      correct: 0,
      reason: 'A-8 offsuit from first position is a losing hand over time. When five players still have cards to come, the chance that someone wakes up with A-K, A-Q, A-J, or A-10 is significant — and all of those beat you when an ace lands.',
    },
  ],
  'pot-odds': [
    {
      spot: 'Flush draw',
      prompt: 'Pot is 100, villain bets 50, and you have a nine-out flush draw on the flop.',
      answers: ['Call is priced', 'Always fold', 'Need 60% equity'],
      correct: 0,
      reason: 'Calling 50 to win 150 needs 25% equity. A nine-out flop draw is roughly 36% by the river.',
    },
    {
      spot: 'Gutshot turn',
      prompt: 'Pot is 80, villain bets 80, and you have four outs with one card to come.',
      answers: ['Fold', 'Snap call', 'Raise for value'],
      correct: 0,
      reason: 'You need 33% equity and only have about 8%. Without implied odds or fold equity, fold.',
    },
    {
      spot: 'Price shift',
      prompt: 'A small river bet offers you 20% pot odds. You think you win 30% when you call.',
      answers: ['Call', 'Fold', 'Only raise'],
      correct: 0,
      reason: 'When your estimated equity exceeds the price, calling shows profit.',
    },
  ],
  'starting-hands': [
    {
      spot: 'Early position',
      prompt: 'You are first to act (UTG) holding 7♠ 6♠ — a suited connector. Stacks are about 40 big blinds deep. What do you do?',
      answers: ['Fold — UTG needs stronger hands', 'Raise — any two suited cards are playable', 'Go all-in to maximize fold equity'],
      correct: 0,
      reason: 'Suited connectors like 7-6 suited need position and deep stacks to be profitable. From UTG you will often be out of position after the flop, and 40 big blind stacks do not give you enough implied odds to justify calling or raising with a speculative hand.',
    },
    {
      spot: 'Button steal',
      prompt: 'Everyone folds to you on the Button. You hold Q♠ 9♠ (suited). Both players in the blinds play passively. What do you do?',
      answers: ['Raise — position and suited cards make this a clear open', 'Fold — Q9 is too weak to play', 'Just call the big blind without raising'],
      correct: 0,
      reason: 'Q♠ 9♠ from the Button is a standard raise. You have position guaranteed, only two players left to act, and a hand with genuine potential to make straights, flushes, and strong top pairs. The passive blinds make stealing even easier.',
    },
    {
      spot: 'Dominated ace',
      prompt: 'The player in the Hijack seat raises. You are next to act (Cutoff) holding A♠ 7♦. What is the correct lean?',
      answers: ['Fold — A-7 offsuit loses badly when the raiser holds a stronger ace', 'Raise big to take the pot before the flop', 'Call every time to see a cheap flop'],
      correct: 0,
      reason: 'A-7 offsuit is often dominated by hands a Hijack raiser holds (A-K, A-Q, A-J, A-T, A-9) — all of which beat you when an ace lands. You would be putting money in with a bad hand against a stronger range, out of position.',
    },
  ],
  'bet-sizing': [
    {
      spot: 'Value target',
      prompt: 'You have top set on a wet flop against a calling station.',
      answers: ['Bet large', 'Check back', 'Min bet'],
      correct: 0,
      reason: 'Strong value wants money in now and charges draws. Passive callers let you size up.',
    },
    {
      spot: 'Range bet',
      prompt: 'You raise button and see K72 rainbow heads-up. Big blind checks.',
      answers: ['Small c-bet often', 'Pot only', 'Never bet'],
      correct: 0,
      reason: 'Dry high-card boards favor the preflop raiser, so a small frequent bet pressures many misses.',
    },
    {
      spot: 'Polar river',
      prompt: 'River completes your nut flush and villain has many bluff-catchers.',
      answers: ['Use big value size', 'Tiny blocker bet', 'Check because scary'],
      correct: 0,
      reason: 'Polar river spots want a size that extracts from bluff-catchers and pairs naturally with bluffs.',
    },
  ],
  'board-texture': [
    {
      spot: 'Dry board',
      prompt: 'You raised before the flop. The three cards dealt face up are K♠ 7♦ 2♣ — three different suits, no connected cards. What does this board mostly do to your opponent\'s hand?',
      answers: ['It misses most of their hands — good spot to bet small and take the pot', 'It creates many draws — be careful betting', 'You should always slow down on king-high boards'],
      correct: 0,
      reason: 'K-7-2 with three different suits is a "dry" board — no flush draws, no straight draws, no connected cards. Most hands that called your raise missed completely. A small bet here will win the pot often because opponents have very little to continue with.',
    },
    {
      spot: 'Connected board',
      prompt: 'The flop comes 9♠ 8♦ 7♣. Your opponent called your raise before the flop. What does this board do for their range?',
      answers: ['It connects with many of their hands — straights, pairs, and draws are all live', 'It mostly misses — you can bet any amount freely', 'Top pair is always good enough to bet the maximum here'],
      correct: 0,
      reason: '9-8-7 is an extremely connected board. Your opponent can have a straight (J-T, T-6, 6-5), two pair (9-8, 9-7, 8-7), pairs with draws, or combo draws. You should be cautious and not over-commit with just top pair.',
    },
    {
      spot: 'Paired board',
      prompt: 'The flop is Q♦ Q♣ 4♠ — the queen is paired. How does this change what hands your opponent might have?',
      answers: ['Whoever holds a queen now has three of a kind — that hand is very strong', 'This is now a flush-heavy board — watch for flush draws', 'Nothing changes — a paired board plays the same as any other'],
      correct: 0,
      reason: 'When a card is paired on the flop, anyone holding that rank has three of a kind — one of the strongest possible hands. Q-Q-4 heavily rewards players who hold a queen. If your opponent bets strongly here, they may well have trips or better.',
    },
  ],
  'bluffing-basics': [
    {
      spot: 'Blocker bluff',
      prompt: 'River is four spades. You hold A spades with no pair.',
      answers: ['Good bluff candidate', 'Never bluff', 'Pure showdown value'],
      correct: 0,
      reason: 'The nut-spade blocker removes villain nut flushes and makes your big bluff more credible.',
    },
    {
      spot: 'Multiway caution',
      prompt: 'You miss a draw on the river against three opponents.',
      answers: ['Bluff less often', 'Bluff any missed draw', 'Min bet value'],
      correct: 0,
      reason: 'More opponents means less fold equity and more ranges that can continue.',
    },
    {
      spot: 'Sizing math',
      prompt: 'You bet 75 into 100 as a bluff.',
      answers: ['Need about 43% folds', 'Need 75% folds', 'Need 10% folds'],
      correct: 0,
      reason: 'Break-even fold rate is bet divided by pot plus bet: 75 / 175.',
    },
  ],
  'bankroll-management': [
    {
      spot: 'Cash game roll',
      prompt: 'You want to play $100 buy-in cash games with a stable bankroll rule.',
      answers: ['$2,000+', '$300', '$500 max'],
      correct: 0,
      reason: 'Twenty buy-ins is a common minimum for cash. Tougher games or high variance need more.',
    },
    {
      spot: 'Tournament swings',
      prompt: 'You play large-field tournaments with $50 entries.',
      answers: ['Need many buy-ins', 'Five buy-ins is plenty', 'Variance is lower'],
      correct: 0,
      reason: 'Tournament payout structures create long downswings, so bankroll requirements are much higher.',
    },
    {
      spot: 'Moving down',
      prompt: 'Your bankroll drops below the floor for your current stake.',
      answers: ['Move down', 'Double the stakes', 'Chase losses'],
      correct: 0,
      reason: 'Moving down protects decision quality and keeps variance from ending your ability to play.',
    },
  ],
  'implied-odds': [
    {
      spot: 'Set mining',
      prompt: 'You hold 5♣ 5♦. Pot odds require 15% equity but your set draw is only 12%. Stacks are 200bb deep. Call or fold?',
      answers: ['Call — implied odds bridge the gap', 'Fold — pot odds don\'t justify it', 'Raise to take initiative'],
      correct: 0,
      reason: 'With 200bb effective, flopping a set often wins your opponent\'s entire stack. The future value more than covers the 3% equity shortfall. Deep stacks are the key variable that makes set mining profitable.',
    },
    {
      spot: 'River implied odds',
      prompt: 'You have a flush draw on the river. Pot odds don\'t cover your equity. Is there future value to consider?',
      answers: ['No — river implied odds are zero', 'Yes — future streets add value', 'Only if the villain is deep'],
      correct: 0,
      reason: 'The river is the final card. There are no more streets. Implied odds are always zero on the river — the only math that matters is pure pot odds vs your chance of having the best hand right now.',
    },
    {
      spot: 'Obvious draw',
      prompt: 'Board is K♠ Q♠ 4♠. You hold J♠ T♠ — a made flush plus straight draw. Are implied odds high?',
      answers: ['Low — the flush is obvious and opponents will be cautious paying you off', 'High — you have the best possible draw', 'Irrelevant — you already have a flush'],
      correct: 0,
      reason: 'With three spades on the board, good opponents know a flush is possible and will not pay off a fourth spade card. Hidden draws (like sets or backdoor straights) generate better implied odds because opponents are surprised when they hit.',
    },
  ],
  'reading-opponents': [
    {
      spot: 'Sizing pattern',
      prompt: 'A player bets exactly 33% pot on every flop regardless of hand strength. What does this tell you?',
      answers: ['Their sizing reveals nothing about hand strength — exploit with raises', 'They always have a strong hand', 'Fold to all their bets'],
      correct: 0,
      reason: 'A player who bets the same size with all hands is not giving you information through sizing. You can exploit by raising more often (they have bluffs in their range) and by not over-folding to small bets when you have equity.',
    },
    {
      spot: 'River blocker bet',
      prompt: 'Opponent checks flop, checks turn, then bets 20% pot on the river after a scary card lands. What range does this represent?',
      answers: ['Medium strength — blocking you from betting bigger', 'The nuts — value betting small to get a call', 'Always a bluff'],
      correct: 0,
      reason: 'A small river bet after two checks is the classic "blocker bet" — the opponent wants to see showdown cheaply with a medium hand. They\'re blocking you from making a larger bet, not extracting value. Raising here often shows a profit.',
    },
    {
      spot: 'Range narrowing',
      prompt: 'Opponent 3-bets preflop, bets flop and turn on A♠ K♦ 7♣ 8♦ 2♥. What has their range narrowed to?',
      answers: ['Strong made hands (AA, KK, AK) and some bluffs', 'Exclusively pocket pairs below aces', 'No inference is possible'],
      correct: 0,
      reason: 'A preflop 3-bet followed by two streets of betting on an ace-king high board represents a range of strong made hands (sets, two pair, top pair top kicker) and polarized bluffs. Medium-strength 3-bet hands (QQ, JJ) would often slow down on this board.',
    },
  ],
  'common-mistakes': [
    {
      spot: 'Preflop leak',
      prompt: 'You open J♦ 4♠ from Under the Gun because "you haven\'t played a hand in 20 minutes." Is this reasoning correct?',
      answers: ['No — hand selection should ignore time elapsed, not boredom', 'Yes — staying active keeps you in the game', 'Only if the blinds are large'],
      correct: 0,
      reason: 'J4 offsuit from UTG loses money on average regardless of how long you\'ve been folding. Boredom is not a strategic variable. The only factors that matter are hand strength, position, stack depth, and opponent tendencies.',
    },
    {
      spot: 'Tilt management',
      prompt: 'You lost a $500 pot to a two-outer. You feel the urge to play the next 10 hands regardless of cards. What is the correct response?',
      answers: ['Recognize the urge as tilt and return to your normal starting hand requirements', 'Play every hand to "loosen up" the table image', 'Immediately move up a stake to recover'],
      correct: 0,
      reason: 'Tilt turns one bad beat into a session-long disaster. The two-outer was a normal variance event — your money went in correctly. Continuing to play loose afterwards compounds a statistical event into a strategic leak that is entirely within your control.',
    },
    {
      spot: 'Overbluffing',
      prompt: 'You missed your draw on the river. You automatically bet because "they can\'t call without a good hand." Is this always correct?',
      answers: ['No — bluffs need fold equity, blockers, and a credible line', 'Yes — missed draws should always bluff', 'Only bet if the pot is small'],
      correct: 0,
      reason: 'Automatic river bluffs with missed draws are one of the most expensive beginner leaks. The bluff needs fold equity (opponent folds frequently), a credible story (you bet all streets), and ideally a blocker. Without these, the bluff loses money every time it\'s called.',
    },
  ],
};

// ─── How Poker Works data ────────────────────────────────────────────────────

const DEMO_BOARD: PokerCard[] = [
  pc('K', 'spades'), pc('J', 'hearts'), pc('7', 'diamonds'), pc('2', 'clubs'), pc('A', 'diamonds'),
];
const DEMO_HERO: [PokerCard, PokerCard] = [pc('A', 'hearts'), pc('K', 'clubs')];
const DEMO_VILLAIN: [PokerCard, PokerCard] = [pc('Q', 'spades'), pc('Q', 'hearts')];

const HAND_STEPS = [
  {
    street: 'Blinds',
    pot: 15,
    cardsShown: 0,
    showHole: false,
    showVillain: false,
    headline: 'Two players post forced bets before cards are dealt.',
    body: 'The player immediately left of the dealer posts the small blind ($5). The next player posts the big blind ($10 — always double the small blind). This creates the pot. Without blinds, everyone could wait forever for perfect cards.',
  },
  {
    street: 'Preflop',
    pot: 15,
    cardsShown: 0,
    showHole: true,
    showVillain: false,
    headline: 'Every player receives two private hole cards.',
    body: 'Your two cards are visible only to you. Starting left of the big blind, each player decides: fold, call the $10 big blind, or raise. The big blind is last to act preflop and may check if no one raised.',
  },
  {
    street: 'Flop',
    pot: 35,
    cardsShown: 3,
    showHole: true,
    showVillain: false,
    headline: 'Three community cards are revealed face up.',
    body: 'All players share these cards and combine them with their hole cards. A new betting round begins, starting with the first active player left of the dealer. A lot of hands are decided on the flop.',
  },
  {
    street: 'Turn',
    pot: 65,
    cardsShown: 4,
    showHole: true,
    showVillain: false,
    headline: 'A fourth community card is added.',
    body: 'Another betting round. Pots are growing larger. Players with drawing hands (chasing a flush or straight) are weighing the cost against their odds. Players with made hands are deciding how much to charge.',
  },
  {
    street: 'River',
    pot: 110,
    cardsShown: 5,
    showHole: true,
    showVillain: false,
    headline: 'The fifth and final community card.',
    body: 'The last betting round. No more cards are coming — this is the final decision point. If a bet is called and multiple players remain, both show their cards. Best hand takes the pot.',
  },
  {
    street: 'Showdown',
    pot: 110,
    cardsShown: 5,
    showHole: true,
    showVillain: true,
    headline: 'Remaining players reveal their cards. Best hand wins.',
    body: 'Hero holds A♥ K♣ — combined with the board (K♠ J♥ 7♦ 2♣ A♦), that is two pair: Aces and Kings. Villain holds Q♠ Q♥ — just one pair of Queens. Hero wins the $110 pot. The dealer button moves one seat left.',
  },
];

const POKER_ACTIONS = [
  {
    name: 'Fold',
    glyph: '✕',
    color: 'red' as const,
    available: 'Always — at any point when it is your turn',
    cost: 'Free, but you forfeit your cards and any chips already invested this hand',
    detail: 'You surrender your hand. Cards go face down into the discard pile. Any chips you put in this hand are gone — but you avoid losing any more. You wait for the next hand.',
  },
  {
    name: 'Check',
    glyph: '✓',
    color: 'muted' as const,
    available: 'Only when no bet has been made yet on the current street',
    cost: 'Free — no chips required',
    detail: 'You pass the action to the next player without committing chips. If all remaining players check, the next community card is dealt. Once any player bets, checking is closed for everyone else that street.',
  },
  {
    name: 'Call',
    glyph: '=',
    color: 'blue' as const,
    available: 'When facing a bet or raise',
    cost: 'Match the current bet exactly',
    detail: 'You put in chips equal to the bet in front of you. You stay in the hand. If this was the last player to act, the betting round ends and the next card is dealt (or we go to showdown).',
  },
  {
    name: 'Raise',
    glyph: '↑',
    color: 'gold' as const,
    available: 'When facing a bet (re-raise), or as the first bet on a street',
    cost: 'At least 2× the current bet. In No-Limit, up to your entire stack.',
    detail: 'You increase the bet. Every other player in the hand must now call your raise, re-raise further, or fold. Raises apply pressure, build the pot, and can win the pot outright if everyone folds.',
  },
];

function AnimatedTable({ step }: { step: number }) {
  const current = HAND_STEPS[step]!;
  const boardVisible = DEMO_BOARD.slice(0, current.cardsShown);

  return (
    <div className="relative h-56 overflow-hidden rounded-[50%_/_35%] border-[14px] border-[#0D2318] bg-[radial-gradient(ellipse_at_center,var(--felt-light),var(--felt))] shadow-[inset_0_8px_32px_rgba(0,0,0,0.4)]">

      {/* Villain — top */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <div className="font-mono text-[9px] text-emerald-100/40 tracking-wide">VILLAIN</div>
        <AnimatePresence>
          {current.showHole && (
            <motion.div key="villain-cards" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex gap-1">
              {current.showVillain
                ? DEMO_VILLAIN.map((c) => <PlayingCard key={`v${c.rank}${c.suit}`} card={c} size="sm" animate />)
                : [0, 1].map((i) => <PlayingCard key={`vfd${i}`} card={null} faceDown size="sm" />)
              }
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Community cards + pot — center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <div className="flex gap-1">
          <AnimatePresence>
            {boardVisible.map((card) => (
              <motion.div
                key={`board-${card.rank}${card.suit}`}
                initial={{ y: -14, opacity: 0, rotateY: 90 }}
                animate={{ y: 0, opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <PlayingCard card={card} size="sm" />
              </motion.div>
            ))}
          </AnimatePresence>
          {Array.from({ length: 5 - current.cardsShown }).map((_, i) => (
            <div key={`slot${i}`} className="h-14 w-10 rounded-md border border-white/[0.07] bg-white/[0.02]" />
          ))}
        </div>
        <motion.div key={current.pot} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="font-mono text-xs text-[var(--accent)]">
          POT ${current.pot}
        </motion.div>
      </div>

      {/* Hero — bottom */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <AnimatePresence>
          {current.showHole && (
            <motion.div key="hero-cards" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex gap-1">
              {DEMO_HERO.map((c) => <PlayingCard key={`h${c.rank}${c.suit}`} card={c} size="sm" animate />)}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="font-mono text-[9px] text-[var(--accent)] tracking-wide">HERO</div>
      </div>

      {/* Dealer button */}
      <div className="absolute bottom-3 right-8 flex h-6 w-6 items-center justify-center rounded-full border border-[#8f7b36] bg-[var(--chip-gold)] font-mono text-[9px] font-bold text-emerald-950">
        D
      </div>
    </div>
  );
}

function HowPokerWorksLesson() {
  const [mode, setMode] = useState<'objective' | 'hand' | 'actions'>('objective');
  const [step, setStep] = useState(0);
  const [selectedAction, setSelectedAction] = useState<number | null>(null);
  const current = HAND_STEPS[step]!;

  return (
    <LessonShell title="How poker works" kicker="Start here — the complete game in one lesson">
      <OpeningHook>
        Six players sit down. Two post forced bets. Everyone gets two private cards. Five cards go face up in the center. Chips move. One player collects everything in the middle. This lesson explains every part of that sequence — before any strategy.
      </OpeningHook>

      <div className="mb-5 flex flex-wrap gap-2">
        {(['objective', 'hand', 'actions'] as const).map((m) => (
          <Button key={m} type="button" size="sm"
            variant={mode === m ? 'default' : 'secondary'}
            onClick={() => { setMode(m); if (m === 'hand') setStep(0); setSelectedAction(null); }}
          >
            {m === 'objective' ? 'The game' : m === 'hand' ? 'A full hand' : 'Your four options'}
          </Button>
        ))}
      </div>

      {/* ── THE GAME ── */}
      {mode === 'objective' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="liquid-glass-quiet rounded-md p-4 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Path 01</div>
              <div className="font-serif text-2xl">Win at showdown</div>
              <div className="text-xs text-[var(--text-muted)] leading-5">
                If multiple players reach the end of all betting, everyone reveals their hole cards. The player who can form the best five-card hand — using any combination of their two private cards and the five shared community cards — wins the entire pot.
              </div>
            </div>
            <div className="liquid-glass-quiet rounded-md p-4 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Path 02</div>
              <div className="font-serif text-2xl">Make everyone fold</div>
              <div className="text-xs text-[var(--text-muted)] leading-5">
                If all other players fold before showdown, you win immediately — regardless of what cards you hold. You do not need a strong hand if your opponents give up theirs. This is why <PokerTerm term="bluffing" definition="Betting with a weak hand to make stronger hands fold, winning the pot without the best cards at showdown." /> is a core part of the game.
              </div>
            </div>
          </div>

          {/* SVG table diagram */}
          <div className="liquid-glass-quiet rounded-md p-4">
            <div className="font-serif text-lg mb-1">The table</div>
            <div className="text-xs text-[var(--text-muted)] mb-4">A standard 6-player table. The dealer button (D) rotates clockwise every hand.</div>
            <svg viewBox="0 0 400 230" className="w-full max-w-lg mx-auto" aria-label="Poker table diagram">
              {/* Felt shadow */}
              <ellipse cx="200" cy="115" rx="190" ry="100" fill="#081510" opacity="0.6" transform="translate(0, 6)" />
              {/* Outer rail */}
              <ellipse cx="200" cy="115" rx="190" ry="100" fill="#0D2318" />
              {/* Felt */}
              <ellipse cx="200" cy="115" rx="174" ry="84" fill="#1B3D2F" />
              {/* Felt highlight */}
              <ellipse cx="200" cy="100" rx="130" ry="55" fill="#24513E" opacity="0.5" />

              {/* Center text */}
              <text x="200" y="112" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace" dominantBaseline="middle">Action moves clockwise →</text>

              {/* Seats */}
              {[
                { label: 'BTN', sub: 'Dealer', x: 200, y: 200 },
                { label: 'SB',  sub: 'Small Blind', x: 62,  y: 168 },
                { label: 'BB',  sub: 'Big Blind',  x: 26,  y: 115 },
                { label: 'UTG', sub: 'First to act', x: 62,  y: 60  },
                { label: 'HJ',  sub: 'Hijack',     x: 200, y: 28  },
                { label: 'CO',  sub: 'Cutoff',     x: 338, y: 60  },
              ].map(({ label, sub, x, y }) => (
                <g key={label}>
                  <rect x={x - 24} y={y - 16} width="48" height="28" rx="5" fill="#0D1F17" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  <text x={x} y={y - 4} textAnchor="middle" dominantBaseline="middle" fill="#E8C96A" fontSize="9" fontFamily="monospace" fontWeight="500">{label}</text>
                  <text x={x} y={y + 7} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.3)" fontSize="6.5" fontFamily="monospace">{sub}</text>
                </g>
              ))}

              {/* Dealer button */}
              <circle cx="248" cy="192" r="10" fill="#C9A84C" stroke="#8f7b36" strokeWidth="1.5" />
              <text x="248" y="192" textAnchor="middle" dominantBaseline="middle" fill="#0D2318" fontSize="8" fontWeight="bold" fontFamily="monospace">D</text>

              {/* Clockwise arrow arc */}
              <path d="M 260 192 A 70 50 0 0 0 155 32" fill="none" stroke="rgba(232,201,106,0.25)" strokeWidth="1.5" strokeDasharray="4 3"
                markerEnd="url(#arrow)" />
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="rgba(232,201,106,0.4)" />
                </marker>
              </defs>
            </svg>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
              {[
                { label: 'Dealer (BTN)', desc: 'The button rotates left every hand. Acts last on every postflop street — the most valuable position.' },
                { label: 'Small Blind (SB)', desc: 'Posts a forced bet (half the big blind) before cards are dealt. Acts first after the flop.' },
                { label: 'Big Blind (BB)', desc: 'Posts double the small blind. Last to act preflop — can check if no one raises.' },
              ].map(({ label, desc }) => (
                <div key={label} className="rounded-md border border-white/8 bg-white/[0.03] p-3">
                  <div className="font-mono text-[10px] text-[var(--accent)] mb-1">{label}</div>
                  <div className="text-[var(--text-muted)] leading-4">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="liquid-glass-quiet rounded-md p-4 space-y-2">
            <div className="font-serif text-lg">The four betting streets</div>
            <div className="grid gap-2">
              {[
                { name: 'Preflop', desc: 'Cards dealt. First betting round. Players decide whether to invest based on their two hole cards.' },
                { name: 'Flop', desc: 'Three community cards revealed. Second betting round. Most hands are made or broken here.' },
                { name: 'Turn', desc: 'A fourth community card. Third betting round. Pots grow larger — decisions get harder.' },
                { name: 'River', desc: 'The fifth and final card. Last betting round. If called, both players show their hands.' },
              ].map(({ name, desc }, i) => (
                <div key={name} className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 font-mono text-[10px] text-[var(--accent)]">{i + 1}</div>
                  <div><span className="text-[var(--text-primary)]">{name} — </span><span className="text-[var(--text-muted)] leading-5">{desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── A FULL HAND ── */}
      {mode === 'hand' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {HAND_STEPS.map((s, i) => (
              <button
                key={s.street}
                type="button"
                onClick={() => setStep(i)}
                className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ${
                  i === step
                    ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                    : i < step
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                      : 'border-white/10 bg-white/[0.03] text-[var(--text-muted)]'
                }`}
              >
                {s.street}
              </button>
            ))}
          </div>

          <AnimatedTable step={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="liquid-glass-quiet rounded-md p-4 space-y-2"
            >
              <div className="font-serif text-xl text-[var(--accent)]">{current.street}</div>
              <div className="text-sm text-[var(--text-primary)] leading-5">{current.headline}</div>
              <div className="text-xs text-[var(--text-muted)] leading-5">{current.body}</div>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            <Button type="button" disabled={step === HAND_STEPS.length - 1} onClick={() => setStep((s) => s + 1)}>Next</Button>
          </div>

          {step === HAND_STEPS.length - 1 && (
            <div className="liquid-glass-quiet rounded-md p-3 text-xs text-[var(--text-muted)]">
              <span className="text-[var(--text-primary)]">Best five from seven: </span>
              Hero's seven cards are A♥ K♣ + K♠ J♥ 7♦ 2♣ A♦. Best five: A♥ A♦ K♣ K♠ J♥ — two pair, Aces and Kings.
            </div>
          )}
        </div>
      )}

      {/* ── YOUR FOUR OPTIONS ── */}
      {mode === 'actions' && (
        <div className="space-y-4">
          <div className="text-sm text-[var(--text-muted)]">On every turn, you choose one of four actions. Select each to see when it applies.</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POKER_ACTIONS.map((a, i) => (
              <button
                key={a.name}
                type="button"
                onClick={() => setSelectedAction(i === selectedAction ? null : i)}
                className={`rounded-md border p-3 text-center transition-colors ${
                  selectedAction === i
                    ? a.color === 'red'   ? 'border-red-400/60 bg-red-500/12 text-red-200'
                    : a.color === 'gold'  ? 'border-[var(--accent)]/60 bg-[var(--accent)]/12 text-[var(--accent)]'
                    : a.color === 'blue'  ? 'border-blue-400/60 bg-blue-500/12 text-blue-200'
                    : 'border-white/20 bg-white/8 text-[var(--text-primary)]'
                    : 'border-white/10 bg-white/[0.03] text-[var(--text-muted)] hover:border-white/20'
                }`}
              >
                <div className="mb-1 font-mono text-xl text-inherit opacity-60">{a.glyph}</div>
                <div className="font-serif text-lg">{a.name}</div>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {selectedAction !== null && POKER_ACTIONS[selectedAction] && (
              <motion.div
                key={selectedAction}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="liquid-glass-quiet rounded-md p-4 space-y-4"
              >
                <div className="font-serif text-2xl">{POKER_ACTIONS[selectedAction]!.name}</div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Available when</div>
                    <div className="text-[var(--text-primary)]">{POKER_ACTIONS[selectedAction]!.available}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Cost</div>
                    <div className="text-[var(--text-primary)]">{POKER_ACTIONS[selectedAction]!.cost}</div>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)] leading-5 border-t border-white/8 pt-3">{POKER_ACTIONS[selectedAction]!.detail}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="liquid-glass-quiet rounded-md p-4 text-xs space-y-2">
            <div className="font-serif text-lg">No-Limit Hold'em</div>
            <div className="text-[var(--text-muted)] leading-5">
              In <PokerTerm term="No-Limit Hold'em" definition="The most popular form of poker. Players can bet any amount up to their entire stack at any point — there is no cap on bet size." />, you can bet any amount from the minimum up to every chip in front of you. Going all-in means putting in your entire stack. This is why a player can lose — or win — everything in one hand.
            </div>
          </div>
        </div>
      )}

      <MistakeCallout>
        Beginners often confuse hole cards with community cards. Your two hole cards are private — only you see them. The five community cards in the center are shared by every player at the table. Your final hand uses the best five-card combination from both sets together.
      </MistakeCallout>
      <LessonConnector
        nextId="hand-rankings"
        nextTitle="Hand Rankings"
        reason="Now that you know how a hand is played, learn which five-card combinations beat which — so you know what you're building toward."
      />
    </LessonShell>
  );
}

// ─── Hand Rankings data ──────────────────────────────────────────────────────

const HAND_TYPES: Array<{ name: string; description: string; beats: string; cards: PokerCard[] }> = [
  { name: 'Royal Flush', description: 'The five highest cards of the same suit. Unbeatable.', beats: 'Everything', cards: [pc('A','spades'), pc('K','spades'), pc('Q','spades'), pc('J','spades'), pc('T','spades')] },
  { name: 'Straight Flush', description: 'Five consecutive cards of the same suit.', beats: 'Four of a Kind and below', cards: [pc('9','hearts'), pc('8','hearts'), pc('7','hearts'), pc('6','hearts'), pc('5','hearts')] },
  { name: 'Four of a Kind', description: 'Four cards of the same rank. Called "quads."', beats: 'Full House and below', cards: [pc('Q','spades'), pc('Q','hearts'), pc('Q','diamonds'), pc('Q','clubs'), pc('7','spades')] },
  { name: 'Full House', description: 'Three of a kind plus a pair. Rank of the trips decides ties.', beats: 'Flush and below', cards: [pc('J','spades'), pc('J','hearts'), pc('J','diamonds'), pc('8','clubs'), pc('8','spades')] },
  { name: 'Flush', description: 'Five cards of the same suit, not in sequence. Highest card wins ties.', beats: 'Straight and below', cards: [pc('A','diamonds'), pc('J','diamonds'), pc('8','diamonds'), pc('5','diamonds'), pc('2','diamonds')] },
  { name: 'Straight', description: 'Five consecutive cards of mixed suits. Ace plays high or low.', beats: 'Three of a Kind and below', cards: [pc('T','spades'), pc('9','hearts'), pc('8','diamonds'), pc('7','clubs'), pc('6','spades')] },
  { name: 'Three of a Kind', description: 'Three cards of the same rank. Called "trips" or "a set."', beats: 'Two Pair and below', cards: [pc('6','spades'), pc('6','hearts'), pc('6','diamonds'), pc('K','spades'), pc('3','hearts')] },
  { name: 'Two Pair', description: 'Two separate pairs. Highest pair decides; then lower pair; then kicker.', beats: 'One Pair and below', cards: [pc('A','spades'), pc('A','hearts'), pc('4','clubs'), pc('4','diamonds'), pc('Q','spades')] },
  { name: 'One Pair', description: 'Two cards of the same rank. Kicker (highest other card) breaks ties.', beats: 'High Card', cards: [pc('T','spades'), pc('T','hearts'), pc('A','diamonds'), pc('8','clubs'), pc('3','spades')] },
  { name: 'High Card', description: 'No combination. Best card wins. Weakest possible hand.', beats: 'Nothing', cards: [pc('A','spades'), pc('K','hearts'), pc('9','diamonds'), pc('6','clubs'), pc('2','spades')] },
];

const handOrder = HAND_TYPES.map((h) => h.name);

const BEAT_OR_LOSE: Array<{ heroCards: PokerCard[]; heroLabel: string; villainCards: PokerCard[]; villainLabel: string; result: 'hero' | 'villain' | 'split'; reason: string }> = [
  { heroCards: [pc('J','spades'), pc('J','hearts'), pc('J','diamonds'), pc('8','clubs'), pc('8','spades')], heroLabel: 'Full House — Jacks full of Eights', villainCards: [pc('A','hearts'), pc('J','hearts'), pc('8','hearts'), pc('5','hearts'), pc('2','hearts')], villainLabel: 'Flush — Ace-high', result: 'hero', reason: 'Full House beats Flush. Three matching cards plus a pair outranks any five-suited cards.' },
  { heroCards: [pc('T','spades'), pc('9','hearts'), pc('8','diamonds'), pc('7','clubs'), pc('6','spades')], heroLabel: 'Straight — Ten-high', villainCards: [pc('6','spades'), pc('6','hearts'), pc('6','diamonds'), pc('K','spades'), pc('3','hearts')], villainLabel: 'Three of a Kind — Sixes', result: 'hero', reason: 'Straight beats Three of a Kind. Five consecutive cards outrank three of the same rank.' },
  { heroCards: [pc('Q','spades'), pc('Q','hearts'), pc('Q','diamonds'), pc('Q','clubs'), pc('7','spades')], heroLabel: 'Four of a Kind — Queens', villainCards: [pc('9','hearts'), pc('8','hearts'), pc('7','hearts'), pc('6','hearts'), pc('5','hearts')], villainLabel: 'Straight Flush — Nine-high', result: 'villain', reason: 'Straight Flush beats Four of a Kind. Only a Royal Flush is higher than a Straight Flush.' },
  { heroCards: [pc('A','spades'), pc('A','hearts'), pc('4','clubs'), pc('4','diamonds'), pc('Q','spades')], heroLabel: 'Two Pair — Aces and Fours', villainCards: [pc('T','spades'), pc('T','hearts'), pc('A','diamonds'), pc('8','clubs'), pc('3','spades')], villainLabel: 'One Pair — Tens', result: 'hero', reason: 'Two Pair beats One Pair. Two separate pairs outrank any single pair, regardless of rank.' },
  { heroCards: [pc('A','spades'), pc('K','hearts'), pc('9','diamonds'), pc('6','clubs'), pc('2','spades')], heroLabel: 'High Card — Ace', villainCards: [pc('T','spades'), pc('T','hearts'), pc('A','diamonds'), pc('8','clubs'), pc('3','spades')], villainLabel: 'One Pair — Tens', result: 'villain', reason: 'One Pair beats High Card. Even a pair of twos beats any hand with no pair.' },
  { heroCards: [pc('A','diamonds'), pc('J','diamonds'), pc('8','diamonds'), pc('5','diamonds'), pc('2','diamonds')], heroLabel: 'Flush — Ace-high diamonds', villainCards: [pc('A','spades'), pc('A','hearts'), pc('4','clubs'), pc('4','diamonds'), pc('Q','spades')], villainLabel: 'Two Pair — Aces and Fours', result: 'hero', reason: 'Flush beats Two Pair. Five cards of the same suit outrank two separate pairs.' },
  { heroCards: [pc('A','spades'), pc('A','hearts'), pc('A','diamonds'), pc('A','clubs'), pc('K','spades')], heroLabel: 'Four of a Kind — Aces', villainCards: [pc('K','spades'), pc('K','hearts'), pc('K','diamonds'), pc('Q','clubs'), pc('Q','spades')], villainLabel: 'Full House — Kings full of Queens', result: 'hero', reason: 'Four of a Kind beats Full House. Quads are one step above a full house in the hand rankings.' },
  { heroCards: [pc('A','spades'), pc('K','spades'), pc('Q','spades'), pc('J','spades'), pc('T','spades')], heroLabel: 'Royal Flush — Spades', villainCards: [pc('A','diamonds'), pc('K','diamonds'), pc('Q','diamonds'), pc('J','diamonds'), pc('T','diamonds')], villainLabel: 'Royal Flush — Diamonds', result: 'split', reason: 'Both players hold a Royal Flush of different suits. Suits do not break ties in poker — this is a split pot.' },
  { heroCards: [pc('K','spades'), pc('K','hearts'), pc('K','diamonds'), pc('9','clubs'), pc('9','spades')], heroLabel: 'Full House — Kings full of Nines', villainCards: [pc('Q','spades'), pc('Q','hearts'), pc('Q','diamonds'), pc('A','clubs'), pc('A','spades')], villainLabel: 'Full House — Queens full of Aces', result: 'hero', reason: 'When both players have a Full House, the rank of the trips decides. Kings full beats Queens full, even though the pair portion of Queens full is aces.' },
  { heroCards: [pc('A','spades'), pc('K','hearts'), pc('9','diamonds'), pc('6','clubs'), pc('2','spades')], heroLabel: 'High Card — Ace, King, Nine', villainCards: [pc('A','hearts'), pc('Q','diamonds'), pc('9','spades'), pc('6','hearts'), pc('2','clubs')], villainLabel: 'High Card — Ace, Queen, Nine', result: 'hero', reason: 'Both players have High Card. Compare cards from highest to lowest: both have an Ace, then Hero has King vs Queen — King wins.' },
];

function LearnPanel({ lessonId }: LessonPageProps) {
  if (lessonId === 'how-poker-works') return <HowPokerWorksLesson />;
  if (lessonId === 'hand-rankings') return <HandRankingsLesson />;
  if (lessonId === 'position') return <PositionLesson />;
  if (lessonId === 'pot-odds') return <PotOddsLesson />;
  if (lessonId === 'implied-odds') return <ImpliedOddsLesson />;
  if (lessonId === 'starting-hands') return <StartingHandsLesson />;
  if (lessonId === 'bet-sizing') return <BetSizingLesson />;
  if (lessonId === 'board-texture') return <BoardTextureLesson />;
  if (lessonId === 'bluffing-basics') return <BluffingLesson />;
  if (lessonId === 'bankroll-management') return <BankrollLesson />;
  if (lessonId === 'reading-opponents') return <ReadingOpponentsLesson />;
  if (lessonId === 'common-mistakes') return <CommonMistakesLesson />;
  return null;
}

function LessonShell({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="text-[var(--text-primary)]">
      <div className="sr-only">
        <div>{kicker}</div>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function BeatOrLoseMode() {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<'hero' | 'villain' | 'split' | null>(null);
  const scenario = BEAT_OR_LOSE[round % BEAT_OR_LOSE.length];
  if (!scenario) return null;

  const answer = (pick: 'hero' | 'villain' | 'split') => {
    if (chosen) return;
    setChosen(pick);
    if (pick === scenario.result) setScore((s) => s + 1);
  };

  const next = () => {
    setChosen(null);
    setRound((r) => r + 1);
  };

  const done = round >= BEAT_OR_LOSE.length;

  if (done && !chosen) {
    return (
      <div className="liquid-glass-quiet rounded-md p-6 text-center">
        <div className="font-serif text-4xl text-[var(--accent)]">{score}/{BEAT_OR_LOSE.length}</div>
        <div className="mt-2 text-sm text-[var(--text-muted)]">rounds completed</div>
        <Button type="button" className="mt-4" onClick={() => { setRound(0); setScore(0); setChosen(null); }}>
          <RefreshCw className="mr-2 h-3 w-3" /> Play again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-[var(--text-muted)]">Round {Math.min(round + 1, BEAT_OR_LOSE.length)} of {BEAT_OR_LOSE.length}</div>
        <div className="font-mono text-xs text-[var(--accent)]">{score} correct</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="liquid-glass-quiet rounded-md p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Hero</div>
          <div className="mt-3"><HandCards cards={scenario.heroCards} size="sm" /></div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">{scenario.heroLabel}</div>
        </div>
        <div className="liquid-glass-quiet rounded-md p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Villain</div>
          <div className="mt-3"><HandCards cards={scenario.villainCards} size="sm" /></div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">{scenario.villainLabel}</div>
        </div>
      </div>
      {!chosen ? (
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" onClick={() => answer('hero')}>Hero wins</Button>
          <Button type="button" variant="secondary" onClick={() => answer('split')}>Split pot</Button>
          <Button type="button" variant="secondary" onClick={() => answer('villain')}>Villain wins</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-md border p-3 text-sm leading-5 ${chosen === scenario.result ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-red-400/40 bg-red-500/10 text-red-100'}`}>
            <span className="font-semibold">{chosen === scenario.result ? 'Correct. ' : 'Incorrect. '}</span>
            {scenario.reason}
          </div>
          <Button type="button" onClick={next}>{round + 1 >= BEAT_OR_LOSE.length ? 'See results' : 'Next hand'}</Button>
        </div>
      )}
    </div>
  );
}

function HandRankingsLesson() {
  const [items, setItems] = useState(['Flush', 'Full House', 'Straight', 'Royal Flush', 'One Pair', 'Two Pair', 'High Card', 'Straight Flush', 'Four of a Kind', 'Three of a Kind']);
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<'reference' | 'sort' | 'flashcard'>('reference');

  const move = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const next = [...current];
      const target = index + direction;
      const item = next[index];
      const targetItem = next[target];
      if (!item || targetItem === undefined) return current;
      next[index] = targetItem;
      next[target] = item;
      return next;
    });
    setChecked(false);
  };

  const wrongFeedback = (hand: string, index: number): string => {
    const correct = handOrder.indexOf(hand);
    if (correct < index) return `${hand} should be higher — it ranks #${correct + 1}, not #${index + 1}.`;
    return `${hand} should be lower — it ranks #${correct + 1}, not #${index + 1}.`;
  };

  return (
    <LessonShell title="Hand strength, in order" kicker="Best five cards win">
      <OpeningHook>
        At showdown, every argument ends with the same test: the best five-card hand wins. Learn the order cold, then spend your attention on the decisions that came before it.
      </OpeningHook>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['reference', 'sort', 'flashcard'] as const).map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? 'default' : 'secondary'}
            className="rounded-md"
            onClick={() => setMode(m)}
          >
            {m === 'reference' ? 'Reference' : m === 'sort' ? 'Sort exercise' : 'Showdown drill'}
          </Button>
        ))}
      </div>

      {mode === 'reference' && (
        <div className="grid gap-3">
          {HAND_TYPES.map((hand, index) => (
            <div key={hand.name} className="liquid-glass-quiet grid grid-cols-[2rem_1fr_auto] items-start gap-4 rounded-md p-3 sm:items-center">
              <span className="font-mono text-xs text-[var(--accent)]">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <div className="font-serif text-xl">{hand.name}</div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">{hand.description}</div>
              </div>
              <HandCards cards={hand.cards} size="sm" />
            </div>
          ))}
        </div>
      )}

      {mode === 'sort' && (
        <div className="space-y-2">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div className="text-sm text-[var(--text-muted)]">Move each hand until the strongest is at the top.</div>
            <Button type="button" className="shrink-0" onClick={() => setChecked(true)}>Check order</Button>
          </div>
          {items.map((hand, index) => {
            const correct = handOrder[index] === hand;
            return (
              <div
                key={hand}
                className={`grid min-h-14 grid-cols-[2.25rem_minmax(0,1fr)_4.5rem] items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
                  checked && correct
                    ? 'border-emerald-400/70 bg-emerald-500/10'
                    : checked
                      ? 'border-red-400/60 bg-red-500/10'
                      : 'border-white/10 bg-white/[0.045]'
                }`}
              >
                <span className="font-mono text-xs text-[var(--accent)]">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="truncate font-serif text-xl">{hand}</div>
                  {checked && !correct && (
                    <div className="mt-0.5 text-[10px] text-red-300">{wrongFeedback(hand, index)}</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Button type="button" size="icon-sm" variant="secondary" aria-label={`Move ${hand} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button type="button" size="icon-sm" variant="secondary" aria-label={`Move ${hand} down`} disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'flashcard' && <BeatOrLoseMode />}

      <MistakeCallout>
        Beginners most often confuse Flush vs Full House — ranking the flush higher because "five suited cards feels special." Full House ranks above Flush because three cards of one rank plus a pair is statistically harder to make than five cards of the same suit.
      </MistakeCallout>

      <div className="mt-6 rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-4 py-3 text-xs text-[var(--text-muted)] leading-5">
        <span className="text-[var(--text-primary)] font-medium">You can play now.</span> You know the objective and you know what beats what — that is enough to sit at a table and make real decisions. The lessons ahead will sharpen your edge, but they are not required to start. Jump into the <Link href="/" className="underline text-[var(--accent)] hover:opacity-80">game</Link> whenever you are ready.
      </div>
      <LessonConnector nextId="position" nextTitle="Position" reason="Knowing what wins at showdown is step one. Step two is knowing when to get involved — and position determines that." />
    </LessonShell>
  );
}

function PositionLesson() {
  const [selected, setSelected] = useState('BTN');
  const [showExample, setShowExample] = useState(false);

  const seats = [
    { id: 'BTN', x: '50%', y: '88%', name: 'Button', actsBefore: 3, actsAfter: 2, range: 'Widest — ~40% of hands', implication: 'Acts last on every postflop street. Play aggressively and steal often.' },
    { id: 'SB', x: '20%', y: '62%', name: 'Small Blind', actsBefore: 4, actsAfter: 1, range: 'Moderate — ~35% vs BTN steal', implication: 'Discounted preflop, but first to act postflop every street. A permanent positional disadvantage.' },
    { id: 'BB', x: '20%', y: '28%', name: 'Big Blind', actsBefore: 5, actsAfter: 0, range: 'Wide defense — ~45% vs open', implication: 'Closes preflop action at a discount, but out of position postflop against most opponents.' },
    { id: 'UTG', x: '50%', y: '12%', name: 'Under the Gun', actsBefore: 0, actsAfter: 5, range: 'Tightest — ~15% of hands', implication: 'First to act preflop into the whole table. Play only strong hands that can handle aggression and being out of position.' },
    { id: 'HJ', x: '80%', y: '28%', name: 'Hijack', actsBefore: 1, actsAfter: 4, range: 'Tight-medium — ~22% of hands', implication: 'One seat better than UTG. Can widen slightly as one fewer player is behind.' },
    { id: 'CO', x: '80%', y: '62%', name: 'Cutoff', actsBefore: 2, actsAfter: 3, range: 'Medium-wide — ~30% of hands', implication: 'One seat from the button. Steal attempts are profitable, but BTN will have position on you.' },
  ];

  const selectedSeat = seats.find((s) => s.id === selected) ?? seats[0]!;

  return (
    <LessonShell title="Position is information" kicker="Acting last is leverage">
      <OpeningHook>
        You and your opponent both hold K♠ J♥. Same two cards. But you act last — and they act first. That single difference changes the outcome of the hand. Position is not a minor edge. It is the single largest structural advantage in poker.
      </OpeningHook>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="mb-3 text-sm text-[var(--text-muted)]">Click any seat to see its profile.</div>
          <div className="relative h-[340px] rounded-[50%] border-[16px] border-[#0D2318] bg-[radial-gradient(circle_at_center,var(--felt-light),var(--felt))] shadow-inner">
            {seats.map((seat) => (
              <button
                key={seat.id}
                type="button"
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ${selected === seat.id ? 'border-[var(--accent)] bg-[var(--accent)] text-emerald-950' : 'border-emerald-100/15 bg-emerald-950/85 text-[var(--text-primary)] hover:border-[var(--accent)]/50'}`}
                style={{ left: seat.x, top: seat.y }}
                onClick={() => setSelected(seat.id)}
              >
                {seat.id}
              </button>
            ))}
            <div className="absolute left-1/2 top-1/2 w-36 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-[10px] leading-4 text-emerald-100/50">
              Action clockwise from SB postflop
            </div>
          </div>
        </div>

        <div className="liquid-glass-quiet rounded-md p-4 space-y-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Selected seat</div>
            <div className="font-serif text-3xl text-[var(--accent)]">{selectedSeat.id}</div>
            <div className="text-sm text-[var(--text-muted)]">{selectedSeat.name}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-emerald-100/10 pt-4">
            <div className="rounded-md bg-white/[0.04] px-3 py-2 text-center">
              <div className="font-mono text-2xl text-[var(--accent)]">{selectedSeat.actsBefore}</div>
              <div className="text-[10px] text-[var(--text-muted)]">act before preflop</div>
            </div>
            <div className="rounded-md bg-white/[0.04] px-3 py-2 text-center">
              <div className="font-mono text-2xl text-[var(--accent)]">{selectedSeat.actsAfter}</div>
              <div className="text-[10px] text-[var(--text-muted)]">act after preflop</div>
            </div>
          </div>
          <div className="space-y-2 border-t border-emerald-100/10 pt-3 text-xs">
            <div><span className="text-[var(--text-muted)]">Open range: </span><span className="text-[var(--text-primary)]">{selectedSeat.range}</span></div>
            <div className="text-[var(--text-muted)] leading-5">{selectedSeat.implication}</div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-emerald-100/10 px-4 py-3 text-sm text-[var(--text-muted)] hover:border-[var(--accent)]/30"
          onClick={() => setShowExample((v) => !v)}
        >
          <span>Why does position matter? — The K♠ J♥ example</span>
          {showExample ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showExample && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="liquid-glass-quiet rounded-md p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-red-400">Out of position (SB)</div>
              <HandCards cards={[pc('K','spades'), pc('J','hearts')]} size="sm" />
              <ol className="mt-3 space-y-1.5 text-xs text-[var(--text-muted)] leading-5">
                <li>1. You <PokerTerm term="check" definition="Decline to bet, passing action to the next player. Only available when no bet has been made." /> the flop not knowing villain's strength.</li>
                <li>2. Villain bets. You call, unsure if you're ahead.</li>
                <li>3. Turn blanks. You check again — still no information.</li>
                <li>4. Villain fires again. You're lost: value bet, bluff, or protection?</li>
                <li className="text-red-300">Result: you face three difficult decisions with zero information.</li>
              </ol>
            </div>
            <div className="liquid-glass-quiet rounded-md p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-emerald-400">In position (BTN)</div>
              <HandCards cards={[pc('K','spades'), pc('J','hearts')]} size="sm" />
              <ol className="mt-3 space-y-1.5 text-xs text-[var(--text-muted)] leading-5">
                <li>1. Villain checks the flop — weakness signal. You bet.</li>
                <li>2. Villain check-calls. Marginal hand or draw, likely.</li>
                <li>3. Villain checks turn. You can check back to control pot size.</li>
                <li>4. Villain checks river. You decide: thin value bet or check?</li>
                <li className="text-emerald-300">Result: every decision made with full information of opponent's action.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 liquid-glass-quiet rounded-md p-4">
        <div className="font-serif text-lg mb-3">Postflop action order — every street</div>
        <div className="grid gap-2 text-xs">
          {[
            { street: 'Preflop', order: 'UTG → HJ → CO → BTN → SB → BB' },
            { street: 'Flop', order: 'SB → BB → UTG → HJ → CO → BTN' },
            { street: 'Turn', order: 'Same as flop — position is fixed for the hand' },
            { street: 'River', order: 'Same as flop — BTN always acts last' },
          ].map(({ street, order }) => (
            <div key={street} className="flex flex-wrap items-start gap-3 border-b border-emerald-100/10 pb-2 last:border-0">
              <div className="w-16 shrink-0 font-mono text-[var(--accent)]">{street}</div>
              <div className="text-[var(--text-muted)]">{order}</div>
            </div>
          ))}
        </div>
      </div>

      <MistakeCallout>
        Beginners play the same range from every seat — limping J8 under the gun, calling raises with weak hands from the blinds. Position changes the value of every hand. A hand worth playing from the Button can be a losing call from UTG.
      </MistakeCallout>
      <LessonConnector nextId="pot-odds" nextTitle="Pot Odds" reason="Position tells you when to get involved. Pot odds tell you the exact price you need to pay — and whether it's worth it." />
    </LessonShell>
  );
}

const POT_ODDS_QUICK_TESTS = [
  { label: 'Flush draw, flop', pot: 80, bet: 40, outs: 9, streets: 2 as const, result: 'call' as const, reason: 'Nine outs × 4 = 36% equity. Pot odds: 40 ÷ 120 = 33%. Equity (36%) exceeds the price (33%). Call.' },
  { label: 'Gutshot, turn', pot: 100, bet: 100, outs: 4, streets: 1 as const, result: 'fold' as const, reason: 'Four outs × 2 = 8% equity. Pot odds: 100 ÷ 200 = 50%. Equity (8%) is far below the price (50%). Fold.' },
  { label: 'Pair draw, flop', pot: 60, bet: 20, outs: 6, streets: 2 as const, result: 'call' as const, reason: 'Six outs × 4 = 24% equity. Pot odds: 20 ÷ 80 = 25%. Close call — but given implied odds on the flop, this is at worst breakeven and typically a call.' },
  { label: 'Straight draw, river', pot: 150, bet: 150, outs: 8, streets: 1 as const, result: 'fold' as const, reason: 'Eight outs × 2 = 16% equity. But this is the river — there are no more cards. If you don\'t have the straight now, you have 0% equity. Fold immediately.' },
  { label: 'Two overcards, flop', pot: 50, bet: 10, outs: 6, streets: 2 as const, result: 'call' as const, reason: 'Six outs × 4 = 24% equity. Pot odds: 10 ÷ 60 = 17%. Equity (24%) easily clears the price (17%). Call, and factor in implied odds if you hit top pair.' },
];

function PotOddsLesson() {
  const [pot, setPot] = useState(100);
  const [call, setCall] = useState(25);
  const [outs, setOuts] = useState(9);
  const [cardsToCome, setCardsToCome] = useState<1 | 2>(2);
  const [step, setStep] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<number, 'call' | 'fold'>>({});
  const [mode, setMode] = useState<'walkthrough' | 'calculator' | 'quicktest'>('walkthrough');

  const potOdds = Math.round((call / (pot + call)) * 100);
  const equity = Math.min(95, outs * (cardsToCome === 2 ? 4 : 2));
  const profitable = equity >= potOdds;
  const totalPot = pot + call;
  const potBarPct = Math.round((pot / totalPot) * 100);

  const walkthroughSteps = [
    { label: 'The situation', text: 'The pot has $80. Your opponent bets $25. You hold a flush draw with one card to come.', highlight: null },
    { label: 'What does it cost?', text: 'You must call $25 to continue in the hand.', highlight: 'call' },
    { label: 'What do you win?', text: 'If you call, the total pot becomes $80 + $25 (their bet) + $25 (your call) = $130.', highlight: 'total' },
    { label: 'The break-even point', text: 'You need to win 1 out of every (130 ÷ 25) ≈ 5 times to break even. That\'s 25 ÷ 130 = 19.2%.', highlight: 'odds' },
    { label: 'Do you have enough equity?', text: 'A flush draw with one card to come has approximately 9 outs × 2 = 18% equity. That\'s just below the required 19.2%. This is a close fold — but against most opponents, implied odds make it a call.', highlight: 'result' },
    { label: 'The shortcut formula', text: 'Instead of working this out every time: Pot odds = Call ÷ (Pot + Call). Here: 25 ÷ (80 + 25 + 25) = 19.2%. Compare to your equity. Equity > pot odds → call. Equity < pot odds → fold.', highlight: 'formula' },
  ];

  return (
    <LessonShell title="Pay the right price" kicker="Pot odds vs equity">
      <OpeningHook>
        You're holding a flush draw with one card to come. The pot is $100. Your opponent bets $50. Should you call? In 30 seconds you'll be able to answer this with arithmetic — every time, at the table.
      </OpeningHook>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['walkthrough', 'calculator', 'quicktest'] as const).map((m) => (
          <Button key={m} type="button" size="sm" variant={mode === m ? 'default' : 'secondary'} onClick={() => setMode(m)}>
            {m === 'walkthrough' ? 'Step by step' : m === 'calculator' ? 'Calculator' : 'Quick test'}
          </Button>
        ))}
      </div>

      {mode === 'walkthrough' && (
        <div className="space-y-4">
          <div className="grid gap-2">
            {walkthroughSteps.map((s, i) => (
              <button
                key={s.label}
                type="button"
                className={`w-full rounded-md border px-4 py-3 text-left transition-colors ${i === step ? 'border-[var(--accent)]/60 bg-[var(--accent)]/8' : i < step ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/8 bg-white/[0.03]'}`}
                onClick={() => setStep(i)}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs ${i <= step ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{s.label}</div>
                    {i === step && <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{s.text}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            <Button type="button" disabled={step === walkthroughSteps.length - 1} onClick={() => setStep((s) => s + 1)}>Next</Button>
          </div>
        </div>
      )}

      {mode === 'calculator' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <MetricSlider label="Pot" value={pot} min={20} max={500} step={10} onChange={setPot} />
            <MetricSlider label="Call amount" value={call} min={5} max={200} step={5} onChange={setCall} />
            <div className="space-y-2">
              <div className="text-sm text-[var(--text-muted)]">Pot composition</div>
              <div className="h-6 overflow-hidden rounded-full border border-white/10">
                <div className="flex h-full">
                  <div className="bg-emerald-500/40 transition-all" style={{ width: `${potBarPct}%` }} />
                  <div className="bg-[var(--accent)]/50 transition-all" style={{ width: `${100 - potBarPct}%` }} />
                </div>
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[var(--text-muted)]">
                <span>Pot ${pot}</span><span>Call ${call}</span>
              </div>
            </div>
            <MetricSlider label="Outs (drawing cards)" value={outs} min={1} max={21} step={1} onChange={setOuts} />
            <div className="grid grid-cols-2 gap-2">
              {([1, 2] as const).map((count) => (
                <Button key={count} type="button" variant={cardsToCome === count ? 'default' : 'secondary'} onClick={() => setCardsToCome(count)}>
                  {count} card{count === 1 ? '' : 's'} to come
                </Button>
              ))}
            </div>
          </div>
          <ResultPanel
            title={profitable ? 'Call is profitable' : 'Fold is correct'}
            tone={profitable ? 'good' : 'bad'}
            rows={[
              ['Pot odds', `${potOdds}%`],
              ['Equity (rule of 2/4)', `${equity}%`],
              ['Edge', `${equity >= potOdds ? '+' : ''}${equity - potOdds}%`],
              ['Formula', 'call ÷ (pot + call)'],
            ]}
          />
        </div>
      )}

      {mode === 'quicktest' && (
        <div className="space-y-3">
          <div className="text-sm text-[var(--text-muted)]">Five spots. Call or fold? Immediate feedback.</div>
          {POT_ODDS_QUICK_TESTS.map((test, i) => {
            const answer = testAnswers[i];
            const correct = answer === test.result;
            return (
              <div key={test.label} className="liquid-glass-quiet rounded-md p-4">
                <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]">{test.label}</div>
                <div className="mt-1 text-sm text-[var(--text-primary)]">
                  Pot ${test.pot}, bet ${test.bet}, {test.outs} outs, {test.streets === 2 ? 'flop (2 cards to come)' : 'turn (1 card to come)'}
                </div>
                {!answer ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button type="button" onClick={() => setTestAnswers((a) => ({ ...a, [i]: 'call' }))}>Call</Button>
                    <Button type="button" variant="secondary" onClick={() => setTestAnswers((a) => ({ ...a, [i]: 'fold' }))}>Fold</Button>
                  </div>
                ) : (
                  <div className={`mt-3 rounded-md border p-3 text-xs leading-5 ${correct ? 'border-emerald-400/30 bg-emerald-500/8 text-emerald-100' : 'border-red-400/30 bg-red-500/8 text-red-100'}`}>
                    <span className="font-semibold">{correct ? 'Correct. ' : 'Incorrect. '}</span>{test.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MistakeCallout>
        Beginners call draws on the river using flop pot odds. On the river there is exactly one card — the one already on the board. If you haven't made your hand, your equity is 0%. Always recalculate pot odds on each street, and never use the rule of 4 when only one card remains.
      </MistakeCallout>
      <LessonConnector nextId="implied-odds" nextTitle="Implied Odds" reason="Pot odds assume what's in the pot now. Implied odds factor in what you'll win if you hit — which changes several borderline decisions." />
    </LessonShell>
  );
}

const HAND_DRILLS: Array<{ position: string; cards: PokerCard[]; label: string; action: 'play' | 'fold'; reason: string }> = [
  { position: 'UTG', cards: [pc('A','spades'), pc('K','hearts')], label: 'AKo', action: 'play', reason: 'AK is a premium hand from any position. It dominates weaker aces and makes the top pair with the best kicker.' },
  { position: 'UTG', cards: [pc('7','spades'), pc('6','spades')], label: '76s', action: 'fold', reason: 'Suited connectors need position and deep stacks. From UTG, you\'ll be out of position and the hand won\'t have enough implied odds.' },
  { position: 'BTN', cards: [pc('Q','diamonds'), pc('9','spades')], label: 'Q9o', action: 'play', reason: 'From the button with only blinds behind, Q9o has enough equity and positional advantage to be a profitable open.' },
  { position: 'BTN', cards: [pc('2','clubs'), pc('7','hearts')], label: '72o', action: 'fold', reason: '72o is the worst starting hand in poker. It makes no straights, no flushes, and both cards are easily dominated.' },
  { position: 'CO', cards: [pc('A','spades'), pc('8','clubs')], label: 'A8o', action: 'fold', reason: 'A8o from the Cutoff is dominated by many hands that call (AK, AQ, AJ, AT, A9). It performs poorly as a cold call and is marginal as an open.' },
  { position: 'HJ', cards: [pc('J','hearts'), pc('J','clubs')], label: 'JJ', action: 'play', reason: 'Pocket Jacks is a premium hand from any position. Open-raise and be prepared to 3-bet or call a 3-bet.' },
];

function StartingHandsLesson() {
  const [position, setPosition] = useState('UTG');
  const [view, setView] = useState<'simple' | 'matrix'>('simple');
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillAnswer, setDrillAnswer] = useState<'play' | 'fold' | null>(null);

  const drill = HAND_DRILLS[drillIndex % HAND_DRILLS.length]!;

  const PREMIUM_HANDS = [
    { cards: [pc('A','spades'), pc('A','hearts')], label: 'AA', why: 'The best starting hand. Wins ~85% vs a random hand. Always raise preflop.' },
    { cards: [pc('K','spades'), pc('K','hearts')], label: 'KK', why: 'The second-best hand. Only loses to AA, which is statistically rare.' },
    { cards: [pc('A','clubs'), pc('K','spades')], label: 'AKs', why: 'Makes the best pair with best kicker. Has nut flush potential. Blocks AA and KK.' },
    { cards: [pc('Q','spades'), pc('Q','hearts')], label: 'QQ', why: 'Top pair hands lose to AA and KK but dominate the rest of the field.' },
  ];

  const PLAYABLE_HANDS = [
    { cards: [pc('T','spades'), pc('T','hearts')], label: 'TT', why: 'Solid pair. Value comes from being ahead of overcards preflop and hitting sets postflop.' },
    { cards: [pc('A','spades'), pc('J','spades')], label: 'AJs', why: 'Suited ace with strong kicker. Can play for value and has flush potential.' },
    { cards: [pc('9','spades'), pc('8','spades')], label: '98s', why: 'Suited connectors make straights and flushes. Needs position and deep stacks.' },
    { cards: [pc('K','clubs'), pc('Q','clubs')], label: 'KQs', why: 'Connects to many boards. Makes strong top pairs and has flush draws.' },
  ];

  return (
    <LessonShell title="Open better hands by position" kicker="Ranges widen near the button">
      <OpeningHook>
        You're dealt two cards. Roughly 75% of the time, the correct answer is to fold before the flop. The hands you choose to play — and from which seats — determine whether you start each hand with an advantage or a deficit.
      </OpeningHook>

      <div className="mb-5 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={view === 'simple' ? 'default' : 'secondary'} onClick={() => setView('simple')}>Simplified view</Button>
        <Button type="button" size="sm" variant={view === 'matrix' ? 'default' : 'secondary'} onClick={() => setView('matrix')}>Full range matrix</Button>
      </div>

      {view === 'simple' && (
        <div className="space-y-6">
          <div className="liquid-glass-quiet rounded-md p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[var(--accent)]" />
              <div className="font-serif text-xl">Premium hands — always play</div>
            </div>
            <div className="mb-3 text-xs text-[var(--text-muted)]">These hands are profitable from every position. Open-raise every time.</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PREMIUM_HANDS.map((h) => (
                <div key={h.label} className="flex items-start gap-3 rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
                  <HandCards cards={h.cards} size="sm" />
                  <div>
                    <div className="font-mono text-sm text-[var(--accent)]">{h.label}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)] leading-4">{h.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="liquid-glass-quiet rounded-md p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <div className="font-serif text-xl">Playable hands — position-dependent</div>
            </div>
            <div className="mb-3 text-xs text-[var(--text-muted)]">Strong from late position (CO, BTN). Tighter standards required from UTG and HJ.</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PLAYABLE_HANDS.map((h) => (
                <div key={h.label} className="flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <HandCards cards={h.cards} size="sm" />
                  <div>
                    <div className="font-mono text-sm text-emerald-300">{h.label}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)] leading-4">{h.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="liquid-glass-quiet rounded-md p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400/60" />
              <div className="font-serif text-xl">Hands to avoid</div>
            </div>
            <div className="text-xs text-[var(--text-muted)] leading-5">Weak offsuit aces (A2–A8o from early position), weak suited cards with no connectivity (J3s, T4s), and unconnected low cards (72o, 83o). These hands lose money over time because they're dominated, miss the board, or lack the equity to justify entering pots.</div>
          </div>

          <div className="border-t border-emerald-100/10 pt-5">
            <div className="mb-3 font-serif text-xl">What would you play?</div>
            <div className="liquid-glass-quiet rounded-md p-4">
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]">Position: {drill.position}</div>
              <div className="mt-3"><HandCards cards={drill.cards} size="md" /></div>
              <div className="mt-1 font-mono text-sm text-[var(--text-muted)]">{drill.label}</div>
              {drillAnswer === null ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button type="button" onClick={() => setDrillAnswer('play')}>Play</Button>
                  <Button type="button" variant="secondary" onClick={() => setDrillAnswer('fold')}>Fold</Button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className={`rounded-md border p-3 text-xs leading-5 ${drillAnswer === drill.action ? 'border-emerald-400/30 bg-emerald-500/8 text-emerald-100' : 'border-red-400/30 bg-red-500/8 text-red-100'}`}>
                    <span className="font-semibold">{drillAnswer === drill.action ? 'Correct. ' : `Incorrect — the answer is ${drill.action}. `}</span>
                    {drill.reason}
                  </div>
                  <Button type="button" variant="secondary" onClick={() => { setDrillAnswer(null); setDrillIndex((i) => i + 1); }}>
                    Next hand
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">Position</span>
            <Select value={position} onValueChange={(v) => v && setPosition(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map((seat) => <SelectItem key={seat} value={seat}>{seat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[linear-gradient(180deg,#f0d77a,#c9a84c)]" />Premium</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#2c684f]" />Strong</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#3b4a34]" />Playable</span>
          </div>
          <StartingHandMatrix position={position} />
        </div>
      )}

      <MistakeCallout>
        Beginners play any ace or any two suited cards. A7 offsuit from UTG, 63 suited from the hijack — these hands bleed chips. Suited doesn't mean playable. The suit adds roughly 3% equity. That won't save a hand with bad card rank and no position.
      </MistakeCallout>
      <LessonConnector nextId="bet-sizing" nextTitle="Bet Sizing" reason="Once you're in a hand with the right cards, the size of your bets determines how much you win — and how much you give away." />
    </LessonShell>
  );
}

const SIZING_QUIZ: Array<{ spot: string; setup: string; correct: number; options: string[]; reason: string }> = [
  { spot: 'Thin value', setup: 'You have top pair, mediocre kicker. Board is dry. Opponent is a station who calls with weak pairs.', correct: 0, options: ['50% pot — charge enough to win value, not so large weak hands fold', '150% overbet — maximum pressure', '10% pot — keep them in always'], reason: 'Thin value bets around 50% pot target weaker made hands that will call. Overbetting folds them out. Underbetting gives them too good a price and shows your hand is polarized.' },
  { spot: 'Protection', setup: 'You have an overpair on a wet board with many draws. You want to charge draws while being ahead.', correct: 1, options: ['25% pot — keep pot small', '75% pot — charge draws correctly', '0% — always check strong hands'], reason: '75% pot gives draws roughly 30% pot odds. A flush draw has ~36% equity — so even at this size, drawing hands can call. Protection bets need to charge enough to make draws unprofitable.' },
  { spot: 'Semi-bluff', setup: 'You have a flush draw and an overcard. You decide to bet as a semi-bluff on the flop.', correct: 1, options: ['10% pot — minimum pressure', '50–66% pot — fold equity plus equity if called', '150% pot — maximum fold equity'], reason: '50–66% is the standard semi-bluff range. It creates meaningful fold equity while not committing too much when called — you still have 36% equity even when called by a made hand.' },
  { spot: 'River value', setup: 'You have the nut flush on the river. Opponent has been calling medium-strength hands throughout.', correct: 2, options: ['25% pot — keep them in', '50% pot — moderate value', '75–100% pot — extract maximum from bluff-catchers'], reason: 'Nutted river hands want maximum value. By the river, your opponent has narrowed their range to hands that call. A large size extracts full value from pairs and two pairs. Small sizing leaves money behind.' },
  { spot: 'Pure bluff', setup: 'You missed your draw on the river. You want to represent a strong hand with a pure bluff.', correct: 1, options: ['25% pot — low commitment', '75% pot or larger — creates real fold pressure', 'Pot-sized — always bet pot on bluffs'], reason: 'Effective bluffs need real fold pressure. A 25% pot bet gives your opponent 5:1 odds — almost any pair calls that price. 75%+ creates a decision that even top pair must think about.' },
];

function BetSizingLesson() {
  const [pot, setPot] = useState(100);
  const [betPercent, setBetPercent] = useState(75);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [mode, setMode] = useState<'concept' | 'calculator' | 'quiz'>('concept');

  const bet = Math.round((pot * betPercent) / 100);
  const opponentOdds = Math.round((bet / (pot + bet)) * 100);

  const sizeLabel = betPercent <= 30 ? 'Probe / range bet' : betPercent <= 60 ? 'Standard value / semi-bluff' : betPercent <= 90 ? 'Strong value / protection' : 'Overbet — polar range';

  return (
    <LessonShell title="Size bets to shape decisions" kicker="Every bet is a price offer">
      <OpeningHook>
        Every bet you make offers your opponent a price. A small bet says "you can call cheaply." A large bet says "this will cost you to continue." Understanding this — and matching size to purpose — separates thinking players from reactive ones.
      </OpeningHook>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['concept', 'calculator', 'quiz'] as const).map((m) => (
          <Button key={m} type="button" size="sm" variant={mode === m ? 'default' : 'secondary'} onClick={() => setMode(m)}>
            {m === 'concept' ? 'Three reasons to bet' : m === 'calculator' ? 'Size calculator' : 'Situation quiz'}
          </Button>
        ))}
      </div>

      {mode === 'concept' && (
        <div className="space-y-4">
          {[
            { reason: 'Value', number: '01', color: 'emerald', description: 'You believe you have the best hand and want to be called by worse hands. The bet extracts chips from opponents who hold second-best.', example: 'You flop top set on K♠ 7♦ 2♣. You bet because pairs and weaker top pairs will call and they\'re losing.', size: '50–75% pot' },
            { reason: 'Protection', number: '02', color: 'amber', description: 'You have a strong but vulnerable hand and want to charge draws so they don\'t get a free card. You\'re betting to make it expensive for equity to realize.', example: 'You hold A♥ K♠ on a K♦ J♣ T♠ board. Many draws and combo draws want a free card. Bet to deny equity.', size: '60–80% pot' },
            { reason: 'Bluff', number: '03', color: 'red', description: 'You don\'t have a strong hand but you believe your opponent will fold often enough to make the bet profitable. Fold equity is the only source of value.', example: 'You hold A♠ 2♠ and the river bricks. You bet representing the flush that completed on the turn.', size: '75%+ pot' },
          ].map(({ reason, number, color, description, example, size }) => (
            <div key={reason} className="liquid-glass-quiet rounded-md p-4">
              <div className="flex items-start gap-4">
                <div className="font-mono text-2xl text-[var(--text-muted)]">{number}</div>
                <div className="flex-1">
                  <div className="font-serif text-xl">{reason}</div>
                  <div className="mt-1 text-sm text-[var(--text-muted)] leading-5">{description}</div>
                  <div className="mt-3 rounded-md border border-white/8 bg-white/[0.03] p-3 text-xs text-[var(--text-muted)] leading-5">
                    <span className="text-[var(--text-primary)]">Example: </span>{example}
                  </div>
                  <div className="mt-2 font-mono text-xs text-[var(--accent)]">Typical size: {size}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'calculator' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <MetricSlider label="Pot" value={pot} min={20} max={500} step={10} onChange={setPot} />
            <MetricSlider label="Bet size" value={betPercent} min={10} max={150} step={5} suffix="% pot" onChange={setBetPercent} />
            <div className="grid grid-cols-4 gap-2">
              {[33, 50, 75, 100].map((size) => (
                <Button key={size} type="button" variant={betPercent === size ? 'default' : 'secondary'} onClick={() => setBetPercent(size)}>
                  {size}%
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--text-muted)]">Opponent\'s required equity to call</div>
              <div className="h-5 overflow-hidden rounded-full border border-white/10 bg-[#07120d]">
                <div className="h-full rounded-full bg-[var(--accent)]/60 transition-all" style={{ width: `${Math.min(opponentOdds, 100)}%` }} />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[var(--text-muted)]">
                <span>0%</span><span className="text-[var(--accent)]">{opponentOdds}% needed</span><span>100%</span>
              </div>
            </div>
          </div>
          <ResultPanel
            title={sizeLabel}
            tone={betPercent < 30 ? 'bad' : 'good'}
            rows={[
              ['Bet amount', `$${bet}`],
              ['Opponent needs', `${opponentOdds}% equity`],
              ['Pot after', `$${pot + bet}`],
              ['Category', sizeLabel],
            ]}
          />
        </div>
      )}

      {mode === 'quiz' && (
        <div className="space-y-3">
          {SIZING_QUIZ.map((item, i) => {
            const answer = quizAnswers[i];
            return (
              <div key={item.spot} className="liquid-glass-quiet rounded-md p-4">
                <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]">{item.spot}</div>
                <div className="mt-1 text-sm text-[var(--text-primary)]">{item.setup}</div>
                {answer === undefined ? (
                  <div className="mt-3 grid gap-2">
                    {item.options.map((opt, j) => (
                      <Button key={opt} type="button" variant="secondary" className="justify-start text-left h-auto py-2 px-3 text-xs" onClick={() => setQuizAnswers((a) => ({ ...a, [i]: j }))}>
                        {opt}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className={`mt-3 rounded-md border p-3 text-xs leading-5 ${answer === item.correct ? 'border-emerald-400/30 bg-emerald-500/8 text-emerald-100' : 'border-red-400/30 bg-red-500/8 text-red-100'}`}>
                    <span className="font-semibold">{answer === item.correct ? 'Correct. ' : `Incorrect — ${item.options[item.correct]}. `}</span>{item.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MistakeCallout>
        Beginners use one bet size for everything — usually a small bet to "keep opponents in." This is the worst of both worlds: too small to charge draws, too small to extract value, and it signals a weak hand to observant opponents. Match your size to your purpose.
      </MistakeCallout>
      <LessonConnector nextId="board-texture" nextTitle="Board Texture" reason="Knowing what size to use is only half the equation. Board texture determines which purpose — value, protection, or bluff — even applies." />
    </LessonShell>
  );
}

const TEXTURE_EXAMPLES: Array<{ type: string; cards: PokerCard[]; draws: string[]; caution: string; explanation: string; strategy: string }> = [
  { type: 'Wet', cards: [pc('9','spades'), pc('T','spades'), pc('J','hearts')], draws: ['Flush draw (spades)', 'Open-ended straight draws', 'Two-pair combos', 'Combo draws'], caution: 'Very high — most hands connect', explanation: 'Connected cards with shared suits create maximum draw density. Hands like KQ, QT, QJ, 87, 8T all have equity. Even underpairs have gut-shot value.', strategy: 'Bet larger to charge draws. Be cautious over-betting thin value. Expect heavy resistance.' },
  { type: 'Dry', cards: [pc('2','diamonds'), pc('7','clubs'), pc('K','hearts')], draws: ['Backdoor only'], caution: 'Low — most ranges missed', explanation: 'Disconnected rainbow cards miss nearly every calling range. No flush draw exists. Straight draws require four-card combinations that are statistically rare.', strategy: 'Small, frequent continuation bets work well. Range advantage favors the preflop raiser. Easy board to apply pressure.' },
  { type: 'Paired', cards: [pc('Q','diamonds'), pc('Q','clubs'), pc('5','hearts')], draws: ['Trips, full houses', 'Some straight draws through 5'], caution: 'Medium — trips changes everything', explanation: 'Whoever holds a queen has trips. Any two-pair hands from preflop are now secondary to trip queens. The remaining cards matter less than who holds Qx.', strategy: 'Proceed cautiously with one pair. Watch for strong bets — they often represent Qx or a full house.' },
  { type: 'Monotone', cards: [pc('A','hearts'), pc('7','hearts'), pc('3','hearts')], draws: ['Made flush (any two hearts)', 'Flush draw (one heart)', 'No straight draws without hearts'], caution: 'High — flush-dominant board', explanation: 'Whoever holds two hearts has a made flush. One heart gives a three-card flush draw. Even opponents without hearts must account for flush pressure on every subsequent action.', strategy: 'Non-flush hands must play carefully. Check-calling is often correct. Big bets usually represent strong flushes.' },
];

const CLASSIFICATION_DRILL: Array<{ cards: PokerCard[]; label: string; answer: 'Wet' | 'Dry' | 'Paired' | 'Monotone'; reason: string }> = [
  { cards: [pc('8','spades'), pc('9','spades'), pc('T','clubs')], label: '8♠ 9♠ T♣', answer: 'Wet', reason: 'Two-tone with connected cards creates flush draw and multiple straight draws. Very wet.' },
  { cards: [pc('2','clubs'), pc('7','hearts'), pc('K','spades')], label: '2♣ 7♥ K♠', answer: 'Dry', reason: 'Rainbow, completely disconnected. Near-zero draw potential. Driest possible flop.' },
  { cards: [pc('J','diamonds'), pc('J','clubs'), pc('4','spades')], label: 'J♦ J♣ 4♠', answer: 'Paired', reason: 'The jack is paired on the flop. Trips and full houses are live for anyone holding Jx.' },
  { cards: [pc('A','clubs'), pc('5','clubs'), pc('9','clubs')], label: 'A♣ 5♣ 9♣', answer: 'Monotone', reason: 'All three cards are clubs. Any two-club hand has a made flush. One club is a draw.' },
  { cards: [pc('Q','spades'), pc('J','hearts'), pc('T','diamonds')], label: 'Q♠ J♥ T♦', answer: 'Wet', reason: 'Broadway connected cards. Everyone holding A, K, 9, or 8 has straight equity. Extremely wet.' },
  { cards: [pc('3','hearts'), pc('3','diamonds'), pc('K','clubs')], label: '3♥ 3♦ K♣', answer: 'Paired', reason: 'Paired board with threes. Trips are possible. Overcards (K) make this slightly more interesting than a low paired board.' },
  { cards: [pc('K','spades'), pc('8','diamonds'), pc('2','clubs')], label: 'K♠ 8♦ 2♣', answer: 'Dry', reason: 'Rainbow. No connecting ranks near each other. Very dry — most ranges whiff completely.' },
  { cards: [pc('6','hearts'), pc('7','hearts'), pc('8','hearts')], label: '6♥ 7♥ 8♥', answer: 'Monotone', reason: 'Monotone AND connected. The wettest possible texture — flushes are complete, straights are live, combo draws everywhere.' },
  { cards: [pc('A','spades'), pc('K','spades'), pc('Q','clubs')], label: 'A♠ K♠ Q♣', answer: 'Wet', reason: 'Broadway cards with a flush draw (two spades). Straight draws are live for JT, JX. Very wet.' },
  { cards: [pc('5','clubs'), pc('5','hearts'), pc('T','spades')], label: '5♣ 5♥ T♠', answer: 'Paired', reason: 'Fives are paired. The ten is unconnected to the pair. Anyone holding 5x has trips. Paired board.' },
];

function BoardTextureLesson() {
  const [drillAnswers, setDrillAnswers] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<'reference' | 'drill'>('reference');

  return (
    <LessonShell title="Classify the board before betting" kicker="Texture changes incentives">
      <OpeningHook>
        The flop lands. Before you think about your hand, look at the board. Wet or dry? Paired? Monotone? The texture tells you how many of your opponent's hands connected, how cautious to be, and what size makes sense — before a single chip moves.
      </OpeningHook>

      <div className="mb-4 flex gap-2">
        <Button type="button" size="sm" variant={mode === 'reference' ? 'default' : 'secondary'} onClick={() => setMode('reference')}>Texture guide</Button>
        <Button type="button" size="sm" variant={mode === 'drill' ? 'default' : 'secondary'} onClick={() => setMode('drill')}>Classification drill</Button>
      </div>

      {mode === 'reference' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {TEXTURE_EXAMPLES.map((tex) => (
            <div key={tex.type} className="liquid-glass-quiet rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-serif text-2xl">{tex.type}</div>
                <div className={`font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border ${tex.caution.startsWith('Very') ? 'border-red-400/40 text-red-300' : tex.caution.startsWith('High') ? 'border-amber-400/40 text-amber-300' : tex.caution.startsWith('Medium') ? 'border-yellow-400/40 text-yellow-300' : 'border-emerald-400/40 text-emerald-300'}`}>
                  {tex.caution}
                </div>
              </div>
              <HandCards cards={tex.cards} size="sm" />
              <div className="text-xs text-[var(--text-muted)] leading-5">{tex.explanation}</div>
              <div className="space-y-1">
                <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Active draws</div>
                <div className="flex flex-wrap gap-1">
                  {tex.draws.map((d) => <span key={d} className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">{d}</span>)}
                </div>
              </div>
              <div className="rounded-md bg-white/[0.03] px-3 py-2 text-xs text-[var(--text-muted)] leading-5">
                <span className="text-[var(--text-primary)]">Strategy: </span>{tex.strategy}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'drill' && (
        <div className="space-y-3">
          <div className="text-sm text-[var(--text-muted)]">Classify each board. Ten boards total.</div>
          {CLASSIFICATION_DRILL.map((item, i) => {
            const answer = drillAnswers[i];
            const correct = answer === item.answer;
            return (
              <div key={item.label} className="liquid-glass-quiet rounded-md p-4">
                <HandCards cards={item.cards} size="sm" />
                <div className="mt-1 font-mono text-xs text-[var(--text-muted)]">{item.label}</div>
                {!answer ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(['Wet', 'Dry', 'Paired', 'Monotone'] as const).map((label) => (
                      <Button key={label} type="button" size="sm" variant="secondary" onClick={() => setDrillAnswers((a) => ({ ...a, [i]: label }))}>
                        {label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className={`mt-3 rounded-md border p-2 text-xs leading-5 ${correct ? 'border-emerald-400/30 bg-emerald-500/8 text-emerald-100' : 'border-red-400/30 bg-red-500/8 text-red-100'}`}>
                    <span className="font-semibold">{correct ? `Correct — ${item.answer}. ` : `Incorrect — this board is ${item.answer}. `}</span>
                    {item.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MistakeCallout>
        Beginners use the same continuation bet size on every flop regardless of texture. A 75% pot bet on a dry K-7-2 rainbow is excessive — most ranges missed, so a 33% bet achieves the same fold. A 25% bet on a 9-T-J two-tone is dangerous — you're giving draws an easy price to stay in.
      </MistakeCallout>
      <LessonConnector nextId="bluffing-basics" nextTitle="Bluffing Basics" reason="Now that you can read a board, you can identify which boards favor bluffing and which ones demand caution." />
    </LessonShell>
  );
}

const BLUFF_RULES = [
  { rule: 'Don\'t bluff multiple opponents', why: 'Each caller reduces fold equity geometrically. Three opponents each folding 50% of the time gives you only 12.5% total fold equity.' },
  { rule: 'Don\'t bluff calling stations', why: 'Fold equity does not exist against players who call with any pair, any draw, or out of curiosity. Bluffs require opponents who can fold.' },
  { rule: 'Prefer semi-bluffs over pure bluffs', why: 'A semi-bluff (flush draw, straight draw) wins two ways: fold equity now, and equity if called. A pure bluff wins only one way.' },
  { rule: 'Use blockers when available', why: 'Holding A♠ on a spade board means your opponent cannot hold the nut flush. Blockers increase fold equity and reduce calling range.' },
  { rule: 'Tell a consistent story', why: 'Your bluff must represent a hand that could credibly bet on every street. A check-call flop, check turn, and river bluff makes no logical sense to a thinking opponent.' },
];

function BluffingLesson() {
  const [pot, setPot] = useState(160);
  const [bet, setBet] = useState(90);
  const [folds, setFolds] = useState(45);
  const [mode, setMode] = useState<'rules' | 'calculator'>('rules');
  const breakEven = Math.round((bet / (pot + bet)) * 100);
  const ev = Math.round((folds / 100) * pot - (1 - folds / 100) * bet);

  return (
    <LessonShell title="Bluffs are math, not bravado" kicker="Fold equity decides the price">
      <OpeningHook>
        Most beginners lose money bluffing. They bluff too often, in wrong spots, against opponents who call too much. A profitable bluff is not a bold move — it is a calculated bet where the math of fold frequency covers the cost of betting.
      </OpeningHook>

      <div className="mb-4 flex gap-2">
        <Button type="button" size="sm" variant={mode === 'rules' ? 'default' : 'secondary'} onClick={() => setMode('rules')}>Bluffing rules</Button>
        <Button type="button" size="sm" variant={mode === 'calculator' ? 'default' : 'secondary'} onClick={() => setMode('calculator')}>EV calculator</Button>
      </div>

      {mode === 'rules' && (
        <div className="space-y-3">
          {BLUFF_RULES.map((item, i) => (
            <div key={item.rule} className="liquid-glass-quiet rounded-md p-4">
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs text-[var(--accent)] mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className="font-serif text-lg">{item.rule}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)] leading-5">{item.why}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="liquid-glass-quiet rounded-md p-4">
            <div className="font-serif text-lg mb-2">When bluffing IS correct</div>
            <div className="space-y-2 text-xs text-[var(--text-muted)] leading-5">
              <div>• You have a <PokerTerm term="blocker" definition="A card in your hand that makes it impossible for your opponent to hold a specific strong hand. E.g., holding A♠ blocks the nut flush on a spade board." /> to opponent's strong calling hands</div>
              <div>• The board texture favors your <PokerTerm term="range" definition="The full set of hands you could plausibly hold given all your actions in the hand." /> — you can represent a hand that makes sense</div>
              <div>• Your opponent showed weakness (check-check-check or small bets)</div>
              <div>• It's heads-up, not multiway</div>
              <div>• You have a <PokerTerm term="semi-bluff" definition="A bluff with a draw — you don't have the best hand now, but could improve to the best hand on a later street." /> rather than pure air</div>
            </div>
          </div>
        </div>
      )}

      {mode === 'calculator' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-5">
              <MetricSlider label="Pot" value={pot} min={20} max={500} step={10} onChange={setPot} />
              <MetricSlider label="Bluff size" value={bet} min={10} max={300} step={5} onChange={setBet} />
              <div className="space-y-2">
                <div className="text-sm text-[var(--text-muted)]">Estimated fold frequency</div>
                <MetricSlider label="" value={folds} min={0} max={100} step={5} suffix="%" onChange={setFolds} />
                <div className="text-xs text-[var(--text-muted)]">
                  Fold equity estimator: opponents with top pair rarely fold to most bets (~10–20%). Opponents with weak pairs or missed draws fold more often (~40–60%). Opponents with air almost always fold (~90%).
                </div>
              </div>
            </div>
            <ResultPanel
              title={ev >= 0 ? 'Bluff shows profit' : 'Bluff burns chips'}
              tone={ev >= 0 ? 'good' : 'bad'}
              rows={[
                ['Break-even folds needed', `${breakEven}%`],
                ['Your estimated folds', `${folds}%`],
                ['Edge', `${folds >= breakEven ? '+' : ''}${folds - breakEven}%`],
                ['EV', `${ev >= 0 ? '+' : ''}$${ev}`],
              ]}
            />
          </div>
          <div className="liquid-glass-quiet rounded-md p-4 text-xs text-[var(--text-muted)] leading-5">
            <span className="text-[var(--text-primary)]">How to read this: </span>
            Break-even folds = Bet ÷ (Pot + Bet). If your opponent folds more than this percentage, the bluff profits. If less, it loses. The EV shows the average chips won/lost per bluff at your estimated fold rate.
          </div>
        </div>
      )}

      <MistakeCallout>
        Beginners bluff every missed draw on the river automatically. A missed flush draw is one of the worst bluff candidates — your opponent saw the flush card miss too, so all their "I need to dodge the flush" hands just improved to confident calls. Missed obvious draws have low fold equity.
      </MistakeCallout>
      <LessonConnector nextId="bankroll-management" nextTitle="Bankroll Management" reason="You've learned how to play hands. Now learn how to survive the variance that comes with playing them over thousands of sessions." />
    </LessonShell>
  );
}

// Deterministic variance simulation — winning player, visible downswings
function generateVarianceSim(numPoints: number, winRatePerPoint: number, stdDevPerPoint: number): number[] {
  const results: number[] = [0];
  // Use a simple LCG for deterministic but realistic-looking swings
  let seed = 42;
  for (let i = 1; i < numPoints; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const u1 = ((seed >>> 0) / 0xffffffff);
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const u2 = ((seed >>> 0) / 0xffffffff);
    // Box-Muller transform
    const z = Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2);
    const delta = winRatePerPoint + z * stdDevPerPoint;
    results.push((results[i - 1] ?? 0) + delta);
  }
  return results;
}

function VarianceGraph({ buyIn }: { buyIn: number }) {
  const points = generateVarianceSim(100, 0.15, 2.2); // winning player, high variance
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return (
    <div className="space-y-2">
      <div className="flex justify-between font-mono text-[10px] text-[var(--text-muted)]">
        <span>Session results over time</span>
        <span className="text-emerald-400">Winning player — visible downswings</span>
      </div>
      <div className="relative h-36 overflow-hidden rounded-md border border-white/10 bg-[#07120d] px-2 pt-2 pb-6">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${points.length} 100`}>
          <polyline
            points={points.map((v, i) => `${i},${100 - ((v - min) / range) * 85}`).join(' ')}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Zero line (breakeven) */}
          <line x1="0" y1={100 - ((0 - min) / range) * 85} x2={points.length} y2={100 - ((0 - min) / range) * 85} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute bottom-1 left-2 right-2 flex justify-between font-mono text-[8px] text-[var(--text-muted)]">
          <span>Start</span>
          <span>Worst downswing: {Math.round(Math.min(...points.map((_, i, a) => (i > 0 ? (a[i] ?? 0) - Math.max(...a.slice(0, i)) : 0))) * buyIn / 10) * 10} chips</span>
          <span>End</span>
        </div>
      </div>
      <div className="text-xs text-[var(--text-muted)] leading-5">
        This is a <span className="text-emerald-300">winning player</span>. The dips are not losing streaks from bad play — they are normal statistical variance. A 15–20 buy-in downswing for a winning player is not unusual.
      </div>
    </div>
  );
}

function BankrollLesson() {
  const [bankroll, setBankroll] = useState(2000);
  const [buyIn, setBuyIn] = useState(100);

  const cashBuyIns = Math.floor(bankroll / buyIn);
  const tournamentBuyIns = Math.floor(bankroll / buyIn);
  const recommendedStake = bankroll >= buyIn * 20 ? buyIn : Math.floor(bankroll / 20);
  const isSafe = cashBuyIns >= 20;

  return (
    <LessonShell title="Survive variance first" kicker="Risk management is a poker skill">
      <OpeningHook>
        A winning player can lose 20 buy-ins in a row through pure luck. This is not a catastrophe — it is normal. Bankroll management is the only tool that ensures a bad run of cards cannot permanently end your ability to play.
      </OpeningHook>

      <div className="space-y-6">
        <VarianceGraph buyIn={buyIn} />

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <MetricSlider label="Your total bankroll ($)" value={bankroll} min={200} max={10000} step={100} onChange={setBankroll} />
            <MetricSlider label="Buy-in size you want to play ($)" value={buyIn} min={20} max={1000} step={20} onChange={setBuyIn} />
            <div className="liquid-glass-quiet rounded-md p-4 text-sm space-y-3">
              <div className="font-serif text-lg">Recommended stake</div>
              <div className={`font-mono text-3xl ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>
                ${recommendedStake} buy-in
              </div>
              <div className="text-xs text-[var(--text-muted)] leading-5">
                {isSafe
                  ? `Your bankroll of $${bankroll} covers ${cashBuyIns} buy-ins at $${buyIn}. This meets the 20 buy-in minimum for cash games.`
                  : `Your bankroll of $${bankroll} only covers ${cashBuyIns} buy-ins at $${buyIn}. Drop to $${recommendedStake} buy-ins to reach the 20 buy-in minimum.`
                }
              </div>
            </div>
          </div>
          <ResultPanel
            title={isSafe ? 'Bankroll is stable' : 'Bankroll is fragile'}
            tone={isSafe ? 'good' : 'bad'}
            rows={[
              ['Buy-ins at this stake', `${cashBuyIns}`],
              ['Minimum for cash', '20 buy-ins'],
              ['Minimum for MTT', '50 buy-ins'],
              ['Safe cash stake', `$${recommendedStake}`],
            ]}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: 'Cash game rules', items: ['20 buy-ins minimum', '30+ recommended for tough games', 'Move down if you fall below floor', 'Never reload from outside your bankroll'] },
            { title: 'Tournament rules', items: ['50 buy-ins minimum', '100+ for high-variance formats (bounty, Turbo)', 'Expected ROI takes 1,000+ tournaments to show', 'One cash changes nothing — long-run discipline required'] },
          ].map(({ title, items }) => (
            <div key={title} className="liquid-glass-quiet rounded-md p-4">
              <div className="font-serif text-lg mb-3">{title}</div>
              <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                {items.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <MistakeCallout>
        Beginners move up stakes after a winning session to "press their edge," then go broke in one bad session. Bankroll management is not optional — it is the mechanism that converts a long-run winning player into actual realized profit. Moving up too fast destroys more players than bad strategy does.
      </MistakeCallout>
      <LessonConnector nextId="reading-opponents" nextTitle="Reading Opponents" reason="With bankroll discipline in place, shift focus to reading what your opponents are doing — the skill that turns solid fundamentals into a real edge." />
    </LessonShell>
  );
}

// ─── New lessons ─────────────────────────────────────────────────────────────

function ImpliedOddsLesson() {
  const [pot, setPot] = useState(80);
  const [call, setCall] = useState(30);
  const [outs, setOuts] = useState(9);
  const [expectedWinIfHit, setExpectedWinIfHit] = useState(120);
  const [cardsToCome, setCardsToCome] = useState<1 | 2>(1);

  const equity = Math.min(95, outs * (cardsToCome === 2 ? 4 : 2));
  const potOdds = Math.round((call / (pot + call)) * 100);
  const impliedPot = pot + call + expectedWinIfHit;
  const impliedOdds = Math.round((call / impliedPot) * 100);
  const justifiedByImplied = equity >= impliedOdds;
  const justifiedByPotOdds = equity >= potOdds;

  return (
    <LessonShell title="The future value hiding in a call" kicker="Pot odds + future earnings">
      <OpeningHook>
        Pot odds say: "can you call right now with what's in the pot?" Implied odds ask: "if you hit, how much more will you win?" Sometimes a call that looks wrong today becomes correct when you account for the chips you'll win on future streets.
      </OpeningHook>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="liquid-glass-quiet rounded-md p-4 space-y-2">
            <div className="font-serif text-xl">The concept</div>
            <div className="text-xs text-[var(--text-muted)] leading-5">
              <PokerTerm term="Pot odds" definition="The ratio of what you must call to the current pot size. Tells you what equity is needed to call profitably right now." /> tell you if a call is immediately profitable. <PokerTerm term="Implied odds" definition="The estimated future pot you'll win if you complete your draw. Factors in chips that aren't in the pot yet." /> tell you if a call becomes profitable once you count chips you haven't won yet.
            </div>
            <div className="mt-3 text-xs text-[var(--text-muted)] leading-5">
              <span className="text-[var(--text-primary)]">Best hands for implied odds:</span> Sets (disguised), straights from connectors (surprising), backdoor flushes. The more "hidden" the draw, the more you'll win when it completes.
            </div>
            <div className="mt-2 text-xs text-[var(--text-muted)] leading-5">
              <span className="text-[var(--text-primary)]">Worst candidates:</span> Obvious flush draws (opponent slows down when flush completes), ace-high draws, and all river decisions (no future streets = implied odds are zero).
            </div>
          </div>
          <div className="liquid-glass-quiet rounded-md p-4">
            <div className="font-serif text-xl mb-3">Example: set mining</div>
            <HandCards cards={[pc('7','spades'), pc('7','hearts')]} size="sm" />
            <div className="mt-3 space-y-1.5 text-xs text-[var(--text-muted)] leading-5">
              <div>Pot odds to call: <span className="text-[var(--text-primary)]">15%</span></div>
              <div>Your equity (12% to flop a set): <span className="text-red-300">too low — fold by pot odds</span></div>
              <div>But if you hit, opponent with top pair pays off: <span className="text-emerald-300">200bb stack</span></div>
              <div className="pt-1 border-t border-white/10">Implied call justified: <span className="text-emerald-300">yes</span> — future stack covers the gap</div>
            </div>
          </div>
        </div>

        <div>
          <div className="font-serif text-xl mb-4">Interactive: pot odds vs implied odds</div>
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-4">
              <MetricSlider label="Pot" value={pot} min={20} max={400} step={10} onChange={setPot} />
              <MetricSlider label="Call amount" value={call} min={5} max={200} step={5} onChange={setCall} />
              <MetricSlider label="Outs" value={outs} min={1} max={15} step={1} onChange={setOuts} />
              <MetricSlider label="Expected extra win if you hit ($)" value={expectedWinIfHit} min={0} max={500} step={10} onChange={setExpectedWinIfHit} />
              <div className="grid grid-cols-2 gap-2">
                {([1, 2] as const).map((c) => (
                  <Button key={c} type="button" variant={cardsToCome === c ? 'default' : 'secondary'} onClick={() => setCardsToCome(c)}>
                    {c} card{c === 1 ? '' : 's'} to come
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className={`rounded-md border p-4 ${justifiedByPotOdds ? 'border-emerald-400/40 bg-emerald-500/8' : 'border-red-400/40 bg-red-500/8'}`}>
                <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Pot odds alone</div>
                <div className="mt-1 font-serif text-xl">{justifiedByPotOdds ? 'Call profitable' : 'Call unprofitable'}</div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">Need {potOdds}% equity, have {equity}%</div>
              </div>
              <div className={`rounded-md border p-4 ${justifiedByImplied ? 'border-emerald-400/40 bg-emerald-500/8' : 'border-red-400/40 bg-red-500/8'}`}>
                <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">With implied odds</div>
                <div className="mt-1 font-serif text-xl">{justifiedByImplied ? 'Call justified' : 'Still unprofitable'}</div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">Need {impliedOdds}% equity (inc. future pot ${expectedWinIfHit}), have {equity}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MistakeCallout>
        Beginners use implied odds to justify calling with any draw, estimating wildly optimistic future winnings. Implied odds require realistic estimates: your opponent must have a hand strong enough to pay off, they must not fold when the draw completes, and the draw must be hidden enough to get paid. Over-estimating implied odds is one of the most expensive leaks in beginner poker.
      </MistakeCallout>
      <LessonConnector nextId="starting-hands" nextTitle="Starting Hands" reason="With pot odds and implied odds understood, you can evaluate starting hands more precisely — knowing which speculative hands have the implied odds to justify playing." />
    </LessonShell>
  );
}

const READING_OPPONENTS_PATTERNS = [
  { pattern: 'Large bet, all streets', interpretation: 'Polarized — very strong or a bluff. Medium hands don\'t triple-barrel large.', response: 'Call or raise with strong hands. Fold weak hands. Don\'t call with one pair on scary boards.' },
  { pattern: 'Bet-bet-check (BBX)', interpretation: 'Usually giving up or taking a free showdown. Often top pair or a busted semi-bluff.', response: 'Bet when checked to on the river — many opponents will fold or only call with strong hands.' },
  { pattern: 'Check-raise flop', interpretation: 'Typically strong: sets, two pair, flush draws with equity. Rarely a bluff from passive players.', response: 'Re-evaluate your hand against a stronger range. Fold marginal hands. Call or 3-bet only nutted hands.' },
  { pattern: 'Tiny bet (10–25% pot)', interpretation: 'Blocking bet — wants to see showdown cheaply. Usually a medium-strength hand scared of a bigger bet.', response: 'Raise with strong hands. The small bet reveals weakness, not strength.' },
  { pattern: 'Overbet (125%+ pot)', interpretation: 'Polar — either the nuts or a bluff representing the nuts. Rarely a medium hand.', response: 'Only call with hands that beat bluffs and lose to the top of their range. Fold everything else.' },
];

function ReadingOpponentsLesson() {
  const [selected, setSelected] = useState(0);
  const pattern = READING_OPPONENTS_PATTERNS[selected]!;

  return (
    <LessonShell title="Read the story before calling" kicker="Ranges, not hands">
      <OpeningHook>
        Your opponent doesn't tell you what they hold — their bets tell you. A large bet on the river after checking twice is different from a river bet after betting all three streets. Every action narrows the range of hands they can plausibly hold.
      </OpeningHook>

      <div className="space-y-6">
        <div className="liquid-glass-quiet rounded-md p-4">
          <div className="font-serif text-xl mb-2">Ranging, not hand-reading</div>
          <div className="text-xs text-[var(--text-muted)] leading-5">
            Most players try to put opponents on <em>one hand</em>: "they have AK." This is almost always wrong. Experienced players think in <PokerTerm term="ranges" definition="The full set of hands an opponent could plausibly hold, weighted by likelihood, given all their actions across the hand." /> — "given their preflop call, flop check-raise, and large turn bet, their range includes sets, two pair, strong draws, and occasional bluffs with flush draws. AK is one hand in that range."
          </div>
          <div className="mt-3 text-xs text-[var(--text-muted)] leading-5">
            Every action narrows the range. By the river, you have enough information to make probabilistic decisions — not certain ones, but informed ones.
          </div>
        </div>

        <div>
          <div className="font-serif text-xl mb-3">Common betting patterns</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {READING_OPPONENTS_PATTERNS.map((p, i) => (
              <Button key={p.pattern} type="button" size="sm" variant={selected === i ? 'default' : 'secondary'} onClick={() => setSelected(i)}>
                {p.pattern}
              </Button>
            ))}
          </div>
          <div className="liquid-glass-quiet rounded-md p-4 space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Pattern</div>
              <div className="font-serif text-2xl mt-1">{pattern.pattern}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Typical interpretation</div>
              <div className="mt-1 text-sm text-[var(--text-muted)] leading-5">{pattern.interpretation}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">How to respond</div>
              <div className="mt-1 text-sm text-[var(--text-muted)] leading-5">{pattern.response}</div>
            </div>
          </div>
        </div>

        <div className="liquid-glass-quiet rounded-md p-4">
          <div className="font-serif text-xl mb-3">Building a range: worked example</div>
          <div className="space-y-2 text-xs text-[var(--text-muted)] leading-5">
            {[
              { action: 'Calls a raise preflop', narrows: 'Removes AA, KK, QQ, AK (most would 3-bet). Range: pairs 22–JJ, suited aces, broadways, suited connectors.' },
              { action: 'Checks the flop K♠ 7♦ 2♣', narrows: 'Unlikely to have AK, KK, KQ (most would bet). Range shifts toward pocket pairs below king and speculative hands.' },
              { action: 'Calls your 60% pot flop bet', narrows: 'Removes pure air. Keeps: middle pairs, weak king-x, gut-shots, backdoor draws.' },
              { action: 'Check-raises the turn 9♦', narrows: 'Strong signal. Range now: sets (77, 22), two pair, strong draws (89, T9s). Pure bluffs are rare here.' },
            ].map(({ action, narrows }) => (
              <div key={action} className="border-b border-white/8 pb-2 last:border-0">
                <div className="text-[var(--text-primary)]">{action}</div>
                <div className="mt-0.5">{narrows}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MistakeCallout>
        Beginners call bets based on their own hand strength, ignoring what their opponent's betting pattern represents. "I have top pair, I should call" — but if the opponent check-raised the turn on a paired board and fired large on the river, top pair is likely losing. Always evaluate your hand against the range their actions suggest.
      </MistakeCallout>
      <LessonConnector nextId="common-mistakes" nextTitle="Common Mistakes" reason="Now that you understand the full game, review the top 10 leaks that drain chips from every beginner — and confirm you're not making them." />
    </LessonShell>
  );
}

const COMMON_MISTAKES_LIST = [
  { name: 'Playing too many hands preflop', looks: 'Calling with J4s from UTG, limping any suited hand, never folding preflop.', costs: 'Every weak hand played is a small loss on average. Over thousands of hands, this is the #1 chip drain.', fix: 'Tighten to 15–25% of hands from most positions. If you\'re not sure, fold.' },
  { name: 'Limping instead of raising', looks: 'Just calling the big blind with AA, KK, strong aces.', costs: 'Builds small pots with hands that deserve large ones. Lets multiple hands in cheaply. Fails to apply preflop pressure.', fix: 'Open-raise with any hand worth playing. Limping is almost never optimal.' },
  { name: 'Calling too much on the flop', looks: 'Calling bets with backdoor draws, weak pairs, no clear path to winning.', costs: 'Each flop call with marginal equity starts a losing chain of calls on later streets.', fix: 'Fold more on the flop. Your equity must justify the call plus all likely future bets.' },
  { name: 'Not adjusting to position', looks: 'Same range from UTG as from BTN. Playing J8o from early position.', costs: 'Out-of-position hands make every subsequent street harder and more expensive.', fix: 'Play significantly tighter from early positions. Widen only near the button.' },
  { name: 'Bluffing too often', looks: 'Betting every missed draw on the river. Bluffing calling stations.', costs: 'Each failed bluff burns the entire bet. Without fold equity, bluffs are 100% losers when called.', fix: 'Only bluff when you have: fold equity, a credible story, a blocker, and ideally equity (semi-bluff).' },
  { name: 'Ignoring pot odds', looks: 'Folding a flush draw to a small bet. Calling a large river bet with low equity.', costs: 'Both directions lose money: over-folding draws and over-calling marginal hands.', fix: 'Calculate pot odds before every call: Call ÷ (Pot + Call). Compare to your equity.' },
  { name: 'Playing on tilt', looks: 'Raising any two cards after a bad beat. Calling down with no equity.', costs: 'Tilt turns one statistical event into a session-long disaster.', fix: 'Identify your tilt triggers. Take a break. Never make a decision while emotional.' },
  { name: 'Results-oriented thinking', looks: 'Celebrating a bad call that won. Lamenting a good fold that would have won.', costs: 'Reinforces poor decisions and abandons correct ones based on a single outcome.', fix: 'Judge decisions by process, not outcome. Ask: "Was this correct given the information I had?"' },
  { name: 'Ignoring bankroll management', looks: 'Moving up stakes after a winning session. Playing $500 buy-in with a $1,000 bankroll.', costs: 'One bad run at the wrong stake can end your ability to play entirely.', fix: 'Maintain 20 buy-ins for cash, 50 for tournaments. Move down if you fall below the floor.' },
  { name: 'Failing to study', looks: 'Playing thousands of hands with no review. Never reading hands, books, or solvers.', costs: 'You repeat the same leaks indefinitely. Variance hides mistakes for long stretches.', fix: 'Review 5–10 key hands per session. Ask why you won or lost, not just if.' },
];

function CommonMistakesLesson() {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(0);

  const toggle = (i: number) => setChecked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <LessonShell title="The ten leaks that drain beginners" kicker="Fix these before anything else">
      <OpeningHook>
        Most beginners are not losing because of complex GTO mistakes. They're losing because of ten specific, fixable habits. This is your audit. Work through each one honestly — check off any that you do not make, and spend time on the ones that describe your game.
      </OpeningHook>

      <div className="space-y-2">
        {COMMON_MISTAKES_LIST.map((mistake, i) => (
          <div key={mistake.name} className={`rounded-md border transition-colors ${checked.has(i) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded((e) => e === i ? null : i)}>
              <button
                type="button"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] transition-colors ${checked.has(i) ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300' : 'border-white/20 bg-white/[0.04]'}`}
                onClick={(e) => { e.stopPropagation(); toggle(i); }}
                aria-label={checked.has(i) ? 'Mark as not fixed' : 'Mark as fixed'}
              >
                {checked.has(i) && <Check className="h-3 w-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`font-serif text-base ${checked.has(i) ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{mistake.name}</span>
                </div>
              </div>
              {expanded === i ? <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />}
            </div>
            {expanded === i && (
              <div className="grid gap-3 border-t border-white/8 px-4 py-3 sm:grid-cols-3">
                {[
                  { label: 'What it looks like', text: mistake.looks },
                  { label: 'Why it costs chips', text: mistake.costs },
                  { label: 'What to do instead', text: mistake.fix },
                ].map(({ label, text }) => (
                  <div key={label}>
                    <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--accent)] mb-1">{label}</div>
                    <div className="text-xs text-[var(--text-muted)] leading-5">{text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md border border-emerald-100/10 bg-white/[0.02] px-4 py-3">
        <div className="text-sm text-[var(--text-muted)]">Mistakes addressed</div>
        <div className="font-mono text-lg text-[var(--accent)]">{checked.size}/{COMMON_MISTAKES_LIST.length}</div>
      </div>

      <MistakeCallout>
        Reading this list once is not enough. Return to it after every losing session and ask which of these applied. A mistake you can name is a mistake you can fix. A mistake you can't see is a permanent leak.
      </MistakeCallout>
    </LessonShell>
  );
}

// ─── Shared utility components ────────────────────────────────────────────────

function MetricSlider({ label, value, min, max, step, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
        <span className="font-mono text-sm text-[var(--accent)]">{value}{suffix ? ` ${suffix}` : ''}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(Array.isArray(next) ? next[0] ?? value : next)} />
    </div>
  );
}

function ResultPanel({ title, tone, rows }: { title: string; tone: 'good' | 'bad'; rows: Array<[string, string]> }) {
  return (
    <div className={`rounded-md border p-4 ${tone === 'good' ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-red-400/50 bg-red-500/10'}`}>
      <div className="font-serif text-2xl">{title}</div>
      <div className="mt-5 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-emerald-100/10 pb-2 last:border-b-0">
            <span className="text-sm text-[var(--text-muted)]">{label}</span>
            <span className="font-mono text-sm text-[var(--text-primary)]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StartingHandMatrix({ position }: { position: string }) {
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const playableCounts: Record<string, number> = { UTG: 34, HJ: 48, CO: 64, BTN: 88, SB: 62, BB: 76 };
  const playableCount = playableCounts[position] ?? 48;
  let index = 0;

  return (
    <div className="liquid-glass-quiet overflow-x-auto rounded-md p-3">
      <div className="grid min-w-[620px] gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(2.25rem, 1fr))' }}>
        {ranks.flatMap((row, rowIndex) => ranks.map((column, columnIndex) => {
          const label = rowIndex === columnIndex ? `${row}${column}` : rowIndex < columnIndex ? `${row}${column}s` : `${column}${row}o`;
          const premium = ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo'].includes(label);
          const strong = premium || ['TT', '99', 'AQs', 'AJs', 'KQs', 'AQo'].includes(label);
          const playable = premium || strong || index < playableCount;
          index += 1;

          return (
            <div
              key={`${row}-${column}`}
              className={`flex h-9 w-full items-center justify-center rounded-md border text-[10px] ${
                premium
                  ? 'border-[#f0d77a]/70 bg-[linear-gradient(180deg,#f0d77a,#c9a84c)] text-emerald-950'
                  : strong
                    ? 'border-emerald-300/35 bg-[#2c684f] text-emerald-50'
                    : playable
                      ? 'border-[#8f7b36]/40 bg-[#3b4a34] text-[#f4e7b0]'
                      : 'border-emerald-100/5 bg-[#07120d] text-emerald-100/35'
              }`}
            >
              {label}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

function PracticePanel({ lessonId }: LessonPageProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const scenarios = practiceScenarios[lessonId];

  return (
    <Card className="border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] text-[var(--text-primary)] shadow-[0_28px_90px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.11)]">
      <CardHeader className="px-5">
        <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">Scenario reps</div>
        <CardTitle className="font-serif text-4xl leading-none">Practice</CardTitle>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3 px-5 pb-5 text-sm text-[var(--text-muted)] lg:grid-cols-3">
        {scenarios.map((scenario, index) => {
          const selected = answers[index];
          const correct = selected === scenario.correct;

          return (
            <div key={scenario.prompt} className="min-w-0 rounded-md border border-white/10 bg-[#07120e]/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">{scenario.spot}</div>
              <div className="mt-2 min-h-16 text-wrap break-words leading-6 text-[var(--text-primary)]">{scenario.prompt}</div>
              <div className="mt-4 grid gap-2">
                {scenario.answers.map((answer, answerIndex) => (
                  <Button
                    key={answer}
                    type="button"
                    variant={selected === answerIndex ? 'default' : 'secondary'}
                    className="h-auto min-h-10 w-full justify-center px-3 py-2 text-center leading-5 text-wrap whitespace-normal"
                    onClick={() => setAnswers((current) => ({ ...current, [index]: answerIndex }))}
                  >
                    {answer}
                  </Button>
                ))}
              </div>
              {selected !== undefined && (
                <div className={`mt-4 text-wrap break-words rounded-md border p-3 leading-5 ${correct ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-50' : 'border-red-400/35 bg-red-500/10 text-red-50'}`}>
                  {scenario.reason}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function QuizPanel({ lessonId }: LessonPageProps) {
  const completeLesson = useGameStore((state) => state.completeLesson);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const questions = quizQuestions[lessonId];

  const score = submitted
    ? Math.round((questions.filter((q, i) => answers[i] === q.correct).length / questions.length) * 100)
    : null;

  const submit = () => {
    if (Object.keys(answers).length < questions.length) return;
    setSubmitted(true);
    const correct = questions.filter((q, i) => answers[i] === q.correct).length;
    completeLesson(lessonId, Math.round((correct / questions.length) * 100));
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <Card className="border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] text-[var(--text-primary)] shadow-[0_28px_90px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.11)]">
      <CardHeader className="px-5">
        <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">Score 70% to complete</div>
        <CardTitle className="font-serif text-4xl leading-none">Quiz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        {questions.map((question, questionIndex) => {
          const selected = answers[questionIndex];
          const isCorrect = selected === question.correct;

          return (
            <fieldset key={question.question} className="rounded-md border border-white/10 bg-[#07120e]/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <legend className="px-1 text-[15px] leading-6 text-[#f3ead7]">{question.question}</legend>
              <div className="mt-3 grid min-w-0 gap-2 md:grid-cols-3">
                {question.answers.map((answer, answerIndex) => {
                  const variant: 'default' | 'secondary' = selected === answerIndex ? 'default' : 'secondary';
                  let extra = '';
                  if (submitted) {
                    if (answerIndex === question.correct) extra = 'ring-2 ring-emerald-400/70';
                    else if (selected === answerIndex && !isCorrect) extra = 'ring-2 ring-red-400/70 opacity-60';
                  }
                  return (
                    <Button
                      key={answer}
                      type="button"
                      variant={variant}
                      className={`h-auto min-h-10 w-full rounded-md px-3 py-2 text-center leading-5 text-wrap whitespace-normal ${extra}`}
                      disabled={submitted}
                      onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: answerIndex }))}
                    >
                      {answer}
                    </Button>
                  );
                })}
              </div>
              {submitted && (
                <div className={`mt-2 rounded-md border p-3 text-xs leading-5 ${isCorrect ? 'border-emerald-400/30 bg-emerald-500/8 text-emerald-100' : 'border-red-400/30 bg-red-500/8 text-red-100'}`}>
                  <span className="font-semibold">{isCorrect ? 'Correct. ' : 'Incorrect. '}</span>
                  {question.feedback}
                </div>
              )}
            </fieldset>
          );
        })}

        {!submitted ? (
          <Button
            type="button"
            className="mt-1 rounded-md"
            disabled={Object.keys(answers).length < questions.length}
            onClick={submit}
          >
            Submit Quiz
          </Button>
        ) : (
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 font-mono text-sm ${score !== null && score >= 70 ? 'text-emerald-300' : 'text-red-300'}`}>
              {score !== null && score >= 70 ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {score}% — {score !== null && score >= 70 ? 'Lesson complete.' : 'Review the explanations above, then retry.'}
            </div>
            {score !== null && score < 70 && (
              <Button type="button" variant="secondary" onClick={reset}>
                <RefreshCw className="mr-2 h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LessonPage({ lessonId }: LessonPageProps) {
  const lesson = useMemo(() => LESSONS.find((item) => item.id === lessonId), [lessonId]);

  if (!lesson) {
    return null;
  }

  return (
    <main className="relative min-h-screen bg-[#06110d] text-[var(--text-primary)]">
      <AppHeader />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_72%_12%,rgba(232,201,106,0.08),transparent_28%),linear-gradient(rgba(245,240,232,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,232,0.035)_1px,transparent_1px)] [background-size:auto,88px_88px,88px_88px]" />
      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-10 pt-28">
        <Link
          href="/learn"
          className="mb-8 inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-3 text-sm text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-[#e8c96a]/45 hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4 text-[var(--accent)]" />
          Back to lessons
        </Link>
        <Tabs defaultValue="learn" className="gap-0">
          <header className="mb-8 border-b border-emerald-100/10 pb-7">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]">Lesson {String(lesson.order).padStart(2, '0')}</div>
              <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[0.95] sm:text-6xl">{lesson.title}</h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--text-muted)]">{lesson.description}</p>
            </div>
            <TabsList
              variant="line"
              className="mt-7 flex h-auto w-full justify-start gap-7 rounded-none !border-0 !bg-transparent !p-0 !shadow-none ![background:transparent] ![backdrop-filter:none] sm:w-fit"
            >
              <TabsTrigger
                value="learn"
                className="h-auto flex-none rounded-none px-0 py-2 font-mono text-[11px] uppercase tracking-wide text-emerald-100/50 data-active:border-transparent data-active:bg-transparent data-active:text-[var(--accent)] data-active:shadow-none group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-0"
              >
                Learn
              </TabsTrigger>
              <TabsTrigger
                value="practice"
                className="h-auto flex-none rounded-none px-0 py-2 font-mono text-[11px] uppercase tracking-wide text-emerald-100/50 data-active:border-transparent data-active:bg-transparent data-active:text-[var(--accent)] data-active:shadow-none group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-0"
              >
                Practice
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="h-auto flex-none rounded-none px-0 py-2 font-mono text-[11px] uppercase tracking-wide text-emerald-100/50 data-active:border-transparent data-active:bg-transparent data-active:text-[var(--accent)] data-active:shadow-none group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-0"
              >
                Quiz
              </TabsTrigger>
            </TabsList>
          </header>
          <TabsContent value="learn">
            <LearnPanel lessonId={lessonId} />
          </TabsContent>
          <TabsContent value="practice">
            <PracticePanel lessonId={lessonId} />
          </TabsContent>
          <TabsContent value="quiz">
            <QuizPanel lessonId={lessonId} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
