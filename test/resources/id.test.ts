import { describe, expect, it } from 'vitest';
import { indicatorFromId, resourceId } from '#src/resources/id.ts';

describe('resource ids', () => {
  it.each([
    'https://api.example.com/',
    'https://fi37z0j9pg.execute-api.us-east-1.amazonaws.com/prod',
    'http://localhost:3000/a/b?c=d',
    'https://ünïcode.example.com/路径',
  ])('round-trips %s through a path-safe id', (indicator) => {
    const id = resourceId(indicator);

    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(indicatorFromId(id)).toBe(indicator);
  });

  it.each(['', 'not valid!', 'a/b', '%2F', 'AAA', '..'])('rejects the bad id %j', (id) => {
    expect(indicatorFromId(id)).toBeUndefined();
  });
});
