/** A row in a list of things that can be taken away, with its own remove button. */
export function RemovableItem(props: {
  label: string;
  notes?: string[];
  action: string;
  field: string;
  blocked?: boolean;
}) {
  const { label } = props;
  return (
    <li>
      <div class="role-name">
        <code safe>{label}</code>
        {(props.notes ?? []).map((note) => (
          <span class="note" safe>
            {note}
          </span>
        ))}
      </div>
      <form method="post" action={props.action}>
        <input type="hidden" name={props.field} value={label} />
        <button
          type="submit"
          class="icon-button caution"
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
          disabled={props.blocked}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </form>
    </li>
  );
}
