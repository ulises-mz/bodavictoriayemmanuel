const PANEL_SESSION_KEY = 'ev-couple-panel-auth';
const PANEL_LOGIN_ROUTE = 'panel-login.html';
const RSVP_STORAGE_KEY = 'ev-rsvp-records-v1';
const TABLE_PLAN_STORAGE_KEY = 'ev-table-plan-v1';

if (sessionStorage.getItem(PANEL_SESSION_KEY) !== '1') {
  window.location.href = PANEL_LOGIN_ROUTE;
}

const refreshButton = document.getElementById('panel-refresh-btn');
const logoutButton = document.getElementById('panel-logout-btn');

const statGroups = document.getElementById('stat-groups');
const statHouseholds = document.getElementById('stat-households');
const statPeople = document.getElementById('stat-people');
const statDeclined = document.getElementById('stat-declined');

const groupedList = document.getElementById('grouped-list');
const declinedList = document.getElementById('declined-list');
const groupSearchInput = document.getElementById('group-search');

const tablePlanForm = document.getElementById('table-plan-form');
const tablePlanResetButton = document.getElementById('table-plan-reset');
const tablePlanStatus = document.getElementById('table-plan-status');
const tablePlanOutput = document.getElementById('table-plan-output');
const tableAddButton = document.getElementById('table-add-btn');
const tableGenerateUniformButton = document.getElementById('table-generate-uniform');
const tableConfigList = document.getElementById('table-config-list');
const manualAssignmentList = document.getElementById('manual-assignment-list');
const tableMap = document.getElementById('table-map');
const assignmentModeTabs = document.getElementById('assignment-mode-tabs');
const assignmentAutoButton = document.getElementById('assignment-auto-btn');
const assignmentUnassignedDrop = document.getElementById('assignment-unassigned-drop');
const manualAssignmentTitle = document.getElementById('manual-assignment-title');
const manualAssignmentCopy = document.getElementById('manual-assignment-copy');
const plannerModeHint = document.getElementById('planner-mode-hint');
const tablePlanExplainer = document.getElementById('table-plan-explainer');
const mapZoomOutButton = document.getElementById('map-zoom-out');
const mapZoomInButton = document.getElementById('map-zoom-in');
const mapViewResetButton = document.getElementById('map-view-reset');
const mapZoomLabel = document.getElementById('map-zoom-label');
const tableContextMenu = document.getElementById('table-context-menu');
const tableContextLabelInput = document.getElementById('table-context-label');
const tableContextCapacityInput = document.getElementById('table-context-capacity');
const tableContextSizeInput = document.getElementById('table-context-size');
const tableContextRatioInput = document.getElementById('table-context-ratio');
const tableContextSaveButton = document.getElementById('table-context-save');
const tableContextDeleteButton = document.getElementById('table-context-delete');
const tableContextCancelButton = document.getElementById('table-context-cancel');

let cachedGroups = [];
let cachedIndividuals = [];
let plannerState = loadPlanConfig() || {
  tables: buildUniformTables(12, 8),
  assignmentMode: 'group',
  assignments: {},
  view: getDefaultMapView(),
};
let mapDragState = null;
let mapPanState = null;
let mapViewportElement = null;
let draggingUnitKey = '';
let currentDropTarget = null;

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
    attendeeNames = [];
    peopleCount = 0;
  }

  const groupName = (record?.groupName || '').toString().trim() || 'Sin grupo definido';

  return {
    fullName,
    email,
    attend,
    peopleCount,
    attendeeNames,
    groupName,
    normalizedGroupName: normalizeName(groupName),
    normalizedFullName: normalizeName(fullName),
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

function setTablePlanStatus(message, type = 'success') {
  if (!tablePlanStatus) return;

  if (!message) {
    tablePlanStatus.hidden = true;
    tablePlanStatus.textContent = '';
    delete tablePlanStatus.dataset.type;
    return;
  }

  tablePlanStatus.hidden = false;
  tablePlanStatus.textContent = message;
  tablePlanStatus.dataset.type = type;
}

function clearChildren(element) {
  if (!element) return;

  element.textContent = '';
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (typeof text === 'string') {
    element.textContent = text;
  }
  return element;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toInteger(value, fallback, min = 1, max = 200) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, min, max);
}

function createTableId(seed = '') {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const suffix = seed ? `-${seed}` : '';
  return `table-${Date.now().toString(36)}-${randomPart}${suffix}`;
}

function getDefaultTablePosition(index) {
  const columns = 4;
  const col = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: clamp(14 + col * 22, 8, 92),
    y: clamp(16 + row * 18, 10, 90),
  };
}

function normalizeTableLabel(value, index) {
  const label = (value || '').toString().trim().slice(0, 40);
  return label || `Mesa ${index + 1}`;
}

function formatRatioPart(value) {
  if (!Number.isFinite(value)) {
    return '1';
  }

  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0+$/, '');
}

function parseTableRatio(value) {
  const raw = (value || '').toString().trim();
  const ratioMatch = raw.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);

  if (!ratioMatch) {
    return { label: '1:1', x: 1, y: 1 };
  }

  const x = Number(ratioMatch[1]);
  const y = Number(ratioMatch[2]);

  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) {
    return { label: '1:1', x: 1, y: 1 };
  }

  const normalizedX = clamp(x, 0.2, 5);
  const normalizedY = clamp(y, 0.2, 5);

  return {
    label: `${formatRatioPart(normalizedX)}:${formatRatioPart(normalizedY)}`,
    x: normalizedX,
    y: normalizedY,
  };
}

function getDefaultMapView() {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
  };
}

function sanitizeMapView(value) {
  const zoom = clamp(Number(value?.zoom || 1), 0.45, 2.8);
  const panX = Number(value?.panX);
  const panY = Number(value?.panY);

  return {
    zoom,
    panX: Number.isFinite(panX) ? clamp(panX, -2400, 2400) : 0,
    panY: Number.isFinite(panY) ? clamp(panY, -2400, 2400) : 0,
  };
}

function buildUniformTables(tableCount, seatsPerTable) {
  return Array.from({ length: tableCount }, (_, index) => {
    const position = getDefaultTablePosition(index);
    return {
      id: createTableId(String(index + 1)),
      label: `Mesa ${index + 1}`,
      capacity: seatsPerTable,
      size: 100,
      ratio: '1:1',
      ratioX: 1,
      ratioY: 1,
      x: position.x,
      y: position.y,
    };
  });
}

function sanitizePlannerTables(tables) {
  if (!Array.isArray(tables)) {
    return [];
  }

  const usedIds = new Set();

  return tables.map((table, index) => {
    const defaultPosition = getDefaultTablePosition(index);

    let id = (table?.id || '').toString().trim();
    if (!id || usedIds.has(id)) {
      id = createTableId(String(index + 1));
    }
    usedIds.add(id);

    const capacity = toInteger(table?.capacity, 8, 1, 60);
    const size = toInteger(table?.size, 100, 60, 200);
    const ratioInfo = parseTableRatio(table?.ratio || `${table?.ratioX || 1}:${table?.ratioY || 1}`);
    const x = Number(table?.x);
    const y = Number(table?.y);

    return {
      id,
      label: normalizeTableLabel(table?.label, index),
      capacity,
      size,
      ratio: ratioInfo.label,
      ratioX: ratioInfo.x,
      ratioY: ratioInfo.y,
      x: Number.isFinite(x) ? clamp(x, 8, 92) : defaultPosition.x,
      y: Number.isFinite(y) ? clamp(y, 10, 90) : defaultPosition.y,
    };
  });
}

function sanitizeAssignmentMode(value) {
  return value === 'individual' ? 'individual' : 'group';
}

