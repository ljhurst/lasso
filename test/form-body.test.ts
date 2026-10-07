import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import Koa from 'koa';
import { describe, expect, it } from 'vitest';
import { readForm } from '#src/form-body.ts';

function contextFor(body: string, contentType: string): Koa.Context {
  const req = new IncomingMessage(new Socket());
  req.headers = { 'content-type': contentType, 'content-length': String(Buffer.byteLength(body)) };
  req.push(body);
  req.push(null);
  return new Koa().createContext(req, new ServerResponse(req));
}

describe('readForm', () => {
  it('decodes url-encoded fields, including + as space and percent escapes', async () => {
    const form = await readForm(
      contextFor(
        'email=a%2Bb%40example.com&password=two+words',
        'application/x-www-form-urlencoded',
      ),
    );
    expect(form.get('email')).toBe('a+b@example.com');
    expect(form.get('password')).toBe('two words');
  });

  it('accepts a charset parameter on the content type', async () => {
    const form = await readForm(
      contextFor('role=victoria%3Aread', 'application/x-www-form-urlencoded; charset=UTF-8'),
    );
    expect(form.get('role')).toBe('victoria:read');
  });

  it('returns empty params for a non-form content type', async () => {
    const form = await readForm(contextFor('{"email":"x"}', 'application/json'));
    expect([...form.keys()]).toEqual([]);
  });

  it('rejects bodies over the size limit with 413', async () => {
    const ctx = contextFor(`a=${'x'.repeat(60 * 1024)}`, 'application/x-www-form-urlencoded');
    await expect(readForm(ctx)).rejects.toMatchObject({ status: 413 });
  });
});
