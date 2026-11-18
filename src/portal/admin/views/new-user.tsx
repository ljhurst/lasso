import { MAX_EMAIL_LENGTH, MAX_NAME_LENGTH } from '#src/users/provision.ts';
import { Layout } from '#src/portal/views/layout.tsx';

export interface NewUserForm {
  givenName: string;
  familyName: string;
  email: string;
}

const EMPTY_FORM: NewUserForm = { givenName: '', familyName: '', email: '' };

export function NewUserPage(props: { error?: string; values?: NewUserForm }) {
  const values = props.values ?? EMPTY_FORM;
  return (
    <Layout title="Add a user" active="/admin/users" isAdmin={true}>
      <section>
        <h2>Add a user</h2>
        {props.error ? (
          <p class="form-error" role="alert" safe>
            {props.error}
          </p>
        ) : null}
        <form class="new-user" method="post" action="/admin/users" data-once>
          <div class="field">
            <label for="givenName">Given name</label>
            <input
              class="control"
              id="givenName"
              name="givenName"
              type="text"
              required
              maxlength={MAX_NAME_LENGTH}
              autocomplete="off"
              value={values.givenName}
            />
          </div>
          <div class="field">
            <label for="familyName">Family name</label>
            <input
              class="control"
              id="familyName"
              name="familyName"
              type="text"
              required
              maxlength={MAX_NAME_LENGTH}
              autocomplete="off"
              value={values.familyName}
            />
          </div>
          <div class="field wide">
            <label for="email">Email</label>
            <input
              class="control"
              id="email"
              name="email"
              type="email"
              required
              maxlength={MAX_EMAIL_LENGTH}
              autocomplete="off"
              value={values.email}
            />
          </div>
          <div class="actions wide">
            <button type="submit" class="primary">
              Add user
            </button>
            <a class="row-action" href="/admin/users">
              Cancel
            </a>
          </div>
        </form>
      </section>
    </Layout>
  );
}
