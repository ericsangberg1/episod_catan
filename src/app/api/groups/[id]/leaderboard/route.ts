import { NextResponse } from 'next/server';
import { getGroup, leaderboard } from '@/lib/queries';
import { hasGroupAccess } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  if (!getGroup(groupId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!(await hasGroupAccess(groupId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(leaderboard(groupId));
}
