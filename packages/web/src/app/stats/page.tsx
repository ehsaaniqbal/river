'use client';

import { Liveline, type LivelinePoint } from 'liveline';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/stores/gameStore';

const now = Date.now();

function pointsFromValues(values: number[]): LivelinePoint[] {
  const chartValues = values.length >= 2 ? [...values] : [values[0] ?? 0, values[0] ?? 0];
  const first = chartValues[0] ?? 0;
  const hasMovement = chartValues.some((value) => value !== first);

  if (!hasMovement) {
    chartValues[0] = first + 0.01;
  }

  return chartValues.map((value, index) => ({
    time: now - (chartValues.length - index - 1) * 1000,
    value,
  }));
}

export default function StatsPage() {
  const stats = useGameStore((state) => state.playerStats);
  const handHistory = useGameStore((state) => state.handHistory);
  const profitValues = handHistory
    .slice()
    .reverse()
    .reduce<number[]>((rows, hand) => {
      const previous = rows.at(-1) ?? 0;
      const heroWin = hand.winners.filter((winner) => winner.playerId === 'hero').reduce((sum, winner) => sum + winner.amount, 0);
      rows.push(previous + heroWin);
      return rows;
    }, []);
  const profitSeries = pointsFromValues(profitValues.length > 0 ? profitValues : [0]);
  const iqValues = Array.from({ length: Math.max(1, stats.handsPlayed) }, (_, index) => (
    Math.min(1000, Math.max(0, stats.pokerIQ - (stats.handsPlayed - index - 1) * 3))
  ));
  const iqSeries = pointsFromValues(iqValues);
  const vpipPfrSeries = [
    {
      id: 'vpip',
      label: 'VPIP',
      color: '#e8c96a',
      data: pointsFromValues([Math.max(0, stats.vpip - 2), stats.vpip]),
      value: stats.vpip,
    },
    {
      id: 'pfr',
      label: 'PFR',
      color: '#8BA898',
      data: pointsFromValues([Math.max(0, stats.pfr - 2), stats.pfr]),
      value: stats.pfr,
    },
  ];
  const primaryVpipPfrSeries = vpipPfrSeries[0] ?? {
    id: 'vpip',
    label: 'VPIP',
    color: '#e8c96a',
    data: pointsFromValues([0]),
    value: 0,
  };
  const actions = [
    { label: 'Fold', value: stats.sessionActions.bad, color: '#c75c50' },
    { label: 'Call', value: stats.sessionActions.neutral, color: '#8BA898' },
    { label: 'Raise', value: stats.sessionActions.good, color: '#E8C96A' },
  ];
  const totalActions = Math.max(1, actions.reduce((sum, action) => sum + action.value, 0));

  return (
    <main className="min-h-screen bg-[#06110d] text-[var(--text-primary)]">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-28">
        <header className="mb-6 border-b border-emerald-100/10 pb-6">
          <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">Ledger</div>
          <h1 className="mt-2 font-serif text-5xl">Table Ledger</h1>
        </header>
        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <StatCard title="Hands" value={stats.handsPlayed} />
          <StatCard title="Profit" value={`${stats.totalProfit} chips`} />
          <StatCard title="Win Rate" value={`${stats.handsPlayed ? Math.round((stats.handsWon / stats.handsPlayed) * 100) : 0}%`} />
          <StatCard title="Poker IQ" value={stats.pokerIQ} />
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Profit Line">
            <LinePanel
              data={profitSeries}
              value={profitSeries.at(-1)?.value ?? 0}
              referenceLine={{ value: 0, label: 'Break even' }}
              formatValue={(value) => `${Math.round(value)}`}
            />
          </ChartCard>
          <ChartCard title="VPIP / PFR">
            <div className="h-[260px]">
              <Liveline
                data={primaryVpipPfrSeries.data}
                value={primaryVpipPfrSeries.value}
                series={vpipPfrSeries}
                theme="dark"
                badge={false}
                fill={false}
                lineWidth={2}
                scrub
                formatValue={(value) => `${Math.round(value)}%`}
                className="h-full w-full [&_canvas]:!h-full [&_canvas]:!w-full"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </ChartCard>
          <ChartCard title="Action Mix">
            <div className="grid h-[260px] content-end gap-4">
              {actions.map((action) => {
                const width = Math.round((action.value / totalActions) * 100);

                return (
                  <div key={action.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-[var(--text-muted)]">{action.label}</span>
                      <span className="font-mono text-[var(--text-primary)]">{action.value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border border-emerald-100/10 bg-[#081510]/80">
                      <div
                        className="h-full rounded-full shadow-[0_0_22px_rgba(232,201,106,0.16)]"
                        style={{ width: `${width}%`, backgroundColor: action.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
          <ChartCard title="Poker IQ Line">
            <LinePanel
              data={iqSeries}
              value={iqSeries.at(-1)?.value ?? stats.pokerIQ}
              referenceLine={{ value: 500, label: 'Starting point' }}
              showValue
              formatValue={(value) => `${Math.round(value)}`}
            />
          </ChartCard>
        </section>
      </div>
    </main>
  );
}

function LinePanel({
  data,
  value,
  referenceLine,
  showValue = false,
  formatValue,
}: {
  data: LivelinePoint[];
  value: number;
  referenceLine?: { value: number; label?: string };
  showValue?: boolean;
  formatValue: (value: number) => string;
}) {
  const referenceProps = referenceLine ? { referenceLine } : {};

  return (
    <div className="h-[260px]">
      <Liveline
        data={data}
        value={value}
        theme="dark"
        color="#E8C96A"
        badgeVariant="minimal"
        {...referenceProps}
        showValue={showValue}
        valueMomentumColor={showValue}
        momentum
        exaggerate={data.length < 4}
        formatValue={formatValue}
        className="h-full w-full [&_canvas]:!h-full [&_canvas]:!w-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="rounded-md border-white/12 bg-white/[0.055] text-[var(--text-primary)] shadow-[0_18px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="font-serif text-3xl text-[var(--accent)]">{value}</CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-md border-white/12 bg-white/[0.055] text-[var(--text-primary)] shadow-[0_18px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
