import { NextResponse } from 'next/server';
import { setUser } from '@/lib/session';

export async function POST() {
  await setUser(null);
  return NextResponse.json({ ok: true });
}
