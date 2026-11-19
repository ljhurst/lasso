import { type ClientRecord, clientTypeOf } from '#src/clients/types.ts';
import { CLIENT_TYPE_LABEL } from '#src/portal/admin/clients/views/client-type.ts';
import type { Resource } from '#src/resources/types.ts';
import { Empty } from '#src/portal/views/components/empty.tsx';
import { List } from '#src/portal/views/components/list.tsx';
import { Table } from '#src/portal/views/components/table.tsx';
import { AdminLayout } from '#src/portal/admin/views/components/admin-layout.tsx';
import { adminUrl } from '#src/portal/paths.ts';

function clientRow(client: ClientRecord) {
  return [
    <a class="name-link" href={adminUrl.client(client.clientId)} safe>
      {client.metadata.client_name}
    </a>,
    <code safe>{client.clientId}</code>,
    <span safe>{CLIENT_TYPE_LABEL[clientTypeOf(client.metadata)]}</span>,
    <List items={client.metadata.redirect_uris ?? []} mono />,
    <List items={client.metadata.grant_types} />,
  ];
}

/** Lasso issues every access token as a signed JWT, so resource servers can verify them offline. */
const ACCESS_TOKEN_FORMAT = 'jwt';

export async function DashboardPage(props: { clients: ClientRecord[]; resources: Resource[] }) {
  const { clients } = props;

  return (
    <AdminLayout section="clients" title="Clients & resources" index>
      <section>
        <div class="heading-row">
          <h2>Clients ({clients.length})</h2>
          <a class="row-action primary" href={adminUrl.newClient()}>
            Add client
          </a>
        </div>
        {clients.length === 0 ? (
          <Empty>No clients registered.</Empty>
        ) : (
          <Table
            columns={['Name', 'Client ID', 'Type', 'Redirect URIs', 'Grant types']}
            rows={clients.map(clientRow)}
          />
        )}
      </section>
      <section>
        <h2>Resources ({props.resources.length})</h2>
        {props.resources.length === 0 ? (
          <Empty>No resources registered.</Empty>
        ) : (
          <Table
            columns={['Name', 'Resource indicator', 'Scope', 'Access token format']}
            rows={props.resources.map((resource) => [
              <span safe>{resource.name}</span>,
              <code safe>{resource.indicator}</code>,
              <List items={resource.scopes} mono />,
              ACCESS_TOKEN_FORMAT,
            ])}
          />
        )}
      </section>
    </AdminLayout>
  );
}
