import { setupInstall } from './install.js';

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

const previewButtons = [...document.querySelectorAll('[data-preview]')];
for (const button of previewButtons) {
  button.hidden = false;
  button.addEventListener('click', () => {
    const card = cards.find(item => item.dataset.skill === button.dataset.preview);
    document.querySelector('#demo-command').textContent = card.dataset.command;
    document.querySelector('#demo-description').textContent = card.querySelector('.card-tagline').textContent;
    document.querySelector('#demo-steps').textContent = card.dataset.steps;
    for (const preset of document.querySelectorAll('.demo-presets button')) {
      preset.setAttribute('aria-pressed', String(preset.dataset.preview === button.dataset.preview));
    }
    if (button.classList.contains('preview-button')) {
      const terminal = document.querySelector('.terminal');
      terminal.focus({ preventScroll: true });
      terminal.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  });
}

setupInstall();
