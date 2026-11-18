import type { Children } from '@kitajs/html';
import { DOCTYPE } from '#src/doctype.ts';
import pkg from '#package.json' with { type: 'json' };
import { APPLE_TOUCH_ICON_HREF, FAVICON_HREF, LassoMark, THEME_STYLES } from '#src/branding.tsx';
import PAGE_SCRIPT from '#src/portal/views/page.js' with { type: 'text' };
import STYLES from '#src/portal/views/styles.css' with { type: 'text' };
import { type Crumb, Breadcrumbs } from '#src/portal/views/components/breadcrumbs.tsx';
import { adminUrl, APPS_URL } from '#src/portal/paths.ts';

const BASE_NAV_ITEMS = [{ href: APPS_URL, label: 'My Apps' }];
const ADMIN_NAV_ITEMS = [
  { href: adminUrl.dashboard(), label: 'Clients & resources' },
  { href: adminUrl.users(), label: 'Users' },
];

export async function Layout(props: {
  title: string;
  active: string;
  isAdmin: boolean;
  crumbs?: Crumb[];
  children: Children;
}) {
  const navItems = props.isAdmin ? [...BASE_NAV_ITEMS, ...ADMIN_NAV_ITEMS] : BASE_NAV_ITEMS;

  const page = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title safe>Lasso — {props.title}</title>
        <link rel="icon" type="image/svg+xml" href={FAVICON_HREF} />
        <link rel="apple-touch-icon" href={APPLE_TOUCH_ICON_HREF} />
        <meta name="apple-mobile-web-app-title" content="Lasso" />
        {/* The stylesheet is a repo file bundled at build time, never request data. */}
        <style>{(THEME_STYLES + STYLES) as 'safe'}</style>
      </head>
      <body>
        <div class="shell">
          <header>
            <a class="home" href={APPS_URL}>
              <span class="mark">
                <LassoMark />
              </span>
              <h1>Lasso</h1>
            </a>
            {navItems.length > 1 ? (
              <nav>
                {navItems.map((item) => (
                  <a href={item.href} class={item.href === props.active ? 'active' : ''} safe>
                    {item.label}
                  </a>
                ))}
              </nav>
            ) : null}
            <form method="post" action="/portal/logout">
              <button type="submit" class="logout">
                Log out
              </button>
            </form>
          </header>
          <main>
            {props.crumbs ? <Breadcrumbs items={props.crumbs} /> : null}
            {props.children}
          </main>
          <footer safe>v{pkg.version}</footer>
        </div>
        <script>{PAGE_SCRIPT}</script>
      </body>
    </html>
  );
  return DOCTYPE + (await page);
}
