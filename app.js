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

let opened  = false;
let playing = false;
let transitioning = false;

/* ── Open envelope ── */
function openEnvelope() {
  if (opened) return;
  opened = true;

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
  openTimer: null,
  cleanupTimer: null,
};

function clearCurtainTimers() {
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

function buildCurtainPiece(side, row, col, rows, cols) {
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
  const colStep = cols > 1 ? 80 / (cols - 1) : 0;
  const y = ((row + 0.5) * rowStep) + ((Math.random() - 0.5) * rowStep * 0.42);
  const staggerOffset = (row % 2) * (colStep * 0.42);
  const xBase = (col * colStep) + staggerOffset;
  const x = xBase + ((Math.random() - 0.5) * (colStep * 0.95 + 7));
  const scale = 0.9 + (Math.random() * 0.52) + (((row % 3) - 1) * 0.04);
  const tilt = (Math.random() - 0.5) * 16;
  const delay = 140 + (col * 92) + (row * 24) + (Math.random() * 100);
  const endX = (Math.random() - 0.5) * 24;
  const startX = side === 'left' ? '-142%' : '142%';
  const openX = side === 'left' ? '-170%' : '170%';
  const baseRotation = side === 'left' ? -12 : 168;
  const rotation = `${(baseRotation + tilt).toFixed(2)}deg`;

  piece.style.top = `${Math.max(-8, Math.min(108, y)).toFixed(2)}%`;
  piece.style.left = `${Math.max(-14, Math.min(94, x)).toFixed(2)}%`;
  piece.style.setProperty('--scale', scale.toFixed(2));
  piece.style.setProperty('--rotate', rotation);
  piece.style.setProperty('--delay', `${Math.round(delay)}ms`);
  piece.style.setProperty('--start-x', startX);
  piece.style.setProperty('--end-x', `${endX.toFixed(2)}%`);
  piece.style.setProperty('--open-x', openX);

  return piece;
}

function createFloralCurtain() {
  cleanupFloralCurtain();

  const root = document.createElement('div');
  root.className = 'floral-curtain';
  root.innerHTML = `
    <div class="floral-curtain__cover"></div>
    <div class="floral-curtain__side floral-curtain__side--left"></div>
    <div class="floral-curtain__side floral-curtain__side--right"></div>
    <div class="floral-curtain__mist"></div>
  `;

  const leftSide = root.querySelector('.floral-curtain__side--left');
  const rightSide = root.querySelector('.floral-curtain__side--right');
  const rows = window.innerWidth <= 600 ? 8 : (window.innerWidth <= 960 ? 9 : 10);
  const cols = window.innerWidth <= 600 ? 4 : (window.innerWidth <= 960 ? 5 : 6);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      leftSide.appendChild(buildCurtainPiece('left', row, col, rows, cols));
      rightSide.appendChild(buildCurtainPiece('right', row, col, rows, cols));
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

  curtainState.openTimer = setTimeout(() => {
    showInvitationOverlay();
    root.classList.add('is-opening');
  }, 1620);

  curtainState.cleanupTimer = setTimeout(() => {
    cleanupFloralCurtain();
  }, 2780);
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

/* ── Vinyl play/pause ── */
vinylWrapper.addEventListener('click', (e) => {
  if (!opened) return;
  e.stopPropagation();
  playing = !playing;

  if (playing) {
    vinylEl.classList.add('spinning');
    vinylCta.textContent = '⏸ Pause';
    if (audio.src && audio.src !== window.location.href) {
      audio.play().catch(() => {});
    }
  } else {
    vinylEl.classList.remove('spinning');
    vinylCta.textContent = '▶ Play';
    audio.pause();
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
