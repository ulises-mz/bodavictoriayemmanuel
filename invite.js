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

const RSVP_STORAGE_KEY = 'ev-rsvp-records-v1';
const RSVP_DEADLINE = new Date('2026-09-20T23:59:59-06:00');

const rsvpForm = document.getElementById('rsvp-form');
const attendanceDetailsWrap = document.getElementById('attendance-details-wrap');
const rsvpThanks = document.getElementById('rsvp-thanks');
const rsvpSummary = document.getElementById('rsvp-summary');
const rsvpEditButton = document.getElementById('rsvp-edit-btn');
const rsvpStatus = document.getElementById('rsvp-status');
const rsvpDeadlineNote = document.getElementById('rsvp-deadline-note');
const attendInputs = document.querySelectorAll('input[name="attend"]');
const rsvpSubmitButton = rsvpForm ? rsvpForm.querySelector('button[type="submit"]') : null;
const fullNameInput = rsvpForm ? rsvpForm.querySelector('input[name="fullName"]') : null;
const emailInput = rsvpForm ? rsvpForm.querySelector('input[name="email"]') : null;
const groupNameInput = rsvpForm ? rsvpForm.querySelector('input[name="groupName"]') : null;
const peopleCountInput = rsvpForm ? rsvpForm.querySelector('input[name="peopleCount"]') : null;
const attendeeNamesInput = rsvpForm ? rsvpForm.querySelector('textarea[name="attendeeNames"]') : null;

let existingRsvpRecord = null;
let latestSavedRecord = null;
let lookupRequestVersion = 0;

