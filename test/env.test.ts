import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadEnv() {
  vi.resetModules();
  return (await import('#src/env.ts')).env;
}

beforeEach(() => {
  vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', undefined);
  vi.stubEnv('LASSO_ORIGIN_VERIFY_SSM_PARAM', undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('env.originVerifySsmParam', () => {
  it('is the configured parameter in Lambda', async () => {
    vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', 'lj-lasso');
    vi.stubEnv('LASSO_ORIGIN_VERIFY_SSM_PARAM', '/lasso/origin-verify');

    expect((await loadEnv()).originVerifySsmParam).toBe('/lasso/origin-verify');
  });

  it('refuses to start in Lambda without the parameter', async () => {
    vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', 'lj-lasso');

    await expect(loadEnv()).rejects.toThrow(
      'missing required environment variable: LASSO_ORIGIN_VERIFY_SSM_PARAM',
    );
  });

  it('is unset outside Lambda when not configured', async () => {
    expect((await loadEnv()).originVerifySsmParam).toBeUndefined();
  });

  it('is the configured parameter outside Lambda when set', async () => {
    vi.stubEnv('LASSO_ORIGIN_VERIFY_SSM_PARAM', '/lasso/origin-verify');

    expect((await loadEnv()).originVerifySsmParam).toBe('/lasso/origin-verify');
  });
});
