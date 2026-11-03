export function setupSkillBanner(banner) {
  const list = banner.querySelector('.banner-list');
  const track = banner.querySelector('.banner-track');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const copy = list.cloneNode(true);
  copy.classList.add('banner-copy');
  copy.setAttribute('aria-hidden', 'true');
  for (const link of copy.querySelectorAll('a')) link.tabIndex = -1;
  copy.addEventListener('pointerdown', event => event.preventDefault());
  track.append(copy);
  let visible = false;

  function update() {
    banner.classList.toggle('is-animated', !reducedMotion.matches);
    banner.classList.toggle('is-paused', !visible || document.hidden);
  }
  list.addEventListener('focusin', event => {
    const animation = track.getAnimations()[0];
    const item = event.target.closest('li');
    if (!animation || !item) return;
    animation.currentTime = item.offsetLeft / list.offsetWidth * animation.effect.getComputedTiming().duration;
  });
  banner.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') banner.classList.add('is-hovered'); });
  banner.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') banner.classList.remove('is-hovered'); });
  reducedMotion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(banner);
  update();
}
