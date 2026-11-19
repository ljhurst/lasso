import type { ClientRecord } from '#src/clients/types.ts';
import { ConfirmPage } from '#src/portal/admin/views/components/confirm-page.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { Facts } from '#src/portal/views/components/facts.tsx';

export function DeleteClientPage(props: { client: ClientRecord }) {
  const { client } = props;
  return (
    <ConfirmPage
      title="Delete client"
      heading="Delete this client?"
      active={adminUrl.dashboard()}
      crumbs={[
        { label: 'Clients & resources', href: adminUrl.dashboard() },
        { label: client.name, href: adminUrl.client(client.clientId) },
      ]}
      facts={
        <Facts
          items={[
            { label: 'Name', value: <span safe>{client.name}</span> },
            { label: 'Client ID', value: <code safe>{client.clientId}</code> },
          ]}
        />
      }
      action={adminUrl.deleteClient(client.clientId)}
      cancelHref={adminUrl.client(client.clientId)}
      submitLabel="Delete client"
      tone="danger"
    >
      <li>The app or service can no longer sign in or get tokens</li>
      <li>Ends its grants and access tokens</li>
      {client.secretSsmParam ? <li>Deletes its secret</li> : null}
      <li>Removes the client. This can't be undone.</li>
    </ConfirmPage>
  );
}
