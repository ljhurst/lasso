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

/** Scopes chosen so far as removable rows, plus a dropdown of the rest; `page.js` moves scopes between the two. */
export function ScopePicker(props: { choices: readonly string[]; selected: string[] }) {
  const remaining = props.choices.filter((scope) => !props.selected.includes(scope));
  return (
    <div class="field wide" data-scope-picker>
      <label for="scope-select">Scopes</label>
      <ul class="roles" data-scope-list>
        {props.selected.map((scope) => (
          <PickedScope scope={scope} />
        ))}
      </ul>
      <div class="add-role">
        <select id="scope-select" class="control" data-scope-select aria-label="Scope to add">
          <option value="">Choose a scope…</option>
          {remaining.map((scope) => (
            <option value={scope} safe>
              {scope}
            </option>
          ))}
        </select>
        <button type="button" class="primary" data-scope-add>
          Add
        </button>
      </div>
      <template data-scope-template>
        <PickedScope scope="" />
      </template>
      <noscript>
        <span class="note">Choosing scopes needs JavaScript.</span>
      </noscript>
      <span class="note">What the client may ask for.</span>
    </div>
  );
}

function PickedScope(props: { scope: string }) {
  return (
    <li>
      <div class="role-name">
        <code safe>{props.scope}</code>
      </div>
      <input type="hidden" name="scope" value={props.scope} />
      <button
        type="button"
        class="icon-button caution"
        data-scope-remove
        aria-label={`Remove ${props.scope}`}
        title={`Remove ${props.scope}`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </li>
  );
}