function normalizeAssignmentEntry(value) {
  if (typeof value === 'string') {
    const tableId = value.trim();
    if (!tableId) {
      return null;
    }
    return { tableId, seatIndex: null };
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const tableId = (value.tableId || '').toString().trim();
  if (!tableId) {
    return null;
  }

  const rawSeatIndex = Number(value.seatIndex);
  const seatIndex = Number.isInteger(rawSeatIndex) ? rawSeatIndex : null;

  return {
    tableId,
    seatIndex,
  };
}

function getAssignmentEntry(assignments, unitKey) {
  return normalizeAssignmentEntry(assignments[unitKey]);
}

function sanitizeAssignments(units, tables, assignments) {
  const validUnitKeys = new Set(units.map((unit) => unit.key));
  const tableById = new Map(tables.map((table) => [table.id, table]));
  const source = assignments && typeof assignments === 'object' ? assignments : {};
  const clean = {};

  Object.entries(source).forEach(([unitKey, rawAssignment]) => {
    const assignment = normalizeAssignmentEntry(rawAssignment);
    if (!assignment) {
      return;
    }

    const table = tableById.get(assignment.tableId);
    if (!table || !validUnitKeys.has(unitKey)) {
      return;
    }

    const normalizedSeatIndex = Number.isInteger(assignment.seatIndex)
      ? clamp(assignment.seatIndex, 0, Math.max(0, table.capacity - 1))
      : null;

    clean[unitKey] = {
      tableId: assignment.tableId,
      seatIndex: normalizedSeatIndex,
    };
  });

  return clean;
}

function loadPlanConfig() {
  try {
    const raw = localStorage.getItem(TABLE_PLAN_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    if (Array.isArray(parsed.tables)) {
      return {
        tables: sanitizePlannerTables(parsed.tables),
        assignmentMode: sanitizeAssignmentMode(parsed.assignmentMode),
        assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {},
        view: sanitizeMapView(parsed.view),
      };
    }

    const legacyTableCount = Number(parsed.tableCount || 0);
    const legacySeatsPerTable = Number(parsed.seatsPerTable || 0);

    if (Number.isFinite(legacyTableCount) && Number.isFinite(legacySeatsPerTable)) {
      const tableCount = toInteger(legacyTableCount, 12, 1, 60);
      const seatsPerTable = toInteger(legacySeatsPerTable, 8, 1, 60);

      return {
        tables: buildUniformTables(tableCount, seatsPerTable),
        assignmentMode: 'group',
        assignments: {},
        view: getDefaultMapView(),
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

function savePlanConfig() {
  try {
    localStorage.setItem(
      TABLE_PLAN_STORAGE_KEY,
      JSON.stringify({
        tables: plannerState.tables,
        assignmentMode: plannerState.assignmentMode,
        assignments: plannerState.assignments,
        view: plannerState.view,
      })
    );
  } catch (error) {
    // Ignore storage errors.
  }
}

function clearPlanConfig() {
  try {
    localStorage.removeItem(TABLE_PLAN_STORAGE_KEY);
  } catch (error) {
    // Ignore storage errors.
  }
}

function buildGuestGroups(records) {
  const grouped = new Map();

  records
    .filter((record) => record.attend === 'yes')
    .forEach((record) => {
      const key = record.normalizedGroupName || record.normalizedFullName;
      const names = record.attendeeNames.length ? record.attendeeNames : [record.fullName];

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          groupName: record.groupName,
          households: 0,
          seats: 0,
          names: [],
        });
      }

      const group = grouped.get(key);
      group.households += 1;
      group.seats += names.length;
      group.names.push(...names);
    });

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      names: group.names.filter(Boolean),
      searchableText: normalizeName(`${group.groupName} ${group.names.join(' ')}`),
    }))
    .sort((a, b) => {
      if (b.seats !== a.seats) return b.seats - a.seats;
      return a.groupName.localeCompare(b.groupName, 'es', { sensitivity: 'base' });
    });
}

function buildGuestIndividuals(records) {
  const groupTotals = new Map();
  const rows = [];

  records
    .filter((record) => record.attend === 'yes')
    .forEach((record) => {
      const names = record.attendeeNames.length ? record.attendeeNames : [record.fullName];
      const groupKey = record.normalizedGroupName || record.normalizedFullName || normalizeName(record.groupName);

      groupTotals.set(groupKey, (groupTotals.get(groupKey) || 0) + names.length);

      names.forEach((rawName, index) => {
        const name = rawName.toString().trim();
        if (!name) return;

        const key = `${record.normalizedFullName || 'invitado'}-${index}-${normalizeName(name)}`;

        rows.push({
          key,
          label: name,
          groupName: record.groupName,
          groupKey,
          searchableText: normalizeName(`${name} ${record.groupName}`),
        });
      });
    });

  rows.forEach((row) => {
    row.groupSize = groupTotals.get(row.groupKey) || 1;
  });

  return rows.sort((a, b) => {
    const byGroup = a.groupName.localeCompare(b.groupName, 'es', { sensitivity: 'base' });
    if (byGroup !== 0) return byGroup;
    return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
  });
}

function buildIndividualProgress(units, assignedUnitKeys = null) {
  const totals = new Map();
  const assigned = new Map();

  units.forEach((unit) => {
    if (!totals.has(unit.groupKey)) {
      totals.set(unit.groupKey, unit.groupSize || 1);
    }

    const isAssigned = assignedUnitKeys
      ? assignedUnitKeys.has(unit.key)
      : Boolean(getAssignmentEntry(plannerState.assignments, unit.key));

    if (!isAssigned) {
      return;
    }

    assigned.set(unit.groupKey, (assigned.get(unit.groupKey) || 0) + 1);
  });

  return { totals, assigned };
}

function getActiveUnits() {
  if (plannerState.assignmentMode === 'individual') {
    return cachedIndividuals.map((person) => ({
      key: person.key,
      label: person.label,
      groupName: person.groupName,
      groupKey: person.groupKey,
      groupSize: person.groupSize,
      members: [person.label],
      size: 1,
      kind: 'individual',
    }));
  }

  return cachedGroups.map((group) => ({
    key: group.key,
    label: group.groupName,
    groupName: group.groupName,
    groupKey: group.key,
    groupSize: group.names.length,
    members: [...group.names],
    size: group.names.length,
    kind: 'group',
  }));
}

function buildUnitMap(units) {
  const map = new Map();
  units.forEach((unit) => {
    map.set(unit.key, unit);
  });
  return map;
}

function createGroupTag(groupName) {
  const text = (groupName || 'Sin grupo').toString().trim() || 'Sin grupo';
  return createElement('span', 'group-tag', text);
}

function normalizeSeatIndex(index, totalSeats) {
  if (!Number.isInteger(index) || totalSeats < 1) {
    return null;
  }

  const normalized = index % totalSeats;
  return normalized < 0 ? normalized + totalSeats : normalized;
}

function findSeatBlock(seatOwners, requiredSeats, preferredSeatIndex = null) {
  const totalSeats = seatOwners.length;
  if (requiredSeats < 1 || requiredSeats > totalSeats) {
    return null;
  }

  const starts = [];
  const normalizedPreferred = normalizeSeatIndex(preferredSeatIndex, totalSeats);

  if (normalizedPreferred !== null) {
    starts.push(normalizedPreferred);
  }

  for (let index = 0; index < totalSeats; index += 1) {
    if (!starts.includes(index)) {
      starts.push(index);
    }
  }

  for (const start of starts) {
    const block = [];
    let isAvailable = true;

    for (let step = 0; step < requiredSeats; step += 1) {
      const seatIndex = (start + step) % totalSeats;
      if (seatOwners[seatIndex]) {
        isAvailable = false;
        break;
      }
      block.push(seatIndex);
    }

    if (isAvailable) {
      return block;
    }
  }

  return null;
}

