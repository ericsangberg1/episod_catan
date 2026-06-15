'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Game, Group, LeaderRow, Player } from '@/lib/queries';

const VARIANTS = [
  'Base',
  'Seafarers',
  'Cities & Knights',
  'Traders & Barbarians',
  'Explorers & Pirates',
  'Other',
];

type Tab = 'leaderboard' | 'log' | 'history' | 'players';

export default function Dashboard({
  group,
  initialPlayers,
  initialGames,
  initialLeaders,
  currentUserId,
}: {
  group: Group;
  initialPlayers: Player[];
  initialGames: Game[];
  initialLeaders: LeaderRow[];
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [players, setPlayers] = useState(initialPlayers);
  const [games, setGames] = useState(initialGames);
  const [leaders, setLeaders] = useState(initialLeaders);

  async function refreshAll() {
    const [pRes, gRes, lRes] = await Promise.all([
      fetch(`/api/groups/${group.id}/players`).then((r) => r.json()),
      fetch(`/api/groups/${group.id}/games`).then((r) => r.json()),
      fetch(`/api/groups/${group.id}/leaderboard`).then((r) => r.json()),
    ]);
    setPlayers(pRes);
    setGames(gRes);
    setLeaders(lRes);
  }

  async function logout() {
    await fetch(`/api/groups/${group.id}/login`, { method: 'DELETE' });
    router.push('/');
    router.refresh();
  }

  const totalGames = games.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <p className="text-sm text-ink/60">
            {totalGames} game{totalGames === 1 ? '' : 's'} logged · {players.length}{' '}
            player{players.length === 1 ? '' : 's'}
          </p>
        </div>
        <button onClick={logout} className="btn btn-ghost">Leave group</button>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {(
          [
            ['leaderboard', 'Leaderboard'],
            ['log', 'Log game'],
            ['history', 'History'],
            ['players', 'Players'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === key
                ? 'bg-brick text-white'
                : 'bg-parchment border border-ink/15 hover:bg-wheat/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && <Leaderboard rows={leaders} />}
      {tab === 'log' && (
        <LogGame
          groupId={group.id}
          players={players}
          onLogged={refreshAll}
          onAddPlayer={refreshAll}
        />
      )}
      {tab === 'history' && <History games={games} />}
      {tab === 'players' && (
        <Players
          groupId={group.id}
          players={players}
          onAdded={refreshAll}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

function Leaderboard({ rows }: { rows: LeaderRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card p-6 text-ink/60">
        No players yet. Add some in the Players tab.
      </div>
    );
  }
  const sortedByWins = [...rows].sort((a, b) => b.wins - a.wins || b.games_played - a.games_played);
  const sortedByGames = [...rows].sort((a, b) => b.games_played - a.games_played);
  const sortedByWr = [...rows]
    .filter((r) => r.games_played > 0)
    .sort((a, b) => b.win_rate - a.win_rate || b.wins - a.wins);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <LeaderCard title="Most wins" rows={sortedByWins} valueLabel="wins" value={(r) => r.wins} />
      <LeaderCard title="Most games" rows={sortedByGames} valueLabel="games" value={(r) => r.games_played} />
      <LeaderCard
        title="Win rate"
        rows={sortedByWr}
        valueLabel="WR"
        value={(r) => `${(r.win_rate * 100).toFixed(0)}%`}
        subtitle={(r) => `${r.wins}/${r.games_played}`}
      />
    </div>
  );
}

function LeaderCard({
  title,
  rows,
  valueLabel,
  value,
  subtitle,
}: {
  title: string;
  rows: LeaderRow[];
  valueLabel: string;
  value: (r: LeaderRow) => number | string;
  subtitle?: (r: LeaderRow) => string;
}) {
  return (
    <div className="card p-5">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <span className="hex w-5 h-5 bg-wheat inline-block" />
        {title}
      </h3>
      <ol className="space-y-2">
        {rows.slice(0, 10).map((r, i) => (
          <li
            key={r.player_id}
            className="flex items-center gap-3 p-2 rounded-lg border border-ink/10"
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
            <span className="font-semibold flex-1 truncate">{r.name}</span>
            <span className="text-right">
              <span className="font-bold">{value(r)}</span>
              <span className="text-xs text-ink/50 ml-1">{valueLabel}</span>
              {subtitle && (
                <div className="text-[10px] text-ink/40">{subtitle(r)}</div>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LogGame({
  groupId,
  players,
  onLogged,
  onAddPlayer,
}: {
  groupId: number;
  players: Player[];
  onLogged: () => void;
  onAddPlayer: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [variant, setVariant] = useState('Base');
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [newPlayer, setNewPlayer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (winnerId === id) setWinnerId(null);
      } else next.add(id);
      return next;
    });
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlayer.trim()) return;
    const res = await fetch(`/api/groups/${groupId}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPlayer.trim() }),
    });
    if (res.ok) {
      setNewPlayer('');
      onAddPlayer();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not add player');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedArr.length < 2) return setError('Select at least 2 players.');
    if (!winnerId) return setError('Pick the winner.');
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: selectedArr,
          winnerId,
          variant,
          playedAt: new Date(playedAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setSelected(new Set());
      setWinnerId(null);
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <form onSubmit={submit} className="card p-5 space-y-4">
        <h3 className="font-bold">New game</h3>
        <div>
          <label className="label">Players</label>
          {players.length === 0 ? (
            <p className="text-sm text-ink/60">Add a player first →</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {players.map((p) => {
                const isOn = selected.has(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`p-2 rounded-lg text-sm font-semibold border transition ${
                      isOn
                        ? 'bg-wood text-white border-wood'
                        : 'bg-parchment border-ink/15 hover:bg-wheat/30'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedArr.length > 0 && (
          <div>
            <label className="label">Winner</label>
            <div className="flex flex-wrap gap-2">
              {players
                .filter((p) => selected.has(p.id))
                .map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setWinnerId(p.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                      winnerId === p.id
                        ? 'bg-brick text-white border-brick'
                        : 'bg-parchment border-ink/20'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Variant</label>
            <select
              className="select"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
            >
              {VARIANTS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">When</label>
            <input
              type="datetime-local"
              className="input"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-brick text-sm">{error}</p>}
        <button className="btn w-full" disabled={loading}>
          {loading ? 'Saving…' : 'Log game'}
        </button>
      </form>

      <div className="card p-5">
        <h3 className="font-bold mb-2">Quick add player</h3>
        <p className="text-sm text-ink/60 mb-3">
          Need someone new? Add them and they’ll appear in the picker.
        </p>
        <form onSubmit={addPlayer} className="flex gap-2">
          <input
            className="input"
            placeholder="Player name"
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            maxLength={40}
          />
          <button className="btn btn-secondary">Add</button>
        </form>
      </div>
    </div>
  );
}

function History({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return <div className="card p-6 text-ink/60">No games logged yet.</div>;
  }
  return (
    <div className="card p-5">
      <h3 className="font-bold mb-3">Recent games</h3>
      <ul className="divide-y divide-ink/10">
        {games.map((g) => (
          <li key={g.id} className="py-3 flex items-start gap-3">
            <div className="hex w-8 h-8 bg-wheat shrink-0 mt-1" />
            <div className="flex-1">
              <div className="font-semibold">
                <span className="text-brick">{g.winner_name}</span> won
              </div>
              <div className="text-sm text-ink/60">
                {g.players.map((p) => p.name).join(', ')}
              </div>
            </div>
            <div className="text-right text-xs text-ink/50 whitespace-nowrap">
              <div>{new Date(g.played_at).toLocaleDateString()}</div>
              <div className="italic">{g.variant}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Players({
  groupId,
  players,
  onAdded,
  currentUserId,
}: {
  groupId: number;
  players: Player[];
  onAdded: () => void;
  currentUserId: number | null;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const myPlayer = players.find((p) => p.user_id === currentUserId && currentUserId !== null);
  void myPlayer;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setName('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card p-5">
        <h3 className="font-bold mb-3">Roster</h3>
        {players.length === 0 ? (
          <p className="text-ink/60">No players yet.</p>
        ) : (
          <ul className="space-y-2">
            {players.map((p) => {
              const isMine = p.user_id === currentUserId && currentUserId !== null;
              const isGuest = p.user_id === null;
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    isMine ? 'bg-wheat/30 border-wheat' : 'bg-parchment border-ink/10'
                  }`}
                >
                  <span className="font-semibold flex-1 truncate">
                    {p.name}
                    {isMine && <span className="text-xs ml-2 text-brick">you</span>}
                    {isGuest && (
                      <span className="text-xs ml-2 text-ink/40">guest</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="space-y-4">
        <form onSubmit={submit} className="card p-5 space-y-3">
          <h3 className="font-bold">Add a player</h3>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Name"
          />
          {error && <p className="text-brick text-sm">{error}</p>}
          <button className="btn" disabled={loading}>
            {loading ? 'Adding…' : 'Add player'}
          </button>
        </form>
        <div className="card p-5 text-sm text-ink/70">
          <strong>Tip:</strong> Players added here are <em>guests</em> — they have no
          login and don&apos;t get personal stats. Ask friends to sign up and join the
          group so their stats roll up automatically.
        </div>
      </div>
    </div>
  );
}
