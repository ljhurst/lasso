import type { Children } from '@kitajs/html';

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
