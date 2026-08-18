/* ============================================================
   app.js — Victoria & Emmanuel Wedding Invitation
   ============================================================ */

const wrapper      = document.getElementById('envelope-wrapper');
const hint         = document.getElementById('landing-hint');
const contents     = document.getElementById('env-contents');    // letter container
const invitationLetter = document.getElementById('letter');
const viewInvitation   = document.getElementById('view-invitation');
const landingScene     = document.getElementById('landing');
const invitationOverlay = document.getElementById('invitation-overlay');
const vinylWrapper = document.getElementById('vinyl-wrapper');
const vinylEl      = document.getElementById('vinyl');
const vinylCta     = document.getElementById('vinyl-cta');
const audio        = document.getElementById('bg-audio');
const vinylCircleText = document.querySelector('.vinyl__circular-text textPath');

let opened  = false;
let playing = false;
let transitioning = false;

function syncVinylUi() {
  if (vinylEl) {
    vinylEl.classList.toggle('spinning', playing);
  }

  if (vinylCta) {
    vinylCta.textContent = playing ? '■ Stop' : '▶ Play';
  }

  if (vinylCircleText) {
    vinylCircleText.textContent = playing
      ? '· CLICK TO STOP · CLICK TO STOP ·'
      : '· CLICK TO PLAY · CLICK TO PLAY ·';
  }
}

function playSong() {
  if (!audio) return;

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      playing = false;
      syncVinylUi();
    });
  }
}

function startSong() {
  playing = true;
  syncVinylUi();
  playSong();
}

function stopSong() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  playing = false;
  syncVinylUi();
}

syncVinylUi();

/* ── Open envelope ── */
function openEnvelope() {
  if (opened) return;
  opened = true;

  startSong();

  hint.classList.add('hidden');
  const title = document.querySelector('.landing__title');
  if (title) title.style.opacity = '0';
  wrapper.classList.add('opening');

  // Unlock vertical clip before animation
  document.body.style.overflowY = 'visible';
  document.documentElement.style.overflowY = 'visible';

  // Phase 1 (~420ms mid-flap): reveal and animate letter
  setTimeout(() => {
    // Show letter
    contents.classList.add('show-contents');

    // Measure: we want the letter to rise so it sits above the envelope
    // with its bottom ~25% still "inside" (covered by env-bottom).
    // Rise so letter top is ~5% of viewport from top.
    const letterEl    = contents.querySelector('.letter');
    const letterH     = letterEl ? letterEl.offsetHeight : 200;
    const wrapperRect = wrapper.getBoundingClientRect();
    // env-contents bottom = wrapper bottom (bottom:0 on envelope which fills wrapper)
    const envelopeH   = wrapper.offsetHeight;
    // At translateY=0, letter bottom = wrapperRect.bottom, letter top = wrapperRect.bottom - letterH
    // We want letter bottom to be at env flap line (~48% from top of envelope)
    //   = wrapperRect.top + 0.48 * envelopeH
    const targetLetterBottom = wrapperRect.top + 0.50 * envelopeH;
    const currentLetterBottom = wrapperRect.bottom; // env-contents is at bottom:0
    const riseY = targetLetterBottom - currentLetterBottom; // negative = up

    // Initial state (no transition)
    contents.style.transform = `translateY(0px)`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        contents.classList.add('animating');
        contents.classList.add('risen');
        contents.style.transform = `translateY(${riseY}px)`;
        wrapper.classList.add('opened');
      });
    });
  }, 420);

  // Phase 2 (~550ms): vinyl rises from envelope body through the open flap
  setTimeout(() => {
    vinylWrapper.style.display = 'flex';
    const envelopeH  = wrapper.offsetHeight;
    const vinylH     = vinylWrapper.offsetHeight;
    const wRect      = wrapper.getBoundingClientRect();
    // Vinyl starts at top: 10% of envelope.
    // Rise so its top clears above the envelope by ~30px.
    const currentVinylTop = wRect.top + envelopeH * 0.10;
    const targetVinylTop  = wRect.top - 30; // 30px above envelope top
    const vinylRise       = targetVinylTop - currentVinylTop; // negative = up

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        vinylWrapper.style.opacity = '1';
        vinylWrapper.style.pointerEvents = 'auto';
        vinylWrapper.style.transform = `translateY(${vinylRise}px)`;
      });
    });
  }, 550);
}

