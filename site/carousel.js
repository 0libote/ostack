export function setupCarousel(carousel, cards) {
  const track = carousel.querySelector('.carousel-track');
  const status = carousel.querySelector('#carousel-position');
  const toggle = carousel.querySelector('#toggle-autoplay');
  const progress = carousel.querySelector('#carousel-progress');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const slides = cards.map((card, index) => {
    const slide = track.firstElementChild.cloneNode(true);
    slide.setAttribute('aria-label', `${index + 1} of ${cards.length}: ${card.dataset.skill}`);
    slide.querySelector('h3').textContent = card.dataset.skill;
    slide.querySelector('.featured-identity p').textContent = card.dataset.category;
    slide.querySelector('.featured-title').textContent = card.querySelector('.card-tagline').textContent;
    slide.querySelector('.featured-description').textContent = card.querySelector('.card-description').textContent;
    slide.querySelector('a').href = card.querySelector('h3 a').getAttribute('href');
    return slide;
  });
  track.replaceChildren(...slides);
  let current = 0;
  let settle;
  let timer;
  let playing = !reducedMotion.matches;
  let visible = false;
  let hovered = false;

  function syncPlayback() {
    clearTimeout(timer);
    toggle.dataset.playing = String(playing);
    toggle.querySelector('[data-playback-label]').textContent = playing ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', playing ? 'Pause automatic rotation' : 'Start automatic rotation');
    status.setAttribute('aria-live', playing ? 'off' : 'polite');
    if (playing && visible && !hovered && !document.hidden) {
      timer = setTimeout(() => {
        show(current + 1);
        syncPlayback();
      }, 5000);
    }
  }

  function pause() {
    playing = false;
    syncPlayback();
  }

  function manual(index) {
    pause();
    show(index);
  }

  function select(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => { slide.inert = position !== current; });
    progress.value = String(current + 1);
    progress.setAttribute('aria-valuetext', `${cards[current].dataset.skill}, skill ${current + 1} of ${slides.length}`);
    status.textContent = `${current + 1} / ${slides.length}`;
    status.setAttribute('aria-label', `Skill ${current + 1} of ${slides.length}: ${cards[current].dataset.skill}`);
  }

  function show(index) {
    const wrapped = index < 0 || index >= slides.length;
    select(index);
    track.scrollTo({
      left: slides[current].offsetLeft,
      behavior: wrapped || reducedMotion.matches ? 'instant' : 'smooth'
    });
  }

  carousel.querySelector('#previous-skill').addEventListener('click', () => manual(current - 1));
  carousel.querySelector('#next-skill').addEventListener('click', () => manual(current + 1));
  track.addEventListener('keydown', event => {
    const target = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    manual(target);
  });
  track.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      const closest = slides.reduce((best, slide, index) => Math.abs(slide.offsetLeft - track.scrollLeft) < Math.abs(slides[best].offsetLeft - track.scrollLeft) ? index : best, 0);
      if (closest !== current) select(closest);
    }, 120);
  }, { passive: true });
  progress.max = String(slides.length);
  progress.addEventListener('input', () => manual(Number(progress.value) - 1));
  toggle.addEventListener('click', () => {
    playing = !playing;
    syncPlayback();
  });
  carousel.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    syncPlayback();
  });
  carousel.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = false;
    syncPlayback();
  });
  carousel.addEventListener('focusin', event => {
    if (event.target !== toggle) pause();
  });
  track.addEventListener('pointerdown', pause);
  track.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) pause();
  }, { passive: true });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) playing = false;
    syncPlayback();
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= 0.25;
    syncPlayback();
  }, { threshold: 0.25 }).observe(carousel);
  carousel.classList.add('is-ready');
  select(0);
  syncPlayback();
  carousel.querySelector('#carousel-controls').hidden = false;
}
