import type { ClientType } from '#src/clients/types.ts';
import { MAX_CLIENT_NAME_LENGTH } from '#src/clients/validate.ts';

export interface ClientFieldValues {
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  scopes: string[];
}

/** The fields shared by the new-client and edit-client forms; `clientType` hides the ones that don't apply. */
export function ClientFields(props: {
  values: ClientFieldValues;
  scopeChoices: readonly string[];
  clientType?: ClientType;
}) {
  const { values, clientType } = props;
  return (
    <>
      <div class="field wide">
        <label for="name">Name</label>
        <input
          class="control"
          id="name"
          name="name"
          type="text"
          required
          maxlength={MAX_CLIENT_NAME_LENGTH}
          autocomplete="off"
          value={values.name}
        />
      </div>
      {clientType === 'confidential' ? null : (
        <>
          <div class="field wide">
            <label for="redirectUris">Redirect URIs</label>
            <textarea class="control mono" id="redirectUris" name="redirectUris" rows="4" safe>
              {values.redirectUris.join('\n')}
            </textarea>
            <span class="note">One per line. https, or http on localhost.</span>
          </div>
          <div class="field wide">
            <label for="postLogoutRedirectUris">Post-logout redirect URIs</label>
            <textarea
              class="control mono"
              id="postLogoutRedirectUris"
              name="postLogoutRedirectUris"
              rows="3"
              safe
            >
              {values.postLogoutRedirectUris.join('\n')}
            </textarea>
            <span class="note">One per line. Optional.</span>
          </div>
        </>
      )}
      {clientType === 'public' ? null : (
        <fieldset class="field wide checks">
          <legend>Scopes</legend>
          {props.scopeChoices.map((scope) => (
            <label class="check">
              <input
                type="checkbox"
                name="scope"
                value={scope}
                checked={values.scopes.includes(scope)}
              />
              <code safe>{scope}</code>
            </label>
          ))}
          <span class="note">What a confidential client may ask for.</span>
        </fieldset>
      )}
    </>
  );
}
