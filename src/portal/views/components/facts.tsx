import type { Children } from '@kitajs/html';

export interface Fact {
  label: string;
  value: Children;
}

export function Facts(props: { items: Fact[] }) {
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
