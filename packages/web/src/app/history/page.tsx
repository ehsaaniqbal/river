import type { Metadata } from 'next';
import HistoryClient from './HistoryClient';

export const metadata: Metadata = {
  title: 'History | River',
  description: 'Review completed poker hands street by street.',
};

export default function HistoryPage() {
  return <HistoryClient />;
}
