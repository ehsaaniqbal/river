import type { LessonId } from '@river/engine';

export type LessonMetadata = {
  id: LessonId;
  title: string;
  description: string;
  order: number;
};

export const LESSONS: LessonMetadata[] = [
  {
    id: 'how-poker-works',
    title: 'How Poker Works',
    description: 'The complete game — objective, table setup, and every action — in one lesson.',
    order: 0,
  },
  {
    id: 'hand-rankings',
    title: 'Hand Rankings',
    description: 'Know the exact five-card hand before the chips move.',
    order: 1,
  },
  {
    id: 'position',
    title: 'Position',
    description: 'See why the last seat owns the most information.',
    order: 2,
  },
  {
    id: 'pot-odds',
    title: 'Pot Odds',
    description: 'Put a price on the call before you put chips in.',
    order: 3,
  },
  {
    id: 'implied-odds',
    title: 'Implied Odds',
    description: 'See the future value hiding behind a call that looks wrong today.',
    order: 4,
  },
  {
    id: 'starting-hands',
    title: 'Starting Hands',
    description: 'Open hands that can stand up to the seat you are in.',
    order: 5,
  },
  {
    id: 'bet-sizing',
    title: 'Bet Sizing',
    description: 'Choose sizes that tax draws, punish bluff-catchers, and get paid.',
    order: 6,
  },
  {
    id: 'board-texture',
    title: 'Board Texture',
    description: 'Read the flop before you tell a story with chips.',
    order: 7,
  },
  {
    id: 'bluffing-basics',
    title: 'Bluffing Basics',
    description: 'Bluff when the card, blocker, and price all line up.',
    order: 8,
  },
  {
    id: 'bankroll-management',
    title: 'Bankroll Management',
    description: 'Keep variance from deciding whether you can keep playing.',
    order: 9,
  },
  {
    id: 'reading-opponents',
    title: 'Reading Opponents',
    description: 'Build a hand range from every bet, pause, and pattern you observe.',
    order: 10,
  },
  {
    id: 'common-mistakes',
    title: 'Common Mistakes',
    description: 'The ten leaks that drain chips from every beginner\'s stack.',
    order: 11,
  },
];
