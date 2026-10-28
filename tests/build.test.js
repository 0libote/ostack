import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('production build includes its assets, security policy, licenses, and no-script catalog', async () => {
  await import('../scripts/build.js');
  const output = new URL('dist/', root);
  const html = await Bun.file(new URL('index.html', output)).text();
  const assets = [];
  let cards = 0;
  await new HTMLRewriter()
    .on('[src]', { element(el) { assets.push(el.getAttribute('src')); } })
    .on('link[href]', { element(el) { assets.push(el.getAttribute('href')); } })
    .on('article.skill-card', { element() { cards++; } })
    .transform(new Response(html)).text();
  expect(cards).toBe([...new Bun.Glob('skills/*/SKILL.md').scanSync({ cwd: fileURLToPath(root) })].length);
  expect(assets.some(path => path.endsWith('.js'))).toBe(true);
  expect(assets.some(path => path.endsWith('.css'))).toBe(true);
  for (const asset of assets) await access(new URL(asset, output));
  for (const cssPath of assets.filter(path => path.endsWith('.css'))) {
    const css = await Bun.file(new URL(cssPath, output)).text();
    for (const match of css.matchAll(/url\(["']?([^\s"')]+)["']?\)/g)) {
      if (match[1].startsWith('data:')) {
        expect(match[1]).toStartWith('data:font/');
      } else {
        await access(new URL(match[1], new URL(cssPath, output)));
      }
    }
  }
  const headers = await Bun.file(new URL('_headers', output)).text();
  expect(headers).toBe(await Bun.file(new URL('site/_headers', root)).text());
  expect(headers).toContain("font-src 'self' data:");
  expect(headers).toContain("script-src 'self'");
  for (const license of ['ostack.txt', 'host-grotesk.txt', 'atkinson-mono.txt', 'LICENSE.txt', 'logos.md']) {
    expect(await Bun.file(new URL(`licenses/${license}`, output)).text()).not.toBe('');
  }
}, 15000);
