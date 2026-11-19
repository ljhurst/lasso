import type { Children } from '@kitajs/html';
import { PersonFacts } from '#src/portal/admin/views/components/person-facts.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import type { Crumb } from '#src/portal/views/components/breadcrumbs.tsx';
import { Layout } from '#src/portal/views/layout.tsx';
import { fullName } from '#src/users/name.ts';
import type { User } from '#src/users/types.ts';

/** A step-before-you-do-it page: what it affects, what will happen, then act or cancel. */
export function ConfirmPage(props: {
  title: string;
  heading: string;
  active: string;
  crumbs: Crumb[];
  facts: Children;
  action: string;
  cancelHref: string;
  submitLabel: string;
  tone: 'danger' | 'caution';
  children: Children;
}) {
  return (
    <Layout title={props.title} active={props.active} isAdmin={true} crumbs={props.crumbs}>
      <section>
        <h2 safe>{props.heading}</h2>
        {props.facts}
      </section>
      <section>
        <h2>What happens</h2>
        <ul class="consequences">{props.children}</ul>
        <form class="actions" method="post" action={props.action} data-once>
          <button type="submit" class={`row-action ${props.tone}`} safe>
            {props.submitLabel}
          </button>
          <a class="row-action" href={props.cancelHref}>
            Cancel
          </a>
        </form>
      </section>
    </Layout>
  );
}

/** The page props that say a confirm page is about one user. */
export function aboutUser(user: User) {
  return {
    active: adminUrl.users(),
    crumbs: [
      { label: 'Users', href: adminUrl.users() },
      { label: fullName(user), href: adminUrl.user(user.sub) },
    ],
    facts: <PersonFacts user={user} />,
    cancelHref: adminUrl.user(user.sub),
  };
}
