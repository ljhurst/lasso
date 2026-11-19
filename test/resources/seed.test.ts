import { describe, expect, it } from 'vitest';
import { builtInResources } from '#src/resources/built-in.ts';
import { seedResources } from '#src/resources/seed.ts';
import { validateResource } from '#src/resources/validate.ts';
import { LASSO_ADMIN_SCOPE } from '#src/resources/scopes.ts';

describe('seedResources', () => {
  it('only holds resources that pass validation', () => {
    for (const seed of seedResources) {
      const problem = validateResource(seed.metadata, seed.app, {
        scopes: [LASSO_ADMIN_SCOPE],
        resources: ['https://lasso.example.com'],
      });
      expect(problem, seed.metadata.resource_name).toBeUndefined();
    }
  });

  it('is what the built-in resources serve, plus Lasso itself', () => {
    expect(builtInResources.map((r) => r.indicator)).toEqual([
      ...seedResources.map((s) => s.resource),
      'https://lasso.example.com',
    ]);
  });

  it('keeps each stored key equal to the resource inside its metadata', () => {
    for (const seed of seedResources) {
      expect(seed.metadata.resource).toBe(seed.resource);
    }
  });
});
