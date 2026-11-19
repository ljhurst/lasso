import type { ClientRecord } from '#src/clients/types.ts';
import { resources } from '#src/config/resources.ts';
import { Empty } from '#src/portal/views/components/empty.tsx';
import { List } from '#src/portal/views/components/list.tsx';
import { Table } from '#src/portal/views/components/table.tsx';
import { Layout } from '#src/portal/views/layout.tsx';
import { adminUrl } from '#src/portal/paths.ts';

function clientRow(client: ClientRecord) {
  return [
    <a class="name-link" href={adminUrl.client(client.clientId)} safe>
      {client.name}
    </a>,
    <code safe>{client.clientId}</code>,
    <List items={client.redirectUris} mono />,
    <List items={client.grantTypes} />,
  ];
}

export async function DashboardPage(props: { clients: ClientRecord[] }) {
  const { clients } = props;
  const resourceEntries = Object.entries(resources);

  return (
    <Layout title="Clients & resources" active={adminUrl.dashboard()} isAdmin={true}>
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
            columns={['Name', 'Client ID', 'Redirect URIs', 'Grant types']}
            rows={clients.map(clientRow)}
          />
        )}
      </section>
      <section>
        <h2>Resources ({resourceEntries.length})</h2>
        {resourceEntries.length === 0 ? (
          <Empty>No resources registered.</Empty>
        ) : (
          <Table
            columns={['Name', 'Resource indicator', 'Scope', 'Access token format']}
            rows={resourceEntries.map(([indicator, resource]) => [
              <span safe>{resource.name}</span>,
              <code safe>{indicator}</code>,
              <List items={resource.scope?.split(' ') ?? []} mono />,
              resource.accessTokenFormat,
            ])}
          />
        )}
      </section>
    </Layout>
  );
}
