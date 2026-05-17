'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LogOut, MessageSquare, Play, Plus, Send, Users } from 'lucide-react';
import type { BotDifficulty, GameState, Player } from '@river/engine';
import { getLegalActions } from '@river/engine';
import { AppHeader } from '@/components/AppHeader';
import { ActionButtons } from '@/components/game/ActionButtons';
import { CommunityCards } from '@/components/game/CommunityCards';
import { HandStrengthMeter } from '@/components/game/HandStrengthMeter';
import { PlayerSeat } from '@/components/game/PlayerSeat';
import { PotDisplay } from '@/components/game/PotDisplay';
import { WinnerOverlay } from '@/components/game/WinnerOverlay';
import { Button } from '@/components/ui/button';
import {
  defaultCreateTableConfig,
  reconnectWithStoredIdentity,
  useMultiplayerStore,
} from '@/stores/multiplayerStore';

type TableFormState = {
  name: string;
  smallBlind: string;
  bigBlind: string;
  minBuyIn: string;
  maxBuyIn: string;
  seatBuyIn: string;
  maxPlayers: string;
  isPrivate: boolean;
  fillWithBots: boolean;
  botDifficulty: BotDifficulty;
};

const botDifficulties: BotDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

function defaultTableForm(): TableFormState {
  return {
    name: defaultCreateTableConfig.name,
    smallBlind: String(defaultCreateTableConfig.smallBlind),
    bigBlind: String(defaultCreateTableConfig.bigBlind),
    minBuyIn: String(defaultCreateTableConfig.minBuyIn),
    maxBuyIn: String(defaultCreateTableConfig.maxBuyIn),
    seatBuyIn: String(defaultCreateTableConfig.minBuyIn),
    maxPlayers: String(defaultCreateTableConfig.maxPlayers),
    isPrivate: defaultCreateTableConfig.isPrivate,
    fillWithBots: defaultCreateTableConfig.fillWithBots,
    botDifficulty: defaultCreateTableConfig.botDifficulty,
  };
}

