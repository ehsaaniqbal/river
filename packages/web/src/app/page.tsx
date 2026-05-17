import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'River',
  description: 'Practice poker decisions, table reads, and live hands.',
};

export default function HomePage() {
  return <HomeClient />;
}