function buildPlannerPlan(units, tables, assignments) {
  const totalGuests = units.reduce((sum, unit) => sum + unit.size, 0);
  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);

  const tableRows = tables.map((table, index) => ({
    ...table,
    tableNumber: index + 1,
    remaining: table.capacity,
    assignments: [],
    seatOwners: Array.from({ length: table.capacity }, () => null),
  }));

  const tableById = new Map(tableRows.map((table) => [table.id, table]));
  const unassignedUnits = [];

  units.forEach((unit) => {
    const assignmentEntry = getAssignmentEntry(assignments, unit.key);
    if (!assignmentEntry) {
      unassignedUnits.push(unit);
      return;
    }

    const targetTable = tableById.get(assignmentEntry.tableId);
    if (!targetTable) {
      unassignedUnits.push(unit);
      return;
    }

    if (unit.size > targetTable.remaining) {
      unassignedUnits.push(unit);
      return;
    }

    const seatIndexes = findSeatBlock(targetTable.seatOwners, unit.size, assignmentEntry.seatIndex);
    if (!seatIndexes) {
      unassignedUnits.push(unit);
      return;
    }

    const tableAssignment = {
      unitKey: unit.key,
      label: unit.label,
      groupName: unit.groupName,
      members: [...unit.members],
      size: unit.size,
      kind: unit.kind,
      seatIndexes,
    };

    targetTable.assignments.push(tableAssignment);

    seatIndexes.forEach((seatIndex, memberIndex) => {
      const memberName = unit.members[memberIndex] || unit.label;
      targetTable.seatOwners[seatIndex] = {
        unitKey: unit.key,
        label: unit.label,
        memberName,
        groupName: unit.groupName,
        kind: unit.kind,
        size: unit.size,
        memberIndex,
      };
    });

    targetTable.remaining -= unit.size;
  });

  const assignedGuests = tableRows.reduce((sum, table) => sum + (table.capacity - table.remaining), 0);

  return {
    totalGuests,
    totalCapacity,
    assignedGuests,
    tables: tableRows,
    unassignedUnits,
    capacityShortage: Math.max(0, totalGuests - totalCapacity),
  };
}

function buildAutoAssignments(units, tables, assignmentMode) {
  const totalGuests = units.reduce((sum, unit) => sum + unit.size, 0);
  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);

  if (!units.length) {
    return { ok: false, error: 'No hay invitados confirmados para distribuir en mesas.' };
  }

  if (!tables.length) {
    return { ok: false, error: 'Agrega al menos una mesa antes de acomodar automaticamente.' };
  }

  if (totalGuests > totalCapacity) {
    return {
      ok: false,
      error: `Capacidad insuficiente: faltan ${totalGuests - totalCapacity} asientos para todos los invitados.`,
    };
  }

  const workingTables = tables.map((table) => ({
    id: table.id,
    label: table.label,
    remaining: table.capacity,
  }));

  const sortedUnits = [...units].sort((a, b) => b.size - a.size);
  const assignments = {};

  for (const unit of sortedUnits) {
    let bestFit = null;

    workingTables.forEach((table) => {
      if (table.remaining < unit.size) {
        return;
      }

      const diff = table.remaining - unit.size;
      if (!bestFit || diff < bestFit.diff) {
        bestFit = { table, diff };
      }
    });

    if (!bestFit) {
      const unitDescription = assignmentMode === 'individual'
        ? `la persona "${unit.label}"`
        : `el grupo "${unit.label}" (${unit.size} personas)`;

      return {
        ok: false,
        error: `No fue posible ubicar ${unitDescription} sin dividirlo. Ajusta capacidades o acomoda manualmente.`,
      };
    }

    assignments[unit.key] = {
      tableId: bestFit.table.id,
      seatIndex: null,
    };
    bestFit.table.remaining -= unit.size;
  }

  return { ok: true, assignments };
}

function renderStats(records, groups) {
  const confirmedRows = records.filter((record) => record.attend === 'yes');
  const declinedRows = records.filter((record) => record.attend === 'no');
  const peopleTotal = confirmedRows.reduce((sum, record) => sum + record.peopleCount, 0);

  if (statGroups) statGroups.textContent = String(groups.length);
  if (statHouseholds) statHouseholds.textContent = String(confirmedRows.length);
  if (statPeople) statPeople.textContent = String(peopleTotal);
  if (statDeclined) statDeclined.textContent = String(declinedRows.length);
}

function renderGroupedList(groups, query = '') {
  if (!groupedList) return;

  clearChildren(groupedList);
  const normalizedQuery = normalizeName(query || '');

  const visibleGroups = normalizedQuery
    ? groups.filter((group) => group.searchableText.includes(normalizedQuery))
    : groups;

  if (!visibleGroups.length) {
    groupedList.appendChild(createElement('p', 'empty-note', 'No hay grupos que coincidan con la busqueda.'));
    return;
  }

  visibleGroups.forEach((group) => {
    const card = createElement('article', 'group-item');
    card.appendChild(createElement('h3', '', group.groupName));
    card.appendChild(createElement('p', 'group-meta', `Hogares: ${group.households} · Personas: ${group.seats}`));
    card.appendChild(createElement('p', 'group-names', `Integrantes: ${group.names.join(', ')}`));
    groupedList.appendChild(card);
  });
}

function renderDeclinedList(records) {
  if (!declinedList) return;

  clearChildren(declinedList);

  const declinedRows = records
    .filter((record) => record.attend === 'no')
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' }));

  if (!declinedRows.length) {
    declinedList.appendChild(createElement('p', 'empty-note', 'Aun no hay respuestas de no asistencia.'));
    return;
  }

  declinedRows.forEach((record) => {
    const card = createElement('article', 'declined-item');
    card.appendChild(createElement('h3', '', record.fullName));
    card.appendChild(createElement('p', 'declined-meta', `Grupo: ${record.groupName} · Correo: ${record.email}`));
    declinedList.appendChild(card);
  });
}

function appendAssignmentLine(container, assignment) {
  const line = createElement('p', 'table-group-line');
  const seatText = Array.isArray(assignment.seatIndexes) && assignment.seatIndexes.length
    ? ` · Asientos ${assignment.seatIndexes.map((seatIndex) => seatIndex + 1).join(', ')}`
    : '';

  if (assignment.kind === 'group') {
    line.textContent = `${assignment.label}: ${assignment.members.join(', ')}${seatText}`;
  } else {
    line.textContent = `Persona: ${assignment.label}${seatText}`;
  }

  line.appendChild(createGroupTag(assignment.groupName));
  container.appendChild(line);
}

function renderTablePlan(planResult) {
  if (!tablePlanOutput) return;

  clearChildren(tablePlanOutput);

  if (!plannerState.tables.length) {
    tablePlanOutput.appendChild(createElement('p', 'empty-note', 'Agrega mesas para generar una distribucion.'));
    return;
  }

  if (!planResult.totalGuests) {
    tablePlanOutput.appendChild(createElement('p', 'empty-note', 'Aun no hay invitados confirmados para acomodar.'));
  }

  if (planResult.capacityShortage > 0) {
    tablePlanOutput.appendChild(
      createElement(
        'p',
        'empty-note',
        `Capacidad insuficiente: faltan ${planResult.capacityShortage} asientos para cubrir a todos los invitados.`
      )
    );
  }

  planResult.tables.forEach((table) => {
    const assignedCount = table.capacity - table.remaining;
    const card = createElement('article', 'table-item');

    card.appendChild(createElement('h3', '', `${table.label} · ${assignedCount}/${table.capacity}`));
    card.appendChild(
      createElement(
        'p',
        'table-meta',
        table.remaining > 0 ? `Asientos libres: ${table.remaining}` : 'Mesa completa'
      )
    );

    if (!table.assignments.length) {
      card.appendChild(createElement('p', 'table-group-line', 'Sin invitados asignados.'));
      tablePlanOutput.appendChild(card);
      return;
    }

    table.assignments.forEach((assignment) => {
      appendAssignmentLine(card, assignment);
    });

    tablePlanOutput.appendChild(card);
  });

  if (planResult.unassignedUnits.length) {
    const pendingCard = createElement('article', 'table-item');
    const pendingTitle = plannerState.assignmentMode === 'individual' ? 'Personas pendientes' : 'Grupos pendientes';

    pendingCard.appendChild(createElement('h3', '', pendingTitle));
    pendingCard.appendChild(
      createElement(
        'p',
        'table-meta',
        `${planResult.unassignedUnits.length} pendientes aun no tienen mesa asignada.`
      )
    );

    planResult.unassignedUnits.forEach((unit) => {
      const line = createElement('p', 'table-group-line', unit.kind === 'group' ? unit.label : unit.label);
      line.appendChild(createGroupTag(unit.groupName));
      pendingCard.appendChild(line);
    });

    tablePlanOutput.appendChild(pendingCard);
  }
}

