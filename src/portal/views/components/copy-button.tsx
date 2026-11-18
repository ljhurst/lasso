export function CopyButton(props: { target: string }) {
  return (
    <button
      type="button"
      class="copy-icon-button"
      data-copy-target={props.target}
      aria-label="Copy"
      title="Copy"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="5" y="3" width="8" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" />
        <path
          d="M6.5 3V2.5C6.5 1.94772 6.94772 1.5 7.5 1.5H8.5C9.05228 1.5 9.5 1.94772 9.5 2.5V3"
          stroke="currentColor"
          stroke-width="1.3"
        />
      </svg>
    </button>
  );
}
