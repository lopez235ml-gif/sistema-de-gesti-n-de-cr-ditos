// Vista de Gestión de Clientes

let clientsData = [];

async function renderClients() {
  try {
    clientsData = await clientsAPI.getAll();

    return `
      <div class="container">
        <div class="flex-between mb-4">
          <h1 style="font-size: var(--font-size-3xl); font-weight: 700;">Gestión de Clientes</h1>
          <button class="btn btn-primary" onclick="showClientModal()">+ Nuevo Cliente</button>
        </div>

        <div class="card">
          <div class="card-body">
            <div class="form-group">
              <input
                type="text"
                id="searchClients"
                class="form-input"
                placeholder="Buscar clientes por nombre o identificación..."
                onkeyup="filterClients()"
              />
            </div>

            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Identificación</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="clientsTableBody">
                  ${renderClientsTable(clientsData)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    <div id="clientModal" style="display: none;"></div>
    <div id="clientHistoryModal" style="display: none;"></div>
    `;
  } catch (error) {
    console.error('Error cargando clientes:', error);
    return '<div class="container"><p style="color: var(--danger);">Error cargando clientes</p></div>';
  }
}

function renderClientsTable(clients) {
  if (clients.length === 0) {
    return '<tr><td colspan="6" class="text-center" style="color: var(--text-muted);">No hay clientes registrados</td></tr>';
  }

  return clients.map(client => `
      <tr>
      <td>${client.full_name}</td>
      <td>${client.id_number}</td>
      <td>${client.phone || 'N/A'}</td>
      <td>${client.email || 'N/A'}</td>
      <td>
        <span class="badge ${client.status === 'active' ? 'badge-success' : 'badge-warning'}">
          ${client.status}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editClient(${client.id})">Editar</button>
        <button class="btn btn-sm btn-outline" onclick="viewClientHistory(${client.id})">Historial</button>
        <button class="btn btn-sm btn-danger" onclick="deleteClient(${client.id})">Eliminar</button>
      </td>
    </tr>
      `).join('');
}

function filterClients() {
  const search = document.getElementById('searchClients').value.toLowerCase();
  const filtered = clientsData.filter(client =>
    client.full_name.toLowerCase().includes(search) ||
    client.id_number.toLowerCase().includes(search)
  );
  document.getElementById('clientsTableBody').innerHTML = renderClientsTable(filtered);
}

