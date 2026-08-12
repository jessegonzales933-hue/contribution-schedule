const SHEET_ID =
  '2PACX-1vSSh_DdPRl_ciQr-sO9ePgmFoNTYqssPzUdE5RpPQ3E3gyZmcV1Q5pqIKDHqHWoJMWKgMLK5IfaoF49';

const GID = '984704368';

const QUERY_URL =
  `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/gviz/tq?gid=${GID}&tqx=out:json`;

let scheduleData = [];


/* =========================================================
   LOAD DATA WHEN PAGE OPENS
   ========================================================= */

document.addEventListener('DOMContentLoaded', loadScheduleData);


async function loadScheduleData() {
  const message = document.getElementById('message');
  const congregationSelect = document.getElementById('congregation');

  congregationSelect.innerHTML =
    '<option value="">Cargando congregaciones...</option>';

  try {
    const freshUrl =
      QUERY_URL + '&t=' + Date.now();

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 12000);

    const response = await fetch(freshUrl, {
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        'Google Sheets respondió con código ' + response.status
      );
    }

    const rawText = await response.text();

    scheduleData = parseGoogleVisualizationResponse(rawText);

    if (scheduleData.length === 0) {
      throw new Error(
        'No se encontraron datos en PublicSchedule.'
      );
    }

    populateCongregations();

    message.textContent = '';

  } catch (error) {
    console.error('Error cargando horario:', error);

    congregationSelect.innerHTML =
      '<option value="">No se pudo cargar el horario</option>';

    message.innerHTML =
      '<p class="error">' +
      'No se pudo cargar el horario. ' +
      'Actualice la página e intente nuevamente.' +
      '</p>';
  }
}


/* =========================================================
   PARSE GOOGLE VISUALIZATION RESPONSE
   ========================================================= */

function parseGoogleVisualizationResponse(text) {

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error(
      'Google Sheets devolvió una respuesta inesperada.'
    );
  }

  const jsonText =
    text.substring(start, end + 1);

  const data =
    JSON.parse(jsonText);

  if (
    !data.table ||
    !data.table.cols ||
    !data.table.rows
  ) {
    throw new Error(
      'No se pudo interpretar el horario.'
    );
  }

  const headers =
    data.table.cols.map(column => {
      return String(
        column.label ||
        column.id ||
        ''
      ).trim();
    });

  const rows =
    data.table.rows.map(row => {

      const record = {};

      headers.forEach((header, index) => {

        const cell =
          row.c[index];

        let value = '';

        if (cell) {

          if (
            cell.f !== undefined &&
            cell.f !== null
          ) {
            value = cell.f;

          } else if (
            cell.v !== undefined &&
            cell.v !== null
          ) {
            value = cell.v;
          }
        }

        record[header] =
          String(value).trim();
      });

      return record;
    });

  return rows.filter(row => {
    return Object.values(row)
      .some(value => value !== '');
  });
}


/* =========================================================
   CONGREGATION DROPDOWN
   ========================================================= */

