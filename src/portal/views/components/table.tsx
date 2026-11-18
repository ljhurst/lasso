import type { Children } from '@kitajs/html';

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
