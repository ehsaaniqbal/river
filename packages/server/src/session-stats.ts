import type { HandHistoryRecord } from '@river/shared';

export type PlayerHandStatsDelta = {
  won: boolean;
  profit: number;
  vpip: boolean;
  pfr: boolean;
  biggestPotWon: number;
};

export function playerHandStatsDelta(payload: HandHistoryRecord, playerId: string): PlayerHandStatsDelta {
  const player = payload.players.find((candidate) => candidate.id === playerId);
  const preflopActions = payload.streets.find((street) => street.street === 'PREFLOP')?.actions ?? [];
  const playerPreflopActions = preflopActions.filter((action) => action.playerId === playerId);
  const won = payload.winners.some((winner) => winner.playerId === playerId);
  const biggestPotWon = payload.winners
    .filter((winner) => winner.playerId === playerId)
    .reduce((sum, winner) => sum + winner.amount, 0);

  return {
    won,
    profit: player ? player.stackAfter - player.stackBefore : 0,
    vpip: playerPreflopActions.some((action) => (
      action.type === 'CALL' || action.type === 'BET' || action.type === 'RAISE' || action.type === 'ALL_IN'
    )),
    pfr: playerPreflopActions.some((action) => (
      action.type === 'BET' || action.type === 'RAISE' || action.type === 'ALL_IN'
    )),
    biggestPotWon,
  };
}