function showClientModal(client = null) {
  const isEdit = !!client;
  const modal = document.getElementById('clientModal');

  modal.innerHTML = `
      <div class="modal-overlay" onclick="closeClientModal(event)">
        <div class="modal" onclick="event.stopPropagation()" style="width: 800px; max-width: 95vw;">
        <div class="modal-header">
          <h2 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} Cliente</h2>
          <button class="btn btn-sm" onclick="closeClientModal()">✕</button>
        </div>

        <div class="modal-body">
          ${isEdit ? `
                <div class="tabs mb-4" style="border-bottom: 2px solid var(--border-color); display: flex; gap: 20px;">
                    <button class="tab-btn active" onclick="switchClientTab('data')" id="btn-tab-data" style="background: none; border: none; padding: 10px 0; cursor: pointer; border-bottom: 2px solid var(--primary-color); font-weight: bold;">Datos Personales</button>
                    <button class="tab-btn" onclick="switchClientTab('docs')" id="btn-tab-docs" style="background: none; border: none; padding: 10px 0; cursor: pointer; color: var(--text-muted);">Documentos Digitales</button>
                </div>
            ` : ''}

          <!-- TAB DATOS -->
          <div id="tab-data">
            <form id="clientForm">
              <div class="form-group">
                <label class="form-label">Nombre Completo *</label>
                <input type="text" id="full_name" class="form-input" value="${client?.full_name || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Identificación *</label>
                <input type="text" id="id_number" class="form-input" value="${client?.id_number || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input type="tel" id="phone" class="form-input" value="${client?.phone || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="email" class="form-input" value="${client?.email || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Dirección</label>
                <textarea id="address" class="form-textarea">${client?.address || ''}</textarea>
              </div>
              ${isEdit ? `
                <div class="form-group">
                    <label class="form-label">Estado</label>
                    <select id="status" class="form-select">
                    <option value="active" ${client?.status === 'active' ? 'selected' : ''}>Activo</option>
                    <option value="inactive" ${client?.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
                    </select>
                </div>
                ` : ''}
            </form>

            <div class="mt-4 text-right">
              <button class="btn btn-outline" onclick="closeClientModal()">Cancelar</button>
              <button class="btn btn-primary" onclick="saveClient(${client?.id || null})">Guardar Datos</button>
            </div>
          </div>

          <!-- TAB DOCUMENTOS -->
          ${isEdit ? `
            <div id="tab-docs" style="display: none;">
                <div class="card mb-4" style="border: 1px dashed var(--secondary);">
                    <div class="card-body text-center">
                        <p class="mb-2">Subir nuevo documento (Imagen o PDF)</p>
                        <input type="file" id="docFile" style="display: none" onchange="uploadClientDocument(${client.id})">
                        <label for="docFile" class="btn btn-outline">📂 Seleccionar Archivo</label>
                    </div>
                </div>

                <div id="docsList" class="grid grid-2">
                    <div class="text-center p-4">Cargando documentos...</div>
                </div>
            </div>
            ` : ''}

        </div>
      </div>
    </div>
    `;

  modal.style.display = 'block';

  if (isEdit) {
    loadClientDocuments(client.id);
  }
}

function switchClientTab(tabName) {
  document.getElementById('tab-data').style.display = tabName === 'data' ? 'block' : 'none';
  document.getElementById('tab-docs').style.display = tabName === 'docs' ? 'block' : 'none';

  document.getElementById('btn-tab-data').style.borderBottom = tabName === 'data' ? '2px solid var(--primary-color)' : 'none';
  document.getElementById('btn-tab-data').style.color = tabName === 'data' ? 'var(--text-color)' : 'var(--text-muted)';
  document.getElementById('btn-tab-data').style.fontWeight = tabName === 'data' ? 'bold' : 'normal';

  document.getElementById('btn-tab-docs').style.borderBottom = tabName === 'docs' ? '2px solid var(--primary-color)' : 'none';
  document.getElementById('btn-tab-docs').style.color = tabName === 'docs' ? 'var(--text-color)' : 'var(--text-muted)';
  document.getElementById('btn-tab-docs').style.fontWeight = tabName === 'docs' ? 'bold' : 'normal';
}

async function loadClientDocuments(clientId) {
  try {
    const docs = await documentsAPI.getByClient(clientId);
    const listContainer = document.getElementById('docsList');

    if (docs.length === 0) {
      listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No hay documentos subidos</div>';
      return;
    }

    listContainer.innerHTML = docs.map(doc => `
    <div class="card p-2 flex-between" style="align-items: center; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                    <span style="font-size: 24px;">${doc.file_type === 'pdf' ? '📄' : '🖼️'}</span>
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
                        <strong>${doc.file_name}</strong><br>
                        <small style="font-size: 10px; color: var(--text-muted);">${new Date(doc.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline" style="padding: 2px 6px;" onclick="downloadClientDocument(${doc.id}, '${doc.file_name}')">⬇️</button>
                    <button class="btn btn-sm btn-outline btn-danger" style="padding: 2px 6px;" onclick="deleteClientDocument(${doc.id}, ${clientId})">🗑️</button>
                </div>
            </div>
    `).join('');
  } catch (error) {
    console.error(error);
    document.getElementById('docsList').innerHTML = '<div class="text-danger">Error cargando docs</div>';
  }
}

async function downloadClientDocument(docId, fileName) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/documents/download/${docId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Error descargando archivo');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function uploadClientDocument(clientId) {
  const fileInput = document.getElementById('docFile');
  const file = fileInput.files[0];
  if (!file) return;

  // Validación básica
  if (file.size > 5 * 1024 * 1024) {
    alert('El archivo es muy grande (Max 5MB)');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('client_id', clientId);

  try {
    // Mostrar estado de carga?
    const btnLabel = document.querySelector('label[for="docFile"]');
    const originalText = btnLabel.innerText;
    btnLabel.innerText = 'Subiendo... ⏳';

    await documentsAPI.upload(formData);

    alert('Documento subido correctamente');
    btnLabel.innerText = originalText;
    fileInput.value = ''; // Reset
    loadClientDocuments(clientId); // Recargar lista
  } catch (error) {
    alert('Error: ' + error.message);
    document.querySelector('label[for="docFile"]').innerText = '📂 Seleccionar Archivo';
  }
}

async function deleteClientDocument(docId, clientId) {
  if (!confirm('¿Borrar este documento permanentemente?')) return;
  try {
    await documentsAPI.delete(docId);
    loadClientDocuments(clientId);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function closeClientModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('clientModal').style.display = 'none';
  }
}

async function saveClient(id) {
  const clientData = {
    full_name: document.getElementById('full_name').value,
    id_number: document.getElementById('id_number').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    address: document.getElementById('address').value
  };

  if (id) {
    clientData.status = document.getElementById('status').value;
  }

  try {
    if (id) {
      await clientsAPI.update(id, clientData);
    } else {
      await clientsAPI.create(clientData);
    }

    closeClientModal();
    window.location.reload();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function editClient(id) {
  try {
    const client = await clientsAPI.getById(id);
    showClientModal(client);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function deleteClient(id) {
  if (confirm('¿Está seguro de eliminar este cliente?')) {
    try {
      await clientsAPI.delete(id);
      window.location.reload();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }
}

async function viewClientHistory(id) {
  try {
    const client = await clientsAPI.getById(id);
    const modal = document.getElementById('clientHistoryModal');
    const stats = client.stats || {};
    const loans = client.loans || [];

    modal.innerHTML = `
    <div class="modal-overlay" onclick="closeClientHistoryModal(event)">
      <div class="modal" onclick="event.stopPropagation()" style="max-width: 800px;">
        <div class="modal-header">
          <h2 class="modal-title">Historial: ${client.full_name}</h2>
          <button class="btn btn-sm" onclick="closeClientHistoryModal()">✕</button>
        </div>
        <div class="modal-body">
          <!-- Resumen Financiero -->
          <div class="grid grid-3 mb-4">
            <div class="stat-card">
              <div class="stat-label">Deuda Actual</div>
              <div class="stat-value" style="color: ${stats.totalDebt > 0 ? 'var(--danger)' : 'var(--secondary)'}">
                $${stats.totalDebt?.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Préstamos Activos</div>
              <div class="stat-value">${stats.activeLoansCount || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Calificación</div>
              <div class="stat-value" style="font-size: var(--font-size-xl);">
                ${stats.rating || 'N/A'}
                <span style="font-size: var(--font-size-sm); color: var(--text-muted);">(${stats.score || 0}/100)</span>
              </div>
            </div>
          </div>

          <!-- Comportamiento de Pago -->
          <div class="card mb-4">
            <div class="card-body">
              <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Comportamiento de Pago</h3>
              <div style="display: flex; gap: var(--spacing-md);">
                <div style="flex: 1; text-align: center; padding: var(--spacing-sm); background: rgba(16, 185, 129, 0.1); border-radius: var(--border-radius-sm);">
                  <div style="color: var(--secondary); font-weight: 700;">${stats.onTimePayments || 0}</div>
                  <div style="font-size: var(--font-size-xs);">A Tiempo</div>
                </div>
                <div style="flex: 1; text-align: center; padding: var(--spacing-sm); background: rgba(239, 68, 68, 0.1); border-radius: var(--border-radius-sm);">
                  <div style="color: var(--danger); font-weight: 700;">${stats.latePayments || 0}</div>
                  <div style="font-size: var(--font-size-xs);">Atrasados</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabla de Préstamos -->
          <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Historial de Préstamos</h3>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Plazo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${loans.length > 0 ? loans.map(loan => `
                    <tr>
                      <td>${new Date(loan.created_at).toLocaleDateString('es-ES')}</td>
                      <td>${loan.credit_type_name}</td>
                      <td>$${loan.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>${loan.term_months} meses</td>
                      <td>
                        <span class="badge ${loan.status === 'active' ? 'badge-success' :
        loan.status === 'paid' ? 'badge-info' :
          loan.status === 'defaulted' ? 'badge-danger' : 'badge-warning'}">
                          ${loan.status}
                        </span>
                      </td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" class="text-center">Sin préstamos registrados</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="closeClientHistoryModal()">Cerrar</button>
        </div>
      </div>
      </div>
    `;

    modal.style.display = 'block';
  } catch (error) {
    alert('Error cargando historial: ' + error.message);
  }
}

function closeClientHistoryModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('clientHistoryModal').style.display = 'none';
  }
}

function initClients() {
  // Inicialización si es necesaria
}
