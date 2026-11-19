import type { IncomingMessage, ServerResponse } from 'node:http';

export type RequestHandler = (req: IncomingMessage, res: ServerResponse) => unknown;

interface BuiltApp {
  handler: RequestHandler;
  /** What the app was built from; the app is rebuilt when this no longer matches the current version. */
  version: string;
}

/**
 * A request handler that rebuilds the app when what it is built from changes.
 * The version is re-read at most once per `ttlMs`; a failed check or rebuild
 * keeps serving the current app and is tried again after the next interval.
 */
export interface LiveApp {
  handler: RequestHandler;
  /** Makes the next request look for a change at once instead of waiting out the interval. */
  invalidate: () => void;
}

export async function createLiveApp(options: {
  build: () => Promise<BuiltApp>;
  readVersion: () => Promise<string>;
  ttlMs: number;
  now?: () => number;
  onError?: (error: unknown) => void;
  onRebuild?: (version: string) => void;
}): Promise<LiveApp> {
  const now = options.now ?? Date.now;
  let current = await options.build();
  let checkedAt = now();
  let refreshing: Promise<void> | undefined;

  async function refresh(): Promise<void> {
    try {
      if ((await options.readVersion()) !== current.version) {
        current = await options.build();
        options.onRebuild?.(current.version);
      }
    } catch (error) {
      options.onError?.(error);
    } finally {
      checkedAt = now();
    }
  }

  return {
    handler: async (req, res) => {
      if (now() - checkedAt >= options.ttlMs) {
        refreshing ??= refresh().finally(() => {
          refreshing = undefined;
        });
        await refreshing;
      }
      return current.handler(req, res);
    },
    invalidate: () => {
      checkedAt = Number.NEGATIVE_INFINITY;
    },
  };
}
