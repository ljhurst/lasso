export function Time(props: { seconds: number | undefined }) {
  if (props.seconds === undefined) {
    return <span class="empty-cell">—</span>;
  }
  const date = new Date(props.seconds * 1000);
  const iso = date.toISOString();
  return (
    <time datetime={iso} title={iso} safe>
      {`${UTC_FORMAT.format(date)} UTC`}
    </time>
  );
}

const UTC_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});
