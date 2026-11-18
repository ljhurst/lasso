export function Help(props: { text: string }) {
  return (
    <span class="help" tabindex="0" role="note" aria-label={props.text} data-help={props.text}>
      <span class="help-dot">?</span>
    </span>
  );
}
