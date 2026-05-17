import { RANKS, RANK_VALUE, type BotDifficulty, type Card, type Position, type Rank } from '@river/engine';

const descendingRanks = [...RANKS].sort((a, b) => RANK_VALUE[b] - RANK_VALUE[a]);
const broadwayRanks = new Set<Rank>(['T', 'J', 'Q', 'K', 'A']);

function notation(high: Rank, low: Rank, suitedness?: 's' | 'o'): string {
  if (high === low) {
    return high + low;
  }

  return `${high}${low}${suitedness}`;
}

function sortedPair(first: Rank, second: Rank): [Rank, Rank] {
  return RANK_VALUE[first] >= RANK_VALUE[second] ? [first, second] : [second, first];
}

function rangeOf(...hands: string[]): Set<string> {
  return new Set(hands);
}

function allPairsFrom(minimum: Rank): string[] {
  return descendingRanks
    .filter((rank) => RANK_VALUE[rank] >= RANK_VALUE[minimum])
    .map((rank) => notation(rank, rank));
}

function suitedAceFrom(minimumKicker: Rank): string[] {
  return descendingRanks
    .filter((rank) => rank !== 'A' && RANK_VALUE[rank] >= RANK_VALUE[minimumKicker])
    .map((rank) => notation('A', rank, 's'));
}

function offSuitAceFrom(minimumKicker: Rank): string[] {
  return descendingRanks
    .filter((rank) => rank !== 'A' && RANK_VALUE[rank] >= RANK_VALUE[minimumKicker])
    .map((rank) => notation('A', rank, 'o'));
}

function suitedBroadwayFrom(highRank: Rank, minimumLowRank: Rank): string[] {
  return descendingRanks
    .filter((rank) => rank !== highRank && broadwayRanks.has(rank) && RANK_VALUE[rank] >= RANK_VALUE[minimumLowRank])
    .map((rank) => sortedPair(highRank, rank))
    .map(([high, low]) => notation(high, low, 's'));
}

function offSuitBroadwayFrom(highRank: Rank, minimumLowRank: Rank): string[] {
  return descendingRanks
    .filter((rank) => rank !== highRank && broadwayRanks.has(rank) && RANK_VALUE[rank] >= RANK_VALUE[minimumLowRank])
    .map((rank) => sortedPair(highRank, rank))
    .map(([high, low]) => notation(high, low, 'o'));
}

function suitedConnectorsFrom(lowMinimum: Rank): string[] {
  const connectors: string[] = [];

  for (let lowValue = RANK_VALUE[lowMinimum]; lowValue <= RANK_VALUE['K']; lowValue += 1) {
    const low = descendingRanks.find((rank) => RANK_VALUE[rank] === lowValue);
    const high = descendingRanks.find((rank) => RANK_VALUE[rank] === lowValue + 1);

    if (!low || !high) {
      continue;
    }

    connectors.push(notation(high, low, 's'));
  }

  return connectors;
}

function combine(...groups: string[][]): Set<string> {
  return new Set(groups.flat());
}

function sameRangeForEveryPosition(range: Set<string>): Record<Position, Set<string>> {
  return {
    BTN: new Set(range),
    SB: new Set(range),
    BB: new Set(range),
    UTG: new Set(range),
    'UTG+1': new Set(range),
    MP: new Set(range),
    LJ: new Set(range),
    HJ: new Set(range),
    CO: new Set(range),
  };
}

export function toHandNotation(cards: [Card, Card]): string {
  const [first, second] = cards;
  const [high, low] = sortedPair(first.rank, second.rank);

  if (high === low) {
    return notation(high, low);
  }

  return notation(high, low, first.suit === second.suit ? 's' : 'o');
}

export function isInRange(cards: [Card, Card], range: Set<string>): boolean {
  return range.has(toHandNotation(cards));
}

