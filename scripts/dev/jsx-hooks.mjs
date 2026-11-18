import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

export async function load(url, context, nextLoad) {
  if (context.importAttributes?.type === 'text') {
    const text = await readFile(fileURLToPath(url), 'utf8');
    return { format: 'module', source: `export default ${JSON.stringify(text)};`, shortCircuit: true };
  }

  if (!url.endsWith('.tsx')) {
    return nextLoad(url, context);
  }

  const source = await readFile(fileURLToPath(url), 'utf8');
  const { code } = await esbuild.transform(source, {
    loader: 'tsx',
    format: 'esm',
    jsx: 'automatic',
    jsxImportSource: '@kitajs/html',
    sourcefile: fileURLToPath(url),
  });

  return { format: 'module', source: code, shortCircuit: true };
}
