const SHEET_ID = '2PACX-1vSSh_DdPRl_ciQr-sO9ePgmFoNTYqssPzUdE5RpPQ3E3gyZmcV1Q5pqIKDHqHWoJMWKgMLK5IfaoF49';
const GID = '984704368';

const CSV_URL =
  `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${GID}&single=true&output=csv`;const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSh_DdPRl_ciQr-sO9ePgmFoNTYqssPzUdE5RpPQ3E3gyZmcV1Q5pqIKDHqHWoJMWKgMLK5IfaoF49/pub?gid=984704368&single=true&output=csv';

let scheduleData = [];

document.addEventListener('DOMContentLoaded', loadScheduleData);

async function loadScheduleData() {
  const message = document.getElementById('message');
  const congregationSelect = document.getElementById('congregation');

  congregationSelect.innerHTML =
    '<option value="">Cargando congregaciones...</option>';

  try {
    const freshUrl = CSV_URL + '&t=' + Date.now();

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

    const csvText = await response.text();

    if (!csvText.trim()) {
      throw new Error('El horario publicado está vacío.');
    }

    scheduleData = parseCSV(csvText);

    if (scheduleData.length === 0) {
      throw new Error('No se encontraron datos del horario.');
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
  }
}

function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }

      row.push(cell);

      if (row.some(value => value.trim() !== '')) {
        rows.push(row);
      }

      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);

    if (row.some(value => value.trim() !== '')) {
      rows.push(row);
    }
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(header => header.trim());

  return rows.slice(1).map(rowValues => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = (rowValues[index] || '').trim();
    });

    return record;
  });
}

function populateCongregations() {
  const congregationSelect = document.getElementById('congregation');
  const volunteerSelect = document.getElementById('volunteer');
  const searchButton = document.getElementById('searchButton');

  const congregations = [
    ...new Set(
      scheduleData
        .map(row => row['Congregation'])
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  congregationSelect.innerHTML =
    '<option value="">Seleccione su congregación</option>';

  congregations.forEach(congregation => {
    const option = document.createElement('option');
    option.value = congregation;
    option.textContent = congregation;
    congregationSelect.appendChild(option);
  });

  volunteerSelect.innerHTML =
    '<option value="">Primero seleccione una congregación</option>';

  volunteerSelect.disabled = true;
  searchButton.disabled = true;
}

document
  .getElementById('congregation')
  .addEventListener('change', function () {
    populateVolunteers(this.value);
  });

function populateVolunteers(congregation) {
  const volunteerSelect = document.getElementById('volunteer');
  const searchButton = document.getElementById('searchButton');
  const resultsCard = document.getElementById('resultsCard');
  const message = document.getElementById('message');

  resultsCard.classList.add('hidden');
  message.textContent = '';

  if (!congregation) {
    volunteerSelect.innerHTML =
      '<option value="">Primero seleccione una congregación</option>';

    volunteerSelect.disabled = true;
    searchButton.disabled = true;
    return;
  }

  const volunteers = [
    ...new Set(
      scheduleData
        .filter(row => row['Congregation'] === congregation)
        .map(row => row['Volunteer'])
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  volunteerSelect.innerHTML =
    '<option value="">Seleccione su nombre</option>';

  volunteers.forEach(volunteer => {
    const option = document.createElement('option');
    option.value = volunteer;
    option.textContent = volunteer;
    volunteerSelect.appendChild(option);
  });

  volunteerSelect.disabled = false;
  searchButton.disabled = true;
}

document
  .getElementById('volunteer')
  .addEventListener('change', function () {
    document.getElementById('searchButton').disabled = !this.value;
  });

document
  .getElementById('searchButton')
  .addEventListener('click', showSchedule);

function showSchedule() {
  const congregation =
    document.getElementById('congregation').value;

  const volunteer =
    document.getElementById('volunteer').value;

  const message =
    document.getElementById('message');

  const resultsCard =
    document.getElementById('resultsCard');

  const results =
    document.getElementById('results');

  if (!congregation || !volunteer) {
    message.innerHTML =
      '<p class="error">Seleccione su congregación y su nombre.</p>';

    resultsCard.classList.add('hidden');
    return;
  }

  const assignments = scheduleData.filter(row => {
    return (
      row['Congregation'] === congregation &&
      row['Volunteer'] === volunteer &&
      normalizeText(row['Status']) === 'asignado'
    );
  });

  if (assignments.length === 0) {
    message.innerHTML =
      '<p class="error">No se encontró un horario para este voluntario.</p>';

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
    html += `
      <div class="assignment">
        <div class="assignment-title">
          ${escapeHtml(assignment['Shift'])}
        </div>

        <div class="assignment-line">
          <strong>Horario:</strong>
          ${escapeHtml(assignment['Time'])}
        </div>

        <div class="assignment-line">
          <strong>Caja:</strong>
          ${escapeHtml(assignment['Box'])}
        </div>
      </div>
    `;
  });

  results.innerHTML = html;
  resultsCard.classList.remove('hidden');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}
