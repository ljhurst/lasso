import type { ClientRecord } from '#src/clients/types.ts';
import {
  ClientFields,
  type ClientFieldValues,
} from '#src/portal/admin/clients/views/client-fields.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { Facts } from '#src/portal/views/components/facts.tsx';
import { List } from '#src/portal/views/components/list.tsx';
import { Time } from '#src/portal/views/components/time.tsx';
import { Layout } from '#src/portal/views/layout.tsx';

export function ClientDetailPage(props: {
  client: ClientRecord;
  scopeChoices: readonly string[];
  canManage: boolean;
  error?: string;
  saved?: boolean;
  values?: ClientFieldValues;
}) {
  const { client } = props;
  const kind = client.secretSsmParam ? 'service' : 'app';
  return (
    <Layout
      title={client.name}
      active={adminUrl.dashboard()}
      isAdmin={true}
      crumbs={[{ label: 'Clients & resources', href: adminUrl.dashboard() }]}
    >
      <section>
        <h2 safe>{client.name}</h2>
        <Facts
          items={[
            { label: 'Client ID', value: <code safe>{client.clientId}</code> },
            {
              label: 'Kind',
              value: kind === 'service' ? 'Service (client secret)' : 'App (sign-in with PKCE)',
            },
            { label: 'Grant types', value: <List items={client.grantTypes} /> },
            ...(client.secretSsmParam
              ? [{ label: 'Secret', value: <code safe>{client.secretSsmParam}</code> }]
              : []),
            {
              label: 'Created',
              value: <Time seconds={Math.floor(Date.parse(client.createdAt) / 1000)} />,
            },
          ]}
        />
      </section>
      {props.canManage ? (
        <section>
          <h2>Settings</h2>
          {props.saved ? <p class="empty">Saved.</p> : null}
          {props.error ? (
            <p class="form-error" role="alert" safe>
              {props.error}
            </p>
          ) : null}
          <form class="form-grid" method="post" action={adminUrl.client(client.clientId)} data-once>
            <ClientFields
              kind={kind}
              scopeChoices={props.scopeChoices}
              values={
                props.values ?? {
                  name: client.name,
                  redirectUris: client.redirectUris,
                  postLogoutRedirectUris: client.postLogoutRedirectUris,
                  scopes: client.scope?.split(' ') ?? [],
                }
              }
            />
            <div class="actions wide">
              <button type="submit" class="primary">
                Save
              </button>
              <a class="row-action danger" href={adminUrl.deleteClient(client.clientId)}>
                Delete client
              </a>
            </div>
          </form>
        </section>
      ) : (
        <section>
          <h2>Settings</h2>
          <p class="empty">
            Lasso signs admins in through this client, so it can only be changed in code.
          </p>
          <List items={client.redirectUris} mono />
        </section>
      )}
    </Layout>
  );
}
