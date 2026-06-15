'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create group');
      router.push(`/groups/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label" htmlFor="group-name">Group name</label>
        <input
          id="group-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={60}
          placeholder="Friday Night Settlers"
        />
      </div>
      <div>
        <label className="label" htmlFor="group-pw">Password</label>
        <input
          id="group-pw"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={4}
          placeholder="At least 4 characters"
        />
      </div>
      {error && <p className="text-brick text-sm">{error}</p>}
      <button className="btn" disabled={loading}>
        {loading ? 'Creating…' : 'Create group'}
      </button>
    </form>
  );
}