wrapper.addEventListener('click', openEnvelope);
wrapper.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openEnvelope();
  }
});

/* ── Show invitation overlay (behind floral curtain) ── */
function showInvitationOverlay() {
  if (!landingScene || !invitationOverlay) return;
  landingScene.classList.add('scene--collapsed');
  invitationOverlay.classList.add('visible');
  invitationOverlay.style.pointerEvents = 'none'; // floral curtain stays above during transition
  invitationOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('invitation-open');
  document.documentElement.classList.add('invitation-open');
}

/* ============================================================
   FLORAL CURTAIN TRANSITION
   ============================================================ */
const curtainState = {
  root: null,
  revealTimer: null,
  openTimer: null,
  cleanupTimer: null,
};

function clearCurtainTimers() {
  clearTimeout(curtainState.revealTimer);
  clearTimeout(curtainState.openTimer);
  clearTimeout(curtainState.cleanupTimer);
}

function cleanupFloralCurtain() {
  clearCurtainTimers();

  if (curtainState.root) {
    curtainState.root.remove();
    curtainState.root = null;
  }

  if (invitationOverlay) {
    invitationOverlay.style.pointerEvents = 'auto';
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/* Crea un ramillete de flores para el arbusto del telon.
   xNorm: 0 = borde exterior de la pantalla, 1 = centro (borde interior).
   layer: 'back' | 'mid' | 'front' controla tamano, nitidez y z-index. */
function buildCurtainSprig(side, layer, xNorm, yNorm, isLite) {
  const viewportMin = Math.min(window.innerWidth, window.innerHeight);
  const sprig = document.createElement('div');
  sprig.className = `floral-curtain__sprig floral-curtain__sprig--${layer}`;

  const sourceSet = side === 'left'
    ? ['floral-1.webp', 'floral-3.webp', 'floral-2.webp', 'floral-4.webp']
    : ['floral-2.webp', 'floral-4.webp', 'floral-1.webp', 'floral-3.webp'];

  const img = document.createElement('img');
  img.className = 'floral-curtain__img';
  img.src = sourceSet[Math.floor(Math.random() * sourceSet.length)];
  img.alt = '';
  img.decoding = 'async';
  img.setAttribute('aria-hidden', 'true');
  sprig.appendChild(img);

  const sizeRange = {
    back: [0.36, 0.52],
    mid: [0.26, 0.38],
    front: [0.16, 0.27],
  }[layer];
  const sizeScale = isLite ? 0.95 : 1;
  const sizePx = Math.max(110, Math.min(560, viewportMin * randomBetween(sizeRange[0], sizeRange[1]) * sizeScale));

  const opacity = {
    back: randomBetween(0.72, 0.85),
    mid: randomBetween(0.86, 0.96),
    front: 1,
  }[layer];

  // Posicion dentro del contenedor del lado: xNorm 0 -> exterior, 1 -> interior.
  const xPercent = side === 'left' ? xNorm * 100 : (1 - xNorm) * 100;
  const direction = side === 'left' ? -1 : 1;
  const baseRotation = (side === 'left' ? -10 : 170) + randomBetween(-14, 14);

  // Onda de cierre: el borde interior brota de ultimo; capas del frente un pelin despues.
  const layerLag = { back: 0, mid: 0.07, front: 0.14 }[layer];
  const entryDelay = xNorm * (isLite ? 0.3 : 0.38) + layerLag + Math.random() * 0.07;
  // Apertura: el centro se aparta primero.
  const exitDelay = (1 - xNorm) * 0.2 + Math.random() * 0.05;

  sprig.style.top = `${Math.max(-8, Math.min(108, yNorm * 100 + randomBetween(-4, 4))).toFixed(2)}%`;
  sprig.style.left = `${Math.max(-10, Math.min(110, xPercent + randomBetween(-5, 5))).toFixed(2)}%`;
  sprig.style.setProperty('--piece-size', `${Math.round(sizePx)}px`);
  sprig.style.setProperty('--piece-opacity', opacity.toFixed(2));
  sprig.style.setProperty('--scale', randomBetween(0.92, 1.14).toFixed(2));
  sprig.style.setProperty('--rotate', `${baseRotation.toFixed(2)}deg`);
  sprig.style.setProperty('--d', `${entryDelay.toFixed(2)}s`);
  sprig.style.setProperty('--d-exit', `${exitDelay.toFixed(2)}s`);
  sprig.style.setProperty('--bloom-dur', `${randomBetween(0.72, 1.02).toFixed(2)}s`);
  sprig.style.setProperty('--bloom-x', `${(direction * randomBetween(34, 70)).toFixed(1)}px`);
  sprig.style.setProperty('--bloom-tilt', `${(direction * randomBetween(12, 26)).toFixed(1)}deg`);
  sprig.style.setProperty('--exit-x', `${(direction * (40 + xNorm * 90)).toFixed(1)}px`);
  sprig.style.setProperty('--exit-tilt', `${(direction * randomBetween(6, 14)).toFixed(1)}deg`);
  sprig.style.setProperty('--breeze-amp', `${randomBetween(1.2, 2.8).toFixed(2)}deg`);
  sprig.style.setProperty('--breeze-dur', `${randomBetween(1.7, 2.8).toFixed(2)}s`);
  sprig.style.setProperty('--breeze-delay', `${(-Math.random() * 2.5).toFixed(2)}s`);

  return sprig;
}

/* Llena un lado con tres capas. Las filas se calculan segun la altura
   real del viewport y se desfasan en patron de ladrillo para que no
   queden bandas horizontales vacias: el arbusto debe verse tupido. */
function populateCurtainSide(sideEl, side, isLite) {
  const viewportHeight = window.innerHeight;
  const viewportMin = Math.min(window.innerWidth, viewportHeight);

  const backRows = Math.max(3, Math.round(viewportHeight / (viewportMin * 0.33)));
  const backCols = isLite ? 2 : 4;
  for (let r = 0; r < backRows; r += 1) {
    for (let c = 0; c < backCols; c += 1) {
      const xNorm = (c + 0.5) / backCols;
      const yNorm = (r + 0.5 + (c % 2) * 0.45) / (backRows + 0.45);
      sideEl.appendChild(buildCurtainSprig(side, 'back', xNorm, yNorm, isLite));
    }
  }

  const midRows = Math.max(4, Math.round(viewportHeight / (viewportMin * 0.25)));
  const midCols = isLite ? 3 : 4;
  for (let r = 0; r < midRows; r += 1) {
    for (let c = 0; c < midCols; c += 1) {
      // Sesgo hacia el borde interior para que el encuentro sea denso,
      // con desfase por fila para romper la rejilla.
      const xNorm = Math.pow((c + 0.5 + (r % 2) * 0.5) / (midCols + 0.5), 0.72);
      const yNorm = (r + 0.5) / midRows;
      sideEl.appendChild(buildCurtainSprig(side, 'mid', xNorm, yNorm, isLite));
    }
  }

  const frontCount = Math.max(isLite ? 8 : 10, Math.round(viewportHeight / (viewportMin * 0.2)));
  for (let i = 0; i < frontCount; i += 1) {
    const xNorm = randomBetween(0.55, 1.04);
    const yNorm = (i + 0.5) / frontCount;
    sideEl.appendChild(buildCurtainSprig(side, 'front', xNorm, yNorm, isLite));
  }
}

/* Petalos que caen de los arbustos cuando el telon se abre. */
function addBurstPetals(root, isLite) {
  const count = isLite ? 10 : 16;

  for (let i = 0; i < count; i += 1) {
    const petal = document.createElement('img');
    petal.className = 'floral-curtain__burst-petal';
    petal.src = 'petalo.webp';
    petal.alt = '';
    petal.decoding = 'async';
    petal.setAttribute('aria-hidden', 'true');

    const direction = i % 2 === 0 ? -1 : 1;
    petal.style.left = `${randomBetween(38, 62).toFixed(1)}%`;
    petal.style.top = `${randomBetween(16, 78).toFixed(1)}%`;
    petal.style.setProperty('--bp-size', `${Math.round(randomBetween(15, 30))}px`);
    petal.style.setProperty('--bp-alpha', randomBetween(0.5, 0.9).toFixed(2));
    petal.style.setProperty('--bp-dur', `${randomBetween(0.75, 1).toFixed(2)}s`);
    petal.style.setProperty('--bp-delay', `${randomBetween(0, 0.24).toFixed(2)}s`);
    petal.style.setProperty('--bp-dx', `${(direction * randomBetween(25, 120)).toFixed(0)}px`);
    petal.style.setProperty('--bp-dy', `${randomBetween(90, 210).toFixed(0)}px`);
    petal.style.setProperty('--bp-rot-from', `${Math.round(Math.random() * 180)}deg`);
    petal.style.setProperty('--bp-rot-to', `${Math.round(180 + Math.random() * 260)}deg`);

    root.appendChild(petal);
  }
}

function createFloralCurtain() {
  cleanupFloralCurtain();

  const root = document.createElement('div');
  root.className = 'floral-curtain';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLite = window.innerWidth <= 820 || reducedMotion;
  if (isLite) {
    root.classList.add('floral-curtain--lite');
  }

  root.innerHTML = `
    <div class="floral-curtain__cover"></div>
    <div class="floral-curtain__side floral-curtain__side--left"></div>
    <div class="floral-curtain__side floral-curtain__side--right"></div>
  `;

  populateCurtainSide(root.querySelector('.floral-curtain__side--left'), 'left', isLite);
  populateCurtainSide(root.querySelector('.floral-curtain__side--right'), 'right', isLite);

  if (!reducedMotion) {
    addBurstPetals(root, isLite);
  }

  document.body.appendChild(root);
  curtainState.root = root;

  // Doble rAF para garantizar que el estado inicial se pinte antes de animar.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.add('is-closing');
    });
  });

  // Fases: cierre con brote en onda -> cambio de escena tras el velo ->
  // pausa breve con brisa -> apertura desde el centro con petalos.
  const revealDelay = isLite ? 950 : 1100;
  const openDelay = isLite ? 1450 : 1700;
  const cleanupDelay = isLite ? 2650 : 3050;

  curtainState.revealTimer = setTimeout(() => {
    showInvitationOverlay();
  }, revealDelay);

  curtainState.openTimer = setTimeout(() => {
    root.classList.add('is-opening');
  }, openDelay);

  curtainState.cleanupTimer = setTimeout(() => {
    cleanupFloralCurtain();
  }, cleanupDelay);
}

