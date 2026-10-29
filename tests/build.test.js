import { beforeAll, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { escapeHTML } from '../scripts/generate-pages.js';
import { getInstallCommand } from '../site/install.js';
import { access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
beforeAll(async () => { await import('../scripts/build.js'); });

test('production build includes its assets, security policy, licenses, and separate no-script catalog', async () => {
  const output = new URL('dist/', root);
  const html = await Bun.file(new URL('index.html', output)).text();
  const assets = [];
  let cards = 0;
  await new HTMLRewriter()
    .on('[src]', { element(el) { assets.push(el.getAttribute('src')); } })
    .on('link[href]', { element(el) { assets.push(el.getAttribute('href')); } })
    .on('article.skill-card', { element() { cards++; } })
    .transform(new Response(html)).text();
  expect(cards).toBe(0);
  expect(html).not.toContain('What needs doing?');
  expect(html).toContain('href="/skills/"');
  const catalogPage = new URL('skills/index.html', output);
  const catalog = await Bun.file(catalogPage).text();
  const catalogAssets = [];
  let catalogCards = 0;
  await new HTMLRewriter()
    .on('article.skill-card', { element() { catalogCards++; } })
    .on('[src]', { element(el) { catalogAssets.push(el.getAttribute('src')); } })
    .on('link[href]', { element(el) { catalogAssets.push(el.getAttribute('href')); } })
    .transform(new Response(catalog)).text();
  expect(catalogCards).toBe([...new Bun.Glob('skills/*/SKILL.md').scanSync({ cwd: fileURLToPath(root) })].length);
  expect(catalog).toContain('<title>Skills | ostack</title>');
  for (const asset of catalogAssets) await access(new URL(asset, catalogPage));
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


test('every skill has a built page with working assets, routes, and its exact instructions', async () => {
  const output = new URL('dist/', root);
  const skills = [...new Bun.Glob('skills/*/SKILL.md').scanSync({ cwd: fileURLToPath(root) })].map(path => path.split('/')[1]).sort();
  const pages = [...new Bun.Glob('skills/*/index.html').scanSync({ cwd: fileURLToPath(output) })].map(path => path.split('/')[1]).sort();
  expect(pages).toEqual(skills);
  for (const slug of skills) {
    const page = new URL(`skills/${slug}/index.html`, output);
    const html = await Bun.file(page).text();
    const instructions = await Bun.file(new URL(`skills/${slug}/SKILL.md`, root)).text();
    expect(html).toContain(`<title>${slug} | ostack</title>`);
    expect(html).toContain(escapeHTML(instructions));
    expect(html).toContain('href="/skills/"');
    expect(html).not.toContain('href="/#skills"');
    const ids = [], links = [], assets = [];
    let scripts = 0;
    await new HTMLRewriter()
      .on('[id]', { element(el) { ids.push(el.getAttribute('id')); } })
      .on('a[href]', { element(el) { links.push(el.getAttribute('href')); } })
      .on('[src]', { element(el) { assets.push(el.getAttribute('src')); } })
      .on('link[href]', { element(el) { assets.push(el.getAttribute('href')); } })
      .on('script', { element() { scripts++; } })
      .transform(new Response(html)).text();
    expect(new Set(ids).size).toBe(ids.length);
    expect(scripts).toBe(1);
    for (const asset of assets) await access(new URL(asset, page));
    for (const href of links) {
      if (href.startsWith('https://')) continue;
      if (href.startsWith('#')) expect(ids).toContain(href.slice(1));
      else {
        const target = new URL(href, 'https://ostack.test');
        const file = new URL(`.${target.pathname}${target.pathname.endsWith('/') ? 'index.html' : ''}`, output);
        await access(file);
      }
    }
  }
});

test('skill installers include transitive dependencies and keep the collection installer intact', async () => {
  let selected;
  await new HTMLRewriter().on('#install', { element(el) { selected = el.getAttribute('data-install-skills').split(' '); } })
    .transform(new Response(await Bun.file(new URL('dist/skills/full-stop/index.html', root)).text())).text();
  expect(selected).toEqual(['full-stop', 'full-send', 'agent-loop', 'file-pr', 'leaving-pr-comments', 'babysit-pr']);
  const agent = { agent: 'codex', global: '~/.agents/skills', project: '.agents/skills' };
  expect(getInstallCommand(agent, 'cli', 'global', selected)).toBe(`npx skills add 0libote/ostack --agent codex --global --skill ${selected.join(' ')}`);
  const copy = getInstallCommand(agent, 'copy', 'project', selected);
  const link = getInstallCommand(agent, 'link', 'global', selected);
  for (const slug of selected) {
    expect(copy).toContain(`ostack/skills/${slug}`);
    expect(link).toContain(`"$PWD"/ostack/skills/${slug}`);
  }
  expect(copy).not.toContain('skills/*');
  expect(link).not.toContain('skills/*');
  expect(getInstallCommand(agent, 'copy', 'global')).toContain('cp -R ostack/skills/* ~/.agents/skills/');
  expect(getInstallCommand(agent, 'cli', 'global')).not.toContain('--skill');
});

test('skill source is escaped as text, including HTML examples', () => {
  expect(escapeHTML('<script>alert("example")</script> & data')).toBe('&lt;script&gt;alert(&quot;example&quot;)&lt;/script&gt; &amp; data');
});
