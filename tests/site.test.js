import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = await Bun.file(new URL('site/index.html', root)).text();
const readme = await Bun.file(new URL('README.md', root)).text();
const cards = [], links = [], ids = [], agents = [];
const banner = { links: [] };
await new HTMLRewriter()
  .on('.skill-banner', { element(el) { banner.label = el.getAttribute('aria-label'); } })
  .on('.banner-list a', { element(el) { banner.links.push(el.getAttribute('href')); } })
  .on('#toggle-banner', { element(el) { banner.controlHidden = el.hasAttribute('hidden'); banner.controlLabel = el.getAttribute('aria-label'); } })
  .on('article.skill-card', { element(el) {
    cards.push(Object.fromEntries(['skill', 'category', 'command', 'steps'].map(key => [key, el.getAttribute(`data-${key}`)])));
  } })
  .on('[id]', { element(el) { ids.push(el.getAttribute('id')); } })
  .on('[href]', { element(el) { links.push(el.getAttribute('href')); } })
  .on('[src]', { element(el) { links.push(el.getAttribute('src')); } })
  .on('button[data-agent]', { element(el) {
    agents.push(Object.fromEntries(['agent', 'global', 'project'].map(key => [key, el.getAttribute(`data-${key}`)])));
  } })
  .transform(new Response(source)).text();

const skills = [...new Bun.Glob('skills/*/SKILL.md').scanSync({ cwd: fileURLToPath(root) })]
  .map(path => path.split('/')[1]).sort();

test('catalog represents every installed skill and keeps its preview data', () => {
  const prefix = '/skills/';
  expect([...new Set(links.filter(link => link.startsWith(prefix)))].map(link => link.slice(prefix.length, -1)).sort()).toEqual(skills);
  expect(cards.map(card => card.skill).sort()).toEqual(skills);
  for (const card of cards) {
    expect(['Ship', 'Review', 'Create', 'Maintain']).toContain(card.category);
    expect(card.command).toBeTruthy();
    expect(card.steps).toBeTruthy();
  }
});

test('local links and assets exist, and IDs are unique', async () => {
  expect(new Set(ids).size).toBe(ids.length);
  for (const link of links) {
    if (link.startsWith('#')) {
      if (link !== '#') expect(ids).toContain(link.slice(1));
    } else if (link.startsWith('/skills/')) {
      expect(skills).toContain(link.split('/')[2]);
    } else if (!link.startsWith('https://')) {
      await access(new URL(link, new URL('site/', root)));
    }
  }
});

test('README documents every installation target and directory', () => {
  expect(agents).toHaveLength(6);
  for (const agent of agents) {
    const row = readme.split('\n').find(line => line.includes(`\`${agent.agent}\` |`));
    expect(row).toContain(`\`${agent.global}\``);
    expect(row).toContain(`\`${agent.project}\``);
  }
  expect(links).not.toContain('https://github.com/0libote/ostack#requirements');
});


test('skill banner provides every skill link without JavaScript', () => {
  expect(banner.label).toBe('Explore the skills');
  expect(banner.links).toEqual(cards.map(card => `/skills/${card.skill}/`));
  expect(banner.controlHidden).toBe(true);
  expect(banner.controlLabel).toBe('Pause moving skill names');
});
