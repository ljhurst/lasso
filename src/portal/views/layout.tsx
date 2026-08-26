import type { Children } from '@kitajs/html';
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
        <title>Lasso — {props.title}</title>
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
                  <a href={item.href} class={item.href === props.active ? 'active' : ''}>
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
          <footer>v{pkg.version}</footer>
        </div>
      </body>
    </html>
  );
}

export function Table(props: { columns: string[]; children: Children }) {
  return (
    <table>
      <thead>
        <tr>
          {props.columns.map((column) => (
            <th>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>{props.children}</tbody>
    </table>
  );
}

export function Empty(props: { children: Children }) {
  return <p class="empty">{props.children}</p>;
}

export function List(props: { items: readonly string[]; mono?: boolean }) {
  if (props.items.length === 0) {
    return <span class="empty-cell">—</span>;
  }
  return (
    <ul class="stacked">
      {props.items.map((item) => (
        <li>{props.mono ? <code>{item}</code> : item}</li>
      ))}
    </ul>
  );
}

const STYLES = `
  .shell { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px; }

  header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 32px; }

  .brand { display: flex; align-items: baseline; gap: 24px; }

  .mark { display: flex; align-items: center; color: var(--accent); position: relative; top: 3px; }

  h1 { font-size: 1.25rem; margin: 0; color: var(--accent); }

  nav { display: flex; gap: 4px; }

  nav a {
    padding: 6px 12px;
    border-radius: 8px;
    color: var(--muted);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
  }

  nav a.active { background: var(--card); color: var(--text); border: 1px solid var(--border); }

  button.logout {
    padding: 6px 12px;
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

  h2 { font-size: 1rem; margin: 0 0 12px; }

  table {
    width: 100%;
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
    padding: 2px 6px;
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  ul.stacked {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .empty, .empty-cell { color: var(--muted); font-size: 0.875rem; }

  footer { margin-top: 24px; color: var(--muted); font-size: 0.75rem; text-align: center; }

  section form { display: flex; align-items: center; gap: 8px; }

  section form select {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 0.875rem;
  }

  section form button[type="submit"] {
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  section form button[type="submit"]:hover { filter: brightness(1.05); }

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
    padding: 8px 12px;
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
    width: 100%;
    max-width: 480px;
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

  .copy-icon-button {
    flex-shrink: 0;
    display: flex;
    padding: 6px;
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
`;
