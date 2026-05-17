'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { getBotDecision } from '@/lib/ai-bot/bot-strategy';
import { evaluateAction } from '@/lib/coaching/coaching-evaluator';
import { applyAction, getLegalActions, initHand } from '@river/engine';
import {
  type ActionType,
  type BotDifficulty,
  type CoachingAdvice,
  type GameState,
  type HandHistory,
  type LessonId,
  type LessonProgress,
  type Player,
  type PlayerAction,
  type PlayerStats,
} from '@river/engine';

type GameConfig = {
  numBots: number;
  difficulty: BotDifficulty;
  startingStack: number;
  blinds: { small: number; big: number };
};

type PersistedGameStore = Pick<GameStore, 'handHistory' | 'lessonProgress' | 'playerStats' | 'coachingEnabled'>;

type GameStore = {
  gameState: GameState | null;
  handHistory: HandHistory[];
  lessonProgress: LessonProgress[];
  playerStats: PlayerStats;
  coachingEnabled: boolean;
  lastCoachingAdvice: CoachingAdvice | null;
  isAnimating: boolean;
  lastConfig: GameConfig | null;
  initGame: (config: GameConfig) => void;
  executeAction: (action: ActionType, amount?: number) => Promise<void>;
  nextHand: () => void;
  toggleCoaching: () => void;
  completeLesson: (lessonId: LessonId, quizScore: number) => void;
  resetStats: () => void;
};

const initialStats: PlayerStats = {
  handsPlayed: 0,
  handsWon: 0,
  totalProfit: 0,
  vpip: 0,
  pfr: 0,
  pokerIQ: 500,
  sessionActions: { good: 0, neutral: 0, bad: 0 },
};

const botNames = ['Fish Freddy', 'TAG Terry', 'GTO Gary'];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createPlayers(config: GameConfig): Player[] {
  const hero: Player = {
    id: 'hero',
    name: 'Hero',
    stack: config.startingStack,
    holeCards: null,
    position: 'BTN',
    seatIndex: 0,
    isHuman: true,
    isFolded: false,
    isAllIn: false,
    currentBet: 0,
    totalInvested: 0,
    isBot: false,
  };
  const bots = Array.from({ length: config.numBots }, (_, index): Player => ({
    id: `bot-${index + 1}`,
    name: botNames[index] ?? `Bot ${index + 1}`,
    stack: config.startingStack,
    holeCards: null,
    position: 'BTN',
    seatIndex: index + 1,
    isHuman: false,
    isFolded: false,
    isAllIn: false,
    currentBet: 0,
    totalInvested: 0,
    isBot: true,
    botDifficulty: config.difficulty,
  }));

  return [hero, ...bots];
}

function resetPlayerForNextHand(player: Player): Player {
  return {
    ...player,
    holeCards: null,
    isFolded: false,
    isAllIn: false,
    currentBet: 0,
    totalInvested: 0,
  };
}

function normalizeActionAmount(action: ActionType, amount: number | undefined, legal: ReturnType<typeof getLegalActions>): number {
  switch (action) {
    case 'FOLD':
    case 'CHECK':
      return 0;
    case 'CALL':
      return legal.callAmount;
    case 'BET':
      return amount ?? legal.minBet;
    case 'RAISE':
      return amount ?? legal.minRaise;
    case 'ALL_IN':
      return legal.allInAmount;
  }
}

function assertLegal(action: ActionType, amount: number, legal: ReturnType<typeof getLegalActions>): void {
  if (action === 'FOLD' && !legal.canFold) {
    throw new Error('Fold is not legal');
  }

  if (action === 'CHECK' && !legal.canCheck) {
    throw new Error('Check is not legal');
  }

  if (action === 'CALL' && !legal.canCall) {
    throw new Error('Call is not legal');
  }

  if (action === 'BET' && (!legal.canBet || amount < legal.minBet || amount > legal.maxBet)) {
    throw new Error('Bet is not legal');
  }

  if (action === 'RAISE' && (!legal.canRaise || amount < legal.minRaise || amount > legal.maxRaise)) {
    throw new Error('Raise is not legal');
  }

  if (action === 'ALL_IN' && !legal.isAllIn) {
    throw new Error('All-in is not legal');
  }
}

