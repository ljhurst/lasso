import { type ClientRecord, clientTypeOf } from '#src/clients/types.ts';
import { ConfirmPage } from '#src/portal/admin/views/components/confirm-page.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { Facts } from '#src/portal/views/components/facts.tsx';

export function DeleteClientPage(props: { client: ClientRecord; error?: string }) {
  const { client } = props;
  return (
    <ConfirmPage
      title="Delete client"
      error={props.error}
      heading="Delete this client?"
      section="clients"
      crumbs={[{ label: client.metadata.client_name, href: adminUrl.client(client.clientId) }]}
      facts={
        <Facts
          items={[
            { label: 'Name', value: <span safe>{client.metadata.client_name}</span> },
            { label: 'Client ID', value: <code safe>{client.clientId}</code> },
          ]}
        />
      }
      action={adminUrl.deleteClient(client.clientId)}
      cancelHref={adminUrl.client(client.clientId)}
      submitLabel="Delete client"
      tone="danger"
    >
      <li>The client can no longer sign in or get tokens</li>
      <li>Ends its grants and access tokens</li>
      {clientTypeOf(client.metadata) === 'confidential' ? <li>Deletes its secret</li> : null}
      <li>Removes the client. This can't be undone.</li>
    </ConfirmPage>
  );
}
