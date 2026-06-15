import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  createGroup,
  getUser,
  joinGroupAsUser,
  listGroups,
} from '@/lib/queries';
import { currentUserId, grantGroupAccess } from '@/lib/session';

export async function GET() {
  return NextResponse.json(listGroups());
}

export async function POST(req: Request) {
  let body: { name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const name = body.name?.trim();
  const password = body.password;
  if (!name || name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: 'Name must be 2-60 chars' }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json({ error: 'Password too short' }, { status: 400 });
  }
  const uid = await currentUserId();
  if (uid === null) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  }
  const user = getUser(uid);
  if (!user) {
    return NextResponse.json({ error: 'Account missing' }, { status: 401 });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const group = createGroup(name, hash);
    joinGroupAsUser(group.id, uid, user.username);
    await grantGroupAccess(group.id);
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Group name already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
