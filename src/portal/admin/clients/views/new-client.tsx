import {
  NameField,
  RedirectUriFields,
  ScopePicker,
} from '#src/portal/admin/clients/views/client-fields.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { AdminLayout } from '#src/portal/admin/views/components/admin-layout.tsx';
import type { NewClientInput } from '#src/clients/register.ts';
import { MAX_CLIENT_NAME_LENGTH } from '#src/clients/validate.ts';

const EMPTY_FORM: NewClientInput = {
  clientId: '',
  name: '',
  clientType: 'public',
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
    <AdminLayout section="clients" title="Add a client">
      <section>
        <h2>Add a client</h2>
        {props.error ? (
          <p class="form-error" role="alert" safe>
            {props.error}
          </p>
        ) : null}
        <form class="form-grid" method="post" action={adminUrl.clients()} data-once>
          <fieldset class="field wide checks">
            <legend>Client type</legend>
            <label class="check">
              <input
                type="radio"
                name="clientType"
                value="public"
                checked={values.clientType === 'public'}
              />
              Public: signs users in with PKCE, no secret
            </label>
            <label class="check">
              <input
                type="radio"
                name="clientType"
                value="confidential"
                checked={values.clientType === 'confidential'}
              />
              Confidential: authenticates itself with a secret (client credentials)
            </label>
          </fieldset>
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
          <NameField value={values.name} />
          <div class="only-public">
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
            <RedirectUriFields
              redirectUris={values.redirectUris}
              postLogoutRedirectUris={values.postLogoutRedirectUris}
            />
          </div>
          <div class="only-confidential">
            <ScopePicker choices={props.scopeChoices} selected={values.scopes} />
          </div>
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
    </AdminLayout>
  );
}
