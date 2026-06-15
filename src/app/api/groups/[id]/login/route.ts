import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getGroupWithHash, getUser, joinGroupAsUser } from '@/lib/queries';
import {
  currentUserId,
  grantGroupAccess,
  revokeGroupAccess,
} from '@/lib/session';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Invalid group id' }, { status: 400 });
  }
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const group = getGroupWithHash(groupId);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  const ok = !!body.password && (await bcrypt.compare(body.password, group.password_hash));
  if (!ok) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });

  const uid = await currentUserId();
  if (uid === null) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  }
  const user = getUser(uid);
  if (!user) {
    return NextResponse.json({ error: 'Account missing' }, { status: 401 });
  }
  joinGroupAsUser(groupId, uid, user.username);
  await grantGroupAccess(groupId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await revokeGroupAccess(Number(id));
  return NextResponse.json({ ok: true });
}
