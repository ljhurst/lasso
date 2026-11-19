import { PersonFacts } from '#src/portal/admin/users/views/person-facts.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { fullName } from '#src/users/name.ts';
import type { User } from '#src/users/types.ts';

/** The confirm-page props that say the page is about one user. */
export function aboutUser(user: User) {
  return {
    section: 'users' as const,
    crumbs: [{ label: fullName(user), href: adminUrl.user(user.sub) }],
    facts: <PersonFacts user={user} />,
    cancelHref: adminUrl.user(user.sub),
  };
}
