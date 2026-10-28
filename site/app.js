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
const methodButtons = [...document.querySelectorAll('[data-method]')];
const scopeButtons = [...document.querySelectorAll('[data-scope]')];
const copyStatus = document.querySelector('#copy-status');
const installCommand = document.querySelector('#install-command');
const installHints = {
  cli: 'Uses the skills CLI. Requires Node.js and npm; choose the skills in its prompts.',
  copy: 'Requires Git and a Unix shell. Copies the skills into your harness’s folder.',
  link: 'Requires Git and a Unix shell. Keep the checkout: edits there are available through the links.'
};

function updateInstall() {
  const agent = agentButtons.find(button => button.getAttribute('aria-pressed') === 'true');
  const method = methodButtons.find(button => button.getAttribute('aria-pressed') === 'true').dataset.method;
  const scope = scopeButtons.find(button => button.getAttribute('aria-pressed') === 'true').dataset.scope;
  const directory = agent.dataset[scope];
  if (method === 'cli') {
    installCommand.textContent = `npx skills add 0libote/ostack --agent ${agent.dataset.agent}${scope === 'global' ? ' --global' : ''}`;
  } else {
    const install = method === 'copy'
      ? `cp -R ostack/skills/* ${directory}/`
      : `for skill in "$PWD"/ostack/skills/*; do\n  ln -s "$skill" ${directory}/\ndone`;
    installCommand.textContent = `git clone https://github.com/0libote/ostack\nmkdir -p ${directory}\n${install}`;
  }
  const selection = `${agent.textContent} / ${scope === 'global' ? 'all projects' : 'this project'}`;
  document.querySelector('#install-destination').textContent = selection;
  document.querySelector('#install-hint').textContent = installHints[method];
  document.querySelector('#install-scope-hint').textContent = scope === 'global'
    ? 'Available across your projects. Start a new agent session after installing.'
    : 'Run from your project root. Start a new agent session after installing.';
  document.querySelector('#install-selection').textContent = `${selection}. ${methodButtons.find(button => button.dataset.method === method).textContent}. Commands updated.`;
  copyStatus.textContent = '';
}

for (const buttons of [agentButtons, methodButtons, scopeButtons]) {
  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const option of buttons) option.setAttribute('aria-pressed', String(option === button));
      updateInstall();
    });
  }
}
document.querySelector('#install-agents').hidden = false;
document.querySelector('#install-controls').hidden = false;
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
