import type { ClientRecord } from '#src/clients/types.ts';
import { adminUrl } from '#src/portal/paths.ts';
import { CopyButton } from '#src/portal/views/components/copy-button.tsx';
import { Facts } from '#src/portal/views/components/facts.tsx';
import { Layout } from '#src/portal/views/layout.tsx';

export function ClientSecretPage(props: { client: ClientRecord; secret: string }) {
  const { client } = props;
  return (
    <Layout
      title="Client secret"
      active={adminUrl.dashboard()}
      isAdmin={true}
      crumbs={[{ label: 'Clients & resources', href: adminUrl.dashboard() }]}
    >
      <section>
        <h2 safe>Created {client.metadata.client_name}</h2>
        <Facts items={[{ label: 'Client ID', value: <code safe>{client.clientId}</code> }]} />
      </section>
      <section>
        <h2>Client secret</h2>
        <div class="command-row">
          <code class="sub" id="client-secret" safe>
            {props.secret}
          </code>
          <CopyButton target="client-secret" />
        </div>
        <p class="empty">
          Shown once. Store it where the client reads its configuration. It can't be viewed again.
        </p>
        <div class="actions">
          <a class="row-action primary" href={adminUrl.client(client.clientId)}>
            Open client
          </a>
        </div>
      </section>
    </Layout>
  );
}
