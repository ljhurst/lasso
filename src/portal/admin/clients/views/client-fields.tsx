import { MAX_CLIENT_NAME_LENGTH } from '#src/clients/validate.ts';

export function NameField(props: { value: string }) {
  return (
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
        value={props.value}
      />
    </div>
  );
}

export function RedirectUriFields(props: {
  redirectUris: string[];
  postLogoutRedirectUris: string[];
}) {
  return (
    <>
      <div class="field wide">
        <label for="redirectUris">Redirect URIs</label>
        <textarea class="control mono" id="redirectUris" name="redirectUris" rows="4" safe>
          {props.redirectUris.join('\n')}
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
          {props.postLogoutRedirectUris.join('\n')}
        </textarea>
        <span class="note">One per line. Optional.</span>
      </div>
    </>
  );
}

export function ScopeChoices(props: { choices: readonly string[]; selected: string[] }) {
  return (
    <fieldset class="field wide checks">
      <legend>Scopes</legend>
      {props.choices.map((scope) => (
        <label class="check">
          <input
            type="checkbox"
            name="scope"
            value={scope}
            checked={props.selected.includes(scope)}
          />
          <code safe>{scope}</code>
        </label>
      ))}
      <span class="note">What the client may ask for.</span>
    </fieldset>
  );
}
