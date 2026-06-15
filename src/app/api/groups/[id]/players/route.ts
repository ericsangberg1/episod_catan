import { NextResponse } from 'next/server';
import { createPlayer, getGroup, listPlayers } from '@/lib/queries';
import { hasGroupAccess } from '@/lib/session';

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
  return NextResponse.json(listPlayers(g.id));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const g = await guard(id);
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status });
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name || name.length > 40) {
    return NextResponse.json({ error: 'Name must be 1-40 chars' }, { status: 400 });
  }
  try {
    const p = createPlayer(g.id, name);
    return NextResponse.json(p, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Player already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
