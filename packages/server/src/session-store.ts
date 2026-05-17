import { Database } from 'bun:sqlite';
import type { HandHistoryRecord, SessionUser } from '@river/shared';

type UserRow = {
  id: string;
  username: string;
  token: string;
  chip_balance: number;
  hands_played: number;
  hands_won: number;
  total_profit: number;
  created_at: number;
  last_seen_at: number;
};

const DEFAULT_CHIP_BALANCE = 10000;

function rowToUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    chipBalance: row.chip_balance,
    handsPlayed: row.hands_played,
    handsWon: row.hands_won,
    totalProfit: row.total_profit,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

function token(): string {
  return crypto.randomUUID().replaceAll('-', '');
}

export class SessionStore {
  private readonly db: Database;

  constructor(path = process.env.RIVER_SQLITE_PATH ?? 'river.sqlite') {
    this.db = new Database(path);
    this.db.exec(`
      create table if not exists users (
        id text primary key,
        username text not null unique,
        token text not null unique,
        chip_balance integer not null,
        hands_played integer not null default 0,
        hands_won integer not null default 0,
        total_profit integer not null default 0,
        created_at integer not null,
        last_seen_at integer not null
      );

      create table if not exists hands (
        id text primary key,
        table_id text not null,
        hand_number integer not null,
        payload text not null,
        created_at integer not null
      );
    `);
  }

  authenticate(username: string, existingToken?: string): { user: SessionUser; token: string } {
    const normalized = username.trim().slice(0, 24);

    if (!/^[a-zA-Z0-9_ -]{2,24}$/.test(normalized)) {
      throw new Error('Username must be 2-24 letters, numbers, spaces, hyphens, or underscores.');
    }

    if (existingToken) {
      const row = this.db.query<UserRow, [string]>('select * from users where token = ?').get(existingToken);

      if (row) {
        const now = Date.now();
        this.db.query('update users set last_seen_at = ? where id = ?').run(now, row.id);
        return { user: { ...rowToUser(row), lastSeenAt: now }, token: existingToken };
      }
    }

    const taken = this.db.query<UserRow, [string]>('select * from users where lower(username) = lower(?)').get(normalized);

    if (taken) {
      throw new Error('That username is already seated. Pick another.');
    }

    const now = Date.now();
    const userId = crypto.randomUUID();
    const newToken = token();
    this.db.query(`
      insert into users (id, username, token, chip_balance, hands_played, hands_won, total_profit, created_at, last_seen_at)
      values (?, ?, ?, ?, 0, 0, 0, ?, ?)
    `).run(userId, normalized, newToken, DEFAULT_CHIP_BALANCE, now, now);

    return {
      token: newToken,
      user: {
        id: userId,
        username: normalized,
        chipBalance: DEFAULT_CHIP_BALANCE,
        handsPlayed: 0,
        handsWon: 0,
        totalProfit: 0,
        createdAt: now,
        lastSeenAt: now,
      },
    };
  }

  getByToken(existingToken: string): SessionUser | null {
    const row = this.db.query<UserRow, [string]>('select * from users where token = ?').get(existingToken);

    if (!row) {
      return null;
    }

    const now = Date.now();
    this.db.query('update users set last_seen_at = ? where id = ?').run(now, row.id);

    return { ...rowToUser(row), lastSeenAt: now };
  }

  updateChipBalance(userId: string, delta: number): SessionUser {
    this.db.query('update users set chip_balance = max(chip_balance + ?, 0), last_seen_at = ? where id = ?')
      .run(delta, Date.now(), userId);
    const row = this.db.query<UserRow, [string]>('select * from users where id = ?').get(userId);

    if (!row) {
      throw new Error('User not found');
    }

    return rowToUser(row);
  }

  recordHand(payload: HandHistoryRecord, tableId: string, handNumber: number): void {
    this.db.query('insert into hands (id, table_id, hand_number, payload, created_at) values (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), tableId, handNumber, JSON.stringify(payload), Date.now());

    const winners = new Set(payload.winners.map((winner) => winner.playerId));

    for (const player of payload.players) {
      this.db.query(`
        update users
        set
          hands_played = hands_played + 1,
          hands_won = hands_won + ?,
          total_profit = total_profit + ?,
          last_seen_at = ?
        where id = ?
      `).run(
        winners.has(player.id) ? 1 : 0,
        player.stackAfter - player.stackBefore,
        Date.now(),
        player.id,
      );
    }
  }
}
