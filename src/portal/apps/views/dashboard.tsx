import { buildMcpAddCommand, buildMcpInspectorCommand } from '#src/config/mcp-command.ts';
import { AppType } from '#src/config/resources.ts';
import { CopyButton } from '#src/portal/views/components/copy-button.tsx';
import { Layout } from '#src/portal/views/layout.tsx';
import type { UserApp } from '#src/portal/apps/apps.ts';
import { APPS_URL } from '#src/portal/paths.ts';

const MODAL_SCRIPT = `
  document.querySelectorAll('[data-open-modal]').forEach(function (button) {
    button.addEventListener('click', function () {
      document.getElementById(button.dataset.openModal).showModal();
    });
  });

  document.querySelectorAll('dialog').forEach(function (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  });

`;

function appTypeLabel(type: AppType): string {
  switch (type) {
    case AppType.Web:
      return 'Web app';
    case AppType.Mcp:
      return 'MCP server';
    case AppType.Api:
      return 'API';
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function tileAction({ resource }: UserApp) {
  const { app } = resource;
  if (!app) {
    return <span class="tile-action disabled">Details coming soon</span>;
  }

  if (app.type === AppType.Mcp) {
    return (
      <button type="button" class="tile-action" data-open-modal={`modal-${slugify(resource.name)}`}>
        Connect
      </button>
    );
  }

  return app.url ? (
    <a class="tile-action" href={app.url} target="_blank" rel="noopener noreferrer">
      Launch ↗
    </a>
  ) : (
    <span class="tile-action disabled">Link coming soon</span>
  );
}

function appTile(userApp: UserApp) {
  const { resource } = userApp;
  const { app } = resource;
  const initial = resource.name.charAt(0).toUpperCase();

  return (
    <div class="app-tile">
      <div class="tile-header">
        {app?.logo ? (
          <img class="app-logo" src={app.logo} alt="" />
        ) : (
          <span class="app-badge" safe>
            {initial}
          </span>
        )}
        <div class="tile-heading">
          <span class="app-name" safe>
            {resource.name}
          </span>
          {app ? (
            <span class="app-type" safe>
              {appTypeLabel(app.type)}
            </span>
          ) : (
            ''
          )}
        </div>
      </div>
      {tileAction(userApp)}
    </div>
  );
}

function commandRow(id: string, command: string) {
  return (
    <div class="command-row">
      <code id={id} safe>
        {command}
      </code>
      <CopyButton target={id} />
    </div>
  );
}

function connectModal({ indicator, resource }: UserApp) {
  const app = resource.app;
  if (!app || app.type !== AppType.Mcp) {
    return '';
  }

  const url = app.url ?? indicator;
  const slug = slugify(resource.name);

  return (
    <dialog id={`modal-${slug}`} class="connect-modal">
      <h2 safe>Connect to {resource.name}</h2>
      <div class="command-block">
        <div class="command-label">MCP Inspector</div>
        {commandRow(`inspector-cmd-${slug}`, buildMcpInspectorCommand(url))}
      </div>
      <div class="command-block">
        <div class="command-label">Claude Code</div>
        {commandRow(`claude-cmd-${slug}`, buildMcpAddCommand(resource.name, url))}
      </div>
      <form method="dialog">
        <button type="submit" class="modal-close">
          Close
        </button>
      </form>
    </dialog>
  );
}

export async function DashboardPage(props: { apps: UserApp[]; isAdmin: boolean }) {
  return (
    <Layout title="My Apps" active={APPS_URL} isAdmin={props.isAdmin}>
      {props.apps.length === 0 ? (
        <p class="empty">No apps yet — check back once you've been granted access.</p>
      ) : (
        <>
          <div class="tiles">{props.apps.map(appTile)}</div>
          {props.apps.map(connectModal)}
          <script>{MODAL_SCRIPT}</script>
        </>
      )}
    </Layout>
  );
}
