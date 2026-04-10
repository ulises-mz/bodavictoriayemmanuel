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

/* ── Transition letter to fullscreen invitation ── */
function showInvitationOverlay() {
  if (!landingScene || !invitationOverlay) return;

  landingScene.classList.add('scene--collapsed');
  invitationOverlay.classList.add('visible');
  invitationOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  document.body.classList.add('invitation-open');
  document.documentElement.classList.add('invitation-open');
}

function transitionToInvitation(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!opened || transitioning) return;
  transitioning = true;

  wrapper.classList.add('disassembling');
  if (landingScene) landingScene.classList.add('transitioning');

  if (!invitationLetter) {
    showInvitationOverlay();
    return;
  }

  const rect = invitationLetter.getBoundingClientRect();
  const clone = invitationLetter.cloneNode(true);
  clone.id = 'letter-transition-clone';
  clone.classList.add('letter-transition-clone');

  const cloneCta = clone.querySelector('.letter__cta');
  if (cloneCta) cloneCta.remove();

  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;

  document.body.appendChild(clone);
  invitationLetter.classList.add('letter--ghost');

  const offsetX = (window.innerWidth / 2) - (rect.left + rect.width / 2);
  const offsetY = (window.innerHeight / 2) - (rect.top + rect.height / 2);
  const scaleX = window.innerWidth / rect.width;
  const scaleY = window.innerHeight / rect.height;

  requestAnimationFrame(() => {
    clone.classList.add('animating');
    clone.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`;
    clone.style.borderRadius = '0';
    clone.style.boxShadow = '0 22px 70px rgba(0, 0, 0, 0.26)';
  });

  setTimeout(() => {
    showInvitationOverlay();
  }, 760);

  setTimeout(() => {
    clone.style.opacity = '0';
  }, 980);

  setTimeout(() => {
    clone.remove();
  }, 1320);
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