export default function LobbyPage() {
  const status = useMultiplayerStore((state) => state.status);
  const user = useMultiplayerStore((state) => state.user);
  const tables = useMultiplayerStore((state) => state.tables);
  const presence = useMultiplayerStore((state) => state.presence);
  const currentTable = useMultiplayerStore((state) => state.currentTable);
  const tableState = useMultiplayerStore((state) => state.tableState);
  const messages = useMultiplayerStore((state) => state.messages);
  const heroPlayerId = useMultiplayerStore((state) => state.heroPlayerId);
  const error = useMultiplayerStore((state) => state.error);
  const connect = useMultiplayerStore((state) => state.connect);
  const joinTable = useMultiplayerStore((state) => state.joinTable);
  const joinTableByCode = useMultiplayerStore((state) => state.joinTableByCode);
  const createTable = useMultiplayerStore((state) => state.createTable);
  const leaveTable = useMultiplayerStore((state) => state.leaveTable);
  const startTable = useMultiplayerStore((state) => state.startTable);
  const setBotFill = useMultiplayerStore((state) => state.setBotFill);
  const [username, setUsername] = useState('');
  const [tableForm, setTableForm] = useState(defaultTableForm);
  const [joinCode, setJoinCode] = useState('');
  const [joinBuyIn, setJoinBuyIn] = useState(String(defaultCreateTableConfig.minBuyIn));

  useEffect(() => {
    reconnectWithStoredIdentity();
  }, []);

  const submitUsername = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    connect(username);
  };

  const submitTable = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTable({
      ...defaultCreateTableConfig,
      name: tableForm.name,
      smallBlind: Number(tableForm.smallBlind),
      bigBlind: Number(tableForm.bigBlind),
      minBuyIn: Number(tableForm.minBuyIn),
      maxBuyIn: Number(tableForm.maxBuyIn),
      maxPlayers: Number(tableForm.maxPlayers),
      isPrivate: tableForm.isPrivate,
      fillWithBots: tableForm.fillWithBots,
      botDifficulty: tableForm.botDifficulty,
    }, Number(tableForm.seatBuyIn));
  };

  const submitJoinCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    joinTableByCode(joinCode, Number(joinBuyIn));
  };

  const setTableField = <K extends keyof TableFormState>(key: K, value: TableFormState[K]) => {
    setTableForm((form) => ({ ...form, [key]: value }));
  };

  return (
    <main className="min-h-screen bg-[#06110d] text-[var(--text-primary)]">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-28">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-emerald-100/10 pb-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">Lobby</div>
            <h1 className="mt-2 font-serif text-5xl">Take a Seat</h1>
          </div>
          <div className="rounded-md border border-emerald-100/10 bg-white/[0.045] px-3 py-2 font-mono text-xs text-[var(--text-muted)]">
            {status}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-md border border-red-400/30 bg-red-950/35 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {!user ? (
          <form onSubmit={submitUsername} className="max-w-md rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
            <label className="grid gap-2 text-sm text-[var(--text-muted)]">
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-10 rounded-md border border-white/12 bg-[#081510] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                maxLength={24}
                autoComplete="nickname"
              />
            </label>
            <Button type="submit" className="mt-4" disabled={status === 'CONNECTING'}>
              <Users className="size-4" />
              Enter
            </Button>
          </form>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <aside className="grid content-start gap-4">
              <section className="rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Signed in</div>
                    <div className="mt-1 font-serif text-2xl">{user.username}</div>
                  </div>
                  <Button type="button" variant="secondary" size="icon" aria-label="Leave table" onClick={leaveTable}>
                    <LogOut className="size-4" />
                  </Button>
                </div>
              </section>

              <form onSubmit={submitTable} className="rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
                <div className="mb-3 flex items-center gap-2 font-serif text-2xl">
                  <Plus className="size-4 text-[var(--accent)]" />
                  New Table
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm text-[var(--text-muted)]">
                    Name
                    <input
                      value={tableForm.name}
                      onChange={(event) => setTableField('name', event.target.value)}
                      className="h-9 rounded-md border border-white/12 bg-[#081510] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <NumberField label="Small blind" value={tableForm.smallBlind} onChange={(value) => setTableField('smallBlind', value)} />
                    <NumberField label="Big blind" value={tableForm.bigBlind} onChange={(value) => setTableField('bigBlind', value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <NumberField label="Min buy-in" value={tableForm.minBuyIn} onChange={(value) => setTableField('minBuyIn', value)} />
                    <NumberField label="Max buy-in" value={tableForm.maxBuyIn} onChange={(value) => setTableField('maxBuyIn', value)} />
                  </div>
                  <NumberField label="Your buy-in" value={tableForm.seatBuyIn} onChange={(value) => setTableField('seatBuyIn', value)} />
                  <label className="grid gap-1 text-sm text-[var(--text-muted)]">
                    Seats
                    <select
                      value={tableForm.maxPlayers}
                      onChange={(event) => setTableField('maxPlayers', event.target.value)}
                      className="h-9 rounded-md border border-white/12 bg-[#081510] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm text-[var(--text-muted)]">
                    Bot style
                    <select
                      value={tableForm.botDifficulty}
                      onChange={(event) => setTableField('botDifficulty', event.target.value as BotDifficulty)}
                      className="h-9 rounded-md border border-white/12 bg-[#081510] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    >
                      {botDifficulties.map((difficulty) => (
                        <option key={difficulty} value={difficulty}>{difficulty}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-2">
                    <ToggleField label="Private table" checked={tableForm.isPrivate} onChange={(checked) => setTableField('isPrivate', checked)} />
                    <ToggleField label="Fill empty seats with bots" checked={tableForm.fillWithBots} onChange={(checked) => setTableField('fillWithBots', checked)} />
                  </div>
                  <Button type="submit">
                    <Plus className="size-4" />
                    Create
                  </Button>
                </div>
              </form>

              <form onSubmit={submitJoinCode} className="rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
                <div className="mb-3 font-serif text-2xl">Join by Code</div>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm text-[var(--text-muted)]">
                    Code
                    <input
                      value={joinCode}
                      onChange={(event) => setJoinCode(event.target.value)}
                      placeholder="RIVER-4829"
                      className="h-9 rounded-md border border-white/12 bg-[#081510] px-3 font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <NumberField label="Buy-in" value={joinBuyIn} onChange={setJoinBuyIn} />
                  <Button type="submit" variant="secondary">
                    Join
                  </Button>
                </div>
              </form>

              <section className="rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
                <div className="mb-3 font-serif text-2xl">Players Online</div>
                <div className="grid gap-2 text-sm text-[var(--text-muted)]">
                  {presence.length === 0 ? (
                    <div>No one else is online.</div>
                  ) : presence.map((player) => (
                    <div key={player.id} className="flex items-center justify-between gap-3">
                      <span>{player.username}</span>
                      <span className="font-mono text-[10px] text-emerald-100/55">{player.tableCode ?? 'Lobby'}</span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>

            <section className="grid gap-4">
              {currentTable ? (
                <MultiplayerTable />
              ) : (
                <TableBrowser tables={tables} onJoin={joinTable} />
              )}

              {currentTable && !tableState && (
                <div className="rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-serif text-2xl">{currentTable.name}</div>
                      <div className="mt-1 font-mono text-xs text-[var(--text-muted)]">{currentTable.code}</div>
                    </div>
                    {currentTable.hostUsername === user.username && (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => setBotFill(!currentTable.fillWithBots)}>
                          {currentTable.fillWithBots ? 'Bots On' : 'Bots Off'}
                        </Button>
                        <Button type="button" onClick={startTable}>
                          <Play className="size-4" />
                          Start
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentTable && (
                <TableChat messages={messages} />
              )}

              {!currentTable && (
                <div className="rounded-md border border-emerald-100/12 bg-white/[0.035] p-4 text-sm text-[var(--text-muted)]">
                  The lobby updates over the WebSocket connection.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm text-[var(--text-muted)]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        className="h-9 rounded-md border border-white/12 bg-[#081510] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-9 items-center justify-between gap-3 rounded-md border border-white/12 bg-[#081510]/70 px-3 text-sm text-[var(--text-muted)]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#e8c96a]"
      />
    </label>
  );
}

function TableBrowser({ tables, onJoin }: { tables: ReturnType<typeof useMultiplayerStore.getState>['tables']; onJoin: ReturnType<typeof useMultiplayerStore.getState>['joinTable'] }) {
  return (
    <div className="rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
      <div className="mb-3 font-serif text-3xl">Open Tables</div>
      <div className="grid gap-3">
        {tables.length === 0 ? (
          <div className="rounded-md border border-dashed border-emerald-100/15 p-4 text-sm text-[var(--text-muted)]">
            No public tables yet.
          </div>
        ) : tables.map((table) => (
          <div key={table.id} className="grid gap-3 rounded-md border border-emerald-100/12 bg-[#081510]/70 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <div className="font-serif text-2xl">{table.name}</div>
              <div className="mt-1 flex flex-wrap gap-3 font-mono text-xs text-[var(--text-muted)]">
                <span>{table.code}</span>
                <span>{table.smallBlind}/{table.bigBlind}</span>
                <span>{table.minBuyIn}-{table.maxBuyIn}</span>
                <span>{table.occupiedSeats}/{table.maxPlayers}</span>
                <span>{table.fillWithBots ? table.botDifficulty : 'No bots'}</span>
                <span>{table.phase}</span>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => onJoin(table)}>
              Join
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiplayerTable() {
  const table = useMultiplayerStore((state) => state.currentTable);
  const state = useMultiplayerStore((store) => store.tableState);
  const heroPlayerId = useMultiplayerStore((store) => store.heroPlayerId);
  const sendAction = useMultiplayerStore((store) => store.sendAction);
  const startTable = useMultiplayerStore((store) => store.startTable);
  const [showWinner, setShowWinner] = useState(true);
  const actionState = useMemo(() => state ? ({ ...state, deck: [] } as GameState) : null, [state]);
  const legal = actionState ? getLegalActions(actionState) : null;
  const hero = state?.players.find((player) => player.id === heroPlayerId);

  useEffect(() => {
    if (state?.phase === 'HAND_COMPLETE') {
      setShowWinner(true);
    }
  }, [state?.handNumber, state?.phase]);

  if (!table || !state || !actionState || !legal) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
        <div>
          <div className="font-serif text-3xl">{table.name}</div>
          <div className="mt-1 font-mono text-xs text-[var(--text-muted)]">
            Hand {state.handNumber} · {state.street} · {table.code}
          </div>
        </div>
        {state.phase === 'HAND_COMPLETE' && (
          <Button type="button" variant="secondary" onClick={startTable}>
            <Play className="size-4" />
            Next Hand
          </Button>
        )}
      </header>

      <section className="relative min-h-[720px] overflow-hidden rounded-md border border-emerald-100/10 bg-[#10261c] shadow-2xl shadow-black/30">
        <div className="absolute inset-x-7 top-12 bottom-10 rounded-[50%] border-[18px] border-[var(--table-border)] bg-[radial-gradient(circle_at_center,var(--felt-light),var(--felt)_62%,#10261c)] shadow-[inset_0_20px_80px_rgba(0,0,0,0.3)]" />
        <div className="absolute inset-x-7 top-12 bottom-10 rounded-[50%] opacity-20 [background-image:repeating-linear-gradient(60deg,transparent_0_8px,rgba(255,255,255,0.08)_8px_9px)]" />
        <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-5">
          <PotDisplay pots={state.pots} />
          <CommunityCards cards={state.communityCards} />
        </div>
        {state.players.map((player) => {
          const seatPlayer = {
            ...player,
            isHuman: player.id === heroPlayerId,
          } as Player;

          return (
            <div key={player.id}>
              <PlayerSeat
                player={seatPlayer}
                totalSeats={state.players.length}
                active={state.players[state.currentPlayerIndex]?.id === player.id}
                showCards={state.phase === 'HAND_COMPLETE'}
                connection={{
                  connected: player.connected,
                  disconnectDeadline: player.disconnectDeadline,
                }}
              />
            </div>
          );
        })}
        {showWinner && (
          <WinnerOverlay state={actionState} onDismiss={() => setShowWinner(false)} />
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <HandStrengthMeter holeCards={hero?.holeCards ?? null} communityCards={state.communityCards} />
        <ActionButtons state={actionState} legal={legal} onAction={sendAction} />
      </div>
    </div>
  );
}

function TableChat({ messages }: { messages: ReturnType<typeof useMultiplayerStore.getState>['messages'] }) {
  const sendChat = useMultiplayerStore((state) => state.sendChat);
  const [text, setText] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendChat(text);
    setText('');
  };

  return (
    <section className="rounded-md border border-emerald-100/12 bg-white/[0.045] p-4">
      <div className="mb-3 flex items-center gap-2 font-serif text-2xl">
        <MessageSquare className="size-4 text-[var(--accent)]" />
        Table Talk
      </div>
      <div className="grid max-h-56 gap-2 overflow-auto pr-1">
        {messages.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)]">No messages yet.</div>
        ) : messages.map((message) => (
          <div key={message.id} className="rounded-md bg-[#081510]/70 px-3 py-2 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--accent)]">{message.username}</span>
            <span className="ml-2 text-emerald-50/88">{message.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-white/12 bg-[#081510] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          maxLength={160}
        />
        <Button type="submit" size="icon" aria-label="Send message">
          <Send className="size-4" />
        </Button>
      </form>
    </section>
  );
}