function handHistoryFromState(state: GameState): HandHistory {
  const holeCards = Object.fromEntries(
    state.players
      .filter((player): player is Player & { holeCards: NonNullable<Player['holeCards']> } => player.holeCards !== null)
      .map((player) => [player.id, player.holeCards]),
  );

  return {
    handNumber: state.handNumber,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      stack: player.stack,
    })),
    holeCards,
    streets: state.actionHistory.reduce<HandHistory['streets']>((streets, action) => {
      const existingIndex = streets.findIndex((street) => street.street === action.street);
      const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);

      if (existingIndex === -1) {
        return [...streets, {
          street: action.street,
          communityCards: state.communityCards,
          actions: [action],
          potAfter: totalPot,
        }];
      }

      const existing = streets[existingIndex];

      if (!existing) {
        return streets;
      }

      return streets.map((street, index) => index === existingIndex ? {
        ...street,
        actions: [...street.actions, action],
        potAfter: totalPot,
      } : street);
    }, []),
    winners: state.winners,
    timestamp: Date.now(),
  };
}

function updateStatsAfterHand(stats: PlayerStats, state: GameState): PlayerStats {
  const hero = state.players.find((player) => player.id === 'hero');
  const heroWinner = state.winners.some((winner) => winner.playerId === 'hero');
  const heroProfit = state.winners
    .filter((winner) => winner.playerId === 'hero')
    .reduce((sum, winner) => sum + winner.amount, 0) - (hero?.totalInvested ?? 0);
  const heroPreflopActions = state.actionHistory.filter((action) => action.playerId === 'hero' && action.street === 'PREFLOP');
  const voluntaryPreflop = heroPreflopActions.some((action) => action.type === 'CALL' || action.type === 'BET' || action.type === 'RAISE' || action.type === 'ALL_IN');
  const preflopRaise = heroPreflopActions.some((action) => action.type === 'BET' || action.type === 'RAISE' || action.type === 'ALL_IN');
  const handsPlayed = stats.handsPlayed + 1;

  return {
    ...stats,
    handsPlayed,
    handsWon: stats.handsWon + (heroWinner ? 1 : 0),
    totalProfit: stats.totalProfit + heroProfit,
    vpip: ((stats.vpip * stats.handsPlayed) + (voluntaryPreflop ? 100 : 0)) / handsPlayed,
    pfr: ((stats.pfr * stats.handsPlayed) + (preflopRaise ? 100 : 0)) / handsPlayed,
    pokerIQ: stats.pokerIQ,
  };
}

function updateStatsForAdvice(stats: PlayerStats, advice: CoachingAdvice | null): PlayerStats {
  if (!advice) {
    return stats;
  }

  if (advice.quality === 'GOOD') {
    return {
      ...stats,
      pokerIQ: Math.min(1000, stats.pokerIQ + 5),
      sessionActions: { ...stats.sessionActions, good: stats.sessionActions.good + 1 },
    };
  }

  if (advice.quality === 'BAD') {
    return {
      ...stats,
      pokerIQ: Math.max(0, stats.pokerIQ - 5),
      sessionActions: { ...stats.sessionActions, bad: stats.sessionActions.bad + 1 },
    };
  }

  return {
    ...stats,
    sessionActions: { ...stats.sessionActions, neutral: stats.sessionActions.neutral + 1 },
  };
}

function gameStateWithHandNumber(state: GameState, handNumber: number): GameState {
  return {
    ...state,
    handNumber,
  };
}

