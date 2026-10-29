import { setupInstall } from './install.js';
import { setupSkillBanner } from './skill-banner.js';

const cards = [...document.querySelectorAll('.skill-card')];
const search = document.querySelector('#skill-search');
const filters = [...document.querySelectorAll('[data-category]')].filter(element => element.tagName === 'BUTTON');
let category = 'All';

function filterSkills() {
  const query = search.value.trim().toLowerCase();
  let count = 0;
  for (const card of cards) {
    card.hidden = !((category === 'All' || card.dataset.category === category) && card.textContent.toLowerCase().includes(query));
    if (!card.hidden) count++;
  }
  document.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'skill' : 'skills'}${query || category !== 'All' ? ' found' : ''}`;
  document.querySelector('#empty-state').hidden = count !== 0;
}

for (const button of filters) {
  button.addEventListener('click', () => {
    category = button.dataset.category;
    for (const filter of filters) filter.setAttribute('aria-pressed', String(filter === button));
    filterSkills();
  });
}
search.addEventListener('input', filterSkills);
document.querySelector('#reset-filters').addEventListener('click', () => {
  search.value = '';
  filters[0].click();
  search.focus();
});
document.querySelector('#catalog-toolbar').hidden = false;

setupSkillBanner(document.querySelector('.skill-banner'), cards);

setupInstall();
