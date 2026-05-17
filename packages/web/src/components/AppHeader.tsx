'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/lobby', label: 'Lobby' },
  { href: '/learn', label: 'Study' },
  { href: '/stats', label: 'Ledger' },
  { href: '/history', label: 'Hands' },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="liquid-glass liquid-highlight pointer-events-auto flex h-12 w-full max-w-[42rem] items-center justify-between rounded-xl px-2 text-sm text-emerald-50/72">
        <Link
          href="/"
          className="font-brand relative z-10 flex h-9 items-center rounded-md px-4 text-[1.7rem] leading-none text-[#fff8e8] transition-colors hover:text-[var(--accent)]"
        >
          River
        </Link>
        <div className="relative z-10 flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-[13px] transition-colors hover:bg-white/8 hover:text-[#fff8e8]',
                  active && 'bg-white/12 text-[var(--accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