function populateCongregations() {

  const congregationSelect =
    document.getElementById('congregation');

  const volunteerSelect =
    document.getElementById('volunteer');

  const searchButton =
    document.getElementById('searchButton');

  const congregations = [
    ...new Set(
      scheduleData
        .map(row => getField(row, 'Congregation'))
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  congregationSelect.innerHTML =
    '<option value="">Seleccione su congregación</option>';

  congregations.forEach(congregation => {

    const option =
      document.createElement('option');

    option.value =
      congregation;

    option.textContent =
      congregation;

    congregationSelect.appendChild(option);
  });

  volunteerSelect.innerHTML =
    '<option value="">Primero seleccione una congregación</option>';

  volunteerSelect.disabled =
    true;

  searchButton.disabled =
    true;
}


/* =========================================================
   WHEN CONGREGATION CHANGES
   ========================================================= */

document
  .getElementById('congregation')
  .addEventListener('change', function () {

    populateVolunteers(
      this.value
    );

  });


function populateVolunteers(congregation) {

  const volunteerSelect =
    document.getElementById('volunteer');

  const searchButton =
    document.getElementById('searchButton');

  const resultsCard =
    document.getElementById('resultsCard');

  const message =
    document.getElementById('message');

  resultsCard.classList.add('hidden');

  message.textContent = '';

  if (!congregation) {

    volunteerSelect.innerHTML =
      '<option value="">Primero seleccione una congregación</option>';

    volunteerSelect.disabled =
      true;

    searchButton.disabled =
      true;

    return;
  }

  const volunteers = [
    ...new Set(
      scheduleData

        .filter(row => {

          return normalizeText(
            getField(row, 'Congregation')
          ) ===
          normalizeText(congregation);

        })

        .map(row =>
          getField(row, 'Volunteer')
        )

        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  volunteerSelect.innerHTML =
    '<option value="">Seleccione su nombre</option>';

  volunteers.forEach(volunteer => {

    const option =
      document.createElement('option');

    option.value =
      volunteer;

    option.textContent =
      volunteer;

    volunteerSelect.appendChild(option);
  });

  volunteerSelect.disabled =
    false;

  searchButton.disabled =
    true;
}


/* =========================================================
   ENABLE SEARCH BUTTON
   ========================================================= */

document
  .getElementById('volunteer')
  .addEventListener('change', function () {

    document
      .getElementById('searchButton')
      .disabled = !this.value;

  });


/* =========================================================
   SEARCH BUTTON
   ========================================================= */

document
  .getElementById('searchButton')
  .addEventListener('click', showSchedule);


/* =========================================================
   DISPLAY SCHEDULE
   ========================================================= */

function showSchedule() {

  const congregation =
    document
      .getElementById('congregation')
      .value;

  const volunteer =
    document
      .getElementById('volunteer')
      .value;

  const message =
    document.getElementById('message');

  const resultsCard =
    document.getElementById('resultsCard');

  const results =
    document.getElementById('results');

  if (
    !congregation ||
    !volunteer
  ) {

    message.innerHTML =
      '<p class="error">' +
      'Seleccione su congregación y su nombre.' +
      '</p>';

    resultsCard.classList.add('hidden');

    return;
  }

  const assignments =
    scheduleData.filter(row => {

      const rowCongregation =
        getField(row, 'Congregation');

      const rowVolunteer =
        getField(row, 'Volunteer');

      const rowStatus =
        getField(row, 'Status');

      return (
        normalizeText(rowCongregation) ===
          normalizeText(congregation) &&

        normalizeText(rowVolunteer) ===
          normalizeText(volunteer) &&

        normalizeText(rowStatus) ===
          'asignado'
      );
    });

  if (
    assignments.length === 0
  ) {

    message.innerHTML =
      '<p class="error">' +
      'No se encontró un horario para este voluntario.' +
      '</p>';

    resultsCard.classList.add('hidden');

    return;
  }

  message.textContent = '';

  let html = `
    <h2>${escapeHtml(volunteer)}</h2>

    <p>
      <strong>Congregación:</strong>
      ${escapeHtml(congregation)}
    </p>
  `;

  assignments.forEach(assignment => {

    const shift =
      getField(assignment, 'Shift');

    const time =
      getField(assignment, 'Time');

    const box =
      getField(assignment, 'Box');

    html += `
      <div class="assignment">

        <div class="assignment-title">
          ${escapeHtml(shift)}
        </div>

        <div class="assignment-line">
          <strong>Horario:</strong>
          ${escapeHtml(time)}
        </div>

        <div class="assignment-line">
          <strong>Caja:</strong>
          ${escapeHtml(box)}
        </div>

      </div>
    `;
  });

  results.innerHTML =
    html;

  resultsCard
    .classList
    .remove('hidden');
}


/* =========================================================
   FIELD HELPER
   ========================================================= */

function getField(row, expectedName) {

  const exactMatch =
    Object.keys(row).find(key => {
      return normalizeText(key) ===
        normalizeText(expectedName);
    });

  if (!exactMatch) {
    return '';
  }

  return row[exactMatch] || '';
}


/* =========================================================
   TEXT NORMALIZATION
   ========================================================= */

function normalizeText(value) {

  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );
}


/* =========================================================
   HTML SAFETY
   ========================================================= */

function escapeHtml(value) {

  const div =
    document.createElement('div');

  div.textContent =
    value || '';

  return div.innerHTML;
}
