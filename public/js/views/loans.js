// Vista de Préstamos

let loansData = [];

async function renderLoans() {
  try {
    loansData = await loansAPI.getAll();

    return `
      <div class="container">
          <h1 class="mb-4" style="font-size: var(--font-size-3xl); font-weight: 700;">Gestión de Préstamos</h1>

          <div class="card">
            <div class="card-body">

              <div class="form-group mb-4" style="display: flex; gap: var(--spacing-sm);">
                <input 
                  type="text" 
                  id="searchLoans" 
                  class="form-input" 
                  placeholder="Buscar préstamos por cliente, ID o tipo..."
                  onkeyup="filterLoans()"
                  style="flex: 1;"
                />
                <button class="btn btn-outline" onclick="toggleFilters()">
                  Filtros Avanzados ▼
                </button>
              </div>

              <div id="advancedFilters" class="card mb-4" style="display: none; background: var(--bg-secondary); border: 1px solid var(--border-color);">
                <div class="card-body">
                  <div class="grid grid-3">
                    <div class="form-group">
                      <label class="form-label">Estado</label>
                      <select id="filterStatus" class="form-select" onchange="filterLoans()">
                        <option value="">Todos</option>
                        <option value="active">Activo</option>
                        <option value="paid">Pagado</option>
                        <option value="defaulted">En Mora</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Fecha Aprobación (Desde)</label>
                      <input type="date" id="filterDateFrom" class="form-input" onchange="filterLoans()">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Fecha Aprobación (Hasta)</label>
                      <input type="date" id="filterDateTo" class="form-input" onchange="filterLoans()">
                    </div>
                  </div>
                  <div class="grid grid-2">
                     <div class="form-group">
                      <label class="form-label">Monto Mínimo</label>
                      <input type="number" id="filterAmountMin" class="form-input" placeholder="0" onkeyup="filterLoans()">
                    </div>
                     <div class="form-group">
                      <label class="form-label">Monto Máximo</label>
                      <input type="number" id="filterAmountMax" class="form-input" placeholder="Sin límite" onkeyup="filterLoans()">
                    </div>
                  </div>
                  <div class="text-right mt-2">
                    <button class="btn btn-sm btn-outline" onclick="clearFilters()">Limpiar Filtros</button>
                  </div>
                </div>
              </div>

              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                      <th>Tasa</th>
                      <th>Plazo</th>
                      <th>Estado</th>
                      <th>Fecha Aprobación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody id="loansTableBody">
                    ${renderLoansTable(loansData)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      
      <div id="loanDetailModal" style="display: none;"></div>
    `;
  } catch (error) {
    console.error('Error cargando préstamos:', error);
    return `
      <div class="container">
        <div class="container">
          <p style="color: var(--danger);">Error cargando préstamos</p>
        </div>
      </div>
    `;
  }
}