function renderTableConfigList(planResult) {
  if (!tableConfigList) return;

  clearChildren(tableConfigList);

  if (!plannerState.tables.length) {
    tableConfigList.appendChild(createElement('p', 'empty-note', 'Aun no has agregado mesas.'));
    return;
  }

  const tableById = new Map(planResult.tables.map((table) => [table.id, table]));

  plannerState.tables.forEach((table, index) => {
    const tableState = tableById.get(table.id);
    const occupied = tableState ? tableState.capacity - tableState.remaining : 0;

    const item = createElement('article', 'table-config-item');
    const grid = createElement('div', 'table-config-grid');

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'table-config-name';
    labelInput.maxLength = 40;
    labelInput.value = table.label;
    labelInput.dataset.tableId = table.id;

    const capacityInput = document.createElement('input');
    capacityInput.type = 'number';
    capacityInput.className = 'table-config-capacity';
    capacityInput.min = '1';
    capacityInput.max = '60';
    capacityInput.value = String(table.capacity);
    capacityInput.dataset.tableId = table.id;

    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.className = 'table-config-size';
    sizeInput.min = '60';
    sizeInput.max = '200';
    sizeInput.step = '5';
    sizeInput.value = String(table.size || 100);
    sizeInput.dataset.tableId = table.id;

    const ratioInput = document.createElement('input');
    ratioInput.type = 'text';
    ratioInput.className = 'table-config-ratio';
    ratioInput.maxLength = 9;
    ratioInput.placeholder = '1:1';
    ratioInput.value = table.ratio || '1:1';
    ratioInput.dataset.tableId = table.id;

    const removeButton = createElement('button', 'btn btn--mini btn--danger-soft', 'Eliminar');
    removeButton.type = 'button';
    removeButton.dataset.action = 'remove-table';
    removeButton.dataset.tableId = table.id;

    grid.appendChild(labelInput);
    grid.appendChild(capacityInput);
    grid.appendChild(sizeInput);
    grid.appendChild(ratioInput);
    grid.appendChild(removeButton);

    item.appendChild(grid);
    item.appendChild(
      createElement(
        'p',
        'table-config-meta',
        `Mesa ${index + 1} · Ocupacion actual: ${occupied}/${table.capacity} · Tamano ${table.size || 100}% · Relacion ${table.ratio || '1:1'}`
      )
    );

    tableConfigList.appendChild(item);
  });
}

function renderManualAssignmentHeader() {
  if (!manualAssignmentTitle || !manualAssignmentCopy) {
    return;
  }

  if (plannerState.assignmentMode === 'individual') {
    manualAssignmentTitle.textContent = 'Elementos por persona';
    manualAssignmentCopy.textContent = 'Arrastra persona por persona hacia asientos o al centro de la mesa. El tag indica su familia.';
    return;
  }

  manualAssignmentTitle.textContent = 'Elementos por familia';
  manualAssignmentCopy.textContent = 'Arrastra cada familia completa para sentarla en bloque de asientos contiguos.';
}

function renderPlannerModeHint() {
  if (!plannerModeHint) {
    return;
  }

  if (plannerState.assignmentMode === 'individual') {
    plannerModeHint.textContent = 'Modo por persona activo: arrastra cada invitado a un asiento o al centro de una mesa. Usa Automatico si quieres una propuesta inicial.';
    return;
  }

  plannerModeHint.textContent = 'Modo por familia activo: cada grupo se coloca en bloque de asientos contiguos. Puedes ajustar manualmente arrastrando.';
}

function renderPlanExplainer(planResult, units) {
  if (!tablePlanExplainer) {
    return;
  }

  if (!units.length) {
    tablePlanExplainer.textContent = 'Aun no hay invitados confirmados para acomodar. Cuando lleguen confirmaciones, podras distribuirlos aqui.';
    return;
  }

  if (!plannerState.tables.length) {
    tablePlanExplainer.textContent = 'Agrega al menos una mesa para iniciar el acomodo.';
    return;
  }

  const totalFreeSeats = planResult.tables.reduce((sum, table) => sum + table.remaining, 0);
  const pendingCount = planResult.unassignedUnits.length;

  const modeIntro = plannerState.assignmentMode === 'individual'
    ? 'Acomodo fragmentado por persona activo.'
    : 'Acomodo por grupo activo.';

  const pendingText = pendingCount > 0
    ? `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'} por ubicar.`
    : 'Todos los invitados ya tienen mesa.';

  tablePlanExplainer.textContent = `${modeIntro} ${planResult.assignedGuests}/${planResult.totalGuests} invitados asignados y ${totalFreeSeats} asientos libres en total. ${pendingText}`;
}

function renderManualAssignmentList(planResult, units) {
  if (!manualAssignmentList) return;

  clearChildren(manualAssignmentList);

  if (!units.length) {
    manualAssignmentList.appendChild(createElement('p', 'empty-note', 'Sin confirmaciones para acomodar.'));
    return;
  }

  if (!plannerState.tables.length) {
    manualAssignmentList.appendChild(
      createElement('p', 'empty-note', 'Primero agrega mesas para habilitar el acomodo manual.')
    );
    return;
  }

  const assignmentByUnitKey = new Map();
  planResult.tables.forEach((table) => {
    table.assignments.forEach((assignment) => {
      assignmentByUnitKey.set(assignment.unitKey, {
        tableLabel: table.label,
        seatIndexes: assignment.seatIndexes || [],
      });
    });
  });

  const individualProgress = plannerState.assignmentMode === 'individual'
    ? buildIndividualProgress(units, new Set(assignmentByUnitKey.keys()))
    : null;

  units.forEach((unit) => {
    const assignmentMeta = assignmentByUnitKey.get(unit.key);
    const isAssigned = Boolean(assignmentMeta);

    const item = createElement('article', 'manual-assignment-item');
    item.classList.add('assignment-card');
    item.dataset.unitKey = unit.key;
    item.setAttribute('draggable', 'true');

    if (isAssigned) {
      item.classList.add('is-assigned');
    }

    const head = createElement('div', 'manual-item-head');
    head.appendChild(createElement('h3', '', unit.label));
    head.appendChild(createGroupTag(unit.groupName));
    item.appendChild(head);

    let rowMeta = `${unit.size} ${unit.size === 1 ? 'persona' : 'personas'} · ${isAssigned ? `Asignado a ${assignmentMeta.tableLabel}` : 'Sin asignar'}`;

    if (isAssigned && assignmentMeta.seatIndexes.length) {
      rowMeta += ` · Asientos ${assignmentMeta.seatIndexes.map((seatIndex) => seatIndex + 1).join(', ')}`;
    }

    if (plannerState.assignmentMode === 'individual' && individualProgress) {
      const total = individualProgress.totals.get(unit.groupKey) || unit.groupSize || 1;
      const assigned = individualProgress.assigned.get(unit.groupKey) || 0;
      rowMeta += ` · Grupo ${assigned}/${total} asignados`;
    }

    item.appendChild(createElement('p', 'manual-row-meta', rowMeta));

    const helpText = isAssigned
      ? 'Puedes arrastrarlo de nuevo a otra mesa o asiento.'
      : 'Arrastralo a una mesa o a un asiento circular.';
    item.appendChild(createElement('p', 'manual-row-meta', helpText));

    const tools = createElement('div', 'assignment-card-tools');
    const clearButton = createElement('button', 'btn btn--mini btn--neutral', 'Quitar');
    clearButton.type = 'button';
    clearButton.dataset.action = 'clear-unit';
    clearButton.dataset.unitKey = unit.key;
    clearButton.disabled = !isAssigned;
    tools.appendChild(clearButton);

    item.appendChild(tools);
    manualAssignmentList.appendChild(item);
  });
}

function getTableNodeSize(capacity, sizePercent = 100) {
  const baseSize = clamp(190 + capacity * 4, 210, 420);
  return clamp((baseSize * sizePercent) / 100, 170, 620);
}

function getSeatSize(capacity, sizePercent = 100) {
  const base = clamp(26 - Math.floor((capacity - 8) / 3), 10, 24);
  const scaled = (base * clamp(sizePercent, 70, 170)) / 100;
  return clamp(scaled, 10, 26);
}

