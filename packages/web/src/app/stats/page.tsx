import type { Metadata } from 'next';
import StatsClient from './StatsClient';

export const metadata: Metadata = {
  title: 'Stats | River',
  description: 'Track poker profit, hand volume, VPIP, PFR, and Poker IQ.',
};

export default function StatsPage() {
  return <StatsClient />;
}
