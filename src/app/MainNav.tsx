'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/groups', label: 'Groups' },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/me', label: 'My stats' },
] as const;

export default function MainNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav className="border-b border-ink/10 bg-parchment/60">
      <div className="max-w-5xl mx-auto px-4 flex gap-1">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
                active
                  ? 'border-brick text-brick'
                  : 'border-transparent text-ink/60 hover:text-ink hover:border-ink/20'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
