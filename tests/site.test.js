import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readme = await Bun.file(new URL('README.md', root)).text();
const pages = [];
for (const [path, file] of [['/', 'site/index.html'], ['/skills/', 'site/skills/index.html'], ['/bun/', 'site/bun/index.html']]) {
  const page = { path, cards: [], links: [], ids: [], agents: [], banner: { links: [] } };
  await new HTMLRewriter()
    .on('.skill-banner', { element(el) { page.banner.label = el.getAttribute('aria-label'); } })
    .on('.banner-list a', { element(el) { page.banner.links.push(el.getAttribute('href')); } })
    .on('#toggle-banner', { element(el) { page.banner.controlHidden = el.hasAttribute('hidden'); page.banner.controlLabel = el.getAttribute('aria-label'); } })
    .on('article.skill-card', { element(el) {
      page.cards.push(Object.fromEntries(['skill', 'category', 'command', 'steps'].map(key => [key, el.getAttribute(`data-${key}`)])));
    } })
    .on('[id]', { element(el) { page.ids.push(el.getAttribute('id')); } })
    .on('[href]', { element(el) { page.links.push(el.getAttribute('href')); } })
    .on('[src]', { element(el) { page.links.push(el.getAttribute('src')); } })
    .on('button[data-agent]', { element(el) {
      page.agents.push(Object.fromEntries(['agent', 'global', 'project'].map(key => [key, el.getAttribute(`data-${key}`)])));
    } })
    .transform(new Response(await Bun.file(new URL(file, root)).text())).text();
  pages.push(page);
}
const [home, catalog] = pages;
const skills = [...new Bun.Glob('skills/*/SKILL.md').scanSync({ cwd: fileURLToPath(root) })]
  .map(path => path.split('/')[1]).sort();

test('catalog lives on its own page and represents every installed skill', () => {
  expect(home.cards).toHaveLength(0);
  expect(home.ids).not.toContain('skills-title');
  expect(home.links).toContain('/skills/');
  expect(catalog.cards.map(card => card.skill).sort()).toEqual(skills);
  for (const card of catalog.cards) {
    expect(catalog.links).toContain(`/skills/${card.skill}/`);
    expect(['Ship', 'Review', 'Create', 'Maintain']).toContain(card.category);
    expect(card.command).toBeTruthy();
    expect(card.steps).toBeTruthy();
  }
});

test('local links and assets exist, and IDs are unique on each page', async () => {
  for (const page of pages) {
    expect(new Set(page.ids).size).toBe(page.ids.length);
    for (const link of page.links) {
      const target = new URL(link, `https://ostack.test${page.path}`);
      if (target.origin !== 'https://ostack.test') continue;
      const targetPage = pages.find(other => other.path === target.pathname);
      if (targetPage) {
        if (target.hash) expect(targetPage.ids).toContain(target.hash.slice(1));
      } else if (target.pathname.startsWith('/skills/')) {
        expect(skills).toContain(target.pathname.split('/')[2]);
      } else {
        await access(new URL(`site${target.pathname}`, root));
      }
    }
  }
});

test('README documents every installation target and directory', () => {
  expect(home.agents).toHaveLength(6);
  for (const agent of home.agents) {
    const row = readme.split('\n').find(line => line.includes(`\`${agent.agent}\` |`));
    expect(row).toContain(`\`${agent.global}\``);
    expect(row).toContain(`\`${agent.project}\``);
  }
  expect(home.links).not.toContain('https://github.com/0libote/ostack#requirements');
});

test('homepage banner provides every skill link without JavaScript', () => {
  expect(home.banner.label).toBe('Explore the skills');
  expect(home.banner.links).toEqual(catalog.cards.map(card => `/skills/${card.skill}/`));
  expect(home.banner.controlHidden).toBe(true);
  expect(home.banner.controlLabel).toBe('Pause moving skill names');
});
