export function getInstallCommand(agent, method, scope, skills = []) {
  const directory = agent[scope];
  if (method === 'cli') {
    return `npx skills add 0libote/ostack --agent ${agent.agent}${scope === 'global' ? ' --global' : ''}${skills.length ? ` --skill ${skills.join(' ')}` : ''}`;
  }
  const sources = skills.length ? skills.map(name => `ostack/skills/${name}`).join(' ') : 'ostack/skills/*';
  const linkSources = skills.length ? skills.map(name => `"$PWD"/ostack/skills/${name}`).join(' ') : '"$PWD"/ostack/skills/*';
  const install = method === 'copy'
    ? `cp -R ${sources} ${directory}/`
    : `for skill in ${linkSources}; do\n  ln -s "$skill" ${directory}/\ndone`;
  return `git clone https://github.com/0libote/ostack\nmkdir -p ${directory}\n${install}`;
}

export function setupInstall() {
  const skillNames = (document.querySelector('#install').dataset.installSkills || '').split(' ').filter(Boolean);
  const agentButtons = [...document.querySelectorAll('[data-agent]')];
  const methodButtons = [...document.querySelectorAll('[data-method]')];
  const scopeButtons = [...document.querySelectorAll('[data-scope]')];
  const copyStatus = document.querySelector('#copy-status');
  const installCommand = document.querySelector('#install-command');
  const installHints = {
    cli: skillNames.length
      ? 'Uses the skills CLI. Requires Node.js and npm; installs the skills listed in the command.'
      : 'Uses the skills CLI. Requires Node.js and npm; choose the skills in its prompts.',
    copy: 'Requires Git and a Unix shell. Copies the skills into your harness’s folder.',
    link: 'Requires Git and a Unix shell. Keep the checkout: edits there are available through the links.'
  };

  function updateInstall() {
    const agent = agentButtons.find(button => button.getAttribute('aria-pressed') === 'true');
    const method = methodButtons.find(button => button.getAttribute('aria-pressed') === 'true').dataset.method;
    const scope = scopeButtons.find(button => button.getAttribute('aria-pressed') === 'true').dataset.scope;
    installCommand.textContent = getInstallCommand(agent.dataset, method, scope, skillNames);
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
}
