const button = document.querySelector('#praise');
const response = document.querySelector('#praise-response');
const messages = [
  'Bun has heard you. Bun was already installing your dependencies.',
  'Your devotion has been recorded in absolutely no database.',
  'You are now the most concerning person in standup.',
  'Bun is a runtime. You are clicking a button. Let that sink in.',
  'The bun demands a sacrifice. One unused devDependency will do.',
  'HR has asked us to stop referring to the migration as “the rapture”.',
  'You may now add “religious experience” to the sprint retrospective.',
  'Please drink some water. This is becoming a package management incident.'
];
let praises = 0;
button.hidden = false;
button.addEventListener('click', () => {
  response.textContent = messages[praises % messages.length];
  praises++;
  button.textContent = `Praise Bun again (${praises})`;
});
