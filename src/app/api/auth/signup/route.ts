import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, getUserWithHash } from '@/lib/queries';
import { setUser } from '@/lib/session';

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const username = body.username?.trim();
  const password = body.password;
  if (!username || username.length < 2 || username.length > 30) {
    return NextResponse.json({ error: 'Username must be 2-30 chars' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return NextResponse.json(
      { error: 'Letters, numbers, dot, dash, underscore only' },
      { status: 400 },
    );
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 chars' }, { status: 400 });
  }
  if (getUserWithHash(username)) {
    return NextResponse.json({ error: 'Username taken' }, { status: 409 });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = createUser(username, hash);
  await setUser(user.id);
  return NextResponse.json(user, { status: 201 });
}