function getTableCoreDimensions(nodeSize, ratioX, ratioY) {
  const base = clamp(nodeSize * 0.46, 112, 230);
  let width = base;
  let height = base;

  if (ratioX > ratioY) {
    width = base * (ratioX / ratioY);
  } else if (ratioY > ratioX) {
    height = base * (ratioY / ratioX);
  }

  return {
    width: clamp(width, 102, nodeSize * 0.82),
    height: clamp(height, 90, nodeSize * 0.78),
  };
}

function updateMapZoomLabel() {
  if (!mapZoomLabel) {
    return;
  }

  const zoom = sanitizeMapView(plannerState.view).zoom;
  mapZoomLabel.textContent = `Zoom ${Math.round(zoom * 100)}%`;
}

function applyMapViewTransform() {
  plannerState.view = sanitizeMapView(plannerState.view);

  if (mapViewportElement) {
    mapViewportElement.style.transform = `translate(${plannerState.view.panX}px, ${plannerState.view.panY}px) scale(${plannerState.view.zoom})`;
  }

  updateMapZoomLabel();
}

function getMapVirtualPoint(clientX, clientY) {
  if (!tableMap) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const bounds = tableMap.getBoundingClientRect();
  const width = tableMap.clientWidth || bounds.width || 1;
  const height = tableMap.clientHeight || bounds.height || 1;
  const view = sanitizeMapView(plannerState.view);

  return {
    x: ((clientX - bounds.left) - view.panX) / view.zoom,
    y: ((clientY - bounds.top) - view.panY) / view.zoom,
    width,
    height,
  };
}

function zoomMapAt(nextZoom, clientX, clientY) {
  if (!tableMap) {
    return;
  }

  const view = sanitizeMapView(plannerState.view);
  const clampedZoom = clamp(nextZoom, 0.45, 2.8);
  if (Math.abs(clampedZoom - view.zoom) < 0.001) {
    return;
  }

  const bounds = tableMap.getBoundingClientRect();
  const localX = clientX - bounds.left;
  const localY = clientY - bounds.top;
  const worldX = (localX - view.panX) / view.zoom;
  const worldY = (localY - view.panY) / view.zoom;

  plannerState.view.zoom = clampedZoom;
  plannerState.view.panX = localX - worldX * clampedZoom;
  plannerState.view.panY = localY - worldY * clampedZoom;

  applyMapViewTransform();
}

function stepMapZoom(multiplier) {
  if (!tableMap) {
    return;
  }

  const bounds = tableMap.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const currentZoom = sanitizeMapView(plannerState.view).zoom;

  zoomMapAt(currentZoom * multiplier, centerX, centerY);
  savePlanConfig();
}

function resetMapView() {
  plannerState.view = getDefaultMapView();
  applyMapViewTransform();
  savePlanConfig();
  setTablePlanStatus('Vista del lienzo reiniciada.', 'success');
}

function handleMapWheel(event) {
  if (!tableMap) {
    return;
  }

  event.preventDefault();
  const currentZoom = sanitizeMapView(plannerState.view).zoom;
  const nextZoom = event.deltaY < 0 ? currentZoom * 1.1 : currentZoom * 0.9;
  zoomMapAt(nextZoom, event.clientX, event.clientY);
  savePlanConfig();
}

