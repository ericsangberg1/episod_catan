'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Me = { user: { id: number; username: string } | null };

export default function UserNav() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => alive && setMe({ user: d.user }))
      .catch(() => alive && setMe({ user: null }));
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMe({ user: null });
    router.push('/');
    router.refresh();
  }

  if (me === null) return <span className="text-sm text-ink/40">…</span>;

  if (!me.user) {
    return (
      <Link href="/account" className="btn btn-ghost text-sm py-1.5">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link href="/me" className="font-semibold hover:underline">
        {me.user.username}
      </Link>
      <button onClick={logout} className="btn btn-ghost text-sm py-1.5">
        Sign out
      </button>
    </div>
  );
}
