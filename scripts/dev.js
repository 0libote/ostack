import { generateSkillPages } from './generate-pages.js';

const routes = {};
for (const entry of await generateSkillPages()) {
  const page = (await import(entry)).default;
  const slug = entry.match(/\/site\/skills\/([^/]+)\/index\.html$/)?.[1];
  if (slug) {
    routes[`/skills/${slug}`] = page;
    routes[`/skills/${slug}/`] = page;
  } else if (entry.endsWith('/site/skills/index.html')) {
    routes['/skills'] = page;
    routes['/skills/'] = page;
  } else {
    routes['/'] = page;
  }
}
const server = Bun.serve({
  port: Number(process.env.PORT || 3000),
  routes,
  development: { hmr: true },
  fetch() { return new Response('Not found', { status: 404 }); }
});
console.log(`ostack dev server: ${server.url}`);
