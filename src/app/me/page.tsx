import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, personalStats } from '@/lib/queries';
import { currentUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MePage() {
  const uid = await currentUserId();
  if (uid === null) redirect('/account');
  const user = getUser(uid);
  if (!user) redirect('/account');

  const stats = personalStats(uid);
  const wr = (n: number) => `${(n * 100).toFixed(0)}%`;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-3xl font-bold">{user.username}</h1>
        <p className="text-sm text-ink/60">Personal stats across all your groups</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Games" value={stats.total_games} />
        <StatCard label="Wins" value={stats.total_wins} />
        <StatCard label="Win rate" value={wr(stats.win_rate)} />
      </div>

      <section className="card p-5">
        <h2 className="font-bold mb-3">By group</h2>
        {stats.per_group.length === 0 ? (
          <p className="text-ink/60 text-sm">
            You haven&apos;t claimed any players yet. Open a group and pick your name on
            the <strong>Players</strong> tab to start tracking.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {stats.per_group.map((r) => (
              <li key={r.group_id} className="py-3 flex items-center gap-3">
                <Link
                  href={`/groups/${r.group_id}`}
                  className="font-semibold hover:underline"
                >
                  {r.group_name}
                </Link>
                <span className="text-xs text-ink/50">as {r.player_name}</span>
                <span className="ml-auto text-sm">
                  <span className="font-bold">{r.wins}</span>
                  <span className="text-ink/50">/{r.games_played} </span>
                  <span className="text-brick font-bold ml-1">{wr(r.win_rate)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stats.per_variant.length > 0 && (
        <section className="card p-5">
          <h2 className="font-bold mb-3">By variant</h2>
          <ul className="divide-y divide-ink/10">
            {stats.per_variant.map((r) => (
              <li key={r.variant} className="py-3 flex items-center gap-3">
                <span className="font-semibold">{r.variant}</span>
                <span className="ml-auto text-sm">
                  <span className="font-bold">{r.wins}</span>
                  <span className="text-ink/50">/{r.games_played} </span>
                  <span className="text-brick font-bold ml-1">{wr(r.win_rate)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5 text-center">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-ink/60">{label}</div>
    </div>
  );
}
