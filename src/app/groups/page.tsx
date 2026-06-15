import { redirect } from 'next/navigation';
import { getUser, listGroups, listGroupsForUser } from '@/lib/queries';
import { currentUserId } from '@/lib/session';
import CreateGroupForm from '../CreateGroupForm';
import GroupBrowser from '../GroupBrowser';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const uid = await currentUserId();
  if (uid === null) redirect('/account');
  const user = getUser(uid);
  if (!user) redirect('/account');

  const mine = listGroupsForUser(uid);
  const mineIds = new Set(mine.map((g) => g.id));
  const others = listGroups().filter((g) => !mineIds.has(g.id));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="card p-6">
        <h1 className="text-2xl font-bold mb-1">Groups</h1>
        <p className="text-sm text-ink/60 mb-4">
          Signed in as <strong>{user.username}</strong>. Search or pick a group below.
        </p>
        {mine.length === 0 && others.length === 0 ? (
          <p className="text-ink/60 text-sm">
            No groups yet. Create one to get started.
          </p>
        ) : (
          <GroupBrowser mine={mine} others={others} />
        )}
      </section>
      <section className="card p-6">
        <h2 className="text-2xl font-bold mb-1">Create a group</h2>
        <p className="text-sm text-ink/60 mb-4">
          Pick a name and password. You&apos;ll be added automatically as{' '}
          <strong>{user.username}</strong>.
        </p>
        <CreateGroupForm />
      </section>
    </div>
  );
}
