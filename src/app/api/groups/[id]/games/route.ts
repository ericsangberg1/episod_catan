import { NextResponse } from 'next/server';
import { createGame, getGroup, listGames, listPlayers } from '@/lib/queries';
import { hasGroupAccess } from '@/lib/session';

const VARIANTS = new Set([
  'Base',
  'Seafarers',
  'Cities & Knights',
  'Traders & Barbarians',
  'Explorers & Pirates',
  'Other',
]);

async function guard(idStr: string) {
  const id = Number(idStr);
  if (!Number.isFinite(id)) return { error: 'Invalid id', status: 400 as const };
  if (!getGroup(id)) return { error: 'Not found', status: 404 as const };
  if (!(await hasGroupAccess(id))) return { error: 'Forbidden', status: 403 as const };
  return { id };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const g = await guard(id);
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status });
  return NextResponse.json(listGames(g.id));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const g = await guard(id);
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status });

  let body: {
    winnerId?: number;
    playerIds?: number[];
    variant?: string;
    playedAt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const playerIds = Array.from(new Set(body.playerIds ?? [])).filter((n) =>
    Number.isFinite(n),
  );
  const winnerId = Number(body.winnerId);
  const variant = VARIANTS.has(body.variant ?? '') ? (body.variant as string) : 'Base';
  const playedAt = body.playedAt && !Number.isNaN(Date.parse(body.playedAt))
    ? new Date(body.playedAt).toISOString()
    : new Date().toISOString();

  if (playerIds.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 });
  }
  if (!Number.isFinite(winnerId) || !playerIds.includes(winnerId)) {
    return NextResponse.json({ error: 'Winner must be one of the players' }, { status: 400 });
  }

  const allowed = new Set(listPlayers(g.id).map((p) => p.id));
  if (!playerIds.every((pid) => allowed.has(pid))) {
    return NextResponse.json({ error: 'Player not in this group' }, { status: 400 });
  }

  const gameId = createGame({
    groupId: g.id,
    winnerId,
    playerIds,
    variant,
    playedAt,
  });
  return NextResponse.json({ id: gameId }, { status: 201 });
}
