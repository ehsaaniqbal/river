import { Database } from 'bun:sqlite';
import type { HandHistoryRecord, SessionUser } from '@river/shared';
import { playerHandStatsDelta } from './session-stats';

type UserRow = {
  id: string;
  username: string;
  token: string;
  chip_balance: number;
  hands_played: number;
  hands_won: number;
  total_profit: number;
  vpip_count: number;
  pfr_count: number;
  biggest_pot_won: number;
  created_at: number;
  last_seen_at: number;
};

const DEFAULT_CHIP_BALANCE = 10000;
const HISTORY_SCAN_LIMIT = 500;

function rowToUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    chipBalance: row.chip_balance,
    handsPlayed: row.hands_played,
    handsWon: row.hands_won,
    totalProfit: row.total_profit,
    vpip: row.hands_played > 0 ? (row.vpip_count / row.hands_played) * 100 : 0,
    pfr: row.hands_played > 0 ? (row.pfr_count / row.hands_played) * 100 : 0,
    biggestPotWon: row.biggest_pot_won,
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
        vpip_count integer not null default 0,
        pfr_count integer not null default 0,
        biggest_pot_won integer not null default 0,
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
    this.ensureUserColumns();
  }

  private ensureUserColumns(): void {
    const columns = new Set(
      this.db.query<{ name: string }, []>('pragma table_info(users)').all().map((column) => column.name),
    );
    const migrations: Array<[string, string]> = [
      ['vpip_count', 'alter table users add column vpip_count integer not null default 0'],
      ['pfr_count', 'alter table users add column pfr_count integer not null default 0'],
      ['biggest_pot_won', 'alter table users add column biggest_pot_won integer not null default 0'],
    ];

    for (const [column, statement] of migrations) {
      if (!columns.has(column)) {
        this.db.exec(statement);
      }
    }
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
      insert into users (
        id,
        username,
        token,
        chip_balance,
        hands_played,
        hands_won,
        total_profit,
        vpip_count,
        pfr_count,
        biggest_pot_won,
        created_at,
        last_seen_at
      )
      values (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?)
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
        vpip: 0,
        pfr: 0,
        biggestPotWon: 0,
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

  getById(userId: string): SessionUser | null {
    const row = this.db.query<UserRow, [string]>('select * from users where id = ?').get(userId);

    return row ? rowToUser(row) : null;
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

    for (const player of payload.players) {
      const delta = playerHandStatsDelta(payload, player.id);

      this.db.query(`
        update users
        set
          hands_played = hands_played + 1,
          hands_won = hands_won + ?,
          total_profit = total_profit + ?,
          vpip_count = vpip_count + ?,
          pfr_count = pfr_count + ?,
          biggest_pot_won = max(biggest_pot_won, ?),
          last_seen_at = ?
        where id = ?
      `).run(
        delta.won ? 1 : 0,
        delta.profit,
        delta.vpip ? 1 : 0,
        delta.pfr ? 1 : 0,
        delta.biggestPotWon,
        Date.now(),
        player.id,
      );
    }
  }

  listHandsForUser(userId: string, limit = 25): HandHistoryRecord[] {
    const clampedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const rows = this.db.query<{ payload: string }, [number]>(`
      select payload
      from hands
      order by created_at desc
      limit ?
    `).all(HISTORY_SCAN_LIMIT);
    const hands: HandHistoryRecord[] = [];

    for (const row of rows) {
      const hand = JSON.parse(row.payload) as HandHistoryRecord;

      if (hand.players.some((player) => player.id === userId)) {
        hands.push(hand);
      }

      if (hands.length >= clampedLimit) {
        break;
      }
    }

    return hands;
  }
}
