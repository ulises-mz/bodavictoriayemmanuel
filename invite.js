const revealItems = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const scrollProgress = document.getElementById('scroll-progress');
const toTopButton = document.getElementById('to-top');

function updateScrollUi() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;

  if (scrollProgress) {
    scrollProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  if (toTopButton) {
    toTopButton.classList.toggle('visible', window.scrollY > 420);
  }
}

updateScrollUi();

if (toTopButton) {
  toTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const textureStack = document.getElementById('texture-stack');
const floralFlow = document.getElementById('floral-flow');
const floralSources = ['floral-1.png', 'floral-2.png', 'floral-3.png', 'floral-4.png'];
let textureAspectRatio = 768 / 1408;

let floralPlan = [];
let renderedFlorals = [];
let floralCursor = 0;
let backgroundResizeTimer;
let useLightScrollEffects = false;
let floralParallaxDisabled = false;

function updatePerformanceMode() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useLightScrollEffects = window.innerWidth <= 900 || reducedMotion;
  document.body.classList.toggle('scroll-lite', useLightScrollEffects);
}

updatePerformanceMode();

function getBackgroundCanvasHeight() {
  const footer = document.querySelector('.footer');

  if (!footer) {
    return window.innerHeight;
  }

  const footerBottom = footer.getBoundingClientRect().bottom + window.scrollY;
  return Math.max(window.innerHeight, Math.ceil(footerBottom));
}

function getTextureTileHeight() {
  const widthBasedHeight = Math.round(window.innerWidth * textureAspectRatio);
  return Math.max(180, widthBasedHeight);
}

function buildTextureStack() {
  if (!textureStack) return;

  const tileHeight = Math.max(1, getTextureTileHeight());
  const tileOverlap = window.innerWidth <= 680 ? 12 : 8;
  const tileStep = Math.max(1, tileHeight - tileOverlap);
  const canvasHeight = getBackgroundCanvasHeight();
  const tileCount = Math.max(2, Math.ceil((canvasHeight + tileOverlap) / tileStep) + 1);

  textureStack.style.setProperty('--texture-height', `${canvasHeight}px`);
  textureStack.style.setProperty('--texture-tile-height', `${tileHeight + tileOverlap}px`);
  textureStack.style.setProperty('--texture-tile-opacity', window.innerWidth <= 680 ? '0.48' : '0.56');
  textureStack.innerHTML = '';

  for (let i = 0; i < tileCount; i += 1) {
    const tile = document.createElement('div');
    tile.className = 'texture-stack__tile';
    tile.style.top = `${Math.round(i * tileStep)}px`;
    tile.style.height = `${tileHeight + tileOverlap}px`;
    textureStack.appendChild(tile);
  }
}

function buildFloralPlan() {
  if (!floralFlow) return;

  const viewportHeight = Math.max(1, window.innerHeight);
  const canvasHeight = getBackgroundCanvasHeight();
  const spacing = Math.max(140, viewportHeight * (useLightScrollEffects ? 0.34 : 0.28));
  const floralCount = useLightScrollEffects
    ? Math.max(24, Math.ceil(canvasHeight / spacing) + 7)
    : Math.max(40, Math.ceil(canvasHeight / spacing) + 14);

  floralPlan = [];
  for (let i = 0; i < floralCount; i += 1) {
    const source = floralSources[Math.floor(Math.random() * floralSources.length)];
    const lane = i % 4;
    const y = Math.round((i + 0.8) * spacing + (Math.random() - 0.5) * viewportHeight * 0.16);

    let xVw = 0;
    let side = 'left';
    if (lane === 0) { xVw = -18 + Math.random() * 10; side = 'left'; }
    if (lane === 1) { xVw = -6 + Math.random() * 10; side = 'left'; }
    if (lane === 2) { xVw = 84 + Math.random() * 10; side = 'right'; }
    if (lane === 3) { xVw = 96 + Math.random() * 12; side = 'right'; }

    const maxWidth = window.innerWidth <= 680 ? 360 : 620;
    const minWidth = window.innerWidth <= 680 ? 180 : 250;
    const width = Math.round(Math.min(maxWidth, Math.max(minWidth, viewportHeight * 0.2 + Math.random() * 240)));
    const rotation = (side === 'left' ? -1 : 1) * (Math.random() * 6);
    const alpha = window.innerWidth <= 680 ? 0.5 + Math.random() * 0.18 : 0.56 + Math.random() * 0.22;
    const depth = 0.018 + Math.random() * 0.03;
    const floatDuration = side === 'left' ? (lane === 0 ? 8 : 11) : (lane === 2 ? 9 : 10);
    const floatDelay = -Math.random() * 6;
    const layer = lane === 0 || lane === 3 ? 3 : 1;

    floralPlan.push({
      source,
      y,
      xVw,
      width,
      side,
      layer,
      rotation,
      alpha,
      depth,
      floatDuration,
      floatDelay,
    });
  }

  floralFlow.style.setProperty('--texture-height', `${canvasHeight}px`);
  floralFlow.innerHTML = '';
  floralCursor = 0;
  renderedFlorals = [];
  floralParallaxDisabled = false;
}