/* ── Transition ── */
function transitionToInvitation(event) {
  event.preventDefault();
  event.stopPropagation();
  if (!opened || transitioning) return;
  transitioning = true;

  wrapper.classList.add('disassembling');
  if (landingScene) landingScene.classList.add('transitioning');

  // Floral curtain closes, invitation is shown behind, then curtain opens.
  setTimeout(() => {
    createFloralCurtain();
  }, 260);
}

if (viewInvitation) {
  viewInvitation.addEventListener('click', transitionToInvitation);
}

/* ── Vinyl play/stop ── */
vinylWrapper.addEventListener('click', (e) => {
  if (!opened) return;
  e.stopPropagation();

  if (playing) {
    stopSong();
  } else {
    startSong();
  }
});

/* ── 3D tilt on hover ── */
wrapper.addEventListener('mousemove', (e) => {
  if (opened) return;
  const rect = wrapper.getBoundingClientRect();
  const dx   = ((e.clientX - rect.left)  / rect.width  - 0.5) * 2;
  const dy   = ((e.clientY - rect.top)   / rect.height - 0.5) * 2;
  document.getElementById('envelope').style.transform =
    `scale(1.03) translateY(-4px) rotateY(${dx * 6}deg) rotateX(${-dy * 4}deg)`;
});

wrapper.addEventListener('mouseleave', () => {
  if (opened) return;
  document.getElementById('envelope').style.transform = '';
});
