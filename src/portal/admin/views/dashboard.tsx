import type { ClientMetadata } from 'oidc-provider';
import { buildClients } from '#src/config/clients.ts';
import { resources } from '#src/config/resources.ts';
import { Empty, Layout, List, Table } from '#src/portal/views/layout.tsx';

function clientRow(client: ClientMetadata) {
  return [
    <span safe>{client.client_name}</span>,
    <code safe>{client.client_id}</code>,
    <List items={client.redirect_uris ?? []} mono />,
    <List items={client.grant_types ?? []} />,
  ];
}

export async function DashboardPage() {
  const clients = await buildClients();
  const resourceEntries = Object.entries(resources);

  return (
    <Layout title="Clients & resources" active="/admin" isAdmin={true}>
      <section>
        <h2>Clients ({clients.length})</h2>
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
