'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PasswordGate({
  groupId,
  groupName,
}: {
  groupId: number;
  groupName: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unable to enter');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-6 mt-12">
      <h1 className="text-2xl font-bold mb-1">Join {groupName}</h1>
      <p className="text-sm text-ink/60 mb-4">
        Enter the group password to join. You&apos;ll appear in this group under your
        username.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <p className="text-brick text-sm">{error}</p>}
        <button className="btn w-full" disabled={loading}>
          {loading ? 'Joining…' : 'Join group'}
        </button>
      </form>
    </div>
  );
}
