import type { Children } from '@kitajs/html';
import {
  AdminLayout,
  type AdminSection,
} from '#src/portal/admin/views/components/admin-layout.tsx';
import type { Crumb } from '#src/portal/views/components/breadcrumbs.tsx';

/** A step-before-you-do-it page: what it affects, what will happen, then act or cancel. */
export function ConfirmPage(props: {
  title: string;
  heading: string;
  section: AdminSection;
  crumbs: Crumb[];
  facts: Children;
  error?: string;
  action: string;
  cancelHref: string;
  submitLabel: string;
  tone: 'danger' | 'caution';
  children: Children;
}) {
  return (
    <AdminLayout section={props.section} title={props.title} crumbs={props.crumbs}>
      <section>
        <h2 safe>{props.heading}</h2>
        {props.facts}
      </section>
      <section>
        <h2>What happens</h2>
        {props.error ? (
          <p class="form-error" role="alert" safe>
            {props.error}
          </p>
        ) : null}
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
    </AdminLayout>
  );
}
