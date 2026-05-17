import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TABLE_CONFIG, type SessionUser } from '@river/shared';
import { PokerTable } from './poker-table';

function user(id: string): SessionUser {
  return {
    id,
    username: id,
    chipBalance: 10000,
    handsPlayed: 0,
    handsWon: 0,
    totalProfit: 0,
    createdAt: 1,
    lastSeenAt: 1,
  };
}

function table(host = user('host')): PokerTable {
  return new PokerTable({
    ...DEFAULT_TABLE_CONFIG,
    fillWithBots: false,
    maxPlayers: 9,
  }, host, 1000);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('PokerTable', () => {
  it('starts a two-human hand and hides opponent hole cards', () => {
    const host = user('host');
    const guest = user('guest');
    const game = table(host);

    game.addHuman(guest, 1000);
    game.start();

    const hostView = game.publicState(host.id);
    const guestView = game.publicState(guest.id);

    expect(hostView?.players).toHaveLength(2);
    expect(hostView?.players.find((player) => player.id === host.id)?.holeCards).not.toBeNull();
    expect(hostView?.players.find((player) => player.id === guest.id)?.holeCards).toBeNull();
    expect(guestView?.players.find((player) => player.id === guest.id)?.holeCards).not.toBeNull();
    expect(guestView?.players.find((player) => player.id === host.id)?.holeCards).toBeNull();
  });

  it('rejects new seats while a hand is in progress but allows them after completion', () => {
    const host = user('host');
    const guest = user('guest');
    const late = user('late');
    const game = table(host);

    game.addHuman(guest, 1000);
    game.start();
    expect(() => game.addHuman(late, 1000)).toThrow('already in a hand');

    const currentPlayer = game.publicState(host.id)?.players[game.publicState(host.id)?.currentPlayerIndex ?? 0];

    if (!currentPlayer) {
      throw new Error('Missing current player');
    }

    game.act(currentPlayer.id, 'FOLD');

    expect(game.publicState(host.id)?.phase).toBe('HAND_COMPLETE');
    expect(() => game.addHuman(late, 1000)).not.toThrow();
    expect(game.summary().humanPlayers).toBe(3);
  });

  it('marks disconnected seats and folds the current player when the timer expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const host = user('host');
    const guest = user('guest');
    const game = table(host);
    const timeout = vi.fn();

    game.addHuman(guest, 1000);
    game.start();
    const currentPlayer = game.publicState(host.id)?.players[game.publicState(host.id)?.currentPlayerIndex ?? 0];

    if (!currentPlayer) {
      throw new Error('Missing current player');
    }

    game.disconnect(currentPlayer.id, timeout);
    const disconnectedView = game.publicState(host.id);
    const disconnectedPlayer = disconnectedView?.players.find((player) => player.id === currentPlayer.id);

    expect(disconnectedPlayer?.connected).toBe(false);
    expect(disconnectedPlayer?.disconnectDeadline).toBe(31_000);

    vi.advanceTimersByTime(30_000);

    expect(timeout).toHaveBeenCalledOnce();
    expect(game.publicState(host.id)?.phase).toBe('HAND_COMPLETE');
  });
});
