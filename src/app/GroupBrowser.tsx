'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Group } from '@/lib/queries';

export default function GroupBrowser({
  mine,
  others,
}: {
  mine: Group[];
  others: Group[];
}) {
  const [query, setQuery] = useState('');

  const filter = (gs: Group[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return gs;
    return gs.filter((g) => g.name.toLowerCase().includes(q));
  };

  const filteredMine = useMemo(() => filter(mine), [mine, query]);
  const filteredOthers = useMemo(() => filter(others), [others, query]);
  const nothing = filteredMine.length === 0 && filteredOthers.length === 0;

  return (
    <div>
      <div className="relative mb-4">
        <input
          className="input pl-9"
          placeholder="Search groups…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search groups"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-sm">
          🔍
        </span>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-sm px-2"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {nothing && (
        <p className="text-ink/60 text-sm">
          No groups match <strong>“{query}”</strong>.
        </p>
      )}

      {filteredMine.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-ink/70 mb-2">Your groups</h2>
          <ul className="space-y-2 mb-6">
            {filteredMine.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-ink/10 hover:bg-wheat/20 transition"
                >
                  <span className="font-semibold">{g.name}</span>
                  <span className="text-xs text-ink/50">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {filteredOthers.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-ink/70 mb-2">Other groups</h2>
          <ul className="space-y-2">
            {filteredOthers.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-dashed border-ink/15 hover:bg-parchment transition"
                >
                  <span>{g.name}</span>
                  <span className="text-xs text-ink/50">Join →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
