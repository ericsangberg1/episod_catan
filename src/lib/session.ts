import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  groupAccess?: number[];
  userId?: number;
};

const password =
  process.env.SESSION_SECRET ??
  'dev_only_insecure_secret_replace_me_replace_me_replace_me';

if (password.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters');
}

const sessionOptions: SessionOptions = {
  password,
  cookieName: 'catan_session',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
}

export async function hasGroupAccess(groupId: number): Promise<boolean> {
  const s = await getSession();
  return Array.isArray(s.groupAccess) && s.groupAccess.includes(groupId);
}

export async function grantGroupAccess(groupId: number) {
  const s = await getSession();
  const set = new Set(s.groupAccess ?? []);
  set.add(groupId);
  s.groupAccess = Array.from(set);
  await s.save();
}

export async function revokeGroupAccess(groupId: number) {
  const s = await getSession();
  s.groupAccess = (s.groupAccess ?? []).filter((id) => id !== groupId);
  await s.save();
}

export async function setUser(userId: number | null) {
  const s = await getSession();
  if (userId === null) delete s.userId;
  else s.userId = userId;
  await s.save();
}

export async function currentUserId(): Promise<number | null> {
  const s = await getSession();
  return s.userId ?? null;
}