function toSeatBadgeText(seatOwner) {
  const source = seatOwner.kind === 'group' ? seatOwner.groupName : seatOwner.memberName;
  const parts = source
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'X';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function renderTableMap(planResult) {
  if (!tableMap) return;

  clearChildren(tableMap);
  mapViewportElement = null;

  if (!plannerState.tables.length) {
    tableMap.appendChild(createElement('p', 'empty-note', 'Agrega mesas para construir el croquis.'));
    updateMapZoomLabel();
    return;
  }

  mapViewportElement = createElement('div', 'table-map-viewport');
  tableMap.appendChild(mapViewportElement);

  planResult.tables.forEach((table) => {
    const tableRatio = parseTableRatio(table.ratio || `${table.ratioX || 1}:${table.ratioY || 1}`);
    const tableSize = table.size || 100;
    const assignedCount = table.capacity - table.remaining;
    const nodeSize = getTableNodeSize(table.capacity, tableSize);
    const seatSize = getSeatSize(table.capacity, tableSize);
    const coreDimensions = getTableCoreDimensions(nodeSize, tableRatio.x, tableRatio.y);
    const center = nodeSize / 2;
    const maxRatioPart = Math.max(tableRatio.x, tableRatio.y);
    const radiusBase = Math.max(58, center - seatSize / 2 - 12);
    const radiusX = radiusBase * (tableRatio.x / maxRatioPart);
    const radiusY = radiusBase * (tableRatio.y / maxRatioPart);

    let groupedNames = '';

    if (plannerState.assignmentMode === 'individual') {
      groupedNames = table.assignments
        .map((assignment) => `${assignment.label} (${assignment.groupName})`)
        .join(', ');
    } else {
      groupedNames = Array.from(new Set(table.assignments.map((assignment) => assignment.groupName))).join(', ');
    }

    if (groupedNames.length > 130) {
      groupedNames = `${groupedNames.slice(0, 127)}...`;
    }

    const node = createElement('article', 'map-table-node');
    node.dataset.tableId = table.id;
    node.style.left = `${table.x}%`;
    node.style.top = `${table.y}%`;
    node.style.setProperty('--table-node-size', `${nodeSize}px`);
    node.style.setProperty('--seat-size', `${seatSize}px`);
    node.style.setProperty('--table-core-width', `${coreDimensions.width}px`);
    node.style.setProperty('--table-core-height', `${coreDimensions.height}px`);

    const seatRing = createElement('div', 'map-seat-ring');

    for (let seatIndex = 0; seatIndex < table.capacity; seatIndex += 1) {
      const angle = -Math.PI / 2 + (2 * Math.PI * seatIndex) / table.capacity;
      const x = center + Math.cos(angle) * radiusX;
      const y = center + Math.sin(angle) * radiusY;
      const seatOwner = table.seatOwners[seatIndex];

      const seat = createElement('div', 'map-seat');
      seat.dataset.tableId = table.id;
      seat.dataset.seatIndex = String(seatIndex);
      seat.style.left = `${x}px`;
      seat.style.top = `${y}px`;

      if (seatOwner) {
        seat.classList.add('is-filled');
        seat.textContent = toSeatBadgeText(seatOwner);
        seat.title = `${seatOwner.memberName} · ${seatOwner.groupName}`;
      } else {
        seat.textContent = String(seatIndex + 1);
        seat.title = `Asiento ${seatIndex + 1} libre`;
      }

      seatRing.appendChild(seat);
    }

    const core = createElement('div', 'map-table-core');
    core.dataset.tableId = table.id;

    const dragHandle = createElement('button', 'map-table-drag-handle', 'Mover');
    dragHandle.type = 'button';
    dragHandle.dataset.tableId = table.id;

    core.appendChild(dragHandle);
    core.appendChild(createElement('p', 'map-table-title', table.label));
    core.appendChild(
      createElement('p', 'map-table-occupancy', `${assignedCount}/${table.capacity} asientos ocupados`)
    );
    core.appendChild(
      createElement('p', 'map-table-groups', groupedNames || `Sin grupos · Relacion ${tableRatio.label}`)
    );

    node.appendChild(seatRing);
    node.appendChild(core);
    mapViewportElement.appendChild(node);
  });

  applyMapViewTransform();
}

function syncUniformInputs() {
  if (!tablePlanForm) return;

  const tableCountInput = tablePlanForm.querySelector('input[name="tableCount"]');
  const seatsPerTableInput = tablePlanForm.querySelector('input[name="seatsPerTable"]');

  if (tableCountInput) {
    tableCountInput.value = String(Math.max(1, plannerState.tables.length || 1));
  }

  if (seatsPerTableInput && plannerState.tables.length) {
    const firstCapacity = plannerState.tables[0].capacity;
    const allEqual = plannerState.tables.every((table) => table.capacity === firstCapacity);
    if (allEqual) {
      seatsPerTableInput.value = String(firstCapacity);
    }
  }
}

function setDefaultPlannerStatus(planResult, units) {
  if (!units.length) {
    setTablePlanStatus('Aun no hay confirmaciones de asistencia para organizar mesas.', 'success');
    return;
  }

  if (!plannerState.tables.length) {
    setTablePlanStatus('Agrega al menos una mesa para iniciar el acomodo.', 'error');
    return;
  }

  if (planResult.capacityShortage > 0) {
    setTablePlanStatus(
      `Capacidad insuficiente: faltan ${planResult.capacityShortage} asientos para cubrir todos los invitados.`,
      'error'
    );
    return;
  }

  if (planResult.unassignedUnits.length) {
    const pendingLabel = plannerState.assignmentMode === 'individual' ? 'personas' : 'grupos';

    setTablePlanStatus(
      `Acomodo parcial: ${planResult.assignedGuests}/${planResult.totalGuests} invitados asignados. Faltan ${planResult.unassignedUnits.length} ${pendingLabel}.`,
      'warning'
    );
    return;
  }

  setTablePlanStatus(
    `Acomodo completo: ${planResult.totalGuests} invitados en ${planResult.tables.length} mesas.`,
    'success'
  );
}

function renderAssignmentModeTabs() {
  if (!assignmentModeTabs) {
    return;
  }

  const tabButtons = assignmentModeTabs.querySelectorAll('button.assignment-mode-tab[data-mode]');
  tabButtons.forEach((button) => {
    const mode = (button.dataset.mode || '').toString();
    const isActive = mode === plannerState.assignmentMode;
    button.classList.toggle('is-active', isActive);
  });
}

function renderPlanner(statusMessage = '', statusType = 'success') {
  plannerState.tables = sanitizePlannerTables(plannerState.tables);
  plannerState.assignmentMode = sanitizeAssignmentMode(plannerState.assignmentMode);
  plannerState.view = sanitizeMapView(plannerState.view);

  const activeUnits = getActiveUnits();
  plannerState.assignments = sanitizeAssignments(activeUnits, plannerState.tables, plannerState.assignments);

  renderAssignmentModeTabs();

  renderManualAssignmentHeader();
  renderPlannerModeHint();

  const planResult = buildPlannerPlan(activeUnits, plannerState.tables, plannerState.assignments);

  syncUniformInputs();
  renderTableConfigList(planResult);
  renderManualAssignmentList(planResult, activeUnits);
  renderTableMap(planResult);
  renderTablePlan(planResult);
  renderPlanExplainer(planResult, activeUnits);

  if (statusMessage) {
    setTablePlanStatus(statusMessage, statusType);
  } else {
    setDefaultPlannerStatus(planResult, activeUnits);
  }

  return planResult;
}

function addManualTable() {
  if (!tablePlanForm) return;

  const formData = new FormData(tablePlanForm);
  const tableCapacity = toInteger(formData.get('tableCapacity'), 0, 1, 60);

  if (!Number.isFinite(tableCapacity) || tableCapacity < 1) {
    setTablePlanStatus('Ingresa una capacidad valida para agregar la mesa.', 'error');
    return;
  }

  const index = plannerState.tables.length;
  const tableLabel = normalizeTableLabel(formData.get('tableLabel'), index);
  const position = getDefaultTablePosition(index);

  plannerState.tables.push({
    id: createTableId(String(index + 1)),
    label: tableLabel,
    capacity: tableCapacity,
    size: 100,
    ratio: '1:1',
    ratioX: 1,
    ratioY: 1,
    x: position.x,
    y: position.y,
  });

  savePlanConfig();
  renderPlanner(`Mesa agregada: ${tableLabel} (${tableCapacity} asientos).`, 'success');
}

function generateUniformTablesFromForm() {
  if (!tablePlanForm) return;

  const formData = new FormData(tablePlanForm);
  const tableCount = toInteger(formData.get('tableCount'), 0, 1, 60);
  const seatsPerTable = toInteger(formData.get('seatsPerTable'), 0, 1, 60);

  if (!Number.isFinite(tableCount) || !Number.isFinite(seatsPerTable)) {
    setTablePlanStatus('Ingresa valores validos para generar mesas uniformes.', 'error');
    return;
  }

  plannerState.tables = buildUniformTables(tableCount, seatsPerTable);
  plannerState.assignments = {};

  savePlanConfig();
  renderPlanner(
    `Se generaron ${tableCount} mesas base de ${seatsPerTable} asientos. Ajustalas o mueve su posicion en el croquis.`,
    'success'
  );
}

function runAutomaticAssignment() {
  const activeUnits = getActiveUnits();
  const automaticResult = buildAutoAssignments(activeUnits, plannerState.tables, plannerState.assignmentMode);
  if (!automaticResult.ok) {
    setTablePlanStatus(automaticResult.error, 'error');
    renderPlanner();
    return;
  }

  plannerState.assignments = automaticResult.assignments;
  savePlanConfig();
  renderPlanner('Acomodo automatico generado. Puedes arrastrar despues para ajustar mesa por mesa.', 'success');
}

function clearAssignments() {
  plannerState.assignments = {};
  savePlanConfig();
  renderPlanner('Se limpio el acomodo actual. Las mesas configuradas se mantienen.', 'success');
}

function removeTable(tableId) {
  plannerState.tables = plannerState.tables.filter((table) => table.id !== tableId);

  Object.entries(plannerState.assignments).forEach(([groupKey, rawAssignment]) => {
    const assignment = normalizeAssignmentEntry(rawAssignment);
    if (assignment && assignment.tableId === tableId) {
      delete plannerState.assignments[groupKey];
    }
  });

  savePlanConfig();
  renderPlanner('Mesa eliminada del plan.', 'success');
}

function updateTableConfig(target) {
  const tableId = (target.dataset.tableId || '').toString();
  const tableIndex = plannerState.tables.findIndex((table) => table.id === tableId);
  if (tableIndex < 0) return;

  if (target.classList.contains('table-config-name')) {
    plannerState.tables[tableIndex].label = normalizeTableLabel(target.value, tableIndex);
  }

  if (target.classList.contains('table-config-capacity')) {
    plannerState.tables[tableIndex].capacity = toInteger(target.value, plannerState.tables[tableIndex].capacity, 1, 60);
  }

  if (target.classList.contains('table-config-size')) {
    plannerState.tables[tableIndex].size = toInteger(target.value, plannerState.tables[tableIndex].size || 100, 60, 200);
  }

  if (target.classList.contains('table-config-ratio')) {
    const ratioInfo = parseTableRatio(target.value);
    plannerState.tables[tableIndex].ratio = ratioInfo.label;
    plannerState.tables[tableIndex].ratioX = ratioInfo.x;
    plannerState.tables[tableIndex].ratioY = ratioInfo.y;
  }

  savePlanConfig();
  renderPlanner('Configuracion de mesa actualizada.', 'success');
}

function assignUnitToTable(unitKey, tableId, seatIndex = null) {
  const units = getActiveUnits();
  const unitMap = buildUnitMap(units);

  plannerState.assignments = sanitizeAssignments(units, plannerState.tables, plannerState.assignments);

  const unit = unitMap.get(unitKey);
  const table = plannerState.tables.find((entry) => entry.id === tableId);

  if (!unit || !table) {
    setTablePlanStatus('No se pudo asignar el elemento seleccionado.', 'error');
    return;
  }

  const normalizedSeatIndex = Number.isInteger(seatIndex)
    ? clamp(seatIndex, 0, Math.max(0, table.capacity - 1))
    : null;

  const trialAssignments = {
    ...plannerState.assignments,
    [unitKey]: {
      tableId,
      seatIndex: normalizedSeatIndex,
    },
  };

  const trialPlan = buildPlannerPlan(units, plannerState.tables, trialAssignments);
  const unitIsPending = trialPlan.unassignedUnits.some((entry) => entry.key === unitKey);

  if (unitIsPending) {
    const unitLabel = unit.kind === 'individual' ? unit.label : `el grupo ${unit.label}`;
    setTablePlanStatus(`La mesa ${table.label} no tiene espacio suficiente para ${unitLabel} en esa zona de asientos.`, 'error');
    return;
  }

  plannerState.assignments = sanitizeAssignments(units, plannerState.tables, trialAssignments);
  savePlanConfig();

  const tablePlan = trialPlan.tables.find((entry) => entry.id === tableId);
  const assignment = tablePlan
    ? tablePlan.assignments.find((entry) => entry.unitKey === unitKey)
    : null;

  const seatMessage = assignment && assignment.seatIndexes.length
    ? ` Asientos ${assignment.seatIndexes.map((index) => index + 1).join(', ')}.`
    : '';

  renderPlanner(`${unit.label} se asigno a ${table.label}.${seatMessage}`, 'success');
}

function clearUnitAssignment(unitKey) {
  if (!plannerState.assignments[unitKey]) {
    setTablePlanStatus('Ese elemento ya estaba sin asignacion.', 'success');
    return;
  }

  delete plannerState.assignments[unitKey];
  savePlanConfig();
  renderPlanner('Asignacion manual removida para el elemento seleccionado.', 'success');
}

function updateTablePosition(tableId, x, y) {
  const table = plannerState.tables.find((entry) => entry.id === tableId);
  if (!table) return;

  table.x = clamp(x, 8, 92);
  table.y = clamp(y, 10, 90);
}

function updateTableNodePosition(node, x, y) {
  node.style.left = `${clamp(x, 8, 92)}%`;
  node.style.top = `${clamp(y, 10, 90)}%`;
}

function handleMapPointerDown(event) {
  if (!tableMap) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const dragHandle = target.closest('.map-table-drag-handle');
  if (dragHandle) {
    const tableNode = dragHandle.closest('.map-table-node');
    if (!tableNode || !tableMap.contains(tableNode)) {
      return;
    }

    const tableId = (tableNode.dataset.tableId || '').toString();
    if (!tableId) {
      return;
    }

    mapDragState = {
      tableId,
      pointerId: event.pointerId,
      node: tableNode,
    };

    tableNode.classList.add('is-dragging');
    tableNode.setPointerCapture(event.pointerId);
    event.preventDefault();
    return;
  }

  if (target.closest('.map-table-node')) {
    return;
  }

  mapPanState = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPanX: plannerState.view.panX,
    startPanY: plannerState.view.panY,
  };

  tableMap.classList.add('is-panning');
  tableMap.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handleMapPointerMove(event) {
  if (!tableMap) {
    return;
  }

  if (mapDragState && mapDragState.pointerId === event.pointerId) {
    const virtualPoint = getMapVirtualPoint(event.clientX, event.clientY);
    const x = (virtualPoint.x / virtualPoint.width) * 100;
    const y = (virtualPoint.y / virtualPoint.height) * 100;

    updateTablePosition(mapDragState.tableId, x, y);
    updateTableNodePosition(mapDragState.node, x, y);
    return;
  }

  if (!mapPanState || mapPanState.pointerId !== event.pointerId) {
    return;
  }

  plannerState.view.panX = mapPanState.startPanX + (event.clientX - mapPanState.startClientX);
  plannerState.view.panY = mapPanState.startPanY + (event.clientY - mapPanState.startClientY);

  applyMapViewTransform();
}

function handleMapPointerUp(event) {
  if (mapDragState && mapDragState.pointerId === event.pointerId) {
    const activeNode = mapDragState.node;
    activeNode.classList.remove('is-dragging');

    try {
      activeNode.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Ignore pointer capture release errors.
    }

    mapDragState = null;
    savePlanConfig();
    setTablePlanStatus('Croquis actualizado y guardado.', 'success');
    return;
  }

  if (!mapPanState || mapPanState.pointerId !== event.pointerId || !tableMap) {
    return;
  }

  mapPanState = null;
  tableMap.classList.remove('is-panning');

  try {
    tableMap.releasePointerCapture(event.pointerId);
  } catch (error) {
    // Ignore pointer capture release errors.
  }

  savePlanConfig();
  setTablePlanStatus('Vista del lienzo actualizada.', 'success');
}

function clearDropTargetState() {
  if (!currentDropTarget) {
    return;
  }

  currentDropTarget.classList.remove('is-drop-target');
  currentDropTarget = null;
}

function setDropTargetState(nextTarget) {
  if (currentDropTarget === nextTarget) {
    return;
  }

  clearDropTargetState();

  if (!nextTarget) {
    return;
  }

  currentDropTarget = nextTarget;
  currentDropTarget.classList.add('is-drop-target');
}

function getDropTargetFromMapEventTarget(target) {
  if (!(target instanceof HTMLElement) || !tableMap) {
    return null;
  }

  const seat = target.closest('.map-seat');
  if (seat && tableMap.contains(seat)) {
    const tableId = (seat.dataset.tableId || '').toString();
    const rawSeatIndex = Number(seat.dataset.seatIndex);

    if (!tableId || !Number.isInteger(rawSeatIndex)) {
      return null;
    }

    return {
      tableId,
      seatIndex: rawSeatIndex,
      element: seat,
    };
  }

  const core = target.closest('.map-table-core');
  if (core && tableMap.contains(core)) {
    const tableId = (core.dataset.tableId || '').toString();
    if (!tableId) {
      return null;
    }

    return {
      tableId,
      seatIndex: null,
      element: core,
    };
  }

  return null;
}

function getDragUnitKey(event) {
  const fromTransfer = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
  return fromTransfer || draggingUnitKey;
}

function handleAssignmentDragStart(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !event.dataTransfer) {
    return;
  }

  const card = target.closest('.manual-assignment-item[data-unit-key]');
  if (!card) {
    return;
  }

  const unitKey = (card.dataset.unitKey || '').toString();
  if (!unitKey) {
    return;
  }

  draggingUnitKey = unitKey;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', unitKey);
  card.classList.add('is-dragging');
}

