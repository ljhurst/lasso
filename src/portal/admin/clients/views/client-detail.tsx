import { secretParamFor } from '#src/clients/secret-param.ts';
import { type ClientRecord, clientTypeOf } from '#src/clients/types.ts';
import {
  ClientFields,
  type ClientFieldValues,
} from '#src/portal/admin/clients/views/client-fields.tsx';
import { CLIENT_TYPE_DESCRIPTION } from '#src/portal/admin/clients/views/client-type.ts';
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
  const { metadata } = client;
  const clientType = clientTypeOf(metadata);
  return (
    <Layout
      title={metadata.client_name}
      active={adminUrl.dashboard()}
      isAdmin={true}
      crumbs={[{ label: 'Clients & resources', href: adminUrl.dashboard() }]}
    >
      <section>
        <h2 safe>{metadata.client_name}</h2>
        <Facts
          items={[
            { label: 'Client ID', value: <code safe>{client.clientId}</code> },
            { label: 'Type', value: CLIENT_TYPE_DESCRIPTION[clientType] },
            { label: 'Grant types', value: <List items={metadata.grant_types} /> },
            ...(clientType === 'confidential'
              ? [{ label: 'Secret', value: <code safe>{secretParamFor(client.clientId)}</code> }]
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
              clientType={clientType}
              scopeChoices={props.scopeChoices}
              values={
                props.values ?? {
                  name: metadata.client_name,
                  redirectUris: metadata.redirect_uris ?? [],
                  postLogoutRedirectUris: metadata.post_logout_redirect_uris ?? [],
                  scopes: metadata.scope?.split(' ') ?? [],
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
          <List items={metadata.redirect_uris ?? []} mono />
        </section>
      )}
    </Layout>
  );
}
