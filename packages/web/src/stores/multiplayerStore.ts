'use client';

import { create } from 'zustand';
import {
  DEFAULT_TABLE_CONFIG,
  type ChatMessage,
  type ClientToServerMessage,
  type LobbyTableSummary,
  type PresencePlayer,
  type PublicGameState,
  type ServerToClientMessage,
  type SessionUser,
  type TableConfig,
} from '@river/shared';
import type { ActionType } from '@river/engine';

type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

type MultiplayerStore = {
  status: ConnectionStatus;
  user: SessionUser | null;
  token: string | null;
  tables: LobbyTableSummary[];
  presence: PresencePlayer[];
  currentTable: LobbyTableSummary | null;
  tableState: PublicGameState | null;
  messages: ChatMessage[];
  heroPlayerId: string | null;
  error: string | null;
  connect: (username: string) => void;
  disconnect: () => void;
  createTable: (config: TableConfig, buyIn: number) => void;
  joinTable: (table: LobbyTableSummary, buyIn?: number) => void;
  leaveTable: () => void;
  startTable: () => void;
  sendAction: (action: ActionType, amount?: number) => Promise<void>;
  sendChat: (text: string) => void;
  setBotFill: (enabled: boolean) => void;
};

let socket: WebSocket | null = null;

function serverHttpUrl(): string {
  return process.env.NEXT_PUBLIC_RIVER_SERVER_URL ?? 'http://localhost:8787';
}

function serverWsUrl(): string {
  const url = new URL(serverHttpUrl());
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  return url.toString();
}

function storedIdentity(): { username: string; token?: string } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const username = window.localStorage.getItem('river:username');
  const token = window.localStorage.getItem('river:token');

  if (!username) {
    return null;
  }

  return token ? { username, token } : { username };
}

function saveIdentity(username: string, token: string): void {
  window.localStorage.setItem('river:username', username);
  window.localStorage.setItem('river:token', token);
}

function send(message: ClientToServerMessage): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to River server.');
  }

  socket.send(JSON.stringify(message));
}

export const useMultiplayerStore = create<MultiplayerStore>((set) => ({
  status: 'IDLE',
  user: null,
  token: null,
  tables: [],
  presence: [],
  currentTable: null,
  tableState: null,
  messages: [],
  heroPlayerId: null,
  error: null,
  connect: (username) => {
    const trimmed = username.trim();

    if (!trimmed) {
      set({ error: 'Pick a username first.' });
      return;
    }

    socket?.close();
    set({ status: 'CONNECTING', error: null });
    socket = new WebSocket(serverWsUrl());

    socket.addEventListener('open', () => {
      const identity = storedIdentity();
      const token = identity?.username === trimmed ? identity.token : undefined;
      const authMessage: ClientToServerMessage = token
        ? { type: 'AUTH', username: trimmed, token }
        : { type: 'AUTH', username: trimmed };
      send(authMessage);
    });

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as ServerToClientMessage;

      switch (message.type) {
        case 'AUTH_OK':
          saveIdentity(message.user.username, message.token);
          set({ status: 'CONNECTED', user: message.user, token: message.token, error: null });
          break;
        case 'AUTH_ERROR':
          set({ status: 'DISCONNECTED', error: message.message });
          break;
        case 'LOBBY_STATE':
          set({ tables: message.tables, presence: message.presence });
          break;
        case 'TABLE_STATE':
          set({
            currentTable: message.table,
            tableState: message.state,
            messages: message.messages,
            heroPlayerId: message.heroPlayerId,
          });
          break;
        case 'TABLE_CLOSED':
          set({ currentTable: null, tableState: null, messages: [], error: message.reason });
          break;
        case 'ERROR':
          set({ error: message.message });
          break;
      }
    });

    socket.addEventListener('close', () => {
      set({ status: 'DISCONNECTED' });
    });

    socket.addEventListener('error', () => {
      set({ status: 'DISCONNECTED', error: 'Could not reach the River server.' });
    });
  },
  disconnect: () => {
    socket?.close();
    socket = null;
    set({ status: 'DISCONNECTED', currentTable: null, tableState: null, messages: [] });
  },
  createTable: (config, buyIn) => {
    send({ type: 'CREATE_TABLE', config, buyIn });
  },
  joinTable: (table, buyIn) => {
    send({ type: 'JOIN_TABLE', tableId: table.id, buyIn: buyIn ?? table.minBuyIn });
  },
  leaveTable: () => {
    send({ type: 'LEAVE_TABLE' });
    set({ currentTable: null, tableState: null, messages: [] });
  },
  startTable: () => {
    send({ type: 'START_TABLE' });
  },
  sendAction: async (action, amount) => {
    const message: ClientToServerMessage = amount === undefined
      ? { type: 'ACTION', action }
      : { type: 'ACTION', action, amount };
    send(message);
  },
  sendChat: (text) => {
    send({ type: 'CHAT', text });
  },
  setBotFill: (enabled) => {
    send({ type: 'SET_BOT_FILL', enabled });
  },
}));

export function reconnectWithStoredIdentity(): void {
  const identity = storedIdentity();

  if (identity && useMultiplayerStore.getState().status === 'IDLE') {
    useMultiplayerStore.getState().connect(identity.username);
  }
}

export const defaultCreateTableConfig = DEFAULT_TABLE_CONFIG;
