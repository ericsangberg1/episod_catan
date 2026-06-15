import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserWithHash } from '@/lib/queries';
import { setUser } from '@/lib/session';

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const user = body.username ? getUserWithHash(body.username.trim()) : undefined;
  const ok = !!user && !!body.password && (await bcrypt.compare(body.password, user.password_hash));
  if (!ok || !user) {
    return NextResponse.json({ error: 'Wrong username or password' }, { status: 401 });
  }
  await setUser(user.id);
  return NextResponse.json({ id: user.id, username: user.username });
}
