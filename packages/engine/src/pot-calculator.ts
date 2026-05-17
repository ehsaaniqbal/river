import type { Player, Pot } from './types';

function positiveInvestments(players: Player[]): number[] {
  return players
    .map((player) => player.totalInvested)
    .filter((investment) => investment > 0);
}

export function calculatePots(players: Player[]): Pot[] {
  const allInLevels = [...new Set(
    players
      .filter((player) => player.isAllIn && player.totalInvested > 0)
      .map((player) => player.totalInvested),
  )].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let previousLevel = 0;

  for (const level of allInLevels) {
    const contributors = players.filter((player) => player.totalInvested >= level);
    const amount = (level - previousLevel) * contributors.length;

    if (amount > 0) {
      const eligiblePlayerIds = contributors
        .filter((player) => !player.isFolded)
        .map((player) => player.id);

      if (eligiblePlayerIds.length > 1 || allInLevels.length === 1) {
        pots.push({ amount, eligiblePlayerIds });
      }
    }

    previousLevel = level;
  }

  const remainingAmount = players.reduce((sum, player) => {
    return sum + Math.max(player.totalInvested - previousLevel, 0);
  }, 0);

  if (remainingAmount > 0) {
    const eligiblePlayerIds = players
      .filter((player) => player.totalInvested > previousLevel && !player.isFolded)
      .map((player) => player.id);

    if (eligiblePlayerIds.length > 0) {
      pots.push({ amount: remainingAmount, eligiblePlayerIds });
    }
  }

  if (pots.length === 0) {
    const amount = positiveInvestments(players).reduce((sum, investment) => sum + investment, 0);

    if (amount > 0) {
      pots.push({
        amount,
        eligiblePlayerIds: players
          .filter((player) => player.totalInvested > 0 && !player.isFolded)
          .map((player) => player.id),
      });
    }
  }

  return pots;
}
