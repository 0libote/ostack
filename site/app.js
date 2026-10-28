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

const agentButtons = [...document.querySelectorAll('[data-agent]')];
const copyStatus = document.querySelector('#copy-status');
for (const button of agentButtons) {
  button.hidden = false;
  button.addEventListener('click', () => {
    for (const agent of agentButtons) agent.setAttribute('aria-pressed', String(agent === button));
    const directory = button.dataset.agent === 'codex' ? '.codex' : '.claude';
    document.querySelector('#install-command').textContent = `git clone https://github.com/0libote/ostack\nmkdir -p ~/${directory}/skills\ncp -R ostack/skills/* ~/${directory}/skills/`;
    copyStatus.textContent = '';
  });
}
const copyButton = document.querySelector('#copy-install');
copyButton.hidden = false;
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.querySelector('#install-command').textContent);
    copyStatus.textContent = 'Copied. Paste into your terminal to install.';
  } catch {
    copyStatus.textContent = 'Clipboard unavailable. Select and copy the commands above.';
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#install-command'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
});
