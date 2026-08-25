import type { ClientMetadata } from 'oidc-provider';
import { buildClients } from '../../config/clients.ts';
import { resources } from '../../config/resources.ts';
import { Empty, Layout, List, Table } from './layout.tsx';

function clientRow(client: ClientMetadata) {
  return (
    <tr>
      <td>{client.client_name}</td>
      <td>
        <code>{client.client_id}</code>
      </td>
      <td>
        <List items={client.redirect_uris ?? []} mono />
      </td>
      <td>
        <List items={client.grant_types ?? []} />
      </td>
    </tr>
  );
}

export async function DashboardPage() {
  const clients = await buildClients();
  const resourceEntries = Object.entries(resources);

  return (
    <Layout title="Clients & resources" active="/admin">
      <section>
        <h2>Clients ({clients.length})</h2>
        {clients.length === 0 ? (
          <Empty>No clients registered.</Empty>
        ) : (
          <Table columns={['Name', 'Client ID', 'Redirect URIs', 'Grant types']}>
            {clients.map(clientRow)}
          </Table>
        )}
      </section>
      <section>
        <h2>Resources ({resourceEntries.length})</h2>
        {resourceEntries.length === 0 ? (
          <Empty>No resources registered.</Empty>
        ) : (
          <Table columns={['Name', 'Resource indicator', 'Scope', 'Access token format']}>
            {resourceEntries.map(([indicator, resource]) => (
              <tr>
                <td>{resource.name}</td>
                <td>
                  <code>{indicator}</code>
                </td>
                <td>
                  <List items={resource.scope?.split(' ') ?? []} mono />
                </td>
                <td>{resource.accessTokenFormat}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </Layout>
  );
}
