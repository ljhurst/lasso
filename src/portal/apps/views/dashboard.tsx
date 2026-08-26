import { buildMcpAddCommand, buildMcpInspectorCommand } from '../../../config/mcp-command.ts';
import { AppType } from '../../../config/resources.ts';
import { Layout } from '../../views/layout.tsx';
import type { UserApp } from '../routes.ts';

const CLIPBOARD_ICON_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5" y="3" width="8" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"></rect><path d="M6.5 3V2.5C6.5 1.94772 6.94772 1.5 7.5 1.5H8.5C9.05228 1.5 9.5 1.94772 9.5 2.5V3" stroke="currentColor" stroke-width="1.3"></path></svg>';
const CHECK_ICON_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

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

  var clipboardIcon = ${JSON.stringify(CLIPBOARD_ICON_SVG)};
  var checkIcon = ${JSON.stringify(CHECK_ICON_SVG)};

  document.querySelectorAll('[data-copy-target]').forEach(function (button) {
    button.addEventListener('click', function () {
      var text = document.getElementById(button.dataset.copyTarget).textContent;
      navigator.clipboard.writeText(text).then(function () {
        button.innerHTML = checkIcon;
        setTimeout(function () {
          button.innerHTML = clipboardIcon;
        }, 1500);
      });
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
          <span class="app-badge">{initial}</span>
        )}
        <div class="tile-heading">
          <span class="app-name">{resource.name}</span>
          {app ? <span class="app-type">{appTypeLabel(app.type)}</span> : ''}
        </div>
      </div>
      {tileAction(userApp)}
    </div>
  );
}

function commandRow(id: string, command: string) {
  return (
    <div class="command-row">
      <code id={id}>{command}</code>
      <button
        type="button"
        class="copy-icon-button"
        data-copy-target={id}
        aria-label="Copy"
        title="Copy"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect
            x="5"
            y="3"
            width="8"
            height="10"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.3"
          />
          <path
            d="M6.5 3V2.5C6.5 1.94772 6.94772 1.5 7.5 1.5H8.5C9.05228 1.5 9.5 1.94772 9.5 2.5V3"
            stroke="currentColor"
            stroke-width="1.3"
          />
        </svg>
      </button>
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
      <h2>Connect to {resource.name}</h2>
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
    <Layout title="My Apps" active="/apps" isAdmin={props.isAdmin}>
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
