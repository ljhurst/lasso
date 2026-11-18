import type { Children } from '@kitajs/html';

export function Empty(props: { children: Children }) {
  return <p class="empty">{props.children}</p>;
}