function normalizeName(value) {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function splitAttendeeNames(value) {
  return value
    .toString()
    .split(/[\n,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeStoredRecord(record) {
  const fullName = (record?.fullName || '').toString().trim();
  const email = (record?.email || '').toString().trim().toLowerCase();
  const attend = record?.attend === 'no' ? 'no' : 'yes';
  let attendeeNames = Array.isArray(record?.attendeeNames)
    ? record.attendeeNames.map((name) => name.toString().trim()).filter(Boolean)
    : splitAttendeeNames(record?.attendeeNames || '');

  let peopleCount = Number(record?.peopleCount || 0);
  if (!Number.isFinite(peopleCount)) {
    peopleCount = 0;
  }

  if (attend === 'yes') {
    if (!attendeeNames.length && fullName) {
      attendeeNames = [fullName];
    }
    if (peopleCount < 1) {
      peopleCount = attendeeNames.length || 1;
    }
  } else {
    peopleCount = 0;
    attendeeNames = [];
  }

  const groupName = (record?.groupName || '').toString().trim() || 'Sin grupo definido';

  return {
    id: (record?.id || '').toString().trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: (record?.createdAt || '').toString().trim() || new Date().toISOString(),
    updatedAt: (record?.updatedAt || '').toString().trim() || new Date().toISOString(),
    fullName,
    normalizedFullName: normalizeName(fullName),
    email,
    attend,
    groupName,
    normalizedGroupName: normalizeName(groupName),
    peopleCount,
    attendeeNames,
    song: (record?.song || '').toString().trim(),
    message: (record?.message || '').toString().trim(),
    status: attend === 'yes' ? 'Asistencia confirmada' : 'No asistira',
  };
}

function readRsvpRecords() {
  try {
    const raw = localStorage.getItem(RSVP_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((record) => normalizeStoredRecord(record))
      .filter((record) => record.fullName);
  } catch (error) {
    return [];
  }
}

function writeRsvpRecords(records) {
  try {
    localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    return false;
  }
}

function lookupRsvpByName(fullName) {
  const normalizedFullName = normalizeName(fullName);
  if (!normalizedFullName) {
    return { ok: true, found: false };
  }

  const rows = readRsvpRecords();
  const match = rows.find((row) => row.normalizedFullName === normalizedFullName);

  if (!match) {
    return { ok: true, found: false };
  }

  return {
    ok: true,
    found: true,
    record: match,
  };
}

function upsertRsvp(payload) {
  const normalizedPayload = normalizeStoredRecord(payload);
  const records = readRsvpRecords();
  const existingIndex = records.findIndex(
    (record) => record.normalizedFullName === normalizedPayload.normalizedFullName
  );

  if (existingIndex >= 0 && records[existingIndex].email.toLowerCase() !== normalizedPayload.email.toLowerCase()) {
    return {
      ok: false,
      error: 'Este nombre ya confirmo con otro correo. Usa ese correo para editar.',
    };
  }

  const nowIso = new Date().toISOString();
  let mode = 'created';

  if (existingIndex >= 0) {
    mode = 'updated';
    const existing = records[existingIndex];
    records[existingIndex] = {
      ...normalizedPayload,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowIso,
    };
  } else {
    records.push({
      ...normalizedPayload,
      id: normalizedPayload.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (!writeRsvpRecords(records)) {
    return {
      ok: false,
      error: 'No se pudo guardar la confirmacion en este dispositivo.',
    };
  }

  const saved = records.find((record) => record.normalizedFullName === normalizedPayload.normalizedFullName);
  return {
    ok: true,
    mode,
    record: saved || normalizedPayload,
  };
}

function isDeadlinePassed() {
  return new Date() > RSVP_DEADLINE;
}

function setRsvpStatus(message, type = 'info') {
  if (!rsvpStatus) return;

  if (!message) {
    rsvpStatus.hidden = true;
    rsvpStatus.textContent = '';
    delete rsvpStatus.dataset.type;
    return;
  }

  rsvpStatus.hidden = false;
  rsvpStatus.textContent = message;
  rsvpStatus.dataset.type = type;
}

function setRsvpSubmitMode(mode) {
  if (!rsvpSubmitButton) return;
  rsvpSubmitButton.textContent = mode === 'edit' ? 'Guardar cambios' : 'Confirmar asistencia';
}

function setFormDisabled(disabled) {
  if (!rsvpForm) return;

  Array.from(rsvpForm.elements).forEach((field) => {
    field.disabled = disabled;
  });
}

function syncAttendanceFields() {
  const selected = document.querySelector('input[name="attend"]:checked');
  const showDetails = selected && selected.value === 'yes';

  if (attendanceDetailsWrap) {
    attendanceDetailsWrap.hidden = !showDetails;
  }

  if (peopleCountInput) {
    peopleCountInput.required = showDetails;
    if (!showDetails) {
      peopleCountInput.value = '0';
    } else if (Number(peopleCountInput.value || 0) < 1) {
      peopleCountInput.value = '1';
    }
  }

  if (attendeeNamesInput) {
    attendeeNamesInput.required = showDetails;
    if (!showDetails) {
      attendeeNamesInput.value = '';
    }
  }
}

function enforceDeadlineRules() {
  const deadlinePassed = isDeadlinePassed();

  if (rsvpDeadlineNote) {
    rsvpDeadlineNote.hidden = !deadlinePassed;
  }

  if (!deadlinePassed) {
    return false;
  }

  setFormDisabled(true);
  setRsvpStatus('El plazo para confirmar asistencia cerro el 20 de septiembre de 2026.', 'error');

  if (rsvpSubmitButton) {
    rsvpSubmitButton.disabled = true;
    rsvpSubmitButton.textContent = 'Confirmacion cerrada';
  }

  if (rsvpEditButton) {
    rsvpEditButton.hidden = true;
  }

  return true;
}

attendInputs.forEach((input) => {
  input.addEventListener('change', syncAttendanceFields);
});

syncAttendanceFields();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseRsvpPayload(formData) {
  const fullName = (formData.get('fullName') || '').toString().trim();
  const email = (formData.get('email') || '').toString().trim().toLowerCase();
  const groupName = (formData.get('groupName') || '').toString().trim();
  const attend = (formData.get('attend') || '').toString();
  const rawPeopleCount = Number(formData.get('peopleCount') || 0);
  const peopleCount = Number.isFinite(rawPeopleCount) ? Math.round(rawPeopleCount) : 0;
  const attendeeNamesRaw = (formData.get('attendeeNames') || '').toString();
  const attendeeNames = splitAttendeeNames(attendeeNamesRaw);
  const song = (formData.get('song') || '').toString().trim();
  const message = (formData.get('message') || '').toString().trim();

  return {
    fullName,
    normalizedFullName: normalizeName(fullName),
    email,
    groupName,
    normalizedGroupName: normalizeName(groupName),
    attend,
    peopleCount: attend === 'yes' ? peopleCount : 0,
    attendeeNamesRaw,
    attendeeNames: attend === 'yes' ? attendeeNames : [],
    song,
    message,
  };
}

function validateRsvpPayload(payload) {
  if (payload.fullName.length < 5) {
    return 'Escribe tu nombre completo para validar tu confirmacion.';
  }

  if (!isValidEmail(payload.email)) {
    return 'Escribe un correo electronico valido para guardar tu confirmacion.';
  }

  if (payload.groupName.length < 3) {
    return 'Escribe un nombre de grupo o familia para organizar las mesas.';
  }

  if (payload.attend !== 'yes' && payload.attend !== 'no') {
    return 'Selecciona si asistiras o no asistiras.';
  }

  if (payload.attend === 'yes') {
    if (payload.peopleCount < 1) {
      return 'Indica el numero total de personas que asistiran (minimo 1).';
    }

    if (!payload.attendeeNames.length) {
      return 'Escribe los nombres de las personas que asistiran.';
    }

    if (payload.attendeeNames.length !== payload.peopleCount) {
      return `El numero de nombres (${payload.attendeeNames.length}) no coincide con el total de personas (${payload.peopleCount}).`;
    }
  }

  return '';
}

function buildSummaryText(record, saveMessage) {
  const lines = [
    saveMessage,
    `Nombre: ${record.fullName}`,
    `Correo: ${record.email}`,
    `Grupo: ${record.groupName}`,
  ];

  if (record.attend === 'yes') {
    lines.push('Estado: Asistencia confirmada');
    lines.push(`Numero total de personas: ${record.peopleCount}`);
    lines.push(`Nombres registrados: ${record.attendeeNames.join(', ')}`);
  } else {
    lines.push('Estado: No podra asistir');
  }

  if (record.song) {
    lines.push(`Cancion sugerida: ${record.song}`);
  }

  if (record.message) {
    lines.push(`Mensaje: ${record.message}`);
  }

  return lines.join('\n');
}

function normalizeServerRecord(record, fallbackPayload) {
  return normalizeStoredRecord({
    id: (record?.id || fallbackPayload.recordId || '').toString(),
    createdAt: record?.createdAt,
    updatedAt: record?.updatedAt,
    fullName: record?.fullName || fallbackPayload.fullName,
    email: record?.email || fallbackPayload.email,
    attend: record?.attend || fallbackPayload.attend,
    groupName: record?.groupName || fallbackPayload.groupName,
    peopleCount: Number(record?.peopleCount ?? fallbackPayload.peopleCount ?? 0),
    attendeeNames: record?.attendeeNames || fallbackPayload.attendeeNames,
    song: record?.song || fallbackPayload.song,
    message: record?.message || fallbackPayload.message,
  });
}

function fillRsvpForm(record) {
  if (!rsvpForm) return;

  if (fullNameInput) {
    fullNameInput.value = record.fullName || '';
  }

  if (emailInput) {
    emailInput.value = record.email || '';
  }

  if (groupNameInput) {
    groupNameInput.value = record.groupName || '';
  }

  attendInputs.forEach((input) => {
    input.checked = input.value === record.attend;
  });

  if (peopleCountInput) {
    peopleCountInput.value = String(record.peopleCount || 0);
  }

  if (attendeeNamesInput) {
    attendeeNamesInput.value = (record.attendeeNames || []).join('\n');
  }

  const songInput = rsvpForm.querySelector('input[name="song"]');
  if (songInput) {
    songInput.value = record.song || '';
  }

  const messageInput = rsvpForm.querySelector('textarea[name="message"]');
  if (messageInput) {
    messageInput.value = record.message || '';
  }

  syncAttendanceFields();
}

function isSameEmailAsExisting(typedEmail) {
  if (!existingRsvpRecord || !existingRsvpRecord.email) return true;
  return existingRsvpRecord.email.toLowerCase() === typedEmail.toLowerCase();
}

function setSavingState(isSaving, modeWhenIdle) {
  if (!rsvpSubmitButton) return;

  if (isSaving) {
    rsvpSubmitButton.disabled = true;
    rsvpSubmitButton.textContent = 'Guardando...';
    return;
  }

  if (isDeadlinePassed()) {
    enforceDeadlineRules();
    return;
  }

  rsvpSubmitButton.disabled = false;
  setRsvpSubmitMode(modeWhenIdle);
}

async function checkNameDuplicate() {
  if (!fullNameInput) return;

  lookupRequestVersion += 1;
  const requestVersion = lookupRequestVersion;
  const fullName = fullNameInput.value.trim();

  existingRsvpRecord = null;
  setRsvpSubmitMode('create');

  if (fullName.length < 5 || isDeadlinePassed()) {
    return;
  }

  setRsvpStatus('Verificando si este nombre ya confirmo asistencia...', 'info');
  const lookupResult = lookupRsvpByName(fullName);

  if (requestVersion !== lookupRequestVersion) {
    return;
  }

  if (!lookupResult.ok) {
    setRsvpStatus(lookupResult.error || 'No se pudo revisar duplicados por nombre.', 'error');
    return;
  }

  if (!lookupResult.found) {
    setRsvpStatus('', 'info');
    setRsvpSubmitMode('create');
    return;
  }

  existingRsvpRecord = normalizeServerRecord(lookupResult.record || {}, {
    fullName,
    email: '',
    attend: 'yes',
    peopleCount: 1,
    attendeeNamesRaw: '',
    song: '',
    message: '',
    recordId: '',
  });

  latestSavedRecord = existingRsvpRecord;
  setRsvpSubmitMode('edit');

  const typedEmail = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const recordEmail = (existingRsvpRecord.email || '').toLowerCase();

  if (typedEmail && recordEmail && typedEmail === recordEmail) {
    fillRsvpForm(existingRsvpRecord);
    setRsvpStatus('Ya tenias una confirmacion guardada y la cargamos para que puedas editarla.', 'warning');
    return;
  }

  if (typedEmail && recordEmail && typedEmail !== recordEmail) {
    setRsvpStatus('Este nombre ya fue confirmado con otro correo. Usa ese correo para editar la respuesta.', 'error');
    return;
  }

  setRsvpStatus('Este nombre ya tiene una confirmacion. Escribe el mismo correo para actualizarla.', 'warning');
}

if (fullNameInput) {
  fullNameInput.addEventListener('blur', checkNameDuplicate);
  fullNameInput.addEventListener('input', () => {
    lookupRequestVersion += 1;
    existingRsvpRecord = null;
    setRsvpSubmitMode('create');
  });
}

if (emailInput) {
  emailInput.addEventListener('blur', () => {
    if (!existingRsvpRecord || !existingRsvpRecord.email) return;

    const typedEmail = emailInput.value.trim().toLowerCase();
    if (!typedEmail) return;

    if (!isSameEmailAsExisting(typedEmail)) {
      setRsvpStatus('El nombre ya existe y el correo no coincide. Usa el correo original para editar.', 'error');
      return;
    }

    fillRsvpForm(existingRsvpRecord);
    setRsvpStatus('Correo validado. Ya puedes editar esta confirmacion.', 'warning');
    setRsvpSubmitMode('edit');
  });
}

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
  enforceDeadlineRules();

  if (rsvpEditButton) {
    rsvpEditButton.addEventListener('click', () => {
      if (isDeadlinePassed()) {
        enforceDeadlineRules();
        return;
      }

      if (latestSavedRecord) {
        fillRsvpForm(latestSavedRecord);
      }

      rsvpThanks.hidden = true;
      rsvpForm.hidden = false;
      setRsvpSubmitMode('edit');
      setRsvpStatus('Puedes editar tu confirmacion y volver a guardarla.', 'info');
      if (fullNameInput) {
        fullNameInput.focus();
      }
    });
  }

  rsvpForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (enforceDeadlineRules()) {
      return;
    }

    const formData = new FormData(rsvpForm);
    const payload = parseRsvpPayload(formData);
    const validationMessage = validateRsvpPayload(payload);

    if (validationMessage) {
      setRsvpStatus(validationMessage, 'error');
      return;
    }

    if (existingRsvpRecord && !isSameEmailAsExisting(payload.email)) {
      setRsvpStatus('Este nombre ya tiene una confirmacion con otro correo y no se puede duplicar.', 'error');
      return;
    }

    setSavingState(true, existingRsvpRecord ? 'edit' : 'create');
    setRsvpStatus('', 'info');

    const upsertPayload = {
      ...payload,
      recordId: existingRsvpRecord ? existingRsvpRecord.id : '',
    };

    const saveResult = upsertRsvp(upsertPayload);

    if (!saveResult.ok) {
      setSavingState(false, existingRsvpRecord ? 'edit' : 'create');
      setRsvpStatus(saveResult.error || 'No se pudo guardar la confirmacion.', 'error');
      return;
    }

    const savedRecord = normalizeServerRecord(saveResult.record || {}, upsertPayload);
    existingRsvpRecord = savedRecord;
    latestSavedRecord = savedRecord;

    rsvpForm.hidden = true;
    rsvpThanks.hidden = false;

    if (rsvpSummary) {
      const saveMessage = saveResult.mode === 'updated'
        ? 'Tu confirmacion fue actualizada correctamente.'
        : 'Tu confirmacion fue guardada correctamente.';
      rsvpSummary.textContent = buildSummaryText(savedRecord, saveMessage);
    }

    if (rsvpEditButton) {
      rsvpEditButton.hidden = false;
    }

    launchSparkles(rsvpThanks);
    setSavingState(false, 'edit');
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