function handleAssignmentDragEnd(event) {
  const target = event.target;
  if (target instanceof HTMLElement) {
    const card = target.closest('.manual-assignment-item[data-unit-key]');
    if (card) {
      card.classList.remove('is-dragging');
    }
  }

  draggingUnitKey = '';
  clearDropTargetState();
}

function handleMapDragOver(event) {
  const unitKey = getDragUnitKey(event);
  if (!unitKey) {
    clearDropTargetState();
    return;
  }

  const dropTarget = getDropTargetFromMapEventTarget(event.target);
  if (!dropTarget) {
    clearDropTargetState();
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  setDropTargetState(dropTarget.element);
}

function handleMapDrop(event) {
  const unitKey = getDragUnitKey(event);
  if (!unitKey) {
    clearDropTargetState();
    return;
  }

  const dropTarget = getDropTargetFromMapEventTarget(event.target);
  if (!dropTarget) {
    clearDropTargetState();
    return;
  }

  event.preventDefault();
  assignUnitToTable(unitKey, dropTarget.tableId, dropTarget.seatIndex);
  clearDropTargetState();
}

function handleUnassignedDragOver(event) {
  const unitKey = getDragUnitKey(event);
  if (!unitKey || !assignmentUnassignedDrop) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  setDropTargetState(assignmentUnassignedDrop);
}

function handleUnassignedDrop(event) {
  const unitKey = getDragUnitKey(event);
  if (!unitKey) {
    clearDropTargetState();
    return;
  }

  event.preventDefault();
  clearUnitAssignment(unitKey);
  clearDropTargetState();
}

function closeTableContextMenu() {
  if (!tableContextMenu) {
    return;
  }

  tableContextMenu.hidden = true;
  delete tableContextMenu.dataset.tableId;
}

function openTableContextMenu(tableId, clientX, clientY) {
  if (
    !tableContextMenu
    || !tableContextLabelInput
    || !tableContextCapacityInput
    || !tableContextSizeInput
    || !tableContextRatioInput
  ) {
    return;
  }

  const table = plannerState.tables.find((entry) => entry.id === tableId);
  if (!table) {
    return;
  }

  tableContextMenu.dataset.tableId = table.id;
  tableContextLabelInput.value = table.label;
  tableContextCapacityInput.value = String(table.capacity);
  tableContextSizeInput.value = String(table.size || 100);
  tableContextRatioInput.value = table.ratio || '1:1';
  tableContextMenu.hidden = false;

  const menuWidth = tableContextMenu.offsetWidth || 280;
  const menuHeight = tableContextMenu.offsetHeight || 220;
  const left = clamp(clientX + 8, 8, Math.max(8, window.innerWidth - menuWidth - 8));
  const top = clamp(clientY + 8, 8, Math.max(8, window.innerHeight - menuHeight - 8));

  tableContextMenu.style.left = `${left}px`;
  tableContextMenu.style.top = `${top}px`;
}

function saveTableFromContextMenu() {
  if (
    !tableContextMenu
    || !tableContextLabelInput
    || !tableContextCapacityInput
    || !tableContextSizeInput
    || !tableContextRatioInput
  ) {
    return;
  }

  const tableId = (tableContextMenu.dataset.tableId || '').toString();
  const tableIndex = plannerState.tables.findIndex((table) => table.id === tableId);
  if (tableIndex < 0) {
    closeTableContextMenu();
    return;
  }

  plannerState.tables[tableIndex].label = normalizeTableLabel(tableContextLabelInput.value, tableIndex);
  plannerState.tables[tableIndex].capacity = toInteger(
    tableContextCapacityInput.value,
    plannerState.tables[tableIndex].capacity,
    1,
    60
  );

  plannerState.tables[tableIndex].size = toInteger(
    tableContextSizeInput.value,
    plannerState.tables[tableIndex].size || 100,
    60,
    200
  );

  const ratioInfo = parseTableRatio(tableContextRatioInput.value);
  plannerState.tables[tableIndex].ratio = ratioInfo.label;
  plannerState.tables[tableIndex].ratioX = ratioInfo.x;
  plannerState.tables[tableIndex].ratioY = ratioInfo.y;

  savePlanConfig();
  closeTableContextMenu();
  renderPlanner('Mesa editada desde el croquis.', 'success');
}

function handleMapContextMenu(event) {
  if (!tableMap) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const tableNode = target.closest('.map-table-node');
  if (!tableNode || !tableMap.contains(tableNode)) {
    return;
  }

  const tableId = (tableNode.dataset.tableId || '').toString();
  if (!tableId) {
    return;
  }

  event.preventDefault();
  openTableContextMenu(tableId, event.clientX, event.clientY);
}

function refreshDashboard(statusMessage = '', statusType = 'success') {
  const savedPlan = loadPlanConfig();
  if (savedPlan) {
    plannerState = {
      tables: sanitizePlannerTables(savedPlan.tables),
      assignmentMode: sanitizeAssignmentMode(savedPlan.assignmentMode),
      assignments: savedPlan.assignments,
      view: sanitizeMapView(savedPlan.view),
    };
  }

  const records = readRsvpRecords();
  cachedGroups = buildGuestGroups(records);
  cachedIndividuals = buildGuestIndividuals(records);

  renderStats(records, cachedGroups);
  renderGroupedList(cachedGroups, groupSearchInput ? groupSearchInput.value : '');
  renderDeclinedList(records);

  renderPlanner(statusMessage, statusType);
}

if (refreshButton) {
  refreshButton.addEventListener('click', () => {
    refreshDashboard('Panel actualizado con la ultima informacion.', 'success');
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem(PANEL_SESSION_KEY);
    window.location.href = PANEL_LOGIN_ROUTE;
  });
}

if (groupSearchInput) {
  groupSearchInput.addEventListener('input', () => {
    renderGroupedList(cachedGroups, groupSearchInput.value);
  });
}

if (tablePlanForm) {
  tablePlanForm.addEventListener('submit', (event) => {
    event.preventDefault();
  });
}

if (assignmentAutoButton) {
  assignmentAutoButton.addEventListener('click', () => {
    runAutomaticAssignment();
  });
}

if (tablePlanResetButton) {
  tablePlanResetButton.addEventListener('click', () => {
    clearAssignments();
  });
}

if (tableAddButton) {
  tableAddButton.addEventListener('click', () => {
    addManualTable();
  });
}

if (tableGenerateUniformButton) {
  tableGenerateUniformButton.addEventListener('click', () => {
    generateUniformTablesFromForm();
  });
}

if (tableConfigList) {
  tableConfigList.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (
      !target.classList.contains('table-config-name')
      && !target.classList.contains('table-config-capacity')
      && !target.classList.contains('table-config-size')
      && !target.classList.contains('table-config-ratio')
    ) {
      return;
    }

    updateTableConfig(target);
  });

  tableConfigList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionButton = target.closest('button[data-action="remove-table"]');
    if (!actionButton) {
      return;
    }

    const tableId = (actionButton.dataset.tableId || '').toString();
    if (!tableId) {
      return;
    }

    removeTable(tableId);
  });
}