function paintFloralsByScroll() {
  if (!floralFlow || !floralPlan.length) return;

  const revealLimit = window.scrollY + (window.innerHeight * 1.45);
  let createdCount = 0;
  const maxPerFrame = useLightScrollEffects ? 3 : 8;

  while (
    floralCursor < floralPlan.length
    && floralPlan[floralCursor].y < revealLimit
    && createdCount < maxPerFrame
  ) {
    const item = floralPlan[floralCursor];
    const floralEl = document.createElement('div');
    floralEl.className = `floral-flow__item floral-flow__item--${item.side}`;
    floralEl.style.top = `${item.y}px`;
    floralEl.style.left = `${item.xVw}vw`;
    floralEl.style.width = `${item.width}px`;
    floralEl.style.setProperty('--alpha', item.alpha.toFixed(2));
    floralEl.style.setProperty('--rotate', `${item.rotation.toFixed(2)}deg`);
    floralEl.style.setProperty('--float-duration', `${item.floatDuration.toFixed(2)}s`);
    floralEl.style.setProperty('--float-delay', `${item.floatDelay.toFixed(2)}s`);
    floralEl.style.zIndex = String(item.layer);

    const floralImg = document.createElement('img');
    floralImg.className = 'floral-flow__img';
    floralImg.src = item.source;
    floralImg.alt = '';
    floralImg.setAttribute('aria-hidden', 'true');

    floralEl.appendChild(floralImg);

    floralFlow.appendChild(floralEl);
    renderedFlorals.push({
      el: floralEl,
      baseY: item.y,
      depth: item.depth,
      rotation: item.rotation,
    });

    requestAnimationFrame(() => {
      floralEl.classList.add('is-visible');
    });

    floralCursor += 1;
    createdCount += 1;
  }

  if (floralCursor < floralPlan.length && floralPlan[floralCursor].y < revealLimit) {
    requestAnimationFrame(paintFloralsByScroll);
  }

  if (useLightScrollEffects) {
    if (!floralParallaxDisabled) {
      renderedFlorals.forEach((flower) => {
        flower.el.style.setProperty('--parallax', '0px');
      });
      floralParallaxDisabled = true;
    }

    return;
  }

  floralParallaxDisabled = false;

  renderedFlorals.forEach((flower) => {
    const offset = (window.scrollY - flower.baseY) * flower.depth;
    flower.el.style.setProperty('--parallax', `${offset.toFixed(2)}px`);
  });
}

function initializeGeneratedBackground() {
  buildTextureStack();
  buildFloralPlan();
  paintFloralsByScroll();
}

initializeGeneratedBackground();
window.addEventListener('load', () => {
  initializeGeneratedBackground();
  scheduleScrollWork();
});

window.addEventListener('resize', () => {
  updatePerformanceMode();
  clearTimeout(backgroundResizeTimer);
  backgroundResizeTimer = setTimeout(() => {
    initializeGeneratedBackground();
    scheduleScrollWork();
  }, 140);

  scheduleScrollWork();
});

