import type { Children } from '@kitajs/html';
import type { User } from '#src/users/types.ts';
import { PersonFacts } from '#src/portal/admin/views/components/person-facts.tsx';
import { Layout } from '#src/portal/views/layout.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { fullName } from '#src/users/name.ts';

/** A step-before-you-do-it page: who it affects, what will happen, then act or cancel. */
export function ConfirmPage(props: {
  title: string;
  heading: string;
  user: User;
  action: string;
  submitLabel: string;
  tone: 'danger' | 'caution';
  children: Children;
}) {
  const { user } = props;
  return (
    <Layout
      title={props.title}
      active={adminUrl.users()}
      isAdmin={true}
      crumbs={[
        { label: 'Users', href: adminUrl.users() },
        { label: fullName(user), href: adminUrl.user(user.sub) },
      ]}
    >
      <section>
        <h2 safe>{props.heading}</h2>
        <PersonFacts user={user} />
      </section>
      <section>
        <h2>What happens</h2>
        <ul class="consequences">{props.children}</ul>
        <form class="actions" method="post" action={props.action} data-once>
          <button type="submit" class={`row-action ${props.tone}`} safe>
            {props.submitLabel}
          </button>
          <a class="row-action" href={adminUrl.user(user.sub)}>
            Cancel
          </a>
        </form>
      </section>
    </Layout>
  );
}
