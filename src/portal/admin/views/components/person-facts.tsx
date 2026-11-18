import type { User } from '#src/users/types.ts';
import { type Fact, Facts } from '#src/portal/views/components/facts.tsx';

export function PersonFacts(props: { user: User }) {
  return <Facts items={[nameFact(props.user), emailFact(props.user)]} />;
}

function nameFact(user: User): Fact {
  return {
    label: 'Name',
    value: (
      <span safe>
        {user.givenName} {user.familyName}
      </span>
    ),
  };
}

export function emailFact(user: User): Fact {
  return { label: 'Email', value: <code safe>{user.email}</code> };
}
