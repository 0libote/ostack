import { fileURLToPath } from 'node:url';
import { readdir, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dependencies = {
  'full-send': ['agent-loop', 'file-pr', 'babysit-pr'],
  'full-stop': ['full-send'],
  takeover: ['modernize', 'file-pr', 'babysit-pr'],
  tldr: ['humanizer', 'rich-chat']
};
const notes = {
  'full-send': 'Owns the work through merge. Use full-stop when you want to make the final merge yourself.',
  'full-stop': 'Prepares the pull request for your final decision. This skill never merges it.',
  council: 'Needs access to models from different providers. Available reviewers depend on your harness.',
  'agent-loop': 'Name the reviewer model you want to use. The skill asks when you have not chosen one.',
  hallmark: 'Name Hallmark explicitly when you want to redesign or audit an existing page.',
  ponytail: 'Supports lite, full, and ultra levels. Full is the default.'
};
export const escapeHTML = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export async function generateSkillPages() {
  const source = await Bun.file(new URL('site/index.html', root)).text();
  const catalogPage = await Bun.file(new URL('site/skills/index.html', root)).text();
  const catalog = [];
  let current;
  await new HTMLRewriter()
    .on('.skill-card', { element(el) {
      current = { slug: el.getAttribute('data-skill'), category: el.getAttribute('data-category'), command: el.getAttribute('data-command'), steps: el.getAttribute('data-steps').split(' → '), title: '', description: '' };
      catalog.push(current);
    } })
    .on('.skill-card .card-tagline', { text(chunk) { current.title += chunk.text; } })
    .on('.skill-card .card-description', { text(chunk) { current.description += chunk.text; } })
    .transform(new Response(catalogPage)).text();
  const bySlug = new Map(catalog.map(skill => [skill.slug, skill]));
  const installed = [...new Bun.Glob('skills/*/SKILL.md').scanSync({ cwd: fileURLToPath(root) })].map(path => path.split('/')[1]).sort();
  if (JSON.stringify([...bySlug.keys()].sort()) !== JSON.stringify(installed) || bySlug.size !== catalog.length) {
    throw new Error('The catalog must contain exactly one entry per skill');
  }
  const section = source.match(/<section class="install-section[\s\S]*?<\/section>/)[0];
  const footer = source.match(/<footer[\s\S]*?<\/footer>/)[0].replace('href="#"', 'href="/"');
  for (const entry of await readdir(new URL('site/skills/', root), { withFileTypes: true })) {
    if (entry.isDirectory()) await rm(new URL(`site/skills/${entry.name}/`, root), { recursive: true, force: true });
  }
  const entries = ['site/index.html', 'site/skills/index.html', 'site/plugins/index.html', 'site/bun/index.html'].map(path => fileURLToPath(new URL(path, root)));
  for (const skill of catalog) {
    const installSkills = new Set();
    function include(slug) {
      if (!bySlug.has(slug)) throw new Error(`Unknown dependency: ${slug}`);
      if (installSkills.has(slug)) return;
      installSkills.add(slug);
      for (const dependency of dependencies[slug] || []) include(dependency);
    }
    include(skill.slug);
    const extraSkills = [...installSkills].filter(slug => slug !== skill.slug);
    const link = slug => `<a href="/skills/${slug}/">${escapeHTML(slug)}</a>`;
    const instructions = await Bun.file(new URL(`skills/${skill.slug}/SKILL.md`, root)).text();
    const related = catalog.filter(other => other.slug !== skill.slug && other.category === skill.category).slice(0, 3);
    const install = await new HTMLRewriter()
      .on('#install', { element(el) { el.setAttribute('data-install-skills', [...installSkills].join(' ')); } })
      .on('#install-title', { element(el) { el.setInnerContent(`Install ${escapeHTML(skill.slug)}`, { html: true }); } })
      .on('#install-hint', { element(el) { el.setInnerContent('Uses the skills CLI. Requires Node.js and npm; installs the skills listed in the command.'); } })
      .on('#install-command', { element(el) { el.setInnerContent(`npx skills add 0libote/ostack --agent claude-code --global --skill ${[...installSkills].join(' ')}`); } })
      .on('img[src]', { element(el) { el.setAttribute('src', '../../' + el.getAttribute('src')); } })
      .transform(new Response(section)).text();
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101317">
  <meta name="description" content="${escapeHTML(skill.description)}">
  <title>${escapeHTML(skill.slug)} | ostack</title>
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../../styles.css">
  <script src="../../skill.js" type="module"></script>
</head>
<body class="skill-page">
<a class="skip-link" href="#skill-content">Skip to skill</a>
<header class="site-header wrap">
  <a class="wordmark" href="/" aria-label="ostack home"><span class="logo" aria-hidden="true">≋</span>ostack<span class="wordmark-dot">.</span></a>
  <nav aria-label="Main navigation"><a href="/skills/">All skills</a><a href="#install">Install</a><a href="https://github.com/0libote/ostack">GitHub</a></nav>
</header>
<main id="skill-content">
  <section class="skill-intro wrap" aria-labelledby="skill-title">
    <div><h1 id="skill-title">${escapeHTML(skill.slug)}</h1><p class="skill-pitch">${escapeHTML(skill.title)}</p><p class="skill-description">${escapeHTML(skill.description)}</p>
      <div class="hero-actions"><a class="button primary" href="#install">Install this skill</a><a class="text-link" href="https://github.com/0libote/ostack/tree/main/skills/${skill.slug}">View source</a></div>
    </div>
    <div class="skill-invocation"><h2>Ask your agent</h2><pre tabindex="0" aria-label="Skill invocation"><code>${escapeHTML(skill.command)}</code></pre><p>Start a new session after installing, then use this command in your project.</p></div>
  </section>
  <section class="skill-workflow wrap" aria-labelledby="workflow-title"><h2 id="workflow-title">How it works</h2><ol>${skill.steps.map(step => `<li>${escapeHTML(step)}</li>`).join('')}</ol>${notes[skill.slug] ? `<p class="skill-note">${escapeHTML(notes[skill.slug])}</p>` : ''}</section>
  ${extraSkills.length ? `<section class="skill-dependencies wrap" aria-labelledby="dependencies-title"><h2 id="dependencies-title">Works with</h2><p>The install commands include these required skills.</p><div class="skill-links">${extraSkills.map(link).join('')}</div></section>` : ''}
  ${install}
  <section class="skill-instructions wrap"><details><summary>Read the skill instructions</summary><p>The full SKILL.md, as shipped in this collection. Supporting files are in the source repository.</p><pre tabindex="0" aria-label="Full skill instructions"><code>${escapeHTML(instructions)}</code></pre></details></section>
  <section class="skill-related wrap" aria-labelledby="related-title"><h2 id="related-title">More to ${escapeHTML(skill.category.toLowerCase())}</h2><div class="related-list">${related.map(other => `<a href="/skills/${other.slug}/"><span>${escapeHTML(other.slug)}</span><span>${escapeHTML(other.title)}</span></a>`).join('')}</div><a class="text-link" href="/skills/">Browse all skills</a></section>
</main>
${footer}
</body>
</html>`;
    const page = new URL(`site/skills/${skill.slug}/index.html`, root);
    await Bun.write(page, html);
    entries.push(fileURLToPath(page));
  }
  return entries;
}

if (import.meta.main) console.log(`Generated ${(await generateSkillPages()).length - 2} skill pages`);
