import type { ServerWebSocket } from 'bun';
import {
  clampBuyIn,
  sanitizeTableConfig,
  type AuthRequest,
  type ClientToServerMessage,
  type CreateTableRequest,
  type JoinTableRequest,
  type LobbySnapshot,
  type ServerToClientMessage,
  type SessionUser,
} from '@river/shared';
import { generateBotShowdownTalk, generateBotTableTalk } from './bot-personality';
import { PokerTable } from './poker-table';
import { SessionStore } from './session-store';

type SocketData = {
  userId: string | null;
};

type PlayerSession = {
  user: SessionUser;
  token: string;
  socket: ServerWebSocket<SocketData>;
  tableId: string | null;
};

const port = Number(process.env.PORT ?? process.env.RIVER_SERVER_PORT ?? 8787);
const sessions = new Map<string, PlayerSession>();
const tables = new Map<string, PokerTable>();
const store = new SessionStore();

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.RIVER_WEB_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,authorization,x-river-token',
};

function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init.headers,
    },
  });
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');

  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim();
  }

  return request.headers.get('x-river-token');
}

function requireUser(request: Request): SessionUser {
  const token = bearerToken(request);
  const user = token ? store.getByToken(token) : null;

  if (!user) {
    throw new HttpError(401, 'Authentication required.');
  }

  return user;
}

function lobbySnapshot(): LobbySnapshot {
  return {
    tables: [...tables.values()]
      .filter((table) => !table.summary().isPrivate)
      .map((table) => table.summary()),
    presence: [...sessions.values()].map((session) => {
      const table = session.tableId ? tables.get(session.tableId) : null;

      return {
        id: session.user.id,
        username: session.user.username,
        online: true,
        tableId: session.tableId,
        tableCode: table?.code ?? null,
        lastSeenAt: Date.now(),
      };
    }),
  };
}

