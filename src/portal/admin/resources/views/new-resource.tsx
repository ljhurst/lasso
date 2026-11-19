import { AdminLayout } from '#src/portal/admin/views/components/admin-layout.tsx';
import {
  ResourceFields,
  type ResourceFormValues,
} from '#src/portal/admin/resources/views/resource-fields.tsx';
import { adminUrl } from '#src/portal/paths.ts';

export interface NewResourceValues extends ResourceFormValues {
  resource: string;
}

const EMPTY_FORM: NewResourceValues = {
  resource: '',
  name: '',
  scopes: [],
  appType: undefined,
  appUrl: '',
};

export function NewResourcePage(props: { error?: string; values?: NewResourceValues }) {
  const values = props.values ?? EMPTY_FORM;
  return (
    <AdminLayout section="clients" title="Add a resource">
      <section>
        <h2>Add a resource</h2>
        {props.error ? (
          <p class="form-error" role="alert" safe>
            {props.error}
          </p>
        ) : null}
        <form class="form-grid" method="post" action={adminUrl.resources()} data-once>
          <div class="field wide">
            <label for="resource">Resource indicator</label>
            <input
              class="control mono"
              id="resource"
              name="resource"
              type="url"
              required
              autocomplete="off"
              value={values.resource}
            />
            <span class="note">
              The API's URL, which tokens are issued for. Can't be changed later.
            </span>
          </div>
          <ResourceFields values={values} />
          <div class="actions wide">
            <button type="submit" class="primary">
              Add resource
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