async function maybeRunBotTurn(get: () => GameStore): Promise<void> {
  const state = get().gameState;

  if (!state || state.phase === 'HAND_COMPLETE') {
    return;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  if (!currentPlayer?.isBot) {
    return;
  }

  const legal = getLegalActions(state);
  const decision = getBotDecision(state, currentPlayer, legal);

  await delay(decision.thinkMs);
  await get().executeAction(decision.action, decision.amount);
}

export const useGameStore = create<GameStore>()(
  persist(
    immer((set, get) => ({
      gameState: null,
      handHistory: [],
      lessonProgress: [],
      playerStats: initialStats,
      coachingEnabled: true,
      lastCoachingAdvice: null,
      isAnimating: false,
      lastConfig: null,
      initGame: (config) => {
        const players = createPlayers(config);
        const gameState = gameStateWithHandNumber(initHand(players, -1, config.blinds), 1);

        set((draft) => {
          draft.gameState = gameState;
          draft.lastConfig = config;
          draft.lastCoachingAdvice = null;
          draft.isAnimating = false;
        });

        void maybeRunBotTurn(get);
      },
      executeAction: async (action, amount) => {
        const state = get().gameState;

        if (!state || state.phase === 'HAND_COMPLETE') {
          return;
        }

        const currentPlayer = state.players[state.currentPlayerIndex];

        if (!currentPlayer) {
          throw new Error('No current player');
        }

        const legal = getLegalActions(state);
        const normalizedAmount = normalizeActionAmount(action, amount, legal);
        assertLegal(action, normalizedAmount, legal);

        const advice = currentPlayer.isHuman && get().coachingEnabled
          ? evaluateAction(state, action, normalizedAmount, currentPlayer, legal)
          : null;
        const playerAction: PlayerAction = {
          type: action,
          amount: normalizedAmount,
          playerId: currentPlayer.id,
          street: state.street,
          timestamp: Date.now(),
        };
        const nextState = applyAction(state, playerAction);
        const completedNow = nextState.phase === 'HAND_COMPLETE';
        const nextHistory = completedNow ? handHistoryFromState(nextState) : null;

        set((draft) => {
          draft.gameState = nextState;
          draft.lastCoachingAdvice = advice;
          draft.playerStats = updateStatsForAdvice(draft.playerStats, advice);

          if (nextHistory) {
            draft.handHistory.unshift(nextHistory);
            draft.playerStats = updateStatsAfterHand(draft.playerStats, nextState);
          }
        });

        await maybeRunBotTurn(get);
      },
      nextHand: () => {
        const state = get().gameState;
        const config = get().lastConfig;

        if (!state || !config) {
          return;
        }

        const eligiblePlayers = state.players
          .filter((player) => player.stack > 0)
          .map(resetPlayerForNextHand);

        if (eligiblePlayers.length < 2) {
          return;
        }

        const nextState = gameStateWithHandNumber(initHand(eligiblePlayers, state.dealerIndex, config.blinds), state.handNumber + 1);

        set((draft) => {
          draft.gameState = nextState;
          draft.lastCoachingAdvice = null;
          draft.isAnimating = false;
        });

        void maybeRunBotTurn(get);
      },
      toggleCoaching: () => {
        set((draft) => {
          draft.coachingEnabled = !draft.coachingEnabled;
          draft.lastCoachingAdvice = null;
        });
      },
      completeLesson: (lessonId, quizScore) => {
        set((draft) => {
          const existingIndex = draft.lessonProgress.findIndex((progress) => progress.lessonId === lessonId);
          const progress: LessonProgress = {
            lessonId,
            completed: quizScore >= 70,
            quizScore,
            completedAt: quizScore >= 70 ? Date.now() : null,
          };

          if (existingIndex === -1) {
            draft.lessonProgress.push(progress);
          } else {
            draft.lessonProgress[existingIndex] = progress;
          }
        });
      },
      resetStats: () => {
        set((draft) => {
          draft.playerStats = initialStats;
          draft.handHistory = [];
        });
      },
    })),
    {
      name: 'poker-app-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedGameStore => ({
        handHistory: state.handHistory,
        lessonProgress: state.lessonProgress,
        playerStats: state.playerStats,
        coachingEnabled: state.coachingEnabled,
      }),
    },
  ),
);
