export interface Crumb {
  label: string;
  href: string;
}

/** The pages above this one; the page's own heading says where you are now. */
export function Breadcrumbs(props: { items: Crumb[] }) {
  return (
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {props.items.map((item) => (
          <li>
            <a href={item.href} safe>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
