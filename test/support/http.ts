import { createServer, type RequestListener } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface TestServer {
  baseUrl: string;
  close: () => void;
}

/** Serves a request listener on a free port for the length of a test file. */
export async function serve(listener: RequestListener): Promise<TestServer> {
  const server = createServer(listener);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${port}`, close: () => server.close() };
}

/** Posts form fields as a browser would; a repeated field takes an array. */
export function postForm(
  url: string,
  fields: Record<string, string | string[]>,
  options: { headers?: Record<string, string>; redirect?: 'follow' | 'manual' | 'error' } = {},
): Promise<Response> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of [value].flat()) {
      body.append(key, item);
    }
  }
  return fetch(url, {
    method: 'POST',
    redirect: options.redirect,
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...options.headers },
    body,
  });
}