if (manualAssignmentList) {
  manualAssignmentList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const unitKey = (button.dataset.unitKey || '').toString();
    if (!unitKey) {
      return;
    }

    if (action === 'clear-unit') {
      clearUnitAssignment(unitKey);
    }
  });

  manualAssignmentList.addEventListener('dragstart', handleAssignmentDragStart);
  manualAssignmentList.addEventListener('dragend', handleAssignmentDragEnd);
}

if (assignmentModeTabs) {
  assignmentModeTabs.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest('button.assignment-mode-tab[data-mode]');
    if (!button) {
      return;
    }

    const selectedMode = (button.dataset.mode || '').toString();
    if (selectedMode === 'auto') {
      runAutomaticAssignment();
      return;
    }

    const nextMode = sanitizeAssignmentMode(selectedMode);

    if (plannerState.assignmentMode === nextMode) {
      return;
    }

    plannerState.assignmentMode = nextMode;
    plannerState.assignments = {};
    savePlanConfig();

    const modeMessage = nextMode === 'individual'
      ? 'Modo individual activo. Ahora puedes acomodar persona por persona con tag de grupo.'
      : 'Modo por grupo activo. Se prioriza mantener grupos juntos en cada mesa.';

    renderPlanner(modeMessage, 'success');
  });
}

if (assignmentUnassignedDrop) {
  assignmentUnassignedDrop.addEventListener('dragover', handleUnassignedDragOver);
  assignmentUnassignedDrop.addEventListener('drop', handleUnassignedDrop);
  assignmentUnassignedDrop.addEventListener('dragleave', () => {
    clearDropTargetState();
  });
}

if (mapZoomInButton) {
  mapZoomInButton.addEventListener('click', () => {
    stepMapZoom(1.15);
  });
}

if (mapZoomOutButton) {
  mapZoomOutButton.addEventListener('click', () => {
    stepMapZoom(0.85);
  });
}

if (mapViewResetButton) {
  mapViewResetButton.addEventListener('click', () => {
    resetMapView();
  });
}

if (tableMap) {
  tableMap.addEventListener('pointerdown', handleMapPointerDown);
  tableMap.addEventListener('pointermove', handleMapPointerMove);
  tableMap.addEventListener('pointerup', handleMapPointerUp);
  tableMap.addEventListener('pointercancel', handleMapPointerUp);
  tableMap.addEventListener('wheel', handleMapWheel, { passive: false });
  tableMap.addEventListener('dragover', handleMapDragOver);
  tableMap.addEventListener('drop', handleMapDrop);
  tableMap.addEventListener('dragleave', () => {
    clearDropTargetState();
  });
  tableMap.addEventListener('contextmenu', handleMapContextMenu);
}

if (tableContextSaveButton) {
  tableContextSaveButton.addEventListener('click', () => {
    saveTableFromContextMenu();
  });
}

if (tableContextDeleteButton) {
  tableContextDeleteButton.addEventListener('click', () => {
    if (!tableContextMenu) {
      return;
    }

    const tableId = (tableContextMenu.dataset.tableId || '').toString();
    if (!tableId) {
      closeTableContextMenu();
      return;
    }

    closeTableContextMenu();
    removeTable(tableId);
  });
}

if (tableContextCancelButton) {
  tableContextCancelButton.addEventListener('click', () => {
    closeTableContextMenu();
  });
}

document.addEventListener('pointerdown', (event) => {
  if (!tableContextMenu || tableContextMenu.hidden) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (!tableContextMenu.contains(target)) {
    closeTableContextMenu();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeTableContextMenu();
  }
});

refreshDashboard();
