import { redirect } from 'next/navigation';
import { globalLeaderboard, type GlobalLeaderRow } from '@/lib/queries';
import { currentUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function LeaderboardsPage() {
  const uid = await currentUserId();
  if (uid === null) redirect('/account');

  const rows = globalLeaderboard();

  const byWins = [...rows].sort(
    (a, b) => b.wins - a.wins || b.games_played - a.games_played,
  );
  const byGames = [...rows].sort((a, b) => b.games_played - a.games_played);
  const byWr = rows
    .filter((r) => r.games_played > 0)
    .sort((a, b) => b.win_rate - a.win_rate || b.wins - a.wins);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-3xl font-bold">Global leaderboards</h1>
        <p className="text-sm text-ink/60">
          Aggregated across every group, per signed-in player. Guests aren&apos;t shown.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="card p-6 text-ink/60">
          No games logged yet — go log one in a group and the leaderboards will fill
          in.
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <LeaderCard
            title="Most wins"
            rows={byWins}
            currentUserId={uid}
            value={(r) => r.wins}
            valueLabel="wins"
            subtitle={(r) => `${r.games_played} games`}
          />
          <LeaderCard
            title="Most games"
            rows={byGames}
            currentUserId={uid}
            value={(r) => r.games_played}
            valueLabel="games"
            subtitle={(r) =>
              `${r.groups_count} group${r.groups_count === 1 ? '' : 's'}`
            }
          />
          <LeaderCard
            title="Win rate"
            rows={byWr}
            currentUserId={uid}
            value={(r) => `${(r.win_rate * 100).toFixed(0)}%`}
            valueLabel="WR"
            subtitle={(r) => `${r.wins}/${r.games_played}`}
          />
        </div>
      )}
    </div>
  );
}

function LeaderCard({
  title,
  rows,
  currentUserId,
  value,
  valueLabel,
  subtitle,
}: {
  title: string;
  rows: GlobalLeaderRow[];
  currentUserId: number;
  value: (r: GlobalLeaderRow) => number | string;
  valueLabel: string;
  subtitle: (r: GlobalLeaderRow) => string;
}) {
  return (
    <div className="card p-5">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <span className="hex w-5 h-5 bg-wheat inline-block" />
        {title}
      </h3>
      <ol className="space-y-2">
        {rows.slice(0, 20).map((r, i) => {
          const isMe = r.user_id === currentUserId;
          return (
            <li
              key={r.user_id}
              className={`flex items-center gap-3 p-2 rounded-lg border ${
                isMe ? 'bg-wheat/30 border-wheat' : 'border-ink/10'
              }`}
            >
              <span
                className={`w-6 h-6 grid place-items-center rounded-full text-xs font-bold ${
                  i === 0
                    ? 'bg-wheat'
                    : i === 1
                    ? 'bg-sheep'
                    : i === 2
                    ? 'bg-brick text-white'
                    : 'bg-ink/10'
                }`}
              >
                {i + 1}
              </span>
              <span className="font-semibold flex-1 truncate">
                {r.username}
                {isMe && <span className="text-xs ml-2 text-brick">you</span>}
              </span>
              <span className="text-right">
                <span className="font-bold">{value(r)}</span>
                <span className="text-xs text-ink/50 ml-1">{valueLabel}</span>
                <div className="text-[10px] text-ink/40">{subtitle(r)}</div>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
