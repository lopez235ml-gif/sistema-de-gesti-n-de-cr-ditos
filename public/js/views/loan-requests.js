// Vista de Solicitudes de Préstamo

let requestsData = [];
let clientsForRequests = [];
let creditTypesForRequests = [];

async function renderLoanRequests() {
  try {
    [requestsData, clientsForRequests, creditTypesForRequests] = await Promise.all([
      loanRequestsAPI.getAll(),
      clientsAPI.getAll(),
      creditTypesAPI.getAll()
    ]);

    const pending = requestsData.filter(r => r.status === 'pending');
    const approved = requestsData.filter(r => r.status === 'approved');
    const rejected = requestsData.filter(r => r.status === 'rejected');

    return `
      <div class="container">
        <div class="flex-between mb-4">
          <h1 style="font-size: var(--font-size-3xl); font-weight: 700;">Solicitudes de Préstamo</h1>
          <button class="btn btn-primary" onclick="showRequestModal()">+ Nueva Solicitud</button>
        </div>

        <div class="grid grid-3 mb-4">
          <div class="stat-card">
            <div class="stat-label">Pendientes</div>
            <div class="stat-value" style="color: var(--warning);">${pending.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Aprobadas</div>
            <div class="stat-value" style="color: var(--secondary);">${approved.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Rechazadas</div>
            <div class="stat-value" style="color: var(--danger);">${rejected.length}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Todas las Solicitudes</h2>
          </div>
          <div class="card-body">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tipo de Crédito</th>
                    <th>Monto</th>
                    <th>Plazo</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${requestsData.map(req => `
                    <tr>
                      <td>${req.client_name}</td>
                      <td>${req.credit_type_name}</td>
                      <td>$${req.requested_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>${req.requested_term} meses</td>
                      <td>
                        <span class="badge ${req.status === 'pending' ? 'badge-warning' :
        req.status === 'approved' ? 'badge-success' : 'badge-danger'
      }">
                          ${req.status}
                        </span>
                      </td>
                      <td>${new Date(req.created_at).toLocaleDateString('es-ES')}</td>
                      <td>
                        ${req.status === 'pending' ? `
                          <button class="btn btn-sm btn-secondary" onclick="approveRequest(${req.id})">Aprobar</button>
                          <button class="btn btn-sm btn-danger" onclick="rejectRequest(${req.id})">Rechazar</button>
                        ` : '-'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    <div id="requestModal" style="display: none;"></div>
    <div id="approvalModal" style="display: none;"></div>
    `;
  } catch (error) {
    console.error('Error cargando solicitudes:', error);
    return '<div class="container"><p style="color: var(--danger);">Error cargando solicitudes</p></div>';
  }
}

function showRequestModal() {
  const modal = document.getElementById('requestModal');

  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeRequestModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Nueva Solicitud de Préstamo</h2>
          <button class="btn btn-sm" onclick="closeRequestModal()">✕</button>
        </div>
        <div class="modal-body">
          <form id="requestForm">
            <div class="form-group">
              <label class="form-label">Cliente *</label>
              <select id="client_id" class="form-select" required>
                <option value="">Seleccione un cliente</option>
                ${clientsForRequests.filter(c => c.status === 'active').map(c => `
                  <option value="${c.id}">${c.full_name} - ${c.id_number}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de Crédito *</label>
              <select id="credit_type_id" class="form-select" required onchange="updateMaxTerm()">
                <option value="">Seleccione un tipo</option>
                ${creditTypesForRequests.filter(ct => ct.active).map(ct => `
                  <option value="${ct.id}" data-max-term="${ct.max_term_months}">${ct.name} - ${ct.interest_rate}%</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Monto Solicitado *</label>
              <input type="number" step="0.01" id="requested_amount" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Plazo (meses) *</label>
              <input type="number" id="requested_term" class="form-input" required />
              <small id="maxTermHint" style="color: var(--text-muted);"></small>
            </div>
            <div class="form-group">
              <label class="form-label">Notas</label>
              <textarea id="notes" class="form-textarea"></textarea>
            </div>

            <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h3 style="font-size: 1rem; margin-bottom: 10px; color: var(--text-primary);">🧑‍🤝‍🧑 Información del Aval / Co-deudor (Opcional)</h3>
                
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">Nombre Completo</label>
                        <input type="text" id="guarantor_name" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cédula / ID</label>
                        <input type="text" id="guarantor_id_number" class="form-input" />
                    </div>
                </div>

                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">Teléfono</label>
                        <input type="tel" id="guarantor_phone" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Parentesco/Relación</label>
                        <input type="text" id="guarantor_relationship" class="form-input" placeholder="Ej. Hermano, Amigo" />
                    </div>
                </div>

                <div class="form-group mb-0">
                    <label class="form-label">Dirección</label>
                    <input type="text" id="guarantor_address" class="form-input" />
                </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeRequestModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveRequest()">Crear Solicitud</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'block';
}

function updateMaxTerm() {
  const select = document.getElementById('credit_type_id');
  const option = select.options[select.selectedIndex];
  const maxTerm = option.getAttribute('data-max-term');
  const hint = document.getElementById('maxTermHint');

  if (maxTerm) {
    hint.textContent = `Plazo máximo: ${maxTerm} meses`;
  } else {
    hint.textContent = '';
  }
}

function closeRequestModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('requestModal').style.display = 'none';
  }
}

async function saveRequest() {
  const data = {
    client_id: parseInt(document.getElementById('client_id').value),
    credit_type_id: parseInt(document.getElementById('credit_type_id').value),
    requested_amount: parseFloat(document.getElementById('requested_amount').value),
    requested_term: parseInt(document.getElementById('requested_term').value),
    notes: document.getElementById('notes').value,
    guarantor_name: document.getElementById('guarantor_name').value,
    guarantor_id_number: document.getElementById('guarantor_id_number').value,
    guarantor_phone: document.getElementById('guarantor_phone').value,
    guarantor_address: document.getElementById('guarantor_address').value,
    guarantor_relationship: document.getElementById('guarantor_relationship').value
  };

  try {
    await loanRequestsAPI.create(data);
    closeRequestModal();
    window.location.reload();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function approveRequest(id) {
  const modal = document.getElementById('approvalModal');

  const today = new Date();
  const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
  const defaultDate = nextMonth.toISOString().split('T')[0];

  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeApprovalModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Aprobar Solicitud</h2>
          <button class="btn btn-sm" onclick="closeApprovalModal()">✕</button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro de aprobar esta solicitud?</p>
          <div class="form-group mt-3">
            <label class="form-label">Fecha del Primer Pago *</label>
            <input type="date" id="first_payment_date" class="form-input" value="${defaultDate}" required />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeApprovalModal()">Cancelar</button>
          <button class="btn btn-secondary" onclick="confirmApproval(${id})">Aprobar</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'block';
}

function closeApprovalModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('approvalModal').style.display = 'none';
  }
}

async function confirmApproval(id) {
  const firstPaymentDate = document.getElementById('first_payment_date').value;

  try {
    await loanRequestsAPI.approve(id, { first_payment_date: firstPaymentDate });
    closeApprovalModal();
    window.location.reload();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function rejectRequest(id) {
  const notes = prompt('Motivo del rechazo (opcional):');

  try {
    await loanRequestsAPI.reject(id, notes);
    window.location.reload();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function initLoanRequests() {
  // Inicialización si es necesaria
}
