import { ConfirmPage } from '#src/portal/admin/views/components/confirm-page.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { resourceId } from '#src/resources/id.ts';
import type { Resource } from '#src/resources/types.ts';
import { Facts } from '#src/portal/views/components/facts.tsx';

export function DeleteResourcePage(props: { resource: Resource; error?: string }) {
  const { resource } = props;
  const id = resourceId(resource.indicator);
  return (
    <ConfirmPage
      title="Delete resource"
      error={props.error}
      heading="Delete this resource?"
      section="clients"
      crumbs={[{ label: resource.name, href: adminUrl.resource(id) }]}
      facts={
        <Facts
          items={[
            { label: 'Name', value: <span safe>{resource.name}</span> },
            { label: 'Resource', value: <code safe>{resource.indicator}</code> },
          ]}
        />
      }
      action={adminUrl.deleteResource(id)}
      cancelHref={adminUrl.resource(id)}
      submitLabel="Delete resource"
      tone="danger"
    >
      <li>No more tokens are issued for it</li>
      <li>Ends the grants that reach it</li>
      <li>Users keep their roles, which show as no longer registered</li>
      <li>Removes the resource. This can't be undone.</li>
    </ConfirmPage>
  );
}
