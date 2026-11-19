import { secretParamFor } from '#src/clients/secret-param.ts';
import { type ClientRecord, clientTypeOf, scopesOf } from '#src/clients/types.ts';
import { NameField, RedirectUriFields } from '#src/portal/admin/clients/views/client-fields.tsx';
import { RemovableItem } from '#src/portal/admin/views/components/removable-item.tsx';
import { CLIENT_TYPE_DESCRIPTION } from '#src/portal/admin/clients/views/client-type.ts';
import { adminUrl } from '#src/portal/paths.ts';
import { Facts } from '#src/portal/views/components/facts.tsx';
import { Empty } from '#src/portal/views/components/empty.tsx';
import { List } from '#src/portal/views/components/list.tsx';
import { Time } from '#src/portal/views/components/time.tsx';
import { Layout } from '#src/portal/views/layout.tsx';

export interface ClientFormValues {
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
}

export function ClientDetailPage(props: {
  client: ClientRecord;
  grantableScopes: string[];
  canManage: boolean;
  error?: string;
  saved?: boolean;
  values?: ClientFormValues;
}) {
  const { client } = props;
  const { metadata } = client;
  const clientType = clientTypeOf(metadata);
  const values = props.values ?? {
    name: metadata.client_name,
    redirectUris: metadata.redirect_uris ?? [],
    postLogoutRedirectUris: metadata.post_logout_redirect_uris ?? [],
  };
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
      {props.canManage && clientType === 'confidential' ? (
        <ScopesSection client={client} grantable={props.grantableScopes} />
      ) : null}
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
            <NameField value={values.name} />
            {clientType === 'public' ? (
              <RedirectUriFields
                redirectUris={values.redirectUris}
                postLogoutRedirectUris={values.postLogoutRedirectUris}
              />
            ) : null}
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

function ScopesSection(props: { client: ClientRecord; grantable: string[] }) {
  const { client } = props;
  const scopes = scopesOf(client.metadata);
  const onlyOne = scopes.length === 1;
  return (
    <section>
      <h2>Scopes ({scopes.length})</h2>
      <ul class="roles">
        {scopes.map((scope) => (
          <RemovableItem
            label={scope}
            notes={onlyOne ? ['A confidential client needs at least one scope'] : []}
            action={adminUrl.removeClientScope(client.clientId)}
            field="scope"
            blocked={onlyOne}
          />
        ))}
      </ul>
      {props.grantable.length === 0 ? (
        <Empty>This client already has every scope.</Empty>
      ) : (
        <form class="add-role" method="post" action={adminUrl.addClientScope(client.clientId)}>
          <select name="scope" required aria-label="Scope to add" class="control">
            <option value="">Choose a scope…</option>
            {props.grantable.toSorted().map((scope) => (
              <option value={scope} safe>
                {scope}
              </option>
            ))}
          </select>
          <button type="submit" class="primary">
            Add
          </button>
        </form>
      )}
    </section>
  );
}
