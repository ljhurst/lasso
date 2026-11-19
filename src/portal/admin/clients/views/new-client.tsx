import { ClientFields } from '#src/portal/admin/clients/views/client-fields.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { Layout } from '#src/portal/views/layout.tsx';
import type { NewClientInput } from '#src/clients/register.ts';
import { MAX_CLIENT_NAME_LENGTH } from '#src/clients/validate.ts';

const EMPTY_FORM: NewClientInput = {
  clientId: '',
  name: '',
  kind: 'app',
  applicationType: 'web',
  redirectUris: [],
  postLogoutRedirectUris: [],
  scopes: [],
};

export function NewClientPage(props: {
  scopeChoices: readonly string[];
  error?: string;
  values?: NewClientInput;
}) {
  const values = props.values ?? EMPTY_FORM;
  return (
    <Layout
      title="Add a client"
      active={adminUrl.dashboard()}
      isAdmin={true}
      crumbs={[{ label: 'Clients & resources', href: adminUrl.dashboard() }]}
    >
      <section>
        <h2>Add a client</h2>
        {props.error ? (
          <p class="form-error" role="alert" safe>
            {props.error}
          </p>
        ) : null}
        <form class="form-grid" method="post" action={adminUrl.clients()} data-once>
          <div class="field wide">
            <label for="clientId">Client ID</label>
            <input
              class="control mono"
              id="clientId"
              name="clientId"
              type="text"
              required
              maxlength={MAX_CLIENT_NAME_LENGTH}
              autocomplete="off"
              value={values.clientId}
            />
            <span class="note">Lowercase letters, digits and hyphens. Can't be changed later.</span>
          </div>
          <fieldset class="field wide checks">
            <legend>Kind</legend>
            <label class="check">
              <input type="radio" name="kind" value="app" checked={values.kind === 'app'} />
              App that signs users in
            </label>
            <label class="check">
              <input type="radio" name="kind" value="service" checked={values.kind === 'service'} />
              Service that authenticates itself (gets a secret)
            </label>
          </fieldset>
          <div class="field wide">
            <label for="applicationType">App type</label>
            <select class="control" id="applicationType" name="applicationType">
              <option value="web" selected={values.applicationType === 'web'}>
                Web
              </option>
              <option value="native" selected={values.applicationType === 'native'}>
                Native (desktop or CLI, loopback redirect)
              </option>
            </select>
          </div>
          <ClientFields values={values} scopeChoices={props.scopeChoices} />
          <div class="actions wide">
            <button type="submit" class="primary">
              Add client
            </button>
            <a class="row-action" href={adminUrl.dashboard()}>
              Cancel
            </a>
          </div>
        </form>
      </section>
    </Layout>
  );
}
