// Vista de Tipos de Crédito

let creditTypesData = [];

async function renderCreditTypes() {
  try {
    creditTypesData = await creditTypesAPI.getAll();

    return `
      <div class="container">
        <div class="flex-between mb-4">
          <h1 style="font-size: var(--font-size-3xl); font-weight: 700;">Tipos de Crédito</h1>
          <button class="btn btn-primary" onclick="showCreditTypeModal()">+ Nuevo Tipo</button>
        </div>

        <div class="grid grid-3">
          ${creditTypesData.map(ct => `
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title" style="font-size: var(--font-size-lg);">${ct.name}</h3>
                  <span class="badge ${ct.active ? 'badge-success' : 'badge-warning'}">
                    ${ct.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div class="card-body">
                  <div class="mb-2">
                    <strong>Tasa de Interés:</strong> ${ct.interest_rate}%
                  </div>
                  <div class="mb-2">
                    <strong>Tipo:</strong> ${ct.interest_type}
                  </div>
                  <div class="mb-2">
                    <strong>Frecuencia:</strong> ${ct.frequency}
                  </div>
                  <div class="mb-2">
                    <strong>Plazo Máximo:</strong> ${ct.max_term_months} meses
                  </div>
                  <div class="mb-2">
                    <strong>Mora:</strong> ${ct.late_fee_rate}%
                  </div>
                  <div class="mb-3">
                    <strong>Días de Gracia:</strong> ${ct.grace_days}
                  </div>
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-primary" onclick="editCreditType(${ct.id})">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCreditType(${ct.id})">Eliminar</button>
                  </div>
                </div>
              </div>
            `).join('')}
        </div>
      </div>

    <div id="creditTypeModal" style="display: none;"></div>
    `;
  } catch (error) {
    console.error('Error cargando tipos de crédito:', error);
    return '<div class="container"><p style="color: var(--danger);">Error cargando tipos de crédito</p></div>';
  }
}

function showCreditTypeModal(creditType = null) {
  const isEdit = !!creditType;
  const modal = document.getElementById('creditTypeModal');

  modal.innerHTML = `
      <div class="modal-overlay" onclick="closeCreditTypeModal(event)">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} Tipo de Crédito</h2>
            <button class="btn btn-sm" onclick="closeCreditTypeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form id="creditTypeForm">
              <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input type="text" id="name" class="form-input" value="${creditType?.name || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tasa de Interés (%) *</label>
                <input type="number" step="0.01" id="interest_rate" class="form-input" value="${creditType?.interest_rate || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tipo de Interés</label>
                <select id="interest_type" class="form-select">
                  <option value="simple" ${creditType?.interest_type === 'simple' ? 'selected' : ''}>Simple</option>
                  <option value="compound" ${creditType?.interest_type === 'compound' ? 'selected' : ''}>Compuesto</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Frecuencia de Pago</label>
                <select id="frequency" class="form-select">
                  <option value="weekly" ${creditType?.frequency === 'weekly' ? 'selected' : ''}>Semanal</option>
                  <option value="biweekly" ${creditType?.frequency === 'biweekly' ? 'selected' : ''}>Quincenal</option>
                  <option value="monthly" ${creditType?.frequency === 'monthly' ? 'selected' : ''}>Mensual</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Plazo Máximo (meses) *</label>
                <input type="number" id="max_term_months" class="form-input" value="${creditType?.max_term_months || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tasa de Mora (%)</label>
                <input type="number" step="0.01" id="late_fee_rate" class="form-input" value="${creditType?.late_fee_rate || 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Días de Gracia</label>
                <input type="number" id="grace_days" class="form-input" value="${creditType?.grace_days || 0}" />
              </div>
              ${isEdit ? `
              <div class="form-group">
                <label class="form-label">Estado</label>
                <select id="active" class="form-select">
                  <option value="1" ${creditType?.active ? 'selected' : ''}>Activo</option>
                  <option value="0" ${!creditType?.active ? 'selected' : ''}>Inactivo</option>
                </select>
              </div>
            ` : ''}
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeCreditTypeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="saveCreditType(${creditType?.id || null})">Guardar</button>
          </div>
        </div>
    </div >
      `;

  modal.style.display = 'block';
}

function closeCreditTypeModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('creditTypeModal').style.display = 'none';
  }
}

async function saveCreditType(id) {
  const data = {
    name: document.getElementById('name').value,
    interest_rate: parseFloat(document.getElementById('interest_rate').value),
    interest_type: document.getElementById('interest_type').value,
    frequency: document.getElementById('frequency').value,
    max_term_months: parseInt(document.getElementById('max_term_months').value),
    late_fee_rate: parseFloat(document.getElementById('late_fee_rate').value),
    grace_days: parseInt(document.getElementById('grace_days').value)
  };

  if (id) {
    data.active = parseInt(document.getElementById('active').value);
  }

  try {
    if (id) {
      await creditTypesAPI.update(id, data);
    } else {
      await creditTypesAPI.create(data);
    }

    closeCreditTypeModal();
    window.location.reload();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function editCreditType(id) {
  const creditType = creditTypesData.find(ct => ct.id === id);
  showCreditTypeModal(creditType);
}

async function deleteCreditType(id) {
  if (confirm('¿Está seguro de eliminar este tipo de crédito?')) {
    try {
      await creditTypesAPI.delete(id);
      window.location.reload();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }
}

function initCreditTypes() {
  // Inicialización si es necesaria
}
