import { notFound, redirect } from 'next/navigation';
import { getGroup, leaderboard, listGames, listPlayers } from '@/lib/queries';
import { currentUserId, hasGroupAccess } from '@/lib/session';
import PasswordGate from './PasswordGate';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) notFound();
  const group = getGroup(groupId);
  if (!group) notFound();

  const uid = await currentUserId();
  if (uid === null) redirect('/account');

  const access = await hasGroupAccess(groupId);
  if (!access) {
    return <PasswordGate groupId={groupId} groupName={group.name} />;
  }

  const [players, games, leaders] = [
    listPlayers(groupId),
    listGames(groupId),
    leaderboard(groupId),
  ];

  return (
    <Dashboard
      group={group}
      initialPlayers={players}
      initialGames={games}
      initialLeaders={leaders}
      currentUserId={uid}
    />
  );
}
