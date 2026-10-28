import { fileURLToPath } from 'node:url';
import { copyFile, mkdir, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [fileURLToPath(new URL('site/index.html', root))],
  outdir: fileURLToPath(output),
  target: 'browser',
  minify: true
});
if (!result.success) throw new AggregateError(result.logs, 'Site build failed');

await copyFile(new URL('site/_headers', root), new URL('_headers', output));
await mkdir(new URL('licenses/', output), { recursive: true });
for (const [source, destination] of [
  ['LICENSE', 'ostack.txt'],
  ['site/fonts/Host-Grotesk-LICENSE.txt', 'host-grotesk.txt'],
  ['site/fonts/Atkinson-Mono-LICENSE.txt', 'atkinson-mono.txt'],
  ['site/logos/LICENSE.txt', 'LICENSE.txt'],
  ['site/logos/README.md', 'logos.md']
]) {
  await copyFile(new URL(source, root), new URL(`licenses/${destination}`, output));
}
console.log(`Built ${result.outputs.length} site assets in dist/`);