const allPairs = allPairsFrom('2');
const allSuitedAces = suitedAceFrom('2');
const allOffSuitAces = offSuitAceFrom('2');
const allBroadway = [...broadwayRanks].flatMap((firstRank) => {
  return [...broadwayRanks]
    .filter((secondRank) => RANK_VALUE[firstRank] > RANK_VALUE[secondRank])
    .flatMap((secondRank) => [notation(firstRank, secondRank, 's'), notation(firstRank, secondRank, 'o')]);
});

const beginnerRange = combine(
  allPairs,
  allSuitedAces,
  allOffSuitAces,
  suitedConnectorsFrom('4'),
  allBroadway,
  ['KJo', 'KQo', 'QJo', 'KTo', 'QTo', 'JTo', 'K9s', 'Q9s', 'J9s', 'T8s', '97s', '86s', '75s', '64s', '53s'],
);

const intermediateUTG = combine(
  allPairsFrom('8'),
  suitedAceFrom('T'),
  offSuitAceFrom('Q'),
  ['KQs'],
);

const intermediateHJ = combine(
  allPairsFrom('7'),
  suitedAceFrom('9'),
  offSuitAceFrom('J'),
  ['KQs', 'KJs', 'QJs'],
);

const intermediateCO = combine(
  allPairsFrom('6'),
  suitedAceFrom('7'),
  offSuitAceFrom('T'),
  suitedBroadwayFrom('K', 'J'),
  ['KQo', 'QJs', 'JTs'],
);

const intermediateBTN = combine(
  allPairsFrom('4'),
  suitedAceFrom('4'),
  offSuitAceFrom('8'),
  suitedBroadwayFrom('K', 'T'),
  offSuitBroadwayFrom('K', 'J'),
  suitedBroadwayFrom('Q', 'T'),
  ['JTs', 'T9s'],
);

const intermediateBB = combine(
  allPairsFrom('5'),
  suitedAceFrom('2'),
  offSuitAceFrom('7'),
  ['K9s', 'KTs', 'KJs', 'KQs', 'QTs', 'QJs', 'JTo', 'JTs', 'T9o', 'T9s'],
);

export const ADVANCED_MIXED_HANDS: Record<Extract<Position, 'BTN' | 'CO' | 'SB'>, Set<string>> = {
  BTN: rangeOf('33', '22', 'A3s', 'A2s', 'K9s', 'Q9s', 'J9s', 'T8s', '98s', '87s', '76s', '65s', 'A7o', 'KTo', 'QJo'),
  CO: rangeOf('55', 'A6s', 'A5s', 'KTs', 'QTs', 'J9s', 'T9s', '98s', 'A9o', 'KJo'),
  SB: rangeOf('55', 'A6s', 'A5s', 'KTs', 'QTs', 'J9s', 'T9s', '98s', 'A9o', 'KJo', 'QJo'),
};

const advancedCO = new Set([...intermediateCO, ...ADVANCED_MIXED_HANDS.CO]);
const advancedBTN = new Set([...intermediateBTN, ...ADVANCED_MIXED_HANDS.BTN]);
const advancedSB = new Set([...intermediateCO, ...ADVANCED_MIXED_HANDS.SB]);

export const RANGES: Record<BotDifficulty, Record<Position, Set<string>>> = {
  BEGINNER: sameRangeForEveryPosition(beginnerRange),
  INTERMEDIATE: {
    UTG: intermediateUTG,
    'UTG+1': new Set(intermediateUTG),
    MP: new Set(intermediateHJ),
    LJ: new Set(intermediateHJ),
    HJ: intermediateHJ,
    CO: intermediateCO,
    BTN: intermediateBTN,
    SB: new Set(intermediateCO),
    BB: intermediateBB,
  },
  ADVANCED: {
    UTG: new Set(intermediateUTG),
    'UTG+1': new Set(intermediateUTG),
    MP: new Set(intermediateHJ),
    LJ: new Set(intermediateHJ),
    HJ: new Set(intermediateHJ),
    CO: advancedCO,
    BTN: advancedBTN,
    SB: advancedSB,
    BB: new Set(intermediateBB),
  },
};
