import { NextResponse } from 'next/server';
import { claimPlayer, getGroup, getPlayer, unclaimPlayer } from '@/lib/queries';
import { currentUserId, hasGroupAccess } from '@/lib/session';
import { getDb } from '@/lib/db';

async function guard(groupIdStr: string, playerIdStr: string) {
  const groupId = Number(groupIdStr);
  const playerId = Number(playerIdStr);
  if (!Number.isFinite(groupId) || !Number.isFinite(playerId)) {
    return { error: 'Invalid id', status: 400 as const };
  }
  if (!getGroup(groupId)) return { error: 'Group not found', status: 404 as const };
  if (!(await hasGroupAccess(groupId))) {
    return { error: 'Group locked', status: 403 as const };
  }
  const userId = await currentUserId();
  if (userId === null) return { error: 'Sign in first', status: 401 as const };
  const player = getPlayer(playerId);
  if (!player || player.group_id !== groupId) {
    return { error: 'Player not in group', status: 404 as const };
  }
  return { groupId, playerId, userId, player };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> },
) {
  const { id, pid } = await params;
  const g = await guard(id, pid);
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status });

  if (g.player.user_id !== null && g.player.user_id !== g.userId) {
    return NextResponse.json({ error: 'Player already claimed' }, { status: 409 });
  }
  const existing = getDb()
    .prepare('SELECT id FROM players WHERE group_id = ? AND user_id = ?')
    .get(g.groupId, g.userId) as { id: number } | undefined;
  if (existing && existing.id !== g.playerId) {
    return NextResponse.json(
      { error: 'You already claimed another player in this group' },
      { status: 409 },
    );
  }
  claimPlayer(g.playerId, g.userId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; pid: string }> },
) {
  const { id, pid } = await params;
  const g = await guard(id, pid);
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status });
  unclaimPlayer(g.playerId, g.userId);
  return NextResponse.json({ ok: true });
}
