import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import UserNav from './UserNav';
import MainNav from './MainNav';

export const metadata: Metadata = {
  title: 'Catan Tracker',
  description: 'Track Catan games, winners, and leaderboards by group.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-display">
        <header className="border-b border-ink/10 bg-parchment/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="hex inline-block w-8 h-8 bg-wheat" />
              <span className="text-xl font-bold tracking-tight">Catan Tracker</span>
            </Link>
            <span className="ml-auto" />
            <UserNav />
          </div>
          <MainNav />
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-ink/50">
          Built for tabletop nights.
        </footer>
      </body>
    </html>
  );
}
