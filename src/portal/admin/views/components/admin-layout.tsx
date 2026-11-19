import type { Children } from '@kitajs/html';
import { adminUrl } from '#src/portal/paths.ts';
import type { Crumb } from '#src/portal/views/components/breadcrumbs.tsx';
import { Layout } from '#src/portal/views/layout.tsx';

export type AdminSection = 'users' | 'clients';

const SECTION_ROOT: Record<AdminSection, Crumb> = {
  users: { label: 'Users', href: adminUrl.users() },
  clients: { label: 'Clients & resources', href: adminUrl.dashboard() },
};

/**
 * The page frame every admin page shares: it marks the section in the nav and
 * puts the section's list page at the root of the breadcrumbs. `crumbs` are
 * the pages between that root and this one; the list page itself is `index`.
 */
export function AdminLayout(props: {
  section: AdminSection;
  title: string;
  crumbs?: Crumb[];
  index?: boolean;
  children: Children;
}) {
  const root = SECTION_ROOT[props.section];
  return (
    <Layout
      title={props.title}
      active={root.href}
      isAdmin={true}
      crumbs={props.index ? undefined : [root, ...(props.crumbs ?? [])]}
    >
      {props.children}
    </Layout>
  );
}
