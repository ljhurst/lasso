import Html from '@kitajs/html';

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