function send(socket: ServerWebSocket<SocketData>, message: ServerToClientMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function sendError(socket: ServerWebSocket<SocketData>, message: string): void {
  send(socket, { type: 'ERROR', message });
}

function sessionFor(socket: ServerWebSocket<SocketData>): PlayerSession | null {
  return socket.data.userId ? sessions.get(socket.data.userId) ?? null : null;
}

function broadcastLobby(): void {
  const snapshot = lobbySnapshot();

  for (const session of sessions.values()) {
    send(session.socket, { type: 'LOBBY_STATE', ...snapshot });
  }
}

function broadcastTable(table: PokerTable): void {
  for (const playerId of table.playerIds) {
    const session = sessions.get(playerId);

    if (!session) {
      continue;
    }

    send(session.socket, {
      type: 'TABLE_STATE',
      table: table.summary(),
      state: table.publicState(playerId),
      messages: table.tableMessages(),
      heroPlayerId: playerId,
    });
  }
}

function findTable(input: { tableId?: string; code?: string }): PokerTable {
  const table = input.tableId
    ? tables.get(input.tableId)
    : [...tables.values()].find((candidate) => candidate.code.toLowerCase() === input.code?.toLowerCase());

  if (!table) {
    throw new Error('Table not found.');
  }

  return table;
}

function createTable(user: SessionUser, request: CreateTableRequest): { table: PokerTable; user: SessionUser } {
  const config = sanitizeTableConfig(request.config);
  const buyIn = clampBuyIn(config, request.buyIn);

  if (user.chipBalance < buyIn) {
    throw new Error('Not enough chips for that buy-in.');
  }

  const updatedUser = store.updateChipBalance(user.id, -buyIn);
  const table = new PokerTable(config, user, buyIn);
  tables.set(table.id, table);
  return { table, user: updatedUser };
}

function joinTable(user: SessionUser, request: JoinTableRequest): { table: PokerTable; user: SessionUser } {
  const table = findTable(request);
  const config = table.summary();
  const buyIn = clampInteger(request.buyIn, config.minBuyIn, config.maxBuyIn, config.minBuyIn);

  if (user.chipBalance < buyIn) {
    throw new Error('Not enough chips for that buy-in.');
  }

  const updatedUser = store.updateChipBalance(user.id, -buyIn);
  table.addHuman(user, buyIn);
  return { table, user: updatedUser };
}

function attachSession(socket: ServerWebSocket<SocketData>, auth: AuthRequest): void {
  const result = store.authenticate(auth.username, auth.token);
  const prior = sessions.get(result.user.id);

  if (prior && prior.socket !== socket) {
    prior.socket.close(4000, 'Signed in from another connection.');
  }

  socket.data.userId = result.user.id;
  sessions.set(result.user.id, {
    user: result.user,
    token: result.token,
    socket,
    tableId: prior?.tableId ?? null,
  });

  send(socket, { type: 'AUTH_OK', user: result.user, token: result.token });
  send(socket, { type: 'LOBBY_STATE', ...lobbySnapshot() });

  if (prior?.tableId) {
    const table = tables.get(prior.tableId);
    table?.reconnect(result.user.id);
    if (table) {
      broadcastTable(table);
    }
  }

  broadcastLobby();
}

function handleCreateTable(session: PlayerSession, request: CreateTableRequest): void {
  leaveCurrentTable(session);
  const { table, user } = createTable(session.user, request);
  session.user = user;
  session.tableId = table.id;
  broadcastLobby();
  broadcastTable(table);
}

function handleJoinTable(session: PlayerSession, request: JoinTableRequest): void {
  leaveCurrentTable(session);
  const { table, user } = joinTable(session.user, request);
  session.user = user;
  session.tableId = table.id;
  broadcastLobby();
  broadcastTable(table);
}

function leaveCurrentTable(session: PlayerSession): void {
  if (!session.tableId) {
    return;
  }

  const table = tables.get(session.tableId);

  if (!table) {
    session.tableId = null;
    return;
  }

  const cashout = table.removeHuman(session.user.id);

  if (cashout > 0) {
    session.user = store.updateChipBalance(session.user.id, cashout);
  }

  if (table.isEmpty) {
    tables.delete(table.id);
  } else {
    broadcastTable(table);
  }

  session.tableId = null;
  broadcastLobby();
}

function startTable(session: PlayerSession): void {
  const table = session.tableId ? tables.get(session.tableId) : null;

  if (!table) {
    throw new Error('You are not seated at a table.');
  }

  if (table.hostId !== session.user.id) {
    throw new Error('Only the host can start the table.');
  }

  table.start();
  broadcastLobby();
  broadcastTable(table);
  scheduleBotTurn(table);
}

function handleAction(session: PlayerSession, message: Extract<ClientToServerMessage, { type: 'ACTION' }>): void {
  const table = session.tableId ? tables.get(session.tableId) : null;

  if (!table) {
    throw new Error('You are not seated at a table.');
  }

  const result = table.act(session.user.id, message.action, message.amount ?? 0);

  if (result.completedHand) {
    store.recordHand(result.completedHand, table.id, result.completedHand.handNumber);
  }

  broadcastTable(table);
  scheduleBotTurn(table);
}

function scheduleBotTurn(table: PokerTable): void {
  table.scheduleBotTurn(() => {
    const result = table.runBotTurn();

    if (result.completedHand) {
      store.recordHand(result.completedHand, table.id, result.completedHand.handNumber);
    }

    if (result.action && result.difficulty) {
      void generateBotTableTalk({
        difficulty: result.difficulty,
        action: result.action.type,
        amount: result.action.amount,
        street: result.action.street,
        pot: result.pot,
      }).then((text) => {
        if (text) {
          table.appendBotTalk(result.action?.playerId ?? '', text);
          broadcastTable(table);
        }
      });
    }

    if (result.completedHand && result.action && result.difficulty) {
      const botWinner = result.completedHand.winners.find((winner) => winner.playerId === result.action?.playerId);
      const amount = result.completedHand.winners
        .filter((winner) => winner.playerId === result.action?.playerId)
        .reduce((sum, winner) => sum + winner.amount, 0);

      void generateBotShowdownTalk({
        difficulty: result.difficulty,
        won: Boolean(botWinner),
        amount,
        handRank: botWinner?.handResult?.rank ?? null,
      }).then((text) => {
        if (text) {
          table.appendBotTalk(result.action?.playerId ?? '', text);
          broadcastTable(table);
        }
      });
    }

    broadcastTable(table);
    scheduleBotTurn(table);
  });
}

function handleSocketMessage(socket: ServerWebSocket<SocketData>, raw: string | Buffer): void {
  let message: ClientToServerMessage;

  try {
    message = JSON.parse(String(raw)) as ClientToServerMessage;
  } catch {
    sendError(socket, 'Invalid message.');
    return;
  }

  try {
    if (message.type === 'AUTH') {
      attachSession(socket, message);
      return;
    }

    const session = sessionFor(socket);

    if (!session) {
      throw new Error('Authenticate before sending table messages.');
    }

    switch (message.type) {
      case 'CREATE_TABLE':
        handleCreateTable(session, message);
        break;
      case 'JOIN_TABLE':
        handleJoinTable(session, message);
        break;
      case 'LEAVE_TABLE':
        leaveCurrentTable(session);
        break;
      case 'START_TABLE':
        startTable(session);
        break;
      case 'ACTION':
        handleAction(session, message);
        break;
      case 'CHAT': {
        const table = session.tableId ? tables.get(session.tableId) : null;
        table?.addChat(session.user.id, message.text);
        if (table) {
          broadcastTable(table);
        }
        break;
      }
      case 'SET_BOT_FILL': {
        const table = session.tableId ? tables.get(session.tableId) : null;
        table?.setBotFill(message.enabled);
        if (table) {
          broadcastTable(table);
        }
        break;
      }
    }
  } catch (error) {
    sendError(socket, error instanceof Error ? error.message : 'Server error.');
  }
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function route(request: Request, server: Bun.Server<SocketData>): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (url.pathname === '/ws') {
    const upgraded = server.upgrade(request, { data: { userId: null } });
    return upgraded ? new Response(null) : new Response('Upgrade failed', { status: 400 });
  }

  try {
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true });
    }

    if (request.method === 'POST' && url.pathname === '/auth') {
      const body = await readJson<AuthRequest>(request);
      return json(store.authenticate(body.username, body.token));
    }

    if (request.method === 'GET' && url.pathname === '/lobby') {
      return json(lobbySnapshot());
    }

    if (request.method === 'POST' && url.pathname === '/tables') {
      const user = requireUser(request);
      const body = await readJson<CreateTableRequest>(request);
      const { table } = createTable(user, body);
      broadcastLobby();
      return json({ table: table.summary() }, { status: 201 });
    }

    const joinMatch = url.pathname.match(/^\/tables\/([^/]+)\/join$/);

    if (request.method === 'POST' && joinMatch?.[1]) {
      const user = requireUser(request);
      const body = await readJson<Omit<JoinTableRequest, 'tableId'>>(request);
      const { table } = joinTable(user, { ...body, tableId: joinMatch[1] });
      broadcastLobby();
      return json({ table: table.summary() });
    }

    return json({ error: 'Not found.' }, { status: 404 });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'Server error.';
    return json({ error: message }, { status });
  }
}

Bun.serve<SocketData>({
  port,
  fetch: route,
  websocket: {
    open(socket) {
      socket.data.userId = null;
    },
    message(socket, message) {
      handleSocketMessage(socket, message);
    },
    close(socket) {
      const session = sessionFor(socket);

      if (!session) {
        return;
      }

      const table = session.tableId ? tables.get(session.tableId) : null;
      table?.disconnect(session.user.id, () => {
        if (table) {
          broadcastTable(table);
          scheduleBotTurn(table);
        }
      });
      sessions.delete(session.user.id);
      broadcastLobby();
      if (table) {
        broadcastTable(table);
      }
    },
  },
});

console.log(`River server listening on ${port}`);

function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}
