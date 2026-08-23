#!/usr/bin/env node
// One-time bootstrap: stores the single hardcoded login credential
// (DESIGN §6) in SSM Parameter Store as a scrypt hash + salt, matching
// what src/interactions/credentials.ts verifies against. Prompts for the
// password interactively rather than taking it as a CLI arg, so it never
// lands in shell history or process listings — generate it with a
// password manager, paste it at the prompt.
//
// Deliberately doesn't use node:readline: its question() only supports one
// in-flight prompt per Interface on a non-TTY (piped) stdin — a second
// sequential call never resolves (reproduced independently of this script;
// it's a Node limitation, not something to work around with more
// buffering). The reader below handles both real terminals and piped
// input itself instead.
import { randomBytes, scrypt } from 'node:crypto';
import { parseArgs, promisify } from 'node:util';

import { PutParameterCommand } from '@aws-sdk/client-ssm';

import { createSsmClient, getExistingValue } from './ssm.ts';

const scryptAsync = promisify(scrypt);
const SCRYPT_KEY_LENGTH = 64;

const ENTER_CHARS = new Set([String.fromCharCode(10), String.fromCharCode(13)]);
const BACKSPACE_CHARS = new Set([String.fromCharCode(8), String.fromCharCode(127)]);
const CTRL_C = String.fromCharCode(3);
const CTRL_D = String.fromCharCode(4);

const { values } = parseArgs({
  options: {
    username: { type: 'string' },
    'param-name': { type: 'string', default: '/lasso/login-credential' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
    force: { type: 'boolean', default: false },
  },
});

interface LineReader {
  readLine(question: string, masked: boolean): Promise<string>;
  close(): void;
}

// Real terminal: raw mode, one keypress at a time, echoing input back
// ourselves (raw mode disables the terminal's own echo) unless masked.
function createTtyReader(): LineReader {
  return {
    readLine(question: string, masked: boolean): Promise<string> {
      process.stdout.write(question);
      return new Promise((resolve) => {
        const chars: string[] = [];

        function cleanup(): void {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
        }

        function onData(char: string): void {
          if (ENTER_CHARS.has(char) || char === CTRL_D) {
            cleanup();
            process.stdout.write('\n');
            resolve(chars.join(''));
            return;
          }
          if (char === CTRL_C) {
            cleanup();
            process.stdout.write('\n');
            process.exit(130);
          }
          if (BACKSPACE_CHARS.has(char)) {
            chars.pop();
            return;
          }
          chars.push(char);
          if (!masked) {
            process.stdout.write(char);
          }
        }

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', onData);
      });
    },
    close(): void {},
  };
}

// Piped/non-interactive stdin: no masking is possible anyway, so just
// buffer the whole stream up front and hand back one line per call.
function createPipedReader(): LineReader {
  const linesReady = new Promise<string[]>((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').split('\n')));
  });
  let lines: string[] | undefined;

  return {
    async readLine(question: string): Promise<string> {
      lines ??= await linesReady;
      process.stdout.write(question);
      const line = lines.shift() ?? '';
      process.stdout.write(`${line}\n`);
      return line;
    },
    close(): void {},
  };
}

async function main(): Promise<void> {
  const client = createSsmClient(values.profile, values.region);

  if (!values.force && (await getExistingValue(client, values['param-name']))) {
    throw new Error(
      `${values['param-name']} already holds a real value — pass --force to overwrite.`,
    );
  }

  const reader = process.stdin.isTTY ? createTtyReader() : createPipedReader();
  try {
    const username = values.username ?? (await reader.readLine('Username: ', false));
    const password = await reader.readLine(
      'Password (generate one with your password manager): ',
      true,
    );
    const confirm = await reader.readLine('Confirm password: ', true);
    if (password !== confirm) {
      throw new Error('passwords did not match');
    }

    const salt = randomBytes(16);
    const hash = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;

    await client.send(
      new PutParameterCommand({
        Name: values['param-name'],
        Value: JSON.stringify({
          username,
          salt: salt.toString('hex'),
          hash: hash.toString('hex'),
        }),
        Type: 'SecureString',
        Overwrite: true,
      }),
    );
    console.log(`Stored credentials for "${username}" in ${values['param-name']}.`);
  } finally {
    reader.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
