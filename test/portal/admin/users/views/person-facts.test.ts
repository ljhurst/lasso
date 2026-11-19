import { describe, expect, it } from 'vitest';
import { emailFact, PersonFacts } from '#src/portal/admin/users/views/person-facts.tsx';
import { makeUser } from '#test/support/users.ts';

const HOSTILE = '<img src=x onerror=alert(1)>';

const user = makeUser();

describe('PersonFacts', () => {
  it('shows the full name and the email as labelled facts', () => {
    const html = PersonFacts({ user }) as string;

    expect(html).toContain('<dt>Name</dt><dd><span>Friend Person</span></dd>');
    expect(html).toContain('<dt>Email</dt><dd><code>friend@example.com</code></dd>');
  });
});

describe('PersonFacts escaping', () => {
  it.each([
    ['given name', { givenName: HOSTILE }],
    ['family name', { familyName: HOSTILE }],
    ['email', { email: HOSTILE }],
  ])('escapes a hostile %s', (_label, overrides) => {
    const html = PersonFacts({ user: { ...user, ...overrides } }) as string;

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });
});

describe('emailFact', () => {
  it('labels the email and shows it as code', () => {
    const fact = emailFact(user);

    expect(fact.label).toBe('Email');
    expect(fact.value).toBe('<code>friend@example.com</code>');
  });
});
