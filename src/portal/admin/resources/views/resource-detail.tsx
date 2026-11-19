import { AdminLayout } from '#src/portal/admin/views/components/admin-layout.tsx';
import {
  ResourceFields,
  type ResourceFormValues,
} from '#src/portal/admin/resources/views/resource-fields.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { resourceId } from '#src/resources/id.ts';
import type { Resource } from '#src/resources/types.ts';
import { Facts } from '#src/portal/views/components/facts.tsx';
import { List } from '#src/portal/views/components/list.tsx';
import { Time } from '#src/portal/views/components/time.tsx';

export function ResourceDetailPage(props: {
  resource: Resource;
  createdAt?: string;
  error?: string;
  saved?: boolean;
  values?: ResourceFormValues;
}) {
  const { resource } = props;
  const id = resourceId(resource.indicator);
  const values = props.values ?? {
    name: resource.name,
    scopes: resource.scopes,
    appType: resource.app?.type,
    appUrl: resource.app?.url ?? '',
  };
  return (
    <AdminLayout section="clients" title={resource.name}>
      <section>
        <h2 safe>{resource.name}</h2>
        <Facts
          items={[
            { label: 'Resource', value: <code safe>{resource.indicator}</code> },
            { label: 'Scopes', value: <List items={resource.scopes} mono /> },
            ...(props.createdAt
              ? [
                  {
                    label: 'Created',
                    value: <Time seconds={Math.floor(Date.parse(props.createdAt) / 1000)} />,
                  },
                ]
              : []),
          ]}
        />
      </section>
      {resource.builtIn ? (
        <section>
          <h2>Settings</h2>
          <p class="empty">Lasso serves this resource itself, so it can only be changed in code.</p>
        </section>
      ) : (
        <section>
          <h2>Settings</h2>
          {props.saved ? <p class="empty">Saved.</p> : null}
          {props.error ? (
            <p class="form-error" role="alert" safe>
              {props.error}
            </p>
          ) : null}
          <form class="form-grid" method="post" action={adminUrl.resource(id)} data-once>
            <ResourceFields values={values} />
            <div class="actions wide">
              <button type="submit" class="primary">
                Save
              </button>
              <a class="row-action danger" href={adminUrl.deleteResource(id)}>
                Delete resource
              </a>
            </div>
          </form>
        </section>
      )}
    </AdminLayout>
  );
}
