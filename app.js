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

function buildCurtainPiece(side, row, col, rows, cols, options = {}) {
  const isLite = Boolean(options.isLite);
  const isFillLayer = Boolean(options.isFillLayer);
  const viewportMin = Math.min(window.innerWidth, window.innerHeight);
  const piece = document.createElement('img');
  piece.className = `floral-curtain__piece floral-curtain__piece--${side}`;

  const sourceSet = side === 'left'
    ? ['floral-1.png', 'floral-3.png', 'floral-2.png', 'floral-4.png']
    : ['floral-2.png', 'floral-4.png', 'floral-1.png', 'floral-3.png'];

  const sourceIndex = (row * cols) + col;
  piece.src = sourceSet[sourceIndex % sourceSet.length];
  piece.alt = '';
  piece.setAttribute('aria-hidden', 'true');

  const rowStep = 100 / rows;
  const colStep = 100 / cols;
  const layerOffset = isFillLayer ? 0.5 : 0;
  const y = ((row + 0.5) * rowStep) + ((Math.random() - 0.5) * rowStep * 0.5);
  const x = ((col + 0.5 + layerOffset) * colStep) + ((Math.random() - 0.5) * colStep * 0.62);
  const scale = isFillLayer
    ? (isLite ? 0.72 + Math.random() * 0.26 : 0.8 + Math.random() * 0.3)
    : (isLite ? 0.86 + Math.random() * 0.28 : 0.98 + Math.random() * 0.34);
  const baseRotation = side === 'left' ? -12 : 168;
  const tilt = (Math.random() - 0.5) * 18;
  const opacity = isFillLayer
    ? (isLite ? 0.5 : 0.68)
    : (isLite ? 0.74 : 0.9);
  const baseSize = viewportMin * (isLite ? 0.26 : 0.31);
  const sizeMultiplier = isFillLayer ? (0.76 + Math.random() * 0.25) : (0.9 + Math.random() * 0.35);
  const sizePx = Math.max(120, Math.min(420, baseSize * sizeMultiplier));
  const rotation = `${(baseRotation + tilt).toFixed(2)}deg`;

  piece.style.top = `${Math.max(-6, Math.min(106, y)).toFixed(2)}%`;
  piece.style.left = `${Math.max(-8, Math.min(108, x)).toFixed(2)}%`;
  piece.style.setProperty('--piece-size', `${Math.round(sizePx)}px`);
  piece.style.setProperty('--scale', scale.toFixed(2));
  piece.style.setProperty('--rotate', rotation);
  piece.style.setProperty('--piece-opacity', opacity.toFixed(2));

  return piece;
}

function getCurtainDensityConfig(isLite) {
  const areaFactor = Math.max(0.8, Math.min(2.2, (window.innerWidth * window.innerHeight) / (1280 * 720)));
  const baseRows = Math.round((isLite ? 4 : 5) + (areaFactor * 1.25));
  const baseCols = Math.round((isLite ? 3 : 4) + (areaFactor * 1.15));

  return {
    baseRows,
    baseCols,
    fillRows: Math.max(3, baseRows - 1),
    fillCols: Math.max(2, baseCols - 1),
  };
}

function createFloralCurtain() {
  cleanupFloralCurtain();

  const root = document.createElement('div');
  root.className = 'floral-curtain';

  const isLite = window.innerWidth <= 820 || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isLite) {
    root.classList.add('floral-curtain--lite');
  }

  root.innerHTML = `
    <div class="floral-curtain__cover"></div>
    <div class="floral-curtain__side floral-curtain__side--left"></div>
    <div class="floral-curtain__side floral-curtain__side--right"></div>
    <div class="floral-curtain__mist"></div>
  `;

  const leftSide = root.querySelector('.floral-curtain__side--left');
  const rightSide = root.querySelector('.floral-curtain__side--right');
  const density = getCurtainDensityConfig(isLite);

  for (let row = 0; row < density.baseRows; row += 1) {
    for (let col = 0; col < density.baseCols; col += 1) {
      leftSide.appendChild(buildCurtainPiece('left', row, col, density.baseRows, density.baseCols, { isLite }));
      rightSide.appendChild(buildCurtainPiece('right', row, col, density.baseRows, density.baseCols, { isLite }));
    }
  }

  for (let row = 0; row < density.fillRows; row += 1) {
    for (let col = 0; col < density.fillCols; col += 1) {
      leftSide.appendChild(buildCurtainPiece('left', row, col, density.fillRows, density.fillCols, { isLite, isFillLayer: true }));
      rightSide.appendChild(buildCurtainPiece('right', row, col, density.fillRows, density.fillCols, { isLite, isFillLayer: true }));
    }
  }

  document.body.appendChild(root);
  curtainState.root = root;

  // Delay start slightly to guarantee the closed-state animation is visible.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.add('is-closing');
    });
  });

  const revealDelay = isLite ? 620 : 760;
  const openDelay = isLite ? 860 : 980;
  const cleanupDelay = isLite ? 1520 : 1720;

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