const quickNavLinks = Array.from(document.querySelectorAll('.quick-nav__link'));
const trackedSections = quickNavLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      quickNavLinks.forEach((link) => {
        const targetId = link.getAttribute('href');
        const isCurrent = targetId === `#${entry.target.id}`;
        link.classList.toggle('is-active', isCurrent);
      });
    });
  },
  { rootMargin: '-45% 0px -45% 0px', threshold: 0.01 }
);

trackedSections.forEach((section) => navObserver.observe(section));

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'absolute';
  helper.style.left = '-9999px';
  document.body.appendChild(helper);
  helper.select();
  document.execCommand('copy');
  helper.remove();
}

const copyButtons = document.querySelectorAll('.map-copy');
copyButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const originalText = button.textContent;
    const url = button.dataset.url;

    try {
      await copyText(url);
      button.textContent = 'Copiado';
      button.classList.add('is-copied');
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('is-copied');
      }, 1500);
    } catch (error) {
      button.textContent = 'No se pudo copiar';
      setTimeout(() => {
        button.textContent = originalText;
      }, 1700);
    }
  });
});

const weddingDate = new Date('2026-10-10T13:30:00-06:00');
const planningStart = new Date('2026-01-01T00:00:00-06:00');

const heroDays = document.getElementById('hero-days');
const heroHours = document.getElementById('hero-hours');
const heroMinutes = document.getElementById('hero-minutes');
const heroSeconds = document.getElementById('hero-seconds');

const countdownDays = document.getElementById('countdown-days');
const countdownHours = document.getElementById('countdown-hours');
const countdownMinutes = document.getElementById('countdown-minutes');
const countdownSeconds = document.getElementById('countdown-seconds');
const countdownRing = document.getElementById('countdown-ring');

function updateCountdown() {
  const now = new Date();
  const diff = Math.max(0, weddingDate - now);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (heroDays) heroDays.textContent = String(days);
  if (heroHours) heroHours.textContent = String(hours).padStart(2, '0');
  if (heroMinutes) heroMinutes.textContent = String(minutes).padStart(2, '0');
  if (heroSeconds) heroSeconds.textContent = String(seconds).padStart(2, '0');

  if (countdownDays) countdownDays.textContent = String(days);
  if (countdownHours) countdownHours.textContent = String(hours).padStart(2, '0');
  if (countdownMinutes) countdownMinutes.textContent = String(minutes).padStart(2, '0');
  if (countdownSeconds) countdownSeconds.textContent = String(seconds).padStart(2, '0');

  if (countdownRing) {
    const totalRange = weddingDate - planningStart;
    const currentRange = Math.max(0, Math.min(totalRange, now - planningStart));
    const progress = totalRange > 0 ? (currentRange / totalRange) * 100 : 0;
    countdownRing.style.setProperty('--ring-progress', `${progress}%`);
  }
}

updateCountdown();
setInterval(updateCountdown, 1000);

const dresscodeButtons = Array.from(document.querySelectorAll('.dresscode-switch__btn'));
const dresscodeNote = document.getElementById('dresscode-note');

dresscodeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    dresscodeButtons.forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');

    if (dresscodeNote) {
      dresscodeNote.textContent = button.dataset.note;
    }
  });
});

const giftButton = document.getElementById('gift-btn');
const giftThanks = document.getElementById('gift-thanks');

if (giftButton && giftThanks) {
  giftButton.addEventListener('click', () => {
    giftThanks.hidden = false;
    giftThanks.classList.add('visible');
    giftButton.disabled = true;
    giftButton.textContent = 'Gracias por tu carino';
  });
}

const rsvpForm = document.getElementById('rsvp-form');
const companionsWrap = document.getElementById('companions-wrap');
const rsvpThanks = document.getElementById('rsvp-thanks');
const attendInputs = document.querySelectorAll('input[name="attend"]');

function syncCompanionsField() {
  const selected = document.querySelector('input[name="attend"]:checked');
  const showCompanions = selected && selected.value === 'yes';
  if (companionsWrap) companionsWrap.hidden = !showCompanions;
}

attendInputs.forEach((input) => {
  input.addEventListener('change', syncCompanionsField);
});

