import type { User } from '#src/users/types.ts';
import { type Fact, Facts } from '#src/portal/views/components/facts.tsx';
import { fullName } from '#src/users/name.ts';

export function PersonFacts(props: { user: User }) {
  return <Facts items={[nameFact(props.user), emailFact(props.user)]} />;
}

function nameFact(user: User): Fact {
  return {
    label: 'Name',
    value: <span safe>{fullName(user)}</span>,
  };
}

export function emailFact(user: User): Fact {
  return { label: 'Email', value: <code safe>{user.email}</code> };
}
