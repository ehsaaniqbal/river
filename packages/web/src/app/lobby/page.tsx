import type { Metadata } from 'next';
import LobbyClient from './LobbyClient';

export const metadata: Metadata = {
  title: 'Lobby | River',
  description: 'Find a River table, join a seat, and play live poker.',
};

export default function LobbyPage() {
  return <LobbyClient />;
}
