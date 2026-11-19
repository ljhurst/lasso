import { AppType } from '#src/resources/types.ts';
import { MAX_RESOURCE_NAME_LENGTH } from '#src/resources/validate.ts';

export interface ResourceFormValues {
  name: string;
  scopes: string[];
  appType: AppType | undefined;
  appUrl: string;
}

const APP_TYPE_LABEL: Record<AppType, string> = {
  [AppType.Web]: 'Web app',
  [AppType.Mcp]: 'MCP server',
  [AppType.Api]: 'API',
};

/** The fields a resource lets you change, shared by the add and edit forms. */
export function ResourceFields(props: { values: ResourceFormValues }) {
  const { values } = props;
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
          maxlength={MAX_RESOURCE_NAME_LENGTH}
          autocomplete="off"
          value={values.name}
        />
      </div>
      <div class="field wide">
        <label for="scopes">Scopes</label>
        <textarea class="control mono" id="scopes" name="scopes" rows="4" required safe>
          {values.scopes.join('\n')}
        </textarea>
        <span class="note">
          One per line, like project:action. These become the roles users can hold.
        </span>
      </div>
      <div class="field wide">
        <label for="appType">Shown on the apps page as</label>
        <select class="control" id="appType" name="appType">
          <option value="" selected={values.appType === undefined}>
            Not shown
          </option>
          {Object.values(AppType).map((type) => (
            <option value={type} selected={values.appType === type} safe>
              {APP_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
      </div>
      <div class="field wide">
        <label for="appUrl">App link</label>
        <input
          class="control mono"
          id="appUrl"
          name="appUrl"
          type="url"
          autocomplete="off"
          value={values.appUrl}
        />
        <span class="note">Where the apps page sends people. Optional.</span>
      </div>
    </>
  );
}
