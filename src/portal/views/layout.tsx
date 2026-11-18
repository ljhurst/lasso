import Html, { type Children } from '@kitajs/html';
import pkg from '#package.json' with { type: 'json' };
import { APPLE_TOUCH_ICON_HREF, FAVICON_HREF, LassoMark, THEME_STYLES } from '#src/branding.tsx';

const BASE_NAV_ITEMS = [{ href: '/apps', label: 'My Apps' }];
const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Clients & resources' },
  { href: '/admin/users', label: 'Users' },
];

export function Layout(props: {
  title: string;
  active: string;
  isAdmin: boolean;
  children: Children;
}) {
  const navItems = props.isAdmin ? [...BASE_NAV_ITEMS, ...ADMIN_NAV_ITEMS] : BASE_NAV_ITEMS;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title safe>Lasso — {props.title}</title>
        <link rel="icon" type="image/svg+xml" href={FAVICON_HREF} />
        <link rel="apple-touch-icon" href={APPLE_TOUCH_ICON_HREF} />
        <meta name="apple-mobile-web-app-title" content="Lasso" />
        <style>{THEME_STYLES + STYLES}</style>
      </head>
      <body>
        <div class="shell">
          <header>
            <div class="brand">
              <span class="mark">
                <LassoMark />
              </span>
              <h1>Lasso</h1>
              <nav>
                {navItems.map((item) => (
                  <a href={item.href} class={item.href === props.active ? 'active' : ''} safe>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
            <form method="post" action="/portal/logout">
              <button type="submit" class="logout">
                Log out
              </button>
            </form>
          </header>
          <main>{props.children}</main>
          <footer safe>v{pkg.version}</footer>
        </div>
        <script>{LOCALIZE_TIMES_SCRIPT + COPY_SCRIPT + SUBMIT_ONCE_SCRIPT}</script>
      </body>
    </html>
  );
}

export function Table(props: { columns: string[]; rows: Children[][] }) {
  return (
    <div class="table-scroll">
      {/* biome-ignore lint/a11y/noRedundantRoles: stacked mobile layout sets display:block, which drops table semantics in some browsers */}
      <table role="table">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th safe>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            // biome-ignore lint/a11y/noRedundantRoles: stacked mobile layout sets display:block, which drops table semantics in some browsers
            <tr role="row">
              {row.map((cell, index) => (
                // biome-ignore lint/a11y/noRedundantRoles: stacked mobile layout sets display:block, which drops table semantics in some browsers
                <td role="cell" data-label={props.columns[index] || undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Facts(props: { items: { label: string; value: Children }[] }) {
  return (
    <dl class="facts">
      {props.items.map((item) => (
        <>
          <dt safe>{item.label}</dt>
          <dd>{item.value}</dd>
        </>
      ))}
    </dl>
  );
}

export function CopyButton(props: { target: string }) {
  return (
    <button
      type="button"
      class="copy-icon-button"
      data-copy-target={props.target}
      aria-label="Copy"
      title="Copy"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="5" y="3" width="8" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" />
        <path
          d="M6.5 3V2.5C6.5 1.94772 6.94772 1.5 7.5 1.5H8.5C9.05228 1.5 9.5 1.94772 9.5 2.5V3"
          stroke="currentColor"
          stroke-width="1.3"
        />
      </svg>
    </button>
  );
}

export function Empty(props: { children: Children }) {
  return <p class="empty">{props.children}</p>;
}

export function Help(props: { text: string }) {
  return (
    <span class="help" tabindex="0" role="note" aria-label={props.text} data-help={props.text}>
      <span class="help-dot">?</span>
    </span>
  );
}

export function Time(props: { seconds: number | undefined }) {
  if (props.seconds === undefined) {
    return <span class="empty-cell">—</span>;
  }
  const date = new Date(props.seconds * 1000);
  const iso = date.toISOString();
  return (
    <time datetime={iso} title={iso} safe>
      {`${UTC_FORMAT.format(date)} UTC`}
    </time>
  );
}

export function List(props: { items: readonly string[]; mono?: boolean }) {
  if (props.items.length === 0) {
    return <span class="empty-cell">—</span>;
  }
  return (
    <ul class="stacked">
      {props.items.map((item) => (
        <li>{props.mono ? <code safe>{item}</code> : Html.escapeHtml(item)}</li>
      ))}
    </ul>
  );
}

const UTC_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const LOCALIZE_TIMES_SCRIPT = `
  for (const el of document.querySelectorAll('time[datetime]')) {
    el.textContent = new Date(el.dateTime).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
`;

const CHECK_ICON_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

const COPY_SCRIPT = `
  document.querySelectorAll('[data-copy-target]').forEach(function (button) {
    var original = button.innerHTML;
    button.addEventListener('click', function () {
      var text = document.getElementById(button.dataset.copyTarget).textContent;
      navigator.clipboard.writeText(text).then(function () {
        button.innerHTML = ${JSON.stringify(CHECK_ICON_SVG)};
        setTimeout(function () {
          button.innerHTML = original;
        }, 1500);
      });
    });
  });
`;

const SUBMIT_ONCE_SCRIPT = `
  document.querySelectorAll('form[data-once]').forEach(function (form) {
    form.addEventListener('submit', function () {
      setTimeout(function () {
        form.querySelectorAll('button[type="submit"]').forEach(function (button) {
          button.disabled = true;
        });
      }, 0);
    });
  });

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      document.querySelectorAll('form[data-once] button[type="submit"]').forEach(function (button) {
        button.disabled = false;
      });
    }
  });
`;

const STYLES = `
  :root { --code-pad: 6px; }

  .shell { max-width: 960px; margin: 0 auto; padding: 32px 24px 32px; }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    row-gap: 12px;
    margin-bottom: 32px;
  }

  .brand { display: flex; align-items: center; flex-wrap: wrap; gap: 24px; row-gap: 8px; }

  .mark { display: flex; align-items: center; color: var(--accent); }

  h1 { font-size: 1.25rem; margin: 0; color: var(--accent); }

  nav { display: flex; gap: 4px; }

  nav a {
    padding: 10px 14px;
    border-radius: 8px;
    color: var(--muted);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
  }

  nav a.active { background: var(--card); color: var(--text); border: 1px solid var(--border); }

  button.logout {
    padding: 10px 14px;
    border-radius: 8px;
    border: none;
    background: none;
    color: var(--muted);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }

  button.logout:hover { color: var(--text); }

  section { margin-bottom: 40px; }

  h2 { position: relative; font-size: 1rem; margin: 0 0 12px; }

  .table-scroll { overflow-x: auto; }

  table {
    width: 100%;
    min-width: 480px;
    border-collapse: collapse;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  th, td {
    text-align: left;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 0.875rem;
    vertical-align: top;
  }

  th { color: var(--muted); font-weight: 600; }

  tr:last-child td { border-bottom: none; }

  code {
    font-size: 0.8125rem;
    background: var(--bg);
    padding: 2px var(--code-pad);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  time { white-space: nowrap; }

  ul.stacked {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .help {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin: -13px -13px -13px -7px;
    cursor: help;
    vertical-align: middle;
  }

  .help-dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--muted);
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .help:hover .help-dot, .help:focus .help-dot { color: var(--text); }

  .help:focus { outline: none; }

  .help:hover::after, .help:focus::after {
    content: attr(data-help);
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 1;
    width: min(260px, 100%);
    padding: 10px 12px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.4;
    text-align: left;
  }

  .sub { user-select: all; }

  .facts {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 8px 24px;
    margin: 0;
    padding: 12px 14px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 0.875rem;
  }

  .facts dt { color: var(--muted); font-weight: 600; }

  .facts dd { margin: 0; min-width: 0; }


  .row-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.8125rem;
    font-weight: 600;
    text-decoration: none;
  }

  button.row-action { background: transparent; font-family: inherit; cursor: pointer; }

  .row-action:not(:disabled):hover { background: var(--bg); }

  button.row-action:disabled { opacity: 0.5; cursor: not-allowed; }

  .row-action.primary {
    border-color: transparent;
    background: var(--accent);
    color: var(--accent-contrast);
  }

  .row-action.primary:not(:disabled):hover { background: var(--accent); filter: brightness(1.05); }

  .heading-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .heading-row h2 { margin: 0; }

  .row-action.caution {
    color: var(--error-text);
    border-color: var(--error-border);
    background: transparent;
  }

  .row-action.caution:not(:disabled):hover { background: var(--error-bg); }

  .name-link {
    display: inline-block;
    color: var(--accent);
    font-weight: 600;
    text-decoration: none;
  }

  .name-link:hover { text-decoration: underline; }

  .row-action.danger {
    color: var(--error-text);
    border-color: var(--error-border);
    background: var(--error-bg);
  }

  .row-action.danger:not(:disabled):hover {
    background: var(--error-bg);
    filter: brightness(1.15);
  }

  .consequences { margin: 0; padding-left: 20px; font-size: 0.875rem; line-height: 1.6; }

  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }

  .roles {
    list-style: none;
    margin: 0 0 16px;
    padding: 0 14px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 0.875rem;
  }

  .roles li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 12px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }

  .roles li:last-child { border-bottom: none; }

  .roles form { flex-shrink: 0; margin: 0; }

  .role-name {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
  }

  .note { color: var(--muted); font-size: 0.75rem; }

  .empty, .empty-cell { color: var(--muted); font-size: 0.875rem; }

  footer { margin-top: 24px; color: var(--muted); font-size: 0.75rem; text-align: center; }

  .add-role { display: flex; align-items: center; gap: 8px; }

  .control {
    min-height: 32px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-family: inherit;
    font-size: 0.875rem;
  }

  button.primary {
    min-height: 32px;
    padding: 6px 12px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: var(--accent-contrast);
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  button.primary:hover { filter: brightness(1.05); }

  .new-user {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    max-width: 480px;
  }

  .field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }

  .field.wide, .actions.wide { grid-column: 1 / -1; }

  .actions.wide { margin-top: 4px; }

  .field label { color: var(--muted); font-size: 0.75rem; font-weight: 600; }

  .form-error {
    margin: 0 0 12px;
    padding: 10px 14px;
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    border-radius: 8px;
    color: var(--error-text);
    font-size: 0.875rem;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .app-tile {
    padding: 20px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .tile-header { display: flex; align-items: center; gap: 12px; }

  .tile-heading { display: flex; flex-direction: column; gap: 4px; min-width: 0; }

  .app-logo {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
    object-fit: cover;
  }

  .app-badge {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--muted);
    font-weight: 600;
  }

  .app-name { font-weight: 600; font-size: 0.9375rem; }

  .app-type {
    margin-left: -5px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 8px;
  }

  .tile-action {
    margin-top: auto;
    align-self: stretch;
    text-align: center;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: inherit;
    text-decoration: none;
    cursor: pointer;
  }

  a.tile-action {
    background: var(--accent);
    color: var(--accent-contrast);
    border-color: transparent;
  }

  a.tile-action:hover { filter: brightness(1.05); }

  button.tile-action:hover { background: var(--bg); }

  .tile-action.disabled {
    border-style: dashed;
    color: var(--muted);
    cursor: default;
  }

  dialog.connect-modal {
    width: min(480px, calc(100vw - 48px));
    padding: 24px;
    background: var(--card);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.35);
  }

  dialog.connect-modal::backdrop {
    background: rgba(0, 0, 0, 0.4);
  }

  dialog.connect-modal h2 {
    margin: 0 0 16px;
    font-size: 1.0625rem;
  }

  .command-block { margin-bottom: 16px; }

  .command-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .command-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 4px 4px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  .command-row code {
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    white-space: nowrap;
    background: none;
    padding: 6px 0;
  }

  .command-row code.sub { font-size: 1rem; letter-spacing: 0.04em; }

  .copy-icon-button {
    flex-shrink: 0;
    display: flex;
    padding: 10px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }

  .copy-icon-button:hover { background: var(--card); color: var(--text); }

  .modal-close {
    margin-top: 8px;
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .modal-close:hover { filter: brightness(1.05); }

  @media (max-width: 640px) {
    .facts { grid-template-columns: 1fr; gap: 2px; }
    .new-user { grid-template-columns: 1fr; }
    .facts dd { margin-bottom: 10px; }
    .facts dd:last-child { margin-bottom: 0; }

    table { display: block; min-width: 0; }
    thead { display: none; }
    tbody, tr, td { display: block; }
    tr { padding: 8px 0; border-bottom: 1px solid var(--border); }
    tr:last-child { border-bottom: none; }
    td { border-bottom: none; padding: 6px 14px; }

    td[data-label]::before {
      content: attr(data-label);
      display: block;
      margin-bottom: 2px;
      color: var(--muted);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .facts code, td code {
      display: inline-block;
      max-width: 100%;
      margin-left: calc(var(--code-pad) * -1);
      overflow-x: auto;
      overflow-y: hidden;
      vertical-align: top;
      white-space: nowrap;
    }

    td .row-action { display: flex; }
  }

  @media (max-width: 640px), (pointer: coarse) {
    .row-action, .control, button.primary, .copy-icon-button { min-height: 44px; }
    .name-link { align-items: center; display: inline-flex; min-height: 44px; }
    .copy-icon-button { min-width: 44px; align-items: center; justify-content: center; }
  }
`;
