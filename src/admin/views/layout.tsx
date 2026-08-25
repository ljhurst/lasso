import type { Children } from '@kitajs/html';
import { FAVICON_HREF, THEME_STYLES } from '../../branding.tsx';

const NAV_ITEMS = [
  { href: '/admin', label: 'Clients & resources' },
  { href: '/admin/users', label: 'Users' },
];

export function Layout(props: { title: string; active: string; children: Children }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Lasso admin — {props.title}</title>
        <link rel="icon" type="image/svg+xml" href={FAVICON_HREF} />
        <style>{THEME_STYLES + STYLES}</style>
      </head>
      <body>
        <div class="shell">
          <header>
            <div class="brand">
              <h1>Lasso</h1>
              <nav>
                {NAV_ITEMS.map((item) => (
                  <a href={item.href} class={item.href === props.active ? 'active' : ''}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
            <form method="post" action="/admin/logout">
              <button type="submit" class="logout">
                Log out
              </button>
            </form>
          </header>
          <main>{props.children}</main>
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
`;