syncCompanionsField();

function launchSparkles(container) {
  for (let i = 0; i < 20; i += 1) {
    const sparkle = document.createElement('span');
    sparkle.className = 'rsvp-spark';
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.animationDelay = `${Math.random() * 0.35}s`;
    sparkle.style.animationDuration = `${1 + Math.random() * 0.7}s`;
    container.appendChild(sparkle);

    setTimeout(() => sparkle.remove(), 1800);
  }
}

if (rsvpForm && rsvpThanks) {
  rsvpForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(rsvpForm);
    const fullName = (formData.get('fullName') || '').toString().trim();
    const attend = formData.get('attend');
    const companions = Number(formData.get('companions') || 0);
    const song = (formData.get('song') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    let response = '';
    if (attend === 'yes') {
      const companionsText = companions > 0 ? ` y ${companions} acompanante(s)` : '';
      response = `Gracias, ${fullName}. Tu asistencia${companionsText} quedo registrada.`;
    } else {
      response = `Gracias, ${fullName}. Te vamos a extranar, pero agradecemos mucho tu confirmacion.`;
    }

    if (song) {
      response += `\n\nCancion sugerida: ${song}`;
    }

    if (message) {
      response += `\nMensaje: ${message}`;
    }

    rsvpForm.hidden = true;
    rsvpThanks.hidden = false;
    rsvpThanks.textContent = response;
    launchSparkles(rsvpThanks);
  });
}

const routeProgress = document.getElementById('route-progress');
const memorySteps = Array.from(document.querySelectorAll('.memory-step'));
const memoryDots = Array.from(document.querySelectorAll('.memory-step__dot'));
const memoryMedia = memorySteps.map((step) => step.querySelector('.memory-step__media'));

memoryDots.forEach((dot, index) => {
  dot.addEventListener('click', () => {
    const target = memorySteps[index];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
});

function updateRouteExperience() {
  if (!memorySteps.length) return;

  const viewportCenter = window.innerHeight * 0.52;
  const activeDistance = window.innerHeight * (useLightScrollEffects ? 0.24 : 0.28);
  let currentStepIndex = 0;

  memorySteps.forEach((step, index) => {
    const rect = step.getBoundingClientRect();
    const center = rect.top + (rect.height / 2);
    const distance = Math.abs(viewportCenter - center);
    const isActive = distance < activeDistance;

    if (center < window.innerHeight * 0.6) {
      currentStepIndex = index;
    }

    step.classList.toggle('is-active', isActive);

    const dot = memoryDots[index];
    if (dot) {
      dot.classList.toggle('is-active', isActive || index <= currentStepIndex);
    }

    const media = memoryMedia[index];
    if (media) {
      if (useLightScrollEffects) {
        media.style.setProperty('--parallax', '0px');
      } else {
        const depth = Number(media.dataset.depth || 0.12);
        const offset = (center - viewportCenter) * depth;
        media.style.setProperty('--parallax', `${offset.toFixed(2)}px`);
      }
    }
  });

  if (routeProgress) {
    const progress = memorySteps.length > 1
      ? (currentStepIndex / (memorySteps.length - 1)) * 100
      : 100;
    routeProgress.style.height = `${Math.max(0, Math.min(100, progress))}%`;
  }
}

let scrollWorkPending = false;

function runScrollWork() {
  scrollWorkPending = false;
  updateScrollUi();
  paintFloralsByScroll();
  updateRouteExperience();
}

function scheduleScrollWork() {
  if (scrollWorkPending) return;
  scrollWorkPending = true;
  requestAnimationFrame(runScrollWork);
}

window.addEventListener('scroll', scheduleScrollWork, { passive: true });
scheduleScrollWork();

const textureProbe = new Image();
textureProbe.addEventListener('load', () => {
  if (!textureProbe.naturalWidth || !textureProbe.naturalHeight) return;

  textureAspectRatio = textureProbe.naturalHeight / textureProbe.naturalWidth;
  initializeGeneratedBackground();
  scheduleScrollWork();
});
textureProbe.src = 'textura-2.png';
