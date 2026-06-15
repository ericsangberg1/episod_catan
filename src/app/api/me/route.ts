import { NextResponse } from 'next/server';
import { getUser, personalStats } from '@/lib/queries';
import { currentUserId } from '@/lib/session';

export async function GET() {
  const uid = await currentUserId();
  if (uid === null) return NextResponse.json({ user: null }, { status: 200 });
  const user = getUser(uid);
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user, stats: personalStats(uid) });
}
