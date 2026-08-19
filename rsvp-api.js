/* ============================================================
   rsvp-api.js — Almacenamiento compartido de confirmaciones
   Las confirmaciones viven en una base de datos (Supabase), asi
   los novios las ven desde cualquier dispositivo en su panel.
   Usado por invite.js (invitacion) y panel-novios.js (panel).
   ============================================================ */

const RSVP_API = (() => {
  const SUPABASE_URL = 'https://cnqjsxdgoxrzrrvezvwq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Djyd-ZyPkcpg-WeQexdhVw_HE3fLlZY';
  const ENDPOINT = `${SUPABASE_URL}/rest/v1/boda_rsvps`;

  const BASE_HEADERS = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  function rowToRecord(row) {
    return {
      id: row.id,
      fullName: row.full_name || '',
      normalizedFullName: row.normalized_full_name || '',
      email: row.email || '',
      attend: row.attend === 'no' ? 'no' : 'yes',
      groupName: row.group_name || '',
      peopleCount: Number(row.people_count || 0),
      attendeeNames: Array.isArray(row.attendee_names) ? row.attendee_names : [],
      song: row.song || '',
      message: row.message || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    };
  }

  function recordToRow(record) {
    return {
      full_name: record.fullName,
      normalized_full_name: record.normalizedFullName,
      email: record.email,
      attend: record.attend,
      group_name: record.groupName,
      people_count: record.peopleCount,
      attendee_names: record.attendeeNames,
      song: record.song || '',
      message: record.message || '',
    };
  }

  async function request(path, options = {}) {
    const response = await fetch(`${ENDPOINT}${path}`, {
      ...options,
      headers: { ...BASE_HEADERS, ...(options.headers || {}) },
    });

    if (!response.ok) {
      throw new Error(`RSVP API ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function fetchAll() {
    const rows = await request('?select=*&order=created_at.asc');
    return (rows || []).map(rowToRecord);
  }

  async function findByNormalizedName(normalizedFullName) {
    const rows = await request(
      `?select=*&normalized_full_name=eq.${encodeURIComponent(normalizedFullName)}&limit=1`
    );
    return rows && rows.length ? rowToRecord(rows[0]) : null;
  }

  async function insert(record) {
    const rows = await request('', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(recordToRow(record)),
    });
    return rows && rows.length ? rowToRecord(rows[0]) : null;
  }

  async function update(id, record) {
    const rows = await request(`?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(recordToRow(record)),
    });
    return rows && rows.length ? rowToRecord(rows[0]) : null;
  }

  return { fetchAll, findByNormalizedName, insert, update };
})();