function renderLoansTable(loans) {
  if (loans.length === 0) {
    return '<tr><td colspan="9" class="text-center">No se encontraron préstamos</td></tr>';
  }

  return loans.map(loan => `
    <tr>
      <td>#${loan.id}</td>
      <td>${loan.client_name}</td>
      <td>${loan.credit_type_name}</td>
      <td>$${loan.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
      <td>${loan.interest_rate}%</td>
      <td>${loan.term_months} meses</td>
      <td>
        <span class="badge ${loan.status === 'active' ? 'badge-success' :
      loan.status === 'paid' ? 'badge-info' : 'badge-danger'
    }">
          ${loan.status}
        </span>
      </td>
      <td>${new Date(loan.approved_date).toLocaleDateString('es-ES')}</td>
      <td>
        <div style="display: flex; gap: 5px;">
           <button class="btn btn-sm btn-primary" onclick="viewLoanDetails(${loan.id})">Ver</button>
           ${loan.status === 'active' ?
      `<button class="btn btn-sm btn-outline" onclick="showRefinanceModal(${loan.id})" title="Renovar Préstamo">Renovar</button>`
      : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function filterLoans() {
  const search = document.getElementById('searchLoans').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const dateFrom = document.getElementById('filterDateFrom').value;
  const dateTo = document.getElementById('filterDateTo').value;
  const amountMin = parseFloat(document.getElementById('filterAmountMin').value) || 0;
  const amountMax = parseFloat(document.getElementById('filterAmountMax').value) || Infinity;

  const filtered = loansData.filter(loan => {
    // Texto
    const matchesSearch =
      loan.client_name.toLowerCase().includes(search) ||
      loan.id.toString().includes(search) ||
      loan.credit_type_name.toLowerCase().includes(search);

    // Estado
    const matchesStatus = !status || loan.status === status;

    // Fechas
    const loanDate = new Date(loan.approved_date);
    const matchesDateFrom = !dateFrom || loanDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || loanDate <= new Date(dateTo + 'T23:59:59'); // Incluir todo el día final

    // Monto
    const matchesAmount = loan.amount >= amountMin && loan.amount <= amountMax;

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesAmount;
  });

  document.getElementById('loansTableBody').innerHTML = renderLoansTable(filtered);
}

function toggleFilters() {
  const filters = document.getElementById('advancedFilters');
  const isHidden = filters.style.display === 'none';
  filters.style.display = isHidden ? 'block' : 'none';
}

function clearFilters() {
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  document.getElementById('filterAmountMin').value = '';
  document.getElementById('filterAmountMax').value = '';
  document.getElementById('searchLoans').value = ''; // Opcional: limpiar búsqueda de texto también?

  filterLoans();
}

async function viewLoanDetails(id) {
  try {
    const [loan, schedule] = await Promise.all([
      loansAPI.getById(id),
      loansAPI.getSchedule(id)
    ]);

    const modal = document.getElementById('loanDetailModal');

    modal.innerHTML = `
      <div class="modal-overlay" onclick="closeLoanDetailModal(event)">
        <div class="modal" onclick="event.stopPropagation()" style="max-width: 900px;">
          <div class="modal-header">
            <h2 class="modal-title">Detalle del Préstamo #${loan.id}</h2>
            <button class="btn btn-sm" onclick="closeLoanDetailModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="grid grid-2 mb-4">
              <div>
                <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Información del Cliente</h3>
                <p><strong>Nombre:</strong> ${loan.client_name}</p>
                <p><strong>Identificación:</strong> ${loan.id_number}</p>
                <p><strong>Teléfono:</strong> ${loan.phone || 'N/A'}</p>
                <p><strong>Email:</strong> ${loan.email || 'N/A'}</p>
              </div>
              <div>
                <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Información del Préstamo</h3>
                <p><strong>Tipo:</strong> ${loan.credit_type_name}</p>
                <p><strong>Monto:</strong> $${loan.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                <p><strong>Tasa:</strong> ${loan.interest_rate}%</p>
                <p><strong>Plazo:</strong> ${loan.term_months} meses</p>
                <p><strong>Balance:</strong> $${loan.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Tabla de Amortización</h3>
            ${loan.guarantor_name ? `
              <div class="card p-3 mb-4" style="border: 1px solid var(--border-color); background: var(--bg-tertiary);">
                  <h3 style="font-size: 1rem; margin-bottom: 10px; color: var(--text-primary);">🧑‍🤝‍🧑 Aval / Co-deudor</h3>
                  <div class="grid grid-2">
                      <div>
                          <small class="text-muted">Nombre</small>
                          <p class="font-bold">${loan.guarantor_name}</p>
                      </div>
                      <div>
                          <small class="text-muted">ID / Cédula</small>
                          <p>${loan.guarantor_id_number || '-'}</p>
                      </div>
                      <div>
                          <small class="text-muted">Teléfono</small>
                          <p>${loan.guarantor_phone || '-'}</p>
                      </div>
                      <div>
                          <small class="text-muted">Relación</small>
                          <p>${loan.guarantor_relationship || '-'}</p>
                      </div>
                  </div>
                  <div class="mt-2">
                       <small class="text-muted">Dirección</small>
                       <p>${loan.guarantor_address || '-'}</p>
                  </div>
              </div>
              <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Tabla de Amortización</h3>
            ` : ''}
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha Vencimiento</th>
                    <th>Cuota</th>
                    <th>Principal</th>
                    <th>Interés</th>
                    <th>Balance</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${schedule.map(item => `
                    <tr style="${item.paid ? 'background: rgba(16, 185, 129, 0.1);' : ''}">
                      <td>${item.payment_number}</td>
                      <td>${new Date(item.due_date).toLocaleDateString('es-ES')}</td>
                      <td>$${item.payment_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>$${item.principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>$${item.interest.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>$${item.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>
                        ${item.paid ?
        '<span class="badge badge-success">Pagado</span>' :
        '<span class="badge badge-warning">Pendiente</span>'
      }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            ${loan.payments.length > 0 ? `
              <h3 style="font-size: var(--font-size-lg); margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md);">Historial de Pagos</h3>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Principal</th>
                      <th>Interés</th>
                      <th>Mora</th>
                      <th>Recibo</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${loan.payments.map(payment => `
                      <tr>
                        <td>${new Date(payment.payment_date).toLocaleDateString('es-ES')}</td>
                        <td>$${payment.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>$${payment.principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>$${payment.interest.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>$${payment.late_fee.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <button class="btn btn-sm btn-primary" onclick="paymentsAPI.getReceipt(${payment.id})">
                            Ver Recibo
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeLoanDetailModal()">Cerrar</button>
          </div>
        </div>
      </div >
      `;

    modal.style.display = 'block';
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function closeLoanDetailModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('loanDetailModal').style.display = 'none';
  }
}

function initLoans() {
  // Inicialización si es necesaria
}

// ==========================================
// Lógica de Refinanciamiento / Renovación
// ==========================================

let currentRefinanceLoan = null;

async function showRefinanceModal(loanId) {
  try {
    const loan = await loansAPI.getById(loanId);
    currentRefinanceLoan = loan;

    const modal = document.getElementById('loanDetailModal'); // Reutilizamos contenedor

    // Calcular defaults
    const minAmount = Math.ceil(loan.balance) + 1;

    modal.innerHTML = `
            <div class="modal-overlay" onclick="closeLoanDetailModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2 class="modal-title">Renovar Préstamo #${loan.id}</h2>
                        <button class="btn btn-sm" onclick="closeLoanDetailModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-4" style="background: var(--bg-tertiary); padding: 10px; border-radius: 4px;">
                            <p class="mb-1"><strong>Cliente:</strong> ${loan.client_name}</p>
                            <p class="mb-0">Esta acción liquidará el préstamo actual y creará uno nuevo.</p>
                        </div>

                        <div class="grid grid-2 mb-4">
                            <div class="card p-3" style="border: 1px solid var(--border-color); background: var(--bg-secondary);">
                                <small class="text-muted">Deuda Actual a Liquidar</small>
                                <h3 class="text-danger">$${loan.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div class="card p-3" style="border: 1px solid var(--border-color); background: rgba(16, 185, 129, 0.1);">
                                <small class="text-muted">Efectivo a Entregar</small>
                                <h3 class="text-success" id="cashToClient">$0.00</h3>
                            </div>
                        </div>

                        <form id="refinanceForm" onsubmit="event.preventDefault(); processRefinance();">
                            <div class="form-group">
                                <label class="form-label">Nuevo Monto del Préstamo</label>
                                <input type="number" id="newAmount" class="form-input" 
                                    min="${minAmount}" step="0.01" required 
                                    placeholder="Mínimo $${minAmount}"
                                    oninput="calculateRefinanceCash()">
                                <small class="text-muted">Debe ser mayor a la deuda actual ($${loan.balance.toFixed(2)})</small>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Nuevo Plazo (Meses)</label>
                                <select id="newTerm" class="form-select" required>
                                    ${[6, 12, 18, 24, 36, 48].map(m =>
      `<option value="${m}" ${m === loan.term_months ? 'selected' : ''}>${m} meses</option>`
    ).join('')}
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="closeLoanDetailModal()">Cancelar</button>
                        <button class="btn btn-primary" onclick="processRefinance()">Confirmar Renovación</button>
                    </div>
                </div>
            </div>
        `;

    modal.style.display = 'block';
    calculateRefinanceCash(); // Inicializar

  } catch (error) {
    alert('Error cargando información: ' + error.message);
  }
}

function calculateRefinanceCash() {
  if (!currentRefinanceLoan) return;

  const newAmount = parseFloat(document.getElementById('newAmount').value) || 0;
  const balance = currentRefinanceLoan.balance;
  const cash = newAmount - balance;

  const cashElement = document.getElementById('cashToClient');

  if (cash > 0) {
    cashElement.textContent = '$' + cash.toLocaleString('es-ES', { minimumFractionDigits: 2 });
    cashElement.classList.remove('text-danger');
    cashElement.classList.add('text-success');
  } else {
    cashElement.textContent = 'Monto insuficiente';
    cashElement.classList.remove('text-success');
    cashElement.classList.add('text-danger');
  }
}

async function processRefinance() {
  if (!currentRefinanceLoan) return;

  const newAmount = parseFloat(document.getElementById('newAmount').value);
  const newTerm = parseInt(document.getElementById('newTerm').value);

  if (!newAmount || newAmount <= currentRefinanceLoan.balance) {
    alert('El nuevo monto debe ser mayor al saldo actual para cubrir la deuda.');
    return;
  }

  if (!confirm(`¿Estás seguro de renovar este préstamo?\n\nSe liquidará la deuda de $${currentRefinanceLoan.balance.toFixed(2)} y se entregará $${(newAmount - currentRefinanceLoan.balance).toFixed(2)} al cliente.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/loans/${currentRefinanceLoan.id}/refinance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        new_amount: newAmount,
        new_term: newTerm
      })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Error al renovar');

    alert(`¡Renovación Exitosa!\n\nEntregar al cliente: $${data.cash_to_client.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`);

    closeLoanDetailModal();
    renderLoans().then(html => {
      document.getElementById('main-content').innerHTML = html;
    });

  } catch (error) {
    alert('Error: ' + error.message);
  }
}
